# Research: Convex Data Architecture

All spec-level ambiguities were resolved during `/speckit-specify` (manual admin lifecycle, self-hosted HLS, chat + reactions + presence in scope). This document records the Convex-specific design decisions.

## D1: Single source of truth for stream lifecycle

- **Decision**: One `streams` table with a `status` union (`scheduled | live | ended | canceled`). Schedule, live view, and archive are queries over this table — no separate schedule or archive tables. "Archived" is derived: `status === "ended" && recordingUrl` set.
- **Rationale**: FR-007/SC-005 forbid drift; derived views can't drift. Convex reactive queries make "what's live?" push to every client automatically.
- **Alternatives considered**: Separate `schedules` and `archives` tables — rejected, classic sync bug farm.

## D2: Enforcing "at most one live stream" (FR-002, SC-004)

- **Decision**: `goLive` mutation queries the `by_status` index for an existing live stream inside the same mutation and rejects if one exists. Convex mutations are serializable transactions, so this check-then-write is race-free.
- **Rationale**: DB-level invariant enforcement at the only write path, no app-level locking needed.
- **Alternatives considered**: Unique constraint — Convex has no unique constraints; transactional check is the idiomatic equivalent.

## D3: Clerk → Convex user sync (FR-005)

- **Decision**: `users` table keyed by Clerk's user ID (`externalId`, indexed). Sync via Clerk webhook → Convex HTTP action (`user.created`, `user.updated`, `user.deleted`), plus a session-time `users.ensure` upsert mutation as the gap-filler.
- **Rationale**: This is the documented Clerk+Convex pattern; the upsert covers webhook delivery gaps per the spec assumption.
- **Alternatives considered**: JWT-only (no users table) — rejected, playback state and chat need a stable local ID to join on.

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

## D6: Reactions (FR-015)

- **Decision**: `reactions` table (streamId, userId, kind). Clients subscribe to the last ~30s of reactions via a `["streamId"]` index ordered by `_creationTime`; a cron purges rows older than an hour.
- **Rationale**: Spec says retention can be minimal; rows + purge is simpler than any in-memory scheme and stays reactive for free.

## D7: Playback position writes (FR-006, FR-009)

- **Decision**: `playbackStates` one row per (user, stream), client throttles saves to every ~15s. Mutation carries a client `updatedAt`; it only overwrites when the incoming `updatedAt` is newer than the stored one — cheap out-of-order protection for multi-device.
- **Rationale**: Meets SC-003 (resume within 30s of true stop) with trivial write volume.
- **Alternatives considered**: Server-time last-write-wins — loses the multi-device out-of-order case FR-009 names.

## D8: Chat lifecycle & moderation (FR-013, FR-014, FR-017)

- **Decision**: `chat.send` verifies the target stream's `status === "live"` inside the mutation. Moderation is a soft-delete: `removed: true` flag; list queries filter it out. Admin = `role: "admin"` on the user row, checked server-side in every admin mutation.
- **Rationale**: Soft-delete keeps moderation auditable (spec); status check in the transaction makes "writable only while live" airtight.

## D9: Testing approach

- **Decision**: `convex-test` + vitest for all Convex functions (unit level, real Convex runtime semantics, not mocks); invariants D2, D5, D7, D8 each get dedicated tests. Playwright deferred to a UI feature spec.
- **Rationale**: Matches docs/TESTING-CONSIDERATIONS.md ("every PR has tests", convex-test named explicitly).
