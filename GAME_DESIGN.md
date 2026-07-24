# AL RIWAYAH — The Statement

Arabic title: **الرواية**  
Internal identifier: `al-riwayah`  
Product type: mobile-first local multiplayer party game + complete marketing website  
Gameplay devices: **players' phones only; no television required**  
Supported players: **4–6**  
Target session: **10–15 minutes**  
Primary language: **Arabic, RTL, Saudi-friendly conversational copy**  
Secondary language readiness: English architecture, optional later localization


## Experience arc

| Segment | Intended feeling |
|---|---|
| Case brief | Curiosity and immediate stakes |
| Private evidence | “I have a problem the others may not understand” |
| Planning | Controlled chaos and negotiation |
| Separation | Isolation and doubt |
| Foundation questions | Confidence |
| Gap questions | Improvisational anxiety |
| No-good-answer questions | Strategic sacrifice |
| Contradiction reveal | Recognition, blame, laughter |
| Patch | Relief mixed with a new obligation |
| Surprise evidence | “Our fix made this worse” |
| Final question | Silent pressure |
| Verdict | A clear shared story of who broke what |

## Primary loop

1. Commit a shared fact.
2. Lose access to the shared story.
3. Answer privately.
4. Compare answers against relationships and evidence.
5. Reveal one explainable contradiction.
6. Select a patch with a defined cost.
7. Lock the patch as a new story commitment.
8. Ask follow-ups that test the commitment.

## Secondary loop

Players learn each other's assumptions:

- Who chooses the simplest explanation?
- Who overexplains?
- Who treats vague time as safe?
- Who selects an unreliable witness?
- Who protects a previously locked fact?

Replayability comes from social variance, shuffled private evidence, question selection, witness relationships, patch choices, and scoring—not only from case count.

## Conversation rules

- Planning phases: open discussion is encouraged.
- Private interrogation phases: players must not show screens. For local play, talking may be prohibited by the phase banner.
- Contradiction reveal: open discussion.
- Patch selection: open discussion followed by simultaneous confirmation.
- Final question: silence and private answers.

The product cannot technically prevent spoken cheating. It must clearly communicate phase rules and design the tension around voluntary compliance.

## Planning structure

Planning is not one unstructured 90-second timer.

### `PLAN_REASON` — 20 seconds

Choose why the group entered the office.

### `PLAN_LOCATIONS` — 30 seconds

Assign each player a location at the power failure. Players may propose positions; final positions lock when all confirm or timer expires.

### `PLAN_ROLES` — 25 seconds

Choose driver, security caller, first person to leave, and key holder.

### `PLAN_REVIEW` — 20 seconds

Show only critical locked facts, then remove the story from view.

## Question families

### Foundation

Directly tests locked facts with paraphrased but deterministic answer mappings.

### Gaps

Asks about details not explicitly planned. The answer should be inferred from story logic or social expectation.

### No-good-answer

Every option creates a cost. The skill is choosing the least damaging commitment.

### Witness

A player identifies another player who can confirm the answer. The witness receives a later confirmation question.

### Timeline

Orders events or selects an interval.

### Location

Selects a place on a simple map.

### Follow-up

Generated from deterministic case rules after a patch or contradiction. No language model is required.

## Contradiction taxonomy

| Type | Example | Requirement |
|---|---|---|
| Direct identity | Two different drivers | Mutually exclusive normalized values |
| Co-location | A says with B; B says alone | Relationship mismatch at same time anchor |
| Time impossibility | Left before event but witnessed event inside | Timeline rule violation |
| Evidence collision | Claims no storage visit; Wi-Fi evidence says otherwise | Answer vs immutable evidence |
| Witness denial | A names B; B denies | Cross-player dependency |
| Majority anomaly | One answer differs from all others | Suspicion, not automatic contradiction |
| Stability break | Changed locked fact | Penalty plus possible contradiction |
| Evasion pattern | Repeated vague response | Evasion penalty and follow-up |

## Contradiction selection

The engine may detect many issues, but reveal only the strongest one per reveal slot.

Priority:

1. evidence collision;
2. direct impossibility;
3. witness denial;
4. locked-fact break;
5. co-location mismatch;
6. majority anomaly.

Tie-break with:

- highest narrative importance;
- fewest players needed to understand it;
- least recently revealed category;
- deterministic seeded order.

## Patch system

A patch must never simply replace an answer.

Each patch contains:

- contradiction it resolves;
- revised fact;
- cost to Consistency/Plausibility/Stability;
- at least one new commitment;
- one or more follow-up question hooks.

