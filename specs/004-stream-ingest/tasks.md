---

description: "Task list for Stream Ingest"
---

# Tasks: Stream Ingest

**Input**: Design documents from `/specs/004-stream-ingest/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: MANDATORY per constitution Principle I (Test-First, Black-Box). Each Convex function is
tested through its registered entry point (`api.*` / `internal.*` / HTTP action via `t.fetch`),
never its internals. Tests are written and observed to FAIL before implementation.

**Organization**: Grouped by user story. US1 (P1) is the MVP. US3 (restream) is **deferred** —
no tasks in this feature (see spec Clarifications 2026-07-14).

> **Analysis remediation (2026-07-14)** applied: key generation is exercised in US1 (not
> Foundational) so it has a preceding red test (C1); dual-publish rejection is delegated to the
> media server and `lastPublishAt` is dropped (B1); the manual Go Live/End control already
> exists and is *verified* rather than rebuilt (G1); an attach-recording-after-auto-end
> assertion is added (G2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 (US3 deferred)

## Path Conventions

Existing single-repo web app: backend in `convex/`, frontend in `app/` + `components/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuration the feature depends on.

- [x] T001 Add `INGEST_WEBHOOK_SECRET` and `MEDIA_SERVER_HLS_BASE` to the env reference in `README.md` (Convex deployment env table) and note them in `.env.local` guidance; document that `INGEST_WEBHOOK_SECRET` must match the media server's `x-ingest-secret`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema + pure helpers both stories need. Key *generation on create* is intentionally
NOT here — it lands in US1 (T008) so it has a preceding failing test (C1). This phase leaves the
existing suite green.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [x] T002 Add optional fields `ingestKey`, `publishEpoch` and the `by_ingestKey` index to the `streams` table in `convex/schema.ts` (per [data-model.md](data-model.md); no `lastPublishAt`).
- [x] T003 [P] Write FAILING unit tests for the ingest helpers in `convex/lib/ingest.test.ts`: `generateIngestKey()` returns a URL-safe, high-entropy, unique-per-call string; `deriveLiveUrl(base, key)` returns `${base}/live/${key}/index.m3u8`.
- [x] T004 Implement `convex/lib/ingest.ts` exporting `generateIngestKey()` (Web Crypto `getRandomValues` → base64url) and `deriveLiveUrl(base, key)` so T003 passes (per [research.md](research.md) D4/D5).

**Checkpoint**: Schema + helpers in place; `pnpm test` still green.

---

## Phase 3: User Story 1 - Broadcast by pointing a tool at the site (Priority: P1) 🎯 MVP

**Goal**: An admin reads a per-stream ingest address + key, points OBS at it, and the site
auto-flips **live** on publish start and **ended** on publish stop — no manual clicks, no
pasted playback URL — with the key never appearing in a viewer-facing response. The existing
manual GO LIVE / GO OFF AIR control keeps working as a fallback.

**Independent Test**: With a key from a scheduled stream, POST to `/ingest/publish` (or publish
real RTMP) → stream goes live and the viewer player loads `/stream/live.m3u8`; POST
`/ingest/unpublish` and wait the grace window → stream auto-ends; confirm the key is absent from
`getLive`/`current` for a signed-out caller.

### Tests for User Story 1 (write FIRST, must FAIL) ⚠️

- [x] T005 [P] [US1] Write FAILING HTTP-action tests in `convex/__tests__/ingest.auth.test.ts` (via `t.fetch`) for `POST /ingest/publish` and `POST /ingest/unpublish` per [contracts/ingest-http.md](contracts/ingest-http.md): 403 on bad/missing secret; 400 on missing `streamKey`; 403 on unknown key; 403 publishing to an ended/canceled stream; 403 when a *different* stream is already live (single-live); 200 happy path flips the stream live; and a re-publish of the *same* already-live stream returns 200 and bumps `publishEpoch` (reconnect adopted, not a second session — B1).
- [x] T006 [P] [US1] Write FAILING tests in `convex/__tests__/ingest.lifecycle.test.ts` per [contracts/convex-functions.md](contracts/convex-functions.md): `create` generates a non-empty `ingestKey` (C1); `beginPublish` sets live + `actualStart` + derived `liveUrl` + bumps `publishEpoch`; `endPublish`→scheduled `finalizePublishEnd` ends the stream after grace; a reconnect (`beginPublish` bumps epoch) makes the stale `finalizePublishEnd` a no-op (FR-012); manual `end`/`goLive` bump epoch and `goLive` also derives `liveUrl`; `attachRecording` still succeeds after `finalizePublishEnd` set `status="ended"` (G2/FR-015); `revealIngestKey` returns the key for an admin and throws for a non-admin; `sanitize` strips `ingestKey`/`publishEpoch` for non-admins and keeps them for admins (SC-003).

