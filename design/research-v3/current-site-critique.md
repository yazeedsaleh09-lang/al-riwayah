# AL RIWAYAH current-site critique

## Scope and standard

This critique treats the current product as one system: the Arabic-first public site in `apps/web`, the create/join entry points, and the phone game client driven by the authoritative room state. Findings are tied to the visible route families and the shared interface patterns they use. The quality bar is a publishable Saudi social-deduction product at 320px through desktop, not a collection of individually attractive screens.

## Executive assessment

The current direction has a strong and ownable visual premise: dossier paper, ink, evidence stamps, and red-thread connections fit the act of collectively reconstructing a story. The principal gap is continuity. Marketing presents a cinematic mystery, while operational screens increasingly read as a conventional realtime web app. The rebuild should make the same visual grammar carry conversion, setup, waiting, play, recovery, and results without making critical actions decorative or slow.

The highest-leverage change is to define a small set of shared primitives—case header, evidence card, status strip, action dock, player token, and system notice—and use them everywhere. This would reduce repeated one-off panels while making phase, ownership, privacy, deadline, and readiness legible at a glance.

## Route and surface critique

### Public landing route (`/`)

- **Composition:** The hero should establish three things within the first mobile viewport: what the product is, that every player uses a phone, and the primary action. Any decorative dossier layers that displace the call to action turn atmosphere into friction. Use a **Hero**, followed by **Social Proof / Trust Strip** only where supported, then a compact **How It Works / Steps** sequence and a final **CTA Band**.
- **Arabic typography:** Arabic display lettering can carry the case-file character, but body copy, prices, instructions, and controls need a highly readable Arabic text face with stable weight rendering. Avoid tracking Arabic headings; create emphasis with size, weight, rule lines, stamps, and whitespace. Numerals, room codes, and punctuation need explicit bidi testing.
- **Mobile product presentation:** Desktop evidence-board compositions should collapse into a deliberate vertical narrative, not scaled-down absolute positioning. Screenshots must show the real phone game, including waiting and decision states, rather than only ornamental case imagery.
- **Conversion:** The primary CTA should have one label and one destination. “ابدأ القضية” can open the play gateway; “انضم برمز” remains a lower-emphasis secondary action. Repeating equal-weight CTAs produces indecision.
- **Claims:** Keep case count, player count, availability, duration, and testimonials limited to claims supported by the execution pack.

### Play gateway / create-and-join entry

- Use a **Choice Card Group** for “إنشاء غرفة” and “الانضمام إلى غرفة”; this is a genuine branch, not a tab set.
- Keep the room-code input and player-name input in conventional **Form Field** patterns with persistent labels, examples, inline errors, and a visible submit button. Paper labels and stamps may decorate fields but must not replace labels or focus states.
- Arabic input and Latin room codes require explicit direction boundaries: player name `dir="rtl"`, room code `dir="ltr"` with uppercase normalization displayed without silently changing identity.
- Network progress should replace the pressed button with a local **Loading Button**, while preserving its width. Duplicate submission must be disabled without hiding recovery guidance.

### Create flow

- Creation should be a short **Single-Page Form**, not a wizard unless there are truly dependent decisions. Every additional setup screen delays the social moment.
- Player count (4/5/6) is best expressed as a **Segmented Control** or **Radio Card Group** with an accessible group label.
- Case selection, if only one review case is available, should be a read-only **Selected Item Card** rather than a fake carousel or disabled catalogue.
- Creation success should transition directly into the lobby with the room code and invite/share action in a persistent **Room Header**.

### Join flow

- The primary sequence is room code → identity → join. Validation must distinguish malformed code, unknown room, full room, game started, duplicate/replaced session, expired room, and server unavailable.
- Error copy should say what happened and what the player can do next. Use an inline **Error Message** for field faults and a page-level **Error State** only when the flow cannot continue.
- Pasting a room code should work; automatic submission on the final character should not surprise users.

### Lobby

- The lobby’s dominant object is the people, not a decorative board. Use a **Participant List** with clear host/readiness states and a **Sticky Action Bar** for the host’s start action.
- The room code, copy/share control, player count, and connection health belong in a compact **Room Header**. Do not repeat them in several cards.
- Host-only controls need both textual ownership and disabled explanations for other players. The start condition must communicate exactly what is missing.
- Joining/leaving/reconnecting should update the participant row in place; avoid full-screen celebratory motion for routine presence changes.

