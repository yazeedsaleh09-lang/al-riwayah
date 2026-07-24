# AL RIWAYAH — The Statement

Arabic title: **الرواية**  
Internal identifier: `al-riwayah`  
Product type: mobile-first local multiplayer party game + complete marketing website  
Gameplay devices: **players' phones only; no television required**  
Supported players: **4–6**  
Target session: **10–15 minutes**  
Primary language: **Arabic, RTL, Saudi-friendly conversational copy**  
Secondary language readiness: English architecture, optional later localization


## Protocol rules

- Version: `1`.
- Transport: Socket.IO proposed.
- All client events use Zod validation.
- Every gameplay intent contains `requestId` and `phaseRevision`.
- Server responses use typed acknowledgments.
- The server never trusts client time.
- The server emits views, not raw state.

## Client types

- `PLAYER`: every participant, including creator.
- `ADMIN_TEST`: automated/local test client only, disabled in production.
- No TV, spectator, or separate host display.

Host is a permission on one `PLAYER` session.

## Core phases

Use the canonical 19 phase identifiers from `PROJECT_SPEC.md`. Protocol rejects actions outside their allowed phase.

## Client-to-server events

| Event | Allowed state | Payload | Validation | Response | Secrecy |
|---|---|---|---|---|---|
| `room:create` | unaffiliated | settings, displayName | rate, name, case availability | room/session credentials | private |
| `room:join` | lobby | code, name | room, capacity, name | session credential | private |
| `room:restore` | any active | recoveryToken | token ownership/expiry | rotated token + view | private |
| `player:setReady` | LOBBY | ready | session | ack + roster update | public result |
| `match:start` | LOBBY | requestId | host, count, ready | ack | public result |
| `phase:acknowledge` | brief/evidence | requestId, revision | phase/player | ack | private |
| `story:propose` | planning | fieldId, value | allowed value | ack | public after accepted |
| `story:confirm` | planning | fieldId/revision | player eligibility | ack | public |
| `answer:submit` | interrogation/final | questionId, optionId | own question, deadline, idempotency | locked ack | private |
| `patch:vote` | PATCH_1/PATCH_2 | patchId | released choices | ack | private until reveal |
| `result:replay` | RESULTS | requestId | host | ack | public |
| `room:newGroup` | RESULTS | requestId | host | new room | private then public |
| `player:leave` | any | none | session | ack | public connection change |

## Server-to-client events

| Event | Recipient | Content | Forbidden content |
|---|---|---|---|
| `view:public` | room | phase, deadline, released public data | evidence assignments, answers, candidates |
| `view:private` | one socket | own evidence/question/allowed actions | other players' private fields |
| `room:error` | request socket | safe code/message | stack, token, internal state |
| `session:rotated` | one socket | new token | any other session |
| `connection:replaced` | previous socket | safe notice | new socket details |
| `server:time` | socket | server timestamp/revision | internals |

## Message envelopes

```ts
type ClientIntent<T> = {
  protocolVersion: 1;
  requestId: string;
  roomCode?: string;
  phaseRevision?: number;
  payload: T;
};

type ServerAck<T> =
  | { ok: true; requestId: string; data: T }
  | { ok: false; requestId: string; error: SafeError };
```

## Idempotency

- Cache processed `requestId` per player for the active room, bounded by TTL/count.
- Repeated identical request returns the prior acknowledgment.
- Reused request ID with different payload is rejected and logged as a security event without sensitive payload.
- `answer:submit` is one-shot unless the authored question explicitly allows edit before deadline. Review build: no edits.

## Ordering

`phaseRevision` increments on every authoritative phase transition and significant subphase reset. Client intents with old/future revision are rejected.

## Late messages

- Arrival after server deadline: reject `DEADLINE_PASSED`.
- Socket/network delay does not extend deadline.
- UI should lock on local estimated zero but wait for server transition.

## Session policy

- Recovery token: at least 128 bits entropy.
- Store a hash server-side where feasible.
- Bound to player and room.
- Expire with room and after hard session lifetime.
- Do not put token in shareable join URL.
- Local browser storage is allowed for recovery token only with clear scoped key and cleanup.

## Rate limits

Proposed starting limits:

- room create: 5 per IP per 10 minutes;
- join attempts: 20 per IP per 5 minutes;
- gameplay intents: 10 per second per session burst, lower sustained;
- names: max 24 grapheme clusters;
- payload: max 8 KiB client event;
- room code attempts return uniform safe errors where possible.

## Safe error codes

- `INVALID_PAYLOAD`
- `UNSUPPORTED_PROTOCOL`
- `ROOM_NOT_FOUND`
- `ROOM_EXPIRED`
- `ROOM_FULL`
- `MATCH_STARTED`
- `NAME_INVALID`
- `NAME_TAKEN`
- `NOT_HOST`
- `NOT_READY`
- `INVALID_PHASE`
- `STALE_REVISION`
- `DEADLINE_PASSED`
- `ACTION_NOT_ALLOWED`
- `ANSWER_ALREADY_LOCKED`
- `SESSION_INVALID`
- `RATE_LIMITED`
- `SERVER_UNAVAILABLE`

## Redaction tests

The protocol is incomplete until tests prove:

- public view has no `privateEvidence`, `answersByPlayer`, unreleased contradiction candidates, internal scores, recovery token, or question for another player;
- private view contains exactly one player's private fields;
- errors contain no payload echo;
- logs do not print private envelopes.
