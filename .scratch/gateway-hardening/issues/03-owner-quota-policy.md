# 03: Owner-scoped quota policy

Type: decision
Status: resolved
Blocked by: None

## Question

What bounded quota policy should protect the loopback gateway from accidental or hostile request bursts while preserving the existing route semantics?

## Evidence

`src/gateway-server.js` already caps request bodies at 1 MiB and sets a 120-second request timeout. A7 explicitly deferred rate limiting and concurrency caps. The gateway derives a finite owner identity before handling authenticated data routes, and the deployment is single-process and private by default.

## Acceptance criteria

- Decide the quota dimensions, defaults, configuration, and response contract.
- Decide which requests count and when quota state is released.
- Keep the policy process-local and dependency-free unless evidence requires a durable coordinator.

## Answer

Use a process-local fixed-window quota per derived owner: at most 60 authenticated data-route requests per 60 seconds and at most 8 in-flight requests by default. Both limits are configurable through `GATEWAY_REQUESTS_PER_MINUTE` and `GATEWAY_MAX_CONCURRENT_REQUESTS`; values are positive integers. Health and readiness probes are unauthenticated and do not consume owner quota. Quota is acquired after authentication and route/method validation but before body parsing, returns `429 quota_exceeded` with `Retry-After: 60` when rejected, and is released in `finally` after the request completes. The policy is intentionally single-process; a multi-replica deployment must place a shared limiter in front of the gateway rather than pretending this state is distributed.

## Comments
