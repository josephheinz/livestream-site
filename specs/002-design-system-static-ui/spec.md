# Feature Specification: Design System & Static UI

**Feature Branch**: `feature/002-design-system-static-ui`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Implement the softened neobrutalism design system and build out the static UI shells to match the HTML prototypes in docs/livestream-site-design-brief/project/ (Design System.dc.html and Livestream Site v2.dc.html). Scope is design-system + static presentation only — no data wiring, no live Convex/Clerk integration, no chat/broadcast logic."

## Overview

This feature turns the exported "softened neobrutalism" design prototypes into a real,
reusable design system and the static presentational shells of the livestream site. It is
**appearance and layout only** — every screen renders realistic placeholder content and the
handful of interactions needed to *view* each state (switch theme, open/close the sign-in
modal). No real streaming, chat, authentication, or persistence is in scope; those arrive in
later features that fill these shells with live data.

## Clarifications

### Session 2026-07-08

- Q: Watch/Dashboard as real routes or a single in-page toggle like the prototype? → A: Real
  routes — Watch at `/`, Dashboard at `/dashboard`; banner/footer nav uses real links.
- Q: How are the multiple states (live/off-air, chat signed-in/out/banned) made viewable? → A:
  Via URL query params (e.g. `?live=1`, `?chat=banned`), not visible in-UI demo toggle strips.
- Q: Should blink/pulse/ticker animations respect the user's reduced-motion preference? → A:
  Yes — honor `prefers-reduced-motion` by disabling or limiting those animations.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Design system foundation (Priority: P1)

A developer building any screen can rely on one consistent set of visual tokens, typography,
and reusable UI pieces (buttons, inputs, cards, status indicators) that exactly reproduce the
"softened neobrutalism" look in both light and dark themes. A reference page displays every
token and component so the system can be reviewed at a glance, mirroring `Design System.dc.html`.

**Why this priority**: Everything else is assembled from these pieces. Without a single source
of truth for color, type, spacing, borders, shadows, and components, each screen would drift.
It is independently valuable as a living style guide.

**Independent Test**: Open the design-system reference page. Confirm the token swatches,
typography samples, button variants, form fields, card variants, and status indicators match
the prototype, and that cycling the theme (auto → light → dark) re-colors the whole page.

**Acceptance Scenarios**:

1. **Given** the reference page in light theme, **When** it renders, **Then** the paper, card,
   ink, muted, line, primary, yellow, and green swatches show the documented light-theme hex
   values and every surface uses square corners, 2px container borders, and hard offset shadows.
2. **Given** the theme control set to "auto", **When** the OS is in dark mode, **Then** the page
   renders in the dark palette; **When** switched to "light" or "dark" explicitly, **Then** the
   page uses that palette regardless of OS.
3. **Given** any button, **When** the pointer hovers it, **Then** the element lifts toward its
   shadow (a small up-left nudge) with no change to corner radius.
4. **Given** a "LIVE" status indicator, **When** it renders, **Then** its dot blinks; **Given** a
   "CONNECTED" indicator, **Then** its square pulses; indicators are always square, never round.

---

### User Story 2 - Watch screen shell (Priority: P2)

A visitor lands on the Watch screen and sees the full public experience shell: the branded top
banner, a video player area that reflects a live or off-air state with an overlaid control bar,
a stream-info card, and a live-chat column that can display signed-in, signed-out, and banned
states. The scrolling ticker tape and footer frame the page, and a sign-in / create-account
modal can be opened and dismissed.

**Why this priority**: The Watch screen is the primary destination for the site's audience and
carries the most distinctive layout. It also introduces the global chrome (banner, ticker,
footer, auth modal) shared by every screen.

**Independent Test**: Load the Watch screen at `/`. Load the live and off-air variants via query
param and confirm the player, banner indicator, and stream-info header reflect each. Load the chat
signed-in, signed-out, and banned variants via query param. Open and close the sign-in modal and
switch it to create-account.

**Acceptance Scenarios**:

1. **Given** the Watch screen in live state, **When** it renders, **Then** the player shows a
   "REC" indicator, channel/quality readout, a "LIVE NOW!" tag, and an overlaid control bar; the
   banner and stream-info header both read "ON AIR".
2. **Given** the Watch screen in off-air state, **When** it renders, **Then** the player shows a
   large "OFF AIR" / "STREAM RESUMES SOON" panel and the banner/stream-info read "OFF AIR".
3. **Given** the chat signed-out variant, **When** it renders, **Then** a "Sign in to chat"
   prompt replaces the message composer; **Given** the banned variant, **Then** a ban notice
   with reason and expiry replaces the message list; **Given** the signed-in variant, **Then** a
   seeded message list and a message composer with a fused Send button appear.
4. **Given** the banner "Sign In" control, **When** activated, **Then** a centered modal opens over
   a blurred backdrop; **When** the backdrop or close control is activated, **Then** it dismisses;
   **When** the "Create one" link is activated, **Then** the modal switches to create-account with
   an added username field.
