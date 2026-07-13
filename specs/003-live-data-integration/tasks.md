# Tasks: Live Data Integration

**Input**: Design documents from `/specs/003-live-data-integration/`

**Prerequisites**: plan.md, spec.md, research.md (D1–D10), data-model.md, contracts/

**Tests**: MANDATORY per constitution Principle I (Test-First, Black-Box). Every story
phase lists its test tasks first; tests are written, run, and observed to FAIL before
implementation. Backend via `convex-test` through `api.*`; components via jsdom/Testing
Library against exported props/rendered behavior with `convex/react` and Clerk hooks
mocked at the module boundary.

**Organization**: Grouped by user story (US1 viewer, US2 chat, US3 dashboard) so each
is an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 from spec.md

## Path Conventions

Next.js app at repo root (`app/`, `components/`, `lib/`), Convex backend in `convex/`.
Read `convex/_generated/ai/guidelines.md` before touching any `convex/` file (project
rule). Spec-002 visuals are frozen — wiring only (SC-007).

---

## Phase 1: Setup

**Purpose**: The one new dependency

- [X] T001 Add `hls.js` (+ types if needed) via pnpm; confirm `pnpm build` still passes (research D1)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared degraded-state strip (FR-019, research D10) both routes mount — build once before stories wire it in

- [X] T002 jsdom test for the connection-status strip in components/site/connection-status.test.tsx — renders nothing when connected, explicit "connection lost / retrying" strip when the Convex client reports disconnected or initial queries stall past the grace window; run and observe FAIL
- [X] T003 Implement components/site/connection-status.tsx making T002 pass (Convex connection state via `useConvex`/connection API; no mock content ever rendered)

**Checkpoint**: Foundation ready — user stories can begin

---

## Phase 3: User Story 1 - Viewer watches the real stream (Priority: P1) 🎯 MVP

**Goal**: `/` renders real backend state end to end — live HLS playback via the 001 proxy, real title/status/viewer count, automatic live↔off-air transitions, zero placeholders.

**Independent Test**: Start a broadcast against the backend, open `/`: real video, real title, live state. End it: page moves to off-air without refresh (quickstart steps 1–2, 7).

### Tests for User Story 1 (MANDATORY — write FIRST, observe FAIL) ⚠️

- [X] T004 [P] [US1] Unit test for the presence hook in lib/presence.test.ts — per-tab sessionId, `presence.heartbeat` on mount + ~20 s interval, `presence.leave` on unmount/pagehide (mutations mocked)
- [X] T005 [P] [US1] Update components/watch/player.test.tsx — live mode attaches HLS source to `/stream/live.m3u8` (hls.js mocked; native-HLS fallback branch), off-air mode renders existing off-air visual, transient error triggers recovery path (FR-004)
- [X] T006 [P] [US1] Update components/site/banner tests + add ticker coverage in components/site/ticker-tape.test.tsx — live dot from stream state prop/query, ticker items derived from live/upcoming data only (no static marketing lines, D9)
- [X] T007 [P] [US1] Update app/page.test.tsx — with mocked queries: live stream → player + real title + viewer count rendered; no live stream → off-air with next-slot from upcoming; `?live=1`/`?chat=` no longer force state (FR-006); no mock-data imports
- [X] T008 [US1] Run the suite; confirm T004–T007 FAIL before implementing

### Implementation for User Story 1

- [X] T009 [P] [US1] Implement lib/presence.ts hook making T004 pass (sessionStorage UUID, visibility-aware interval, leave on pagehide; research D4)
- [X] T010 [P] [US1] Wire components/watch/player.tsx — lazy-load hls.js, play `LIVE_PROXY_PATH` when live, native fallback, retry/recovery on transient errors (D1)
- [X] T011 [US1] Wire shared chrome: components/site/banner.tsx live dot + components/site/ticker-tape.tsx dynamic items from `streams.getLive`/`listUpcoming` (D9); components/watch/stream-heading.tsx shows the bound stream's real title/status (D3)
- [X] T012 [US1] Rewire app/page.tsx — client data via `useQuery(api.streams.getLive)` + `listUpcoming` fallback (D3), mount presence hook + connection-status strip, pass real viewer count from `presence.count`, delete searchParams forcing and all lib/mock-data.ts imports

