# Latest implementation principles

**Status:** implementation brief for the current steering, 2026-07-28
**Supersedes:** every recommendation in this research folder that proposes an Alibi Table, circular player-seat diagram, round-table mark, orbiting seats, or a centre-out red-thread composition.

The selected direction remains **light editorial**, but the table/circle concept is fully rejected. “Nudge-level polish” means comparable intentionality, responsive care, and finish—not a copy of Nudge’s composition, assets, palette, selection handles, icon language, or portfolio conventions.

## 1. Hero: use a statement-revision window

Use the **Editor / Statement Revision** direction as the starting object, then simplify it into a credible product surface.

- Show one large rectangular window containing an agreed Arabic statement and a single changed clause or detail.
- Pair the change with a short written causal explanation. Do not depend on colour, motion, or a cursor to explain the contradiction.
- Represent 4–6 players, if needed, as a compact linear roster or presence row—not as seats, a ring, an ellipse, or objects orbiting a centre.
- Use synthetic marketing content only. Never expose or imply synchronization of private evidence or private answers through public room state.
- Keep both primary routes visible: create a game and join by code.
- The visual must resemble an actual representative game state, not analytics, a project-management timeline, a speculative feature, or a decorative collage.

The current Editor capture has the best foundation because it explains the product in one glance. Its next pass should reduce floating annotations, enlarge the main changed phrase, and remove any marks that do not help the cause-and-effect reading.

Reject the other two explored objects:

- **Timeline:** reads as analytics or project planning, compresses Arabic into narrow rows, and makes timestamps more prominent than the social deduction mechanic.
- **Relay / tilted phones:** recreates a floating collage, obscures the headline, exaggerates depth, and suggests private screens are publicly assembled.

### Desktop composition

- Use a deliberate split: concise proposition and CTAs on one side; one product object occupying roughly half the stage on the other.
- Keep the warm paper ground and a quiet alignment grid or ruler motif, but use it as structure rather than decoration.
- Let the product object be the dominant visual. Avoid a huge empty canvas with several tiny stickers competing for attention.
- Maintain consistent one-pixel rules, a coherent corner system, exact baselines, and intentional optical spacing.

### Phone recomposition

- Recompose into a vertical sequence: identity/proposition, primary actions, then one full-width readable product preview.
- Do not scale the desktop collage down. Remove secondary labels before shrinking essential UI.
- Keep a primary CTA and the join route discoverable in the first viewport at 390 × 844; verify 320, 360, 390, and 430 px separately.
- Preserve normal document scrolling, safe-area clearance, 44 px targets, visible focus, and no sticky trap.

## 2. Translate the references, do not imitate them

### Nudge

