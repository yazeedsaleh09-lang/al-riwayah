# Final friends-playtest readiness report

Date: 2026-07-27

Branch: `feat/premium-site-redesign`

Status: **READY FOR A REAL 4–6 FRIENDS PLAYTEST ON A TRUSTED LAN**

## Fresh final verification

| Command | Outcome |
|---|---|
| `pnpm install --frozen-lockfile` | pass, lock current |
| `pnpm lint` | pass |
| `pnpm typecheck` | pass, 6 workspace projects |
| `pnpm test` | 92 passed / 13 files |
| `pnpm --filter @al-riwayah/content validate` | all cases valid |
| `pnpm test:integration` | 26 passed / 3 files |
| `pnpm test:security` | 10 passed |
| `pnpm build` | pass, Next 16.2.12, 14 routes |
| `pnpm test:e2e` | 46 passed; production-only performance test skipped by design |
| production `performance.spec.ts` | 1 passed |
| `pnpm audit --prod` | no known vulnerabilities |
| credential-pattern scan | no findings |
| production lobby through `192.168.0.98` | create/share/join pass |

## Production performance

- LCP: 468 ms (budget 2,500 ms)
- CLS: 0 (budget 0.1)
- DOM content loaded: 487 ms
- transferred script bytes: 183,688 (budget 600,000)
- longest long task: 87 ms (budget 200 ms)
- CSP/frame/no-sniff response-header assertions: pass

Raw metrics: `performance-report.json`.

## Remaining non-engineering evidence

Automation cannot honestly establish fun, fairness, laughter, or desire to replay.
Run two human groups with `PLAYTEST_PLAN.md`. Public deployment also awaits the
owner's hosting/domain authorization and final legal identity/contact text. Neither
blocks the private LAN friends playtest described in `PLAY_WITH_FRIENDS.md`.
