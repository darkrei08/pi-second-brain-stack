# 03: Enforce an approved provider host allowlist for model egress

Type: task
Status: claimed
Blocked by: None
Source: R2 of [issue 01](01-risk-register.md), pre-deployment mitigation 2.

## Question

R2 records that the question and the retrieved evidence leave the host for whichever HTTPS model endpoint the operator configured, and that any HTTPS host is accepted. What is the smallest change that makes a remote provider destination an explicit, declared decision instead of an implicit one?

## Context

`src/chat-client.js` and `src/embedding-client.js` each resolve `base_url` at call time and already refuse non-loopback cleartext, embedded credentials, and redirects. Nothing checks *which* host receives corpus text. `src/gateway-cli.js` reads `ANSWER_BASE_URL` and `EMBEDDING_BASE_URL` and constructs both clients.

The approved provider list is a deployment fact, so the code must not carry one. The code must instead refuse a remote endpoint that was not declared, which is the fail-closed direction: silence denies.

## Acceptance criteria

- [ ] A non-loopback endpoint is refused unless its host appears in that client's approved-host list. A loopback endpoint keeps working with no list configured.
- [ ] `ANSWER_ALLOWED_HOSTS` and `EMBEDDING_ALLOWED_HOSTS` are comma-separated hostnames. Parsing trims whitespace, lowercases, and deduplicates; an entry that is empty, carries a scheme, a port, or a path, or is not a hostname is refused with a message naming the variable and the offending entry.
- [ ] Refusal happens before any request is sent, and the error names the endpoint host and the variable the operator must set.
- [ ] The host comparison is exact after lowercasing and trailing-dot removal; no suffix or wildcard matching.
- [ ] `docs/development.md` documents both variables and states the fail-closed default and the loopback exemption.
- [ ] Tests cover, for each client: an approved remote host is accepted, an unlisted remote host is refused, a loopback host needs no entry. `test/gateway-config.test.js` covers the parsing and every refusal.
- [ ] No new dependency. `pnpm test` green.

## Verification

- `node --test test/gateway-config.test.js test/chat-client.test.js test/embedding-client.test.js`
- `pnpm test`
