# Play with friends on the same Wi-Fi

This review build needs one Windows computer and 4–6 phones on the same trusted
Wi-Fi. The computer's current LAN address was `192.168.0.98` on 2026-07-27; re-run
`ipconfig` before a session because DHCP can change it.

## 1. Install, verify, and build

From this folder:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
```

## 2. Start the authoritative server

Open PowerShell window 1:

```powershell
$env:NODE_ENV="production"
$env:HOST="0.0.0.0"
$env:PORT="4000"
$env:CORS_ORIGIN="http://192.168.0.98:3000"
$env:ROOM_TTL_MS="1800000"
$env:ROOM_MAX_LIFETIME_MS="7200000"
$env:PHASE_DURATION_SCALE="1"
pnpm.cmd --filter @al-riwayah/server start
```

Keep `PHASE_DURATION_SCALE=1` for humans. Shortened timings are only for automation.

## 3. Start the phone website

Open PowerShell window 2:

```powershell
$env:NODE_ENV="production"
$env:NEXT_PUBLIC_SERVER_URL="http://192.168.0.98:4000"
$env:NEXT_PUBLIC_SITE_URL="http://192.168.0.98:3000"
pnpm.cmd build
pnpm.cmd --filter @al-riwayah/web start -- -H 0.0.0.0
```

`NEXT_PUBLIC_SERVER_URL` is embedded in the browser bundle, so set it **before**
`pnpm.cmd build`. Rebuild if the computer's LAN address changes.

Open `http://192.168.0.98:3000` on every phone. The host creates a room and taps
“شارك رابط الدخول”; the generated URL contains the LAN address and room code.

## 4. Sixty-second pre-session check

1. Confirm all phones are on the same Wi-Fi and not an isolated guest network.
2. On one phone, open `http://192.168.0.98:3000` and create a room.
3. Share the lobby link; join from a second phone and verify both names appear.
4. Lock and reopen the second phone, refresh, and verify it restores the same player.
5. Join the remaining phones, mark everyone ready, and start.

If Windows Firewall prompts, allow Node.js on **Private networks only**. If a phone
cannot open the site, confirm the current IPv4 address with `ipconfig`, replace the
address in both variables/URLs, and check that the Wi-Fi is not client-isolated.

## Safety and privacy

- Use a trusted private network; this LAN recipe is HTTP, not public-internet hosting.
- Rooms expire after inactivity and are erased on server restart.
- Do not expose ports 3000/4000 to the public internet. Public deployment must use
  HTTPS/WSS and an exact `CORS_ORIGIN`.
- The game has no accounts, analytics, or durable answer storage in this build.
