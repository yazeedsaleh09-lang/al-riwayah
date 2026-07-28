# Accessibility report — 2026-07-28

- Public-route Playwright accessibility, keyboard, validation, and preference
  matrix: **24/24 passed** across desktop and 320px visual projects.
- Serious or critical Axe findings: **0** on `/`, `/how-to-play`, `/cases`,
  `/join`, `/play`, `/create`, `/privacy`, and `/terms`.
- Representative live game Axe checks passed for lobby, case brief, private
  evidence, interrogation, patch, and results.
- Mobile menu traps focus, closes on Escape, restores focus, and unlocks body
  scrolling.
- Create/join validation identifies invalid fields, associates descriptions, and
  moves focus to the first error.
- Revision comparison and ticker pause are keyboard reachable and operable.
- Mobile keeps the revision gesture instruction visible.
- All controls pass the automated 44px target check at eight viewport widths.
- Phase changes and private receipts expose status text; contradictions include the
  two statements and their explicit rule, so meaning is not color-only.
- `prefers-reduced-motion` and the product motion preference preserve ordered
  content while removing nonessential travel.

Real-device screen-reader usability on specific iOS/Android assistive technology
remains an explicit human-device playtest item.
