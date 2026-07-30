AL RIWAYAH — GOLDEN MASTER FIDELITY PASS

This is a tightly scoped implementation task. It is not a redesign task.

## Absolute visual source of truth

Read and inspect these attached/reference files before editing:

- references/01-home-desktop-1440x900.png
- references/02-lobby-mobile-390x844.png
- references/03-question-mobile-390x844.png
- references/04-result-mobile-390x844.png
- DESIGN_LOCK.md

These four images were explicitly approved by the owner. Every other earlier concept, generated mockup, audit score, and visual direction is rejected unless it exactly matches these references.

## Objective

Make the existing application match the four approved screens with high visual fidelity while preserving all working game logic.

Implement only:

1. Desktop homepage at 1440×900.
2. Mobile lobby at 390×844.
3. Mobile question screen at 390×844.
4. Mobile result screen at 390×844.
5. Shared tokens/components strictly required by those four surfaces.

Do not design or implement the remaining missing screens in this task.
Do not start a full-site redesign.
Do not add new sections, features, cases, or content.
Do not run a multi-hour full release workflow before showing visual evidence.

## Non-negotiable visual rules

- Match the references, not your interpretation of them.
- Preserve the warm paper background, ink, restrained green, red action/contradiction, and yellow note colors.
- Homepage red threads must be in a dedicated layer below every card, photograph, label, and readable text.
- Threads must use pointer-events: none and must never cross text.
- Keep the lobby minimal and precise; do not add newspaper decoration to it.
- Keep the question screen exact: header, timer, question hierarchy, helper text, private-information card, answer options, selected treatment, and bottom CTA.
- Keep the result verdict panel near-black. Do not recolor it green or make it softer.
- Keep the circular score composition and the three metric cards.
- Use male example names only.
- Result labels must use `أسوأ تناقض` and `أفضل ترقيعة`.
- Do not use `الشرخ`.
- No blue/cobalt, gradients, glassmorphism, neon, generic dashboard styling, crime clichés, blood, or horror.

## Typography and spacing

- Use the existing approved Arabic font families if already present; otherwise use Alexandria for display and Noto Sans Arabic for body/UI.
- Never use monospace for full Arabic sentences.
- Do not apply negative letter-spacing to Arabic.
- Do not reduce body text until it looks microscopic.
- Match line breaks and visual density from the references.
- Preserve 44px minimum hit targets and mobile safe-area spacing.

## Functional preservation

Do not alter:

- server-authoritative match logic
- room creation/join behavior
- readiness rules
- private-answer redaction
- reconnect/recovery
- timers and phase progression
- scoring logic
- existing tests except where a selector must be updated for unchanged behavior

Never use destructive Git commands. Preserve unrelated local and untracked work.

## Efficient workflow — mandatory

1. Inspect git status and current diff.
2. Create a safe local backup of uncommitted intended work if needed.
3. Implement shared tokens/header first.
4. Implement one approved screen at a time.
5. After each screen, run only the focused build/typecheck/test needed for that surface.
6. Capture and OPEN the exact target screenshot.
7. Compare it visually against its reference and correct visible differences.
8. Continue to the next approved screen only after the current one is materially matched.

## Required evidence

Create:

artifacts/golden-master-pass/
- home-1440x900.png
- lobby-390x844.png
- question-390x844.png
- result-390x844.png
- comparison-notes.md

`comparison-notes.md` must list concrete remaining differences, not a self-awarded numerical score.

## Stop gate

After the four screenshots are generated and opened:

- STOP.
- Do not derive create/join/planning/contradiction/patch/reconnect screens yet.
- Do not push to origin/main.
- Do not trigger Render deployment.
- Report the screenshot paths and any remaining mismatches to the owner for visual approval.

Only after explicit owner approval should a separate task extend the system to the remaining screens, add the final motion pass, run the full regression matrix, commit, push, and deploy.

Begin now.
