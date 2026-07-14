# Phase 0 Research: Stream Ingest

All Technical Context items were resolvable from the existing codebase and the four
clarifications; no open NEEDS CLARIFICATION remained. Decisions below record the load-bearing
choices for Phase 1.

## D1 — Reconnect-safe auto-end via scheduler + publish epoch (not a heartbeat/cron)

**Decision**: On publish start (`beginPublish`) increment a per-stream `publishEpoch`. On
publish stop (`endPublish`) capture the current epoch and
`ctx.scheduler.runAfter(GRACE_MS, finalizePublishEnd, { streamId, epoch })`. The scheduled
`finalizePublishEnd` ends the stream **only if** the stream's epoch still equals the captured
epoch — a reconnect within the grace window bumps the epoch and the stale timer becomes a
no-op. `GRACE_MS` default = 30 000 (SC-005).

**Rationale**: Handles FR-011 (auto-end after grace) and FR-012 (no flapping on reconnect)
with one integer compare and one scheduled job — no polling, no heartbeat channel. Mirrors the
codebase's existing `ctx.scheduler.runAfter` usage in `convex/crons.ts`.

**Alternatives considered**:
- *Cron sweep of stale live streams* (like `purgeStalePresence`): rejected — node-media-server
  does not emit periodic keepalives, so there is no freshness signal to sweep on without adding
  one. The scheduler approach needs no heartbeat.
- *End immediately on `on_publish_done`*: rejected — a transient RTMP drop/reconnect would
  flap the stream ended→live, violating FR-012.
- *Total-media-server-crash safety net*: covered by the retained manual **End** control
  (FR-013) rather than new infrastructure — this is exactly why manual controls were kept.

## D2 — Key storage, exposure, and origin derivation

**Decision**: Add `ingestKey` (optional string) to `streams` with a `by_ingestKey` index.
`sanitize()` (already stripping `liveUrl` for non-admins) additionally strips `ingestKey`.
The viewer-facing `liveUrl` is **derived server-side** at go-live from the media-server base
env + key (see D5) and continues to be replaced by the same-origin proxy path in `sanitize`;
the raw key-bearing origin is only ever returned by the secret-guarded `originForLive`
internal query the proxy calls. Admins read the key through a dedicated admin-only
`revealIngestKey` query.

**Rationale**: Satisfies FR-004/FR-005 and SC-003 (key in zero viewer surfaces) by extending
the mechanism the site already trusts for `liveUrl`, rather than inventing a second redaction
path. Keeping `ingestKey` **optional** avoids a breaking migration on the existing bootstrap
row — a keyless stream simply cannot be published to until an admin generates/rotates one.

**Alternatives considered**:
- *Separate `ingestKeys` table*: rejected (Simplicity) — one-to-one with a stream, no
  independent lifecycle; a field + index is enough.
- *Required `ingestKey` with a backfill migration*: rejected for now — optional field + lazy
  generation on `create`/`rotate` is simpler and the single existing row can be rotated once.

## D3 — Media-server → backend trust boundary

**Decision**: node-media-server's publish auth hooks call two Convex HTTP actions,
`POST /ingest/publish` and `POST /ingest/unpublish`, guarded by a shared secret
`INGEST_WEBHOOK_SECRET` (header `x-ingest-secret`), exactly mirroring how `/stream-origin` is
guarded by `STREAM_PROXY_SECRET`. The browser is never involved in ingest. A non-2xx response
from `/ingest/publish` denies the publish at the media server.

**Rationale**: Reuses the established, reviewed secret-guarded-HTTP-action pattern in
`convex/http.ts`. Server-to-server only, so no CORS/auth-token surface.

**Alternatives considered**: signed JWT per call (overkill for a single trusted server);
mTLS (ops burden, out of the backend-contract-only scope).

## D4 — Key generation

**Decision**: Generate a URL-safe, high-entropy key in the Convex runtime via Web Crypto
(`crypto.getRandomValues` → base64url, ~32 bytes). Helper lives in `convex/lib/ingest.ts` and
is unit-tested through its export.

**Rationale**: No dependency; Convex runtime provides Web Crypto. URL-safe because the key
becomes an RTMP path segment and an HLS path segment (D5).

## D5 — Derived `liveUrl` from media-server base

**Decision**: New env `MEDIA_SERVER_HLS_BASE` (Convex deployment env), e.g.
`https://media.example.com`. `originForLive` returns `${base}/live/${ingestKey}/index.m3u8`
for the live stream; `beginPublish` also stores this on `stream.liveUrl` so the existing proxy
and archive paths keep working unchanged. The publish path the admin points OBS at is
`rtmp://<media-host>/live/<ingestKey>` (shown in the dashboard, admin-only).

**Rationale**: Removes the hand-pasted, key-bearing `liveUrl` (the current leak vector, FR-005)
while leaving `app/stream/[[...path]]/route.ts` untouched. Path convention matches
node-media-server defaults (`/live/<name>`).

**Alternatives considered**: keep pasting `liveUrl` (rejected — the whole point of the feature
is to stop that); key streams by `_id` instead of key in the path (rejected — the media server
only knows the key from the publish path, so keying by key makes mapping O(1) via
`by_ingestKey`).

## D6 — Eligibility & single-live enforcement on publish

**Decision**: `beginPublish` accepts a publish only when the key resolves to a stream whose
status is `scheduled` (normal go-live) or `live` (reconnect adoption), rejects `ended`/
`canceled`, and re-checks the single-live invariant (no *other* stream `live`) exactly as
`goLive` does today. Rejection = non-2xx from `/ingest/publish`. A re-arriving publish for the
*same* already-live stream is **adopted** (idempotent go-live + epoch bump), not rejected.

**Dual publish (FR-009) is delegated to the media server** (analysis remediation 2026-07-14):
node-media-server permits only one publisher per ingest path, so the backend never sees a true
second concurrent session and does not try to distinguish a duplicate from a reconnect. This
removes the ambiguous "recent `lastPublishAt`" test and the `lastPublishAt` field is dropped
(nothing reads it once dual-publish is delegated).

**Rationale**: Encodes FR-007/FR-008 and the edge cases (publish to ended, cross-stream
single-live) at the one choke point the media server calls, while keeping reconnect
(FR-012) simple and unambiguous.

## D7 — Rotation revokes in-flight publishes

**Decision**: `rotateIngestKey` writes a new key and bumps `publishEpoch`. Because the media
server authenticates the *path* key on (re)connect, the old key no longer resolves via
`by_ingestKey`, so any reconnect is denied; for an already-connected session, the next auth
callback (or the admin's manual End) drops it. Rotation on a currently-live stream is allowed
and surfaced as "this will drop the active broadcast."

**Rationale**: Satisfies FR-003 and US2 scenario 4 (leaked key mid-broadcast) without tracking
live socket handles in the backend.
