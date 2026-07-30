# Reachable player-state matrix

| # | State | Classification before implementation | Required completion evidence |
|---:|---|---|---|
| 1 | Room created | Complete | Create integration + browser transition |
| 2 | Joining | Complete | Submit/busy browser state |
| 3 | Lobby | Visually broken in clean build | Import/consolidate Golden Master styles and compare at 390×844 |
| 4 | Player joined | Complete | 4/5/6 roster propagation |
| 5 | Player left/disconnected | Functionally incomplete | Preserve roster state; wait for authoritative deadline fallback |
| 6 | Host indicator | Complete | Lobby browser assertion |
| 7 | Host transfer | Complete with coverage gap | Disconnect/restore conflict test |
| 8 | Ready | Complete | Browser and integration |
| 9 | Unready | Complete | Browser and integration |
| 10 | Minimum-player warning | Complete | 3-player blocked-state assertion |
| 11 | Start blocked | Complete | Not-all-ready and fewer-than-four assertions |
| 12 | Game starting | Complete | Phase transition evidence |
| 13 | Shared planning | Complete | Reason/location/role/review phases |
| 14 | Private information | Complete with recursive-redaction gap | Per-owner DOM/payload assertions |
| 15 | Question intro | Complete | Header/question number/secret status |
| 16 | Answer selection | Broken | Local selection must not submit |
| 17 | Selected answer | Broken | `aria-checked`, pale-red state, confirm enabled |
| 18 | Answer submission | Broken UI contract | Confirm sends one revision-bound intent |
| 19 | Locked answer | Complete after confirmation fix | Receipt and immutable replay assertion |
| 20 | Timer urgency | Complete | Deadline ring + reduced-motion evidence |
| 21 | Time expired | Complete for connected client | Forced fallback and late-intent rejection |
| 22 | Waiting for players | Complete | Private receipt with no leaked choices |
| 23 | Contradiction reveal | Complete | Public explanation only after release |
| 24 | Discussion/repair | Complete | Patch phase browser assertion |
| 25 | Follow-up question | Complete | Private follow-up and revision validation |
| 26 | Final commitment | Complete | Final question lifecycle |
| 27 | Result calculation | Integrity gap | Attribute only publicly released causal evidence |
| 28 | Result reveal | Visually broken in clean build | Golden Master result styling and terminology |
| 29 | Replay | Complete | Same room, fresh private state |
| 30 | New group | Complete | New code and cleared old session |
| 31 | Reconnect | Security gap | Single-room binding, token rotation, correct private restore |
| 32 | Offline | Complete | Overlay/status evidence |
| 33 | Server unavailable | Complete | Bounded retry and recovery action |
| 34 | Room closed/expired | Complete in join flow | Direct/restore safe error evidence |
| 35 | Unrecoverable/session replaced | Accessibility gap | `main` target, safe copy, no private leak |

## Authoritative invariants to re-verify

- Every gameplay intent contains schema-valid identity, room, request ID, phase revision,
  allowed option, and deadline context.
- Only the server advances phases, applies fallback answers, scores contradictions, and
  publishes results.
- One socket is bound to at most one room/player session.
- A disconnected participant remains part of the active deadline contract and receives
  the deterministic no-response fallback before advancement.
- Public DTOs contain no private evidence, question, answer, token, or unreleased
  contradiction keys at any depth.
