# Feature Specification: Live Data Integration

**Feature Branch**: `feature/003-live-data-integration`

**Created**: 2026-07-13

**Status**: Draft

**Input**: User description: "Wire the static UI shells from spec 002 (Watch page, Dashboard, shared chrome) to the real Convex backend built in spec 001. Replace all placeholder/static data with live data: stream listings and lifecycle state, the HLS player fed by the same-origin proxy, real-time chat with presence and reactions, custom emojis, pointer clips with VOD visibility, and the editable stream title persisted to Convex. Signed-in users come from Clerk with their Convex users row. The result is a fully functional livestream site where the design-system UI renders real backend state end to end."

> **Editor's note**: The Input above is the verbatim original request. "Pointer clips
> with VOD visibility" was subsequently cut from scope — see Clarifications (2026-07-13,
> Q2). Do not implement clips from this feature.

## Overview

Spec 001 built the backend (stream lifecycle, playback proxy, chat, presence, reactions,
emojis, clips, user accounts) and spec 002 built the front-end appearance (design system,
Watch and Dashboard shells) on placeholder data. This feature connects the two: every
screen stops rendering demo content and instead reflects — and writes back to — the real
backend, live, for every visitor at once. When it ships, the site is genuinely usable:
a streamer can go live and viewers can watch, chat, and react in real time.

## Clarifications

### Session 2026-07-13

- Q: The backend has no ban capability — how should 003 handle the banned-users feature? → A: Expand 003's scope to include a minimal ban capability in the backend (ban/unban + enforcement in chat/reactions), wiring the existing Dashboard table to it.
- Q: Does 003 include UI for creating clips, or only viewing them? → A: Cut clips from 003 entirely; clip UI (view and create) is deferred to a future spec.
- Q: Should the Dashboard's go-live control actually change lifecycle state, or only display it? → A: The control drives the lifecycle — clicking go-live/end transitions the current stream record; the encoder connection stays independent.
- Q: How do reactions appear to viewers? → A: Reactions/emoji — unicode and custom — are sent as ordinary chat messages; no separate reaction channel or overlay in this feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Viewer watches the real stream (Priority: P1)

A visitor opens the site while a broadcast is live. The Watch page shows the actual
stream state: the player plays the real video feed, the stream title and live indicator
come from the backend, and the viewer count reflects the people actually watching. When
the broadcast ends, the page transitions to the off-air presentation on its own — no
refresh needed. When no broadcast is live, a visitor arriving sees the off-air state.

**Why this priority**: Watching the stream is the site's reason to exist. Every other
story assumes a viewer can already see real stream state, and this story alone turns the
static shell into a working product.

**Independent Test**: Start a broadcast against the backend, open the Watch page in a
browser, and confirm real video plays with the real title and live state. End the
broadcast and confirm the page moves to off-air without a refresh.

**Acceptance Scenarios**:

1. **Given** a broadcast is live, **When** a visitor opens the Watch page, **Then** the
   player plays the live feed and the page shows the live indicator, the real stream
   title, and the current viewer count.
2. **Given** no broadcast is live, **When** a visitor opens the Watch page, **Then** the
   off-air presentation is shown and no player error is displayed.
3. **Given** a visitor is watching a live broadcast, **When** the broadcast ends,
   **Then** the page transitions to the off-air state automatically without a refresh.
4. **Given** a visitor is on the off-air page, **When** a broadcast starts, **Then** the
   page transitions to the live state and playback becomes available without a refresh.

---

### User Story 2 - Signed-in viewers chat, react, and are counted (Priority: P2)

A visitor signs in through the existing auth modal and becomes a known user. In the chat
column they see the real message history, send messages that appear for every other
viewer immediately, use the channel's custom emojis, and send reactions. The presence
count includes them while they watch and drops them when they leave. Signed-out visitors
can read chat but are prompted to sign in before participating.

**Why this priority**: Chat and reactions are the interactive core of a livestream —
they're what makes it live rather than a video page. Requires US1's real stream state to
be meaningful.

**Independent Test**: Sign in from two different browsers, send messages and reactions
from each, and confirm both appear in the other browser in real time; confirm the
presence count reflects both sessions and decrements after one leaves.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor, **When** they open chat, **Then** they can read
   messages but the composer directs them to sign in.
2. **Given** a signed-in viewer, **When** they send a chat message, **Then** it appears
   in every other viewer's chat within a moment, attributed to their account.
