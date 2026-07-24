# AL RIWAYAH — The Statement

Arabic title: **الرواية**  
Internal identifier: `al-riwayah`  
Product type: mobile-first local multiplayer party game + complete marketing website  
Gameplay devices: **players' phones only; no television required**  
Supported players: **4–6**  
Target session: **10–15 minutes**  
Primary language: **Arabic, RTL, Saudi-friendly conversational copy**  
Secondary language readiness: English architecture, optional later localization


## What this package is

This is the complete product, design, engineering, content, security, QA, deployment, and Claude Code execution pack for AL RIWAYAH.

It is designed so Claude Code can enter a repository, inspect reality, create the project when no implementation exists, and continue through a production-complete marketing website plus a polished playable review build of the game.

## Scope contract

### Marketing website — production-complete

The public website must be a finished, premium, responsive product site. It must not look like a generic SaaS landing page or an unfinished game prototype.

Required public routes:

- `/`
- `/how-to-play`
- `/cases`
- `/play`
- `/create`
- `/room/[code]`
- `/privacy`
- `/terms`
- custom `404` and error states

The visual ambition is informed by premium editorial Framer sites: oversized typography, monochrome composition, smooth scroll storytelling, rich motion, strong art direction, and disciplined responsive behavior. Do not copy source code, assets, exact layouts, names, or copy from any reference.

### Game — polished playable review build

The game build must be fully playable from room creation through results with one complete case: **The Missing Payroll Envelope**.

It is a review build because the content library is intentionally limited to one deeply tested case. It must not contain placeholder screens, fake buttons, dead routes, or unfinished transitions.

## Core loop

> Build one shared lie → separate into private interrogations → expose contradictions → patch the story at a cost → introduce new evidence → answer the final question → reveal exactly who broke the story and how.

## Read order

1. `START_HERE.md`
2. `CLAUDE.md`
3. `PROJECT_SPEC.md`
4. `GAME_DESIGN.md`
5. `WEB_EXPERIENCE_SPEC.md`
6. `DESIGN_SYSTEM.md`
7. `ARCHITECTURE.md`
8. `REALTIME_PROTOCOL.md`
9. `CONTENT_SYSTEM.md`
10. `DATA_MODEL.md`
11. `SECURITY_AND_PRIVACY.md`
12. `ACCEPTANCE_TESTS.md`
13. `PLAYTEST_PLAN.md`
14. `ROADMAP.md`
15. `CLAUDE_MASTER_PROMPT.md`

## How to use

Place this folder at the repository root or give the ZIP to Claude Code. Then paste the contents of `CLAUDE_MASTER_PROMPT.md`.

When a Claude session stops, paste `CLAUDE_CONTINUE_PROMPT.md`. Claude must resume from repository and evidence state rather than restarting.

## Documentation roles

- Product truth: `PROJECT_SPEC.md`
- Game rules and intended emotion: `GAME_DESIGN.md`
- Public website truth: `WEB_EXPERIENCE_SPEC.md`
- UI, art direction, motion, responsive rules: `DESIGN_SYSTEM.md`
- Technical boundaries and data flow: `ARCHITECTURE.md`
- Network messages and secrecy: `REALTIME_PROTOCOL.md`
- Case authoring and validation: `CONTENT_SYSTEM.md`
- Automated release gates: `ACCEPTANCE_TESTS.md`
- Human fun validation: `PLAYTEST_PLAN.md`

## Owner review before execution

The owner should confirm only these non-blocking brand decisions when convenient:

- Final public name: `الرواية` or another title.
- Whether English localization ships at first launch.
- Final domain.
- Legal entity/contact details for privacy and terms.

Claude must use safe visible placeholders for these legal/brand details and continue all other work.
