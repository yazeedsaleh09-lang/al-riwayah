# AL RIWAYAH — Final visual audit

Date: 2026-07-27
Reference: Fabrica live preview, used only as a quality and interaction benchmark.

## Evidence inspected

- Live Fabrica desktop and mobile behavior at `https://fabrica.framer.media/`.
- Current AL RIWAYAH home and create-room routes from the existing local build.
- Existing marketing, game-shell, legal, error, reconnect, and room-entry source.
- UI UX Pro Max, Impeccable, frontend-design, Emil design engineering, project motion,
  accessibility, mobile-game, deployment, and design-system guidance.
- Existing Stitch brief, reference analysis, generated-asset log, and execution pack.

Baseline screenshots:

- `artifacts/final-visual-pass/before/home-1280.png`
- `artifacts/final-visual-pass/before/create-1280.png`

## Fabrica quality principles to translate

Fabrica earns confidence through scale, pacing, and restraint rather than decoration:

- A compact fixed navigation with clear hover movement and no visual clutter.
- One dominant typographic or image idea per viewport.
- Large type with short line lengths and decisive line breaks.
- Wide breathing room between narrative beats, then dense interaction inside a beat.
- Monochrome control with contrast created by scale, crop, and surface inversion.
- Rounded media frames used as containers, not repeated SaaS cards.
- Sticky and scroll-linked behavior only where it changes the reading hierarchy.
- A brief first-load transition, followed by immediate access to the page.
- Mobile recomposes the hierarchy instead of shrinking the desktop layout.
- Motion is sparse, interruptible, and tied to entry, navigation, or state.

## Current product audit

| Area                     | Current problem                                                                                                             | Required correction                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Typography               | System Segoe/Tahoma fallback makes Arabic feel generic; headings are heavy but not composed.                                | Load purpose-built Arabic families, establish a confident display scale, and control line breaks/measure per viewport.                          |
| Color                    | Beige paper plus red is the rejected AI-editorial default. Red appears as both decoration and state.                        | Move to true monochrome surfaces with one cold forensic cobalt reserved for action, connection, and contradiction.                              |
| Layout                   | Most routes use one centered reading column; forms and legal pages feel like unfinished utilities.                          | Use asymmetrical editorial grids on public pages, task-focused split layouts on forms, and indexed side rails on legal pages.                   |
| Components               | Repeated bordered cards flatten hierarchy and make the site feel templated.                                                 | Replace generic cards with ruled rows, full-bleed bands, evidence frames, and state-specific surfaces.                                          |
| Home                     | The evidence-board hero is visually small beside the headline; every later section has nearly the same cadence.             | Make the shared statement itself the hero visual, vary section density, and give each section one focal motion.                                 |
| Navigation               | Functional but visually conventional; mobile menu opens as a plain list.                                                    | Use a compact fixed rail, animated line menu, full-height mobile sheet, and strong current-action hierarchy.                                    |
| How to play              | Long numbered list reads like documentation.                                                                                | Convert to a 60-second opening, sticky three-act walkthrough, a worked contradiction, and clear room etiquette.                                 |
| Cases                    | Three equal cards imply equal availability.                                                                                 | Give the playable case dominant scale; treat future concepts as restrained index rows.                                                          |
| Create/join              | Centered form card has no narrative or system-status confidence.                                                            | Use a task surface with live connection preparation, explicit wake-up progress, and a visible recovery path.                                    |
| Game shell               | Usable but visually inherits the paper/red marketing system.                                                                | Reframe as a black/white/cobalt interrogation console with thumb-reachable actions and state-specific contrast.                                 |
| Legal                    | Narrow centered column and repeated headings create the awkward legal layout called out by the owner.                       | Use a left-aligned RTL reading column with persistent index/metadata rail and measured paragraphs.                                              |
| Loading/reconnect        | Generic text and immediate hard failure undermine trust.                                                                    | Show staged server wake-up, connection, restore, and retry states without blocking or fabricating progress.                                     |
| Motion                   | Entrance keyframes repeat across unrelated elements; no coherent route/state language.                                      | Use central durations/easing, clip reveals for brand surfaces, 150–240ms state transitions in product UI, and reduced-motion fallbacks.         |
| Production room creation | Client times out after 6 seconds and the documented production host currently returns Render `x-render-routing: no-server`. | Warm the health endpoint, wait for a confirmed socket, retry within a bounded 75-second wake window, and surface deploy-host absence precisely. |

## Revised physical scene

Four to six friends are together late at night. The room is dim, their phones are
the only bright objects, and one shared statement is beginning to split into mutually
exclusive versions. This requires a dark, high-contrast product shell and a crisp,
monochrome public site—not parchment, nostalgia, or crime clichés.

## Revised system

### Voice

Three words: **forensic, social, uncompromising**.

Visible Arabic stays conversational and Saudi-friendly: short verbs, direct guidance,
no formal filler, and no melodramatic detective language.

### Color

- `Signal Black` — `#050505`
- `Carbon` — `#111214`
- `True White` — `#F7F7F5`
- `Steel` — `#9A9CA1`
- `Rule` — `#D7D8DA` on light / `#2B2D31` on dark
- `Forensic Cobalt` — `#2855FF`

Cobalt is functional: primary action, connection, selected answer, active evidence
link, and contradiction. It is never a decorative wash.

### Typography

- Display: Alexandria variable, 650–800 weight.
- Body/UI: Noto Sans Arabic variable, 400–700 weight.
- Codes/timestamps: system monospace with tabular figures.
- Marketing display ceiling: 96px, fluid below desktop.
- Product prompt: fixed responsive steps, 28–40px.
- Arabic letter spacing remains normal; Latin codes may use controlled tracking.

### Spacing and geometry

- Primitive scale: 4, 8, 12, 16, 24, 32, 48, 72, 96, 144.
- Public max width: 1440px with 16–48px adaptive gutters.
- Reading measure: 44–68ch depending on text type.
- Surfaces use 0, 8, or 16px radii; pills only for compact status.
- Rules and surface inversion provide structure; shadows are reserved for overlays.

### Motion

- `fast`: 120ms
- `control`: 180ms
- `panel`: 280ms
- `reveal`: 640ms
- `ease-out`: `cubic-bezier(.16, 1, .3, 1)`
- `ease-in-out`: `cubic-bezier(.76, 0, .24, 1)`

Marketing uses one reveal per section: headline clip, testimony marquee, sticky story
progress, contradiction line, or result-bar build. Game UI uses motion only for phase,
selection, connection, lock, evidence, contradiction, and verdict state.

### Signature

The memorable element is the **fracture line**: one shared horizontal statement that
splits into two offset testimony tracks as the story progresses. It appears in the
home hero, contradiction explanation, loading/wake state, and results timeline without
becoming decorative wallpaper.

## Responsive rules

- 320–430: single focal column, 16px gutter, no side-by-side decisions, 48px controls.
- 768: split editorial bands where meaning benefits; game remains phone-width.
- 1280–1440: asymmetric 12-column layouts and deliberate empty counter-space.
- No horizontal overflow, no clipped Arabic, and no fixed action under browser chrome.
- Mobile is composed independently; desktop effects are removed when they do not help.
