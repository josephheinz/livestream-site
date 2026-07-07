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
3. **Given** no stream is live, **When** a visitor loads the home page, **Then** they see the next scheduled stream and/or recent archived streams instead of an empty page.

---

### User Story 2 - Viewer browses schedule and archives (Priority: P2)

A visitor who arrives between broadcasts can see what's coming up (scheduled streams with dates/times) and watch past broadcasts (archives/VODs), ordered newest-first.

**Why this priority**: Most visits happen when nothing is live. Schedule + archive is what makes those visits worthwhile.

**Independent Test**: Seed scheduled, live, and archived stream records; confirm the schedule view lists only upcoming ones in chronological order and the archive view lists only ended ones with recordings, newest first.

**Acceptance Scenarios**:

1. **Given** streams in various lifecycle states, **When** a visitor opens the schedule, **Then** only future scheduled streams appear, soonest first.
2. **Given** ended streams with recordings available, **When** a visitor opens the archive, **Then** they appear newest-first and each can be played.
3. **Given** an ended stream with no recording, **When** the archive is listed, **Then** that stream does not appear as watchable.

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

### User Story 4 - Signed-in viewer resumes where they left off (Priority: P4)

A signed-in (Clerk-authenticated) viewer who previously watched part of an archived stream returns later — on any device — and can resume from where they stopped. Their identity and profile data stay in sync with the auth provider.

**Why this priority**: Valuable retention feature, but the site is fully usable anonymously without it.

**Independent Test**: As a signed-in user, watch an archive to the 5-minute mark, leave, return on a fresh session, and confirm playback offers to resume at ~5 minutes.

**Acceptance Scenarios**:

1. **Given** a signed-in viewer with saved playback position on an archive, **When** they reopen that archive, **Then** they can resume from the saved position.
2. **Given** a new user signs up via the auth provider, **When** they first interact with the site, **Then** a corresponding user record exists in the backend linked to their auth identity.
3. **Given** an anonymous viewer, **When** they watch any stream, **Then** no playback state is persisted and nothing errors.

---

### Edge Cases

- Two stream records marked live at once — the model must define a single source of truth for "the" live stream (most recent actual start wins; ideally prevented at write time).
- A scheduled stream that never goes live (canceled or missed) — must not linger as "upcoming" forever.
- A stream ends but its recording isn't ready yet — archive listing must distinguish "ended" from "playable recording available."
- Playback-position writes arriving out of order (multi-device) — last-write-wins must not resurrect an older position over a meaningfully newer one.
- A user deletes their account in the auth provider — their backend record, playback state, and chat messages must be handled (removed or orphan-safe).
- Chat message bursts (spam or a hot moment) — writes must be rate-limited per user so one viewer can't flood the room.
- A viewer closes the tab without a clean disconnect — presence must expire stale sessions so the count doesn't drift upward.
- Chat on an archived stream — the live room is closed; retained messages are visible read-only alongside the recording.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST represent a stream through a single lifecycle: scheduled → live → ended, with an archived recording optionally attached after ending.
- **FR-002**: System MUST be able to answer "which stream is live right now?" with at most one result.
- **FR-003**: All connected clients MUST observe stream lifecycle changes (go-live, end, recording available) reactively, without manual refresh or polling.
- **FR-004**: System MUST store, for each stream: title, description, scheduled start time, actual start/end times, lifecycle status, and playback source reference(s).
- **FR-005**: System MUST maintain a user record for each authenticated (Clerk) identity, created/updated automatically from the auth provider, keyed by the provider's stable identity.
- **FR-006**: Signed-in users' playback position MUST be persisted per user per stream and retrievable on any device; anonymous viewers MUST be able to watch with no persisted state.
- **FR-007**: Schedule views MUST derive from the same stream records (no separate schedule data to keep in sync); archives likewise derive from ended streams with recordings.
- **FR-008**: All writes that manage stream lifecycle (create, schedule, go-live, end, attach recording) MUST be restricted to authorized administrators; viewers have read-only access to stream data.
- **FR-009**: Playback-position updates MUST be written at a throttled cadence (not every tick) and MUST tolerate out-of-order writes across devices.
- **FR-010**: Stream lifecycle transitions (go-live, end, attach recording) MUST be triggered manually by an authorized administrator; the system MUST NOT depend on any external automation to change lifecycle state.
- **FR-011**: Playback sources are self-hosted HLS: each stream stores its live playback URL, and each archive stores its recording playback URL, both supplied by an administrator. A stream is only "playable as archive" once its recording URL is attached.
- **FR-012**: Live-stream interactivity (chat, reactions, viewer presence/count) is in scope for this data model.
- **FR-013**: Signed-in users MUST be able to post chat messages on a live stream; all connected viewers (including anonymous) MUST see new messages in real time. Anonymous viewers are read-only.
- **FR-014**: Administrators MUST be able to remove chat messages; removed messages disappear for all viewers. Chat writes MUST be rate-limited per user.
- **FR-015**: Signed-in users MUST be able to post lightweight reactions on a live stream, visible to all viewers in real time.
- **FR-016**: The system MUST track approximate live viewer presence per stream (anonymous and signed-in alike) and expire stale sessions, so the displayed count tracks reality within a short delay.
- **FR-017**: Chat is writable only while its stream is live; after the stream ends, retained messages are read-only.

