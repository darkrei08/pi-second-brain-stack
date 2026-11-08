# 03: First-party surface or borrowed shell

Type: decision
Status: open
Blocked by: Operator browser access to the live ChatGPT, Perplexity, Claude and Gemini interfaces.

## Question

Does the second brain keep borrowing another product's shell (V1: Open WebUI), or does it grow a first-party surface that owns conversation, project and document state itself? And once the comparison is redone, which interaction model does that surface follow?

## Why this is the next decision

V1 was decided on 2026-10-29 against a requirement that was chat plus folders and pins over the corpus, and it was decided among open-source shells only: `research-ui-landscape.md` evaluated ten open-source candidates from the GitHub API and no vendor product at all. ChatGPT and Perplexity appear there once, at line 5, only as the owner's phrase for the desired feel.

The requirement has since grown beyond what that comparison measured:

- a project is the unit a person thinks in, holding both conversations and documents;
- retrieval scope is chosen per turn from a sources panel, not per conversation;
- an answer cites inline, the citation hovers to a quote and clicks through to the passage;
- saving an answer promotes it to a source;
- voice input in the composer;
- a mode switch in the composer between answering over the corpus and multi-step research.

V7 makes the shell the only store for conversations, pins and folders. A first-party surface cannot borrow that store, and V2 already refused twice to mirror one. So this is not a contradiction of V1: it replaces V1's premise, and makes V1, V2 and V7 conditional on the outcome here.

The operator deferred the comparison deliberately on 2026-11-08. It is to be redone against the live interfaces once browser access is granted, rather than against documentation and help-centre labels, because those labels are themselves mid-rollout and do not describe the rendered behaviour.

## Scope

- Review five live surfaces as interaction models once access exists: ChatGPT, Perplexity, Claude, Gemini, and NotebookLM (already named in the requirement as the source-targeting model).
- Per product, record: how a project or workspace bundles conversations and files, how per-turn source scope is presented, how a citation renders and what hover and click do, how an answer is saved or promoted, how voice entry behaves, and what a research mode looks like while it runs.
- Separate a product decision from an implementation luxury, so the surface can be specified without copying a competitor.
- Decide the shape: borrow Open WebUI, or build first-party. If first-party, name the model and the record types it must own.

## Acceptance criteria

- [ ] each of the five reference surfaces is reviewed with a dated capture or a quoted observation, never from memory or a help-centre label
- [ ] every requirement above is mapped to an observed interaction or recorded as absent in all five
- [ ] the decision states the fate of V1, V2 and V7 explicitly: superseded, amended, or upheld
- [ ] the decision names who owns conversation, project and document state, and every record type that follows from it

## Non-goals

Installing or deploying any shell, procurement, UI implementation, licensing decisions, and any claim about a vendor surface that was not observed live.

## Answer

Open. Deferred by the operator on 2026-11-08 until browser access to the live interfaces is granted.

## Comments

Opened on 2026-11-08 after the operator asked for the comparison to be redone against the real products instead of the open-source field, and then for the interface to be designed for real.