Patch archetypes:

### Shift time

“Player B was there earlier, then left.”

Creates an exact transition window.

### Mistaken identity

“Player A confused B with C during the outage.”

Damages witness reliability.

### Partial admission

“Yes, someone entered storage, but only to retrieve a charger.”

Creates motive, owner, requester, and return-time commitments.

### Evidence reinterpretation

“The access point connection was automatic from the corridor.”

May reduce plausibility and trigger proximity questions.

## Score model

Scores are deterministic and auditable. Initial value 100.

Suggested first-case weights, subject to playtest:

- Consistency: subtract 8–20 per contradiction depending on severity.
- Plausibility: add/subtract authored rule weights.
- Stability: subtract for changing locked facts or conflicting patch confirmations.
- Evasion: start 0 and add 5–15 per evasive answer.

Verdict should not use a hidden opaque formula. Document thresholds in case content and show the decisive factors.

## Player disconnection

- During planning: disconnected player's proposal remains but confirmation is pending; timeout uses safest case fallback.
- During private question: preserve submitted answer; if unanswered at deadline, apply `NO_RESPONSE`.
- During patch: connected majority selects among valid patches; tie uses case-defined least-destructive fallback.
- No player is removed from the story mid-match.
- Rejoining restores only that player's private view.

## Anti-dominance

- Private evidence creates distributed authority.
- Planning is split into focused decisions.
- Every player must confirm at least one story element.
- Private interrogation eliminates real-time coaching.
- Results recognize multiple contributions, not only the loudest player.

## Waiting prevention

- Questions are simultaneous.
- Players who answer early see a short “confidence prediction”: choose which fact they believe will break. This is optional telemetry/game flavor and cannot change score.
- Reveal begins immediately when all required answers arrive.
- Server deadlines cap every phase.

## Phase table

| Phase | All phones show | Private content | Interaction | Timer | Completion | Failure handling |
|---|---|---|---|---:|---|---|
| LOBBY | code, players | own reconnect state | ready/start | none | host start | room expiry |
| CASE_BRIEF | case premise/evidence | none | continue | 30s | all ready/timeout | auto-advance |
| PRIVATE_EVIDENCE | generic instruction | one evidence card | acknowledge | 35s | all/timeout | mark unseen |
| PLAN_REASON | reason options | evidence reminder | discuss + vote | 20s | consensus/timeout | plurality |
| PLAN_LOCATIONS | map and players | own constraints | propose/confirm | 30s | all confirm | authored fallback |
| PLAN_ROLES | role facts | own constraints | discuss + choose | 25s | complete | authored fallback |
| PLAN_REVIEW | locked story | own evidence | review | 20s | timer | auto |
| INTERROGATION_FOUNDATION | silence instruction | question | answer | 12–18s | all/timeout | NO_RESPONSE |
| INTERROGATION_GAPS | silence instruction | question | answer | 12–18s | all/timeout | NO_RESPONSE |
| INTERROGATION_NO_GOOD_ANSWER | warning | dilemma | answer | 15s | all/timeout | worst-safe option |
| CONTRADICTION_REVEAL_1 | shared reveal | involved-player emphasis | discuss | 25s | timer | auto |
| PATCH_1 | patch choices | relevant evidence | discuss + confirm | 25s | majority | deterministic tie |
| SURPRISE_EVIDENCE | new evidence | optional personal impact | acknowledge | 20s | all/timeout | auto |
| INTERROGATION_FOLLOWUP | silence instruction | generated follow-up | answer | 12–18s | all/timeout | NO_RESPONSE |
| CONTRADICTION_REVEAL_2 | shared reveal | involved-player emphasis | discuss | 25s | timer | auto |
| PATCH_2 | patch choices | relevant evidence | discuss + confirm | 20s | majority | deterministic tie |
| FINAL_QUESTION | final challenge | individualized wording | answer | 8s | all/timeout | NO_RESPONSE |
| VERDICT | score build | none | none | 20s | sequence ends | reduced-motion static |
| RESULTS | recap and actions | own contribution | replay/new group | none | host action | room expiry |

## Human playtest decisions

Do not finalize without human data:

- planning durations;
- number of displayed contradictions;
- severity weights;
- whether talking must be prohibited during all interrogation;
- whether two patch phases are enough;
- whether “no response” feels fair;
- whether verdict labels feel punitive or funny;
- whether 6-player planning becomes dominated by two voices.
