# 08: Size the gateway for parallel chats and measure it

Type: task
Status: resolved
Blocked by: none

## Question

The measured baseline shows a 50 percent `429 model_busy` rate on `/v1/answers` at concurrency 4 with the shipped defaults (`.scratch/perf-baseline/report.md`). A person with two chats open and one request in flight behind each will meet that cliff. Decide the defaults and the queueing behaviour: raise concurrency, queue instead of refusing, or keep refusals and document them as the contract. Then measure again with the shell in the loop, not only with curl, and state the number that matters for one to three concurrent chats on this host.

## Acceptance criteria

- The chosen default and the reason, with the measurement that supports it.
- If queueing is chosen, a bounded queue with a timeout and a test for each boundary.
- A repeat run of the load harness at the new setting, with p50, p95 and error rate recorded in the perf report.
- `docs/development.md` states the resulting contract in one paragraph.

## Answer

Keep fail-fast capacity rather than adding a queue. The gateway default is now `GATEWAY_MODEL_CONCURRENCY=3`: on this host, the repeat fake-provider run returned 0% answer errors and p50/p95 latencies of 31.11/76.66 ms at concurrency 1, 29.50/37.22 ms at 2, and 29.67/35.14 ms at 3. At concurrency 4, 3 of 12 requests were rejected (`25%`, `429 model_busy`), proving the boundary. A bounded queue would add timeout and cancellation behavior without evidence that one to three chats need it.

The bounded harness runs the gateway CLI and authenticated HTTP requests against a disposable pgvector/PostgreSQL instance and fake provider; the complete repeat is recorded in `.scratch/perf-baseline/report.md`.
