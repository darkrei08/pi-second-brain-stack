# 03: Enforce an approved provider host allowlist for model egress

Type: task
Status: resolved
Blocked by: None
Source: R2 of [issue 01](01-risk-register.md), pre-deployment mitigation 2.

## Question

R2 records that the question and the retrieved evidence leave the host for whichever HTTPS model endpoint the operator configured, and that any HTTPS host is accepted. What is the smallest change that makes a remote provider destination an explicit, declared decision instead of an implicit one?

## Context

`src/chat-client.js` and `src/embedding-client.js` each resolve `base_url` at call time and already refuse non-loopback cleartext, embedded credentials, and redirects. Nothing checks *which* host receives corpus text. `src/gateway-cli.js` reads `ANSWER_BASE_URL` and `EMBEDDING_BASE_URL` and constructs both clients.

The approved provider list is a deployment fact, so the code must not carry one. The code must instead refuse a remote endpoint that was not declared, which is the fail-closed direction: silence denies.

## Acceptance criteria

- [x] A non-loopback endpoint is refused unless its host appears in that client's approved-host list. A loopback endpoint keeps working with no list configured.
- [x] `ANSWER_ALLOWED_HOSTS` and `EMBEDDING_ALLOWED_HOSTS` are comma-separated hostnames. Parsing trims whitespace, lowercases, and deduplicates; an entry that is empty, carries a scheme, a port, or a path, or is not a hostname is refused with a message naming the variable and the offending entry.
- [x] Refusal happens before any request is sent, and the error names the endpoint host and the variable the operator must set.
- [x] The host comparison is exact after lowercasing and trailing-dot removal; no suffix or wildcard matching.
- [x] `docs/development.md` documents both variables and states the fail-closed default and the loopback exemption.
- [x] Tests cover, for each client: an approved remote host is accepted, an unlisted remote host is refused, a loopback host needs no entry. `test/gateway-config.test.js` covers the parsing and every refusal.
- [x] No new dependency. `pnpm test` green.

## Verification

- `node --test test/gateway-config.test.js test/chat-client.test.js test/embedding-client.test.js`
- `pnpm test`

## Answer

`src/gateway-config.js` exports `parseAllowedHosts`, and both provider clients refuse a non-loopback endpoint whose exact hostname is not declared. Loopback stays exempt, so the local-only default needs no configuration.

Observed at runtime with the disposable pgvector instance on `127.0.0.1:55437` and a 32-character legacy token:

| Configuration | Result |
|---|---|
| `ANSWER_BASE_URL=https://api.openai.com/v1`, no allowlist | `gateway configuration refused: provider host api.openai.com is not allowed; set ANSWER_ALLOWED_HOSTS`, exit 1 |
| same with `ANSWER_ALLOWED_HOSTS=api.example.com` | same refusal, exit 1 |
| same with `ANSWER_ALLOWED_HOSTS=https://api.openai.com` | `gateway configuration refused: ANSWER_ALLOWED_HOSTS contains an invalid hostname entry: "https://api.openai.com"`, exit 1 |
| same with `ANSWER_ALLOWED_HOSTS=Api.OpenAI.com.` | accepted; startup proceeded to the bind attempt and failed only with `EADDRINUSE` on port 8080 |

`node --test test/gateway-config.test.js test/chat-client.test.js test/embedding-client.test.js`: 28 pass, 0 fail. `pnpm test`: 136 tests, 113 pass, 23 expected skips, 0 fail, exit 0. The writer observed RED first: 19 pass, 3 fail, because the parser was not exported and neither refusal existed. No dependency was added.

Residual, unchanged: the allowlist decides the destination, not the payload. Provider retention and contract terms stay deployment facts, and no audit record of the provider call is emitted yet, which is the remaining half of R2's follow-up line.

Native review `review-21dfcdd041638060` covered this slice together with issue 04 as one delivery candidate (base `43069f6b8020f167c5a354076e14887f05331dfe`) with the risk, resilience and reliability lenses; it approved and the approval was acknowledged. No correction was requested.