**Checkpoint**: `/` is a working livestream viewer — MVP demonstrable

---

## Phase 4: User Story 2 - Signed-in viewers chat, react, and are counted (Priority: P2)

**Goal**: Real chat (history + live tail), Clerk-wired auth modal, custom-emoji picker with `:name:` rendering, ban enforcement with clear feedback. Includes the ban backend (the feature's only backend addition) since enforcement is this story's acceptance scenario 6.

**Independent Test**: Two browsers, two accounts: messages and emoji appear cross-browser ≤ 2 s; presence counts both and drops on leave; a banned account's send is rejected with the banned notice (quickstart steps 4–6).

### Tests for User Story 2 (MANDATORY — write FIRST, observe FAIL) ⚠️

- [X] T013 [P] [US2] convex-test suite in convex/__tests__/bans.test.ts — `bans.ban`/`unban`/`list` admin-only (non-admin throws "Admin only"), empty reason rejected, re-ban updates in place, `expiresAt` past = inactive, `list` joins user names (contract convex-functions.md)
- [X] T014 [P] [US2] convex-test cases (extend convex/__tests__/chat.test.ts and reactions.test.ts) — banned user's `chat.send`/`reactions.send` throws "You are banned from chat"; unbanned/expired-ban user sends fine
- [X] T015 [P] [US2] Update components/watch/chat-panel.test.tsx — mode from mocked Clerk auth (signedout prompt opens auth modal; signedin composer sends via `chat.send`), ban error flips to banned notice (D5), `:name:` tokens render as `<img>` for active emojis and literal text for unknown (D6), messages from mocked `chat.list`, and mid-session auth expiry (auth flips signed-out / send throws "Must be signed in") reverts the composer to the sign-in prompt gracefully (spec edge case)
- [X] T016 [P] [US2] Update components/site/auth-modal.test.tsx — modal drives Clerk sign-in/sign-up flows (mocked `@clerk/nextjs`)
- [X] T017 [US2] Run the suite; confirm T013–T016 FAIL before implementing

### Implementation for User Story 2

- [X] T018 [US2] Add `bans` table to convex/schema.ts (userId, reason, expiresAt?, createdBy; index by_user — data-model.md)
- [X] T019 [US2] Implement convex/lib/bans.ts `isBanned` helper + convex/bans.ts (`list`/`ban`/`unban` with `requireAdmin`) making T013 pass
- [X] T020 [US2] Add the ban guard to `chat.send` in convex/chat.ts and `reactions.send` in convex/reactions.ts making T014 pass (exact error string per contract)
- [X] T021 [P] [US2] Wire components/site/auth-modal.tsx to Clerk sign-in/sign-up making T016 pass
- [X] T022 [US2] Wire components/watch/chat-panel.tsx — `chat.list` live tail, composer → `chat.send`, emoji picker from `emojis.list` inserting `:name:`, token renderer, mode from Clerk + ban-error handling, viewers from `presence.count` — making T015 pass

**Checkpoint**: US1 + US2 — viewers watch AND participate

---

## Phase 5: User Story 3 - Admin runs the channel from the Dashboard (Priority: P3)

**Goal**: `/dashboard` admin-gated with real stats, lifecycle-driving go-live control, persisted title editing propagating live, and a working banned-users table.

**Independent Test**: Admin edits title on Dashboard → separate viewer's Watch page updates ≤ 5 s without refresh; go-live/end transitions the stream; ban from the table blocks chat (quickstart steps 2–3, 6).

### Tests for User Story 3 (MANDATORY — write FIRST, observe FAIL) ⚠️

- [X] T023 [P] [US3] Update app/dashboard/page.test.tsx — admin (mocked `users.me` role) sees the dashboard; non-admin and signed-out get the denied state with no admin data (FR-002)
- [X] T024 [P] [US3] Update components/dashboard/dashboard-cards.test.tsx (+ dashboard-body coverage) — stats map per D7 (status ← getLive, watching ← presence.count, connections "0/0" honest empty, bans ← bans.list length); GO LIVE calls `streams.goLive` on the upcoming stream (creating via `streams.create` when none), GO OFF AIR calls `streams.end` (D8)
- [X] T025 [P] [US3] Update components/dashboard/banned-users.test.tsx — table rows from mocked `bans.list`, unban action calls `bans.unban`, add-ban form calls `bans.ban` with reason (required) and optional expiry
- [X] T026 [P] [US3] Update components/stream-title.test.tsx + add stream-title-card coverage — edit affordance only for admin, confirm persists via `streams.update`, concurrent-edit convergence (last write wins renders persisted value)
- [X] T027 [US3] Run the suite; confirm T023–T026 FAIL before implementing

### Implementation for User Story 3

- [ ] T028 [US3] Gate app/dashboard/page.tsx on `users.me` role, render denied state otherwise; mount connection-status strip; remove mock-data imports and demo params
- [ ] T029 [US3] Wire components/dashboard/dashboard-body.tsx + broadcast-card.tsx — live stats per D7, go-live control → `streams.goLive`/`end` with `streams.create` fallback (D8); components/dashboard/external-connections.tsx honest empty state
- [ ] T030 [P] [US3] Wire components/dashboard/banned-users.tsx to `bans.list`/`ban`/`unban` making T025 pass
- [ ] T031 [US3] Wire components/stream-title.tsx + components/dashboard/stream-title-card.tsx to `streams.update` with admin-only editing making T026 pass

**Checkpoint**: All three stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T032 Shrink lib/mock-data.ts to only what app/design-system/page.tsx imports; grep-verify no `mock-data` import remains under app/page.tsx, app/dashboard/, or wired components (SC-005/FR-018)
- [ ] T033 Full verification: `pnpm test` (all 001/002/003 suites green — SC-007), `pnpm lint`, `pnpm build`
- [ ] T034 Execute the manual two-browser validation in specs/003-live-data-integration/quickstart.md — **requires a human + RTMP origin for the playback steps**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (P1)**: none — start immediately
- **Foundational (P2)**: after Setup — blocks all stories (both routes mount the strip)
- **US1 (P3)**: after Foundational; no story dependencies
- **US2 (P4)**: after Foundational; independent of US1 (chat panel testable alone), though quickstart flows read best after US1
- **US3 (P5)**: after Foundational; T024/T029's bans stat and T025/T030 depend on the bans backend (T018–T020 from US2)
- **Polish (P6)**: after all stories

### Within Each User Story

- Test tasks first; run and FAIL (T008/T017/T027 are the explicit gates) before implementation
- Backend (schema → module → guards) before UI wiring in US2
- Page-level rewiring last within each story (it composes the wired components)

### Parallel Opportunities

- All test tasks within a story are [P] (different files)
- T009/T010 (presence hook, player) are [P]; T021 (auth modal) parallel to backend T018–T020
- US2 backend tests (T013/T014) can be written in parallel with US1 implementation by a second developer once Foundational is done

---

## Parallel Example: User Story 1

```text
# Write all US1 tests together:
T004 lib/presence.test.ts
T005 components/watch/player.test.tsx
T006 components/site/ticker-tape.test.tsx (+ banner)
T007 app/page.test.tsx

# Then after T008 (observed failing):
T009 lib/presence.ts  ‖  T010 components/watch/player.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (hls.js) → Phase 2 (connection strip)
2. Phase 3 complete → **STOP and VALIDATE**: quickstart steps 1–2, 7 with the RTMP origin
3. `/` is a real livestream viewer — demoable MVP

### Incremental Delivery

- +US2 → viewers participate (chat/emoji/presence/ban feedback) → validate steps 4–6
- +US3 → admin console live → validate steps 2–3, 6
- Polish → placeholder purge + full suite + manual pass

---

## Notes

- Read `convex/_generated/ai/guidelines.md` before T018–T020 (project rule)
- Spec-002 visuals are frozen: wiring changes only; if a 002 test asserts on mock
  content, update it to assert on the mocked query data, never on changed visuals
- Exact ban error string "You are banned from chat" is a contract (composer keys off it)
- Commit after each task or logical group; every checkpoint is a safe stopping point
