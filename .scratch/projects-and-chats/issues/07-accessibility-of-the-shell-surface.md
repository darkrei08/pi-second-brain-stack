# 07: Make the shell surface usable with a keyboard and a screen reader

Type: grilling
Status: open
Blocked by: none

## Question

The operator's own daily use includes the shell, so the whole path has to be operable without a mouse: create a folder, start a chat inside it, attach a document, read a refusal. Most of the surface belongs to Open WebUI, so the honest scope here is what we control: the wording and the shape of the errors our gateway returns, the filter and pipe output that reaches the person, and a documented keyboard-only walkthrough of the project flow. Verify what the shell already does before claiming a gap, and name the accessibility standard being checked against.

## Acceptance criteria

- A keyboard-only walkthrough of the project flow with the exact steps and the result of each, run against a live stack or marked blocked with the reason.
- Every gateway error the person can see is checked for a message that names the cause and the next action.
- Any gap that is ours is a ticket of its own with the failing step; any gap that is the shell's is recorded as an upstream note.

## Answer

Fixed the gateway and Open WebUI-controlled error surface: authentication, unexpected gateway failures, streaming model failures, and model-capacity refusals now name the cause and the next action without changing their codes or HTTP statuses. Added public-seam gateway tests for malformed and empty bodies, non-object bodies, research, chat, collection suggestion, document ingest, unconfigured readiness, unavailable streaming, and pre-header/post-header streaming timeouts. Added Python `unittest` coverage for missing and empty messages, invalid folder ids, missing tokens, malformed retrieval matches and citations, unresolved and stale citations, and Pipe identity/body validation.

The manual keyboard-only browser walkthrough remains open and is not claimed here. The live shell interaction, screen-reader behavior, and Open WebUI-owned accessibility gaps remain for the follow-up walkthrough.
