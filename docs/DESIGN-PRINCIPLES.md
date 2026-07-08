# Design Principles

## Source of truth

Visual designs live in `docs/livestream-site-design-brief/` (Claude Design handoff).
The primary design is `project/Livestream Site v2.dc.html` — match it pixel-perfectly;
recreate the visual output in React/Tailwind, don't copy the prototype's internal structure.

## Audience

General public. Viewers arrive to watch a stream — many for the first time, on any
device, with any level of technical literacy. **Optimize for the first-time viewer
finding and playing a stream with zero friction.**

## Design goals

- **Video-first.** The stream is the product. Everything else (nav, chat, schedule) supports it, never competes with it.
- **Fast.** Time-to-playing-video is the metric that matters. Minimal JS before the player, no layout shift.
- **Discoverable, not memorized.** A first-time visitor finds the live stream or an archived one without instructions.

## Considerations

- **Responsive.** Phones, tablets, TVs-via-browser, desktop — all first-class.
- **Accessibility.** WCAG AA contrast, keyboard-operable player controls, captions supported.

## What we are NOT optimizing for

- Power-user dashboards or heavy customization. Sensible defaults, few settings.
