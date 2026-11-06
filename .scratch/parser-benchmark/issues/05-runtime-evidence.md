# B5: Supply real runtime and workload evidence

Type: decision
Status: open
Blocked by: None

## Question

Which pinned Docling, MinerU, and PaddleOCR releases, model weights, hardware/container profile, and operator-supplied corpus should produce the first real benchmark result?

## Missing evidence

The repository cannot establish this from source alone. The current host has MinerU 4.0.10, but Docling and PaddleOCR are not installed; no pinned external container matrix, model weight selection, hardware profile, private corpus, OCR ground truth, or runtime wrapper has been supplied. No real parser run or performance/accuracy number may be published until those inputs exist.

## Required follow-up

Provide an external manifest and wrappers using the B4 contract, pin each runtime/version/model/image digest, state the hardware profile and corpus shape, then run the harness and preserve the result outside Git. This ticket remains open by the stop rule.