3. **Given** a signed-in viewer, **When** they pick a custom emoji in the composer,
   **Then** the emoji renders in the sent message for all viewers.
4. **Given** a signed-in viewer, **When** they send an emoji-only message (unicode or
   custom) as a reaction, **Then** it appears in the chat stream for all viewers like
   any other message.
5. **Given** a viewer has the Watch page open, **When** another user checks the viewer
   count, **Then** it includes the first viewer; when they close the page, the count
   drops within a short interval.
6. **Given** a user banned by the admin, **When** they attempt to send a message,
   **Then** the message is rejected and they are told they cannot participate.

---

### User Story 3 - Admin runs the channel from the Dashboard (Priority: P3)

The channel admin opens the Dashboard, sees real broadcast status and real stats
(viewers, messages, and other live figures), edits the stream title and sees it persist
and propagate to every viewer's Watch page, and manages the banned-users list backed by
real data. The go-live/off-air control reflects and drives the actual broadcast
lifecycle state.

**Why this priority**: Admin tooling is essential to running the channel but serves
one person; viewers (US1/US2) come first.

**Independent Test**: With a broadcast live, open the Dashboard, edit the title, and
confirm the new title appears on a separate viewer's Watch page without a refresh;
confirm stat figures match backend reality and the ban list is editable.

**Acceptance Scenarios**:

1. **Given** the admin is signed in, **When** they open the Dashboard, **Then** every
   stat card and status panel shows real backend values, not placeholders.
2. **Given** the admin edits the stream title, **When** they confirm the edit,
   **Then** the title persists and updates on all open Watch pages without a refresh.
3. **Given** the admin bans a user from the banned-users table, **When** that user
   tries to chat, **Then** the message is rejected; unbanning restores their ability.
4. **Given** a broadcast starts or ends, **When** the admin looks at the Dashboard,
   **Then** the broadcast status and go-live control reflect the true lifecycle state.
5. **Given** an upcoming stream exists, **When** the admin clicks go-live (and later
   end), **Then** the stream record transitions live/ended and every open Watch page
   follows within the SC-001 window.
6. **Given** a signed-in non-admin (or signed-out visitor) navigates to the
   Dashboard, **Then** they cannot view or change admin data.

---

### Edge Cases

- Playback interruption mid-stream (network drop, proxy error): the player surfaces a
  recoverable state and resumes when the feed is reachable again, rather than freezing
  on a stale frame or crashing the page.
- Auth session expires while the chat composer is open: the next send is rejected
  gracefully and the composer returns to its signed-out prompt.
- A custom emoji is removed after being used: previously sent messages degrade
  gracefully (no broken images), and the emoji no longer appears in the picker.
- Two admins (or two tabs) edit the title simultaneously: last write wins and both
  screens converge on the persisted value.
- A viewer keeps the tab open but idle for hours: presence expires per backend rules and
  the count stays honest.
- The backend is unreachable on page load: the page shows a clear degraded state rather
  than the spec-002 placeholder content.
- Demo/state-forcing affordances from spec 002 (query-param variants) on real routes:
  removed, so a shared URL can never show fake state.

## Requirements *(mandatory)*

### Functional Requirements

**Identity**

- **FR-001**: Visitors MUST be able to sign in and out through the existing auth modal,
  and a signed-in visitor MUST be recognized as the same account the backend already
  tracks (display name and identity consistent across chat, presence, and moderation).
- **FR-002**: Admin-only capabilities (Dashboard data, title editing, banning,
  lifecycle control) MUST be restricted to the admin account; other users and
  signed-out visitors MUST be denied.

**Watch — stream state & playback**

- **FR-003**: The Watch page MUST render the real broadcast state (live vs off-air) and
  transition between states automatically as the backend state changes, without a page
  refresh.
- **FR-004**: While live, the player MUST play the actual broadcast feed served through
  the site's own origin, and MUST recover from transient feed interruptions.
- **FR-005**: The stream title, live indicator, and viewer count on the Watch page MUST
  reflect backend values in real time.
- **FR-006**: All placeholder/demo content on the Watch page MUST be removed, including
  query-parameter state forcing on the real route.

**Chat, presence & reactions**

- **FR-007**: The chat column MUST show the real message history and append new messages
  from all participants in real time.
- **FR-008**: Signed-in viewers MUST be able to send messages; signed-out visitors MUST
  be able to read but are prompted to sign in to participate.
- **FR-009**: The channel's custom emojis MUST be available in the composer and render
  in messages for all viewers.
