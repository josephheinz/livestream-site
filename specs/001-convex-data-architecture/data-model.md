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

**Rules**: Upserts only ever come from Clerk data (webhook or authenticated session). `user.deleted` webhook deletes the row; chat messages are NOT cascaded — they remain, and read queries resolve missing authors to a "Deleted user" fallback (FR-005).

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
| `liveUrl` | `v.optional(v.string())` | **origin** HLS URL on node-media-server (may embed the stream key) — never returned to non-admins (FR-022) |
| `recordingUrl` | `v.optional(v.string())` | **origin** URL of the captured recording; presence ⇒ archived/playable — never returned to non-admins (FR-022) |
| `visibility` | `v.union(v.literal("public"), v.literal("private"))` | archive/VOD visibility (FR-019); private hides the VOD and its clips from non-admins |

**Indexes**: `by_status` on `["status", "scheduledStart"]` — serves "the live stream" (at most one row), "upcoming, soonest first" (range on scheduledStart), and "archive" (status ended, newest-first via order desc, filter recordingUrl set).

**State transitions** (all admin-only mutations, FR-008/FR-010):

```
scheduled ──goLive──▶ live ──end──▶ ended ──attachRecording──▶ ended+recordingUrl ("archived")
scheduled ──cancel──▶ canceled
```

- `goLive`: rejects if any other stream is live (transactional check, research D2); sets `actualStart`.
- `end`: only from `live`; sets `actualEnd`.
- `attachRecording`: only on `ended`; sets `recordingUrl` (the file node-media-server wrote to disk, served statically).
- `setVisibility`: admin-only toggle of `visibility`; orthogonal to lifecycle status.
- `cancel`: only from `scheduled` — handles the "never went live" edge case.
- No hard deletes; `canceled`/`ended` rows are retained (spec assumption).
- Rows are created with `visibility: "public"`.
- **URL sanitization (FR-022)**: every public read path strips `liveUrl`/`recordingUrl` and substitutes same-origin proxy paths (`/stream/live.m3u8` for the single live stream, `/stream/vod/<streamId>.m3u8` for recordings); the proxy layer maps those paths back to origin URLs server-side. Origin URLs appear only in admin reads.

### chatMessages

| Field | Type | Notes |
|---|---|---|
| `streamId` | `v.id("streams")` | |
| `userId` | `v.id("users")` | signed-in only (FR-013) |
| `body` | `v.string()` | non-empty, max 500 chars, validated in mutation |
| `removed` | `v.boolean()` | soft-delete for moderation (research D8) |

**Indexes**: `by_stream` on `["streamId"]` (list, ordered by `_creationTime`), `by_user_and_stream` on `["userId", "streamId"]` (rate-limit lookback, research D5)

**Rules**: Writable only while the stream is live (FR-017, checked in mutation). Reads filter `removed` and resolve deleted authors to a "Deleted user" fallback. Rate limit: ≥2s between messages per user per stream.

### reactions

Ephemeral by policy, not by storage (research D6).

| Field | Type | Notes |
|---|---|---|
| `streamId` | `v.id("streams")` | |
| `userId` | `v.id("users")` | |
| `kind` | `v.string()` | a unicode emoji (the character itself, ≤16 chars) or `custom:<customEmojis _id>` |

**Indexes**: `by_stream` on `["streamId"]`

**Rules**: Live streams only. `custom:` kinds must reference an existing, active customEmojis row (checked in mutation, FR-018). Clients read the trailing ~30s; a cron purges rows older than 1h.

### customEmojis

Admin-managed reaction images (FR-018). Image bytes live in Convex file storage.

| Field | Type | Notes |
|---|---|---|
| `name` | `v.string()` | display/search name, e.g. "partyparrot" |
| `storageId` | `v.id("_storage")` | uploaded image in Convex file storage |
| `active` | `v.boolean()` | deactivation blocks new reactions; history unaffected |

**Indexes**: `by_active` on `["active"]` (picker lists active only)

**Rules**: Create/deactivate are admin-only. Rows are never hard-deleted while reactions may still reference them (reactions purge within 1h, so a deactivated emoji is safely deletable after that window — not automated in v1).

### clips

A pointer into a VOD (FR-020) — no video data of its own.

| Field | Type | Notes |
|---|---|---|
| `streamId` | `v.id("streams")` | the source VOD (must be ended + recordingUrl set at creation) |
| `userId` | `v.id("users")` | creator |
| `start` | `v.number()` | seconds into the recording |
| `end` | `v.number()` | seconds; `end > start`, `end - start ≤ 15` |
| `title` | `v.optional(v.string())` | ≤100 chars |
| `removed` | `v.boolean()` | soft-delete by creator or admin (FR-021) |

**Indexes**: `by_stream` on `["streamId"]` (clips of a VOD), `by_user` on `["userId"]` ("my clips")

**Rules**: Create requires auth + an archived, **public** source VOD; validation of start/end bounds happens in the mutation (duration is unknowable server-side — player clamps, spec edge case). Reads filter `removed` and drop clips whose source VOD is private unless the caller is admin — visibility is always derived from the source at read time, never copied.

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
users 1 ──── n chatMessages   n ──── 1 streams   (author may be deleted → fallback)
users 1 ──── n reactions      n ──── 1 streams
users 1 ──── n clips          n ──── 1 streams   (visibility derived from stream at read)
users 0..1 ─ n presenceSessions n ── 1 streams   (userId optional — anonymous)
reactions n ─(kind "custom:<id>")─ 1 customEmojis
```

No other relations between interaction tables; everything joins through `streams` or `users`.
