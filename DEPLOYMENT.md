# AL RIWAYAH — Render production deployment

The production deployment is defined by the repository-root `render.yaml`
Blueprint. It creates two Render Web Services from the `main` branch of
`https://github.com/yazeedsaleh09-lang/al-riwayah`.

## Services and commands

Render runs every command from the monorepo root so pnpm can resolve the
workspace packages.

| Service             | Type               | Build command                                                                 | Start command                            | Health check |
| ------------------- | ------------------ | ----------------------------------------------------------------------------- | ---------------------------------------- | ------------ |
| `al-riwayah-server` | Render Web Service | `pnpm install --frozen-lockfile && pnpm --filter @al-riwayah/server... build` | `pnpm --filter @al-riwayah/server start` | `/health`    |
| `al-riwayah-web`    | Render Web Service | `pnpm install --frozen-lockfile && pnpm --filter @al-riwayah/web... build`    | `pnpm --filter @al-riwayah/web start`    | `/`          |

Both services use the Node version selected by the checked-in `.node-version`
and the pnpm version pinned by `packageManager` in the root `package.json`.
Render supplies `PORT`; neither service hardcodes it. The server binds to
`0.0.0.0`, and the Next.js start script also binds to `0.0.0.0`.

The server intentionally runs as one instance because rooms are held in memory
and are single-process by design. A deploy or instance replacement ends active
rooms. Do not scale horizontally until room state and the Socket.IO adapter are
moved to shared infrastructure.

## Required environment variables

The Blueprint contains only non-secret production configuration.

### `al-riwayah-server`

| Name                   | Production value                      | Notes                                                         |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------- |
| `NODE_ENV`             | `production`                          | Enables production safety checks.                             |
| `HOST`                 | `0.0.0.0`                             | Required Render bind address.                                 |
| `PORT`                 | supplied by Render                    | Do not set or hardcode this.                                  |
| `CORS_ORIGIN`          | `https://al-riwayah.onrender.com` | Comma-separated exact origins; `*` is rejected in production. |
| `ROOM_TTL_MS`          | `1800000`                             | Idle room lifetime: 30 minutes.                               |
| `ROOM_MAX_LIFETIME_MS` | `7200000`                             | Hard room lifetime: 2 hours.                                  |
| `PHASE_DURATION_SCALE` | `1`                                   | Production deadlines must remain unscaled.                    |

### `al-riwayah-web`

| Name                     | Production value                         | Notes                                                             |
| ------------------------ | ---------------------------------------- | ----------------------------------------------------------------- |
| `NODE_ENV`               | `production`                             | Set by the Blueprint and Render runtime.                          |
| `PORT`                   | supplied by Render                       | Read by `next start`; do not hardcode this.                       |
| `NEXT_PUBLIC_SERVER_URL` | `https://al-riwayah-server.onrender.com` | Embedded at build time; HTTPS causes Socket.IO to use secure WSS. |
| `NEXT_PUBLIC_SITE_URL`   | `https://al-riwayah.onrender.com`        | Canonical public site origin.                                     |

There are currently no application secrets. If a secret is introduced later,
add only its key with `sync: false` in `render.yaml`, then enter its value in
the Render dashboard. Never commit a secret value.

`NEXT_PUBLIC_SERVER_URL` is embedded into the browser bundle during
`next build`. Changing it requires **Save, rebuild, and deploy**, not a runtime-only
restart. Production builds fail if it is missing, non-HTTPS, or loopback.

## First deployment from the Render dashboard

1. Push `render.yaml` to the repository's `main` branch.
2. Sign in to Render and connect the GitHub account that can read
   `yazeedsaleh09-lang/al-riwayah`.
3. Click **New +** → **Blueprint**.
4. Find `yazeedsaleh09-lang/al-riwayah` and click **Connect**.
5. Set the Blueprint branch to **main** and leave the Blueprint path as
   `render.yaml`.
6. Give the Blueprint a recognizable name such as `al-riwayah-production`.
7. Review the two Starter services:
   `al-riwayah-server` and `al-riwayah-web`, both in Frankfurt.
8. Click **Deploy Blueprint**.
9. Wait for both deploys to become **Live**. Open
   `https://al-riwayah-server.onrender.com/health` and confirm a JSON response
   with `"status":"ok"`.
10. Open `https://al-riwayah.onrender.com`, create a room, and join it from
    another device or private browser window. Confirm both clients remain
    connected and can recover after refreshing one client.

If Render reports that either service name is already taken or appends a suffix,
do not deploy with mismatched URLs. Choose final unique service names, then update
all three matching Blueprint values together:

- the server service `name` and `NEXT_PUBLIC_SERVER_URL`;
- the web service `name`, `NEXT_PUBLIC_SITE_URL`, and server `CORS_ORIGIN`.

Commit and push that synchronized change before deploying again.

## HTTPS, WebSockets, CORS, and recovery

Render terminates public TLS and forwards HTTP/WebSocket upgrade traffic to the
server on `PORT`. The browser connects to the HTTPS server origin, so Socket.IO
uses WSS for its WebSocket transport and can fall back to HTTPS long polling.
Socket.IO sends ping/pong heartbeats every 25 seconds and treats a client as
timed out after 20 seconds without a pong.

The client reconnects with exponential backoff (1–10 seconds with jitter). After
reconnecting it restores the room using the browser-held recovery token; the
server rotates that bearer token and replaces the old socket. Recovery works
only while the same single server process still holds the room.

The server accepts browser requests only from the exact `CORS_ORIGIN` allowlist.
When adding a custom web domain, add its exact HTTPS origin to `CORS_ORIGIN`
(comma-separated if retaining the Render URL), update `NEXT_PUBLIC_SITE_URL`,
and rebuild both services.

## Local production verification

Install and run the complete release gate from the repository root:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd --filter @al-riwayah/content validate
pnpm.cmd test:integration
pnpm.cmd test:security
$env:NEXT_PUBLIC_SERVER_URL = "https://al-riwayah-server.onrender.com"
$env:NEXT_PUBLIC_SITE_URL = "https://al-riwayah.onrender.com"
pnpm.cmd build
pnpm.cmd test:e2e
```

For a deployed smoke test, verify `/health`, load the web origin over HTTPS, and
complete create/join/reconnect checks from at least two browser contexts. The
full release acceptance gate still requires the documented 4/5/6-browser matrix,
secrecy/adversarial checks, visual evidence, production performance run, and an
updated acceptance record. Human fun and fairness findings remain a real
post-handoff playtest activity.

## Rollback

Use each service's **Deploys** page to select the last known-good deploy and
click **Rollback**. Roll back both services together if protocol compatibility
changed. Active in-memory rooms cannot survive a server rollback.
