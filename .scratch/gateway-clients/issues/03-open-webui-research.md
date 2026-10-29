# 03: Add Open WebUI retrieval and bounded research

Type: implementation
Status: claimed
Blocked by: None

## Question

Can the gateway provide bounded, multi-step grounded research and expose it through standalone Open WebUI Filter and Pipe functions without relying on an installed shell at test time?

## Context

`POST /v1/answers` already performs owner-scoped retrieval, grounded synthesis, citation revalidation, and uncertainty reporting. `POST /v1/retrieval/query` is available to the inlet Filter. The user approved adding `POST /v1/research` with at most three retrieval rounds (initial question plus up to two follow-up queries), one final synthesis, and the existing answer response fields aggregated. Open WebUI `folder_id` maps directly to one gateway `collection_id`; an explicit unknown or foreign ID must never fall back to unscoped retrieval.

Open WebUI's documented Filter `inlet` receives `body` and can declare `__user__`; its Pipe can declare `__user__` and `__metadata__`. No Open WebUI shell is installed in this checkout.

## Acceptance criteria

- [x] Add authenticated `POST /v1/research`. Accept `question`, optional `collection_ids`, `embedding_model_id`, `limit` (1-100, default 6), and `max_tokens` (1-8192, default 600); reject unsupported fields. Derive `owner_id` from the authenticated identity and reject a caller-supplied owner.
- [x] Run the initial retrieval, then at most one planner call that can return up to two follow-up queries as strict JSON. Follow-up queries are bounded to 256 characters, deduplicated, and used only as search text; they cannot change owner, collection scope, model, URL, or limits. Invalid planner output stops expansion and uses the evidence already retrieved.
- [x] Keep all retrieval rounds on the same authenticated owner and collection scope. `limit` is the maximum total number of unique evidence segments across rounds; divide the available evidence budget across at most three rounds and deduplicate by segment ID in first-seen order.
- [x] Stop expansion if the initial retrieval is empty, the planner yields no valid follow-up query, or a follow-up adds no new evidence. Empty retrieval makes no planner or synthesis call and returns the existing insufficient-evidence result.
- [x] Perform one final synthesis from the accumulated evidence. Return the same fields and citation/uncertainty semantics as `POST /v1/answers`: `answer`, `citations`, `unresolved_citations`, `stale_citations`, `retrieval`, and `uncertainty`. Revalidate cited provenance and freshness before returning.
- [x] Add a standalone Open WebUI inlet Filter. Use `body.folder_id` as the optional collection scope and `__user__.id` as `x-shell-user-id`; keep the bearer token and gateway URL in admin Valves, never in request bodies or logs. Retrieve scoped context from `/v1/retrieval/query`, insert it as explicitly untrusted evidence, and clear the handled `folder_id` so Open WebUI does not also retrieve that folder through its built-in RAG. Preserve unrelated request fields and attachments.
- [x] Add a standalone Open WebUI Pipe. Read the latest user message, `__user__.id`, and `__metadata__.folder_id`; call `/v1/research` with the same direct folder-to-collection mapping. If no folder is selected, use the existing owner-wide retrieval behavior; an explicit unknown/foreign folder must remain empty. Return the grounded answer with citation and uncertainty information visible to the user.
- [x] Use HTTPS for non-loopback gateway URLs, disable redirects, bound outbound HTTP timeouts, and mask all plugin errors. Never log credentials, user prompts, corpus text, provider bodies, or raw exceptions.
- [x] Add Node tests for the gateway route and Python tests for the Filter/Pipe using fake storage/chat/HTTP responses. The tests must not import or start Open WebUI. Cover auth/owner mapping, folder scope and no-widening, bounded rounds, deduplication and citation/uncertainty behavior, no-evidence short-circuit, malformed follow-up output, and sanitized plugin failures.
- [x] Update `docs/development.md` with setup and exact test commands, the direct folder/collection mapping, and an explicit statement that installed-shell hook loading, UI configuration, real `folder_id` propagation, and live provider behavior cannot be verified here.
- [x] Do not add a shell install/deployment, new model/provider, telemetry, concurrency queue, or dependency unless implementation evidence proves it necessary.

## Verification

- `node --test test/answer-question.test.js test/gateway-server.test.js`
- `npm test`
- `python3 -m unittest discover -s integrations/open-webui/tests -v`
- `TEST_DATABASE_URL=postgres://rag:replace-this-locally@127.0.0.1:55432/rag npm run test:integration`

## Non-goals

Installing or deploying Open WebUI, a folder-ID translation table, collection provisioning API, streaming research, provider-specific query planning, changing existing `/v1/answers` or chat-completions contracts, TLS termination, metrics, and deployment packaging.

## Answer

T5a bounded `POST /v1/research` is committed as `1c010f1`. Focused research/answer/gateway suites passed 39/39 (exit 0); full `npm test` passed 99, skipped 22 expected database-dependent tests, and failed 0 (exit 0); isolated pgvector/pg17 integration passed 26/26 (exit 0). Authenticated `/v1/answers` base-vs-change differential was byte-identical (HTTP 200). Native review `review-8a701ba5806458d2` approved and was acknowledged.

T5b Filter/Pipe implementation and documentation are complete. `python3 -m unittest discover -s integrations/open-webui/tests -v` passed 8/8 (exit 0); `npm test` passed 99, skipped 22 expected database-dependent tests, and failed 0 (exit 0); Python compilation and `git diff --check` passed. No Open WebUI shell is installed, so hook loading, UI Valve configuration, real folder propagation, and live shell/provider behavior remain unverified. T5b is committed as `043d064`; native review `review-2818ba3a0b5f4875` approved and was acknowledged after risk, resilience, readability, and reliability lenses (one informational readability suggestion). ASSESS also required an independent verifier for security item 2, but the Pi subagent failed to launch because of the platform usage limit; it was not retried. Thus native review and the listed functional checks passed, while that separate verifier is unavailable. Hook loading, UI Valve configuration, real folder propagation, and live provider behavior remain unverified.
