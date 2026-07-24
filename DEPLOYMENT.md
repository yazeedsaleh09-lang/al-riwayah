# AL RIWAYAH — The Statement

Arabic title: **الرواية**  
Internal identifier: `al-riwayah`  
Product type: mobile-first local multiplayer party game + complete marketing website  
Gameplay devices: **players' phones only; no television required**  
Supported players: **4–6**  
Target session: **10–15 minutes**  
Primary language: **Arabic, RTL, Saudi-friendly conversational copy**  
Secondary language readiness: English architecture, optional later localization


## Proposed environments

### Local

- web and server on `0.0.0.0`;
- explicit `PUBLIC_APP_ORIGIN`;
- LAN testing from real phones;
- synthetic content only.

### Staging

Production-like HTTPS/WSS, isolated from production, debug UI disabled except authenticated internal tooling.

### Production

One stable public origin preferred. If web/server are separate, configure exact allowed origins and WSS URL.

## Proposed environment variables

| Name | Purpose | Local | Staging | Prod | Secret | Default / missing behavior |
|---|---|---:|---:|---:|---:|---|
| `NODE_ENV` | runtime mode | yes | yes | yes | no | fail-safe production behavior |
| `PORT` | server port | optional | yes | yes | no | platform/default |
| `PUBLIC_APP_ORIGIN` | canonical web/join origin | yes | yes | yes | no | fail startup outside dev |
| `NEXT_PUBLIC_REALTIME_URL` | socket URL | yes | yes | yes | no | same origin if omitted |
| `ALLOWED_ORIGINS` | exact CORS/origin list | optional | yes | yes | no | deny unknown in prod |
| `ROOM_TTL_MINUTES` | inactive room cleanup | optional | optional | yes | no | documented safe default |
| `ROOM_HARD_TTL_MINUTES` | max lifetime | optional | optional | yes | no | documented safe default |
| `LOG_LEVEL` | structured logging | optional | optional | yes | no | info |
| `TELEMETRY_ENABLED` | aggregate metrics | optional | optional | yes | no | false |
| `ERROR_TRACKING_DSN` | optional monitoring | no | optional | optional | yes | disabled |
| `BUILD_SHA` | release identity | no | yes | yes | no | unknown displayed safely |
| `ENABLE_ADMIN_TEST_CLIENT` | local test only | optional | false | false | no | false |

Validate environment at startup. Do not print secret values.

## Build/start proposal

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

Claude must replace with actual verified commands if repository differs.

## Health

- `/health/live`: process alive; no dependency details.
- `/health/ready`: room manager initialized and server accepting sockets.
- Build/version endpoint may expose only non-sensitive release ID.

## LAN testing

- avoid QR/share URL using `localhost`;
- derive join URL from configured public/LAN origin;
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