5. **Given** a viewport narrower than the desktop breakpoint, **When** the Watch screen renders,
   **Then** the player and chat stack vertically instead of sitting side by side.

---

### User Story 3 - Dashboard screen shell (Priority: P3)

A broadcaster opens the restricted Dashboard and sees the broadcast-control shell: a header with
a go-live/go-off-air control, a row of stat cards (status, watching now, live connections, active
bans), an External Connections card for restream targets, a Broadcast status card, and a Banned
Users table.

**Why this priority**: The Dashboard is operator-facing and seen by far fewer people than the
Watch screen, so it can follow once the shared chrome and design system exist. It reuses the same
primitives, so it is low-risk once P1 and P2 are done.

**Independent Test**: Navigate to `/dashboard` via the banner nav. Confirm the four stat cards, the
External Connections list with add-row and per-row on/off + remove controls, the Broadcast card,
and the Banned Users table all render with placeholder data and update local view state (toggle,
add, remove, unban) without any backend.

**Acceptance Scenarios**:

1. **Given** the Dashboard, **When** it renders, **Then** four stat cards show Status, Watching now,
   Connections live, and Active bans, each with a colored underline bar per the prototype.
2. **Given** the External Connections card, **When** rendered, **Then** each connection row shows a
   status dot, platform name, a masked (dots-only) key, an ON/OFF toggle, and a remove control, and
   the key value is never displayed back in plain text.
3. **Given** the add-connection row, **When** a platform name and key are entered and "Add" is
   activated, **Then** a new connection row appears in the local list.
4. **Given** the Banned Users table with rows, **When** an "Unban" control is activated, **Then**
   that row is removed from the local list; **When** the list is empty, **Then** a "No active bans"
   message shows.
5. **Given** a viewport narrower than the desktop breakpoint, **When** the Dashboard renders,
   **Then** the stat grid and control cards collapse to a single/dual column layout.

---

### Edge Cases

- **Live-only chat activity**: The prototype's periodic auto-messages and viewer-count drift are
  demo affordances; the static shell may seed a fixed message list without a live ticker. Movement
  is not required for the static shell (documented assumption).
- **Empty states**: No external connections shows a dashed "No external connections yet" panel; no
  bans shows a "No active bans" message.
- **Theme persistence**: If the page reloads, the theme returns to "auto" unless persistence is
  explicitly added; persistence across reloads is out of scope for this feature.
- **Long content**: Chat messages and stream descriptions wrap; overflowing chat scrolls within its
  column without expanding the page frame on desktop.
- **Reduced motion**: Users who prefer reduced motion must not be assaulted by the blink/pulse/
  ticker animations; these are disabled or reduced for them (see FR-023).
- **Unknown/absent state params**: A missing or unrecognized state query param falls back to a
  sensible default (off-air player, signed-out chat) rather than erroring.

## Requirements *(mandatory)*

### Functional Requirements

**Design tokens & theming**

- **FR-001**: The system MUST define the full token set — paper, card, ink, muted, line, shadow,
  primary, on-primary, yellow, green, bar, bar-ink, bar-muted, input-bg, input-ink — with the
  documented values for both light and dark themes.
- **FR-002**: The system MUST support three theme modes — auto, light, and dark — where "auto"
  follows the operating system's light/dark preference and light/dark force that palette.
- **FR-003**: Users MUST be able to cycle the theme (auto → light → dark → auto) from a control in
  the page chrome, and the entire visible surface MUST recolor accordingly.

**Typography & visual rules**

- **FR-004**: Display type (headings, buttons, card titles) MUST use Archivo Black, always
  uppercase; body/UI copy MUST use Space Grotesk; data, status, and labels MUST use Space Mono.
- **FR-005**: All surfaces MUST use square corners (no border radius anywhere), 2px borders on
  containers and 1px borders on rows and inputs, and hard offset shadows (4px 4px 0 on cards, 3px
  on buttons) with no blur.
- **FR-006**: Interactive elements MUST lift toward their shadow on hover (a translate up-left) with
  no other geometry change.
- **FR-007**: Status indicators MUST be square (never round or pill-shaped); the live indicator MUST
  blink and connection indicators MUST pulse; status text MUST be uppercase Space Mono.

**Reusable primitives**

- **FR-008**: The system MUST provide button variants: primary CTA (red), accent (yellow), solid
  (ink), outline, and a mono utility toggle — each following the border/shadow/hover rules.
- **FR-009**: The system MUST provide flat form inputs (1px border, tinted background, no shadow),
  including a write-only/secret input style, and a fused input+button group joined by a 1px seam.
- **FR-010**: The system MUST provide card variants: a titled card with a dark bar header and a stat
  card with a colored underline bar.
- **FR-011**: The system MUST provide a design-system reference page that displays the principles,
  color swatches (light, accents, dark), typography, buttons, forms, cards, status indicators, and
  layout rules, mirroring the design-system prototype.

**Shared chrome**

