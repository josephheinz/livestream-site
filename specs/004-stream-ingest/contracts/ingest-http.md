# Contract: Ingest HTTP Actions (media server → backend)

Two secret-guarded Convex HTTP actions the external media server calls from its publish auth
hooks. Registered in `convex/http.ts`, guarded by `INGEST_WEBHOOK_SECRET` via the
`x-ingest-secret` header (mirrors the existing `/stream-origin` + `STREAM_PROXY_SECRET`
pattern, D3). Server-to-server only; never called from a browser.

Base URL: the Convex deployment's `.site` host (same host as `/stream-origin`).

> **Naming**: the wire parameter `streamKey` (the RTMP path segment the media server sends) is
> the same value as the stored `streams.ingestKey` field and the spec's "ingest key" — three
> names, one secret.

---

## `POST /ingest/publish`  — authorize + arm

Called by the media server's `on_publish` (pre-publish) hook. A non-2xx response MUST cause
the media server to reject the RTMP publish.

**Request**

```
POST /ingest/publish
x-ingest-secret: <INGEST_WEBHOOK_SECRET>
content-type: application/json

{ "streamKey": "<ingestKey from the RTMP publish path>" }
```

**Behavior** (delegates to `internal.streams.beginPublish`, D6)

1. Missing/incorrect secret → `403`.
2. Missing `streamKey` → `400`.
3. `streamKey` resolves to no stream (`by_ingestKey`) → `403` (deny).
4. Target stream status ∉ {`scheduled`, `live`} → `403` (publish to ended/canceled).
5. Otherwise: set `ingestActive=true` and bump `publishEpoch` → `200`. Do not change `status`,
   `actualStart`, or `liveUrl`; the admin's gated Go Live action does that deliberately. A
   re-arriving publish is adopted as a reconnect; two publishers on one path are prevented by
   the media server, not this endpoint (FR-009/D6).

**Responses**

| Status | Meaning |
|--------|---------|
| `200`  | Publish authorized; stream is armed, not automatically live |
| `400`  | Malformed request (no `streamKey`) |
| `403`  | Denied (bad secret, unknown key, or ineligible stream) |

Response body is not consumed by the media server; return a minimal JSON `{ "ok": true }` /
`{ "ok": false }` for debuggability.

---

## `POST /ingest/unpublish`  — schedule graceful end

Called by the media server's `on_publish_done` (done-publish) hook, including on socket
close/network death.

**Request**

```
POST /ingest/unpublish
x-ingest-secret: <INGEST_WEBHOOK_SECRET>
content-type: application/json

{ "streamKey": "<ingestKey>" }
```

**Behavior** (delegates to `internal.streams.endPublish`, D1)

1. Missing/incorrect secret → `403`.
2. `streamKey` resolves to no stream → `200` no-op (idempotent).
3. Otherwise: set `ingestActive=false` immediately. If the stream is `live`, capture the current
   `publishEpoch` and schedule `internal.streams.finalizePublishEnd({ streamId, epoch })` after
   `GRACE_MS`; if it is not live, do not schedule finalization → `200`.

`finalizePublishEnd` ends the stream (`status="ended"`, `actualEnd=now`) **only if**
`stream.publishEpoch === epoch` (no reconnect happened in the window, D1); otherwise no-op.

**Responses**: `200` (accepted / no-op), `403` (bad secret).

---

## Notes for media-server configuration (out-of-repo ops)

- RTMP publish URL: `rtmp://<media-host>/live/<ingestKey>`; the `<ingestKey>` path segment is
  what the hooks send as `streamKey`.
- HLS output must be served at `${MEDIA_SERVER_HLS_BASE}/live/<ingestKey>/index.m3u8` so the
  backend's derived `liveUrl` (D5) resolves.
- The `x-ingest-secret` header value must equal the Convex `INGEST_WEBHOOK_SECRET`.
- Configuring the media server itself is **out of scope** for this feature (backend contract
  only, per the 2026-07-14 clarification).
