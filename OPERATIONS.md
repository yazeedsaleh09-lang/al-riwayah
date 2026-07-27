# Operations

## Routine checks

- readiness/liveness;
- active rooms and connections;
- phase transition failures;
- reconnect rate;
- memory/event-loop lag;
- cleanup success;
- safe error spike;
- release SHA.

## Runbook 1 — Server is healthy but players cannot join

1. Check public origin and Socket.IO endpoint.
2. Test upgrade request from browser network panel.
3. Check CORS/Origin rejection counts.
4. Verify room exists and is in LOBBY.
5. Confirm rate limiter is not globally misconfigured.
6. Do not dump session tokens or room private state.
7. Roll back if introduced by release.

## Runbook 2 — Phones do not receive updates

1. Check socket connection and room binding.
2. Compare phase revision server/client.
3. Inspect safe event counts, not payload.
4. Verify view builder emitted and namespace path matches.
5. Reproduce with synthetic test room.

## Runbook 3 — Share link uses wrong host

1. Confirm the browser opened the web app through the reachable LAN/public origin.
2. Inspect `NEXT_PUBLIC_SERVER_URL`; it must point to the reachable Socket.IO server.
3. Ensure `CORS_ORIGIN` exactly includes the web origin in production.
4. The lobby derives `/join?code=…` from `window.location.origin`; never open the host
   page through `localhost` before sharing it with phones.
5. Rebuild/restart after changing a `NEXT_PUBLIC_*` value.

## Runbook 4 — Player joins twice

1. Check recovery token flow.
2. Confirm latest socket replaces prior binding.
3. Verify join endpoint does not create player when valid restore exists.
4. Add regression test before close.

## Runbook 5 — Room does not transition

1. Inspect current phase/deadline/revision.
2. Check timeout scheduler and injectable clock.
3. Verify required action count and disconnected fallback.
4. Trigger transition only through idempotent engine command.
5. Never manually mutate production state without documented emergency tool.

## Runbook 6 — Timer stopped

1. Verify server time/deadline.
2. Distinguish UI countdown bug from authoritative scheduler.
3. Refresh a test client.
4. Check event-loop lag.
5. Roll back if scheduler regression.

## Runbook 7 — Private information appeared on another phone

1. Treat as critical incident.
2. Disable new room creation or affected release.
3. Capture minimal redacted evidence.
4. Roll back immediately.
5. Identify DTO/log path.
6. Add exact leakage test.
7. Expire affected active rooms.
8. Publish post-incident record without private content.

## Runbook 8 — Memory high

1. Active room count vs expected.
2. Heap trend after TTL.
3. Listener/request-ID cache bounds.
4. Force synthetic cleanup in staging.
5. Scale only after leak ruled out.
6. Restart/rollback under incident policy.

## Runbook 9 — Deployment failed

1. Keep previous version active.
2. inspect build/start/health logs;
3. verify environment schema;
4. do not weaken tests to deploy;
5. roll back or fix in a new release.

## Runbook 10 — Immediate rollback

1. Stop traffic to new version.
2. restore previous artifact/config;
3. verify health and socket smoke;
4. communicate active-room loss if applicable;
5. preserve redacted incident evidence;
6. create regression issue.

## Content operations

- New case content must validate.
- Run simulated 4/5/6 assignments.
- Run all contradiction/patch paths.
- Complete human playtest before marking available.
- Content status: draft → validated → playtest → available.
- Broken case can be disabled by feature flag without disabling site/game shell.
