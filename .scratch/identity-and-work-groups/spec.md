# Spec: identity and work groups

Type: spec
Status: ready-for-agent
Source map: [Identity and work groups](map.md)

## Problem Statement

The operator works alone today. The system authenticates callers with a token that maps to one fixed owner, so every document in the corpus belongs to the same person: there is no way to give a collaborator access to one body of work without giving them all of it, and no way to take that access away. Work that belongs together, such as one client's contracts with the notes around them, cannot be isolated from unrelated work, and a chat cannot be started inside one body of work so that its answers stay inside it.

## Solution

The administrator sets up the instance once, approves who may work in it, and organises work into groups, each holding projects. A person sees the documents of the groups they belong to and nothing else. Starting a chat inside a group, or inside a project of that group, answers only from that body of work and cites only what the asker is allowed to read. The shell keeps being the only place where users, roles, groups and memberships live; the backend keeps being the only place where documents, segments, collections and citations live, and it derives who the caller is instead of taking their word for it.

## User Stories

1. As the operator on a fresh instance, I want to create the first administrator account through a documented procedure, so that I can sign in before any other person exists.
2. As the first administrator, I want my requests to reach the corpus as an identified owner, so that the system knows whose work I am touching.
3. As an administrator, I want a new person who signs up to reach nothing until I approve them, so that a stranger on the network cannot read the corpus.
4. As an administrator, I want to approve or disable a person, so that access ends when someone leaves.
5. As an administrator, I want to create a work group and put people in it, so that a body of work is shared only with the people working on it.
6. As an administrator, I want to take a person out of a group and know that their next request is already refused, so that revocation does not wait for a restart.
7. As a member of a group, I want to load a document into the group, so that everyone in it can rely on it.
8. As a member of a group, I want to load a document into one project inside the group, so that a client's material stays with that client.
9. As a member of a group, I want to move a document from one project to another, so that a misfiled document is fixed rather than duplicated.
10. As a member of a group, I want to start a chat inside the group, so that my question is answered from the group's material.
11. As a member of a group, I want to start a chat inside one project, so that the answer stays with that project's material rather than the whole group's.
12. As a member of one group, I want a person in another group to be unable to see, cite or infer my documents, so that isolation is a property of the system and not of politeness.
13. As a member, I want every refusal I can see to name the cause and the next action, so that I can fix it myself instead of guessing.
14. As the operator, I want to know what happens when someone attaches a file inside a chat, so that I am not surprised by a second copy of the corpus.
15. As the operator, I want one recorded command per path above, so that "it works" is evidence I can re-read a month later.

## Implementation Decisions

- **The shell owns identity.** Open WebUI promotes the first signup to administrator, assigns `pending` to new registrations under `DEFAULT_USER_ROLE=pending`, holds credentials and sessions, and offers RBAC groups at `/api/v1/groups/`. No user, role, group or membership table is added to the backend.
- **The group is the owner.** `owner_id` already is the security principal in PostgreSQL, with 1:1 owner uniqueness on `documents(document_id, owner_id)` and `collections(collection_id, owner_id)`. A group owns its corpus as `urn:group:<group_id>`, which needs no ACL tables and rewrites no stored row.
- **A caller never names their own owner.** `rejectCallerOwner` keeps refusing `owner_id` in a body with `400 invalid_request`; the owner is derived from the authenticated principal.
- **The handoff is signed.** `__user__` carries `id`, `email`, `name` and `role` but not memberships, and the filter holds one shared bearer token, so a bare user header is forgeable. How the claim is signed, and whether it is per request or issued once per user, is decided in [the handoff ticket](issues/04-how-the-gateway-learns-the-owner.md) with the rejected alternatives written down.
- **A project is a collection with the group as owner**, so existing scope machinery carries it: chats at group level send no collection ids, chats inside a project send that collection.
- **Attachments are not ingested synchronously.** A filter receives metadata references only and the shell's extraction is asynchronous, so a chat attachment is refused with the alternative named, or ingested out of band with its availability reported. Silence is not an option.

## Test Seams

One primary seam, because identity is a routing and authorization property, not a data-shape property: **the gateway's HTTP surface**. Every story above is exercisable by two callers presenting different identities against the same running gateway, asserting the response body and the status: a match, an empty result, or a refusal.

A second seam exists and is unavoidable: **the plugin entry points** (the filter's `inlet`, the pipe's function), because the rule "an unapproved role reaches nothing" lives in our code inside the shell and cannot be observed from outside the shell's process. Plugin tests there are pure functions over inputs and outputs, with no browser and no stack.

Explicitly not a seam: the database. A test asserting rows in `documents` or `collections` couples the suite to storage that the contract does not expose; the isolation property is proven by what a caller receives.

## Out of Scope

- A first-party UI, and any fork or vendoring of Open WebUI.
- Per-document share links, fine-grained ACLs below group and project, or cross-group read grants.
- Screens that do not exist in the pinned shell image. Where the shell lacks a control, the finding is recorded against the ticket rather than worked around.
- Migration of any existing single-owner corpus into a group: the operator has none in production yet, and doing it speculatively risks the data it would rewrite.

## Further Notes

- The open accessibility findings live in [ticket 07 of the projects-and-chats map](../projects-and-chats/issues/07-accessibility-of-the-shell-surface.md) and are not resolved by this spec.
- The end-to-end proof for every story above is [its own ticket](issues/08-the-end-to-end-isolation-proof.md), because a claim about isolation that nobody tries to break is not evidence.
