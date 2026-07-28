# Third-party UI provenance

No component registry or third-party UI library was installed or copied into the
application. The final identity and interaction system is original, RTL-aware,
keyboard operable, and implemented against the project’s existing React and CSS
stack.

| Pattern | Technique used | Implemented in | Provenance |
|---|---|---|---|
| Revision wordmark | Original aligned-line, displaced-clause, and insertion-caret SVG paths | `components/Wordmark.tsx` | Original code and artwork |
| Testimony ticker | CSS transform animation with hover/focus pause and reduced-motion fallback | `components/Ticker.tsx` | Original code |
| Six-stage gallery rail | One scroll-progress source, sticky desktop track, ordered static mobile flow | `components/GalleryRail.tsx` + `marketing.css` | Original code |
| Versioned Testimony hero | Semantic `del`/`ins`, a native range input, and original CSS revision geometry | `components/TestimonyEditor.tsx` | Original code and artwork |
| Pointer contradiction reveal | Pointer coordinates exposed as CSS variables plus an explicit keyboard control | `components/ContradictionDemo.tsx` | Original code |
| Accessible mobile navigation | Native button with `aria-expanded`, `aria-controls`, and visible focus | `components/SiteNav.tsx` | Original code |
| Verdict axes | Semantic result rows and CSS progress geometry | `components/RoomShell.tsx` | Original code |

The only bundled font is IBM Plex Sans Arabic through `next/font/google`; it is
licensed under the SIL Open Font License 1.1. Codes and timestamps use the system
monospace stack. No icon font, stock illustration, generated image, or copied
template asset ships with the release candidate.
