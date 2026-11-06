# Wayfinder: parser benchmark against external runtimes

## Destination

Define and prove a reproducible benchmark harness for the parser-normalization boundary. The harness compares operator-supplied runs of Docling, MinerU, and PaddleOCR against the repository's canonical normalized output without importing a private corpus, OCR output, model cache, or runtime dependency into Git.

## Dependency position

`.scratch/parser-normalization/` sealed a pure adapter for synthetic Docling, MinerU, and PaddleOCR-shaped JSON. `.scratch/rag-market-comparison/` identified RAGFlow/DeepDOC as a useful parser/layout reference but did not establish a stable command/output adapter or installation. This effort owns the benchmark contract and harness only; it does not select a production parser, install runtimes, or publish measurements.

## Decision tickets

- B1: `.scratch/parser-benchmark/issues/01-runtime-matrix.md` — resolved
- B2: `.scratch/parser-benchmark/issues/02-corpus-contract.md` — resolved
- B3: `.scratch/parser-benchmark/issues/03-metrics-contract.md` — resolved
- B4: `.scratch/parser-benchmark/issues/04-harness-contract.md` — resolved
- B5: `.scratch/parser-benchmark/issues/05-runtime-evidence.md` — open
- B6: `.scratch/parser-benchmark/issues/06-implement-harness.md` — resolved

## Decisions so far

- The core comparison matrix is Docling, MinerU, and PaddleOCR because the repository already has explicit normalization branches and lineage names for exactly these parser families.
- RAGFlow/DeepDOC is an optional future sidecar, not a required row: the repository evidence does not establish a stable, provider-neutral output adapter or an installed runtime for it.
- The corpus is an operator-supplied directory outside the repository, described by a JSON manifest. Cases carry an opaque ID, a relative input path, shape tags, and an optional canonical truth JSON; truth is also outside Git.
- A runtime is an operator-supplied argv array, never a shell string. The harness substitutes bounded placeholders and passes an output path; the runtime wrapper writes raw JSON compatible with the selected parser branch.
- The harness measures validity, deterministic normalized-output summaries, exact text and layout comparisons when truth exists, wall-clock latency, input throughput, and success rate. Memory, GPU utilization, and OCR accuracy without truth are explicitly not measured.
- Results are written to an operator-supplied path outside the repository and contain hashes/counts/metrics, not document text, OCR output, paths, credentials, vectors, or model caches.
- Synthetic proof runs must be marked `execution_mode: synthetic`; they prove the harness only and are not parser-runtime benchmark results.

## Open evidence

- Exact runtime releases, model weights, hardware profile, container image digests, real corpus composition, and measured performance/accuracy remain open until an operator supplies them. The current environment has MinerU 4.0.10 installed, while Docling and PaddleOCR Python modules are absent; no real corpus was run.

## Exit condition

The spec is ready for an operator with installed runtimes and an external corpus. The local harness is implemented and proved only with a labeled synthetic fixture; real external-runtime measurements remain blocked by B5.

## Traceability

The parent should add the final row to `odd/traceability.md` after consolidation. The requested row is recorded in `.scratch/parser-benchmark/issues/06-implement-harness.md`.
