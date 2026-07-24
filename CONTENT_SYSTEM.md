# AL RIWAYAH — The Statement

Arabic title: **الرواية**  
Internal identifier: `al-riwayah`  
Product type: mobile-first local multiplayer party game + complete marketing website  
Gameplay devices: **players' phones only; no television required**  
Supported players: **4–6**  
Target session: **10–15 minutes**  
Primary language: **Arabic, RTL, Saudi-friendly conversational copy**  
Secondary language readiness: English architecture, optional later localization


## Content strategy

Use versioned TypeScript or JSON data validated by Zod. Prefer data for authored content and pure TypeScript functions for reusable rule predicates. Avoid YAML unless the existing repository already has a safe validated pipeline.

Recommended:

```text
packages/content/
  schema/
  cases/
    missing-payroll-envelope.v1.ts
  fixtures/
    synthetic/
  validate.ts
```

## Case content model

A case contains:

- stable `id` and semantic `version`;
- public title/pitch;
- player-count support;
- immutable evidence;
- private evidence pool and assignment constraints;
- planning fields/options;
- questions by family;
- normalized answer values;
- contradiction rules;
- plausibility rules;
- patch definitions;
- follow-up hooks;
- surprise evidence;
- scoring/verdict thresholds;
- localized copy;
- synthetic test paths.

## Stable identifiers

Never use visible Arabic text as logic keys.

Examples:

- `case.missing_payroll.v1`
- `location.meeting_room`
- `fact.driver`
- `player.role.security_caller`
- `evidence.wifi_storage_2348`
- `question.foundation.driver_arrival`
- `patch.storage_charger_admission`

## First case specification

### Public premise

A payroll envelope disappeared from an office between 23:30 and 00:00. The group was the last known set of people in the building.

### Immutable public evidence

1. Power failed at 23:46.
2. A registered group vehicle left parking at 00:01.
3. One group device connected to storage-room Wi-Fi at 23:48.
4. Security received a call during the incident window.

### Planning fields

#### Reason

- urgent work;
- retrieve personal item;
- repair equipment;
- informal meeting.

Each has authored plausibility interactions.

#### Locations at 23:46

- meeting room;
- reception;
- storage;
- parking.

Constraints should avoid an objectively perfect distribution.

#### Roles

- driver;
- security caller;
- key holder;
- first to leave the main room.

### Private evidence pool

Assign one per player with player-count-specific compatibility.

Examples:

- own device is the 23:48 Wi-Fi device;
- own vehicle is on camera;
- own receipt places player near the building at 23:39;
- security remembers the player's voice;
- player has the storage key record;
- player's phone battery was dead during part of the window.

Private evidence must not create an impossible starting state.

### Question set

At least:

- 8 foundation variants;
- 12 gap questions;
- 8 no-good-answer questions;
- 6 witness questions;
- 6 timeline/location questions;
- follow-ups for every patch commitment.

A match selects a balanced subset so the exact sequence changes.

## Contradiction rule example

```ts
{
  id: "contradiction.colocation.denied.v1",
  category: "WITNESS_DENIAL",
  severity: 16,
  when: {
    all: [
      { answerRef: "A.location.t2346", equals: "storage" },
      { answerRef: "A.withPlayer", equalsPlayerRef: "B" },
      { answerRef: "B.location.t2346", equals: "parking" },
      { answerRef: "B.wasAlone", equals: true }
    ]
  },
  explanation: {
    ar: "{{A}} قال إنه كان مع {{B}} في المستودع، لكن {{B}} قال إنه كان وحده في المواقف."
  }
}
```

## Patch example

```ts
{
  id: "patch.left_storage_before_outage.v1",
  resolvesCategories: ["COLOCATION", "WITNESS_DENIAL"],
  publicLabel: { "ar": "كان معه قبلها، ثم طلع للمواقف" },
  commitments: [
    { fact: "transition.player", source: "contradictedPlayer" },
    { fact: "transition.from", value: "storage" },
    { fact: "transition.to", value: "parking" },
    { fact: "transition.window", value: "23:40-23:46" }
  ],
  scoreEffects: {
    plausibility: -3,
    stability: -5
  },
  followUpQuestionIds: [
    "followup.why_left_storage",
    "followup.who_requested_parking_trip",
    "followup.returned_before_wifi_event"
  ]
}
```

## Plausibility

Plausibility is authored, deterministic, and explainable.

Examples:

- claiming all players moved during blackout: penalty;
- storage visit without any motive: penalty;
- vehicle movement with no named driver: penalty;
- evidence integrated with a coherent role: bonus;
- introducing three new actors to explain one fact: penalty.

Do not use an LLM for plausibility in review build.

## Validation

Build must fail when:

- duplicate IDs;
- missing localization;
- unsupported player count;
- question option has no normalized value;
- contradiction references unknown question/fact;
- patch resolves no possible contradiction;
- patch creates no commitment;
- follow-up hook missing;
- verdict thresholds overlap or leave gaps;
- private evidence can leak through public copy field;
- player-count assignment has no valid combination.

## Content authoring tool

The review build may use a developer-only content inspector rather than a full visual editor, but architecture must support a future editor.

Required inspector capabilities:

- view timeline;
- view map and exclusivity;
- simulate evidence assignments;
- inspect question dependencies;
- run random answer simulation;
- list unreachable patches/questions;
- render Arabic copy;
- show public/private field classification.

## Synthetic fixtures

Use names like:

- `لاعب أ`
- `لاعب ب`
- `لاعب ج`
- `لاعب د`

Never use real playtest names in committed fixtures.
