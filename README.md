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

5. **Set the web-side proxy secret** in `.env.local` (same value as step 4):

   ```env
   STREAM_PROXY_SECRET=<same value as in the Convex env>
   ```

   The proxy derives the Convex HTTP-actions URL from `NEXT_PUBLIC_CONVEX_URL`
   (`.convex.cloud` → `.convex.site`). Running the local backend? Set
   `NEXT_PUBLIC_CONVEX_SITE_URL` (e.g. `http://127.0.0.1:3211`) explicitly.

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

## Troubleshooting

- **Auth not working?** Confirm the Clerk Convex JWT template exists and
  `CLERK_FRONTEND_API_URL` is set in the Convex env, then let `npx convex dev` re-sync.
- **`/stream/...` returns 404/403?** Nothing live returns 404 by design; 403 from
  `/stream-origin` means `STREAM_PROXY_SECRET` is missing or mismatched between
  `.env.local` and the Convex env.
- **Can't connect to Convex?** Keep `npx convex dev` running (it *is* the local backend
  in anonymous mode) and check `NEXT_PUBLIC_CONVEX_URL`.
