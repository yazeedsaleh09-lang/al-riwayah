# AL RIWAYAH — light editorial visual audit

Date: 2026-07-28

## Direction

The chosen direction is light editorial: warm paper, near-black statement ink,
muted evidence metadata, and restrained verdict red. The design is confident
through Arabic typography, revision rules, evidence sequencing, and product motion
rather than oversized headlines or decorative effects.

The Alibi Table / circular player-seat direction is rejected. Its component was
removed and no active marketing, lobby, or game surface uses circular/radial seating.

## Signature product object

The homepage hero is a Versioned Testimony editor:

1. the headline establishes that one story changes with every testimony;
2. an authored statement shows a visible revision history;
3. pointer, touch, or keyboard scrubs directly between the original and changed
   wording;
4. the interaction reveals the same contradiction-and-repair logic used in play.

This is a non-circular, product-specific visual. It is not a portfolio ornament and
does not copy Nudge’s layouts, components, assets, or motion.

## System

- Paper: `#f3ecdf`
- Statement ink: `#1a1915`
- Muted ink: `#625a50`
- Verdict red: `#a43f38`
- Warning and success colors are reserved for state meaning
- Arabic: IBM Plex Sans Arabic
- Codes and timestamps: isolated tabular monospace
- Geometry: square controls, hairlines, revision bands, no rounded card field

## Motion and interaction

- revision scrub: direct requestAnimationFrame DOM updates with no tracking tween;
- scrub settle: 220ms;
- menu transition: 220ms transform/opacity;
- phase composition entry: 280ms;
- contradiction statements: 420ms with a 180ms offset;
- pointer, focus, keyboard, selected, locked, waiting, expired, and reconnect states
  all have distinct feedback;
- the client-calibrated deadline only changes presentation at zero; the server still
  advances phases and validates late actions;
- `prefers-reduced-motion` and the product preference preserve all ordered content
  without nonessential travel.

## Responsive acceptance

- 390×844: promise, both primary actions, and the start of the editor are visible
  in the first viewport; the editor and scrub instruction remain readable;
- 768×1024: copy and editor center into one deliberate column;
- 1440×900 and 1920×1080: controlled two-column asymmetry connects copy to the
  revision object;
- active game and lobby evidence covers 320, 360, 390, 430, 768, 1440, and 1920;
- public-route overflow/control evidence covers eight widths through 1920;
- all automated primary controls meet the 44px target.

## Game presentation

The lobby, investigation, contradiction, patch, and result are not weaker versions
of the marketing surface:

- lobby uses live connection and readiness language;
- private answer lock becomes an explicit confidential receipt;
- contradiction shows both named testimonies and the written incompatibility rule;
- a chosen patch becomes a visible new commitment;
- results explain the first fracture, strongest repair, costly decision, and final
  cause before the score axes;
- 4/5/6-player runs produce honest, distinct outcomes rather than staged duplicates.

## Nudge benchmark

The live side-by-side gate was conducted at 390×844, 768×1024, 1440×900, and
1920×1080. A strict reviewer challenged the implementation twice. The first review
rejected the hidden mobile scrub instruction and an expired-but-actionable game
state. Both were fixed and recaptured.

The final score is 12/12 categories at 9.0 or above. See
`artifacts/final-playtest-pass/nudge-comparison.md` for scores and concrete evidence.

## Verification

- `pnpm.cmd lint`: pass
- `pnpm.cmd typecheck`: pass
- `pnpm.cmd test`: 93/93
- content validation: pass
- integration: 26/26
- security: 11/11
- `pnpm.cmd build`: pass
- `pnpm.cmd test:e2e`: 62 executed tests passed; production performance skipped
  there by design and passed separately
- production performance: LCP 2240ms, CLS 0.0027, 196,877 script bytes, longest
  task 160ms

This audit approves the local release candidate. It does not claim the redesign is
live; the same Nudge and production checks must repeat after Render deploys the
approved commit.
