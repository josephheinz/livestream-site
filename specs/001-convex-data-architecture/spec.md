# Feature Specification: Convex Data Architecture

**Feature Branch**: `feature/001-convex-data-architecture`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Data architecture for the livestream site's Convex backend: define the data model (tables, fields, relationships) and how data flows through the system — streams, users (Clerk-linked), viewing/playback state, schedules/archives, and how the Next.js frontend reads/writes via Convex queries, mutations, and subscriptions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Viewer finds and watches the live stream (Priority: P1)

A visitor lands on the site while a stream is live. The site knows a stream is live, surfaces it immediately, and the visitor starts watching without signing in. When the stream starts or ends, every viewer's page reflects the change automatically — no refresh.

**Why this priority**: This is the product. If the data model can't answer "what is live right now?" instantly and reactively, nothing else matters.

**Independent Test**: Seed one stream record, flip its status to live, and confirm a connected client sees the change without reloading; flip to ended and confirm the same.

**Acceptance Scenarios**:

1. **Given** a stream whose status is live, **When** a visitor loads the home page, **Then** the live stream is presented as the primary content with its title and playback source.
2. **Given** a visitor watching a live stream, **When** the stream's status changes to ended, **Then** the viewer's page reflects the ended state without a manual refresh.
3. **Given** no stream is live, **When** a visitor loads the home page, **Then** the live query returns an empty state without errors (what fills that state — schedule content — is User Story 2).

---

### User Story 2 - Viewer browses the schedule (Priority: P2)

A visitor who arrives between broadcasts can see what's coming up: scheduled streams with dates/times, soonest first.

**Why this priority**: Most visits happen when nothing is live. The schedule is what makes those visits worthwhile. (Recordings/archives of past broadcasts are deliberately deferred to a future spec — this is a live-first site.)

**Independent Test**: Seed scheduled, live, ended, and canceled stream records; confirm the schedule view lists only upcoming scheduled ones in chronological order.

**Acceptance Scenarios**:

1. **Given** streams in various lifecycle states, **When** a visitor opens the schedule, **Then** only future scheduled streams appear, soonest first.
2. **Given** a scheduled stream is canceled, **When** the schedule is viewed, **Then** it no longer appears.

---

### User Story 3 - Viewers chat and see who's watching (Priority: P3)

During a live stream, signed-in viewers post chat messages and quick reactions that every viewer sees in real time. All viewers (including anonymous) see an approximate live viewer count. Admins can remove messages that violate norms.

**Why this priority**: Interactivity is what makes live different from a recording, but the stream must exist and be watchable first.

**Independent Test**: With one live stream and two connected clients (one signed in), post a message from the signed-in client and confirm the other sees it in real time; confirm both see a viewer count of 2; delete the message as admin and confirm it disappears for both.

**Acceptance Scenarios**:

1. **Given** a live stream with viewers connected, **When** a signed-in viewer posts a chat message, **Then** all connected viewers see it in real time without refresh.
2. **Given** an anonymous viewer on a live stream, **When** they view the chat, **Then** they can read messages and see the viewer count but cannot post.
3. **Given** an admin viewing chat, **When** they remove a message, **Then** it disappears for all viewers.
4. **Given** viewers joining and leaving a live stream, **When** the audience changes, **Then** the displayed viewer count tracks the change within a short delay.

---

### User Story 4 - Signed-in identity stays in sync (Priority: P4)

A viewer who signs in (Clerk) gets a matching account record in the backend automatically, kept in sync when their profile changes or their account is deleted. This is what lets chat messages carry names/avatars and admins be recognized.

**Why this priority**: Required plumbing for chat and admin roles, but the site is fully watchable anonymously without it.

**Independent Test**: Sign up a new user via the auth provider; confirm a linked backend user record appears, updates on profile change, and is removed on account deletion.

**Acceptance Scenarios**:

1. **Given** a new user signs up via the auth provider, **When** they first interact with the site, **Then** a corresponding user record exists in the backend linked to their auth identity.
2. **Given** a user updates their name/avatar in the auth provider, **When** the change propagates, **Then** the backend record reflects it.
3. **Given** an anonymous viewer, **When** they watch any stream, **Then** nothing is persisted about them and nothing errors.

> **Deferred**: Playback position tracking / resume was cut from this spec. This is a live-first site — pausing and resuming simply rejoins at the current live position, which requires no stored state. Recordings/VOD (and any resume behavior for them) will be a future spec.

---

### Edge Cases

