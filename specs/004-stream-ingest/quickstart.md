# Quickstart & Validation: Stream Ingest

Proves the feature end-to-end: generate a key, point a broadcaster at the ingest address, see
the site auto-go-live, stop, see it auto-end, and confirm the key never leaks. References
[contracts/](contracts/) and [data-model.md](data-model.md) for details.

## Prerequisites

- The base app running per [README.md](../../README.md): `npx convex dev` + `pnpm dev`, Clerk
  configured, your user row set to `role: "admin"`.
- A node-media-server instance reachable over HTTP (out-of-repo; see
  [contracts/ingest-http.md](contracts/ingest-http.md) for the required hook + path config).
- Convex deployment env set:
  - `MEDIA_SERVER_HLS_BASE` — e.g. `https://media.example.com`
  - `INGEST_WEBHOOK_SECRET` — matches the media server's `x-ingest-secret`
  - (existing) `STREAM_PROXY_SECRET`
- A broadcaster (OBS or `ffmpeg`).

## Automated checks (run first — TDD gate)

```bash
pnpm test                 # vitest + convex-test; the ingest suites must pass
pnpm exec tsc --noEmit    # types
pnpm lint
```

Per the constitution, the three ingest test files (see
[contracts/convex-functions.md](contracts/convex-functions.md)) are written and observed to
FAIL before implementation, then made to pass.

## Manual end-to-end

### 1. Key lifecycle (US2 / P2)
1. As admin on the dashboard, open a scheduled stream's **Ingest** panel → **Reveal key** and
   copy the RTMP URL `rtmp://<media-host>/live/<ingestKey>`.
2. Open the public site as a **signed-out** viewer. Inspect page source, the `current`/`getLive`
   query payloads (devtools), and `GET /stream/live.m3u8`. **Expected**: the `ingestKey` string
   appears in none of them (SC-003).

### 2. Auto go-live (US1 / P1)
3. Point the broadcaster at the copied RTMP URL and **Start Streaming**.
4. **Expected**: within ~15 s (SC-002) the stream flips to **live** with no manual "Go Live"
   click; the viewer's player shows the feed via the same-origin `/stream/live.m3u8` path.

### 3. Reconnect stays live (FR-012)
5. Briefly stop and restart the broadcaster within the grace window (<30 s).
6. **Expected**: the stream stays **live** the whole time — no ended→live flicker (epoch guard,
   D1).

### 4. Auto-end (FR-011)
7. Stop the broadcaster and wait out the grace window (~30 s, SC-005).
8. **Expected**: the stream transitions to **ended** on its own; a recording can still be
   attached afterward (FR-015).

### 5. Rotation revokes (US2 scenario 3/4)
9. Rotate the key from the dashboard, then try to publish with the OLD RTMP URL.
10. **Expected**: the publish is rejected (`/ingest/publish` → 403) within ~5 s (SC-004); the
    NEW key publishes successfully.

### 6. Rejections (edge cases / D6)
11. Publish with a random/unknown key → rejected. Publish to a second stream while one is live
    → rejected (single-live). A second publisher on the same key/path is refused by the media
    server; a re-publish of the same live stream is adopted as a reconnect, not a new session
    (FR-009/FR-012).

### 7. Data boundary (SC-007)
12. Inspect the Convex `streams` table (`npx convex dashboard`). **Expected**: only URLs, the
    key, and metadata are stored — no video bytes anywhere in Convex.

## Out of scope to validate here

- Restream / External Connections (US3) — deferred; the card remains an honest empty state.
- Standing up / configuring node-media-server itself — out-of-repo ops (backend contract only).
