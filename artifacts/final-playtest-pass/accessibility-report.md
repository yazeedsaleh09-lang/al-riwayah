# Accessibility report — 2026-07-27

- axe WCAG 2 A/AA serious and critical findings: **0**.
- Public routes scanned at 1280px and 320px: `/`, `/how-to-play`, `/cases`,
  `/join`, `/play`, `/create`, `/privacy`, `/terms`.
- Representative game phases scanned in the 4-player match: lobby/case, private
  evidence, interrogation, patch, and results.
- Keyboard: sound and reduced-motion controls focus and toggle via Enter.
- Persistence: mute and reduced-motion preferences survive reload.
- Mobile navigation exposes both preferences at 320px.
- Touch targets: primary navigation, menu, preference controls, and game actions
  meet the 44px minimum in the responsive assertion.
- Meaning is not color-only: contradiction releases include both statements and
  the explicit rule.
- Text-bearing entry animation avoids opacity fades, preserving contrast while
  motion is running. Manual/OS reduced-motion paths disable nonessential motion.

Known external validation: screen-reader usability on specific iOS/Android assistive
technology should be observed during the real-device friends session.
