# 03: Measure the Compose footprint against the 16 GB host budget

Type: research
Status: open
Blocked by: 01

## Question

What is the measured resource footprint of the selected Compose candidate on this 16 GB host, and does it fit the resource-discipline budget without starving existing Pi sessions, Herdr, or the second-brain services?

## Acceptance criteria

1. Inventory every mandatory and optional container involved in the candidate path, including postgres, API, web, worker, and computer containers where present.
2. Record host baseline and measured idle and representative active usage for RAM, CPU, disk, and relevant process or container counts.
3. Compare the measurements with the resource-discipline budget and state the remaining margin for concurrent Pi sessions; do not use an unmeasured "should fit" claim.
4. Record image or build identifiers, exact commands, duration, workload, collection method, and cleanup result so the measurement is repeatable.
5. Identify which containers can be omitted or bounded without changing the console decision, and list any footprint blocker for ticket 01 or ticket 05.

## Evidence to gather

- The resource-discipline budget and host measurements from the actual 16 GB host.
- The candidate's Compose files and service dependency graph, only after ticket 01 authorizes the exact inspection or run.
- `docker stats`, host memory/process readings, and a bounded representative console workload; no Docker run is authorized by this map alone.

## Constraints

- S9 binds the deployment shape: fetch, transcribe, render, and search stay separate small services with separate contracts; Compose must not hide them inside one monolith.
- Rakazo at `/root/git/fork/elie222/rakazo` remains a candidate only; nothing about it is installed, vendored, cloned further, configured, or run until a specific ticket authorizes that exact step.
- Loopback-only and single-owner assumptions remain the default; the measurement must not expose a service remotely.
- V1-V4 remain in force; adding containers must not create a second record store for library chats, attachments, documents, transcripts, or collections.
- Measurements must account for the existing resource-discipline budget rather than treating the candidate as an isolated stack.

## Open question

Does the measured Compose footprint leave a safe, documented resource margin on the 16 GB host, and what must be disabled or bounded if it does not?

## Comments
