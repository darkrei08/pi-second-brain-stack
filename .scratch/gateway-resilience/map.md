# Wayfinder: gateway resilience and observability

## Destination

An incident on this host is visible and bounded: an unexpected failure leaves a trace that names the route and the cause class without leaking payload, readiness reflects whether the answer path can actually serve, shutdown is guaranteed even when a dependency refuses, and a provider call reports the tokens it spent. These four gaps were found by reading the code during the R10 smoke attempt, not by reading a specification.

## Notes

Each ticket is a behaviour change with a test that fails without it. No ticket changes a public contract except the readiness verdict, which becomes stricter and therefore must be documented in `docs/development.md`.

## Decisions so far

Empty.

## Not yet specified

- Whether metrics are a counter file, an endpoint, or structured log lines. This waits for ticket 01, which has to pick one to satisfy "visible".
- Whether token usage belongs in the answer response as well as the audit line. This waits for ticket 04.

## Out of scope

- A full observability stack (Prometheus, dashboards). The deployment is a single host with a person reading logs.
- Alerting or paging.
