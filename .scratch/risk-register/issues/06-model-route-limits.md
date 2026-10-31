# 06: Bound concurrency and rate on the model-backed routes

Type: task
Status: claimed
Blocked by: None
Source: R6 of [issue 01](01-risk-register.md).

## Question

R6 records that nothing caps how many authenticated model-backed requests run at once, so a token holder can consume sockets, provider quota and capacity. What is the smallest explicit bound with a bounded overload response?

## Acceptance criteria

- [ ] A concurrency bound applies to the model-backed routes (`POST /v1/answers`, `POST /v1/research`, `POST /v1/chat/completions`) only; retrieval and citation routes are unaffected.
- [ ] When the bound is reached, the request fails fast with a bounded error response and does not call the provider. Status 429 with a stable error code, and the body carries no driver or provider text.
- [ ] A per-owner request budget over a fixed window also applies to those routes; exceeding it returns the same bounded response without a provider call.
- [ ] Both limits are configurable through the gateway configuration, are validated (`positive integer`, `1..N`), and have safe finite defaults, so an operator who configures nothing still gets a bound.
- [ ] The slot is released when the handler succeeds, throws, and when the response stream ends or the client aborts.
- [ ] `docs/development.md` documents both variables and their defaults.
- [ ] Tests cover: saturation returns 429 without a provider call; the slot is released after success and after a thrown error; the per-owner budget trips and does not affect another owner; invalid configuration is refused.
- [ ] No new dependency. `pnpm test` green.

## Verification

- `node --test test/gateway-server.test.js test/gateway-config.test.js`
- `pnpm test`
