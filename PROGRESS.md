# Progress

## Current state

- Current phase: Phase 8 release — production gate passed
- Last update: 2026-07-28
- Branch: `main`
- Implementation status: light editorial redesign + one-case authoritative realtime game, verified locally and on Render through Nudge comparison, responsive, accessibility, reduced-motion, and real multi-client browser runs
- Product specification: Complete initial version
- Human playtests completed: 0

## Baseline (Phase 0, recorded 2026-07-24)

- Repository contained specification Markdown + `.claude` skills only. No prior source tree.
- No git repository existed; initialized one (`git init`) and committed the spec baseline.
- Toolchain present: Node v24.18.0, npm 11.16.0, corepack 0.35.0. pnpm installed globally (11.17.0).
- Proposed architecture (ADR-007) accepted and scaffolded. Toolchain pinned (ADR-011).

## Done

- **Phase 0** — inspection + baseline + git init. Architecture/toolchain ADRs accepted.
- **Phase 1** — pnpm monorepo (`node-linker=hoisted` for Windows/OneDrive), strict TS
  (`tsconfig.base.json`), ESLint 9 flat config + Prettier, Vitest 4 projects (unit/integration/security).
- **Phase 2** — pure deterministic game engine + first case + tests:
  - `packages/game-engine`: seeded RNG, 19-phase model, case/DTO types, evidence &
    question assignment, contradiction detection + ranked selection, patch/commitments,
    deterministic score ledger + verdict, redacted public/private views, full-match simulator.
  - `packages/content`: authored `case.missing_payroll.v1` (8 foundation / 12 gap-family /
    8 no-good / 6 witness questions, 7 contradiction rules across all categories, 5 patches,
    plausibility rules, verdict bands) + content validator + CLI.

- **Phase 3** — `packages/protocol` (Zod intent schemas, safe errors, envelopes) +
  `apps/server` (RoomManager: rooms/codes/join/ready/start, injectable clock, deadlines,
  reconnect + host transfer, replay/newGroup, rate limiting, idempotency, TTL cleanup,
  redacted views, log redaction) + socket.io gateway + Fastify health.
- **Phase 4 + 5** — `apps/web` (Next.js 16, React 19, RTL Arabic):
  - Marketing site: home (13 sections incl. interactive contradiction demo, ticker,
    patch cards, results axes, FAQ), /how-to-play, /cases (honest available/in-dev),
    /create, /play, /privacy, /terms, 404, error boundary, sitemap/robots/manifest/icon,
    full SEO metadata + JSON-LD. The current release supersedes this original
    evidence-board/dossier implementation with the light editorial system.
  - Game shell: socket client + `useGameRoom` hook + `RoomShell` rendering all 19 phases
    (lobby, brief, private evidence, staged planning, interrogation, reveals, patch voting,
    surprise evidence, verdict/results, replay), deadline ring, reconnect overlay.
  - Verified live: `next build` (13 routes), create→lobby flow against the running server,
    no console errors, home renders fully at 375px.

## Completed in final readiness pass

- Rejected and removed the Alibi Table / circular player-seat hero without
  resetting unrelated local work or changing authoritative multiplayer boundaries.
- Compared three non-circular hero concepts and selected the Versioned Testimony
  editor as the strongest product-specific direction.
- Rebuilt the homepage, task forms, lobby, investigation, contradiction, patch,
  and result presentation around the light editorial system.
- Completed a live Nudge side-by-side and strict reviewer challenge at 390×844,
  768×1024, 1440×900, and 1920×1080; all 12 categories score 9.0 or above.
- Added the canonical `/join` route while preserving `/play`, clean session replacement,
  expired-room handling, new-group flow, and production-safe server start.
- Completed public/private contradiction explanations and the final report narrative.
- Added deliberate phase/evidence/option/verdict motion, optional sound/haptics, and
  a global reduced-motion path.
- Completed 64 responsive route/viewport combinations, public and representative
  in-game axe checks, keyboard/persistence checks, and production performance budgets.
- Completed real browser-context 4-, 5-, and 6-player full matches including duplicate
  input, refresh/recovery, disconnect/timeout, replay, and clean new-group creation.
- Added exact LAN runbook and share-link behavior derived from the host origin.

## Evidence table

| Phase | Requirement | Test/Command | Result | Log |
|---|---|---|---|---|
| 0 | Repository inventory + git init | `git init`, baseline commit | done | commit 464193b |
| 1 | Workspace installs | `pnpm install` | success (177 pkgs) | esbuild build approved |
| 1 | Lint clean | `pnpm exec eslint packages --max-warnings 0` | pass | no output |
| 2 | Engine + content typecheck | `pnpm --filter game-engine/content typecheck` | pass | tsc --noEmit clean |
| 2 | Unit tests | `pnpm exec vitest run --project unit` | 56 passed (9 files) | — |
| 2 | Content validation | `pnpm --filter @al-riwayah/content validate` | `All cases valid` | — |
| 6–8 | Unit/workspace | `pnpm test` | 93 passed / 13 files | 2026-07-28 final |
| 6–8 | Integration | `pnpm test:integration` | 26 passed / 3 files | 2026-07-27 final |
| 6–8 | Security | `pnpm test:security` | 11 passed | 2026-07-28 final |
| 6–8 | Browser matrix | `pnpm test:e2e` | 62 passed, 1 production-only skip | 2026-07-28 local final |
| 6–8 | Production performance/headers | `E2E_PRODUCTION=1 … performance.spec.ts` | 1 passed | `artifacts/final-playtest-pass/performance-report.json` |
| 8 | Nudge visual benchmark | live interaction + 4 paired viewports + strict ECC reviewer | 12/12 categories ≥9.0 | `artifacts/final-playtest-pass/nudge-comparison.md` |
| 8 | Production origins | Render web + realtime server | 58/58 public/a11y/responsive/identity checks + two-client lobby; production performance pass | 2026-07-28 final |

Test IDs covered so far: ENG-001..010 (detection, patch, follow-up-break, determinism,
ledger, verdict boundary), evidence assignment (4/5/6), full 4/5/6 sessions, NO_RESPONSE
fallback, SEC-001..004 redaction (view projection level).

## External follow-up (not an engineering blocker)

- Two real human groups must still supply subjective fun/fairness observations.
- Privacy/terms owner identity and contact details remain visibly marked for owner input.

## Readiness evidence

The authoritative local and production command output and artifact inventory live
in `artifacts/final-playtest-pass/final-readiness-report.md`.

## Update rule

Never replace evidence with "works." Record command, exit status, artifact path, and commit.
