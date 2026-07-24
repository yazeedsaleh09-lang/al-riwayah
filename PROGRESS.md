# Progress

## Current state

- Current phase: Phase 3 — Authoritative multiplayer server (in progress)
- Last update: 2026-07-24
- Branch: master
- Implementation status: monorepo scaffolded; deterministic game engine + first case complete and tested
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

## In progress

- Phase 3 — Fastify + Socket.IO authoritative server (rooms, protocol, redaction, reconnect).

## Not started

- Phase 4 (mobile game shell), Phase 5 (marketing site), Phases 6–9 (polish, QA, deploy, playtest).

## Evidence table

| Phase | Requirement | Test/Command | Result | Log |
|---|---|---|---|---|
| 0 | Repository inventory + git init | `git init`, baseline commit | done | commit 464193b |
| 1 | Workspace installs | `pnpm install` | success (177 pkgs) | esbuild build approved |
| 1 | Lint clean | `pnpm exec eslint packages --max-warnings 0` | pass | no output |
| 2 | Engine + content typecheck | `pnpm --filter game-engine/content typecheck` | pass | tsc --noEmit clean |
| 2 | Unit tests | `pnpm exec vitest run --project unit` | 56 passed (9 files) | — |
| 2 | Content validation | `pnpm --filter @al-riwayah/content validate` | `All cases valid` | — |

Test IDs covered so far: ENG-001..010 (detection, patch, follow-up-break, determinism,
ledger, verdict boundary), evidence assignment (4/5/6), full 4/5/6 sessions, NO_RESPONSE
fallback, SEC-001..004 redaction (view projection level).

## Open blockers

- Deployment account/domain not known (Phase 8).
- Final legal details not known (privacy/terms owner placeholders).
- Human playtest participants not scheduled (Phase 9).

## Update rule

Never replace evidence with "works." Record command, exit status, artifact path, and commit.
