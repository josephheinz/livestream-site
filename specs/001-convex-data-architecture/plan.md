# Implementation Plan: Convex Data Architecture

**Branch**: `feature/001-convex-data-architecture` | **Date**: 2026-07-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-convex-data-architecture/spec.md`

## Summary

Model the entire livestream domain in Convex around one central `streams` table whose lifecycle (`scheduled → live → ended [+recording]`) derives every user-facing view — schedule, live player, archive — so nothing can drift. `users` mirrors Clerk (webhook + session upsert); `playbackStates`, `chatMessages`, `reactions`, and `presenceSessions` hang off users×streams. All frontend reads are reactive Convex queries (go-live/chat/counts push automatically); all writes are validated mutations with invariants (single live stream, live-only chat, rate limits, out-of-order-safe playback saves) enforced transactionally inside the mutation.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node 20+

**Primary Dependencies**: Convex 1.31 (backend/db), Next.js 16.1 App Router + React 19 (frontend), `@clerk/nextjs` 6 (auth, already wired via `convex/auth.config.ts`)

**Storage**: Convex database — 6 tables per [data-model.md](data-model.md)

**Testing**: vitest + `convex-test` (to be added; per docs/TESTING-CONSIDERATIONS.md every PR ships tests), `tsc --noEmit` gate

**Target Platform**: Vercel (Next.js) + Convex cloud

**Project Type**: Web application — existing `app/` + `convex/` layout

**Performance Goals**: Go-live visible to all clients <5s (SC-001); chat propagation <2s (SC-006); viewer count within 10% / stale-drop <60s (SC-007)

**Constraints**: Anonymous viewing everywhere except posting/playback-resume; at most one live stream; no stored counters; soft-delete moderation

**Scale/Scope**: Single channel/tenant; audiences ~hundreds of concurrent viewers (presence count-on-read ceiling noted in research D4)

## Constitution Check

`.specify/memory/constitution.md` is the unfilled template — no ratified gates. Standing in for it: project docs (`docs/CODING-STANDARDS.md` — YAGNI, one-thing functions, SOLID; `docs/TESTING-CONSIDERATIONS.md` — every PR has tests). Design complies: no speculative tables, derived views over duplicated state, one dedicated test per invariant. **PASS** (pre- and post-design).

## Project Structure

### Documentation (this feature)

```text
specs/001-convex-data-architecture/
├── plan.md              # This file
├── research.md          # Phase 0 — 9 design decisions (D1–D9)
├── data-model.md        # Phase 1 — 6 tables, indexes, transitions
├── quickstart.md        # Phase 1 — automated + manual validation guide
├── contracts/
│   └── convex-functions.md  # Phase 1 — queries/mutations/http/crons surface
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
convex/
├── schema.ts            # NEW — all 6 tables + indexes
├── users.ts             # NEW — me, ensure
├── streams.ts           # NEW — lifecycle queries + admin mutations
├── chat.ts              # NEW — list, send, remove
├── reactions.ts         # NEW — recent, send
├── presence.ts          # NEW — count, heartbeat, leave
├── playback.ts          # NEW — get, save
├── http.ts              # NEW — Clerk webhook
├── crons.ts             # NEW — presence/reaction purges
├── lib/auth.ts          # NEW — requireUser / requireAdmin helpers
├── auth.config.ts       # existing — Clerk provider (unchanged)
└── messages.ts          # existing template leftover — DELETE

convex/__tests__/        # NEW — convex-test suites per domain file

app/                     # consumes via convex/react hooks (wiring is a later feature)
```

**Structure Decision**: Flat one-file-per-domain in `convex/` (Convex's canonical layout — file name becomes the API namespace, e.g. `api.streams.goLive`). Shared auth guards in `convex/lib/`. Frontend components are out of scope for this feature beyond the read/write patterns documented in the contract.

## Complexity Tracking

No constitution violations — table not needed.
