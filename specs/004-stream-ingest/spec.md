# Feature Specification: Stream Ingest

**Feature Branch**: `feature/004-stream-ingest`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Stream ingest: bring the RTMP ingest / stream-key side of the livestream into this project. Today the repo is only a control plane + same-origin HLS playback proxy — the actual node-media-server (RTMP ingest, publish key, HLS out, recordings) lives outside the repo, and the admin manually pastes an HLS liveUrl (with the publish key embedded) into a stream. Scope the ingest side: per-stream stream-key generation/rotation, an ingest endpoint the admin points OBS at, mapping an authenticated RTMP publish to the right stream and auto-flipping it live/ended when bytes start/stop, keeping the key write-only and never leaking it to viewers, and optionally restream/External Connections targets. Keep Convex storing URLs/keys only, never video bytes."

## Clarifications

### Session 2026-07-14

- Q: How should ingest keys be scoped — per-stream or one channel key? → A: Per-stream key (each stream has its own key; the key identifies the exact stream a publish maps to).
- Q: What happens to the manual "Go Live" / "End" admin controls? → A: Keep both as a fallback — auto-lifecycle is primary, but manual Go Live and End both remain in case the publish signal is missed.
- Q: What is the scope boundary for the media server itself? → A: Backend contract only — this feature builds the key lifecycle, the publish-authorization/mapping endpoint the media server calls, and auto-lifecycle; deploying/configuring the media server stays out-of-repo ops.
- Q: Should restream / External Connections (User Story 3) be in this build? → A: Defer to a later feature — ship P1 + P2 now; the External Connections card stays as its current honest-empty state.

### Session 2026-07-14 (analysis remediation)

- Q: How is "reject a second concurrent publish" enforced, since a reconnect and a duplicate use the same per-stream key? → A: Delegate to the media server — it permits only one publisher per ingest path. The backend adopts any re-arriving authorized publish as a reconnect (FR-012) and does not try to distinguish duplicate from reconnect. FR-009 reframed accordingly; `lastPublishAt` field dropped as unneeded.
- Q: Manual Go Live / End controls — verify only or build UI? → A: The dashboard already has a GO LIVE / GO OFF AIR control (`streams.goLive`/`end`); this feature verifies it still works after the changes rather than building new UI.

### Session 2026-07-14 (armed ingest)

- Q: Should an authorized RTMP publish automatically put the stream live? → A: No. Superseding the earlier auto-lifecycle decision, publishing only arms the stream (`ingestActive=true`); the admin deliberately uses Go Live, which is rejected with `No active ingest` unless an incoming signal is active. Publish stop still auto-ends a live stream after the existing grace period.
- Q: How does an admin obtain ingest details before going live? → A: The dashboard Ingest card can create a scheduled stream and show its ingest address and key without changing it to live.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Broadcast by pointing a stream tool at the site (Priority: P1)

An admin creates or selects a scheduled stream from the dashboard Ingest card, reads its server address and per-stream key, pastes both into their broadcasting software (OBS or similar), and clicks "Start Streaming." The incoming signal arms the stream; after verifying the feed, the admin deliberately clicks "Go Live" and viewers see it without any pasted playback URL. When the admin stops streaming, the site returns the live stream to **ended** on its own.

**Why this priority**: This is the entire point of the feature. Without it, going live still requires an out-of-band media server and a hand-pasted URL. This one story, delivered alone, replaces that URL workflow and is the MVP.

**Independent Test**: Create a scheduled stream from the Ingest card, copy its ingest address + key into a broadcaster, and start publishing; confirm it remains scheduled but armed, then click Go Live and confirm a second browser sees the feed. Stop publishing and confirm the site auto-transitions to ended.

**Acceptance Scenarios**:

1. **Given** no selected stream, **When** an admin creates one from the dashboard Ingest card, **Then** its ingest address and key are available without making it live.
2. **Given** a scheduled stream with a generated key, **When** a broadcaster publishes to the ingest address using that key, **Then** the stream is armed but remains scheduled until the admin clicks Go Live.
3. **Given** a scheduled stream with no active ingest, **When** the admin clicks Go Live, **Then** the request fails with `No active ingest` and the stream remains scheduled.
4. **Given** an armed scheduled stream, **When** the admin clicks Go Live, **Then** the stream transitions to live and its feed becomes visible to viewers via the existing same-origin playback path.
5. **Given** a live stream fed by an active publish, **When** the broadcaster stops publishing, **Then** the stream transitions to ended automatically after a short grace period.
6. **Given** a publish attempt using a key that matches no stream, or a stream not eligible to receive a broadcast, **When** the broadcaster connects, **Then** the publish is rejected and no stream changes state.
7. **Given** a live stream, **When** the broadcaster's connection drops and reconnects within the grace period, **Then** the stream stays live (no flicker to ended and back).

---

### User Story 2 - Keep ingest keys secret and rotatable (Priority: P2)