### Implementation for User Story 1

- [x] T007 [US1] Add `GRACE_MS = 30_000` and the internal mutations `beginPublish`, `endPublish`, `finalizePublishEnd` to `convex/streams.ts` per [contracts/convex-functions.md](contracts/convex-functions.md): eligibility (status ∈ {scheduled, live}) + single-live checks, reconnect **adopt** on a same-stream re-publish (bump epoch, no dual-publish reject — B1), scheduler grace, epoch-guarded finalize.
- [x] T008 [US1] In `convex/streams.ts`: make `create` generate + store `ingestKey` via `generateIngestKey()` (C1) and **remove the `liveUrl` arg** from `create` and `update`; change `originForLive` to derive from `ingestKey` + `MEDIA_SERVER_HLS_BASE` (D5); have `beginPublish` and manual `goLive` store the derived `liveUrl`; have `end` bump `publishEpoch` (depends on T007; same file, sequential).
- [x] T009 [US1] In `convex/streams.ts`: add the admin-only `revealIngestKey` query (`requireAdmin`), and extend `sanitize()` to strip `ingestKey`/`publishEpoch` for non-admins (depends on T008; same file, sequential).
- [x] T010 [P] [US1] Update existing tests for the new model: `convex/__tests__/streams.lifecycle.test.ts` and `streams.listings.test.ts` (stop passing `liveUrl` to `create`; assert `liveUrl` is derived on go-live and still sanitized to `/stream/live.m3u8` for non-admins), and `components/dashboard/dashboard-cards.test.tsx` (the create+goLive fallback flow still works).
- [x] T011 [US1] Add the `POST /ingest/publish` and `POST /ingest/unpublish` HTTP actions to `convex/http.ts`, secret-guarded by `INGEST_WEBHOOK_SECRET` (`x-ingest-secret`), delegating to `internal.streams.beginPublish` / `endPublish` and mapping their result to 200/400/403 per [contracts/ingest-http.md](contracts/ingest-http.md).
- [x] T012 [US1] Add an admin-only Ingest card `components/dashboard/ingest-card.tsx` that reveals the RTMP address (`rtmp://<media-host>/live/<key>`) via `revealIngestKey`, and wire it into `components/dashboard/dashboard-body.tsx`.
- [x] T013 [US1] Verify the manual fallback (FR-013, G1): the existing GO LIVE / GO OFF AIR control in `components/dashboard/dashboard-body.tsx` (`streams.goLive`/`end`) still transitions the stream and produces a playable derived `liveUrl` after the T008 changes — no rebuild expected; keep `dashboard-cards.test.tsx` coverage green and add an assertion if the manual go-live path lacks one.

**Checkpoint**: US1 complete — auto go-live/end works end-to-end, key configurable, manual fallback intact, no leak. Shippable MVP.

---

## Phase 4: User Story 2 - Keep ingest keys secret and rotatable (Priority: P2)

**Goal**: Keys never reach viewers (regression-audited across all public surfaces) and an admin
can rotate a key in one action, immediately revoking the old one.

**Independent Test**: Audit all public surfaces for the key string (queries, page, proxy
playlist) → absent; rotate the key → a `beginPublish` with the old key is rejected while the new
key succeeds.

### Tests for User Story 2 (write FIRST, must FAIL) ⚠️