Direct inspection: [Nudge](https://nudge-folio.framer.website/), plus the checked-in 1440 × 900 and 390 × 844 captures.

Use:

- one unmistakable signature type moment;
- purposeful alignment aids and crisp boundary lines;
- restrained but specific micro-details;
- a concise hero and decisive CTA hierarchy;
- true mobile recomposition with reordered and removed material, not a miniature desktop;
- enough visual variation that each section has a distinct silhouette.

Do not copy:

- the Nudge wordmark treatment, selection box/handles, colour accents, stickers, custom icons, cursor language, or exact grid;
- Latin all-caps spacing on Arabic;
- portfolio availability copy or portfolio information architecture.

The quality bar is systematic: every edge, icon, active state, line break, focus state, and responsive transition must look deliberately resolved.

### Fabrica and Agenciy

Direct inspection: [Fabrica](https://fabrica.framer.media/) and [Agenciy](https://agenciy.framer.website/).

Use their strongest complete-site lessons:

- one clear job and one dominant geometry per section;
- media large enough to be understood;
- intentional changes in density between sections;
- a finished navigation, footer, legal surface, and conversion path.

Reject the agency-template residue: service grids, fake client logos, awards, teams, invented metrics, testimonials, repeated tickers, and oversized English letter spacing.

### Awwwards

The accessible reference was [“Drag to Open Suitcase”](https://www.awwwards.com/inspiration/drag-to-open-suitcase-the-best-you-by-klook), which documents separate desktop/mobile treatments, a quiz, draggable cards, and WebGL/3D.

Use only the principle of one coherent narrative object with a responsive reinterpretation. Do not add drag-only control, WebGL, 3D spectacle, or interaction whose visual novelty outranks the game proposition. Any gesture must have tap and keyboard equivalents.

### Mobbin

[Mobbin MCP](https://mobbin.com/mcp) exposes its method publicly, but the actual screen library was paid-gated in this pass. No specific Mobbin screen is cited.

The applicable method is to review complete mobile state sequences rather than isolated pretty screens. Treat create, join, lobby, game phase, reconnect, error, and result as a connected app flow:

- one primary action per state;
- clear cold-start, retry, loading, locked/accepted, empty, and disconnected states;
- room codes and timers isolated LTR inside the Arabic RTL shell;
- a stable phase shell so headings, timer, status, and bottom action area do not jump;
- result summary first, causal explanation second, replay/exit actions last.

### NameThatUI

[NameThatUI](https://namethatui.com/) is useful as a naming and acceptance-test vocabulary. Use the exact component terms in implementation and test descriptions:

- **Form Field** for labeled create/join inputs, help, validation, and error association.
- **Focus Ring** for visible keyboard focus.
- **Progress Bar**, **Progress Ring**, or **Spinner** according to determinate, compact, or indeterminate progress—do not use them interchangeably.
- **Skeleton** only for content whose final geometry is known; **Spinner** for short indeterminate actions.
- **Toast (Snackbar)** only for transient non-blocking confirmation; persistent or blocking errors belong inline.
- **Empty State** with the cause and available next action.
- **Sticky** versus **Fixed** chosen intentionally; neither may cover the phone action area.
- **Toggle Group / Segmented Control** only for a small mutually exclusive choice set.
- **Carousel** only when sequence is meaningful and all controls/status remain accessible.

### Cosmos and Pinterest

[Cosmos](https://www.cosmos.so/) makes provenance, source/story attribution, visual-similarity search, colour search, and AI-content filtering explicit. Apply that as an asset-selection rule: record origin and licence, reject unattributed imagery, and favour original SVG/CSS or real product UI.

Pinterest was inaccessible in this research pass; it contributes no verified visual finding and must not be used to justify an implementation choice.

## 3. Arabic composition

Use the existing typography decision:

- Alexandria 600 for the wordmark and restrained public display headings.
- IBM Plex Sans Arabic 400–700 for body copy, forms, game prompts, buttons, errors, and legal text.
- Keep the display ceiling near 72 px desktop and 48 px phone; use 24–36 px for product headings and at least 16 px for routine phone text.
- Do not use negative letter spacing on Arabic, rotate Arabic copy, or force Latin-style tracking. Create personality with weight, measured scale, line breaks, rules, frames, and surrounding alignment—not by breaking connected glyph shaping.
- Keep supporting copy readable rather than “editorial microtype.”
- Test intentional headline breaks at 320, 360, 390, and 430 px.
- Give room codes and timers tabular/monospace figures with explicit `dir="ltr"`; keep Arabic content `dir="rtl"`.

## 4. Motion and the available animation-pack evidence

No animation PDF was present in the repository or supplied attachment directory. The only verifiable animation-pack evidence is the owner-provided excerpt in the attached request. Treat it as the constraint source and do not claim the missing PDF was reviewed.

For the hero:

1. the agreed statement settles;
2. one clause changes or is marked;
3. the written contradiction explanation appears;
4. the object rests.

There is no table alignment, seat orbit, centre-out thread, or infinite loop. The sequence must remain understandable when paused and when motion is disabled.

Global rules from the available excerpt:

- motion must guide attention, communicate state, or preserve continuity;
- use one focal movement per section and smooth ease-out;
- scroll-linked effects may lag slightly but must preserve native scroll;
- centralize duration, easing, distance, scale, and spring tokens;
- support touch, responsive recalculation, and `prefers-reduced-motion`;
- avoid `transition: all`, `will-change: all`, infinite decorative motion, repeated fade-ups, layout animation, scroll hijacking, CTA delays, hydration-unsafe initial states, and leaked animation frames;
- preload required assets and clean up listeners/animation frames.

Use the excerpt’s **Gallery Rail** pattern only for the desktop how-to sequence: one sticky stage, actual representative screens, one master progress value, synchronized supporting rail, controlled duration, and no large empty scroll. On phone, replace it with a native vertical walkthrough using real readable previews.

Use **Cursor Reveal** only for the contradiction explainer, and only if before/after layers align exactly. Provide touch control, controlled linger/dissolve, a static reduced-motion state, a written explanation, and an accessible alternative. Prefer aligned UI or SVG; do not reveal between mismatched screenshots.

## 5. Evidence required before acceptance

Visual polish is not established by implementation or static code review. Require fresh evidence:

- inspected before/after screenshots at 1440 × 900 and 390 × 844, plus phone checks at 320, 360, and 430 px;
- the full 4/5/6-browser multiplayer matrix and actual representative create, join, lobby, phase, reconnect/error, and result states;
- normal-motion capture plus reduced-motion evidence;
- keyboard, focus, 44 px target, heading-order, contrast, bidi, overflow, safe-area, and non-colour meaning checks;
- secrecy/adversarial tests proving public DTOs never receive private evidence or answers;
- fresh performance evidence from the production build;
- an asset provenance record for every external visual;
- an updated acceptance record that distinguishes measured facts from human fun/fairness findings still awaiting playtest.

Score each inspected surface against five questions:

1. Is the proposition and primary action obvious without explanation?
2. Does one dominant object explain the real product rather than decorate it?
3. Does the Arabic composition feel authored rather than translated from a Latin layout?
4. Is the phone layout genuinely recomposed?
5. Are motion, focus, errors, and privacy behavior still truthful when reduced, interrupted, or adversarial?

No reference score or screenshot can substitute for preserved authoritative multiplayer behavior. The visual rebuild must not move phase control, deadline acceptance, contradiction computation, private selection, or result publication out of the server.
