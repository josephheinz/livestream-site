# Tasks: Convex Data Architecture

**Input**: Design documents from `/specs/001-convex-data-architecture/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/convex-functions.md, quickstart.md

**Tests**: Included — docs/TESTING-CONSIDERATIONS.md mandates tests on every PR; research D9 names vitest + convex-test.

**Organization**: Grouped by user story; each story phase is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 = watch live, US2 = schedule/archive, US3 = chat/reactions/presence, US4 = identity sync (satisfied by Foundational phase), US5 = clips + VOD privacy

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test tooling and workspace hygiene

- [ ] T001 Add dev dependencies `vitest` and `convex-test`, and add `"test": "vitest run"` script, in package.json
- [ ] T002 [P] Create vitest.config.ts at repo root configured for the `convex/` directory (edge-runtime environment per convex-test docs)
- [ ] T003 [P] Delete template leftover convex/messages.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, identity, and auth guards every story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create convex/schema.ts defining all 7 tables and indexes exactly per specs/001-convex-data-architecture/data-model.md (users, streams, chatMessages, reactions, customEmojis, clips, presenceSessions)
- [ ] T005 Create convex/lib/auth.ts with `getCurrentUser(ctx)`, `requireUser(ctx)`, and `requireAdmin(ctx)` helpers (join Clerk identity → users row via by_externalId; requireAdmin throws unless `role === "admin"`)
- [ ] T006 Create convex/users.ts with `me` query and `ensure` upsert mutation per contracts/convex-functions.md
- [ ] T007 [P] Create convex/http.ts with the svix-verified `POST /clerk-users-webhook` HTTP action (user.created/updated → upsert; user.deleted → delete the users row only — chat messages remain per research D11); add `svix` dependency
- [ ] T008 [P] Write convex/__tests__/users.test.ts covering: ensure creates then updates a user; me returns null anonymously; requireAdmin rejects non-admins

**Checkpoint**: Schema deployed, identity flows work — user stories can now proceed (even in parallel)

---

## Phase 3: User Story 1 - Viewer finds and watches the live stream (Priority: P1) 🎯 MVP

**Goal**: "What is live right now?" answered reactively; admin can create a stream and take it live/ended; origin URLs and stream keys never reach non-admin clients (FR-022)

**Independent Test**: quickstart.md steps 1–3 — seed a stream, flip live, connected client updates without refresh; at most one live stream ever; non-admin payloads contain only `/stream/...` proxy paths

### Tests for User Story 1

- [ ] T009 [P] [US1] Write convex/__tests__/streams.lifecycle.test.ts (failing first): create → goLive → end transitions; goLive rejects when another stream is live (research D2); goLive/end/create reject for non-admins; invalid transitions (end a scheduled stream) throw; **sanitization (SC-009): getLive/get return `/stream/live.m3u8` (never origin liveUrl) to non-admins, origin URLs to admins**

### Implementation for User Story 1

- [ ] T010 [US1] Create convex/streams.ts with `getLive` and `get` queries plus `create`, `goLive`, `end` admin mutations per contracts/convex-functions.md (transactional single-live check inside goLive; set actualStart/actualEnd; URL sanitization per research D15, incl. an internal query resolving streamId → origin URL for the proxy)
- [ ] T011 [US1] Create app/stream/[[...path]]/route.ts — same-origin HLS proxy (`/stream/live.m3u8`, `/stream/vod/<streamId>.m3u8`) relaying playlist + segments from node-media-server via the internal origin-URL query; NMS host/key only in server env (research D15). Verify explicitly: private-VOD paths 404 without an admin Clerk session and serve with one; `/stream/live.m3u8` 404s when nothing is live

**Checkpoint**: T009 suite green + proxy serves `/stream/live/<id>.m3u8` — MVP data layer done

---

## Phase 4: User Story 2 - Viewer browses schedule and archives (Priority: P2)

**Goal**: Upcoming and archive listings derived from the same streams table; recordings (captured by node-media-server) attachable by URL; VOD visibility; cancellation handled

**Independent Test**: Seeded fixtures — upcoming lists only future scheduled streams soonest-first; archive lists only ended-with-recording newest-first; private VODs hidden from non-admins

### Tests for User Story 2

- [ ] T012 [P] [US2] Write convex/__tests__/streams.listings.test.ts (failing first): listUpcoming excludes live/ended/canceled and orders by scheduledStart; listArchive excludes ended-without-recording and orders newest-first; listArchive/get hide private VODs from non-admins but not from admins; listArchive returns proxy paths to non-admins (SC-009); setVisibility and attachRecording admin-only, attachRecording only valid on ended; cancel only valid from scheduled; update edits metadata without changing status

### Implementation for User Story 2

- [ ] T013 [US2] Extend convex/streams.ts with `listUpcoming` and `listArchive` queries plus `update`, `attachRecording`, `setVisibility`, `cancel` admin mutations per contracts/convex-functions.md (visibility checks + URL sanitization at read time per research D13/D15)

**Checkpoint**: Schedule and archive fully derivable; US1 unaffected

---

## Phase 5: User Story 3 - Viewers chat and see who's watching (Priority: P3)

**Goal**: Live chat with moderation and rate limiting, reactions, heartbeat-derived viewer counts

**Independent Test**: quickstart.md steps 3–6 — two clients, message propagates, anonymous is read-only, admin removal hides, count tracks joins/leaves

### Tests for User Story 3

- [ ] T014 [P] [US3] Write convex/__tests__/chat.test.ts (failing first): send requires auth + live stream (FR-013/FR-017); 2s rate limit rejects rapid second message (research D5); remove is admin-only and hides message from list; body validation (empty / >500 chars); a message whose author row was deleted lists with the "Deleted user" fallback (research D11)
- [ ] T015 [P] [US3] Write convex/__tests__/presence.test.ts (failing first): heartbeat upserts by (streamId, sessionId); count includes only sessions with lastSeen within 60s (research D4); leave deletes the session
- [ ] T016 [P] [US3] Write convex/__tests__/reactions.test.ts (failing first): send requires auth + live stream; unicode-emoji kind accepted; `custom:<id>` kind accepted only for existing active custom emojis, rejected when inactive/unknown; recent returns only trailing-30s reactions

### Implementation for User Story 3

- [ ] T017 [P] [US3] Create convex/chat.ts with `list` query (last 100, non-removed, joined author name/avatar with "Deleted user" fallback) and `send`, `remove` mutations per contracts/convex-functions.md
- [ ] T018 [P] [US3] Create convex/presence.ts with `count` query and `heartbeat`, `leave` mutations per contracts/convex-functions.md
- [ ] T019 [P] [US3] Create convex/reactions.ts with `recent` query and `send` mutation (kind validation per research D6) per contracts/convex-functions.md
- [ ] T020 [US3] Create convex/crons.ts with `purgeStalePresence` (every 5 min, lastSeen > 5 min old) and `purgeOldReactions` (hourly, older than 1h) plus their internal mutations

**Checkpoint**: Full interactivity layer green; US1/US2 unaffected

---

## Phase 6: User Story 3 extension - Custom emojis (FR-018)

**Goal**: Admins upload/deactivate custom emoji images (Convex file storage); viewers react with them

**Independent Test**: As admin, upload an image emoji → it appears in `emojis.list` and a reaction with `custom:<id>` succeeds; deactivate it → new reactions rejected, list no longer offers it

> **Note**: User Story 4 (identity sync) requires no phase of its own — it is fully delivered by Foundational tasks T006–T008. Playback resume was removed from the spec (research D7).

### Tests

- [ ] T021 [P] [US3] Write convex/__tests__/emojis.test.ts (failing first): create/deactivate are admin-only; list returns only active emojis with resolved image URLs; deactivated emoji rejected by reactions.send (pairs with T016)

### Implementation

- [ ] T022 [US3] Create convex/emojis.ts with `list` query and `generateUploadUrl`, `create`, `deactivate` admin mutations per contracts/convex-functions.md (research D10)

**Checkpoint**: Interactivity + custom emojis green

---

## Phase 7: User Story 5 - Clips + VOD privacy (Priority: P5)

**Goal**: Signed-in viewers create ≤15s pointer-clips into public VODs; admins toggle VOD privacy which hides VODs and their clips from regular viewers

**Independent Test**: Create a clip on a public VOD → listed instantly with correct bounds; flip the VOD private → clip and VOD vanish for non-admins, persist for admins

> **Depends on** US2's `setVisibility`/`listArchive` (T013) in addition to Phase 2.

### Tests

- [ ] T023 [P] [US5] Write convex/__tests__/clips.test.ts (failing first): create requires auth + archived public source; rejects duration >15s, inverted bounds, title >100 chars; list/get hide clips of private VODs from non-admins but not admins or after re-publicizing; clip payloads carry proxy paths, not origin URLs (SC-009); remove allowed for creator and admin only; mine returns caller's clips

### Implementation

- [ ] T024 [US5] Create convex/clips.ts with `list`, `get`, `mine` queries and `create`, `remove` mutations per contracts/convex-functions.md (visibility derived from source stream at read time per research D13/D14; URL sanitization per D15)

**Checkpoint**: All five stories independently green

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T025 Run full gate: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint` — fix anything red
- [ ] T026 Execute the manual two-browser validation in specs/001-convex-data-architecture/quickstart.md against `npx convex dev` + `pnpm dev`
- [ ] T027 [P] Record the load-bearing decisions (derived views, transactional single-live invariant, heartbeat presence with documented ceiling, URL-only video references, read-time visibility, same-origin HLS proxy) in docs/ADR.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — start immediately; T001–T003 independent
- **Foundational (Phase 2)**: needs T001/T002 for tests; T004 (schema) blocks T005–T008; blocks ALL user stories
- **User Stories (Phases 3–7)**: Phases 3–6 depend only on Phase 2 — they touch disjoint files and can run in parallel or in priority order
  - US2 (T013) extends the same convex/streams.ts as US1 (T010) — if run in parallel, coordinate on that one file; otherwise US1 → US2 sequentially
  - T011 (HLS proxy) depends on T010's internal origin-URL query
  - Phase 6 (T022 emojis.ts) is independent file-wise, but T016/T019's custom-kind validation reads the customEmojis table — run Phase 6 with or before the reactions tasks for green tests in one pass
  - Phase 7 (US5 clips, T023–T024) additionally depends on US2's T013 (setVisibility/listArchive)
- **Polish (Phase 8)**: after all desired stories

### Within Each Story

- Test task first (write failing), then implementation makes it green
- All [P] test tasks within a phase can be written concurrently (different files)

### Parallel Opportunities

- Phase 1: T002 ∥ T003
- Phase 2: T007 ∥ T008 (after T004–T006)
- Phase 5: T014 ∥ T015 ∥ T016, then T017 ∥ T018 ∥ T019
- Phases 5–6 are fully independent of US1/US2 file-wise — a second developer can start them right after Phase 2

## Implementation Strategy

**MVP first**: Phases 1 → 2 → 3 (T001–T011) delivers the P1 story — a reactive live-stream data layer behind a key-hiding proxy — validatable via quickstart steps 1–3. Each later phase is an independent, deployable increment; stop and validate at every checkpoint.
