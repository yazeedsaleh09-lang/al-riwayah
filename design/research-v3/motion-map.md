# Production motion map

Date: 2026-07-28

The motion system follows one rule: movement must guide attention, communicate
authoritative state, or preserve spatial continuity. The implementation uses CSS
transforms, opacity, clip paths, and SVG stroke progress. No new animation
dependency was added because the platform already supplies every required
primitive, keeping the review build smaller and avoiding a library for behavior
that does not need one.

## Central tokens

| Token | Value | Use |
|---|---:|---|
| `--duration-select` | 160ms | press and selected-state feedback |
| `--duration-lock` | 220ms | server-accepted lock/seal |
| `--duration-panel` | 300ms | menus, player insertion, compact panels |
| `--duration-phase` | 280ms | one phase replacing another |
| `--duration-reveal` | 840ms | contradiction relationship reveal |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | smooth deceleration |
| `--ease-in-out` | `cubic-bezier(0.76, 0, 0.24, 1)` | controlled separation |
| selection scale | `0.98` | tactile press without layout shift |
| entry distance | `8–18px` | short spatial continuity only |

No component uses `transition: all`, `will-change: all`, layout-property
animation, scroll hijacking, or a leaked `requestAnimationFrame` loop.

## Focal motion by product moment

| Moment | Motion | Product reason | Reduced-motion result |
|---|---|---|---|
| Homepage hero | revision window settles, old phrase retires, new phrase inserts, written reason appears | shows “one story becomes a different version” without implying public private answers | complete before/after/reason state renders immediately |
| Gallery Rail | one master scroll progress selects the foreground product state and index | explains the 60-second journey while preserving native scroll | all six stages become an ordered vertical walkthrough |
| Contradiction demo | pointer/touch controls one continuously aligned reveal; explicit button exposes written rule | compares the answer and the evidence at the exact same coordinates | both aligned layers remain visible with written explanation |
| Lobby | player rows enter through short transform/opacity and square status mark/state text changes in place | communicates presence and readiness without celebration | rows and status text update instantly |
| Answer | pressed option scales to 0.98; accepted option becomes an ivory locked surface with a short seal | distinguishes local touch from authoritative accepted state | locked styling appears immediately |
| Phase change | content region enters from the same short vertical origin | preserves the stable header/body/action-shell relationship | direct content replacement |
| Contradiction phase | one red relationship line draws between two statements after both are present | reveals causality, not atmosphere | static line and rule |
| Result | causal steps and score effects enter in authored order | makes cause → break → patch → verdict legible | complete chronology is immediately readable |
| Urgent deadline | static high-contrast border, number, and written phase state | communicates time pressure without an infinite repaint loop | identical static urgent state |
| Reconnect | full-shell overlay preserves last safe room beneath it; no phase animation | prevents false empty-state interpretation | unchanged overlay |

## Rejected motion

- Immersive Room and Falling Object were rejected: neither improves a timed,
  phones-only social investigation and both add mobile/performance risk.
- Ambient floating evidence was rejected because it competes with questions and
  timers.
- Automatic horizontal carousels were rejected because the mobile walkthrough is
  clearer as native vertical content.
- Repeated fade-up entrances were rejected; only state-changing objects move.

## Source limitation

The supplied “Animation Pack Part 2” PDF was not present in the repository,
accessible attachments, or Documents search. Gallery Rail and Cursor Reveal
requirements were available verbatim in the owner brief and already represented
in the checked-in implementation, so those methods were verified against the
brief and ECC motion skills. No claim is made about unavailable PDF-only content.
