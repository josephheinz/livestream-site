---
description: "Task list for Design System & Static UI"
---

# Tasks: Design System & Static UI

**Input**: Design documents from `specs/002-design-system-static-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/components.md, quickstart.md

**Tests**: MANDATORY per constitution Principle I (Test-First, Black-Box). Every phase lists its
black-box test tasks BEFORE implementation; tests MUST be run and observed to FAIL first. UI is
tested through its declared interface — component props and route query params — never internals.
Test runner: Vitest `jsdom` project + `@testing-library/react`. Test files sit next to source as
`*.test.tsx`.

**Organization**: Grouped by user story (US1 → US2 → US3) for independent implementation/testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1/US2/US3 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies and test harness so React components are testable.

- [ ] T001 Add `motion` (Framer Motion) to `dependencies` in `package.json` (`pnpm add motion`)
- [ ] T002 [P] Add dev deps `jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @vitejs/plugin-react` (`pnpm add -D ...`)
- [ ] T003 Convert `vitest.config.ts` to a projects config: keep the existing `edge-runtime` project for `convex/**`, add a `jsdom` project (with `@vitejs/plugin-react`) matching `components/**/*.test.tsx` and `app/**/*.test.tsx`
- [ ] T004 [P] Create `vitest.setup.ts` importing `@testing-library/jest-dom` and a `matchMedia` mock helper; register it as the jsdom project `setupFiles`

**Checkpoint**: `pnpm test` runs both projects; a trivial jsdom test can render a component.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Theme, motion, mock data, and layout wiring that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Extend `app/globals.css`: add `@keyframes tape` for the ticker and a `@media (prefers-reduced-motion: reduce)` block that neutralizes `blink`/`pulse-soft`/`tape`; confirm the existing token/shadow layer is unchanged
- [ ] T006 [P] Create `lib/mock-data.ts`: stream metadata, seeded chat messages (with handle colors), sample external connections, sample banned users, ticker strings — typed per `data-model.md`
- [ ] T007 [P] Test `components/theme/theme-provider.test.tsx`: cycle order `auto→light→dark→auto`; `dark` adds `.dark` to root, `light` removes it, `auto` follows mocked `matchMedia` — MUST FAIL first
- [ ] T008 [P] Test `components/motion/motion-primitives.test.tsx`: `Blink`/`PulseSquare`/`Ticker` render their content statically when `useReducedMotion()` is mocked `true` — MUST FAIL first
- [ ] T009 Create `components/theme/theme-provider.tsx` (mode state, `localStorage`, `matchMedia` listener, applies `.dark`; exposes `useTheme()`), making T007 pass
- [ ] T010 [P] Create `components/theme/theme-script.tsx` (inline no-flash pre-hydration class setter) and `components/theme/theme-toggle.tsx` (renders `THEME:{MODE}`, calls `cycle()`)
- [ ] T011 Create `components/motion/motion-primitives.tsx`: `Blink`, `PulseSquare`, `Ticker` via `motion/react`, each gated on `useReducedMotion()`, making T008 pass
- [ ] T012 Wire `app/layout.tsx`: mount `ThemeScript` in `<head>`, wrap children in `ThemeProvider` and `<MotionConfig reducedMotion="user">`; fix stale `metadata` title/description to Nightchannel

**Checkpoint**: Theme cycles app-wide, motion primitives respect reduced-motion, mock data available.

---

## Phase 3: User Story 1 - Design system foundation (Priority: P1) 🎯 MVP

**Goal**: One consistent set of tokens, type, and reusable primitives (buttons, inputs, cards,
status indicators) in both themes, showcased on a `/design-system` reference page.

**Independent Test**: Open `/design-system`; token swatches, typography, button variants, form
fields, card variants, and status indicators match the prototype, and cycling the theme recolors
the whole page.

### Tests for User Story 1 (write FIRST, observe FAIL) ⚠️

- [ ] T013 [P] [US1] Test `components/ui/button.test.tsx`: variants `cta`/`accent`/`solid`/`outline`/`mono` render with expected text/role, hover-lift + square-corner classes
- [ ] T014 [P] [US1] Test `components/ui/status-indicator.test.tsx`: `kind="live"` marks the blink element, all kinds render a square (no rounding), reduced-motion → no animation
- [ ] T015 [P] [US1] Test `components/ui/titled-card.test.tsx`, `stat-card.test.tsx`, `input-group.test.tsx`: title/label/value/button text render; StatCard bar reflects `barColor`

### Implementation for User Story 1

- [ ] T016 [US1] Extend `components/ui/button.tsx` CVA with `cta`/`accent`/`solid`/`outline`/`mono` variants (tokens, 2px/1px borders, `--shadow-brutal-sm`, `hover:-translate-x-px -translate-y-px`, `font-display uppercase`), making T013 pass
- [ ] T017 [P] [US1] Create `components/ui/status-indicator.tsx` (LIVE blink / ON AIR / OFF AIR / CONNECTED pulse, square, reduced-motion aware via motion primitives), making T014 pass
- [ ] T018 [P] [US1] Create `components/ui/titled-card.tsx` (dark bar header, 2px border, 4px offset shadow)
- [ ] T019 [P] [US1] Create `components/ui/stat-card.tsx` (mono label, Archivo Black value, colored underline bar)
- [ ] T020 [P] [US1] Create `components/ui/input-group.tsx` (fused input + button, 1px seam, flat inputs) — T018–T020 make T015 pass
- [ ] T021 [US1] Create `app/design-system/page.tsx`: reference gallery of principles, color swatches (light/accents/dark), typography, buttons, forms, cards, status indicators, layout rules (mirrors `Design System.dc.html`), using the primitives above + `ThemeToggle`

**Checkpoint**: `/design-system` fully renders and theme-cycles — design system is demonstrable.

---

## Phase 4: User Story 2 - Watch screen shell (Priority: P2)

**Goal**: The full public Watch experience shell at `/` — banner, player (live/off-air), stream-info
card, chat column (signed-in/out/banned), ticker, footer, and the sign-in/create-account modal.

**Independent Test**: Load `/`, `/?live=1&chat=signedin`, `/?chat=banned`; player/banner/stream-info
reflect live state; chat panel matches the param; sign-in modal opens, switches to create-account,
and closes.

### Tests for User Story 2 (write FIRST, observe FAIL) ⚠️

- [ ] T022 [P] [US2] Test `components/site/banner.test.tsx`: active-route indication, Sign In opens the modal, live indicator reflects `live` prop
- [ ] T023 [P] [US2] Test `components/site/auth-modal.test.tsx`: signin↔signup switch (signup shows username field), closes on backdrop and close control
- [ ] T024 [P] [US2] Test `components/watch/player.test.tsx`: `live` → REC/quality/LIVE NOW! + control bar; off → OFF AIR panel
- [ ] T025 [P] [US2] Test `components/watch/chat-panel.test.tsx`: `signedin` → messages + composer, `signedout` → sign-in prompt, `banned` → ban notice (reason/expiry), unknown → signed-out default
- [ ] T026 [P] [US2] Test `app/page.test.tsx`: `?live=1` and `?chat=` select correct states, unknown values fall back to defaults, and rendering issues no network request (fetch spy = 0 calls)

### Implementation for User Story 2

- [ ] T027 [P] [US2] Create `components/site/banner.tsx` (logo + channel name, Watch/Dashboard nav with active state, live indicator, Subscribe, Sign In → modal, `ThemeToggle`), making T022 pass
- [ ] T028 [P] [US2] Create `components/site/ticker-tape.tsx` (uses `Ticker`) and `components/site/footer.tsx` (channel name + nav links)
- [ ] T029 [P] [US2] Create `components/site/auth-modal.tsx` (controlled: `open`/`mode`/`onClose`/`onSwitchMode`, blurred backdrop, inert inputs), making T023 pass
- [ ] T030 [P] [US2] Create `components/watch/player.tsx` (live vs off-air visuals + inert overlaid control bar), making T024 pass
- [ ] T031 [P] [US2] Create `components/watch/stream-info.tsx` (titled header ON AIR/OFF AIR + metadata row)
- [ ] T032 [P] [US2] Create `components/watch/chat-panel.tsx` (signedin/signedout/banned states, inert/local-echo composer), making T025 pass
- [ ] T033 [US2] Create `app/page.tsx` (Watch route): read `searchParams` for `live`/`chat`, compose banner + player + stream-info + chat + ticker + footer + auth modal from mock data; replaces the leftover template Home — making T026 pass

**Checkpoint**: Watch screen and all shared chrome work; every documented Watch state reachable by URL.

---

## Phase 5: User Story 3 - Dashboard screen shell (Priority: P3)

**Goal**: The restricted Dashboard at `/dashboard` — header + go-live control, four stat cards,
External Connections card, Broadcast card, and Banned Users table.

**Independent Test**: Navigate to `/dashboard`; stat cards render; add/toggle/remove a connection
(keys always masked); unban removes a row; empty states appear.

### Tests for User Story 3 (write FIRST, observe FAIL) ⚠️

- [ ] T034 [P] [US3] Test `components/dashboard/external-connections.test.tsx`: add appends a row, toggle flips ON/OFF, remove deletes, raw key never rendered (only dots), empty → dashed empty state
- [ ] T035 [P] [US3] Test `components/dashboard/banned-users.test.tsx`: unban removes a row, empty → "No active bans"
- [ ] T036 [P] [US3] Test `components/dashboard/stat-row.test.tsx` + `broadcast-card.test.tsx`: four stat cards + correct barColors; broadcast card reflects `live` and toggles
- [ ] T037 [P] [US3] Test `app/dashboard/page.test.tsx`: `?live=1` drives status stat/broadcast; rendering issues no network request (fetch spy = 0 calls)

### Implementation for User Story 3

- [ ] T038 [P] [US3] Create `components/dashboard/stat-row.tsx` (four `StatCard`s: status/watching/connections/bans), making T036 (stat part) pass
- [ ] T039 [P] [US3] Create `components/dashboard/external-connections.tsx` (local list: add/toggle/remove, masked keys, empty state), making T034 pass
- [ ] T040 [P] [US3] Create `components/dashboard/broadcast-card.tsx` (ON AIR/OFF AIR + go-live/off toggle), making T036 (broadcast part) pass
- [ ] T041 [P] [US3] Create `components/dashboard/banned-users.tsx` (table + unban + empty state), making T035 pass
- [ ] T042 [US3] Create `app/dashboard/page.tsx`: read `searchParams` for `live`, compose banner + header/go-live + stat row + connections + broadcast + banned table + ticker + footer from mock data — making T037 pass

**Checkpoint**: All three routes independently functional from static data.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T043 [P] Add a cross-route no-network assertion helper and confirm `/`, `/dashboard`, `/design-system` issue zero data requests (SC-005)
- [ ] T044 [P] Responsive pass: verify Watch player/chat stack and Dashboard grids collapse at ~375px with no horizontal page-frame overflow (SC-004); fix breakpoints as needed
- [ ] T045 [P] Accessibility pass: visible focus states on interactive elements; confirm blink/pulse/ticker are static under OS reduce-motion (FR-023)
- [ ] T046 Run `specs/002-design-system-static-ui/quickstart.md` manual checklist against both prototypes in light + dark (SC-001, SC-002, SC-003, SC-006)
- [ ] T047 [P] `pnpm lint` clean-up and remove any dead template code from the old Home page

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories.
- **US1 (Phase 3)**: depends on Foundational. No dependency on US2/US3.
- **US2 (Phase 4)**: depends on Foundational; uses US1 primitives (button/status/cards) — sequence US1 first, or stub primitives if parallelized.
- **US3 (Phase 5)**: depends on Foundational and US1 primitives; its full page composition reuses US2 shared chrome (banner/ticker/footer/auth modal). Section components (T038–T041) are independent and testable without US2; only `app/dashboard/page.tsx` (T042) needs the chrome.
- **Polish (Phase 6)**: after the desired stories are complete.

### Within Each User Story

- Tests written and observed FAIL before implementation (constitution I).
- Primitives before sections; sections before route pages.

### Parallel Opportunities

- Setup: T002 alongside T001; T004 alongside T003.
- Foundational: T006/T007/T008 in parallel; T010 alongside T009.
- US1: T013–T015 (tests) parallel; T017–T020 (primitives) parallel after T016.
- US2: T022–T026 (tests) parallel; T027–T032 (components) parallel before T033 composes them.
- US3: T034–T037 (tests) parallel; T038–T041 (sections) parallel before T042 composes them.
- Polish: T043/T044/T045/T047 parallel.

---

## Parallel Example: User Story 2

```bash
# Tests first (all fail):
Task: "Test components/site/banner.test.tsx"
Task: "Test components/site/auth-modal.test.tsx"
Task: "Test components/watch/player.test.tsx"
Task: "Test components/watch/chat-panel.test.tsx"
Task: "Test app/page.test.tsx"

# Then components in parallel:
Task: "Create components/site/banner.tsx"
Task: "Create components/watch/player.tsx"
Task: "Create components/watch/chat-panel.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & validate `/design-system`**.
The design system is demonstrable on its own before any screen is built.

### Incremental Delivery

Setup + Foundational → US1 (design system, MVP) → US2 (Watch + chrome) → US3 (Dashboard). Each
story is testable and demoable without breaking the previous.

---

## Notes

- [P] = different files, no incomplete-task dependency.
- Half of the token/shadow/font layer already exists in `app/globals.css` / `app/layout.tsx`; tasks
  extend rather than recreate it.
- Framer Motion is used per explicit request; the reduced-motion path (T005 CSS fallback + T011
  `useReducedMotion`) is the FR-023 guarantee.
- Verify each test fails before implementing; commit after each task or logical group.