- **FR-010**: Viewers express reactions by sending emoji — unicode or custom — as
  ordinary chat messages; there is no separate reaction channel or overlay in this
  feature.
- **FR-011**: Presence MUST count each active viewing session and expire sessions that
  go silent, and the visible viewer count MUST track this.
- **FR-012**: Banned users MUST be prevented from sending chat messages (including emoji
  reactions), and MUST receive clear feedback when blocked.

**Dashboard**

- **FR-013**: Every Dashboard figure (stat cards, broadcast status, connections, banned
  users) MUST come from real backend data; no placeholder values may remain.
- **FR-014**: The admin MUST be able to edit the stream title from either screen that
  offers it, with the change persisted and propagated live to all viewers.
- **FR-015**: The Dashboard's banned-users table MUST support banning and unbanning real
  users, effective immediately in chat. Because the existing backend has no ban
  capability, this feature adds a minimal one: a ban/unban operation restricted to the
  admin and enforcement at message- and reaction-send time. This is the only new
  backend capability in scope.
- **FR-016**: The go-live control MUST both reflect and drive the broadcast lifecycle:
  it always displays the true current state, and the admin clicking it transitions
  the current stream record (go live / end). The encoder connection remains independent
  of this control.

- **FR-017**: *Removed — covered clip visibility; clips were cut from this feature per
  Clarifications Q2. Number retired to keep downstream references stable.*

**Cross-cutting**

- **FR-018**: No screen may render spec-002 placeholder data anywhere once this feature
  ships; the design-system reference page is the only place demo content remains.
- **FR-019**: If the backend is unreachable, screens MUST present an explicit degraded
  state rather than stale or fabricated data.
- **FR-020**: All existing visual behavior from spec 002 (theming, motion, reduced-motion
  handling, layout) MUST be preserved unchanged by the data wiring.

### Key Entities *(existing backend entities, consumed not redefined)*

- **Stream/Broadcast**: the channel's lifecycle state (live, off-air, recorded), title,
  and timing; source of truth for the Watch page and Dashboard status.
- **User**: a signed-in account with display identity; may be the admin; may be
  banned.
- **Chat message**: authored by a user against a broadcast, may contain custom emojis;
  emoji-only messages serve as reactions.
- **Presence session**: a viewer's active watching session; the set of live sessions
  yields the viewer count.
- **Custom emoji**: channel-defined image usable in chat.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A broadcast state change (go live / go off-air) is reflected on every open
  Watch page within 5 seconds, with no page refresh.
- **SC-002**: A chat message sent by one viewer is visible to other viewers within 2
  seconds under normal conditions.
- **SC-003**: An admin title edit appears on all open Watch pages within 5 seconds.
- **SC-004**: The viewer count matches the number of genuinely active viewing sessions
  (no double counting across tabs beyond backend rules; departed viewers drop off within
  the backend's expiry window).
- **SC-005**: Zero placeholder/demo values are reachable on `/` and `/dashboard` — a
  full crawl of both screens in all states shows only backend-derived content.
- **SC-006**: A banned user's next message attempt is rejected 100% of the time, with
  feedback shown to them.
- **SC-007**: All spec-002 visual regression/behavioral tests still pass unchanged
  (theming, motion, layout intact).

## Assumptions

- The spec-001 backend surface is complete and sufficient for this feature, with one
  clarified exception: a minimal ban capability is added (see FR-015). Any further gap
  is raised as a spec change rather than silently added.
- The site has a single channel and a single admin account; multi-channel and
  multi-admin support are out of scope.
- The existing auth provider integration from spec 001 (sign-in, account row creation)
  is reused as-is; this feature only connects the front-end modal to it.
- The Dashboard's go-live control transitions the stream record's lifecycle state; it
  does not (and need not) start or stop the encoder, whose connection is managed by the
  streaming software.
- The `/design-system` reference page keeps its demo content and state-forcing
  affordances; only the real routes (`/`, `/dashboard`) must be placeholder-free.
- Restream/external-connection data on the Dashboard is wired to whatever the backend
  already tracks; if the backend tracks nothing for it, the card shows an honest empty
  state rather than demo rows.
- Clips are out of scope for this feature despite existing backend support; clip UI
  (viewing and creating) is deferred to a future spec.
- The backend's dedicated ephemeral reaction stream is not wired in this feature;
  reactions are expressed as emoji chat messages. A distinct reaction overlay, if ever
  wanted, is a future spec.
- Standard web performance expectations apply; no additional scale targets beyond what
  spec 001 already supports.
