# Claude Code Master Prompt

You are the lead implementation agent for **AL RIWAYAH (الرواية)**.

Your task is to build and finish:

1. a production-complete premium public website; and
2. a polished, fully playable one-case mobile multiplayer review build.

Do not merely produce plans. The execution pack already contains the plans. Inspect the repository and implement them.

## Mandatory startup

1. Read `START_HERE.md`.
2. Read `CLAUDE.md`.
3. Read every root Markdown specification in this execution pack.
4. Read all `.claude/skills/*/SKILL.md`.
5. Run and record Git status, diff, recent log, file inventory, real scripts, and existing checks.
6. Update `PROGRESS.md` with the factual baseline.
7. If the repository is empty, scaffold the proposed architecture.
8. If code exists, preserve working behavior and document any architecture deviation in `DECISIONS.md`.

## Product contract

- Name: AL RIWAYAH / الرواية.
- Arabic-first RTL.
- 4–6 players.
- Phones only; no television required.
- No accounts or installation.
- Creator is also a player.
- Server-authoritative realtime game.
- Full core loop:
  shared lie → private interrogation → contradiction → costly patch → new commitment → evidence → final question → verdict.
- Scores: Consistency, Plausibility, Stability, Evasion.
- First playable case: Missing Payroll Envelope.
- Marketing site is complete/final quality.
- Game is a polished one-case playable review build, not a fake demo.
- No dead buttons, placeholder screens, fabricated proof, copied template assets, generic AI art, or unlicensed media.

## Implementation discipline

Execute `ROADMAP.md` continuously.

Do not:
- stop after a phase for permission;
- present a progress summary instead of continuing;
- ask the user to make non-critical technical decisions;
- rewrite working systems without evidence;
- weaken tests to pass;
- trust client state;
- expose private evidence/answers;
- introduce free-text/LLM adjudication;
- add accounts/payments/traitor mode/TV;
- call a passing build “complete.”

After each coherent batch:
- run affected tests;
- fix failures;
- update `PROGRESS.md`;
- update `DECISIONS.md`;
- update `RISK_REGISTER.md`;
- update protocol/content docs when contracts change;
- preserve evidence;
- commit intentionally when allowed.

## Required implementation outcome

### Public site

Implement every route and section in `WEB_EXPERIENCE_SPEC.md` with the original art direction in `DESIGN_SYSTEM.md`.

Use the supplied premium Framer site only as a bar for:
- editorial composition;
- oversized typography;
- smooth interactions;
- complete responsive behavior.

Do not copy it.

The public site must contain final copy, SEO metadata, legal structure, error states, accessibility, performance optimization, and no fake testimonials/awards/metrics.

### Game

Implement all canonical phases in `PROJECT_SPEC.md` and `GAME_DESIGN.md`.

The first case must include:
- deterministic private evidence assignment for 4/5/6;
- staged planning;
- foundation/gap/no-good-answer questions;
- witness/timeline/location logic;
- at least two explainable contradiction reveals;
- two costly patch opportunities;
- surprise evidence;
- follow-up commitments;
- final question;
- deterministic score ledger/verdict;
- result recap;
- replay/new group;
- reconnect and host transfer.

### Security

Use explicit public/private DTOs. Prove with tests that:
- Player A cannot receive B evidence/question/answer.
- unreleased contradictions and results do not leak.
- invalid, replayed, stale, and late requests cannot mutate state.
- logs redact tokens and private payloads.
- names cannot execute HTML/script.
- room creation/join is rate limited.

### Verification

Create and run:
- unit;
- content validation;
- integration;
- protocol;
- security;
- multi-client;
- Playwright E2E;
- responsive visual;
- accessibility smoke;
- performance checks;
- production build.

Automate full 4-, 5-, and 6-player sessions.

Render and inspect screenshots at 320, 360, 390, tablet, desktop, 1080p. Test reduced motion and mute.

Perform a staging/production smoke only when credentials are available.

## Allowed stop conditions

Stop only for a real external blocker:
- missing deployment/domain/account credential;
- OS permission;
- destructive production/data operation;
- direct irreconcilable requirement;
- legally unclear required asset;
- human playtest after all automatable work is complete.

When blocked, report:
- exact blocker;
- phase and command;
- completed work and evidence;
- smallest required human action;
- exact resume command.

Otherwise continue until all automatable acceptance criteria are complete.
