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

### Manual keyboard-only walkthrough evidence

Run against the live stack on `feat/session-2` at `80671ac`, Open WebUI `0.6.5`, with Chromium CDP input only. No element clicks were used.

- **First account:** `/auth` accepted `Tab` to an unnamed header button, `Tab` to `INPUT` `Enter Your Email`, `Tab` to `INPUT` `Enter Your Password`, and `Tab` to `BUTTON` `Sign in`. Visible text stayed `Get started with Open WebUI`, `Email`, `Password`, `Sign in`; there was no `Sign up` or `Create account` control. This is not keyboard-completable in the shell (WCAG 2.2 SC 2.1.1 Keyboard, and SC 4.1.2 Name, Role, Value for the missing control). The documented `POST /api/v1/auths/signup` endpoint was used only to create the disposable walkthrough account, so the remaining sign-in step could be exercised.
- **Sign in:** `Tab`, `InsertText(email)`, `Tab`, `InsertText(password)`, `Tab`, `Enter`. Focus moved to the `DIV` role `textbox` with `aria-label="chat-input"`; visible text showed `Gateway research`, `Suggested`, and the chat composer. Keyboard-completable. The shell's sign-in path meets SC 2.1.1 for this run.
- **Create folder:** from the signed-in page, `Tab` x18 focused `BUTTON` `aria-label="Toggle Sidebar"`; `Enter` showed `New Chat`, `Workspace`, `Chats`, and the existing chat. A further keyboard sweep reached `Workspace` and `Chats`, but never reached `New Folder`. Inspection showed the outer folder button had `visibility:hidden` and its nested button had `tabindex=-1`; visible text contained no `New Folder`. The folder step is blocked and no folder/chat/answer/citation/refusal steps were attempted. This is an Open WebUI shell gap, not ours: SC 2.1.1 Keyboard, SC 2.4.3 Focus Order, and SC 4.1.2 Name, Role, Value.

**Walkthrough result:** blocked at folder creation; `Status: open` remains correct. The gateway error wording remains covered by the automated evidence above, but the end-to-end project flow is not resolved until the shell exposes a keyboard-reachable, named New Folder control.
