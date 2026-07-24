# AL RIWAYAH — The Statement

Arabic title: **الرواية**  
Internal identifier: `al-riwayah`  
Product type: mobile-first local multiplayer party game + complete marketing website  
Gameplay devices: **players' phones only; no television required**  
Supported players: **4–6**  
Target session: **10–15 minutes**  
Primary language: **Arabic, RTL, Saudi-friendly conversational copy**  
Secondary language readiness: English architecture, optional later localization


## Website product requirement

The public site is not a temporary landing page. It is a launch-quality, content-complete, premium editorial experience that introduces the game, demonstrates the loop, explains play, converts visitors into room creation, and establishes a distinct visual identity.

## Reference interpretation

Use the supplied premium Framer reference only for quality attributes:

- oversized expressive typography;
- editorial black-and-white composition;
- smooth and deliberate scroll effects;
- strong spacing rhythm;
- horizontal tickers and structured sections;
- rich but controlled interaction;
- complete desktop/tablet/mobile execution.

Do not copy its agency information architecture. Do not copy assets, exact composition, source code, custom cursor, text, or section sequence.

## Public routes

### `/`

Final home page.

Sections:

1. **Navigation**
   - Logo/wordmark.
   - How to play.
   - Cases.
   - Create room.
   - Sound preference.
   - Accessible mobile menu.

2. **Hero — “Keep your story straight”**
   - Oversized Arabic title.
   - Original animated evidence-board composition.
   - Immediate `Create a room` and `Join a room`.
   - 4–6 players / phones only / no download.
   - No fake gameplay footage.

3. **Interrogation ticker**
   - Redacted phrases, contradictions, timestamps, player names from synthetic examples.
   - Motion pauses for reduced-motion and hover/focus.

4. **Core loop scroll story**
   - “Agree.”
   - “Separate.”
   - “Contradict.”
   - “Patch.”
   - “Face the evidence.”
   - Phone mockups are live UI compositions, not static screenshots where feasible.

5. **The contradiction moment**
   - Interactive before/after example.
   - Shows exactly why the engine flags a conflict.

6. **Patching has a price**
   - Three patch cards.
   - Each visually spawns a new commitment thread.

7. **First case**
   - Missing Payroll Envelope.
   - Premise, player count, duration, complexity.
   - No spoilers beyond public case pitch.

8. **Results that remember the room**
   - Consistency, Plausibility, Stability, Evasion.
   - Synthetic recap: “The charger explanation saved two conflicts and created three more.”

9. **How it plays**
   - 3-step quick explanation.
   - Link to full page.

10. **Built for the room**
    - No account.
    - No TV.
    - No installation.
    - Everyone stays in.
    - Reconnect support.

11. **FAQ**
    - Required player count.
    - Whether talking is allowed.
    - Remote play.
    - Data/privacy.
    - Supported devices.
    - More cases.

12. **Final CTA**
    - Create room.
    - Join existing room.
    - Dramatic but usable.

13. **Footer**
    - Privacy, terms, accessibility contact placeholder, version/build, back to top.

### `/how-to-play`

- Rules in under 60 seconds.
- Full phase walkthrough.
- Screen etiquette.
- Contradiction and patch example.
- Reconnect behavior.
- Accessibility.
- CTA.

### `/cases`

- Case library layout designed for future growth.
- Only first playable case marked “Available.”
- Future case concepts may be shown only as explicitly “In development,” not as playable.
- Filtering UI must not be fake; omit filters until useful.

### `/play`

Join flow:

- room code;
- name;
- validation;
- preserved input on errors;
- privacy statement;
- direct link query support.

### `/create`

- one decisive create action;
- case selection showing only valid available content;
- room settings limited to meaningful first-build options: sound default, motion default, optional extended planning;
- creator joins as normal player.

### `/room/[code]`

Single responsive game shell. Routes/phases render from authoritative server view. No TV-specific page.

### `/privacy` and `/terms`

Honest, concise, launch-ready structure with clearly marked owner/legal contact placeholders. Do not fabricate a company.

### Error routes

- 404 with join/create recovery.
- expired room.
- room full.
- room already started.
- server unavailable.
- browser unsupported.

## Search and sharing

- Arabic title and description metadata.
- OpenGraph composition generated from original brand graphics.
- Twitter/X card.
- canonical URLs.
- robots and sitemap.
- structured data only where valid.
- favicon, manifest, theme color.
- no keyword stuffing.

## Conversion rules

- Primary action is always either Create or Join.
- Do not add newsletter, pricing, testimonials, awards, client logos, or contact forms without real business need.
- Do not fake social proof.
- Marketing site must demonstrate the product rather than imitate an agency site.

## Completion criteria

- Every route has final copy.
- No Lorem Ipsum.
- No placeholder rectangles presented as final assets.
- No dead links.
- No horizontal overflow at 320px.
- Navigation and game actions are keyboard accessible.
- Lighthouse targets in `ACCEPTANCE_TESTS.md`.
- Core animation degrades gracefully.
- All public content works with JavaScript errors where reasonable, except game realtime interaction.
