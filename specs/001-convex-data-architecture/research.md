# Research: Convex Data Architecture

All spec-level ambiguities were resolved during `/speckit-specify` (manual admin lifecycle, self-hosted HLS, chat + reactions + presence in scope). This document records the Convex-specific design decisions.

## D1: Single source of truth for stream lifecycle

- **Decision**: One `streams` table with a `status` union (`scheduled | live | ended | canceled`). Schedule, live view, and archive are queries over this table — no separate tables. "Archived" is derived: `status === "ended" && recordingUrl` set. *(History: archives were briefly cut during analysis remediation, then restored once recording was confirmed to happen on the node-media-server host — see D12. Playback resume stayed cut — see D7.)*
- **Rationale**: FR-007/SC-005 forbid drift; derived views can't drift. Convex reactive queries make "what's live?" push to every client automatically.
- **Alternatives considered**: Separate `schedules` and `archives` tables — rejected, classic sync bug farm.

## D2: Enforcing "at most one live stream" (FR-002, SC-004)

- **Decision**: `goLive` mutation queries the `by_status` index for an existing live stream inside the same mutation and rejects if one exists. Convex mutations are serializable transactions, so this check-then-write is race-free.
- **Rationale**: DB-level invariant enforcement at the only write path, no app-level locking needed.
- **Alternatives considered**: Unique constraint — Convex has no unique constraints; transactional check is the idiomatic equivalent.

## D3: Clerk → Convex user sync (FR-005)

- **Decision**: `users` table keyed by Clerk's user ID (`externalId`, indexed). Sync via Clerk webhook → Convex HTTP action (`user.created`, `user.updated`, `user.deleted`), plus a session-time `users.ensure` upsert mutation as the gap-filler.
- **Rationale**: This is the documented Clerk+Convex pattern; the upsert covers webhook delivery gaps per the spec assumption.
- **Alternatives considered**: JWT-only (no users table) — rejected, chat and reactions need a stable local ID to join on.

## D4: Presence / viewer counts (FR-016, SC-007)

- **Decision**: `presenceSessions` table — one row per connected viewer (anonymous sessions get a client-generated session ID), heartbeat mutation refreshes `lastSeen` every ~20s. Viewer count = reactive query counting rows with `lastSeen > now - 60s` via a `["streamId", "lastSeen"]` index. A cron deletes stale rows.
  <!-- ponytail: count-on-read is O(viewers) per subscriber; switch to @convex-dev/presence or a sharded counter if concurrent viewers exceed ~1k -->
- **Rationale**: Simplest thing satisfying ±10%/60s; derived count can't drift (spec forbids mutable counters).
- **Alternatives considered**: `@convex-dev/presence` component — solid upgrade path, skipped for now to avoid a dependency the current scale doesn't need.

## D5: Chat rate limiting (FR-014)

- **Decision**: In the `chat.send` mutation, read the sender's newest message via a `["userId", "streamId"]`-scoped index and reject if it's younger than 2 seconds.
  <!-- ponytail: fixed 2s gap, swap for @convex-dev/rate-limiter (token bucket) if burst rules get fancier -->
- **Rationale**: One indexed read inside the transaction; no dependency.
- **Alternatives considered**: `@convex-dev/rate-limiter` — deferred, YAGNI at one rule.

## D6: Reactions (FR-015, FR-018)

- **Decision**: `reactions` table (streamId, userId, kind) where `kind` is either the unicode emoji character itself (≤16 chars, no allowlist) or `custom:<id>` referencing an admin-managed `customEmojis` table (name + Convex file-storage image + active flag). Clients subscribe to the last ~30s via a `["streamId"]` index; a cron purges rows older than an hour.
- **Rationale**: Spec says retention can be minimal; rows + purge is simpler than any in-memory scheme and stays reactive for free. Storing the emoji character directly avoids maintaining a unicode allowlist; the `custom:` prefix keeps one string field instead of a union.
- **Alternatives considered**: Fixed emoji allowlist — rejected by product decision (any unicode emoji allowed). Separate columns for unicode vs custom — more schema for no query benefit.

## D7: Playback position writes — REMOVED

- **Decision**: Cut from this spec (analysis remediation, 2026-07-07). Live-first site: pause/resume rejoins at the live edge, which needs no stored state. `playbackStates` table, `playback.ts`, and throttling concerns all deleted; a future recordings/VOD spec owns resume if it ever matters.
- **Rationale**: YAGNI — no recordings means no position worth saving.