### Key Entities

- **User**: A person with an account. Mirrors the auth provider's identity (stable external ID, name, avatar, email); owns playback state. Created on first authenticated contact, updated when the provider reports changes.
- **Stream**: The central entity. One record per broadcast event carrying its full lifecycle: scheduling info (title, description, scheduled start), live info (actual start/end, status), and archive info (recording reference once available). Schedule, live view, and archive are all views over this one entity.
- **PlaybackState**: Join entity between User and Stream. Holds the user's last playback position and last-watched timestamp. One per user-stream pair; absent for anonymous viewers.
- **ChatMessage**: Belongs to a Stream and a User. Holds text, sent time, and a removed flag (soft-delete so moderation is auditable). Writable only while the stream is live.
- **Reaction**: Belongs to a Stream and a User. A lightweight, typed signal (e.g., emoji kind + time). Short-lived display; retention can be minimal.
- **PresenceSession**: One per connected viewer per live stream (anonymous or signed-in). Heartbeat-refreshed; expires when stale. Viewer count is derived by counting fresh sessions — never stored as a mutable counter.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When a stream goes live, 100% of connected clients reflect the live state within 5 seconds, with zero manual refreshes.
- **SC-002**: A first-time visitor can reach playing video (live or archive) in under 10 seconds from page load on a typical connection.
- **SC-003**: A signed-in user returning to a partially watched archive resumes within 30 seconds of their true stopping point, across devices, 99% of the time.
- **SC-004**: Zero instances where two streams present as "live" simultaneously.
- **SC-005**: Schedule and archive listings are consistent with stream records 100% of the time (no drift), because they are derived, not duplicated.
- **SC-006**: A posted chat message is visible to all connected viewers within 2 seconds.
- **SC-007**: The displayed viewer count is within 10% of actual connected viewers, and stale sessions stop counting within 60 seconds of disconnect.

## Assumptions

- Clerk remains the sole identity provider; the backend never stores credentials, only a mirror of identity data keyed by Clerk's user ID.
- User records sync from Clerk via its standard webhook events (created/updated/deleted); a session-time upsert covers webhook gaps.
- Anonymous viewing is a hard requirement — no data path may assume a signed-in user.
- One organization, one channel: no multi-tenant modeling needed.
- Playback-position writes are throttled client-side (roughly every 10–15 seconds of playback) to keep write volume trivial.
- "Delete" for streams is an admin-only soft operation; historical records are retained unless explicitly purged.
- Admin identification (who may manage streams and moderate chat) is a role/flag on the User record; a full RBAC system is out of scope.
- Streaming infrastructure (encoder, HLS packaging, hosting of manifests/segments) exists outside this system; admins paste in the resulting playback URLs. Validating that a URL actually serves video is out of scope.
- Chat history is retained after a stream ends and shown read-only with the archive; reactions need not be retained long-term.
- Moderation scope for v1 is message removal only; bans/mutes/timeouts are out of scope.
