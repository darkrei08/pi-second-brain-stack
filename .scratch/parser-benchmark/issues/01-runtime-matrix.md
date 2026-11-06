# B1: Select the parser benchmark runtime matrix

Type: decision
Status: resolved
Blocked by: None

## Question

Which external parser runtimes should the benchmark compare, and which candidates must remain optional?

## Evidence

- `src/parser-adapter.js` has explicit branches for `docling`, `mineru`, and `paddleocr`.
- `.scratch/parser-normalization/spec.md` defines those three synthetic shapes as the public normalization boundary.
- `.scratch/rag-market-comparison/research.md` identifies RAGFlow/DeepDOC as a strong parser/layout reference but records no installation, release pin, or provider-neutral output contract.
- The current environment check found MinerU 4.0.10 installed; Docling and PaddleOCR Python modules are absent, and no real corpus was executed.

## Answer

The required benchmark matrix is Docling, MinerU, and PaddleOCR, each through its existing parser type and an operator-supplied wrapper. RAGFlow/DeepDOC is optional future work because the repository evidence does not define a stable adapter or execution contract for it. No runtime is installed by this effort and no candidate is preferred before measurement.
