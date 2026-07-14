# Contract: Convex Functions (Stream Ingest)

New and changed registered functions in `convex/streams.ts` (+ helpers in
`convex/lib/ingest.ts`). Every function is tested through its registered entry point per the
constitution. Signatures use Convex validators.

## Admin-facing (api.*)

### `query streams.revealIngestKey`
```
args:    { streamId: v.id("streams") }
returns: v.union(v.string(), v.null())   // the raw ingestKey, or null if none set
guard:   requireAdmin(ctx)               // throws "Admin only" for non-admins
```
- Non-admin caller → throws (never returns a key). This is the ONLY read path that exposes the
  raw key (FR-002).

### `mutation streams.rotateIngestKey`
```
args:    { streamId: v.id("streams") }
returns: v.string()                      // the NEW key (admin sees it once here)
guard:   requireAdmin(ctx)
```
- Generates a fresh URL-safe key (D4), writes it, bumps `publishEpoch` (D7).
- Allowed while `live` (drops the active broadcast on next auth); caller UI warns.

### `mutation streams.create` (modified)
```
args:    { title, description?, scheduledStart, }   // liveUrl arg REMOVED (now derived)
returns: v.id("streams")
guard:   requireAdmin(ctx)
```
- Now also generates and stores `ingestKey` on insert. `liveUrl` is no longer an accepted arg
  (D5) — remove it from `create` and `update`.

### `mutation streams.end` / `streams.goLive` (retained, FR-013)
- Signatures are unchanged. `goLive` requires `ingestActive === true` and throws
  `No active ingest` otherwise; when armed, it sets `status="live"`, `actualStart`, the derived
  `liveUrl`, and bumps `publishEpoch` as before. `end` additionally bumps `publishEpoch` so a
  pending `finalizePublishEnd` from a stale publish can't re-fire against a manually-restarted
  stream.

## Internal (internal.*) — called by the HTTP actions

### `internalMutation streams.beginPublish`
```
args:    { streamKey: v.string() }
returns: v.object({ ok: v.boolean() })   // ok=false ⇒ HTTP action returns 403
```
- For an eligible stream (status ∈ {scheduled, live}), sets `ingestActive=true` and bumps
  `publishEpoch`. It does not change `status`, `actualStart`, or `liveUrl`. A re-arriving publish
  is adopted as a reconnect; dual-publish rejection is delegated to the media server (single
  publisher per path, D6/FR-009).

### `internalMutation streams.endPublish`
```
args:    { streamKey: v.string() }
returns: v.null()
```
- Sets `ingestActive=false` immediately. If the stream is `live`, also schedules
  `finalizePublishEnd` after `GRACE_MS` with the current `publishEpoch`; a non-live stream is
  only disarmed. Unknown keys remain an idempotent no-op (D1).

### `internalMutation streams.finalizePublishEnd`
```
args:    { streamId: v.id("streams"), epoch: v.number() }
returns: v.null()
```
- Ends the stream (`status="ended"`, `actualEnd=now`) ONLY if `stream.publishEpoch === epoch`
  AND status is still `live`; otherwise no-op (reconnect happened, D1/FR-012).

### `internalQuery streams.originForLive` (modified)
```
args:    {}
returns: v.union(v.string(), v.null())
```
- Now returns the **derived** `${MEDIA_SERVER_HLS_BASE}/live/${ingestKey}/index.m3u8` for the
  live stream (D5) instead of a stored pasted URL. Consumed only by the proxy's
  `/stream-origin` action; never client-visible.

## Changed helper

### `sanitize(stream, isAdmin)` (modified)
- In addition to redacting `liveUrl`/`recordingUrl` for non-admins, strips `ingestKey`,
  `ingestActive`, and `publishEpoch` from the returned document for non-admins (SC-003).
  Admins receive the full document.

## Helper module `convex/lib/ingest.ts` (new)
```
generateIngestKey(): string                       // Web Crypto, URL-safe base64url (D4)
deriveLiveUrl(base: string, key: string): string  // `${base}/live/${key}/index.m3u8` (D5)
```
- Pure functions, unit-tested through exports.

## Test surface (written first, must fail first)

| Test file | Covers |
|-----------|--------|
| `convex/__tests__/streams.key.test.ts` | `revealIngestKey` admin gate; `rotateIngestKey` new value + epoch bump; `sanitize` strips key/ingest state for non-admin, keeps them for admin |
| `convex/__tests__/ingest.lifecycle.test.ts` | `beginPublish` arms without go-live; `goLive` active-ingest gate; `endPublish` disarm + grace end; reconnect (epoch bump) makes stale finalize a no-op; manual `end` bump |
| `convex/__tests__/ingest.auth.test.ts` | `/ingest/publish` + `/ingest/unpublish` via `t.fetch`: secret gate (403), unknown key (403), ineligible status (403), arm/disarm happy path (200) |
| `convex/lib/ingest.test.ts` | `generateIngestKey` entropy/URL-safety; `deriveLiveUrl` shape |
