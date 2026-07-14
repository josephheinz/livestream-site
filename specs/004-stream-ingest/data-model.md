# Phase 1 Data Model: Stream Ingest

Only the existing `streams` table changes. No new tables (D2). All new fields are optional so
the current bootstrap row needs no migration.

## `streams` (modified)

| Field | Type | New? | Notes |
|-------|------|------|-------|
| `title` | string | | unchanged |
| `description` | string? | | unchanged |
| `scheduledStart` | number | | unchanged |
| `actualStart` | number? | | set by gated admin go-live |
| `actualEnd` | number? | | set on end (now also by `finalizePublishEnd`) |
| `status` | `"scheduled" \| "live" \| "ended" \| "canceled"` | | unchanged; publish start only arms, while go-live is manual |
| `liveUrl` | string? | | **now derived** server-side from key + `MEDIA_SERVER_HLS_BASE` at go-live, not pasted (D5) |
| `recordingUrl` | string? | | unchanged (attach-after-ended still works, FR-015) |
| `visibility` | `"public" \| "private"` | | unchanged |
| `ingestKey` | string? | ✅ | high-entropy, URL-safe (D4); admin-reveal-only; stripped by `sanitize` (D2) |
| `ingestActive` | boolean? | ✅ | `true` while ingest is connected; absent means false; stripped by `sanitize` for non-admins |
| `publishEpoch` | number? | ✅ | monotonic per-stream counter; bumped on `beginPublish`, `goLive`, manual end, and `rotateIngestKey`; guards the grace timer (D1). Absent ⇒ treat as 0 |

> `lastPublishAt` was considered and **dropped** (analysis remediation 2026-07-14): its only
> purpose was dual-publish detection, which is now delegated to the media server (D6). No
> other logic reads it, so per Simplicity it is not added.

### Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| `by_status` | `["status", "scheduledStart"]` | existing |
| `by_ingestKey` | `["ingestKey"]` | ✅ O(1) publish → stream mapping (FR-007) |

### Validation / invariants

- `ingestKey` is unique across streams (enforced by generation + lookup; a rotation always
  produces a fresh value). A lookup that returns >1 row is a bug.
- At most one stream is `live` at any time (existing invariant, re-checked in `goLive`).
- A stream may be published to only when `status ∈ {scheduled, live}` (D6).
- `goLive` requires `ingestActive === true` and throws `No active ingest` otherwise.
- `ingestKey` and `ingestActive` MUST never be present in a document returned to a non-admin
  (SC-003) — enforced in `sanitize()` and asserted in tests.

## State transitions (armed ingest + manual go-live)

```text
manual create() ──▶ scheduled, ingestActive=false      (key generated)
                         │
publish begins ──────────┤ ingestActive=true, publishEpoch++; status unchanged
                         │
admin Go Live ───────────┴──▶ live                     (requires ingestActive=true;
                               │                         sets actualStart/liveUrl, bumps epoch)
publish stops ────────────────┤ ingestActive=false immediately
                               │ schedule finalize after GRACE_MS
reconnect within grace ───────┤ ingestActive=true, epoch++; stale finalize is a no-op
                               ▼
finalizePublishEnd (epoch match) ──▶ ended ──(attach recording, FR-015)
OR manual End

scheduled publish stop ──▶ scheduled, ingestActive=false (no finalize)
scheduled ──manual cancel──▶ canceled     (publish to ended/canceled ⇒ rejected, D6)
```

## New / changed entities in prose

- **Ingest Key / Publish Credential** — realized as `streams.ingestKey`. Lifecycle: generated
  on `create`; revealed via admin-only `revealIngestKey`; replaced via `rotateIngestKey`
  (old value stops resolving immediately, D7).
- **Publish Session** — not a stored row; represented by `ingestActive` and `publishEpoch`.
  Start arms manual go-live; sustained absence past `GRACE_MS` drives auto-end for a live
  stream; at most one publisher per stream and one live stream site-wide.
- **Restream Destination** — deferred (US3); no schema in this feature.

## Constants

| Name | Value | Where |
|------|-------|-------|
| `GRACE_MS` | `30_000` | `convex/streams.ts` (auto-end grace, SC-005) |
| `MEDIA_SERVER_HLS_BASE` | env | Convex deployment env (D5) |
| `INGEST_WEBHOOK_SECRET` | env | Convex deployment env, shared with media server (D3) |