An admin can see a stream's key when they need to configure a broadcaster, but the key is treated as a secret: it never appears anywhere a viewer can reach it, and it is never embedded in the playback URL the way it is today. If a key is exposed (shared screen, leaked config), the admin rotates it in one action, which immediately invalidates the old key so a stale broadcaster can no longer publish.

**Why this priority**: The current design leaks the publish key inside `liveUrl` and relies on the proxy to strip it. Owning key lifecycle lets us stop embedding secrets in URLs entirely and gives a revocation path. Important, but the happy-path broadcast (P1) delivers value first.

**Independent Test**: Confirm no viewer-facing response (playback playlist, stream queries, page source) contains the key; rotate the key and confirm a broadcaster still using the old key is rejected while the new key works.

**Acceptance Scenarios**:

1. **Given** any stream in any state, **When** a non-admin loads the site or fetches any public data, **Then** the ingest key appears in no response, URL, or playlist.
2. **Given** an admin viewing a stream, **When** they choose to reveal the key, **Then** the key is shown to them (admin-only) for copying into a broadcaster.
3. **Given** a stream with a known key, **When** the admin rotates the key, **Then** the previous key stops authorizing publishes immediately and a new key takes its place.
4. **Given** a leaked key currently mid-broadcast, **When** the admin rotates it, **Then** the active publish using the old key is dropped or ended.

---

### User Story 3 - Restream to external platforms (DEFERRED — out of scope for this feature)

> **Deferred (clarified 2026-07-14)**: Restream is not part of this build. It will
> become its own spec later. The "External Connections" card stays in its current
> honest-empty state. FR-016–FR-018 below are recorded for that future feature and
> are **not** in scope here.

An admin adds one or more external destinations (e.g., another platform's ingest URL + that platform's key) under "External Connections." While the site is live, the incoming feed is also forwarded to each enabled destination. Destination keys are write-only: once saved they are never displayed back.

**Why this priority**: Nice-to-have that extends reach but is not required to broadcast to the site itself. Explicitly optional in the request; can be deferred without blocking P1/P2.

**Independent Test**: Add an external destination, go live, and confirm the destination receives the feed; confirm a saved destination key is never shown back in the UI or any response.

**Acceptance Scenarios**:

1. **Given** an enabled external destination, **When** the stream is live, **Then** the feed is forwarded to that destination for the duration of the broadcast.
2. **Given** a saved external destination, **When** an admin re-opens its settings, **Then** the stored key is not displayed (write-only), only whether one is set.
3. **Given** a disabled or removed destination, **When** the stream is live, **Then** no feed is forwarded to it.

---

### Edge Cases

- **Two broadcasters, one key**: the media server refuses a second publisher on the same ingest path, so only one broadcast ever reaches the backend; a re-arriving publish for the same live stream is treated as a reconnect, not a second session (FR-009/FR-012).
- **Publish to an already-live or ended stream**: only streams eligible to receive a broadcast (scheduled, or live during a reconnect window) accept a publish; publishes to ended/canceled streams are rejected.
- **Single-live invariant**: a stream may be armed while a different stream is live, but its Go Live attempt is rejected, preserving the one-live-at-a-time rule.
- **Bytes stop without a clean disconnect** (network death): the grace period elapses with no data → stream auto-ends.
- **Rapid reconnect flapping**: repeated drop/reconnect within the grace period keeps the stream live rather than toggling state each time.
- **Recording hand-off**: when a broadcast ends, the resulting recording (produced by the media server) still needs to be attachable to the ended stream as it is today; auto-end must not break that path.
- **Key revealed then never used**: generating/revealing a key does not itself change stream state; only an actual publish does.

## Requirements *(mandatory)*

### Functional Requirements

**Key lifecycle**

- **FR-001**: The system MUST generate a unique, high-entropy ingest key per stream, available once the stream exists.
- **FR-002**: Admins MUST be able to reveal a stream's current ingest key on demand for configuring a broadcaster.
- **FR-003**: Admins MUST be able to rotate a stream's ingest key in a single action, producing a new key and immediately invalidating the previous one.
- **FR-004**: The system MUST store ingest keys such that they are never returned to non-admin callers in any query, page, URL, or playlist.
- **FR-005**: The system MUST stop embedding any publish/ingest secret inside the viewer-facing playback URL; playback continues to use the existing same-origin proxy paths.

**Ingest & mapping**

- **FR-006**: The system MUST expose a single, stable ingest address that an admin can point a standard broadcaster (OBS or equivalent) at.
- **FR-007**: The system MUST authenticate each incoming publish by its key and map it to exactly one stream.
- **FR-008**: The system MUST reject a publish whose key matches no stream or whose target stream is not eligible to receive a broadcast.
- **FR-009**: The system MUST NOT run two concurrent broadcasts for one stream. Single-publisher-per-ingest-path is enforced by the media server; a re-arriving authorized publish for an already-live stream is adopted as a reconnect (FR-012), not started as a second session — the backend does not attempt to tell a duplicate from a reconnect.

