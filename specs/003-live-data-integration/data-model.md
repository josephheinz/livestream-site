# Data Model: Live Data Integration

This feature consumes the spec-001 schema unchanged and adds exactly one table.
Full existing model: [001 data-model](../001-convex-data-architecture/data-model.md).

## New table

### bans

| Field | Type | Notes |
|-------|------|-------|
| `userId` | `Id<"users">` | The banned user |
| `reason` | `string` | Shown in the Dashboard table |
| `expiresAt` | `number?` | Epoch ms; absent = permanent |
| `createdBy` | `Id<"users">` | Admin who issued the ban |

**Indexes**: `by_user ["userId"]`

**Validation / rules**:
- Ban/unban/list are admin-only (`requireAdmin`).
- A ban is **active** iff `expiresAt` is absent or `expiresAt > now` — evaluated at
  enforcement time and when listing (expired rows are inert; no cron cleanup).
- At most one active ban per user matters; `bans.ban` on an already-banned user
  replaces/updates rather than stacking rows.
- Unban deletes (or expires) the row — the Dashboard table reflects it immediately.

**State transitions**: none beyond active → expired (time) / removed (unban).

## Consumed entities (unchanged)

- **streams** — status drives Watch page state; `title` edited via `streams.update`;
  lifecycle via `create`/`goLive`/`end` (admin). `sanitize` keeps proxy-only URLs for
  non-admins.
- **users** — identity from Clerk (`users.ensure` on session start); admin =
  `role === "admin"`.
- **chatMessages** — body remains a plain string; custom emojis embed as `:name:`
  tokens (research D6). `removed` soft-delete unchanged.
- **customEmojis** — picker source (`emojis.list`, active only).
- **presenceSessions** — heartbeat/leave/count as built; client supplies per-tab
  `sessionId` (research D4).
- **reactions** — table stays; `reactions.send` gains the ban guard for parity, but
  the UI does not wire the reaction stream (clarification 4).
- **clips** — untouched, unwired (clarification 2).