## D8: Chat lifecycle & moderation (FR-013, FR-014, FR-017)

- **Decision**: `chat.send` verifies the target stream's `status === "live"` inside the mutation. Moderation is a soft-delete: `removed: true` flag; list queries filter it out. Admin = `role: "admin"` on the user row, checked server-side in every admin mutation.
- **Rationale**: Soft-delete keeps moderation auditable (spec); status check in the transaction makes "writable only while live" airtight.

## D9: Testing approach

- **Decision**: `convex-test` + vitest for all Convex functions (unit level, real Convex runtime semantics, not mocks); invariants D2, D5, D8 each get dedicated tests. Playwright deferred to a UI feature spec.
- **Rationale**: Matches docs/TESTING-CONSIDERATIONS.md ("every PR has tests", convex-test named explicitly).

## D10: Custom emoji storage (FR-018)

- **Decision**: Convex file storage for the image bytes (`emojis.generateUploadUrl` → client POSTs file → `emojis.create` saves `storageId`); `customEmojis` table carries name + active flag. Deactivate, never hard-delete, while reactions may reference the emoji (reactions purge within 1h anyway).
- **Rationale**: File storage is built into Convex — no new infrastructure; the upload-URL flow is its documented pattern.
- **Alternatives considered**: External blob store (Vercel Blob/S3) — rejected, adds a service for images measured in KB. Cascade-deleting reactions on emoji removal — unnecessary given the 1h purge.

## D11: Deleted-user chat handling (FR-005, analysis U1)

- **Decision**: Clerk `user.deleted` removes only the users row. Chat messages keep their dangling `userId`; `chat.list` resolves missing authors to a "Deleted user" fallback (null-safe join).
- **Rationale**: Preserves visible chat history and the moderation audit trail while fully unlinking identity.
- **Alternatives considered**: Cascade-delete messages — destroys history; sentinel-user rewrite — extra write fan-out for the same read behavior the fallback gives for free.

## D12: Streaming server & recordings — node-media-server (FR-011)

- **Decision**: RTMP ingest, HLS output, and recording all happen on the self-hosted node-media-server instance. Live playback = its HLS endpoint (`/live/<key>/index.m3u8`); recordings = the MP4/HLS files its trans/record task writes to the server's disk, served statically from the same host. Convex stores only the two URLs (`liveUrl`, `recordingUrl`) — video bytes never touch the database or Convex file storage.
- **Rationale**: The recording is a free byproduct of the ingest server the site already needs; a serverless database is the wrong (and expensive) place for video. Storage/disk management is an ops concern on that host, outside this data model.
- **Alternatives considered**: Uploading recordings to Convex file storage — rejected, wrong tool for multi-GB media. Managed video providers — rejected earlier by product decision (self-hosted).
- **Future option (not v1)**: node-media-server emits `postPublish`/`donePublish` events that could automate goLive/end via a Convex HTTP action; FR-010 keeps lifecycle manual for now.

## D13: VOD visibility (FR-019)

- **Decision**: A `visibility: "public" | "private"` field on `streams` (default public), toggled by an admin mutation. Every read path that exposes VOD data (`listArchive`, `streams.get`, `clips.*`) checks it against the caller's role — privacy is enforced at read time in one place per query, never denormalized onto clips.
- **Rationale**: One field + read-time checks = no state to keep in sync when visibility flips; clips inherit automatically (SC-008).
- **Caveat (recorded in spec assumptions)**: This is listing-level privacy. The recording file on the node-media-server host remains fetchable by anyone holding its exact URL; file-level protection (signed URLs) is future ops work.

## D14: Clips as pure references (FR-020, FR-021)

- **Decision**: `clips` table holding `(streamId, userId, start, end, title?, removed)` — a pointer, never a copy. Creation validates auth, an archived public source, and duration ≤15s inside the mutation. Playback is client-side seek of the source `recordingUrl` (e.g., media-fragment `#t=start,end` or player-level clamp). Soft-delete by creator or admin.
- **Rationale**: Zero video processing, zero storage, instant availability (SC-008); the 15s bound is a mutation constant, trivially adjustable.
- **Alternatives considered**: Server-side clip extraction (ffmpeg on the media host) — real video files, but a processing pipeline, queue, and disk cost for something a seek does for free. Revisit only if clips need to outlive their source VODs.
