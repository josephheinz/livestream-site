# Architecture Decision Records

Load-bearing decisions for the livestream site. Full rationale and alternatives
live in [specs/001-convex-data-architecture/research.md](../specs/001-convex-data-architecture/research.md) (D-numbers below).

## ADR-001: One streams table, derived views (D1)

**Decision**: A single `streams` table with a `status` union is the only source
of truth. Schedule, live view, and archive are queries over it — "archived"
means `status === "ended" && recordingUrl` set. No separate schedule/archive
tables, ever.

**Consequence**: Views cannot drift (FR-007/SC-005); Convex reactivity pushes
go-live to every client for free.

## ADR-002: Single-live invariant enforced transactionally (D2)

**Decision**: `streams.goLive` checks the `by_status` index for an existing
live stream inside the mutation and throws if one exists. Convex mutations are
serializable transactions, so the check-then-write cannot race. No locks, no
unique constraints (Convex has none).

## ADR-003: Video bytes never touch Convex — URL-only references (D12)

**Decision**: RTMP ingest, HLS output, and recordings all live on the
self-hosted node-media-server host. Convex stores exactly two URLs per stream
(`liveUrl`, `recordingUrl`). Recordings are the files NMS writes to its own
disk, served statically from that host.

**Consequence**: No media pipeline in this repo; disk management is an ops
concern on the media host.

## ADR-004: Same-origin HLS proxy hides origin URLs and stream keys (D15)

**Decision**: NMS play URLs embed the *publish* stream key, so origin URLs are
secrets. Non-admin reads substitute `/stream/live.m3u8` and
`/stream/vod/<streamId>.m3u8`; a Next.js route handler
(`app/stream/[[...path]]/route.ts`) resolves those paths to origin URLs via a
secret-guarded Convex HTTP action (`/stream-origin`, `STREAM_PROXY_SECRET`)
and relays playlists (rewritten) and segments. Origin URLs appear only in
admin payloads.

**Consequence**: A leaked viewer URL is not a broadcast credential. Proxying
adds per-viewer bandwidth through the web tier; swap in a dumb reverse proxy
serving the same `/stream/*` contract if that ever hurts.

## ADR-005: Read-time visibility, never denormalized (D13)

**Decision**: VOD privacy is one `visibility` field on `streams`, checked
against the caller's role in every read path (`listArchive`, `streams.get`,
`clips.*`). Clips never copy visibility; they derive it from their source at
read time.

**Consequence**: Flipping a VOD private instantly hides it and all its clips
(SC-008) with zero state to keep in sync. Listing-level privacy only — the
recording file on the media host is still fetchable by exact URL (future ops:
signed URLs).

## ADR-006: Clips are pointers (D14)

**Decision**: A clip is `(streamId, start, end, title?)` — a reference into a
public archived VOD, ≤15 seconds, validated in the mutation. Playback is a
client-side seek of the source recording. No video processing, no copies.

## ADR-007: Presence by heartbeat, count on read (D4)

**Decision**: One `presenceSessions` row per viewer (anonymous included, via
client session ID), heartbeat refreshes `lastSeen` ~20s, viewer count = rows
with `lastSeen > now − 60s`. Never a stored counter. Cron purges stale rows.

**Ceiling**: count-on-read is O(viewers) per subscriber — switch to
`@convex-dev/presence` or a sharded counter past ~1k concurrent viewers.

## ADR-008: Identity mirrors Clerk; deletions keep chat history (D3, D11)

**Decision**: `users` mirrors Clerk via svix-verified webhook plus a
session-time `users.ensure` upsert as the gap-filler. `user.deleted` removes
only the users row; chat messages keep their dangling `userId` and readers
render "Deleted user".

## ADR-009: Live URLs are derived server-side (D5)

**Decision**: When publishing starts, Convex derives `liveUrl` from the
stream's `ingestKey` and `MEDIA_SERVER_HLS_BASE`; admins no longer paste it.

**Consequence**: The stored playback URL always matches the active publish
credential and configured media server.
