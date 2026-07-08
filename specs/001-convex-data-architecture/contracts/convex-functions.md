# Contracts: Convex Function Surface

The public API this feature exposes to the Next.js frontend. File layout mirrors domains: `convex/users.ts`, `convex/streams.ts`, `convex/chat.ts`, `convex/reactions.ts`, `convex/emojis.ts`, `convex/clips.ts`, `convex/presence.ts`, `convex/http.ts`, `convex/crons.ts`.

Auth notes: **public** = callable anonymously; **auth** = requires Clerk identity; **admin** = requires identity whose user row has `role: "admin"` (server-checked, throws otherwise).

**URL sanitization (FR-022)**: every stream/clip object returned to a non-admin has `liveUrl`/`recordingUrl` replaced with same-origin proxy paths (`/stream/live.m3u8` for the single live stream, `/stream/vod/<streamId>.m3u8` for recordings). The raw origin URLs — which can embed the node-media-server stream key — are returned only to admins.

## Queries (reactive subscriptions)

| Function | Args | Returns | Auth |
|---|---|---|---|
| `streams.getLive` | — | `Stream \| null` (the at-most-one live stream) | public |
| `streams.listUpcoming` | — | `Stream[]` scheduled, soonest first | public |
| `streams.listArchive` | `{ limit? }` | `Stream[]` ended with recordingUrl, newest first; private VODs included only for admins | public |
| `streams.get` | `{ streamId }` | `Stream \| null`; a private VOD returns null for non-admins | public |
| `clips.list` | `{ streamId }` | non-removed clips of that VOD, newest first; empty for non-admins if the VOD is private | public |
| `clips.get` | `{ clipId }` | `Clip \| null` (with the source's playback path, sanitized per FR-022) for share pages; null for non-admins if source is private | public |
| `clips.mine` | — | caller's clips, newest first | auth |
| `chat.list` | `{ streamId }` | last 100 non-removed messages with author name/avatar (deleted authors → "Deleted user" fallback), oldest→newest | public |
| `reactions.recent` | `{ streamId }` | reactions from the trailing 30s | public |
| `emojis.list` | — | active custom emojis with resolved image URLs | public |
| `presence.count` | `{ streamId }` | `number` of fresh sessions | public |
| `users.me` | — | `User \| null` for the caller | public (null if anon) |

## Mutations

| Function | Args | Behavior | Auth |
|---|---|---|---|
| `users.ensure` | — | Upsert caller's user row from Clerk identity (webhook gap-filler) | auth |
| `streams.create` | `{ title, description?, scheduledStart, liveUrl? }` | New `scheduled` stream | admin |
| `streams.update` | `{ streamId, ...editable fields }` | Edit schedule metadata / liveUrl | admin |
| `streams.goLive` | `{ streamId }` | `scheduled → live`; **throws if another stream is live**; sets `actualStart` | admin |
| `streams.end` | `{ streamId }` | `live → ended`; sets `actualEnd` | admin |
| `streams.attachRecording` | `{ streamId, recordingUrl }` | Only on `ended`; makes it archived/playable (URL of the file node-media-server recorded) | admin |
| `streams.setVisibility` | `{ streamId, visibility }` | Toggle public/private; private hides the VOD + its clips from non-admins | admin |
| `streams.cancel` | `{ streamId }` | `scheduled → canceled` | admin |
| `clips.create` | `{ streamId, start, end, title? }` | Validates: source is an archived public VOD, `end > start`, duration ≤15s, title ≤100 chars | auth |
| `clips.remove` | `{ clipId }` | Soft-delete; allowed for the clip's creator or an admin | auth |
| `chat.send` | `{ streamId, body }` | Validates: stream live, body 1–500 chars, ≥2s since sender's last message | auth |
| `chat.remove` | `{ messageId }` | Sets `removed: true` | admin |
| `reactions.send` | `{ streamId, kind }` | Validates: stream live; kind is a unicode emoji (≤16 chars) or `custom:<id>` of an active custom emoji | auth |
| `emojis.generateUploadUrl` | — | Returns a Convex file-storage upload URL | admin |
| `emojis.create` | `{ name, storageId }` | Saves an uploaded image as an active custom emoji | admin |
| `emojis.deactivate` | `{ emojiId }` | Sets `active: false`; new reactions with it are rejected | admin |
| `presence.heartbeat` | `{ streamId, sessionId }` | Upsert session row, refresh `lastSeen`; attaches userId if signed in | public |
| `presence.leave` | `{ streamId, sessionId }` | Delete session row (clean disconnect) | public |

## Web-layer HLS proxy (Next.js, `app/stream/[[...path]]/route.ts`)

| Route | Behavior |
|---|---|
| `GET /stream/live.m3u8` (+ segment subpaths) | Resolves the currently live stream's origin `liveUrl` server-side (Convex internal query) and relays playlist + segments from node-media-server; 404 when nothing is live. Origin host and stream key never appear in the response. |
| `GET /stream/vod/<streamId>.m3u8` (+ segment subpaths) | Same relay for the recording; returns 404 for private VODs unless the caller has an admin session (Clerk-checked in the route). |

## HTTP actions (`convex/http.ts`)

| Route | Source | Behavior |
|---|---|---|
| `POST /clerk-users-webhook` | Clerk webhook (svix-signed; signature verified, else 400) | `user.created`/`user.updated` → upsert users row; `user.deleted` → delete users row (chat messages remain; readers show "Deleted user") |

## Crons (`convex/crons.ts`)

| Job | Schedule | Behavior |
|---|---|---|
| `purgeStalePresence` | every 5 min | Delete presenceSessions with `lastSeen` older than 5 min |
| `purgeOldReactions` | hourly | Delete reactions older than 1h |

## Frontend data-flow summary

- **Read path**: components use `useQuery` (via `convex/react`) — every query above is a live subscription; go-live, chat, counts, schedule, and archive updates push automatically (FR-003).
- **Write path**: `useMutation` for viewer actions (chat, reactions, heartbeats) and admin actions (lifecycle, moderation, emoji management; emoji upload is generateUploadUrl → POST file → create).
- **Identity**: Clerk provides the JWT (`auth.config.ts` already wired); Convex functions read it via `ctx.auth.getUserIdentity()` and join to `users` by `externalId`.
