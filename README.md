# Livestream Site

A public livestream site: Next.js 16 + Convex (backend/database) + Clerk (auth) +
Tailwind/shadcn. Video is served by a self-hosted [node-media-server](https://github.com/illuspas/Node-Media-Server)
(RTMP ingest, HLS out, recordings on its disk) — Convex stores **URLs only, never video bytes**.
Viewers get same-origin `/stream/...` proxy paths so the media server's host and stream key
never reach the browser.

Design docs live in [specs/001-convex-data-architecture/](specs/001-convex-data-architecture/);
load-bearing decisions in [docs/ADR.md](docs/ADR.md).

## Requirements

- **Node.js 20.9+** (Next.js 16 minimum; Node 20 LTS or newer recommended)
- **pnpm 10+** (this repo uses pnpm — the lockfile is `pnpm-lock.yaml`; v11 is what CI/dev use)
- A [Clerk account](https://clerk.com) (free tier is fine)
- A [Convex account](https://convex.dev) for cloud dev — or run the local anonymous backend
- For actual video playback: a node-media-server instance (outside this repo)

## First-time setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Link Convex** (creates/updates `.env.local`)

   ```bash
   npx convex dev
   ```

   Choose a cloud dev deployment (log in) or "Start a local backend" for anonymous local dev.
   Leave this running — it deploys `convex/` functions on save.

3. **Set up Clerk**
   - In the [Clerk dashboard](https://dashboard.clerk.com): create an app, then copy
     **API Keys → Publishable Key / Secret Key** into `.env.local`:

     ```env
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
     CLERK_SECRET_KEY=sk_test_...
     ```

   - Create a **JWT Template → Convex** and copy its Issuer URL.

4. **Set Convex deployment environment variables** (Convex dashboard → Settings →
   Environment Variables, or `npx convex env set NAME value`):

   | Variable | Purpose |
   | --- | --- |
   | `CLERK_FRONTEND_API_URL` | Clerk JWT issuer URL (read by `convex/auth.config.ts`) |
   | `CLERK_WEBHOOK_SECRET` | svix secret for the `/clerk-users-webhook` endpoint (Clerk dashboard → Webhooks; point the webhook at `https://<deployment>.convex.site/clerk-users-webhook`) |
   | `STREAM_PROXY_SECRET` | shared secret guarding the `/stream-origin` endpoint used by the HLS proxy |
   | `INGEST_WEBHOOK_SECRET` | shared secret that must match the media server's `x-ingest-secret` header value |
   | `MEDIA_SERVER_HLS_BASE` | base URL of the media server's HLS output |

5. **Set the web-side proxy secret** in `.env.local` (same value as step 4):

   ```env
   STREAM_PROXY_SECRET=<same value as in the Convex env>
   ```

   The proxy derives the Convex HTTP-actions URL from `NEXT_PUBLIC_CONVEX_URL`
   (`.convex.cloud` → `.convex.site`). Running the local backend? Set
   `NEXT_PUBLIC_CONVEX_SITE_URL` (e.g. `http://127.0.0.1:3211`) explicitly.
   Keep `INGEST_WEBHOOK_SECRET` and `MEDIA_SERVER_HLS_BASE` in the Convex
   deployment environment; they do not belong in `.env.local`.

## Stream ingest

Publish to `rtmp://<media-host>/live/<ingestKey>`. HLS must be served at
`${MEDIA_SERVER_HLS_BASE}/live/<ingestKey>/index.m3u8`. The media server's
publish hooks call `POST /ingest/publish` and `POST /ingest/unpublish` on the
Convex deployment's `.site` host with an `x-ingest-secret` header matching
`INGEST_WEBHOOK_SECRET`. See
[the ingest HTTP contract](specs/004-stream-ingest/contracts/ingest-http.md) for details.

**Encoder settings (latency):** set the keyframe interval to **2s** in OBS
(Settings → Output → Streaming → Keyframe Interval; the default `0 = auto` means
~8s). The HLS transmux stream-copies, so segments can only split on keyframes —
8s keyframes produce ~25s of viewer delay; 2s keyframes bring it to ~4-6s.

## Running the app

Two terminals:

```bash
npx convex dev   # terminal 1 — Convex backend, watches convex/
pnpm dev         # terminal 2 — Next.js at http://localhost:3000
```

To make yourself an admin: sign in once (so your user row exists), then set
`role: "admin"` on your row in the `users` table via `npx convex dashboard`.
Admins create streams, go live/end, attach recordings, toggle VOD visibility,
moderate chat, and manage custom emojis.

## Tests & checks

```bash
pnpm test               # vitest + convex-test (39 tests)
pnpm exec tsc --noEmit  # typecheck
pnpm lint               # eslint
```

The full manual validation walkthrough (two browsers, reactive updates, chat,
clips, privacy, key-leak check) is in
[specs/001-convex-data-architecture/quickstart.md](specs/001-convex-data-architecture/quickstart.md).

## Environment variables reference

| Variable | Where it lives | Notes |
| --- | --- | --- |
| `CONVEX_DEPLOYMENT` | `.env.local` | auto-written by `npx convex dev` |
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` | auto-written by `npx convex dev` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local` | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | `.env.local` | Clerk dashboard → API Keys |
| `STREAM_PROXY_SECRET` | `.env.local` **and** Convex env | must match on both sides |
| `NEXT_PUBLIC_CONVEX_SITE_URL` / `CONVEX_SITE_URL` | `.env.local` | only when the HTTP-actions URL isn't derivable (local backend) |
| `CLERK_FRONTEND_API_URL` | Convex env | Clerk JWT issuer (auth config) |
| `CLERK_WEBHOOK_SECRET` | Convex env | Clerk webhook verification |
| `INGEST_WEBHOOK_SECRET` | Convex env | must match the media server's `x-ingest-secret` header value |
| `MEDIA_SERVER_HLS_BASE` | Convex env | base URL of the media server's HLS output |

## Troubleshooting

- **Auth not working?** Confirm the Clerk Convex JWT template exists and
  `CLERK_FRONTEND_API_URL` is set in the Convex env, then let `npx convex dev` re-sync.
- **`/stream/...` returns 404/403?** Nothing live returns 404 by design; 403 from
  `/stream-origin` means `STREAM_PROXY_SECRET` is missing or mismatched between
  `.env.local` and the Convex env.
- **Can't connect to Convex?** Keep `npx convex dev` running (it *is* the local backend
  in anonymous mode) and check `NEXT_PUBLIC_CONVEX_URL`.
