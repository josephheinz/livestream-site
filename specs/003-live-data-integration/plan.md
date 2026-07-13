# Implementation Plan: Live Data Integration

**Branch**: `feature/003-live-data-integration` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-live-data-integration/spec.md`

## Summary

Replace every placeholder in the spec-002 shells (`/` Watch, `/dashboard`) with live
Convex data from spec 001: real stream lifecycle + HLS playback through the existing
same-origin proxy, real-time chat with custom emojis (emoji messages ARE the reactions),
presence-backed viewer counts, admin dashboard with real stats, persisted title
editing, and a lifecycle-driving go-live control. One scoped backend addition: a minimal
ban capability (table + admin ban/unban + enforcement in `chat.send`/`reactions.send`).
Clips and the dedicated reaction stream stay unwired (deferred per clarifications).

## Technical Context

**Language/Version**: TypeScript 5, React 19.2, Next.js 16.1 (App Router)

**Primary Dependencies**: Convex 1.42 (`convex/react` live queries), `@clerk/nextjs` 6
(auth, already wired: `users.ensure` on session start), `motion`, Tailwind 4.
**One new dependency**: `hls.js` for in-browser HLS playback (research D1) — the proxy
exists (`app/stream/`) but nothing plays it yet.

**Storage**: Convex (existing schema + one new `bans` table, widen-only)

**Testing**: Vitest — `convex-test` for backend functions (black-box via `api.*`),
Testing Library + jsdom for components (existing `vitest` projects from 001/002)

**Target Platform**: Web (desktop + mobile browsers), single Next.js deployment

**Project Type**: Web app — Next.js frontend + Convex backend in one repo

**Performance Goals**: SC-001/SC-003 — lifecycle & title changes visible on all clients
≤ 5 s (Convex reactive queries deliver this by default); SC-002 — chat delivery ≤ 2 s

**Constraints**: Preserve all spec-002 visuals/tests unchanged (SC-007); no placeholder
data reachable on real routes (SC-005); degraded state when backend unreachable (FR-019)

**Scale/Scope**: Single channel, single admin (`users.role === "admin"`); presence
count-on-read already flagged fine to ~1k concurrent; 2 routes rewired + 1 new backend
module

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Test-First, Black-Box (NON-NEGOTIABLE)** — PASS (by design):
  - New backend surface (`bans.*`, ban enforcement in `chat.send`) gets `convex-test`
    tests written first through registered entry points, observed failing, then
    implemented — same pattern as 001's suites in `convex/__tests__/`.
  - Rewired components get jsdom tests against their exported props/rendered behavior
    (mocking `convex/react` hooks at the module boundary, not reaching into internals).
  - tasks.md will order test tasks before implementation tasks per story.
- **II. Simplicity** — PASS:
  - One new dependency (`hls.js`) — justified in research D1; native `<video>` alone
    cannot play HLS in Chromium/Firefox, and hand-rolling MSE is strictly worse.
  - Ban capability is one table + three functions + two guard call-sites; no roles
    framework, no moderation queue.
  - No state library: Convex `useQuery` is already the reactive store.

Post-design re-check (after Phase 1): still PASS — no new violations introduced; no
Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/003-live-data-integration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── convex-functions.md   # backend delta (bans) + consumed surface
│   └── ui-wiring.md          # which component binds which query/mutation
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
app/
├── page.tsx                    # Watch — rewire to live queries (drop ?live/?chat)
├── dashboard/page.tsx          # Dashboard — admin gate + live data
├── stream/[[...path]]/route.ts # existing HLS proxy (unchanged)
└── layout.tsx                  # unchanged (Clerk + Convex providers already present)

components/
├── watch/
│   ├── player.tsx              # + hls.js playback of LIVE_PROXY_PATH, error recovery
│   ├── chat-panel.tsx          # live messages, composer w/ emoji picker, auth/ban modes
│   └── stream-heading.tsx      # real title/status
├── dashboard/
│   ├── dashboard-body.tsx      # live stats, real go-live via streams.goLive/end
│   ├── banned-users.tsx        # wire to bans.list / bans.ban / bans.unban
│   ├── external-connections.tsx# honest empty state (backend tracks nothing)
│   └── stream-title-card.tsx   # persist via streams.update
├── site/
│   ├── banner.tsx              # live indicator from streams.getLive
│   ├── ticker-tape.tsx         # dynamic items (next broadcast, live status)
│   └── auth-modal.tsx          # wire to Clerk sign-in/up
└── stream-title.tsx            # editable title → streams.update (admin only)

convex/
├── bans.ts                     # NEW: ban/unban/list + isBanned helper (lib/bans.ts)
├── chat.ts                     # + ban check in send
├── reactions.ts                # + ban check in send (parity; stream stays unwired in UI)
├── schema.ts                   # + bans table (widen-only)
└── __tests__/bans.test.ts      # NEW: black-box tests first

lib/
├── mock-data.ts                # shrinks to /design-system-only exports
└── presence.ts (client helper) # NEW: heartbeat interval + sessionId per tab
```

**Structure Decision**: Keep the existing single-app layout (Next.js at root, Convex in
`convex/`). No new top-level directories; one new backend module (`convex/bans.ts`), one
new client helper (`lib/presence.ts`). `lib/mock-data.ts` survives only for the
`/design-system` reference page.

## Complexity Tracking

No constitution violations — table intentionally empty.
