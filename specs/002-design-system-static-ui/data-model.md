# Phase 1 Data Model: Design System & Static UI

**Scope**: Display/mock shapes only. Nothing here is persisted or fetched — all values live in
`lib/mock-data.ts` or local component state. Types are the TypeScript prop/data contracts the
static shells render from. No Convex schema, no backend.

## Theme

| Field | Type | Notes |
|-------|------|-------|
| mode | `'auto' \| 'light' \| 'dark'` | Selected mode. `auto` follows `prefers-color-scheme`. |
| resolved | `'light' \| 'dark'` | Effective palette after resolving `auto`. Drives the `.dark` class. |

State transitions (toggle): `auto → light → dark → auto` (cycle). Persisted in `localStorage`;
default `auto`.

## Stream (display)

| Field | Type | Example |
|-------|------|---------|
| channelName | `string` | `"NIGHTCHANNEL"` |
| streamTitle | `string` | `"CHANNEL 01 — MAIN FEED"` |
| live | `boolean` | from `?live=1`, default `false` |
| viewers | `number` | `1204` (static; no live drift) |
| quality | `string` | `"1080p"` |
| channel | `string` | `"01"` |
| day | `number` | `115` |
| nextSlot | `string` | `"21:00 ET"` |

Derived display: `live ? "ON AIR" : "OFF AIR"`; `viewersLabel = live ? formatThousands(viewers) : "OFF AIR"`.

## ChatState (display)

| Field | Type | Notes |
|-------|------|-------|
| state | `'signedin' \| 'signedout' \| 'banned'` | from `?chat=`, default `signedout` |
| messages | `ChatMessage[]` | seeded, static (no auto-append) |
| ban | `BanNotice \| null` | present only in `banned` state |

### ChatMessage

| Field | Type | Notes |
|-------|------|-------|
| id | `string` | stable key |
| user | `string` | display handle, e.g. `"orb_watcher"` |
| color | `string` | handle color (hex from prototype palette) |
| text | `string` | message body |

### BanNotice (Watch, banned state)

| Field | Type | Example |
|-------|------|---------|
| reason | `string` | `"Repeated off-topic flooding during broadcast."` |
| expires | `string` | `"2026-07-11, 00:00 ET"` |

## ExternalConnection (Dashboard, local state)

| Field | Type | Notes |
|-------|------|-------|
| id | `string` | stable key |
| platform | `string` | e.g. `"YouTube"`, `"Twitch"` |
| on | `boolean` | toggled locally |
| keyMasked | `string` | always rendered as dots — **raw key never stored/shown** (FR-018) |

Local operations (no backend): `toggle(id)`, `remove(id)`, `add({platform, key})` — `add` pushes a
new row with `on:true` and discards the raw key after masking. Empty list → dashed empty state.

## BannedUser (Dashboard, local state)

| Field | Type | Example |
|-------|------|---------|
| id | `string` | stable key |
| user | `string` | `"floodbot_44"` |
| reason | `string` | `"Spam / flooding chat"` |
| expires | `string` | `"PERMANENT"` or ISO-ish date |

Local operation: `unban(id)` removes the row. Empty list → "No active bans" message.

## DashboardStats (display, derived from mock)

| Field | Type | Notes |
|-------|------|-------|
| status | `"ON AIR" \| "OFF AIR"` | from `live` |
| watchingNow | `string` | viewers or `"—"` when off air |
| connectionsLive | `string` | `"{activeOn}/{total}"` |
| activeBans | `number` | `bannedUsers.length` |

## AuthModal (display/local state)

| Field | Type | Notes |
|-------|------|-------|
| open | `boolean` | local |
| mode | `'signin' \| 'signup'` | `signup` adds a username field |

No credentials are collected or submitted — inputs are inert; the primary button just closes the
modal (static shell).
