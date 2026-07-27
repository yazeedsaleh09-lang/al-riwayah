# Agent Rules

This file mirrors `CLAUDE.md` for agents that automatically detect `AGENTS.md`.

- Read the execution pack before code changes.
- Inspect Git state and real repository commands.
- Do not assume a blank project.
- Keep changes small, typed, tested, and reversible.
- Keep the realtime server authoritative.
- Validate every inbound message by schema, identity, phase, deadline, and allowed option.
- Never synchronize private evidence or private answers through public room state.
- Update protocol types before or with message changes.
- Do not add dependencies without documenting why the platform cannot provide the behavior.
- Preserve existing routes and modes until proven unused.
- Do not expose debug state in production.
- Do not stop after a phase; continue through the roadmap.
- Build a production-complete website and a polished one-case playable review build.

## Working contract

### Repository map

| Path | Responsibility |
|---|---|
| `apps/web` | Next.js Arabic-first marketing site and phone game client |
| `apps/server` | Fastify/Socket.IO authoritative room server |
| `packages/game-engine` | deterministic 19-phase match state and scoring |
| `packages/content` | authored cases and content validation |
| `packages/protocol` | inbound schemas and safe error contracts |
| `tests` | unit, integration, security, accessibility, responsive, and multi-client E2E |
| `artifacts/final-playtest-pass` | screenshots, motion capture, metrics, and readiness evidence |

### Required commands

Use the checked-in pnpm toolchain. A release candidate must pass:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd --filter @al-riwayah/content validate
pnpm.cmd test:integration
pnpm.cmd test:security
pnpm.cmd build
pnpm.cmd test:e2e
```

Production performance is a separate run with `E2E_PRODUCTION=1`. See
`PLAY_WITH_FRIENDS.md` for LAN launch commands and `DEPLOYMENT.md` for production
variables.

### Architectural boundaries

- Only the server may advance phases, accept deadlines, compute contradictions,
  select private questions/evidence, or publish results.
- Treat recovery tokens as bearer secrets. Store them only in the joining browser
  and rotate them when a session is restored.
- Public DTOs are allowlists. New private fields require explicit redaction tests.
- Protocol events require Zod validation before manager calls. Manager calls then
  validate identity, room membership, phase revision, deadline, and allowed choice.
- A reconnect replaces the old socket; a socket cannot bind to multiple rooms.
- Rooms are ephemeral and single-process by design for the review build.

### Product and design constraints

- Arabic RTL, Saudi conversational tone, 4–6 phones, no television.
- Preserve the dossier/evidence-board typography, ink/paper palette, red-thread
  evidence language, and original SVG/CSS artwork.
- Motion must explain hierarchy or state change, never delay input. Honor
  `prefers-reduced-motion`; sound and haptics remain optional.
- Maintain 44px targets, visible focus, logical heading order, keyboard operation,
  and no color-only meaning at 320px through desktop.
- Do not introduce claims, testimonials, availability, cases, or legal facts that
  are not supported by the execution pack.

### Stop conditions

Do not call work complete from static inspection. Completion requires fresh command
output, the 4/5/6 browser matrix, secrecy/adversarial checks, visual evidence,
production performance evidence, and an updated acceptance record. Human fun and
fairness findings remain an explicit post-handoff playtest activity; never fabricate
them.
