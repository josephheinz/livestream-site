# Quickstart: Live Data Integration — validation guide

Proves the feature end-to-end. Automated first, then the manual two-browser pass.

## Prerequisites

- `pnpm install` (adds `hls.js` once implemented)
- Convex dev deployment configured (`npx convex dev` has run before)
- Clerk dev instance with two test users — one with `role: "admin"` on their Convex
  users row (set via dashboard or a one-off mutation), one regular
- For live playback: node-media-server (or any RTMP→HLS origin) from the 001 setup,
  with an encoder (OBS) pointed at it — see
  [001 quickstart](../001-convex-data-architecture/quickstart.md) for the origin setup

## Automated validation

```powershell
pnpm test        # all Vitest projects: convex-test (bans, chat guard) + jsdom (components)
pnpm lint
pnpm build       # Next build must pass with the rewired routes
```

Expected: green. Ban suite covers ban/unban/list auth + expiry + send-guard; component
suites cover live/off-air transitions, chat modes, emoji rendering, degraded strip,
admin gating. All 002 suites still pass unchanged (SC-007).

## Manual two-browser validation

Run `npx convex dev` + `pnpm dev`. Browser A = admin, Browser B =
viewer (regular user, second profile/incognito).

1. **Off-air baseline** — B opens `/`: off-air presentation, no mock values (SC-005),
   no player error. `?live=1` no longer forces state (FR-006).
2. **Go live** — A opens `/dashboard` (B cannot: verify B gets denied), clicks GO
   LIVE. B's Watch page flips to live and video plays within 5 s, no refresh
   (US1, SC-001; requires the RTMP origin running).
3. **Title propagation** — A edits the title (dashboard card or watch heading). B sees
   the new title ≤ 5 s (US3, SC-003).
4. **Chat + emoji** — B signs in via the modal, sends a message and a custom-emoji
   (`:name:`) message. A sees both ≤ 2 s; emoji renders as image (US2, SC-002). B
   signed-out first: composer prompts sign-in, reading still works.
5. **Presence** — with both pages open, Watching-now/viewer count ≥ 2; close B, count
   drops within the 60 s window (SC-004).
6. **Ban** — A bans B from the Banned Users table (reason required). B's next send is
   rejected with the banned notice; A unbans; B can chat again (SC-006).
7. **Go off-air** — A clicks GO OFF AIR. B transitions to off-air without refresh.
8. **Degraded state** — stop `npx convex dev`; both pages show the explicit
   connection-lost strip, not stale/mock data (FR-019).

Pass = all eight steps behave as described.
