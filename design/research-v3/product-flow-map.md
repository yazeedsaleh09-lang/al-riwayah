# AL RIWAYAH product flow map

## Purpose

This map joins public conversion, room setup, the server-authoritative 19-phase match, recovery, and terminal states into one phone-first product flow. Names in **bold** are established UI-pattern names (NameThatUI terminology or the closest unambiguous industry name); they describe presentation, not client authority.

## 1. Public conversion

1. `/` — landing
   - **Hero**: value proposition, 4–6 phones, primary “ابدأ القضية”.
   - **Feature Grid**: social play, no television, Arabic case experience.
   - **How It Works / Steps**: create room → friends join → investigate and decide.
   - **Product Preview**: truthful game screens across briefing, private evidence, decision, and result.
   - **FAQ / Accordion**: device, group size, privacy, and play expectations.
   - **CTA Band**: primary create/play action; secondary join-by-code.
2. Primary CTA → play gateway.
3. Secondary “انضم برمز” → join form with the room-code field focused.

Global public fallbacks: **Skeleton Screen** for deferred media, **Inline Alert** for nonessential fetch failure, and **Full-Page Error State** only when the route itself cannot render.

## 2. Gateway, create, and join

### Play gateway

- **Choice Card Group**
  - إنشاء غرفة → create branch.
  - الانضمام إلى غرفة → join branch.

### Create branch

1. Player identity — **Form Field**.
2. Group size (4/5/6) — **Segmented Control** or **Radio Card Group**.
3. Case — **Selected Item Card** for a one-case review build.
4. Submit — **Loading Button**.
5. Server creates room and binds creator identity.
6. Success → lobby; failure → **Inline Error Message** with retry.

### Join branch

1. Room code — LTR **OTP / Code Input** only if each cell supports paste and accessible naming; otherwise one conventional **Text Field**.
2. Player name — RTL **Text Field**.
3. Submit — **Loading Button**.
4. Server validates schema, room, capacity, phase, and identity.
5. Success → lobby or restored current phase.
6. Failure branches:
   - malformed code → field **Error Message**;
   - room not found/expired → **Empty State** with create-room CTA;
   - room full/game started → **Inline Alert**;
   - server unavailable → **Error State** with retry.

## 3. Lobby

- Persistent **Room Header**: code, copy/share, connection indicator.
- **Participant List**: joined players, host marker, readiness/presence.
- **Progress Indicator**: `n / required`.
- Host: enabled **Sticky Action Bar** when start rules pass.
- Non-host: **Waiting State** explaining that the host starts.
- Presence events: **List Insert/Remove Animation**; no modal interruption.

Server start validation is authoritative. Rejection remains in the lobby and updates the actionable reason.

## 4. Shared 19-phase match frame

All 19 canonical engine phases should render inside one shell:

- **Phase Header**: localized phase title and `current / 19`.
- **Status Bar**: deadline, connectivity, and outstanding-player count.
- **Progress Indicator / Stepper**: read-only; never phase navigation.
- **Content Region**: public briefing, private evidence, prompt, board, or reveal.
- **Sticky Action Bar**: the single currently allowed action.
- **Submitted / Locked State**: accepted option plus waiting status.

The engine’s canonical phase identifiers remain the source of truth. The UI mapping below uses ordinal phase slots so copy or phase identifiers cannot accidentally fork protocol semantics.

