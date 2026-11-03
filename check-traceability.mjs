import { access, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = resolve(fileURLToPath(new URL('./', import.meta.url)));
const matrixPath = join(root, 'odd/traceability.md');
const staleMarkers = ['commit pending', 'native review pending'];
const referencePattern = /(?:^|[\s,;])((?:backend|shell)(?:\/[A-Za-z0-9._/-]+)?|(?:\.scratch|odd|src|test|scripts|docker|integrations|docs|\.github)\/[A-Za-z0-9._/-]+|(?:README\.md|compose\.yaml|package\.json|check-traceability\.mjs|\.env\.shell-stack\.example))(?=$|[\s,;.)])/g;
const publishedPathPattern = /^(?:backend|shell)(?:\/|$)/;
const commitPattern = /\bcommits?\s+`?([0-9a-f]{7,40})`?/gi;

async function ticketFiles() {
  const files = [];
  for (const entry of await readdir(join(root, '.scratch'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const issues = join(root, '.scratch', entry.name, 'issues');
    let issueEntries;
    try {
      issueEntries = await readdir(issues, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const issue of issueEntries) {
      if (issue.isDirectory() || !/^\d\d-.+\.md$/.test(issue.name)) continue;
      files.push(relative(root, join(issues, issue.name)));
    }
  }
  return files.sort();
}

function matrixRows(matrix) {
  return matrix.split('\n').filter((line) => line.startsWith('|') && !/^\|\s*:?-+/.test(line) && !/^\|\s*Requirement\s*\|/.test(line));
}

function matrixReferences(rows) {
  const references = new Map();
  for (const [index, row] of rows.entries()) {
    const refs = new Set();
    for (const match of row.matchAll(/`([^`]+)`/g)) {
      for (const reference of match[1].matchAll(referencePattern)) refs.add(reference[1]);
    }
    references.set(index + 1, [...refs]);
  }
  return references;
}

async function exists(path) {
  try {
    await access(join(root, path));
    return true;
  } catch {
    return false;
  }
}

async function commitExists(commit) {
  try {
    await execFileAsync('git', ['cat-file', '-e', `${commit}^{commit}`], { cwd: root });
    return true;
  } catch {
    return false;
  }
}

const matrix = await readFile(matrixPath, 'utf8');
const tickets = await ticketFiles();
const rows = matrixRows(matrix);
const references = matrixReferences(rows);
const errors = [];

for (const marker of staleMarkers) {
  if (matrix.includes(marker)) errors.push(`stale marker: ${marker}`);
}

const resolvedTickets = [];
for (const file of tickets) {
  const ticket = await readFile(join(root, file), 'utf8');
  if (!/^Status: resolved$/imu.test(ticket)) continue;
  resolvedTickets.push(file);
  if (!matrix.includes(file)) errors.push(`resolved ticket missing from matrix: ${file}`);
}

const fileReferences = new Set();
for (const [rowNumber, refs] of references) {
  if (refs.length === 0) errors.push(`matrix row ${rowNumber} has no local file reference`);
  for (const reference of refs) {
    fileReferences.add(reference);
    if (reference.startsWith('backend/') || reference.startsWith('shell/')) continue;
    if (!(await exists(reference))) errors.push(`matrix row ${rowNumber} points at missing file: ${reference}`);
  }
}

const commits = [...matrix.matchAll(commitPattern)].map((match) => match[1]);
for (const commit of new Set(commits)) {
  if (!(await commitExists(commit))) errors.push(`matrix references missing commit: ${commit}`);
}

if (errors.length > 0) {
  console.error(errors.map((error) => `traceability: ${error}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`traceability: ${rows.length} rows, ${resolvedTickets.length} resolved tickets, ${fileReferences.size} file references, ${new Set(commits).size} commits`);
}
