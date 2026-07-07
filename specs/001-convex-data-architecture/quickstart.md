# Quickstart: Validating the Convex Data Architecture

## Prerequisites

- `pnpm install` done; Convex project linked (`npx convex dev` once, follow login prompts)
- Clerk env vars set (`.env.local`): publishable + secret keys, `CLERK_FRONTEND_API_URL`
- For webhook validation: `CLERK_WEBHOOK_SECRET` set in the Convex deployment env

## Run

```bash
npx convex dev        # terminal 1 — backend, watches convex/
pnpm dev              # terminal 2 — Next.js frontend
```

## Automated validation

```bash
pnpm test             # vitest + convex-test suite
pnpm exec tsc --noEmit
```

The suite must cover the four invariants from [research.md](research.md):

1. **Single live stream** (D2): `goLive` on stream B while stream A is live → throws; A ends → B can go live.
2. **Chat rules** (D5/D8): send on non-live stream → throws; two sends <2s apart → second throws; `remove` hides the message from `chat.list`; non-admin calling `chat.remove` → throws.
3. **Playback ordering** (D7): save with older `updatedAt` after a newer one → position unchanged.
4. **Presence freshness** (D4): sessions with stale `lastSeen` don't count; heartbeat revives.

## Manual end-to-end check (two browsers)

1. Seed: as an admin user (set `role: "admin"` on your user row via `npx convex dashboard`), create a stream scheduled for now with a test HLS URL.
2. Browser A (signed in) + Browser B (incognito, anonymous) both open the site → both show the upcoming stream.
3. Admin runs `goLive` → **both browsers flip to live without refresh** (FR-003 / SC-001) and viewer count shows 2 (SC-007).
4. A posts a chat message → appears in B within ~2s (SC-006). B (anonymous) has no compose box.
5. Admin removes the message → disappears in both.
6. Admin runs `end`, then `attachRecording` with a VOD URL → stream appears in archive, playable; chat is read-only.
7. A watches the archive past 5 min, closes the tab, reopens → resume offered at ~5 min (SC-003). B sees no resume behavior.

Expected outcome: every step observes changes reactively — zero manual refreshes anywhere. Entities and rules referenced: [data-model.md](data-model.md); function surface: [contracts/convex-functions.md](contracts/convex-functions.md).
