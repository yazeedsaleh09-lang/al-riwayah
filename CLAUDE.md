# AL RIWAYAH — The Statement

Arabic title: **الرواية**  
Internal identifier: `al-riwayah`  
Product type: mobile-first local multiplayer party game + complete marketing website  
Gameplay devices: **players' phones only; no television required**  
Supported players: **4–6**  
Target session: **10–15 minutes**  
Primary language: **Arabic, RTL, Saudi-friendly conversational copy**  
Secondary language readiness: English architecture, optional later localization


## Operating contract

Read every root specification before editing code. Begin with `START_HERE.md`.

### Work continuously

Follow `ROADMAP.md` from the current incomplete gate. Do not stop after a phase to ask permission. Do not replace execution with a progress report. Continue until all automatable acceptance criteria pass or a legitimate external blocker exists.

### Preserve evidence

Before edits:

```bash
git status --short --branch
git diff
git log -5 --oneline
```

After each coherent change:

- run affected tests;
- update `PROGRESS.md`;
- update `DECISIONS.md` for design/architecture decisions;
- update `RISK_REGISTER.md` when a risk changes;
- save evidence paths;
- make an intentional commit when the repository policy permits.

### Product hierarchy

1. A fun and legible core game loop.
2. Deterministic secrecy and fairness.
3. Reliable mobile multiplayer.
4. Complete premium public website.
5. Motion and cinematic polish.
6. Additional content.

Do not hide a weak loop with animation.

### Server authority

The server owns:

- room membership;
- phase;
- deadlines;
- official shared story;
- private evidence assignment;
- answers;
- contradiction detection;
- patch consequences;
- scoring;
- result release.

Clients submit intents. Never trust a client-computed score, deadline, identity, or allowed option.

### UI requirements

- Arabic-first RTL.
- One primary action per game screen.
- Touch targets at least 44×44 CSS pixels.
- No secret information in DOM for another player.
- No generic dashboard or SaaS visuals.
- No long copy during timed phases.
- No copied Framer template implementation.
- No unlicensed assets.
- No fabricated testimonials, awards, review counts, or “players online.”
- Use original SVG/CSS/WebGL-free visuals unless a licensed asset is explicitly introduced.

### Scope discipline

The public site is finished and complete.

The playable review build includes one complete case and the full gameplay cycle. It does not require a large case library, AI-generated interrogation, accounts, payments, rankings, voice recording, or a traitor mode.

### Allowed human interruption

Stop only for:

- destructive production/data operation;
- missing external credential or deployment account;
- operating-system permission;
- irreconcilable requirements;
- legally unclear required asset;
- human playtest after all automatable work is complete.

When blocked, provide the exact blocker, completed evidence, smallest human action, and exact resume command.