- **FR-012**: Every screen MUST share a top banner (logo + channel name, Watch/Dashboard nav with an
  active state, a live/off-air indicator, Subscribe, Sign In, and a theme toggle), a scrolling
  ticker tape, and a footer with the channel name and navigation links.
- **FR-013**: Watch MUST be served at `/` and Dashboard at `/dashboard` as distinct routes; the
  banner nav and footer MUST navigate between them via real links, with the active route visually
  indicated.

**Watch screen**

- **FR-014**: The Watch screen MUST show a video player placeholder that renders distinct live and
  off-air visuals, with an overlaid control bar (play/pause, time/LIVE readout, progress bar,
  CC/settings/fullscreen affordances).
- **FR-015**: The Watch screen MUST show a stream-info card with a titled header carrying an
  ON AIR/OFF AIR status and a description with channel/day/next/quality metadata.
- **FR-016**: The Watch screen MUST show a live-chat column supporting three viewable states —
  signed in (seeded messages + composer), signed out (sign-in prompt), and banned (ban notice with
  reason and expiry) — each selectable via a URL query param for demonstration.

**Dashboard screen**

- **FR-017**: The Dashboard MUST show a header with a go-live/go-off-air control and a row of four
  stat cards (status, watching now, connections live, active bans).
- **FR-018**: The Dashboard MUST show an External Connections card listing restream targets with a
  status dot, platform, masked key, on/off toggle, and remove control, plus an add-connection row;
  stored key values MUST NOT be displayed back in plain text.
- **FR-019**: The Dashboard MUST show a Broadcast status card and a Banned Users table (user, reason,
  expiry, unban control) with an empty state.

**Auth modal**

- **FR-020**: The system MUST provide a sign-in / create-account modal that opens over a blurred
  backdrop, dismisses via the backdrop or a close control, and toggles between sign-in and
  create-account (the latter adding a username field).

**Scope guardrails**

- **FR-021**: The feature MUST NOT wire any screen to real data, authentication, streaming, or
  persistence; all content is placeholder and all interactions affect only local view state needed
  to demonstrate the states.
- **FR-022**: Demonstrable states that vary content (live vs off-air; chat signed-in/signed-out/
  banned) MUST be selectable via URL query params so every state is reachable without code changes,
  rather than via persistent in-UI demo controls.
- **FR-023**: The blink (live), pulse (connections), and ticker-tape animations MUST respect the
  user's `prefers-reduced-motion` setting, disabling or substantially reducing motion for users who
  request it.

### Key Entities *(placeholder/demo data only)*

- **Theme**: One of auto / light / dark; selects the active color palette.
- **Stream (display)**: Title, channel, live-or-off-air status, viewer count, quality, and next-slot
  metadata shown on the Watch screen — placeholder values, not sourced from a backend.
- **Chat message (display)**: A display name (with color) and text, seeded statically for the
  signed-in chat state.
- **External connection (display)**: Platform name, on/off state, and a masked key, held only in
  local view state on the Dashboard.
- **Banned user (display)**: User handle, reason, and expiry, held only in local view state on the
  Dashboard.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer comparing each rendered screen side by side with its prototype
  (`Design System.dc.html`, `Livestream Site v2.dc.html`) finds no visible discrepancy in layout,
  color, type, borders, shadows, or spacing in either theme.
- **SC-002**: All documented states are reachable from the running UI without code changes — via
  URL query param for the content-varying states (live/off-air, chat signed-in/signed-out/banned)
  and via direct interaction for auth sign-in/create-account and the connections/bans empty states.
- **SC-003**: Switching the theme control recolors 100% of visible surfaces, and "auto" matches the
  operating system preference on first load.
- **SC-004**: Both screens remain usable and correctly reflow at a narrow (mobile) viewport — the
  Watch player/chat stack and the Dashboard grids collapse per the prototype's breakpoint behavior —
  with no horizontal overflow of the page frame.
- **SC-005**: No screen issues a network request for stream, chat, auth, or dashboard data; the
  build renders entirely from static/placeholder content.
- **SC-006**: The design-system reference page presents every token, type sample, button, form,
  card, and status indicator defined by the system in one place.

## Assumptions

- The existing Next.js 16 App Router + React 19 + Tailwind v4 + shadcn/ui stack is the delivery
  vehicle; this feature adds tokens, components, and pages rather than introducing a new stack.
- The Google-hosted fonts (Archivo Black, Space Grotesk, Space Mono) used by the prototypes are
  acceptable to load.
- The demo-only animations from the prototype (auto-appending chat messages, viewer-count drift) are
  not required in the static shell; a fixed seeded message list is sufficient.
- Theme selection does not need to persist across reloads in this feature.
- Real authentication (Clerk), streaming/HLS, chat, presence, and dashboard mutations are delivered
  by separate features and are explicitly out of scope here.
- Placeholder copy and mock data (channel name "NIGHTCHANNEL", seeded chat, sample bans/connections)
  from the prototype are acceptable as-is for the static shells.
