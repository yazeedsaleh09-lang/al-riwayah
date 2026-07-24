# AL RIWAYAH — The Statement

Arabic title: **الرواية**  
Internal identifier: `al-riwayah`  
Product type: mobile-first local multiplayer party game + complete marketing website  
Gameplay devices: **players' phones only; no television required**  
Supported players: **4–6**  
Target session: **10–15 minutes**  
Primary language: **Arabic, RTL, Saudi-friendly conversational copy**  
Secondary language readiness: English architecture, optional later localization


## Persistence decision

Review build uses in-memory authoritative room state. No player account or database is required. Public website content is source-controlled.

## Entities

### `GameRoom`

- `id`: internal UUID, server-only.
- `code`: short public code; sensitive operationally.
- `status`: lobby/active/results/expired.
- `hostPlayerId`: server/public permission indicator.
- `caseId`, `settings`.
- `createdAt`, `lastActivityAt`, `expiresAt`.
- `match`: optional `Match`.
- `players`: map of `Player`.
- Retention: memory only; delete at expiry.

### `Player`

- `id`: random internal ID.
- `displayName`: validated, public to room.
- `joinOrder`: public/internal.
- `ready`: public.
- `connected`: public.
- `sessionHash`: server-only.
- `socketBinding`: server-only.
- `privateState`: server-only.
- No durable retention.

### `PlayerPrivateState`

- assigned evidence IDs;
- current private question ID;
- answer lock;
- recovery metadata;
- own contribution summary;
- never enters public view.

### `Match`

- `id`;
- `seed`;
- `caseId/version`;
- `phase`;
- `phaseRevision`;
- `deadlineAt`;
- `sharedStory`;
- `privateEvidenceByPlayer`;
- `questionsByPlayer`;
- `answersByPlayer`;
- `detectedContradictions`;
- `releasedContradictionIds`;
- `selectedPatches`;
- `commitments`;
- `scoreLedger`;
- `verdict`;
- server-only authoritative aggregate.

### `SharedStory`

Normalized facts only:

- reason;
- location per player at anchor;
- driver;
- security caller;
- key holder;
- first leave;
- patch commitments.

Released shared facts are public after lock.

### `Answer`

- question ID;
- player ID;
- normalized option ID;
- submittedAt;
- phaseRevision;
- fallback reason if timed out.
- Private until a rule intentionally releases an excerpt.

### `Contradiction`

- ID;
- rule ID/category;
- involved player IDs;
- involved answer/fact references;
- severity;
- localized explanation parameters;
- release status;
- resolvedByPatchId.
- Candidate list server-only; released contradiction public.

### `Patch`

Content definition plus match selection:

- patch ID;
- vote map server-only until resolution;
- commitments;
- score effects;
- appliedAt.

### `ScoreLedger`

Event entries:

- axis;
- delta;
- reason code;
- involved entity refs;
- release level.

The result exposes summarized reasons, not private raw answers beyond selected recap statements.

### `PublicRoomView`

Explicit DTO:

- room code;
- player roster;
- phase/revision/deadline;
- public case;
- released story;
- released contradiction;
- patch options when active;
- released evidence;
- public result.

### `PrivatePlayerView`

- own player/session status;
- own private evidence;
- own current question/options;
- own submitted state;
- own allowed actions;
- optional own result contribution.

## Data classification

| Data | Server | Same player | Other players | Public web |
|---|---:|---:|---:|---:|
| Display name | yes | yes | room only | no |
| Recovery token | hash/raw handling | own only | never | never |
| Private evidence | yes | own only | never | never |
| Private question | yes | own only | never | never |
| Private answer | yes | own locked state only | never before release | never |
| Shared story | yes | yes | room | no |
| Candidate contradictions | yes | never | never | never |
| Released contradiction | yes | yes | room | synthetic examples only |
| Internal score ledger | yes | no | no | no |
| Final summarized scores | yes | yes | room | synthetic only |

## Versioning

- Protocol version on every envelope.
- Case semantic version.
- Match stores exact case version.
- Public/private DTO schemas versioned.
- Content migrations not needed for in-memory matches; deploy must not mutate an active match definition in place.
