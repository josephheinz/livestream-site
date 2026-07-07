# Data Model: Convex Data Architecture

Convex schema (`convex/schema.ts`). All tables get `_id` and `_creationTime` automatically.

## Tables

### users

Mirror of the Clerk identity. Created/updated by webhook + session upsert (research D3).

| Field | Type | Notes |
|---|---|---|
| `externalId` | `v.string()` | Clerk user ID — the join key to auth |
| `name` | `v.string()` | Display name |
| `imageUrl` | `v.optional(v.string())` | Avatar |
| `email` | `v.optional(v.string())` | |
| `role` | `v.optional(v.literal("admin"))` | Absent = regular viewer |

**Indexes**: `by_externalId` on `["externalId"]`

**Rules**: Upserts only ever come from Clerk data (webhook or authenticated session). `user.deleted` webhook deletes the row; dependent rows (playback, chat) reference by ID and are either cascaded by the delete handler or tolerated as orphans by read queries (edge case in spec).

### streams

The central entity — schedule, live view, and archive are all queries over it (research D1).

| Field | Type | Notes |
|---|---|---|
| `title` | `v.string()` | |
| `description` | `v.optional(v.string())` | |
| `scheduledStart` | `v.number()` | ms epoch |
| `actualStart` | `v.optional(v.number())` | set by `goLive` |
| `actualEnd` | `v.optional(v.number())` | set by `end` |
| `status` | `v.union(v.literal("scheduled"), v.literal("live"), v.literal("ended"), v.literal("canceled"))` | |
| `liveUrl` | `v.optional(v.string())` | self-hosted HLS manifest for the live broadcast |
| `recordingUrl` | `v.optional(v.string())` | HLS manifest of the recording; presence ⇒ archived/playable |

**Indexes**: `by_status` on `["status", "scheduledStart"]` — serves "the live stream" (at most one row), "upcoming, soonest first" (range on scheduledStart), and "archive" (status ended; newest-first via order desc + filter recordingUrl set).

**State transitions** (all admin-only mutations, FR-008/FR-010):

```
scheduled ──goLive──▶ live ──end──▶ ended ──attachRecording──▶ ended+recordingUrl ("archived")
scheduled ──cancel──▶ canceled
```

- `goLive`: rejects if any other stream is live (transactional check, research D2); sets `actualStart`.
- `end`: only from `live`; sets `actualEnd`.
- `attachRecording`: only on `ended`; sets `recordingUrl`.
- `cancel`: only from `scheduled` — handles the "never went live" edge case.
- No hard deletes; `canceled`/`ended` rows are retained (spec assumption).

### playbackStates

One row per (user, stream) — research D7.

| Field | Type | Notes |
|---|---|---|
| `userId` | `v.id("users")` | |
| `streamId` | `v.id("streams")` | |
| `position` | `v.number()` | seconds into the recording |
| `updatedAt` | `v.number()` | client-supplied; writes only accepted when newer |

**Indexes**: `by_user_and_stream` on `["userId", "streamId"]` (resume lookup), `by_user` on `["userId"]` (future "continue watching" list).

**Rules**: Authenticated users only — anonymous playback persists nothing (FR-006). Stale `updatedAt` writes are silently ignored (FR-009).

### chatMessages

| Field | Type | Notes |
|---|---|---|
| `streamId` | `v.id("streams")` | |
| `userId` | `v.id("users")` | signed-in only (FR-013) |
| `body` | `v.string()` | non-empty, max 500 chars, validated in mutation |
| `removed` | `v.boolean()` | soft-delete for moderation (research D8) |

**Indexes**: `by_stream` on `["streamId"]` (list, ordered by `_creationTime`), `by_user_and_stream` on `["userId", "streamId"]` (rate-limit lookback, research D5)

**Rules**: Writable only while the stream is live (FR-017, checked in mutation). Reads filter `removed`. Rate limit: ≥2s between messages per user per stream.

### reactions

Ephemeral by policy, not by storage (research D6).

| Field | Type | Notes |
|---|---|---|
| `streamId` | `v.id("streams")` | |
| `userId` | `v.id("users")` | |
| `kind` | `v.string()` | emoji identifier, validated against a small allowlist |

**Indexes**: `by_stream` on `["streamId"]`

**Rules**: Live streams only. Clients read the trailing ~30s; a cron purges rows older than 1h.

### presenceSessions

One per connected viewer per live stream — research D4.

| Field | Type | Notes |
|---|---|---|
| `streamId` | `v.id("streams")` | |
| `sessionId` | `v.string()` | client-generated UUID — works for anonymous viewers |
| `userId` | `v.optional(v.id("users"))` | set when signed in |
| `lastSeen` | `v.number()` | refreshed by heartbeat (~20s) |

**Indexes**: `by_stream_and_lastSeen` on `["streamId", "lastSeen"]` (fresh-session count range query), `by_session` on `["streamId", "sessionId"]` (heartbeat upsert)

**Rules**: Viewer count = count of rows with `lastSeen > now − 60s` — never a stored counter (SC-007). Cron deletes rows stale > 5 min.

## Relationships

```
users 1 ──── n playbackStates n ──── 1 streams
users 1 ──── n chatMessages   n ──── 1 streams
users 1 ──── n reactions      n ──── 1 streams
users 0..1 ─ n presenceSessions n ── 1 streams   (userId optional — anonymous)
```

No relations between interaction tables; everything joins through `streams` or `users`.
