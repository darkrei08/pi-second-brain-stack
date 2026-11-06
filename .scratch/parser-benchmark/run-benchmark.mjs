#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { normalizeParserOutput } from '../../src/parser-adapter.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '../..');
const PARSER_TYPES = new Set(['docling', 'mineru', 'paddleocr']);
const RUNTIME_IDS = new Set(PARSER_TYPES);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~-]*$/u;
const MODES = new Set(['external', 'synthetic']);
const DEFAULT_REPEATS = 1;
const DEFAULT_TIMEOUT_MS = 300_000;
const MAX_REPEATS = 20;
const MAX_TIMEOUT_MS = 3_600_000;
const PLACEHOLDERS = new Set(['input', 'output', 'case_id', 'parser_type', 'corpus_root']);

function fail(message) {
  throw new TypeError(message);
}

function requireObject(value, name) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`);
}

function requireText(value, name) {
  if (typeof value !== 'string' || value.length === 0) fail(`${name} must be non-empty text`);
}

function requireInteger(value, name, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) fail(`${name} is invalid`);
}

function isWithin(root, candidate) {
  const path = relative(root, candidate);
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !path.startsWith(sep));
}

function assertOutsideRepository(candidate, name) {
  if (isWithin(REPO_ROOT, candidate)) fail(`${name} must be outside the repository`);
}

async function resolveCorpusPath(root, value, name) {
  if (typeof value !== 'string' || value.length === 0 || value.startsWith('/') || value.includes('\0')) fail(`${name} is invalid`);
  const candidate = await realpath(resolve(root, value));
  if (!isWithin(root, candidate)) fail(`${name} escapes corpus_root`);
  return candidate;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function hashFile(path) {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(path)) {
    bytes += chunk.length;
    hash.update(chunk);
  }
  return { hash: hash.digest('hex'), bytes };
}

function captureStream(stream) {
  let bytes = 0;
  const hash = createHash('sha256');
  stream.on('data', (chunk) => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    hash.update(buffer);
  });
  return { get bytes() { return bytes; }, get hash() { return hash.digest('hex'); } };
}

function parsePlaceholders(value, name) {
  if (typeof value !== 'string') fail(`${name} must contain text`);
  return value.replace(/\{([a-z_]+)\}/gu, (match, key) => {
    if (!PLACEHOLDERS.has(key)) fail(`${name} contains an unsupported placeholder`);
    return `\u0000${key}\u0000`;
  });
}

function expandArgument(value, replacements, name) {
  const checked = parsePlaceholders(value, name);
  return checked.replace(/\u0000([a-z_]+)\u0000/gu, (_match, key) => replacements[key]);
}

function percentile(values, fraction) {
  if (values.length === 0) return null;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.floor((ordered.length - 1) * fraction)];
}

function codePointCount(value) {
  return Array.from(value).length;
}

function summarizeNormalized(normalized) {
  return {
    text_sha256: sha256(normalized.text),
    code_points: codePointCount(normalized.text),
    element_count: normalized.elements.length,
    page_count: new Set(normalized.elements.map((element) => element.page).filter((page) => page !== null)).size,
    bounding_box_count: normalized.elements.filter((element) => element.bounding_box !== null).length
  };
}

function intersectionOverUnion(left, right) {
  if (!left || !right) return null;
  const intersectionWidth = Math.max(0, Math.min(left[2], right[2]) - Math.max(left[0], right[0]));
  const intersectionHeight = Math.max(0, Math.min(left[3], right[3]) - Math.max(left[1], right[1]));
  const intersection = intersectionWidth * intersectionHeight;
  const leftArea = (left[2] - left[0]) * (left[3] - left[1]);
  const rightArea = (right[2] - right[0]) * (right[3] - right[1]);
  const union = leftArea + rightArea - intersection;
  return union === 0 ? null : intersection / union;
}

function compareTruth(normalized, truth) {
  const metrics = {
    text_exact: truth ? normalized.text === truth.text : null,
    element_text_exact: null,
    page_accuracy: null,
    mean_bbox_iou: null
  };
  if (!truth) return metrics;
  if (!truth.elements) return metrics;

  metrics.element_text_exact = normalized.elements.length === truth.elements.length
    && normalized.elements.every((element, index) => element.text === truth.elements[index].text);
  const denominator = Math.max(normalized.elements.length, truth.elements.length);
  if (denominator > 0) {
    const pageMatches = truth.elements.reduce((count, expected, index) => (
      count + (normalized.elements[index]?.page === expected.page ? 1 : 0)
    ), 0);
    metrics.page_accuracy = pageMatches / denominator;
  }
  const boxes = normalized.elements.map((element, index) => intersectionOverUnion(element.bounding_box, truth.elements[index]?.bounding_box ?? null)).filter((value) => value !== null);
  if (boxes.length > 0) metrics.mean_bbox_iou = boxes.reduce((sum, value) => sum + value, 0) / boxes.length;
  return metrics;
}

function validateTruth(value, name) {
  requireObject(value, name);
  if (typeof value.text !== 'string') fail(`${name}.text is invalid`);
  if (value.elements === undefined) return;
  if (!Array.isArray(value.elements)) fail(`${name}.elements is invalid`);
  value.elements.forEach((element, index) => {
    requireObject(element, `${name}.elements[${index}]`);
    requireText(element.text, `${name}.elements[${index}].text`);
    requireInteger(element.page, `${name}.elements[${index}].page`, 1, Number.MAX_SAFE_INTEGER);
    if (element.bounding_box !== undefined && element.bounding_box !== null) {
      if (!Array.isArray(element.bounding_box) || element.bounding_box.length !== 4 || element.bounding_box.some((item) => !Number.isFinite(item) || item < 0 || item > 1)) fail(`${name}.elements[${index}].bounding_box is invalid`);
      if (element.bounding_box[0] >= element.bounding_box[2] || element.bounding_box[1] >= element.bounding_box[3]) fail(`${name}.elements[${index}].bounding_box is invalid`);
    }
  });
}

async function loadTruth(path, name) {
  if (!path) return null;
  const value = JSON.parse(await readFile(path, 'utf8'));
  validateTruth(value, name);
  return value;
}

async function validateConfig(raw) {
  requireObject(raw, 'config');
  if (typeof raw.corpus_root !== 'string' || !raw.corpus_root.startsWith('/')) fail('config.corpus_root must be an absolute path');
  const corpusRoot = await realpath(raw.corpus_root);
  assertOutsideRepository(corpusRoot, 'config.corpus_root');
  if (!Array.isArray(raw.cases) || raw.cases.length === 0) fail('config.cases must be a non-empty array');
  if (!Array.isArray(raw.runtimes) || raw.runtimes.length === 0) fail('config.runtimes must be a non-empty array');
  if (typeof raw.result_path !== 'string' || !raw.result_path.startsWith('/')) fail('config.result_path must be an absolute path');
  const resultPath = resolve(raw.result_path);
  assertOutsideRepository(resultPath, 'config.result_path');
  const resultParent = await realpath(dirname(resultPath)).catch(async () => {
    await mkdir(dirname(resultPath), { recursive: true });
    return realpath(dirname(resultPath));
  });
  assertOutsideRepository(resultParent, 'config.result_path parent');

  const cases = [];
  const caseIds = new Set();
  for (const [index, rawCase] of raw.cases.entries()) {
    requireObject(rawCase, `config.cases[${index}]`);
    requireText(rawCase.id, `config.cases[${index}].id`);
    if (!ID_PATTERN.test(rawCase.id) || rawCase.id.includes('..') || caseIds.has(rawCase.id)) fail(`config.cases[${index}].id is invalid or duplicated`);
    caseIds.add(rawCase.id);
    const inputPath = await resolveCorpusPath(corpusRoot, rawCase.input, `config.cases[${index}].input`);
    const inputStats = await stat(inputPath);
    if (!inputStats.isFile()) fail(`config.cases[${index}].input must be a file`);
    const truthPath = rawCase.truth === undefined ? null : await resolveCorpusPath(corpusRoot, rawCase.truth, `config.cases[${index}].truth`);
    if (truthPath && !(await stat(truthPath)).isFile()) fail(`config.cases[${index}].truth must be a file`);
    const tags = rawCase.tags ?? [];
    if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string' || tag.length === 0)) fail(`config.cases[${index}].tags is invalid`);
    cases.push({ id: rawCase.id, input: inputPath, input_relative: rawCase.input, truth: truthPath, truth_relative: rawCase.truth ?? null, tags, input_bytes: inputStats.size });
  }

  const runtimes = [];
  const runtimeIds = new Set();
  for (const [index, rawRuntime] of raw.runtimes.entries()) {
    requireObject(rawRuntime, `config.runtimes[${index}]`);
    requireText(rawRuntime.id, `config.runtimes[${index}].id`);
    if (!RUNTIME_IDS.has(rawRuntime.id) || runtimeIds.has(rawRuntime.id)) fail(`config.runtimes[${index}].id is unsupported or duplicated`);
    runtimeIds.add(rawRuntime.id);
    if (rawRuntime.parser_type !== rawRuntime.id || !PARSER_TYPES.has(rawRuntime.parser_type)) fail(`config.runtimes[${index}].parser_type must match id`);
    if (!MODES.has(rawRuntime.mode)) fail(`config.runtimes[${index}].mode is invalid`);
    requireText(rawRuntime.version, `config.runtimes[${index}].version`);
    if (!Array.isArray(rawRuntime.command) || rawRuntime.command.length === 0 || rawRuntime.command.some((part) => typeof part !== 'string' || part.length === 0)) fail(`config.runtimes[${index}].command is invalid`);
    const repeats = rawRuntime.repeats ?? DEFAULT_REPEATS;
    const timeoutMs = rawRuntime.timeout_ms ?? DEFAULT_TIMEOUT_MS;
    requireInteger(repeats, `config.runtimes[${index}].repeats`, 1, MAX_REPEATS);
    requireInteger(timeoutMs, `config.runtimes[${index}].timeout_ms`, 1, MAX_TIMEOUT_MS);
    runtimes.push({ ...rawRuntime, repeats, timeout_ms: timeoutMs, command_sha256: sha256(JSON.stringify(rawRuntime.command)) });
  }
  return { raw, corpusRoot, resultPath, cases, runtimes, runtime_ids: runtimeIds };
}

function runCommand(argv, environment, timeoutMs) {
  return new Promise((resolveResult) => {
    let timedOut = false;
    let settled = false;
    let child;
    try {
      child = spawn(argv[0], argv.slice(1), { cwd: REPO_ROOT, env: environment, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch {
      resolveResult({ exit_code: null, signal: null, timed_out: false, spawn_error: true, stdout_bytes: 0, stdout_sha256: sha256(''), stderr_bytes: 0, stderr_sha256: sha256('') });
      return;
    }
    const stdout = captureStream(child.stdout);
    const stderr = captureStream(child.stderr);
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    const finish = (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveResult({ exit_code: exitCode, signal, timed_out: timedOut, spawn_error: false, stdout_bytes: stdout.bytes, stdout_sha256: stdout.hash, stderr_bytes: stderr.bytes, stderr_sha256: stderr.hash });
    };
    child.once('error', () => finish(null, null));
    child.once('close', finish);
  });
}

function envelopeFor(caseEntry, runtime, sourceHash) {
  return {
    document_id: `urn:document:benchmark-${caseEntry.id}`,
    source_label: `benchmark-${caseEntry.id}`,
    source_hash: `sha256:${sourceHash}`,
    lineage: { parser: runtime.id, model: runtime.version },
    created_at: '2000-01-01T00:00:00Z',
    retention: { owner_id: 'benchmark', state: 'active' }
  };
}

async function runCase(caseEntry, runtime, corpusRoot, tempRoot, truth) {
  const source = await hashFile(caseEntry.input);
  const repeatResults = [];
  const replacementsBase = {
    input: caseEntry.input,
    case_id: caseEntry.id,
    parser_type: runtime.parser_type,
    corpus_root: corpusRoot
  };
  for (let repeat = 0; repeat < runtime.repeats; repeat += 1) {
    const outputPath = resolve(tempRoot, `${runtime.id}-${caseEntry.id}-${repeat}.json`);
    const replacements = { ...replacementsBase, output: outputPath };
    const argv = runtime.command.map((part, index) => expandArgument(part, replacements, `runtime ${runtime.id} command[${index}]`));
    const started = performance.now();
    const commandResult = await runCommand(argv, {
      ...process.env,
      PARSER_BENCHMARK_INPUT: caseEntry.input,
      PARSER_BENCHMARK_OUTPUT: outputPath,
      PARSER_BENCHMARK_CASE_ID: caseEntry.id,
      PARSER_BENCHMARK_PARSER_TYPE: runtime.parser_type,
      PARSER_BENCHMARK_CORPUS_ROOT: corpusRoot
    }, runtime.timeout_ms);
    const durationMs = performance.now() - started;
    let outputBytes = 0;
    let normalized = null;
    let error = null;
    try {
      outputBytes = (await stat(outputPath)).size;
      const rawJson = JSON.parse(await readFile(outputPath, 'utf8'));
      const normalizedStarted = performance.now();
      normalized = normalizeParserOutput({ parser_type: runtime.parser_type, raw_json: rawJson, envelope: envelopeFor(caseEntry, runtime, source.hash) });
      const normalizedDurationMs = performance.now() - normalizedStarted;
      const summary = summarizeNormalized(normalized);
      repeatResults.push({
        success: commandResult.exit_code === 0 && !commandResult.timed_out,
        timed_out: commandResult.timed_out,
        duration_ms: Number(durationMs.toFixed(3)),
        normalize_duration_ms: Number(normalizedDurationMs.toFixed(3)),
        input_bytes: source.bytes,
        output_bytes: outputBytes,
        normalized: true,
        summary,
        truth: compareTruth(normalized, truth)
      });
      if (commandResult.exit_code !== 0 || commandResult.timed_out) repeatResults.at(-1).success = false;
    } catch (caught) {
      error = caught instanceof SyntaxError ? 'invalid_json' : 'invalid_or_unrecognized_parser_output';
      if (commandResult.timed_out) error = 'timeout';
      else if (commandResult.spawn_error) error = 'spawn_error';
      else if (commandResult.exit_code !== 0) error = 'command_failed';
      repeatResults.push({
        success: false,
        timed_out: commandResult.timed_out,
        duration_ms: Number(durationMs.toFixed(3)),
        normalize_duration_ms: null,
        input_bytes: source.bytes,
        output_bytes: outputBytes,
        normalized: false,
        summary: null,
        truth: { text_exact: null, element_text_exact: null, page_accuracy: null, mean_bbox_iou: null },
        error
      });
    } finally {
      await rm(outputPath, { force: true });
    }
    repeatResults.at(-1).stdout_bytes = commandResult.stdout_bytes;
    repeatResults.at(-1).stdout_sha256 = commandResult.stdout_sha256;
    repeatResults.at(-1).stderr_bytes = commandResult.stderr_bytes;
    repeatResults.at(-1).stderr_sha256 = commandResult.stderr_sha256;
    repeatResults.at(-1).exit_code = commandResult.exit_code;
  }
  return {
    id: caseEntry.id,
    input: caseEntry.input_relative,
    truth: caseEntry.truth_relative,
    tags: caseEntry.tags,
    input_bytes: source.bytes,
    repeats: repeatResults
  };
}

function aggregateRuntime(caseResults, runtime, truthCaseCount) {
  const runs = caseResults.flatMap((entry) => entry.repeats);
  const successful = runs.filter((run) => run.success);
  const durations = successful.map((run) => run.duration_ms);
  const truthRuns = successful.flatMap((run) => run.truth.text_exact === null ? [] : [run]);
  const rate = (selector) => truthRuns.length === 0 ? null : truthRuns.filter(selector).length / truthRuns.length;
  const totalSeconds = successful.reduce((sum, run) => sum + run.duration_ms, 0) / 1000;
  return {
    configured_cases: caseResults.length,
    truth_cases: truthCaseCount,
    repeats_per_case: runtime.repeats,
    total_runs: runs.length,
    successful_runs: successful.length,
    failed_runs: runs.length - successful.length,
    success_rate: runs.length === 0 ? null : successful.length / runs.length,
    latency_ms: { p50: percentile(durations, 0.5), p95: percentile(durations, 0.95) },
    input_throughput_bytes_per_second: totalSeconds === 0 ? null : successful.reduce((sum, run) => sum + run.input_bytes, 0) / totalSeconds,
    text_exact_rate: rate((run) => run.truth.text_exact === true),
    element_text_exact_rate: rate((run) => run.truth.element_text_exact === true),
    page_accuracy_mean: truthRuns.length === 0 ? null : truthRuns.reduce((sum, run) => sum + (run.truth.page_accuracy ?? 0), 0) / truthRuns.length,
    mean_bbox_iou_mean: (() => {
      const values = truthRuns.map((run) => run.truth.mean_bbox_iou).filter((value) => value !== null);
      return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
    })()
  };
}

export async function runBenchmark(rawConfig) {
  const validated = await validateConfig(rawConfig);
  const configSha256 = sha256(JSON.stringify(rawConfig));
  const tempRoot = await mkdtemp(join(tmpdir(), 'parser-benchmark-'));
  const startedAt = new Date().toISOString();
  const runtimes = [];
  let failedRuns = 0;
  try {
    for (const runtime of validated.runtimes) {
      const caseResults = [];
      let truthCaseCount = 0;
      for (const caseEntry of validated.cases) {
        const truth = await loadTruth(caseEntry.truth, `case ${caseEntry.id}.truth`);
        if (truth) truthCaseCount += 1;
        const result = await runCase(caseEntry, runtime, validated.corpusRoot, tempRoot, truth);
        failedRuns += result.repeats.filter((run) => !run.success).length;
        caseResults.push(result);
      }
      runtimes.push({
        id: runtime.id,
        parser_type: runtime.parser_type,
        execution_mode: runtime.mode,
        version: runtime.version,
        command_sha256: runtime.command_sha256,
        cases: caseResults,
        aggregate: aggregateRuntime(caseResults, runtime, truthCaseCount)
      });
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }

  const missingRuntimeIds = [...RUNTIME_IDS].filter((id) => !validated.runtime_ids.has(id));
  const notMeasured = [
    'memory',
    'gpu_utilization',
    'cost',
    'recall',
    'ocr_accuracy_without_truth',
    ...(missingRuntimeIds.length > 0 ? [`runtime_rows:${missingRuntimeIds.join(',')}`] : []),
    ...(validated.runtimes.some((runtime) => runtime.mode === 'synthetic') ? ['external_runtime_performance_for_synthetic_rows'] : [])
  ];
  const result = {
    schema_version: 1,
    execution: { started_at: startedAt, finished_at: new Date().toISOString(), failed_runs: failedRuns, status: failedRuns === 0 ? 'complete' : 'completed_with_failures' },
    config_sha256: configSha256,
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    corpus: { root: '[external]', case_count: validated.cases.length, manifest_shape: 'operator-supplied external corpus' },
    runtimes,
    not_measured: notMeasured
  };
  await mkdir(dirname(validated.resultPath), { recursive: true });
  const temporaryResultPath = `${validated.resultPath}.tmp-${process.pid}`;
  await writeFile(temporaryResultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await rename(temporaryResultPath, validated.resultPath);
  return result;
}

function parseCli(argv) {
  if (argv.length !== 2 || argv[0] !== '--config' || !argv[1]) fail('usage: run-benchmark.mjs --config /external/config.json');
  return argv[1];
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const configPath = resolve(parseCli(process.argv.slice(2)));
    const rawConfig = JSON.parse(await readFile(configPath, 'utf8'));
    const result = await runBenchmark(rawConfig);
    process.stdout.write(`${JSON.stringify({ status: result.execution.status, result_path: '[external]', failed_runs: result.execution.failed_runs })}\n`);
    if (result.execution.failed_runs > 0) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'benchmark failed'}\n`);
    process.exitCode = 1;
  }
}
