# AL RIWAYAH — Design system

Status: release-candidate visual authority
Updated: 2026-07-27

## Brand position

AL RIWAYAH is a social interrogation game about one shared statement fracturing under
pressure. The approved interface is a warm editorial dossier: paper, ink, restrained
evidence red, muted green, thin rules, stamps, timestamps, and red evidence threads.
It is forensic and social without becoming horror, cyberpunk, or a SaaS dashboard.

## Three-layer tokens

### Primitive

| Token          | Value     |
| -------------- | --------- |
| `--paper`      | `#EEE3D1` |
| `--paper-hi`   | `#FBF5EB` |
| `--paper-mid`  | `#E3D5C1` |
| `--ink`        | `#171612` |
| `--muted`      | `#665E54` |
| `--red`        | `#BD3D32` |
| `--red-dark`   | `#922A24` |
| `--green`      | `#345F55` |
| `--yellow`     | `#E4BB52` |

Spacing: 4, 8, 12, 16, 24, 32, 48, 72, 96, 144px.
Radius: 0, 8, 16px and full pill for compact status only.

### Semantic

| Token               | Role                                       |
| ------------------- | ------------------------------------------ |
| `--surface`         | primary page background                    |
| `--surface-inverse` | cinematic/investigation surface            |
| `--ink`             | primary text                               |
| `--ink-inverse`     | text on inverse surface                    |
| `--muted`           | secondary readable text                    |
| `--rule`            | structural divider                         |
| `--signal`          | primary action/current state/contradiction |
| `--success`         | connected/ready confirmation               |
| `--warning`         | timing or recoverable risk                 |
| `--focus`           | keyboard focus ring                        |

### Component

- Buttons: 44px minimum, square dossier geometry, exact-property transitions, 0.98 active scale.
- Inputs: 56px minimum, visible label, neutral border, high-contrast ink focus ring.
- Navigation: compact ruled header; mobile menu is controlled and keyboard reachable.
- Evidence frame: layered paper surface plus restrained red relation lines.
- Game option: 56px minimum; selected state uses border, text, and status mark.
- Legal sections: numbered/indexed rail plus 44–68ch reading column.
- Loading: fracture-line progress with honest connection-stage text and retry.

## Typography

- Display: Alexandria variable.
- Body/UI: Noto Sans Arabic variable.
- Utility: system monospace, tabular figures.
- No artificial Arabic tracking.
- Headings use balanced wrapping; prose uses pretty wrapping.
- Public display scale: 40 / 56 / 72 / 96.
- Product scale: 14 / 16 / 18 / 24 / 32 / 40.

## Motion

| Token                | Value                          | Use                   |
| -------------------- | ------------------------------ | --------------------- |
| `--duration-fast`    | `120ms`                        | press/hover           |
| `--duration-control` | `180ms`                        | selection/form state  |
| `--duration-panel`   | `280ms`                        | menu/overlay          |
| `--duration-reveal`  | `640ms`                        | rare marketing reveal |
| `--ease-out`         | `cubic-bezier(.16, 1, .3, 1)`  | enter/respond         |
| `--ease-in-out`      | `cubic-bezier(.76, 0, .24, 1)` | on-screen movement    |

Reduced motion removes continuous movement, scroll transforms, and positional phase
changes while keeping immediate opacity/color feedback and all explanatory content.

## Route composition

- Home: approved evidence-board hero → three-step core loop → private phone preview →
  playable case → decisive CTA.
- Create/join: split task surface with connection preparation and one primary action.
- How to play: 60-second opening, three acts, worked contradiction, room etiquette.
- Cases: one dominant playable case, future concepts as restrained index entries.
- Room/game: centered phone interaction surface on desktop; edge-to-edge safe-area shell
  on mobile; phase-specific contrast and one responsibility per screen.
- Privacy/terms: indexed legal layout, never centered body copy.
- Errors/reconnect/loading: explicit cause, current system action, and recovery choice.

## Absolute prohibitions

- Cobalt/neon dashboards, police tape, fingerprints, and generic crime photography.
- Repeated icon-heading-text card grids.
- Gradient text, decorative glass, ambient blobs, generic crime imagery.
- Centered legal paragraphs.
- Infinite animation outside an accessible ticker or loading indicator.
- Motion that delays input or hides content by default.
- Fabricated proof, testimonials, player counts, cases, or availability.
- Private evidence or answers in public/shared DOM or DTOs.
