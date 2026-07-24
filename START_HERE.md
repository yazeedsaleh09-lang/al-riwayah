# AL RIWAYAH — The Statement

Arabic title: **الرواية**  
Internal identifier: `al-riwayah`  
Product type: mobile-first local multiplayer party game + complete marketing website  
Gameplay devices: **players' phones only; no television required**  
Supported players: **4–6**  
Target session: **10–15 minutes**  
Primary language: **Arabic, RTL, Saudi-friendly conversational copy**  
Secondary language readiness: English architecture, optional later localization


## Starting condition

No game repository or source tree is included in this execution pack. The only grounded implementation status is: **product concept and specifications exist; implementation status is unknown until Claude inspects the destination repository**.

Claude must not invent existing commands, files, deployment providers, or passing tests.

## Mandatory first actions

Run and record:

```bash
pwd
git status --short --branch
git log -5 --oneline
git diff --stat
find . -maxdepth 3 -type f | sort | sed -n '1,240p'
```

Then inspect, when present:

```bash
cat package.json
cat pnpm-workspace.yaml
find . -name package.json -not -path '*/node_modules/*' -maxdepth 5 -print
find . -maxdepth 3 \( -name 'README*' -o -name 'CLAUDE.md' -o -name 'AGENTS.md' \) -print
```

## Decision after inspection

### Existing repository

Preserve working systems. Map real commands and architecture into `PROGRESS.md` and update any proposed architecture documents with a clearly dated accepted decision before implementation.

### Empty or unrelated repository

Create the proposed monorepo described in `ARCHITECTURE.md`.

## Proposed bootstrap when no implementation exists

Use currently supported stable releases at execution time. Do not pin versions from memory without checking package metadata.

```bash
corepack enable
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Proposed development commands after scaffold:

```bash
pnpm dev
pnpm dev:web
pnpm dev:server
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm test:security
pnpm test:visual
```

Claude must create these scripts if the repository starts from zero.

## Local multi-phone session

1. Start web and authoritative realtime server on `0.0.0.0`.
2. Determine the computer's LAN IP.
3. Open `/create` on the host phone.
4. Join from 3–5 additional phones using room code or shared link.
5. Confirm all devices use the LAN origin rather than `localhost`.
6. Complete the case through results.
7. Refresh one player during interrogation and verify recovery.

## Source of truth

- Rules: `GAME_DESIGN.md`
- Product scope: `PROJECT_SPEC.md`
- Phase identifiers: `REALTIME_PROTOCOL.md`
- Case schema and first case: `CONTENT_SYSTEM.md`
- Website completeness: `WEB_EXPERIENCE_SPEC.md`
- Visual behavior: `DESIGN_SYSTEM.md`

## Protected principles

Do not change these implicitly:

- No TV is required.
- No account is required.
- The host is also a player.
- 4–6 players.
- Server-authoritative room and timer.
- Private evidence and private answers never broadcast to other players.
- Contradictions must be explainable, deterministic, and visible.
- Scores are Consistency, Plausibility, Stability, and Evasion.
- A patch fixes one contradiction but creates at least one new narrative commitment.
- Website is production-complete; game is a polished one-case review build.
- No generic AI art, copied template assets, fabricated awards, fabricated reviews, or fake usage numbers.

## Known external blockers

Only these may block final production launch:

- Deployment account access.
- Domain/DNS access.
- Error-monitoring credentials if chosen.
- Final legal entity/contact details.
- Human playtest availability.
