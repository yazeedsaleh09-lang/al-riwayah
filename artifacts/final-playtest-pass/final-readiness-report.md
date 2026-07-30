# AL RIWAYAH release-candidate readiness

Date: 2026-07-30
Branch: `main`
Status: **local production gate passed; same-service deployment verification pending**

## Baseline and approved direction

This release completes the existing repository and preserves the approved Golden
Master evidence-board hero, phone lobby, selected-answer question, and verdict
composition. It does not introduce a replacement application, parallel frontend,
new repository, or alternate deployment target.

The homepage now continues below the locked hero with the missing product
explanation, three-step loop, phone interaction preview, available-case record,
and final create/join action. On small screens the large desktop evidence board is
not squeezed into the viewport; the continuation carries the story with native
mobile layouts.

## Fresh local verification

| Command or gate | Fresh result |
|---|---|
| `pnpm.cmd install --frozen-lockfile` | pass; lockfile current |
| `pnpm.cmd lint` | pass |
| `pnpm.cmd typecheck` | pass across 6 workspace projects |
| `pnpm.cmd test` | 141 passed in 19 files |
| `pnpm.cmd test:coverage` | pass; statements 89%+, branches 81%+, functions 93%+, lines 93%+ |
| `pnpm.cmd --filter @al-riwayah/content validate` | pass; authored case valid |
| `pnpm.cmd test:integration` | 41 passed in 5 files |
| `pnpm.cmd test:security` | 14 passed in 2 files |
| production `pnpm.cmd build` with the existing Render HTTPS origins | pass; 15 Next routes |
| `pnpm.cmd test:e2e` | 85 passed; production-only performance case intentionally skipped |
| production performance case | pass |
| 4-player browser match | pass; select/confirm, duplicate rejection, contradiction, patch, result, replay |
| 5-player browser match | pass; refresh/recovery and clean new group |
| 6-player browser match | pass; disconnect, server-timed missing answer, recovery, result |
| responsive matrix | pass from 320×568 through 1920×1080 |
| accessibility | no serious/critical axe findings on public routes and representative game phases |

The last production-bundle performance capture in `performance-report.json`:

- LCP: **768ms**
- CLS: **0**
- script transfer: **193,458 bytes**
- longest main-thread task: **153ms**
- CSP, `X-Frame-Options: DENY`, and `X-Content-Type-Options: nosniff` present

## Authority and security evidence

- Every gameplay intent requires `phaseRevision` at schema and manager boundaries.
- The server remains authoritative for deadlines, completion, contradictions,
  private assignment, scoring, and results.
- Public DTOs are recursively checked for private questions, evidence, answers,
  tokens, and unreleased contradictions.
- Invalid, cached, stale, or future-revision intents do not rebroadcast room views.
- A socket cannot bind to multiple players or rooms; an already-bound exact-session
  restore is an idempotent view sync.
- A genuine restore on a new socket rotates the bearer token.
- Restore scans, create/join attempts, and gameplay bursts remain rate-limited in
  production. The reproducible E2E server uses an explicit test-only bypass that is
  rejected in production.
- Disconnected active players remain part of phase completion until the server
  deadline applies fallback behavior.

## Evidence

- Public route captures: `artifacts/final-playtest-pass/after/`
- Golden Master captures: `artifacts/golden-master-pass/`
- 4/5/6-player states: `artifacts/final-playtest-pass/full-match/`
- Active-game responsive matrix: `artifacts/final-playtest-pass/responsive-game/`
- Homepage and gameplay motion: `artifacts/final-playtest-pass/motion/`
- Performance: `artifacts/final-playtest-pass/performance-report.json`
- Route inventory: `artifacts/final-playtest-pass/route-inventory.md`

## Production verification required after push

The release must update the existing `al-riwayah-web` and `al-riwayah-server`
Render services. Completion requires both services to report the pushed revision,
the two existing URLs to pass health/public smoke checks, and a live create/join/
reconnect flow. This section must be updated with the deployed revision after that
verification; prior production evidence does not prove this release.

Human fun, social tension, and fairness findings remain post-handoff activities in
`PLAYTEST_PLAN.md`; automation cannot fabricate them.
