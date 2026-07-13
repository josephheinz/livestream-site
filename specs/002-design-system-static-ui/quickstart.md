# Quickstart & Validation: Design System & Static UI

How to run the shells and verify the feature. No backend/env setup is needed — every route renders
from static mock data.

## Prerequisites

- Node + pnpm (repo already bootstrapped).
- New dependency added by this feature: `motion` (Framer Motion).
- New dev deps: `jsdom`, `@testing-library/react`, `@testing-library/dom`,
  `@testing-library/jest-dom`, `@vitejs/plugin-react`.

## Install & run

```bash
pnpm add motion
pnpm add -D jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @vitejs/plugin-react
pnpm dev            # Next.js dev server
```

Open:
- `http://localhost:3000/` — Watch (off-air, signed-out chat by default)
- `http://localhost:3000/?live=1&chat=signedin` — Watch live, signed-in chat
- `http://localhost:3000/?chat=banned` — Watch, banned chat notice
- `http://localhost:3000/dashboard` and `.../dashboard?live=1`
- `http://localhost:3000/design-system` — token/type/component reference gallery

## Automated tests

```bash
pnpm test           # vitest: edge-runtime (convex) + jsdom (components/app) projects
```

Test coverage proves (black-box, through props/query params):
- Button variants render with hover-lift + square-corner classes.
- StatusIndicator: live blinks, all kinds are square, reduced-motion → static.
- Theme cycle `auto→light→dark→auto`; `.dark` class toggles; `auto` follows mocked `matchMedia`.
- Motion primitives render static when `useReducedMotion()` is mocked true.
- Watch: `?live=1` → live visuals; `?chat=banned` → ban notice, no composer; unknown param → default.
- Dashboard: stat cards render; add/toggle/remove connection updates the list; keys never shown raw;
  unban removes a row; empty states appear.
- No route issues a network request (fetch spy asserts zero calls) — SC-005.

## Manual validation checklist (maps to Success Criteria)

- **SC-001 (fidelity)**: Compare `/`, `/dashboard`, `/design-system` against
  `docs/livestream-site-design-brief/project/*.dc.html` in both light and dark — layout, color,
  type, 2px/1px borders, 4px/3px hard shadows, square corners, spacing all match.
- **SC-002 (states reachable)**: All state URLs above render; auth modal opens/switches/closes;
  connections/bans empty states reachable by removing all rows.
- **SC-003 (theme)**: `THEME:AUTO` matches OS on first load; cycling recolors the entire page.
- **SC-004 (responsive)**: At ~375px width, Watch player/chat stack vertically and the Dashboard
  grids collapse; no horizontal scroll of the page frame.
- **SC-005 (no network)**: DevTools Network shows no stream/chat/auth/dashboard data requests.
- **SC-006 (reference page)**: `/design-system` shows every token, type sample, button, form, card,
  and status indicator.
- **FR-023 (reduced motion)**: With OS "reduce motion" on, blink/pulse/ticker are static.
