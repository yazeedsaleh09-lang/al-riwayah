# Arabic typography audition

Date: 2026-07-28

## Method

The four candidates were rendered in-browser with the same real product phrases,
not alphabet specimens:

- wordmark;
- homepage promise;
- Saudi conversational support copy;
- timed question;
- answer choices and primary action;
- timer and LTR room code;
- long privacy copy;
- Arabic and Latin numerals in the same line.

Evidence:

- `typography-audition.html`
- `../../artifacts/publishable-design-v3/research/arabic-typography-desktop.png`
- `../../artifacts/publishable-design-v3/research/arabic-typography-mobile.png`

The rendered evidence was inspected at 1440px and 390px.

## Findings

| Family | What works | What fails | Best role |
|---|---|---|---|
| IBM Plex Sans Arabic | Best compact legibility at 390px; calm Saudi conversational text; clear controls; comfortable legal copy | A single-family system feels neutral and repeats the rejected “typography is the composition” problem when enlarged | Body, product UI, forms, game prompts |
| Readex Pro | Friendly, social, immediately less forensic; strong button labels | Large text becomes wide and wraps a full line earlier; rounded forms soften the thriller tension too much | Optional campaign accent, not the core system |
| Noto Kufi Arabic | Excellent structural rhythm and unmistakable utility | Dense at phone size; reads institutional/technical; weak for conversational copy and emotional results | Short metadata only; rejected for shipped UI |
| Alexandria | Confident contemporary display voice; geometric tension; recognizable wordmark shape; good mixed-weight hierarchy | Too dense for long body copy; must stay out of legal text, helpers, and timed option labels | Display headings and custom wordmark |

## Selection

Use **Alexandria 600** for the wordmark and restrained public display headings,
paired with **IBM Plex Sans Arabic 400–700** for body, forms, game prompts, buttons,
errors, and legal copy.

Why:

- Alexandria supplies a distinct social-game identity without turning the whole
  page into a typographic poster.
- IBM Plex Sans Arabic remains the clearest and most space-efficient choice in the
  timed mobile product at 320–430px.
- The pair creates a real role contrast: geometric display versus humanist task UI.
- The room code and timer remain in a separate system monospace with tabular
  figures and explicit LTR isolation.

## Constraints carried into production

- Display ceiling: 72px desktop and 48px phone; most product headings stay 24–36px.
- Routine mobile text stays at least 16px.
- No negative letter-spacing on Arabic.
- Supporting copy never becomes decorative micro text.
- Deliberate line breaks are tested at 320, 360, 390, and 430px.
- Alexandria is not used in buttons, inputs, timers, legal copy, or changing game
  state.
