# AL RIWAYAH — The Statement

Arabic title: **الرواية**  
Internal identifier: `al-riwayah`  
Product type: mobile-first local multiplayer party game + complete marketing website  
Gameplay devices: **players' phones only; no television required**  
Supported players: **4–6**  
Target session: **13–18 minutes**
Primary language: **Arabic, RTL, Saudi-friendly conversational copy**  
Secondary language readiness: English architecture, optional later localization


## Art direction

**Editorial interrogation dossier.**

The site and game combine:

- warm off-white paper;
- near-black ink;
- sharp evidence red;
- muted metal gray;
- thin rules, stamps, redactions, timestamps, and evidence threads;
- high-contrast Arabic display typography;
- controlled cinematic motion.

Avoid horror clichés, neon cyber dashboards, police-stock photography, fingerprints everywhere, generic gradients, glassmorphism, SaaS cards, or AI-generated detective imagery.

## Visual tokens

Proposed tokens; Claude may tune values while preserving roles.

```css
--ink-950: #0B0B0A;
--paper-50: #F3F0E8;
--paper-100: #E8E3D8;
--evidence-600: #B61F2B;
--evidence-700: #8F1420;
--metal-500: #77756F;
--success-600: #256B4B;
--warning-600: #9A6317;
--focus: #1F65D6;
```

Minimum body contrast: WCAG AA. Large display text may use less contrast only when duplicated accessibly.

## Typography

Use only open-source or already licensed fonts.

Recommended Arabic families to evaluate:

- IBM Plex Sans Arabic for UI/body.
- Noto Kufi Arabic or Alexandria for display.
- A monospaced system font for timestamps/room codes.

Do not package font files in the execution pack. Load with privacy/performance-conscious strategy or self-host only when licensing permits.

Type behavior:

- Mobile body: 16–18px.
- Timed prompt: minimum 20px.
- Touch action label: 18px minimum.
- Desktop hero: fluid `clamp()` with controlled line breaks.
- Arabic line height: 1.35–1.6 depending on size.
- Do not letter-space Arabic words.

## Layout

Base spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96.

- Marketing max content width: 1440px.
- Reading column: 680–760px.
- Game shell: full-height mobile with safe area.
- Game prompt occupies top 45–60%.
- Actions remain reachable near bottom.
- One primary action per screen.
- Use bottom safe-area padding.

## Components

Required:

- `Wordmark`
- `PrimaryNav`
- `MobileNav`
- `EvidenceThread`
- `RedactionText`
- `RoomCode`
- `PlayerRoster`
- `ConnectionBadge`
- `ReadyToggle`
- `CaseCard`
- `PrivateEvidenceCard`
- `StoryFactCard`
- `LocationMap`
- `QuestionCard`
- `AnswerOption`
- `AnswerLockedState`
- `DeadlineRing`
- `ContradictionReveal`
- `PatchCard`
- `NewCommitmentChip`
- `ScoreAxis`
- `VerdictCard`
- `ResultTimeline`
- `ReconnectOverlay`
- `ErrorPanel`
- `MuteControl`
- `MotionPreferenceControl`

## Motion principles

Motion communicates state and causality.

### Website

- Hero evidence layers enter in a deliberate sequence.
- Scroll story uses pinned sections only when it remains usable on touch and reduced-motion.
- Redaction bars reveal words without making text unreadable.
- Tickers pause on interaction.
- Case cards use restrained depth/tilt only on pointer devices.

### Game

- Phase change: 250–450ms.
- Question appearance: immediate with 120–220ms settle.
- Final five seconds: visual rhythm and optional haptic; never flashing.
- Locked answer: physical “stamp” response.
- Contradiction reveal:
  1. freeze;
  2. show statement A;
  3. show statement B;
  4. draw conflict line;
  5. state the rule in one sentence.
- Patch selection draws new commitment chips from the patch card.
- Verdict build is skippable and reduced-motion compatible.

### Reduced motion

- No pinned parallax.
- No continuous tickers.
- No shaking.
- Instant or opacity-only phase transitions.
- Contradiction explanation remains fully legible.
- Preference follows OS and has an in-product override.

## Sound and haptics

Original or correctly licensed only.

Sound groups:

- room join;
- ready;
- phase lock;
- deadline warning;
- contradiction strike;
- patch acceptance;
- evidence arrival;
- verdict reveal.

Requirements:

- mute always available;
- no autoplay audio before user gesture;
- sound never carries exclusive information;
- haptics use `navigator.vibrate` only where supported and respectful;
- reduced sensory mode disables aggressive cues.

## Responsive coverage

### 320px

- No side-by-side choices.
- Room code wraps safely.
- Long Arabic names truncate with accessible full label.
- Fixed bottom controls respect browser chrome.

### 360px / 390px

Primary game targets.

### Tablet

Game content remains phone-like and centered; do not stretch prompts across full width.

### Desktop/laptop

Marketing uses full editorial composition. Game route provides a centered mobile interaction frame without pretending to be a TV client.

### 1080p / 4K

Marketing images and SVG remain crisp. Game remains constrained for readability.

## Accessibility

- 44×44 touch minimum.
- Visible focus.
- Semantic buttons and forms.
- `aria-live` for connection and phase changes, not every timer tick.
- Timer has text alternative.
- Contradiction uses labels and text, not red color alone.
- Public site supports keyboard.
- Answer selection announces locked state.
- Screen reader never exposes other players' private payload.
- Arabic direction applied at document and component boundaries.

## Visual prohibitions

- No copied Framer assets or exact layout.
- No stock police tape as primary identity.
- No AI portraits.
- No fake device screenshots.
- No excessive blur/glow.
- No tiny metadata.
- No animated background that competes with questions.
- No full-screen loader longer than necessary.

## Implemented motion language

- Marketing hero copy enters in a short staged editorial sequence.
- Evidence cards arrive with a restrained clip reveal; board threads draw toward the
  relevant item instead of decorating continuously.
- A locked option confirms with one compact state transition.
- Deadline pressure remains subtle and never obscures text or blocks input.
- Contradiction, evidence, verdict, and result phases each receive one semantic reveal.
- `prefers-reduced-motion: reduce` disables nonessential transitions and scrolling;
  haptics are skipped with it. Sound remains muted unless the player enables it.
