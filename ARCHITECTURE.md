# AL RIWAYAH — The Statement

Arabic title: **الرواية**  
Internal identifier: `al-riwayah`  
Product type: mobile-first local multiplayer party game + complete marketing website  
Gameplay devices: **players' phones only; no television required**  
Supported players: **4–6**  
Target session: **10–15 minutes**  
Primary language: **Arabic, RTL, Saudi-friendly conversational copy**  
Secondary language readiness: English architecture, optional later localization


## Status

Because no implementation repository is included, this is a **proposed architecture**. Claude must inspect the destination repository and record acceptance or replacement in `DECISIONS.md`.

## Proposed monorepo

```text
apps/
  web/             # Next.js marketing and mobile game shell
  server/          # Fastify + Socket.IO authoritative server
packages/
  protocol/        # Zod schemas and shared message types
  game-engine/     # Pure deterministic state machine and scoring
  content/         # Case definitions, validators, synthetic fixtures
  ui/              # Shared design tokens and components
  config/          # lint, TypeScript, environment validation
tests/
  e2e/             # Playwright browser/multi-context tests
  integration/     # server + multiple Socket.IO clients
  security/        # redaction, replay, identity, validation tests
  visual/          # screenshot and responsive checks
```

Use a `pnpm` workspace unless an existing repository has a justified alternative.

## Technology proposal

- TypeScript with strict mode.
- Next.js for public SEO pages and game client routing.
- React.
- Fastify for HTTP/health endpoints.
- Socket.IO for realtime rooms/reconnect transport.
- Zod for runtime message/content/environment schemas.
- Pure reducer/state-machine-style game engine.
- Vitest for unit/integration.
- Playwright for E2E/visual/accessibility smoke checks.
- No database for the review build.
- Optional Redis adapter is deferred until multi-instance scaling is required.

The server may serve behind the same public origin or an explicitly configured API origin. Production must use HTTPS/WSS.

## Why no database in review build

Rooms are short-lived and no account or persistent progression exists. Avoid unnecessary personal data and operational complexity.

Room state lives in memory with:

- inactivity TTL;
- hard maximum lifetime;
- cleanup timers;
- bounded event history;
- no raw private answer telemetry.

A server restart expires active rooms. This is acceptable for review build and must be stated in operational docs.

## Bounded contexts

### Web marketing

Owns public content, SEO, navigation, design demonstration, and create/join entry.

### Game client

Renders only the authoritative view for the current session. Owns local presentation preferences, not game truth.

### Realtime server

Authenticates room/session ownership, accepts intents, advances deadlines, invokes game engine, and emits redacted views.

### Game engine

Pure deterministic functions:

- initialize match;
- assign private evidence;
- lock planning facts;
- select questions;
- accept normalized answer;
- detect contradictions;
- rank reveal candidates;
- apply patch;
- generate follow-ups;
- calculate scores/verdict.

No sockets, DOM, or database code inside the engine.

### Protocol

Discriminated message schemas. No ad hoc event payloads.

### Content

Authored cases validated at build and test time.

## State separation

```text
AuthoritativeMatchState (server only)
├── public facts
├── player identities and connection
├── private evidence by player
├── private questions by player
├── private answers by player
├── contradictions and unreleased candidates
├── scoring internals
└── release flags

PublicRoomView (all players)
├── room code
├── phase/deadline
├── roster/ready/connection
├── released case facts
├── locked shared story
├── released contradiction
├── released evidence
└── released result

PrivatePlayerView (one player)
├── own session identity
├── own evidence
├── own current question/options
├── own answer lock
└── allowed actions
```

Never serialize the authoritative state directly.

## Room creation flow

```text
Web create form
  -> POST /api/rooms
  -> validate settings + creation rate limit
  -> RoomManager creates code and host PlayerSession
  -> return room code + opaque recovery token
  -> connect socket with room code/session token
  -> server emits host's redacted view
```

## Player join flow

```text
Join form
  -> socket JOIN_ROOM intent
  -> validate code, room phase, capacity, name, origin
  -> create PlayerSession and recovery token
  -> add player
  -> emit public roster to room
  -> emit private view to joining socket only
```

## Start flow

```text
Host START_MATCH
  -> validate host ownership
  -> validate 4–6 players and all ready
  -> engine.initialize(seed, case, players)
  -> assign evidence server-side
  -> phase CASE_BRIEF with server deadline
  -> emit redacted views
```

## Decision flow

```text
Player SUBMIT_ACTION(actionId, phaseRevision, payload)
  -> validate schema
  -> validate session
  -> validate phase + revision + deadline
  -> validate allowed option for this player
  -> idempotency check
  -> engine.applyIntent
  -> emit new views
```

## Timer

- Server stores absolute deadline.
- Clients render countdown from server time calibration.
- Server transition is authoritative.
- Client zero does not transition phase.
- Deadline transitions are idempotent.
- Tests use injectable clock.

## Reconnect

- Recovery token is random, opaque, scoped to room/player, and rotated on successful restore when practical.
- Client reconnect sends token.
- Server binds latest socket and invalidates or demotes previous socket.
- Only the player's own private view is restored.
- Submitted answer remains locked.

## Room end

- RESULTS remains available for a bounded period.
- Replay resets all answers, private evidence, contradiction candidates, timers, and released results.
- New group creates a new room code.
- Expired room deletes all in-memory private state.

## Telemetry

Allowed aggregated events:

- phase duration;
- completion;
- reconnect count;
- timeout count;
- contradiction category;
- verdict band;
- anonymous playtest session identifier.

Do not log names, room codes in plaintext operational logs, evidence text, question payloads, or private answers.
