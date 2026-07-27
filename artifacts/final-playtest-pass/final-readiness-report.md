# Final visual and playtest readiness report

Date: 2026-07-27

Branch: `main`

Status: **CODE RELEASE CANDIDATE VERIFIED; CURRENT RENDER HOSTS ARE NOT LIVE**

## Fresh verification

| Command / gate | Outcome |
|---|---|
| `pnpm install --frozen-lockfile` | pass, lock current |
| `pnpm lint` | pass |
| `pnpm typecheck` | pass, 6 workspace projects |
| `pnpm test` | 93 passed / 13 files |
| `pnpm --filter @al-riwayah/content validate` | all cases valid |
| `pnpm test:integration` | 26 passed / 3 files |
| `pnpm test:security` | 11 passed |
| `pnpm build` with production URLs | pass, Next 16.2.12, 14 routes |
| `pnpm test:e2e` | 46 passed; production-only performance test skipped by design |
| production `performance.spec.ts` | 1 passed |
| 4/5/6 independent browser contexts | pass through all 19 phases |
| create + join on real local server | pass |

## Production performance

- LCP: 276 ms (budget 2,500 ms)
- CLS: 0 (budget 0.1)
- DOM content loaded: 89 ms
- transferred script bytes: 184,492 (budget 600,000)
- longest long task: 92 ms (budget 200 ms)
- CSP/frame/no-sniff response-header assertions: pass

Raw metrics: `performance-report.json`.

## Room-creation incident

Two independent causes were confirmed:

1. Both documented Render hosts returned `404 Not Found` with
   `x-render-routing: no-server`. There is no active Render service behind the
   public hostnames, so no client code can complete a production room request
   until the Blueprint services are provisioned or relinked.
2. The browser emitted `room:create` immediately and failed after 6 seconds.
   A sleeping service could therefore be reported dead before it completed a
   cold start.

The client now probes `/health`, waits for a confirmed Socket.IO connection,
reports honest Arabic wake/connect/retry states, and retries within a bounded
75-second window before exposing a safe error. Reload/reconnect uses the same
grace window. `render.yaml` remains the deployment source of truth.

## Evidence

- responsive screenshots: `after/`
- 4/5/6-player lobby/results: `full-match/`
- homepage motion capture: `motion/homepage-motion.webm`
- performance: `performance-report.json`
- visual audit: `../../design/FINAL_VISUAL_AUDIT.md`

## Remaining external work

Provisioning or relinking the two Render services requires account-side Render
authority that is not available in this workspace. Human fun and fairness must
still be observed with real groups; automation does not fabricate those findings.
