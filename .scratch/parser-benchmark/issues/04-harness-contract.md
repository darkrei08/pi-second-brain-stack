# B4: Define the reproducible parser benchmark harness

Type: decision
Status: resolved
Blocked by: B1, B2, B3

## Question

What execution contract turns one operator-supplied corpus and runtime matrix into a safely recorded result?

## Answer

Use `node .scratch/parser-benchmark/run-benchmark.mjs --config <path>`. The config is JSON with an external `corpus_root`, external `result_path`, cases, and runtime rows. Each runtime row declares `id`, `parser_type`, `mode` (`external` or `synthetic`), an exact `version`, an argv `command`, repeat count, and timeout. Commands are spawned with `shell: false`; placeholders `{input}`, `{output}`, `{case_id}`, `{parser_type}`, and `{corpus_root}` are substituted. The wrapper writes raw parser JSON to `{output}`.

The harness generates a deterministic envelope from the case ID and input hash, calls the repository's `normalizeParserOutput`, computes the metrics in B3, removes temporary raw output, and atomically writes the result outside the repository. It never imports a parser package, sends corpus data over the network, stores raw text in the result, or changes package dependencies.

## Acceptance

- Invalid config, path escape, runtime failure, timeout, malformed parser output, and malformed truth fail closed per case without partial result claims.
- One failed case does not hide other case results; the CLI exits non-zero when any run fails.
- The result contains config/environment metadata, runtime/version/mode, case summaries, aggregate metrics, and explicit `not_measured` fields.
- A synthetic fake runtime can prove the harness end to end and is labeled exactly as synthetic.
