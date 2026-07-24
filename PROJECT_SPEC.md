# AL RIWAYAH — The Statement

Arabic title: **الرواية**  
Internal identifier: `al-riwayah`  
Product type: mobile-first local multiplayer party game + complete marketing website  
Gameplay devices: **players' phones only; no television required**  
Supported players: **4–6**  
Target session: **10–15 minutes**  
Primary language: **Arabic, RTL, Saudi-friendly conversational copy**  
Secondary language readiness: English architecture, optional later localization


## Product statement

AL RIWAYAH is a local multiplayer party game played entirely through phones. A group implicated in a suspicious incident must agree on one shared cover story. The players are then separated into private interrogations. Their answers are compared against the agreed story, each other, and fixed evidence. When a contradiction is exposed, the group gets a limited chance to patch it, but every patch introduces a new fact they must defend.

## Entertainment need

Most social deduction games ask players to identify a hidden traitor. AL RIWAYAH instead makes everyone cooperate in the same deception. The tension comes from imperfect shared understanding, memory, improvisation, and the accumulating cost of repairs.

## Player fantasy

> “We are all suspects. We have one minute to get our story straight. I need to protect the group without knowing exactly what everyone else will say.”

## Audience

- Arabic-speaking friend groups.
- Ages 16+ target; content must remain configurable by rating.
- Players comfortable reading short mobile prompts.
- Casual and non-gamer-friendly onboarding.

## Design pillars

1. **One lie, many interpretations.**
2. **Separation creates pressure.**
3. **Every contradiction is understandable.**
4. **Repair is a decision, not an undo button.**
5. **The result tells the story of the players.**
6. **Phones enable privacy; people create the fun.**

## Supported session

- 4–6 players.
- 10–15 minutes after joining.
- Local room by default; remote voice-call play is technically possible but not first-launch optimized.
- One host creates the room and remains a normal player.
- No television, account, installation, or persistent profile.

## Product surfaces

### Complete marketing site

A premium editorial website with final-quality navigation, copy, motion, responsive layouts, SEO, legal pages, accessibility, performance, and launch-ready metadata.

### Playable review build

One complete case with:

- room creation and join;
- reconnect;
- staged planning;
- private evidence;
- three interrogation modes;
- deterministic contradiction detection;
- two patch opportunities;
- surprise evidence;
- final question;
- four-axis result;
- replay/new group.

## Canonical phase sequence

1. `LOBBY`
2. `CASE_BRIEF`
3. `PRIVATE_EVIDENCE`
4. `PLAN_REASON`
5. `PLAN_LOCATIONS`
6. `PLAN_ROLES`
7. `PLAN_REVIEW`
8. `INTERROGATION_FOUNDATION`
9. `INTERROGATION_GAPS`
10. `INTERROGATION_NO_GOOD_ANSWER`
11. `CONTRADICTION_REVEAL_1`
12. `PATCH_1`
13. `SURPRISE_EVIDENCE`
14. `INTERROGATION_FOLLOWUP`
15. `CONTRADICTION_REVEAL_2`
16. `PATCH_2`
17. `FINAL_QUESTION`
18. `VERDICT`
19. `RESULTS`

## Scoring

### Consistency

Agreement among players and with locked story facts.

### Plausibility

Logical credibility relative to immutable evidence and scenario rules.

### Stability

Resistance to changing previously committed facts.

### Evasion

Penalty dimension for vague, non-answers, repeated “I do not remember,” or unjustified uncertainty.

Final verdict uses all four. Evasion is displayed as a negative dimension.

## Completion and failure

The match always reaches a verdict unless the room is abandoned. There is no player elimination.

Verdict bands:

- `A — Released`
- `B — Insufficient evidence`
- `C — Primary suspect identified`
- `D — Investigation remains open`
- `F — Story collapsed`

The team result is shared. Results may name a “most consistent player” and “primary suspect” for recap, but no individual wins against the group in the first mode.

## First case

`missing_payroll_envelope_v1`

Premise: a payroll envelope disappears from an office late at night while the group is the last known set of people inside.

Locations:

- Meeting room
- Reception
- Storage room
- Parking area

Fixed evidence includes:

- power failure at 23:46;
- a vehicle leaving at 00:01;
- one device connecting to the storage-room access point at 23:48;
- one call to security.

All exact content is defined in `CONTENT_SYSTEM.md`.

## Required product features

- Short room code and share link.
- Validated names.
- Ready state.
- Host start guarded by 4-player minimum and readiness.
- Private session recovery token.
- Server deadline on every timed phase.
- Phase-specific private view.
- Safe fallback for missing player answer.
- Clear reconnection state.
- Full reset on replay.
- New group option.
- Arabic RTL.
- Reduced motion.
- Mute.
- Keyboard and screen-reader support for web routes.
- Responsive mobile gameplay at 320, 360, and 390 CSS pixels.

## Explicit exclusions from review build

- TV client.
- Hidden traitor/informant.
- Voice recording.
- Free-text answer adjudication.
- Generative AI.
- Accounts.
- Payments.
- public matchmaking.
- persistent rankings.
- user-generated cases.
- multiple investigator personalities.
- native mobile application.
- spectator mode.

## Error behavior

- Invalid room code: preserve entered name and provide retry.
- Full/started/expired room: distinguish clearly.
- Lost connection: freeze decision interaction, show reconnecting, restore authoritative view.
- Missed deadline: server applies the case-defined fallback and records it.
- Host leaves: authority transfers to earliest connected player; game state remains server-owned.
- Server restart in review build: room may expire unless persistence is explicitly added and documented.

## Definition of Done

The public website is complete when every required route is polished, responsive, accessible, performant, content-complete, and contains no placeholder/fake content.

The playable review build is complete when automated 4-, 5-, and 6-player sessions finish, secrecy tests pass, a real multi-phone session completes, reconnect works, results explain contradictions, all acceptance gates pass, and at least two human playtest groups demonstrate that contradiction reveal and patching create understandable discussion.
