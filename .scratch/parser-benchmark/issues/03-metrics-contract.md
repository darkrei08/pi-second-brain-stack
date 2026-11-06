# B3: Define parser benchmark metrics

Type: decision
Status: resolved
Blocked by: None

## Question

Which metrics can be recorded reproducibly without pretending to have measured unavailable hardware, corpus, or OCR ground truth?

## Answer

For every runtime/case run, record process success, timeout status, wall-clock `duration_ms`, input/output byte counts, and whether parser JSON normalized through the existing adapter. For successful normalized output, record hashes and bounded summaries only: code-point count, element count, page count, and bounding-box count.

When a case supplies canonical truth, record exact text match, ordered element-text match, page accuracy, and mean bounding-box IoU. Aggregate runtime results include successful-run rate, p50/p95 latency, input throughput, and truth-backed accuracy rates. Missing truth yields `null` accuracy fields and `truth_cases: 0`.

Memory, GPU utilization, cost, recall, and OCR accuracy without truth are not reported. They require operator instrumentation or evidence not available to this repository. Results never include document text or raw parser output.

## Acceptance

- Metrics are numeric or explicit `null`, never invented estimates.
- Percentiles use the measured successful durations and are defined in the result schema.
- Synthetic runs carry `execution_mode: synthetic` and are excluded from claims about external parser performance.