**Armed ingest lifecycle**

- **FR-010**: An authorized publish MUST arm its stream without changing `status`, `actualStart`, or `liveUrl`; an admin Go Live action MUST require active ingest and fail with `No active ingest` otherwise.
- **FR-011**: The system MUST transition a stream to ended automatically when its authorized publish stops and does not resume within a defined grace period.
- **FR-012**: The system MUST keep a stream live across a broadcaster disconnect/reconnect that occurs within the grace period (no state flapping).
- **FR-013**: Admins MUST use the manual "Go Live" control to transition an armed stream live and retain the manual "End" control; publish-stop auto-end behavior remains unchanged.

**Data boundary**

- **FR-014**: The backend MUST store only URLs, keys, and metadata — never video bytes; ingest, transcoding, HLS output, and recording storage remain the responsibility of the external media server.
- **FR-015**: The system MUST preserve the existing ability to attach a recording to an ended stream after an auto-ended broadcast.

**Restream (DEFERRED — recorded for a future feature, not in scope here)**

- **FR-016**: Admins SHOULD be able to add, enable/disable, and remove external restream destinations, each with a destination address and a write-only key.
- **FR-017**: When at least one destination is enabled, the system SHOULD forward the live feed to each enabled destination for the broadcast's duration.
- **FR-018**: Stored restream destination keys MUST NOT be displayed back after saving; the UI only indicates whether a key is set.

### Key Entities *(include if feature involves data)*

- **Stream** (existing): gains an associated ingest key and armed-ingest state, and derives its playback URL rather than having a secret pasted into it. Publish start arms it, manual Go Live transitions it to live, and publish stop drives auto-end.
- **Ingest Key / Publish Credential**: the secret that authorizes a publish and maps it to one stream; rotatable; admin-revealable; never viewer-visible.
- **Publish Session**: the currently active broadcast connection for a stream — its start arms go-live, and its sustained absence drives auto-end for a live stream; at most one per stream.
- **Restream Destination** (optional): an external platform target with an address and a write-only key, plus an enabled flag.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can create a stream, obtain its server address and key, connect a broadcaster, verify ingest, and deliberately go live without a hand-pasted playback URL in 100% of live starts.
- **SC-002**: After an armed stream's admin clicks Go Live, viewers can see the live feed within 15 seconds.
- **SC-003**: The ingest key appears in zero viewer-facing responses (queries, page source, playback playlists, URLs) across an audit of all public surfaces.
- **SC-004**: After a key rotation, a broadcaster using the old key is rejected within 5 seconds; the new key succeeds on first use.
- **SC-005**: When a broadcaster stops publishing, the stream auto-ends within the configured grace period (target: 30 seconds) in 100% of clean stops.
- **SC-006**: A disconnect/reconnect within the grace period results in zero unintended ended→live transitions.
- **SC-007**: No video bytes are ever persisted by the backend (verified by inspecting stored data — only URLs, keys, and metadata present).

## Assumptions

- **External media server remains required; this feature is the backend contract only** (clarified): RTMP ingest, transcoding, HLS output, and recording-to-disk are still performed by a self-hosted media server (node-media-server or equivalent) outside this repo. This feature owns the *key lifecycle, publish-authorization/mapping endpoint, armed-ingest state, and publish-stop auto-end* — it does not turn the backend into a media server, and **deploying/configuring the media server (installing it, wiring its auth hooks to this backend, HLS/recording paths) stays out-of-repo operations**, not tracked in this repo. Consistent with the existing "URLs only, never bytes" boundary.
- **Per-stream keys** (clarified): each stream has its own key; the key identifies exactly which stream a publish maps to, making arming unambiguous and letting a single broadcast's key be revoked without affecting others.
- **Armed ingest with deliberate go-live** (clarified): publish start only arms a stream; admin Go Live is required and is unavailable without active ingest. Publish stop still drives automatic end after the grace period, and manual End remains available (FR-013).
- **Grace period default**: 30 seconds of no data before auto-end; tunable, not a per-stream setting.
- **Eligibility for publish**: a stream may receive a publish when it is scheduled, or live during a reconnect window; publishes to ended/canceled streams are rejected.
- **Restream is deferred to a later feature** (clarified): User Story 3 and FR-016–FR-018 are out of scope for this build. The "External Connections" card stays in its current honest-empty state; restream will be specced separately without reshaping P1/P2.
- **Auth/roles reuse**: existing admin role and auth (Clerk) gate key reveal, rotation, and restream management; no new identity system.
- **Trust boundary between media server and backend**: the media server authenticates each publish against the backend over a server-to-server call guarded by a shared secret, mirroring the existing proxy-secret pattern; the browser is never involved in ingest.
