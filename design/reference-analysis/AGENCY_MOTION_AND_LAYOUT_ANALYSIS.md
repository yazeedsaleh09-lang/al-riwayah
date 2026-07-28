# Reference analysis — motion and layout quality target

> Historical exploration, superseded by `design/FINAL_VISUAL_AUDIT.md`. The final
> release does not use a dossier palette, Noto Kufi, generic reveal wrappers, or
> agency-template structure.

The “Agenciy” premium Framer template was studied for quality attributes only:
typographic confidence, controlled emptiness, interaction pacing, and perceived
performance. Its structure, cursor, copy, assets, and identity were not copied.

## Principles retained in the final system

| Quality attribute | AL RIWAYAH translation |
|---|---|
| Staged hierarchy | A shared statement settles, separates, and becomes contradictory |
| Confident editorial type | IBM Plex Sans Arabic at fluid scale, RTL, with no negative Arabic tracking |
| Quiet-to-intense rhythm | Void-black statement surfaces alternate with controlled ivory evidence sections |
| Scroll-linked storytelling | One requestAnimationFrame-backed gallery progress source |
| Continuous ambient motion | Testimony ticker pauses on hover/focus and becomes static under reduced motion |
| Sticky sequence | Six real game stages on desktop; normal ordered document flow on mobile |
| Fast micro-interactions | 160–380ms controls and state transitions |

## Explicit rejections

- No custom cursor, agency information architecture, 3D/WebGL, glass, gradients,
  decorative grid, stock detective imagery, or copied template geometry.
- No decorative motion during timed game decisions.
- No entrance animation may leave readable content transparent at rest.

## Final motion discipline

- Settling easing: `cubic-bezier(.16, 1, .3, 1)`.
- Structural easing: `cubic-bezier(.76, 0, .24, 1)`.
- Durations: micro 160ms, lock 220ms, panel/state 280–380ms,
  contradiction linkage 840ms, marketing reveal ceiling 900ms.
- `prefers-reduced-motion` and the in-product preference expose the full journey
  as ordered static content.
