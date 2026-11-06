# 05: Define remote reach without breaking loopback-only

Type: decision
Status: open
Blocked by: 01, 02, 03

## Question

Should remote access use a tunnel or an authenticated reverse proxy, and what threat boundary keeps the console loopback-only by default while allowing the single owner to reach it remotely?

## Acceptance criteria

1. Compare a tunnel and an authenticated reverse proxy as separate options without silently selecting either one.
2. For each option, specify bind addresses, exposure path, authentication, authorization, owner identity mapping, TLS or tunnel trust, session revocation, and failure behavior.
3. Include a threat note covering stolen credentials or sessions, internet exposure, proxy misconfiguration, replay or forwarding, service-to-service access, logs, and emergency shutdown.
4. Prove that no service is directly public by default and that remote reach is an explicit opt-in path with a bounded rollback.
5. State whether the option supports only the single owner or introduces multi-user behavior; any multi-user need must be a separate ticket.
6. Define the exact later authorization needed before installing or running the tunnel or reverse proxy, including the secrets location without putting secrets in the repository.

## Evidence to gather

- Existing gateway and Compose bind/network configuration; the reachable library surface and its storage/retrieval remain owned by `second-brain-stack`.
- The selected candidate's network requirements after ticket 01 and the footprint ticket authorize inspection.
- The host's tunnel or reverse-proxy policy and its authentication documentation; no network exposure or remote service is started in this pass.

## Constraints

- S9 binds the network boundary: fetch, transcribe, render, and search remain separate services with separate contracts; remote access must not turn them into a monolith.
- Rakazo at `/root/git/fork/elie222/rakazo` remains a candidate only; nothing about it is installed, vendored, cloned further, configured, or run until a specific ticket authorizes that exact step.
- Loopback-only and single-owner assumptions hold by default. A tunnel or authenticated reverse proxy is this ticket's separate threat-reviewed exception; multi-user access is out of scope for this ticket.
- V1-V4 remain in force; remote reach must not create a second source of truth or expose corpus records outside the approved store.
- No credentials, tokens, private transcripts, or corpus data may enter the repository.

## Open question

Which remote-reach mechanism, if any, can be authorized without weakening the loopback-only default, single-owner boundary, or existing orchestrator and record ownership?

## Comments
