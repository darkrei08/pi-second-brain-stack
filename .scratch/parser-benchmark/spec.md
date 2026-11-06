# Spec: reproducible parser benchmark harness

## Problem statement

The repository has a pure parser-normalization boundary for Docling, MinerU, and PaddleOCR-shaped JSON, but no reproducible way to compare real parser runtimes. Installing heavy runtimes or importing the private P.IVA corpus into this public repository would violate the runtime boundary and would make unmeasured claims unsafe.

## S1: Runtime matrix

The required matrix is Docling, MinerU, and PaddleOCR through operator-supplied wrappers. RAGFlow/DeepDOC remains an optional future sidecar because no stable adapter or execution contract is established here. The harness does not install or import any runtime.

## S2: Corpus boundary

The operator supplies an absolute `corpus_root` outside the repository and a JSON manifest. The manifest has unique opaque case IDs, relative input paths, optional shape `tags`, and optional relative canonical `truth` JSON paths. Input and truth paths must resolve below `corpus_root`; the harness rejects repository-local corpus roots and path escapes. No corpus, OCR output, truth, embeddings, database dump, credential, or model cache is stored in Git.

Canonical truth JSON is:

```json
{
  "text": "canonical text",
  "elements": [
    {"text": "canonical block", "page": 1, "bounding_box": [0, 0, 1, 1]}
  ]
}
```

`elements` is optional. The operator chooses shape tags and corpus composition; this spec does not invent a sample count or accuracy threshold.

## S3: Runtime command boundary

Run:

```text
node .scratch/parser-benchmark/run-benchmark.mjs --config /external/benchmark/config.json
```

The config declares `corpus_root`, `result_path`, cases, and runtime rows. Every runtime row declares:

- `id`: one of `docling`, `mineru`, or `paddleocr`;
- `parser_type`: matching the existing normalizer branch;
- `mode`: `external` or `synthetic`;
- `version`: operator-pinned runtime/model/image identity;
- `command`: non-empty argv array, run with `shell: false`;
- optional `repeats` (default 1) and `timeout_ms` (default 300000).

The command receives substituted `{input}`, `{output}`, `{case_id}`, `{parser_type}`, and `{corpus_root}` arguments and matching `PARSER_BENCHMARK_*` environment variables. It must write raw parser JSON to `{output}`. The harness does not inspect or retain raw stdout, stderr, or parser output beyond bounded hashes and metrics.

## S4: Normalization and result safety

For every case/repeat, the harness creates a synthetic benchmark envelope with a source hash of the input bytes, calls `normalizeParserOutput`, and records only success/failure, hashes, counts, pages, boxes, and metrics. Temporary raw output is removed. The result path must be outside the repository and is written atomically.

Synthetic proof runs are labeled exactly with `execution_mode: synthetic`; they prove the harness only and are not external parser results.

## S5: Metrics

Per run: `success`, `timed_out`, `duration_ms`, `input_bytes`, `output_bytes`, `normalized`, and normalized summary (`text_sha256`, code-point count, element count, page count, bounding-box count).

When truth exists: `text_exact`, `element_text_exact`, `page_accuracy`, and `mean_bbox_iou`; otherwise these values are `null`.

Per runtime: successful-run rate, p50/p95 successful latency, aggregate input throughput, truth-case count, and truth-backed rates. Results explicitly list `not_measured`: memory, GPU utilization, cost, recall, OCR accuracy without truth, and real runtime performance when `mode` is synthetic.

## S6: Failure behavior

Malformed config, missing files, repository-local corpus/result paths, path escapes, invalid parser type, command failure, timeout, malformed output, and malformed truth fail closed. Other cases remain recorded, but the CLI exits non-zero if any runtime/case failed. No error field contains raw document text or raw provider output.

## Implementation

`.scratch/parser-benchmark/run-benchmark.mjs` is dependency-free and imports only the existing public normalizer. It is intentionally outside `src/` and `package.json` so the benchmark cannot become a runtime dependency.

## Verification

- `node --check .scratch/parser-benchmark/run-benchmark.mjs`
- synthetic end-to-end run with a fake wrapper and an external `/tmp` corpus/result path, asserting `execution_mode: synthetic`, successful normalization, truth-backed metrics, and no result text
- negative run with a repository-local corpus path, asserting fail-closed validation
- `npm test`

## Deferred / not verified

No real Docling, MinerU, or PaddleOCR benchmark is claimed. Exact release/model/image pins, hardware, private corpus shape, OCR ground truth, memory/GPU instrumentation, and performance thresholds remain open in B5.