- Two stream records marked live at once — the model must define a single source of truth for "the" live stream (most recent actual start wins; ideally prevented at write time).
- A scheduled stream that never goes live (canceled or missed) — must not linger as "upcoming" forever.
- A user deletes their account in the auth provider — their user record is removed; their chat messages remain and display a "Deleted user" fallback author (moderation history stays intact, identity is unlinked).
- Chat message bursts (spam or a hot moment) — writes must be rate-limited per user so one viewer can't flood the room.
- A viewer closes the tab without a clean disconnect — presence must expire stale sessions so the count doesn't drift upward.
- A custom emoji is removed by an admin after viewers reacted with it — existing reactions age out naturally; new reactions with it are rejected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST represent a stream through a single lifecycle: scheduled → live → ended (or scheduled → canceled). Recordings/archives are out of scope for this spec.
- **FR-002**: System MUST be able to answer "which stream is live right now?" with at most one result.
- **FR-003**: All connected clients MUST observe stream lifecycle changes (go-live, end, cancel) reactively, without manual refresh or polling.
- **FR-004**: System MUST store, for each stream: title, description, scheduled start time, actual start/end times, lifecycle status, and its live playback source.
- **FR-005**: System MUST maintain a user record for each authenticated (Clerk) identity, created/updated automatically from the auth provider, keyed by the provider's stable identity. Account deletion removes the user record; their chat messages remain with a "Deleted user" fallback author.
- **FR-006**: *Removed — playback position tracking/resume deferred to a future recordings spec. Pausing a live stream and resuming rejoins at the current live position (no stored state).*
- **FR-007**: Schedule views MUST derive from the same stream records (no separate schedule data to keep in sync).
- **FR-008**: All writes that manage stream lifecycle (create, schedule, go-live, end, cancel) MUST be restricted to authorized administrators; viewers have read-only access to stream data.
- **FR-009**: *Removed — playback-position writes deferred along with FR-006.*
- **FR-010**: Stream lifecycle transitions (go-live, end, cancel) MUST be triggered manually by an authorized administrator; the system MUST NOT depend on any external automation to change lifecycle state.
- **FR-011**: Playback sources are self-hosted HLS: each stream stores its live playback URL, supplied by an administrator.
- **FR-012**: Live-stream interactivity (chat, reactions, viewer presence/count) is in scope for this data model.
- **FR-013**: Signed-in users MUST be able to post chat messages on a live stream; all connected viewers (including anonymous) MUST see new messages in real time. Anonymous viewers are read-only.
- **FR-014**: Administrators MUST be able to remove chat messages; removed messages disappear for all viewers. Chat writes MUST be rate-limited per user.
- **FR-015**: Signed-in users MUST be able to post lightweight reactions on a live stream, visible to all viewers in real time. A reaction is either any standard unicode emoji or one of the site's custom emojis.
- **FR-016**: The system MUST track approximate live viewer presence per stream (anonymous and signed-in alike) and expire stale sessions, so the displayed count tracks reality within a short delay.
- **FR-017**: Chat is writable only while its stream is live; after the stream ends, retained messages are read-only.
- **FR-018**: Administrators MUST be able to upload custom emoji images (name + image) and deactivate them; deactivated custom emojis are rejected for new reactions while existing ones age out naturally.

### Key Entities

- **User**: A person with an account. Mirrors the auth provider's identity (stable external ID, name, avatar, email); authors chat messages and reactions. Created on first authenticated contact, updated when the provider reports changes.
- **Stream**: The central entity. One record per broadcast event carrying its full lifecycle: scheduling info (title, description, scheduled start), live info (actual start/end, status, live playback URL). Schedule and live view are both views over this one entity.
- **ChatMessage**: Belongs to a Stream and a User. Holds text, sent time, and a removed flag (soft-delete so moderation is auditable). Writable only while the stream is live. Survives author account deletion with a fallback display identity.
- **Reaction**: Belongs to a Stream and a User. Carries a kind — a unicode emoji or a reference to a CustomEmoji. Short-lived display; retention can be minimal.
- **CustomEmoji**: Admin-uploaded image with a name and an active flag. Referenced by Reactions; deactivation stops new use without breaking history.
- **PresenceSession**: One per connected viewer per live stream (anonymous or signed-in). Heartbeat-refreshed; expires when stale. Viewer count is derived by counting fresh sessions — never stored as a mutable counter.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When a stream goes live, 100% of connected clients reflect the live state within 5 seconds, with zero manual refreshes.
- **SC-002**: A first-time visitor can reach playing video in under 10 seconds from page load on a typical connection. *(Product-level criterion — inherited by the future UI feature; not verifiable by this data-layer feature alone.)*
- **SC-003**: *Removed — playback resume deferred with FR-006/FR-009.*
- **SC-004**: Zero instances where two streams present as "live" simultaneously.
- **SC-005**: Schedule listings are consistent with stream records 100% of the time (no drift), because they are derived, not duplicated.
- **SC-006**: A posted chat message is visible to all connected viewers within 2 seconds.
- **SC-007**: The displayed viewer count is within 10% of actual connected viewers, and stale sessions stop counting within 60 seconds of disconnect.

## Assumptions

- Clerk remains the sole identity provider; the backend never stores credentials, only a mirror of identity data keyed by Clerk's user ID.
- User records sync from Clerk via its standard webhook events (created/updated/deleted); a session-time upsert covers webhook gaps.
- Anonymous viewing is a hard requirement — no data path may assume a signed-in user.
- One organization, one channel: no multi-tenant modeling needed.
- This is a live-first site: no recordings, archives/VOD, or playback-position tracking in this spec — all deferred to a future recordings spec. Pause/resume on live simply rejoins at the live edge.
- "Delete" for streams is an admin-only soft operation; historical records are retained unless explicitly purged.
- Admin identification (who may manage streams, moderate chat, and manage custom emojis) is a role/flag on the User record; a full RBAC system is out of scope.
- Streaming infrastructure (encoder, HLS packaging, hosting of manifests/segments) exists outside this system; admins paste in the resulting playback URLs. Validating that a URL actually serves video is out of scope.
- Chat history is retained in the database after a stream ends (read-only); surfacing it is a future-spec concern. Reactions need not be retained long-term.
- Moderation scope for v1 is message removal only; bans/mutes/timeouts are out of scope.
- Custom emoji images are small (≤256 KB) static images; image content moderation is the admin's own judgment (admins are the only uploaders).