### Game shell and all phase routes

- The persistent hierarchy should be: **Phase Header** (phase name and progress) → **Status / Deadline Bar** → private or public content → current action → **Sticky Action Bar**. This keeps phase transitions comprehensible on a phone.
- Private evidence and private answers must be visually distinct from shared room material, with a textual “خاص بك” marker. Do not rely on paper color alone.
- A **Stepper / Progress Indicator** may summarize the 19-phase journey, but on mobile it should show current phase plus “x من 19”, not 19 tiny interactive nodes. Players cannot navigate phases; therefore it must not resemble clickable navigation.
- Repeated evidence, accusation, vote, and reveal screens should be variants of the same primitives, not separately composed pages. The current conceptual repetition is an opportunity to reduce drift in spacing, headings, timers, and confirmation behavior.
- The action dock should remain reachable above mobile browser chrome and safe-area insets. Confirmation states should replace the action with **Submitted / Locked State**, while preserving the selected value so players know what the server accepted.

### Results and replay

- Results should first answer “ماذا حدث؟”, “من فاز؟”, and “لماذا؟” before offering detailed scoring. Use a **Result Summary**, then **Scoreboard**, then **Disclosure / Accordion** for contradiction and evidence detail.
- Scoring must not depend on color or unexplained iconography. Every score change needs a label and reason.
- The end-state CTA hierarchy should be explicit: “العبوا قضية جديدة” only if another supported case/flow exists; otherwise “العودة للرئيسية” and “مشاركة النتيجة”.

## System-level findings

### Marketing/game cohesion

Carry the dossier grammar into the game through material, typography, labels, and connector rules—not through dense decoration. Marketing can use cinematic overlap; play screens need a calmer “working document” mode. The same logo, ink palette, red accent semantics, corner radius, rule treatment, and voice should remain recognizable across both.

### Motion

Motion should explain:

1. a new phase replacing the old one (**Content Transition**),
2. a server-accepted choice becoming locked (**State Change Animation**),
3. a player joining/leaving (**List Insert/Remove**), and
4. evidence relationships being revealed (**Progressive Disclosure**).

Avoid looping ambient movement near timers or answer choices, staggered entrances that delay reading, and wholesale page transitions on reconnect. Reduced-motion mode should remove spatial movement while retaining immediate opacity/state changes.

### Forms and feedback

- Persistent labels, visible required/optional status, 44px minimum targets, and strong `:focus-visible` treatment are non-negotiable.
- Use one error summary only when multiple fields fail; otherwise put the message at the field.
- Separate validation, pending, accepted, rejected, and expired states. A spinner alone does not communicate authoritative acceptance.
- Destructive or irrevocable choices need a concise **Confirmation Dialog** only when reversal is impossible; routine submissions should use inline confirmation.

### Missing or easily under-designed states

Every relevant surface needs authored versions of: first load, empty, partial lobby, minimum players reached, full room, local submitting, server accepted, server rejected, deadline elapsed, connection degraded, offline, reconnecting, session restored, session replaced, room expired, unauthorized/private-content mismatch, stale phase revision, unsupported choice, reduced motion, and narrow-screen overflow.

### Repeated patterns to consolidate

| Repeated need | Canonical pattern |
|---|---|
| Room identity and connection | **Room Header** |
| Phase, count, and deadline | **Phase Header + Status Bar** |
| Private/public story material | **Evidence Card** with explicit privacy badge |
| Player presence and readiness | **Participant List / Avatar Row** |
| One authoritative action | **Sticky Action Bar** |
| Awaiting other players | **Waiting State** with participant progress |
| Recoverable failure | **Inline Alert** with retry |
| Terminal failure | **Full-Page Error State** |
| Accepted irreversible input | **Submitted / Locked State** |
| Explanation after reveal | **Disclosure / Accordion** |

## Priority order

1. Unify the mobile game shell and authoritative action states.
2. Complete reconnect, deadline, stale-state, and privacy-safe error coverage.
3. Normalize Arabic type, bidi behavior, focus, targets, and safe-area handling.
4. Rebuild create/join/lobby around conventional forms and a shared room header.
5. Re-compose the landing page around a single conversion narrative and real product UI.
6. Add restrained phase/state motion only after static hierarchy is complete.
