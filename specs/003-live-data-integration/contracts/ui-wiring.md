# Contract: UI wiring (component ↔ backend binding)

What each shell component binds to once placeholders are removed. Visuals from 002 are
frozen (SC-007); only data sources change. `?live=` / `?chat=` query params are removed
from `/` and `/dashboard` (FR-006); `/design-system` keeps mock-data.

## Shared chrome (both routes)

| Component | Binding |
|-----------|---------|
| `site/banner.tsx` | live dot ← `streams.getLive !== null` |
| `site/ticker-tape.tsx` | items derived from `getLive` + `listUpcoming` (D9) |
| `site/auth-modal.tsx` | Clerk sign-in/sign-up (opens from banner + composer prompt) |
| degraded strip (new, shared) | Convex connection state / initial-load grace (D10) |

## Watch (`/`)

| Component | Binding |
|-----------|---------|
| `watch/player.tsx` | live: hls.js ← `/stream/live.m3u8` when `getLive` (D1); off-air: existing off-air visual |
| `watch/stream-heading.tsx` + `stream-title.tsx` | title ← bound stream (D3); editable only for admin (`users.me.role === "admin"`), persists via `streams.update` |
| `watch/chat-panel.tsx` | messages ← `chat.list` (live tail via reactive query); viewers ← `presence.count`; mode ← Clerk auth + ban error (D5); composer → `chat.send`; picker ← `emojis.list`, `:name:` tokens rendered inline (D6) |
| presence | `lib/presence.ts` heartbeat while mounted (D4) |

## Dashboard (`/dashboard`)

Route is admin-gated: non-admin and signed-out users get an access-denied state,
no admin data rendered (FR-002, US3-6).

| Component | Binding |
|-----------|---------|
| `dashboard/dashboard-body.tsx` | stats per D7 (status/watching/connections/bans); go-live button → `streams.goLive`/`end` (+`create` fallback, D8) |
| `dashboard/stream-title-card.tsx` | ← current/next stream title → `streams.update` |
| `dashboard/banned-users.tsx` | table ← `bans.list`; row actions → `bans.unban`; add → `bans.ban` |
| `dashboard/external-connections.tsx` | honest empty state (backend tracks nothing) |
| `dashboard/broadcast-card.tsx` | status ← `getLive`; toggle shares go-live wiring |
