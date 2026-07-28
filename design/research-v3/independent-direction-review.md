# Independent direction review

> Historical review only. Its Night Table selection was superseded by owner
> steering on 2026-07-28. The Alibi Table/circular player-seat concept is fully
> rejected; see `selection-decision.md` for the active Versioned Testimony
> direction.

Review date: 2026-07-28
Reviewer posture: independent challenge, not author confirmation.

## Evidence boundary

The review covered the reference matrix, moodboard constraints, Arabic typography
audition, all three direction briefs, and the six supplied 1440×900 / 390×844
captures.

The research is responsible about access and provenance, but much of the Mobbin,
Cosmos, Pinterest, and Awwwards material is principle-level evidence rather than
screen-level visual evidence. It should therefore constrain the design rather than
be treated as proof that a direction is visually resolved. Likewise, each direction
capture shows a hero and one representative product mechanism—not rendered lobby,
question, reconnect, patch, and result screens. Scores for those downstream states
are judgments about system extensibility, not validation of finished screens.

## Scorecard

Scores are 1–10. For implementation risk, 10 means lower risk.

| Criterion | Night Table | Six Seats | Call Sheet |
|---|---:|---:|---:|
| Visual fit | 9 | 7 | 7 |
| Product clarity | 9 | 8 | 7 |
| Motion feasibility | 9 | 8 | 8 |
| Responsive Arabic | 7 | 7 | 6 |
| Performance | 9 | 9 | 9 |
| Accessibility | 7 | 6 | 6 |
| Route coherence | 9 | 6 | 8 |
| Implementation risk (10 = low) | 8 | 7 | 8 |
| Distinctiveness | 8 | 7 | 6 |
| Conversion | 8 | 7 | 6 |
| **Total / 100** | **83** | **72** | **71** |

## Direction 01 — طاولة الليل (Night Table)

### What the evidence supports

- It is the only capture that explains the product model and presents both primary
  entry actions in the same first viewport.
- The shared testimony, named player positions, readiness text, and one visible
  timing discrepancy establish “one story / private phones / one break” faster than
  either competing direction.
- Its ellipse, testimony rectangle, player pills, and contradiction line have
  separate semantic jobs. That gives the system a credible path from marketing
  hero to lobby, private question, contradiction, patch, and causal result.
- The desktop and phone captures recompose rather than merely shrink. The phone
  preserves actions before the table and keeps the central testimony readable.
- The proposed motion is causal and can be implemented with transform, opacity, and
  SVG stroke progress, with a straightforward reduced-motion replacement.

### What must be corrected

- The display line is still too dominant. It recreates the existing “typography is
  the composition” failure, especially at 390px, and pushes the proof surface
  downward. Cap the real hero closer to the documented 48px phone / 72px desktop
  ceiling and let the table carry more of the premise.
- Routine copy and player chips are too small and quiet. Player/state labels must
  remain at least routine-readable, and every readiness or contradiction state must
  have text or geometry in addition to color.
- The red threads and near-black table can drift into conspiracy-board or forensic
  cliché. Use one line only for a real relationship, keep the room socially warm,
  and reframe the premise away from “interrogation.”
- The table cannot be the only representation of lobby state. Dynamic 4/5/6-player
  names, host state, connection state, and start eligibility need a linear semantic
  roster that works at 320px and for assistive technology.
- The capture proves a timing contradiction, but not long questions, answer radio
  groups, reconnect recovery, or result causality. Those states require dedicated
  compositions inside a stable shell; they should not be forced into a miniature
  table.
- Primary and secondary actions need a stronger visual relationship and a clear
  keyboard focus treatment. Their order must remain logical in RTL DOM order.

## Direction 02 — ستة مقاعد (Six Seats)

### Strengths

- It is immediately more welcoming and social than the other concepts.
- The player count and shared-centre idea are easy to understand.
- The light surface offers good tonal relief, and the mobile capture keeps its main
  orbit within the viewport.

### Why it should be rejected

- The concentric orbit is an effective lobby diagram but a weak full product
  grammar. Long Arabic questions and vertically stacked radio choices cannot
  plausibly become spokes without compression, reading-order ambiguity, or large
  empty areas.
- The square contradiction label looks applied over the circle rather than caused
  by two precise answers. It communicates interruption, not the contradiction rule.
- The mobile orbit is already crowded with six names. Connection, host, ready,
  eliminated, and reconnect states would either become tiny or collide.
- The single “كوّنوا دائرتكم” action obscures the essential create-versus-join
  decision and weakens conversion.
- Circles, avatar rings, and contribution dials are familiar collaboration/game
  patterns. They make the product friendly, but reduce the social-thriller tension
  and distinctiveness.
- A rotating ring during phase changes risks implying progress or rearranged player
  identity without adding meaning.

The direction could donate its warmer social tone and explicit seat-count model,
but should not control the shipped interaction system.

## Direction 03 — سجل الجلسة (Call Sheet)

### Strengths

- The two testimony slips and discrepancy card make authored content tangible.
- Axis-based paper motion and a single stamp impact are feasible, cheap, and easy
  to remove under reduced motion.
- A chronological rail could support a causal result recap.

### Why it should be rejected

- It most directly repeats the current product’s rejected editorial dossier
  language: giant display type, ruled grid, marginal metadata, rotated sheets,
  stamps, and a persistent side rail.
- The phone capture demonstrates the responsive cost. The headline becomes crowded,
  the vertical rail permanently removes usable width, the cards tilt inside a narrow
  column, and metadata falls below comfortable routine size.
- The metaphor is document-first rather than people-first. It reads as case
  administration or forensic review before it reads as a lively 4–6-player social
  game.
- The one “افتح ملف القضية” action does not explain create versus join and leans
  into crime-product cliché.
- Repeating paper slips across lobby, question, contradiction, patch, and result
  would make phases visually similar rather than clarifying state change.
- The dossier vocabulary is distinctive only relative to generic app UI; within
  mystery products it is conventional.

The chronological result idea is worth carrying forward, but not the persistent
ledger shell or stamped-document identity.

## Selection

**Select Direction 01 — طاولة الليل (Night Table) as the production base.**

It wins because its signature object is a legible model of AL RIWAYAH’s actual
multiplayer mechanic, it survives the desktop-to-phone transition most coherently,
and it can connect the marketing promise to real product states without changing
metaphors. The selection is not an approval to reproduce the concept capture
pixel-for-pixel.

Production acceptance depends on these non-negotiable changes:

1. reduce hero typography and raise product proof in the first viewport;
2. keep routine Arabic at 16px or larger and eliminate atmospheric microcopy;
3. pair the spatial table with semantic lists and explicit status text;
4. reserve verdict red for one causal break and avoid forensic decoration;
5. give question, reconnect, patch, and result states their own stable-shell
   compositions;
6. preserve both create and join actions with clear hierarchy;
7. validate 4/5/6 players, 320–430px widths, keyboard flow, contrast, and reduced
   motion using rendered product states—not only a hero prototype.
