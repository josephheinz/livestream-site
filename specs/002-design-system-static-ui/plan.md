# Implementation Plan: Design System & Static UI

**Branch**: `feature/002-design-system-static-ui` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-design-system-static-ui/spec.md`

## Summary

Turn the exported "softened neobrutalism" prototypes into a real, reusable design system and the
static presentational shells of the livestream site. The token layer, fonts, square-corner/shadow
rules, and base shadcn primitives already exist in `app/globals.css` and `app/layout.tsx`; this
feature adds the missing three-way theme control (auto/light/dark), the neobrutalism component
variants, the Watch (`/`) and Dashboard (`/dashboard`) route shells, the shared chrome (banner,
ticker, footer, auth modal), and a design-system reference page. All screens render from static
mock data — no Convex, Clerk, streaming, or persistence. Content-varying states (live/off-air,
chat signed-in/out/banned) are selected via URL query params. **Animations use Framer Motion (the
`motion` package)** with `prefers-reduced-motion` honored via `MotionConfig reducedMotion="user"`
and `useReducedMotion()`.

## Technical Context

**Language/Version**: TypeScript 5, React 19.2, Next.js 16.1 (App Router, RSC)

**Primary Dependencies**: Tailwind CSS v4, shadcn/ui (radix-ui, class-variance-authority, clsx,
tailwind-merge), lucide-react, **`motion` (Framer Motion) — NEW**. `next/font/google` for Archivo
Black / Space Grotesk / Space Mono (already wired).

**Storage**: N/A — static mock data only (no Convex reads/writes in this feature).

**Testing**: Vitest. Existing config targets `edge-runtime` for Convex tests. This feature adds a
second Vitest project using `jsdom` + `@testing-library/react` + `@testing-library/jest-dom` for
component/route render tests (NEW dev deps), so the edge-runtime Convex project is untouched.

**Target Platform**: Modern evergreen browsers, desktop + mobile web.

**Project Type**: Web application (Next.js App Router frontend; no new backend surface).

**Performance Goals**: Static render; no data fetch on any of these routes (SC-005). Smooth 60fps
for the ticker/blink/pulse where motion is enabled.

**Constraints**: 0px border-radius everywhere; 2px container / 1px row+input borders; hard offset
shadows (4px cards, 3px buttons, no blur); hover = translate(-1px,-1px); square status indicators;
must honor `prefers-reduced-motion`; no horizontal page-frame overflow at mobile widths.

**Scale/Scope**: 3 routes (`/`, `/dashboard`, `/design-system`), ~4 shared-chrome components,
~6 UI primitives (some extending existing shadcn), ~7 screen-section components, 1 mock-data module,
1 theme controller, 1 motion layer.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Test-First, Black-Box (NON-NEGOTIABLE)** — Applies to this UI feature. Each component and
route is tested through its declared interface: component tests render with props/variants and
assert on output (roles, text, data-state), and route tests assert query-param → state selection
and the "no network request" guarantee. Tests are written and observed failing before
implementation. No test reaches past a component's props into internals. **PASS** (with the jsdom
test project added in Phase 1 so React components are testable).

**II. Simplicity** — One deliberate deviation: **Framer Motion is introduced for animations the
prototype achieves with ~10 lines of CSS keyframes** (`blink`, `pulse`, ticker `translateX`).
This is an explicit user request, not a technical necessity. Recorded in Complexity Tracking below;
all other choices take the smallest change (extend existing globals.css/shadcn rather than replace,
custom ~40-line theme controller instead of a new theming dependency).

**Gate result**: PASS — the single Simplicity deviation is justified and tracked.

## Project Structure

### Documentation (this feature)

```text
specs/002-design-system-static-ui/
├── plan.md              # This file
├── spec.md              # Feature spec (input)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (display/mock entities)
├── quickstart.md        # Phase 1 output (how to run & validate)
├── contracts/
│   └── components.md     # Phase 1 output (component prop + query-param contracts)
└── checklists/
    └── requirements.md   # Spec quality checklist (from /speckit-specify)
```

### Source Code (repository root)

```text
app/
├── globals.css                 # EXTEND: add ticker keyframe; keep token/shadow/blink/pulse layer
├── layout.tsx                  # EXTEND: mount ThemeProvider + MotionConfig (reducedMotion="user")
├── page.tsx                    # REPLACE template Home → Watch screen (route "/")
├── dashboard/
│   └── page.tsx                # NEW: Dashboard screen (route "/dashboard")
└── design-system/
    └── page.tsx                # NEW: design-system reference page (FR-011)

components/
├── ui/                         # shadcn primitives
│   ├── button.tsx              # EXTEND: neobrutalism variants (cta/accent/solid/outline + mono toggle)
│   ├── card.tsx  input.tsx  label.tsx  badge.tsx   # exist; reuse/extend as needed
│   ├── titled-card.tsx         # NEW: dark-bar-header card
│   ├── stat-card.tsx           # NEW: stat + colored underline bar
│   ├── input-group.tsx         # NEW: fused input+button (1px seam)
│   └── status-indicator.tsx    # NEW: LIVE(blink)/ON AIR/OFF AIR/CONNECTED(pulse) squares
├── theme/
│   ├── theme-provider.tsx      # NEW: auto/light/dark controller (sets .dark class; matchMedia for auto)
│   ├── theme-toggle.tsx        # NEW: cycles THEME:AUTO→LIGHT→DARK
│   └── theme-script.tsx        # NEW: inline no-flash script (pre-hydration class set)
├── motion/
│   └── motion-primitives.tsx   # NEW: Blink, PulseSquare, Ticker (Framer Motion, reduced-motion aware)
├── site/
│   ├── banner.tsx  ticker-tape.tsx  footer.tsx  auth-modal.tsx   # NEW: shared chrome
├── watch/
│   ├── player.tsx  stream-info.tsx  chat-panel.tsx               # NEW: Watch sections
└── dashboard/
    ├── stat-row.tsx  external-connections.tsx  broadcast-card.tsx  banned-users.tsx  # NEW

lib/
├── utils.ts                    # exists (cn)
└── mock-data.ts                # NEW: seeded chat, connections, bans, stream metadata
```

**Structure Decision**: Web application on the existing Next.js App Router. Watch is the site root
`/` (replacing the leftover template `app/page.tsx`), Dashboard is `/dashboard`, and the reference
gallery is `/design-system`. Reusable pieces live under `components/` grouped by role (`ui/` design
primitives, `site/` chrome, `watch/`, `dashboard/`, `theme/`, `motion/`); mock data is centralized
in `lib/mock-data.ts`. This keeps route files thin and every state renderable from static input.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Add `motion` (Framer Motion) dependency for blink/pulse/ticker | Explicitly requested by the user as the animation approach; gives a consistent API for these plus any modal/transition motion and first-class `useReducedMotion()` / `MotionConfig` handling for FR-023 | Plain CSS keyframes (`blink`, `pulse-soft` already in globals.css + one `tape` keyframe) fully reproduce the prototype with no dependency and honor reduced-motion via a `@media (prefers-reduced-motion)` block — rejected only because the user chose Framer Motion, not on merit |
