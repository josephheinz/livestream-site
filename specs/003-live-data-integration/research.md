# Research: Live Data Integration

All Technical Context unknowns resolved. Decisions numbered D1–D10 for reference from
plan/tasks.

## D1 — HLS playback library

- **Decision**: `hls.js`, lazy-loaded in the Player client component; fall back to
  native HLS (`video.canPlayType('application/vnd.apple.mpegurl')`) on Safari/iOS.
- **Rationale**: Chromium/Firefox cannot play HLS natively; the 001 proxy serves
  standard HLS at `/stream/live.m3u8`. hls.js is the de-facto minimal MSE client with
  built-in retry/recovery hooks (covers FR-004's transient-interruption recovery).
- **Alternatives considered**: native-only (loses Chrome/Firefox — most viewers);
  video.js / @mux/mux-player (full player chrome we'd fight the design system to hide);
  hand-rolled MSE (strictly worse hls.js).

## D2 — Ban data model & enforcement

- **Decision**: New `bans` table: `{ userId, reason, expiresAt?: number, createdBy }`,
  index `by_user ["userId"]`. Helper `isBanned(ctx, userId)` (active = no `expiresAt`
  or `expiresAt > now`). Admin-only `bans.ban` / `bans.unban` / `bans.list` (list joins
  user names for the Dashboard table). Enforcement: guard at the top of `chat.send` and
  `reactions.send` with a distinct error message the composer can surface (US2-6).
- **Rationale**: The 002 Dashboard table renders user/reason/expires — a dedicated
  table carries that data naturally and supports temporary bans via `expiresAt`; a
  boolean on `users` couldn't. Expiry checked at read/enforce time — no cron needed.
- **Alternatives considered**: flag + fields on `users` (pollutes the identity row,
  no history); moderation-actions event log (YAGNI for one admin).

## D3 — Which stream the Watch page binds to

- **Decision**: `streams.getLive` first; when null, first result of
  `streams.listUpcoming` supplies the off-air title/next-slot; when both empty, a
  plain off-air state with the channel name only.
- **Rationale**: Matches the 002 shell's two states (live / off-air with "next slot")
  using only existing queries.
- **Alternatives considered**: new `streams.current` query (unneeded composition).

## D4 — Presence heartbeat client

- **Decision**: `lib/presence.ts` hook: `sessionId = crypto.randomUUID()` kept in
  `sessionStorage` (per-tab), `presence.heartbeat` every 20 s while the Watch page is
  mounted and visible, `presence.leave` on `pagehide`/unmount. Viewer count from
  `presence.count`.
- **Rationale**: Backend freshness window is 60 s; 20 s heartbeats survive one dropped
  request. Per-tab ids match the backend's session model (multi-tab counts per tab, per
  backend rules — consistent with SC-004's "beyond backend rules" carve-out).
- **Alternatives considered**: @convex-dev/presence component (already rejected in 001
  research D4 until ~1k concurrent).

## D5 — Auth state → chat modes

- **Decision**: Derive `ChatMode` from Clerk: signed-out → `signedout` (read-only
  composer prompt opens the existing auth modal, wired to Clerk sign-in/up); signed-in →
  `signedin`; `banned` when the user's own send is rejected with the ban error (and a
  small `bans.me`-free approach: surface on send failure, per D2's distinct error).
  `users.ensure` already runs on session start (commit 38a1452) — reuse as-is.
- **Rationale**: Reuses 002's three chat modes exactly; no new backend query needed to
  pre-detect bans — the enforcement error is the source of truth (FR-012's "clear
  feedback when blocked").
- **Alternatives considered**: a `bans.me` query to pre-render the banned notice
  (nicer UX, one more surface; can be added later without spec change).

## D6 — Custom emojis in messages

- **Decision**: Composer picker lists `emojis.list` (name + storage URL). Custom emojis
  embed in the message body as `:name:` tokens; the chat renderer replaces known active
  tokens with inline `<img>`; unknown/deactivated tokens render as literal text.
  Unicode emoji are just text.
- **Rationale**: Keeps `chatMessages.body` a plain string (schema untouched), degrades
  gracefully when an emoji is deactivated (edge case in spec), and works identically in
  history and live tail. Emoji-only messages are the reactions (clarification 4).
- **Alternatives considered**: structured message segments in schema (migration +
  breaking 001 contract for cosmetic gain).

## D7 — Dashboard stat mapping

- **Decision**: The four existing stat cards map to: **Status** ← `streams.getLive`
  (ON/OFF AIR); **Watching now** ← `presence.count` for the live stream ("—" off air);
  **Connections live** ← "0/0" honest empty (backend tracks no restream targets);
  **Active bans** ← `bans.list` length. External Connections card renders an
  explicit empty state.
- **Rationale**: Every figure backend-derived (FR-013) without inventing backend
  surface beyond the clarified ban addition.
- **Alternatives considered**: message-count stat (needs a new aggregate query —
  out of scope).

## D8 — Go-live control wiring

- **Decision**: Button calls `streams.goLive(streamId)` on the next upcoming stream
  (creating one via `streams.create` if none exists — title defaulted from the title
  card) and `streams.end(streamId)` when live. Encoder stays independent
  (clarification 3).
- **Rationale**: Uses the three existing admin-gated mutations; "create if none" keeps
  the admin out of a dead-end when no stream row was pre-scheduled.
- **Alternatives considered**: display-only control (rejected in clarification 3).

## D9 — Ticker content on real routes

- **Decision**: Ticker items derive from backend state: next broadcast time
  (`listUpcoming`), live status (`getLive`). Static marketing lines from mock-data are
  dropped from real routes (they're placeholder content under FR-018/SC-005).
- **Rationale**: SC-005 crawl must find only backend-derived content.
- **Alternatives considered**: keeping curated static lines (fails the spec's
  placeholder test; a CMS-ish ticker table is YAGNI).

## D10 — Degraded state (backend unreachable)

- **Decision**: While the initial Convex queries are `undefined` past a short grace
  window, or the client reports disconnected, show an explicit "connection lost /
  retrying" strip; never render mock content. Implemented once in a small shared
  component used by both routes.
- **Rationale**: FR-019 requires an explicit degraded state; Convex `useQuery`
  returning `undefined` + the client's connection state give the needed signals
  without new infrastructure.
- **Alternatives considered**: SSR preloading + error boundaries only (misses the
  steady-state disconnect case).
