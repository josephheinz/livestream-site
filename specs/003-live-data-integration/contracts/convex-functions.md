# Contract: Convex function surface (delta + consumed)

Baseline contract: [001 convex-functions](../../001-convex-data-architecture/contracts/convex-functions.md).
This feature adds the `bans` module, amends two mutations, and otherwise only consumes.

## New module: `convex/bans.ts`

### `bans.list` (query, admin-only)
- Args: none
- Returns: active bans joined with user display data:
  `Array<{ _id, userId, userName, reason, expiresAt?: number }>`
- Errors: `"Admin only"` for non-admin/anonymous callers.

### `bans.ban` (mutation, admin-only)
- Args: `{ userId: Id<"users">, reason: string, expiresAt?: number }`
- Behavior: creates the ban; if the user already has an active ban, updates it in
  place (no stacking). Banning is effective on the target's next send.
- Errors: `"Admin only"`; `"User not found"`; empty `reason` rejected.

### `bans.unban` (mutation, admin-only)
- Args: `{ userId: Id<"users"> }`
- Behavior: removes/expires the user's active ban; no-op if none.
- Errors: `"Admin only"`.

### Internal helper: `convex/lib/bans.ts → isBanned(ctx, userId): Promise<boolean>`
- Active = row exists and (`expiresAt` absent or `> Date.now()`).
- Black-box tested through the mutations that use it (constitution I).

## Amended mutations

### `chat.send`
- New guard (after `requireUser`, before insert): if caller is banned →
  throw `"You are banned from chat"` (exact string is the composer's signal to show
  the banned notice, research D5). All existing behavior unchanged.

### `reactions.send`
- Same guard, same error. (Parity enforcement; the reaction stream stays unwired in
  the UI per clarification 4.)

## Consumed surface (unchanged — listed for wiring reference)

| Function | Used by |
|----------|---------|
| `streams.getLive` | Watch state, banner live dot, dashboard status, ticker |
| `streams.listUpcoming` | Off-air next-slot, ticker, go-live target |
| `streams.update` | Title editing (heading + dashboard title card) |
| `streams.create` / `goLive` / `end` | Dashboard go-live control (research D8) |
| `chat.list` | Chat panel history + live tail |
| `chat.send` | Composer |
| `emojis.list` | Emoji picker + `:name:` token rendering |
| `presence.heartbeat` / `leave` / `count` | `lib/presence.ts` hook, viewer count |
| `users.me` / `users.ensure` | Admin gating, identity (ensure already wired) |
