# Feature: reproducible parser benchmark harness

Implements GitHub issue #18 through `.scratch/parser-benchmark/`. The harness compares operator-supplied Docling, MinerU, and PaddleOCR wrapper runs without installing runtimes or importing private corpus data.

## Specs

- S1: "The required matrix is Docling, MinerU, and PaddleOCR through operator-supplied wrappers. RAGFlow/DeepDOC remains an optional future sidecar because no stable adapter or execution contract is established here."
- S2: "The operator supplies an absolute `corpus_root` outside the repository and a JSON manifest with unique case IDs, relative input paths, optional shape tags, and optional relative canonical truth JSON paths; path escapes and repository-local corpus/result paths fail closed."
- S3: "Runtime commands are argv arrays spawned with `shell: false`; wrappers receive `{input}`, `{output}`, `{case_id}`, `{parser_type}`, and `{corpus_root}` substitutions and write raw parser JSON to `{output}`."
- S4: "The harness calls the existing normalizer and records only bounded hashes, counts, timings, validity, and truth-backed comparisons; it writes results atomically outside the repository and removes temporary raw output."
- S5: "Synthetic proof runs are labeled `execution_mode: synthetic` and are never presented as external runtime measurements."
- S6: "The result records latency, throughput, success rate, exact text/layout metrics when truth exists, and explicit not-measured fields for memory, GPU utilization, cost, recall, and OCR accuracy without truth."

## Tasks

| ID | Spec | Route | Commit |
| --- | --- | --- | --- |
| T1 | S1-S2 | `.scratch/parser-benchmark/map.md`, decision tickets | local |
| T2 | S3-S6 | `.scratch/parser-benchmark/run-benchmark.mjs` | local |
| T3 | all | `.scratch/parser-benchmark/spec.md`, tracker closure, synthetic verification | local |

## Log

- L1: Repository evidence selected Docling, MinerU, and PaddleOCR as the required matrix because `src/parser-adapter.js` has explicit branches for all three. RAGFlow/DeepDOC remains optional.
- L2: Runtime inventory was re-verified: MinerU 4.0.10 is installed at `/root/.local/share/setup-ai/mineru/venv`, while Docling and PaddleOCR modules are absent. No real parser run was performed.
- L3: RED: before the harness existed, the requested CLI path was absent; no benchmark could be started. GREEN: the dependency-free harness now runs a labeled synthetic wrapper end to end and rejects repository-local corpus paths.
- L4: No external corpus, parser output, model cache, or measured runtime number is stored in this worktree.

## Verification

- `node --check .scratch/parser-benchmark/run-benchmark.mjs`
- synthetic end-to-end run with a fake Docling-shaped wrapper and `/tmp` corpus/result paths
- negative repository-local path validation
- `npm test`
