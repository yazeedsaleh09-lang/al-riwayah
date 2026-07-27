# AL RIWAYAH — The Statement

Arabic title: **الرواية**  
Internal identifier: `al-riwayah`  
Product type: mobile-first local multiplayer party game + complete marketing website  
Gameplay devices: **players' phones only; no television required**  
Supported players: **4–6**  
Target session: **10–15 minutes**  
Primary language: **Arabic, RTL, Saudi-friendly conversational copy**  
Secondary language readiness: English architecture, optional later localization


## Verified environments

### Local

- web and server on `0.0.0.0`;
- web origin supplied to `CORS_ORIGIN`;
- LAN testing from real phones;
- synthetic content only.

### Staging

Production-like HTTPS/WSS, isolated from production, debug UI disabled except authenticated internal tooling.

### Production

One stable public origin preferred. If web/server are separate, configure exact allowed origins and WSS URL.

## Implemented environment variables

| Name | Purpose | Local | Staging | Prod | Secret | Default / missing behavior |
|---|---|---:|---:|---:|---:|---|
| `NODE_ENV` | runtime mode | yes | yes | yes | no | fail-safe production behavior |
| `PORT` | server port | optional | yes | yes | no | platform/default |
| `HOST` | server bind address | optional | yes | yes | no | `0.0.0.0` |
| `NEXT_PUBLIC_SERVER_URL` | browser Socket.IO origin | yes | yes | yes | no | `http://localhost:4000` |
| `CORS_ORIGIN` | comma-separated exact web origins | optional | yes | yes | no | `*` rejected in production |
| `ROOM_TTL_MS` | inactive room cleanup | optional | optional | yes | no | 30 minutes |
| `ROOM_MAX_LIFETIME_MS` | hard room lifetime | optional | optional | yes | no | 2 hours |
| `PHASE_DURATION_SCALE` | automation-only deadline multiplier | test only | `1` | `1` | no | `1`; range 0.01–1 |

`NEXT_PUBLIC_SERVER_URL` is embedded by Next.js at build time. Set it before
`pnpm build`; changing it only at process start does not update the browser bundle.

Validate environment at startup. Do not print secret values.

## Verified build/start

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @al-riwayah/server start
pnpm --filter @al-riwayah/web start
```

The server uses the pinned `tsx` runtime by ADR-013. For exact LAN PowerShell
variables and bind addresses, use `PLAY_WITH_FRIENDS.md`.

## Health

- `/health`: process alive; no private dependency details.
- `/readyz`: room manager initialized and server accepting sockets.
- Build/version endpoint may expose only non-sensitive release ID.

## LAN testing

- lobby share links derive from the actual web origin;
- set `NEXT_PUBLIC_SERVER_URL` to the computer's LAN server origin;
- Windows/macOS firewall instructions documented based on actual environment;
- test Safari iOS and Chrome Android where available.

## Monitoring

- request/error rates;
- active rooms/connections;
- room creation;
- phase transition latency;
- socket disconnect/reconnect;
- event-loop lag;
- memory;
- cleanup count/failures;
- safe error codes.

No private content labels.

## Rollback

- keep prior deploy artifact;
- schema/protocol version compatible during rolling deploy or use single-instance stop/start for review build;
- active in-memory rooms may be lost; maintenance messaging required;
- document provider-specific rollback after provider is selected.

## Production launch checklist

- acceptance gate;
- privacy/terms legal placeholders resolved;
- domain/HTTPS/WSS;
- origin allowlist;
- debug/test flags false;
- source-map policy;
- error-monitoring redaction;
- real-device smoke;
- 4-player complete session;
- rollback tested.
