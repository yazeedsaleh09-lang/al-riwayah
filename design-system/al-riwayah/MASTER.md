# AL RIWAYAH — Design system

Status: release-candidate visual authority
Updated: 2026-07-27

## Brand position

AL RIWAYAH is a social interrogation game about one shared statement fracturing under
pressure. The interface is forensic, social, and uncompromising. It is not parchment,
nostalgic editorial, horror, cyberpunk, or a SaaS dashboard.

## Three-layer tokens

### Primitive

| Token          | Value     |
| -------------- | --------- |
| `--black-1000` | `#050505` |
| `--black-900`  | `#111214` |
| `--white-0`    | `#FFFFFF` |
| `--white-50`   | `#F7F7F5` |
| `--gray-400`   | `#9A9CA1` |
| `--gray-200`   | `#D7D8DA` |
| `--gray-800`   | `#2B2D31` |
| `--blue-600`   | `#2855FF` |
| `--blue-700`   | `#173BE0` |
| `--green-600`  | `#0A7A52` |
| `--amber-600`  | `#9B5B00` |

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

- Buttons: 48px minimum, 8px radius, exact-property transitions, 0.98 active scale.
- Inputs: 56px minimum, visible label, neutral border, cobalt focus ring.
- Navigation: fixed compact rail; mobile menu is a full-height controlled sheet.
- Evidence frame: inverse surface plus one cobalt relation line, no generic card shadow.
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

- Home: statement-fracture hero → testimony ticker → sticky core loop → contradiction
  proof → patch cost → playable case → report → room FAQ → decisive CTA.
- Create/join: split task surface with connection preparation and one primary action.
- How to play: 60-second opening, three acts, worked contradiction, room etiquette.
- Cases: one dominant playable case, future concepts as restrained index entries.
- Room/game: centered phone interaction surface on desktop; edge-to-edge safe-area shell
  on mobile; phase-specific contrast and one responsibility per screen.
- Privacy/terms: indexed legal layout, never centered body copy.
- Errors/reconnect/loading: explicit cause, current system action, and recovery choice.

## Absolute prohibitions

- Beige, parchment, paper grain, evidence red, police tape, fingerprints.
- Repeated icon-heading-text card grids.
- Gradient text, decorative glass, ambient blobs, generic crime imagery.
- Centered legal paragraphs.
- Infinite animation outside an accessible ticker or loading indicator.
- Motion that delays input or hides content by default.
- Fabricated proof, testimonials, player counts, cases, or availability.
- Private evidence or answers in public/shared DOM or DTOs.
