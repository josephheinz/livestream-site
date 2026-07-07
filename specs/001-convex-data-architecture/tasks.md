# Tasks: Convex Data Architecture

**Input**: Design documents from `/specs/001-convex-data-architecture/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/convex-functions.md, quickstart.md

**Tests**: Included — docs/TESTING-CONSIDERATIONS.md mandates tests on every PR; research D9 names vitest + convex-test.

**Organization**: Grouped by user story; each story phase is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 = watch live, US2 = schedule/archive, US3 = chat/presence, US4 = resume playback

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test tooling and workspace hygiene

- [ ] T001 Add dev dependencies `vitest` and `convex-test`, and add `"test": "vitest run"` script, in package.json
- [ ] T002 [P] Create vitest.config.ts at repo root configured for the `convex/` directory (edge-runtime environment per convex-test docs)
- [ ] T003 [P] Delete template leftover convex/messages.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, identity, and auth guards every story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create convex/schema.ts defining all 6 tables and indexes exactly per specs/001-convex-data-architecture/data-model.md (users, streams, playbackStates, chatMessages, reactions, presenceSessions)
- [ ] T005 Create convex/lib/auth.ts with `getCurrentUser(ctx)`, `requireUser(ctx)`, and `requireAdmin(ctx)` helpers (join Clerk identity → users row via by_externalId; requireAdmin throws unless `role === "admin"`)
- [ ] T006 Create convex/users.ts with `me` query and `ensure` upsert mutation per contracts/convex-functions.md
- [ ] T007 [P] Create convex/http.ts with the svix-verified `POST /clerk-users-webhook` HTTP action (user.created/updated → upsert; user.deleted → delete user + cascade playbackStates); add `svix` dependency
- [ ] T008 [P] Write convex/__tests__/users.test.ts covering: ensure creates then updates a user; me returns null anonymously; requireAdmin rejects non-admins

**Checkpoint**: Schema deployed, identity flows work — user stories can now proceed (even in parallel)

---

## Phase 3: User Story 1 - Viewer finds and watches the live stream (Priority: P1) 🎯 MVP

**Goal**: "What is live right now?" answered reactively; admin can create a stream and take it live/ended

**Independent Test**: quickstart.md steps 1–3 — seed a stream, flip live, connected client updates without refresh; at most one live stream ever

### Tests for User Story 1

- [ ] T009 [P] [US1] Write convex/__tests__/streams.lifecycle.test.ts (failing first): create → goLive → end transitions; goLive rejects when another stream is live (research D2); goLive/end/create reject for non-admins; invalid transitions (end a scheduled stream) throw

### Implementation for User Story 1

- [ ] T010 [US1] Create convex/streams.ts with `getLive` and `get` queries plus `create`, `goLive`, `end` admin mutations per contracts/convex-functions.md (transactional single-live check inside goLive; set actualStart/actualEnd)

**Checkpoint**: T009 suite green — MVP data layer done

---

## Phase 4: User Story 2 - Viewer browses schedule and archives (Priority: P2)

**Goal**: Upcoming and archive listings derived from the same streams table; recordings attachable; cancellation handled

**Independent Test**: quickstart.md step 6 + seeded fixtures — upcoming lists only future scheduled soonest-first; archive lists only ended-with-recording newest-first

### Tests for User Story 2

- [ ] T011 [P] [US2] Write convex/__tests__/streams.listings.test.ts (failing first): listUpcoming excludes live/ended/canceled and orders by scheduledStart; listArchive excludes ended-without-recording and orders newest-first; attachRecording only valid on ended; cancel only valid from scheduled

### Implementation for User Story 2

- [ ] T012 [US2] Extend convex/streams.ts with `listUpcoming` and `listArchive` queries plus `update`, `attachRecording`, `cancel` admin mutations per contracts/convex-functions.md

**Checkpoint**: Schedule and archive fully derivable; US1 unaffected

---

## Phase 5: User Story 3 - Viewers chat and see who's watching (Priority: P3)

**Goal**: Live chat with moderation and rate limiting, reactions, heartbeat-derived viewer counts

**Independent Test**: quickstart.md steps 3–5 — two clients, message propagates, anonymous is read-only, admin removal hides, count tracks joins/leaves

### Tests for User Story 3

- [ ] T013 [P] [US3] Write convex/__tests__/chat.test.ts (failing first): send requires auth + live stream (FR-013/FR-017); 2s rate limit rejects rapid second message (research D5); remove is admin-only and hides message from list; body validation (empty / >500 chars)
- [ ] T014 [P] [US3] Write convex/__tests__/presence.test.ts (failing first): heartbeat upserts by (streamId, sessionId); count includes only sessions with lastSeen within 60s (research D4); leave deletes the session
- [ ] T015 [P] [US3] Write convex/__tests__/reactions.test.ts (failing first): send requires auth + live stream + allowlisted kind; recent returns only trailing-30s reactions

### Implementation for User Story 3

- [ ] T016 [P] [US3] Create convex/chat.ts with `list` query (last 100, non-removed, joined author name/avatar) and `send`, `remove` mutations per contracts/convex-functions.md
- [ ] T017 [P] [US3] Create convex/presence.ts with `count` query and `heartbeat`, `leave` mutations per contracts/convex-functions.md
- [ ] T018 [P] [US3] Create convex/reactions.ts with `recent` query and `send` mutation per contracts/convex-functions.md
- [ ] T019 [US3] Create convex/crons.ts with `purgeStalePresence` (every 5 min, lastSeen > 5 min old) and `purgeOldReactions` (hourly, older than 1h) plus their internal mutations

**Checkpoint**: Full interactivity layer green; US1/US2 unaffected

---

## Phase 6: User Story 4 - Signed-in viewer resumes where they left off (Priority: P4)

**Goal**: Cross-device playback resume for signed-in users; anonymous viewers persist nothing

**Independent Test**: quickstart.md step 7 — save position, fresh session resumes at it; stale multi-device write ignored

### Tests for User Story 4

- [ ] T020 [P] [US4] Write convex/__tests__/playback.test.ts (failing first): save then get round-trips; save with older updatedAt than stored is ignored (research D7); get returns null anonymously and save throws

### Implementation for User Story 4

- [ ] T021 [US4] Create convex/playback.ts with `get` query and `save` mutation per contracts/convex-functions.md (upsert on by_user_and_stream; reject stale updatedAt silently)

**Checkpoint**: All four stories independently green

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T022 Run full gate: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint` — fix anything red
- [ ] T023 Execute the manual two-browser validation in specs/001-convex-data-architecture/quickstart.md against `npx convex dev` + `pnpm dev`
- [ ] T024 [P] Record the load-bearing decisions (derived views, transactional single-live invariant, heartbeat presence with documented ceiling) in docs/ADR.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — start immediately; T001–T003 independent
- **Foundational (Phase 2)**: needs T001/T002 for tests; T004 (schema) blocks T005–T008; blocks ALL user stories
- **User Stories (Phases 3–6)**: each depends only on Phase 2 — they touch disjoint files and can run in parallel or in priority order
  - US2 (T012) extends the same convex/streams.ts as US1 (T010) — if run in parallel, coordinate on that one file; otherwise US1 → US2 sequentially
- **Polish (Phase 7)**: after all desired stories

### Within Each Story

- Test task first (write failing), then implementation makes it green
- All [P] test tasks within a phase can be written concurrently (different files)

### Parallel Opportunities

- Phase 1: T002 ∥ T003
- Phase 2: T007 ∥ T008 (after T004–T006)
- Phase 5: T013 ∥ T014 ∥ T015, then T016 ∥ T017 ∥ T018
- Stories US3 and US4 are fully independent of US1/US2 file-wise — a second developer can start Phase 5/6 right after Phase 2

## Implementation Strategy

**MVP first**: Phases 1 → 2 → 3 (T001–T010) delivers the P1 story — a reactive live-stream data layer — validatable via quickstart steps 1–3. Each later phase is an independent, deployable increment; stop and validate at every checkpoint.
