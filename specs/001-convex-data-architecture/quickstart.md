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
2. **Chat rules** (D5/D8/D11): send on non-live stream → throws; two sends <2s apart → second throws; `remove` hides the message from `chat.list`; non-admin calling `chat.remove` → throws; deleted author renders as "Deleted user".
3. **Reaction kinds** (D6/D10): unicode emoji accepted; `custom:<id>` accepted only while that emoji is active; emoji create/deactivate admin-only.
4. **Presence freshness** (D4): sessions with stale `lastSeen` don't count; heartbeat revives.
5. **Clips & visibility** (D13/D14): clip creation bounds (≤15s, public archived source only); private VODs and their clips invisible to non-admins, visible to admins, restored when re-publicized.

## Manual end-to-end check (two browsers)

1. Seed: as an admin user (set `role: "admin"` on your user row via `npx convex dashboard`), create a stream scheduled for now with a test HLS URL, and upload one custom emoji.
2. Browser A (signed in) + Browser B (incognito, anonymous) both open the site → both show the upcoming stream.
3. Admin runs `goLive` → **both browsers flip to live without refresh** (FR-003 / SC-001) and viewer count shows 2 (SC-007).
4. A posts a chat message → appears in B within ~2s (SC-006). B (anonymous) has no compose box.
5. A reacts with a unicode emoji and with the custom emoji → both render in B in real time (FR-015/FR-018).
6. Admin removes the chat message → disappears in both. Admin deactivates the custom emoji → it leaves A's picker; new reactions with it fail.
7. Admin runs `end` → both browsers reflect the ended state; chat compose closes (FR-017); the stream no longer appears in the schedule.
8. Admin runs `attachRecording` with the URL of the file node-media-server recorded → the stream appears in the archive, newest-first, and plays (FR-011/SC-005).
9. A creates a 15s clip from the archived VOD → it appears instantly and plays just that segment (FR-020/SC-008). B can watch it anonymously.
10. Admin sets the VOD private → the VOD and A's clip vanish for B; admin still sees both (FR-019/SC-008). Set it public again → both return.

Expected outcome: every step observes changes reactively — zero manual refreshes anywhere. Entities and rules referenced: [data-model.md](data-model.md); function surface: [contracts/convex-functions.md](contracts/convex-functions.md).
