# B6: Implement the reproducible parser benchmark harness

Type: implementation
Status: resolved
Blocked by: B1, B2, B3, B4

## Question

Can the repository provide a safe, dependency-free harness that an operator can run against installed parser runtimes and an external corpus, while clearly separating synthetic proof from real measurements?

## Specification

`.scratch/parser-benchmark/spec.md`

## Acceptance criteria

- [x] The contract selects Docling, MinerU, and PaddleOCR and leaves RAGFlow/DeepDOC optional.
- [x] The manifest and runtime command boundaries reject repository-local corpus/result paths and path escapes.
- [x] Runtime wrappers use argv arrays with `shell: false` and write raw JSON to a supplied output path.
- [x] The harness normalizes through `src/parser-adapter.js`, records only safe summaries/hashes, cleans temporary output, and writes results atomically.
- [x] Truth-backed text/layout metrics, latency, throughput, success rate, and explicit not-measured fields are recorded.
- [x] A synthetic wrapper proves the harness and is labeled `execution_mode: synthetic`.
- [x] No parser runtime, corpus, OCR output, model cache, dependency, package script, or shared file is added.

## Answer

Implemented `.scratch/parser-benchmark/run-benchmark.mjs`. It accepts an external JSON config, validates the corpus boundary, invokes operator-supplied parser wrappers without a shell, normalizes raw output through the existing adapter, compares optional canonical truth, records bounded result metrics, removes temporary output, and atomically writes an external result. The required external runtime matrix remains Docling/MinerU/PaddleOCR; the current host only proves MinerU is installed, so no real external-runtime benchmark number is claimed.

## Verification

`node --check .scratch/parser-benchmark/run-benchmark.mjs`; synthetic end-to-end run and negative path-boundary run pass; `npm test` passes. The synthetic result is explicitly marked `execution_mode: synthetic`.

## Traceability row (pending parent consolidation)

| Parser benchmark against external runtimes | `.scratch/parser-benchmark/spec.md`; `.scratch/parser-benchmark/issues/06-implement-harness.md` | `.scratch/parser-benchmark/run-benchmark.mjs` | synthetic external-wrapper smoke; `node --check`; `npm test` | real Docling/MinerU/PaddleOCR corpus benchmark not run; current host inventory only confirms MinerU 4.0.10 | Implemented; real measurements deferred |