- [x] T014 [P] [US2] Write FAILING tests in `convex/__tests__/streams.key.test.ts`: `rotateIngestKey` requires admin, returns a NEW key, bumps `publishEpoch`, and the OLD key is then rejected by `beginPublish` (FR-003, D7); plus a non-leak audit asserting the key appears in none of `getLive` / `current` / `get` for a non-admin caller (SC-003).

### Implementation for User Story 2

- [x] T015 [US2] Add the admin-only `rotateIngestKey` mutation to `convex/streams.ts` (generate a fresh key, bump `publishEpoch`; allowed while live) per [contracts/convex-functions.md](contracts/convex-functions.md).
- [x] T016 [US2] Add a "Rotate key" action to `components/dashboard/ingest-card.tsx` that calls `rotateIngestKey` and warns "this will drop the active broadcast" when the stream is live.

**Checkpoint**: US1 + US2 both work independently; leaked keys are revocable.

---

## Phase 5: User Story 3 - Restream (DEFERRED)

**Deferred** to a later feature (spec Clarifications 2026-07-14). No tasks here. The
`components/dashboard/external-connections.tsx` card stays in its current honest-empty state.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T017 [P] Update `README.md` with the ingest setup summary (media-server hook config pointer to [contracts/ingest-http.md](contracts/ingest-http.md), RTMP/HLS path convention) and update `docs/ADR.md` if the derived-`liveUrl` decision warrants a note.
- [x] T018 Run the full gate: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test` — all green.
- [ ] T019 Walk the manual end-to-end in [quickstart.md](quickstart.md) (auto go-live, reconnect stays live, auto-end, rotation revokes, rejections, key-never-leaks, no bytes in Convex).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: no dependencies.
- **Foundational (T002–T004)**: after Setup; BLOCKS both stories. T003 before T004 (test-first).
- **US1 (T005–T013)**: after Foundational. Tests (T005, T006) first and failing. `convex/streams.ts` tasks T007 → T008 → T009 are sequential (same file). T010 depends on T008's signature change. T011 depends on T007. T012 depends on T009. T013 depends on T008.
- **US2 (T014–T016)**: after Foundational; independent of US1 except sharing `convex/streams.ts` and `ingest-card.tsx` (T016 depends on T012). T014 first and failing; T015 before T016.
- **Polish (T017–T019)**: after the stories you intend to ship.

### Within Each User Story

- Tests written and observed to FAIL before implementation (Principle I).
- Same-file `convex/streams.ts` edits are sequential; cross-file work is parallel.

### Parallel Opportunities

- T003 (helper test) runs alongside T002 (schema).
- US1 test authoring T005 + T006 in parallel (different files).
- T010 (existing-test updates) parallel with T011 (http.ts) once T008 lands.
- US2 can be built in parallel with US1 by a second developer, coordinating on `convex/streams.ts` and `ingest-card.tsx`.

---

## Parallel Example: User Story 1

```bash
# Author both US1 test suites together (write first, expect red):
Task: "convex/__tests__/ingest.auth.test.ts — HTTP publish/unpublish contract + reconnect-adopt"
Task: "convex/__tests__/ingest.lifecycle.test.ts — create-genkey + begin/end/finalize + reveal + sanitize + recording"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Setup (T001) → Foundational (T002–T004) → US1 (T005–T013).
2. **STOP and VALIDATE**: broadcast end-to-end via quickstart steps 1–4 + 7.
3. Deploy/demo — this is the MVP that replaces the manual paste-a-URL + Go-Live flow.

### Incremental Delivery

1. Foundation ready → US1 (broadcast, MVP) → US2 (rotation + non-leak audit).
2. Restream (US3) later as its own spec.

---

## Notes

- [P] = different files, no incomplete-task dependency.
- Most backend logic concentrates in `convex/streams.ts`; those tasks are intentionally sequential to avoid same-file conflicts.
- The HLS proxy route `app/stream/[[...path]]/route.ts` needs **no change** — `originForLive` still feeds it, now key-derived.
- Verify each test suite is red before writing implementation; commit after each task or logical group.
