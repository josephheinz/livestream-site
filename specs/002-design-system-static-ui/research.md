# Phase 0 Research: Design System & Static UI

All Technical Context unknowns resolved below. Each entry: Decision / Rationale / Alternatives.

## R1 — Animation library

**Decision**: Use **Framer Motion (`motion` package)** for the blink (live), pulse (connections),
and ticker-tape animations, plus the auth-modal enter/exit. Mount `<MotionConfig reducedMotion="user">`
at the root layout and gate the always-on decorative loops (blink/pulse/ticker) on
`useReducedMotion()` so they render static when the user requests reduced motion (satisfies FR-023).

**Rationale**: Explicitly requested by the user. Provides one consistent animation API and
first-class reduced-motion support. `MotionConfig reducedMotion="user"` neutralizes transform-based
motion (the ticker's `translateX`), and `useReducedMotion()` lets the opacity loops (blink/pulse)
fall back to a static state — belt-and-suspenders for FR-023.

**Alternatives considered**: Plain CSS keyframes — already 90% present in `globals.css` (`blink`,
`pulse-soft`); ticker needs one `@keyframes tape`. Zero dependency, honors reduced motion with a
`@media (prefers-reduced-motion: reduce)` block. Rejected only because the user chose Framer Motion
(logged in plan Complexity Tracking). `react-spring`/`auto-animate` — no advantage here.

**Note on package name**: Framer Motion ships as `motion` today (the former `framer-motion` package
rebranded); import from `motion/react`. Add `motion` to `dependencies`.

## R2 — Three-way theme (auto / light / dark)

**Decision**: Custom lightweight theme controller (~40 lines, no new dependency). `app/globals.css`
already uses class-based dark mode (`@custom-variant dark (&:is(.dark *))`). A `ThemeProvider`
client component stores mode in `localStorage` under one key and applies it by toggling the `.dark`
class on `<html>`:
- `light` → remove `.dark`
- `dark` → add `.dark`
- `auto` → follow `window.matchMedia('(prefers-color-scheme: dark)')`, with a change listener.

A tiny inline `ThemeScript` in `<head>` sets the class before hydration to avoid a flash. The
`ThemeToggle` cycles `AUTO → LIGHT → DARK → AUTO` and shows `THEME:{MODE}`.

**Rationale**: Matches the prototype's exact behavior (auto follows OS, light/dark force). Reuses
the class-based mechanism already in `globals.css`, so no CSS rework. Constitution Simplicity favors
~40 lines over adding `next-themes`.

**Alternatives considered**: `next-themes` — the standard, handles system + no-flash out of the box,
but it's a new dependency for behavior a small hook covers. Kept as a fallback if edge cases (multi-
tab sync, SSR nuances) prove annoying. Prototype's `[data-tf]` + `prefers-color-scheme` media block —
would require re-authoring the token layer from `.dark`-class to attribute-selector form; rejected
to avoid touching the working token CSS.

**Assumption reconciliation**: Spec Assumptions say theme need not persist across reloads;
`localStorage` persistence is a harmless superset and is what users expect. No conflict.

## R3 — Component testing infrastructure (Constitution Test-First)

**Decision**: Add a second Vitest project for DOM tests using `jsdom` + `@testing-library/react` +
`@testing-library/jest-dom`. Convert `vitest.config.ts` to a projects/workspace config: keep the
existing `edge-runtime` project for `convex/**` and add a `jsdom` project for
`components/**/*.test.tsx` and `app/**/*.test.tsx`. New dev deps: `jsdom`, `@testing-library/react`,
`@testing-library/dom`, `@testing-library/jest-dom`, `@vitejs/plugin-react`.

**Rationale**: The constitution mandates test-first for all code through declared interfaces. For UI,
the declared interface is component props and route query params; Testing Library renders and asserts
on accessible output without reaching into internals. Splitting projects keeps the Convex edge-runtime
env intact.

**Alternatives considered**: Playwright E2E — strongest for the visual/reflow success criteria
(SC-001/SC-004) but heavy to stand up and slow; defer to a later cross-cutting testing feature.
Single vitest env — can't be both `edge-runtime` (Convex) and `jsdom` (React) at once; projects
config is the clean split.

**Scope guard**: Tests assert structure/state/behavior (variants render, query param selects state,
reduced-motion path renders static, no `fetch`/network call fires), not pixel fidelity — pixel
fidelity is a human review criterion (SC-001) and the quickstart's manual checklist.

## R4 — What already exists vs. what this feature adds

**Decision**: Extend, don't replace. Inventory from the current repo:
- `app/globals.css` — full light/dark token set (shadcn names + `--yellow`, `--green`, `--bar*`,
  `--shadow-color`), `--radius:0`, `--shadow-brutal`/`-sm`, `blink` + `pulse-soft` keyframes,
  font vars. **Add**: `@keyframes tape` for the ticker (or drive it via Framer Motion).
- `app/layout.tsx` — Archivo Black / Space Grotesk / Space Mono wired via `next/font/google`, Clerk
  + Convex providers. **Add**: `ThemeScript`, `ThemeProvider`, `MotionConfig`. **Fix**: stale
  `metadata` title ("Clerk Next.js Quickstart" → Nightchannel).
- `components/ui/` — `button`, `card`, `input`, `label`, `badge` (shadcn). Button has generic
  variants but not the neobrutalism ones. **Add** variants + new primitives.
- `app/page.tsx` — leftover "Life EOS App" template. **Replace** with Watch.

**Rationale**: Half the P1 design-system foundation is already in place; the plan builds on it to
honor Simplicity and avoid regressions.

## R5 — URL query-param state contract

**Decision**: Content-varying demo states are selected by query param, read in the route via Next.js
`searchParams`:
- Watch `/`: `?live=1` (default off-air) and `?chat=signedin|signedout|banned` (default `signedout`).
- Unknown/absent values fall back to the documented defaults (off-air, signed-out) — never error
  (spec Edge Cases).

**Rationale**: Satisfies FR-022 / SC-002 ("reachable without code changes") with a plain,
bookmarkable mechanism and no persistent demo UI in the shipped chrome. Reading `searchParams` keeps
the pages server components where possible; interactive bits (theme toggle, modal, chat composer,
dashboard local toggles) are `'use client'` islands.

**Alternatives considered**: Visible in-UI demo toggle strips (prototype style) — rejected per the
clarification session (would ship demo affordances into the real chrome). Path segments
(`/watch/banned`) — heavier routing for throwaway demo states.

## R6 — Neobrutalism button/primitive variants

**Decision**: Extend the existing CVA `buttonVariants` with design-system variants rather than
forking: `cta` (primary red, `--on-primary`), `accent` (yellow, ink text), `solid` (ink bg, paper
text), `outline` (card bg), and a `mono` utility toggle (Space Mono, 1px border). Apply shared rules
via classes: `border-2` (containers) / `border` (toggles), `shadow-[var(--shadow-brutal-sm)]`,
`hover:-translate-x-px hover:-translate-y-px`, `font-display uppercase`, square corners (radius
already 0). New primitives (`titled-card`, `stat-card`, `input-group`, `status-indicator`) are thin
composition components using the same tokens.

**Rationale**: Keeps one button API, reuses tokens/shadow vars already defined, minimal net new code.

**Alternatives considered**: Separate bespoke button component — duplicates shadcn plumbing.
Inline styles per prototype — not reusable, fails the design-system goal (FR-008..FR-011).
