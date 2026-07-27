# Security and privacy report — 2026-07-27

## Passed

- Inbound schemas reject invalid options and markup/script display names.
- Identity, membership, phase revision, deadline, and allowed options are checked
  before mutation.
- The server remains phase/timer/scoring authority.
- Public DTOs contain no private evidence, question, answer, candidate
  contradiction, recovery token, or pre-verdict result.
- One player's private view excludes every other player's private question/evidence.
- Request IDs are idempotent and conflicting reuse cannot alter a locked answer.
- Restore rotates the recovery token and replaces the previous socket.
- Invalid/stolen tokens are denied; expired rooms return a distinct safe state.
- Join attempts are rate limited; Socket.IO payloads are capped at 8 KiB.
- Production refuses wildcard CORS and does not mount debug routes.
- Production web emits CSP, HSTS, frame denial, no-sniff, referrer, and permissions headers.
- Logs redact codes, names, tokens, private evidence, and answers.
- Five consecutive replays retain one room and clear prior private state.
- Credential-pattern scan: no findings outside excluded tool/vendor artifacts.
- `pnpm audit --prod`: **No known vulnerabilities found**.

## Review-build boundaries

Rooms are ephemeral, single-process, and lost on restart. The LAN recipe is for a
trusted private Wi-Fi. Internet deployment requires HTTPS/WSS, an exact CORS origin,
and a provider with persistent WebSocket support.