| Phase | Product purpose | Primary UI pattern | Required state coverage |
|---:|---|---|---|
| 01 | Open the case and orient the group | **Briefing / Intro Screen** | loading, ready, reconnect |
| 02 | Present public case context | **Long-Form Content / Dossier** | read progress, reduced motion |
| 03 | Assign or confirm private player context | **Private Content Reveal** | concealed, revealed, restored |
| 04 | Establish the first shared objective | **Instruction Panel** | ready, waiting |
| 05 | Deliver the first private information set | **Evidence Card Stack** | private, acknowledged |
| 06 | Collect the first bounded player choice | **Radio Group + Sticky Action Bar** | idle, submitting, locked, rejected |
| 07 | Wait for the group without exposing answers | **Waiting Room / Progress State** | partial, complete, timeout |
| 08 | Reveal the shared consequence | **Progressive Disclosure / Reveal** | entering, complete |
| 09 | Build or update the shared evidence model | **Evidence Board / Relationship Map** | empty, populated, narrow-screen list fallback |
| 10 | Deliver the second information set | **Evidence Card Stack** | public/private distinction |
| 11 | Collect a second bounded decision | **Choice Cards** | allowed, disabled, submitting, locked |
| 12 | Resolve and explain that decision | **Reveal + Explanation Panel** | success, contradiction, no-match |
| 13 | Focus the group on suspects/options | **Selectable List / Card Grid** | none selected, selected |
| 14 | Collect the accusation or vote | **Ballot / Radio Group** | eligible, submitted, deadline elapsed |
| 15 | Wait for remaining ballots | **Waiting State** | count only; never public answers |
| 16 | Resolve votes and contradictions | **Result Breakdown** | tie, clear result, server correction |
| 17 | Reveal the case truth | **Narrative Reveal** | reduced motion, resume after reconnect |
| 18 | Calculate and explain score | **Score Breakdown / Scoreboard** | per-player reasons, no color-only meaning |
| 19 | Close the session | **Result Summary + CTA Group** | share, return home, supported replay |

For each ordinal slot, implementation must bind the exact phase identifier, allowed option schema, deadline, and revision from `packages/game-engine` and `packages/protocol`; the client must not infer transitions.

## 5. Results and post-game

1. **Result Summary** — outcome and winning side/player(s).
2. **Scoreboard** — ranked or grouped results with textual score reasons.
3. **Accordion / Disclosure** — evidence, contradictions, and decision audit.
4. **Share Sheet / Copy Link** — only public-safe result material.
5. **CTA Group**
   - supported next case/replay;
   - return to landing.

Refresh on results restores the same public-safe terminal DTO; it must not revive private evidence through public room state.

## 6. Reconnect and session recovery

Reconnect is an overlaying system flow, not an extra game phase:

1. socket lost → nonblocking **Connection Banner**;
2. retry underway → **Reconnecting State** retaining last safe render;
3. browser presents locally held recovery token;
4. server validates, rotates token, replaces old socket, and returns the current safe DTO;
5. success → **Toast / Status Message**, then current phase;
6. failure:
   - expired/invalid token → **Session Expired State** and join/home action;
   - session replaced → **Signed Out Elsewhere State**;
   - room expired → **Room Expired Empty State**;
   - transient server fault → retryable **Error Banner**.

Never place the recovery token in a URL, public room payload, error copy, logs exposed to the client, or share action.

## 7. Cross-cutting loading and error matrix

| Situation | UI pattern | User action |
|---|---|---|
| Initial app/room fetch | **Skeleton Screen** | none |
| Local submit pending | **Loading Button** | duplicate submit disabled |
| Accepted, waiting on others | **Submitted / Locked State** | none |
| Slow/degraded connection | **Connection Banner** | optional retry |
| Recoverable request failure | **Inline Alert** | retry |
| Field/schema failure | **Inline Error Message** | correct field |
| Stale phase revision | **Status Message**, refresh from server | none |
| Deadline elapsed before submit | **Expired State** | wait for resolution |
| Option no longer allowed | **Inline Alert** plus refreshed choices | choose again |
| Unauthorized/private mismatch | privacy-safe **Error State** | return/reconnect |
| Offline | persistent **Offline Banner** | retry when online |
| Empty/expired room | **Empty State** | create or join |
| Unhandled route fault | **Full-Page Error State** | retry/home |

## 8. Navigation and authority rules

- Public routes may navigate normally; match phases may not be deep-linked as client-owned pages.
- Back navigation during a match must not rewind phase state or reveal earlier private material.
- Only the server advances phase, accepts deadlines, computes contradictions, selects private questions/evidence, and publishes results.
- Every mutation passes schema, identity, membership, phase revision, deadline, and allowed-option validation.
- Public DTOs are allowlists; waiting counts and readiness may be public, private choices and evidence may not.
- The 19-phase indicator communicates position only; it is not a **Tabs**, **Carousel**, or navigable **Stepper**.
