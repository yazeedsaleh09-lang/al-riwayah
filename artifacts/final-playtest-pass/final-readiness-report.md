# AL RIWAYAH local release-candidate readiness

Date: 2026-07-28
Branch: `main`
Status: **local quality gate passed; production deployment verification pending**

## Approved direction

The release uses the light editorial direction. Its signature is the non-circular
Versioned Testimony editor: one shared statement can be scrubbed between authored
revisions, then the product journey carries that cause-and-effect language through
the lobby, private answers, contradiction, patch, and result.

The Alibi Table / circular player-seat concept is removed. No active hero, lobby,
or gameplay surface depends on a circular or radial player composition. Existing
authoritative multiplayer behavior and public/private view boundaries remain intact.

## Fresh local verification

| Command or gate | Fresh result |
|---|---|
| `pnpm.cmd install --frozen-lockfile` | pass; lockfile current |
| `pnpm.cmd lint` | pass |
| `pnpm.cmd typecheck` | pass across 6 workspace projects |
| `pnpm.cmd test` | 93 passed in 13 files |
| `pnpm.cmd --filter @al-riwayah/content validate` | pass; authored case valid |
| `pnpm.cmd test:integration` | 26 passed in 3 files |
| `pnpm.cmd test:security` | 11 passed |
| production `pnpm.cmd build` with documented HTTPS origins | pass; 14 Next routes |
| `pnpm.cmd test:e2e` | 62 passed; production-only performance case intentionally skipped |
| production performance case | pass |
| 4-player browser match | pass; duplicate rejection, private receipt, contradiction, patch, result, replay |
| 5-player browser match | pass; refresh/recovery and clean new group |
| 6-player browser match | pass; disconnect, server-timed missing answer, reconnect-safe result |
| responsive route matrix | pass at 320, 360, 390, 430, 768, 1280, 1440, and 1920 |
| Nudge side-by-side reviewer gate | pass; all 12 categories at 9.0 or above |

Production metrics from `performance-report.json`:

- LCP: **372ms**
- CLS: **0**
- script transfer: **196,877 bytes**
- longest main-thread task: **138ms**
- security headers: CSP, `X-Frame-Options: DENY`, and
  `X-Content-Type-Options: nosniff` present

## Evidence

- Nudge comparison: `artifacts/final-playtest-pass/nudge-comparison.md`
- Reference and AL RIWAYAH captures:
  `artifacts/publishable-design-v3/nudge-benchmark/` and
  `artifacts/publishable-design-v3/after/`
- Public route matrix: `artifacts/final-playtest-pass/after/`
- 4/5/6-player states: `artifacts/final-playtest-pass/full-match/`
- Active-game responsive matrix: `artifacts/final-playtest-pass/responsive-game/`
- Homepage and gameplay motion: `artifacts/final-playtest-pass/motion/`
- Performance: `artifacts/final-playtest-pass/performance-report.json`

## Remaining release work

This record does **not** claim that the current redesign is live. After commit and
push, the exact remote SHA must be verified, Render must finish, and the production
site must repeat the functional smoke, production performance check, four-viewport
Nudge comparison, and reviewer challenge.

Human fun, social tension, and fairness findings remain post-handoff activities in
`PLAYTEST_PLAN.md`; automation cannot fabricate them.
