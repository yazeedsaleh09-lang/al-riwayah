# AL RIWAYAH — The Statement

Arabic title: **الرواية**  
Internal identifier: `al-riwayah`  
Product type: mobile-first local multiplayer party game + complete marketing website  
Gameplay devices: **players' phones only; no television required**  
Supported players: **4–6**  
Target session: **10–15 minutes**  
Primary language: **Arabic, RTL, Saudi-friendly conversational copy**  
Secondary language readiness: English architecture, optional later localization


## Security goals

1. A player can access only their own private evidence, question, and submission status.
2. Clients cannot advance phase, alter deadline, select unauthorized options, or calculate official score.
3. Room/session identifiers are resistant to casual guessing and replay.
4. Public marketing surfaces do not expose operational/debug data.
5. Logs and telemetry avoid private game content.

## Threat model

### Malicious player client

May inspect JavaScript, modify events, replay requests, change local time, or attempt another player's identifiers.

Mitigation:

- server authority;
- opaque session token;
- schema/phase/ownership checks;
- idempotency;
- public/private DTO allowlists;
- no answer data in shared socket rooms.

### Room-code guessing

Mitigation:

- sufficient code space;
- rate limits;
- uniform safe errors;
- room TTL;
- no search/list endpoint;
- optional temporary join lock after start.

### XSS through names/copy

Mitigation:

- React escaping;
- grapheme and character policy;
- no `dangerouslySetInnerHTML` for player content;
- CSP;
- sanitize only where rich text is genuinely required.

### Session theft

Mitigation:

- token never in room share URL;
- TLS;
- scoped browser storage;
- rotate on restore where practical;
- replace prior socket;
- expiry and cleanup.

### State leakage

Highest-risk failure. Mitigation:

- separate DTO builders;
- unit snapshot/structural tests;
- never call `JSON.stringify(authoritativeState)` for clients/logs;
- logging redactor;
- production source maps not publicly exposed without policy.

### DoS/resource exhaustion

- room create/join rate limits;
- max 6 players;
- max room lifetime;
- max payload size;
- bounded request-ID cache;
- bounded event history;
- cleanup monitoring;
- health/readiness endpoints.

## Required headers

- strict CSP compatible with implementation;
- HSTS in production;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy`;
- `Permissions-Policy` limiting unneeded features;
- frame-ancestors policy;
- secure cookies if cookies are used;
- explicit Origin/CORS allowlist.

## Privacy

First launch should collect no account, email, phone, precise location, contacts, microphone, camera, or advertising identifiers.

Operational IP logs may exist at hosting edge; privacy page must state actual deployment behavior.

Retention:

- active room data: room lifetime only;
- aggregate telemetry: only if enabled and documented;
- error reports: redacted;
- playtest notes: synthetic IDs, stored outside public repository if containing participant feedback.

## Mandatory leakage tests

- TV-related tests from generic templates are not applicable because no TV exists.
- `PublicRoomView` never contains:
  - evidence assignment;
  - other-player question;
  - answers map;
  - unreleased contradiction;
  - score ledger;
  - session token.
- Player A private view does not contain B private fields.
- Result type/score not emitted before `VERDICT`.
- Error payload does not echo invalid client content.
- Production logger test verifies private keys are redacted.
- Browser bundle search does not contain authored answer assignments for active sessions; case definitions may contain generic options but not runtime assignment.

## Pre-production checklist

- [ ] No `.env` committed.
- [ ] Secret scanner passes.
- [ ] Dependency audit reviewed.
- [ ] Rate limits enabled.
- [ ] Origin allowlist production-correct.
- [ ] HTTPS/WSS verified.
- [ ] Debug/admin/test routes disabled.
- [ ] Demo flags disabled.
- [ ] Stack traces hidden.
- [ ] Source-map policy verified.
- [ ] Room TTL tested.
- [ ] Session restore theft tests pass.
- [ ] Log redaction test passes.
- [ ] CSP report/console reviewed.
- [ ] Privacy/terms match actual data flow.
