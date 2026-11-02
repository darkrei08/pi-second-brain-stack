# 08: Size the gateway for parallel chats and measure it

Type: task
Status: open
Blocked by: none

## Question

The measured baseline shows a 50 percent `429 model_busy` rate on `/v1/answers` at concurrency 4 with the shipped defaults (`.scratch/perf-baseline/report.md`). A person with two chats open and one request in flight behind each will meet that cliff. Decide the defaults and the queueing behaviour: raise concurrency, queue instead of refusing, or keep refusals and document them as the contract. Then measure again with the shell in the loop, not only with curl, and state the number that matters for one to three concurrent chats on this host.

## Acceptance criteria

- The chosen default and the reason, with the measurement that supports it.
- If queueing is chosen, a bounded queue with a timeout and a test for each boundary.
- A repeat run of the load harness at the new setting, with p50, p95 and error rate recorded in the perf report.
- `docs/development.md` states the resulting contract in one paragraph.
