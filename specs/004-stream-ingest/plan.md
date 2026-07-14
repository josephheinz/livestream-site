# Implementation Plan: Stream Ingest

**Branch**: `feature/004-stream-ingest` | **Date**: 2026-07-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-stream-ingest/spec.md`

## Summary

Bring the RTMP ingest / stream-key side into the backend **as a contract only**: each
stream gets its own high-entropy `ingestKey`; the external media server (node-media-server,
unchanged, out-of-repo) authenticates every publish against a secret-guarded Convex HTTP
action that maps the key → one stream and auto-flips it **live** on publish start and
**ended** on publish stop. A Convex-scheduler grace timer keyed on a per-stream
`publishEpoch` makes auto-end reconnect-safe (no flicker). Keys are admin-reveal-only,
rotatable (immediately revoking the old key), and never leak to viewers — the viewer-facing
`liveUrl` is derived server-side from the key + a media-server base env var, so no secret is
ever embedded in a client-visible URL. Manual Go Live / End remain as a fallback. Convex
continues to store URLs, keys, and metadata only — never video bytes. Restream (US3) is
deferred.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+ (pnpm)

**Primary Dependencies**: Next.js 16 (App Router), React 19, Convex 1.42, Clerk 6. No new
runtime dependencies (key generation uses the Convex runtime's Web Crypto).

**Storage**: Convex — new fields on the existing `streams` table; a new `by_ingestKey`
index. No video bytes (media server owns HLS/recordings on its own disk).

**Testing**: Vitest + `convex-test` (`pnpm test`); HTTP actions exercised via `t.fetch`.
Type check `pnpm exec tsc --noEmit`; lint `pnpm lint`.

**Target Platform**: Vercel (Next.js) + Convex cloud/self-hosted deployment; external
node-media-server reachable over HTTP for the auth callback.

**Project Type**: Web application (existing `app/` + `convex/` single repo).

**Performance Goals**: Viewer sees live feed within 15 s of publish start (SC-002); old key
rejected within 5 s of rotation (SC-004); auto-end within the 30 s grace window (SC-005).

**Constraints**: Ingest key never appears in any non-admin response, URL, or playlist
(SC-003); no video bytes persisted by the backend (SC-007); single-live-at-a-time invariant
preserved.

**Scale/Scope**: Single-channel site, one active publish at a time. Scope is P1 (broadcast)
+ P2 (key secrecy/rotation); restream deferred.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Test-First, Black-Box (NON-NEGOTIABLE)**: PASS (planned). Every new function is
  tested through its registered entry point before implementation: `revealIngestKey`,
  `rotateIngestKey`, the `beginPublish` / `endPublish` / `finalizePublishEnd` internals, the
  updated `sanitize`/`originForLive`, and the `/ingest/*` HTTP action via `t.fetch`. Tests
  are written and observed to fail first. `sanitize` gets an explicit "key never leaks"
  assertion (SC-003). No test reaches past a declared interface into private helpers.
- **II. Simplicity**: PASS. Reuses three existing patterns rather than inventing new ones —
  the `/stream-origin` shared-secret HTTP action (→ `INGEST_WEBHOOK_SECRET`), the
  `ctx.scheduler.runAfter` deferral, and the `sanitize()` field-stripping. New state is three
  optional fields on `streams` (`ingestKey`, `publishEpoch`) — no new table,
  no new dependency. The reconnect-safe grace is an epoch check, not a heartbeat/cron system.

**No violations — Complexity Tracking left empty.**

## Project Structure

### Documentation (this feature)

```text
specs/004-stream-ingest/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── ingest-http.md          # media-server → backend auth callbacks
│   └── convex-functions.md     # admin + internal Convex functions
├── checklists/
│   └── requirements.md  # from /speckit-specify + /speckit-clarify
└── tasks.md             # /speckit-tasks output (NOT created here)
```

### Source Code (repository root)

```text
convex/
├── schema.ts               # + ingestKey / publishEpoch + by_ingestKey index
├── streams.ts              # + revealIngestKey, rotateIngestKey (admin);
│                           #   beginPublish, endPublish, finalizePublishEnd (internal);
│                           #   sanitize() strips ingestKey; originForLive derives from key;
│                           #   create() generates a key; end() bumps publishEpoch
├── http.ts                 # + /ingest/publish and /ingest/unpublish HTTP actions
├── lib/
│   └── ingest.ts           # key generation + liveUrl derivation helpers (tested via exports)
└── __tests__/
    ├── ingest.auth.test.ts       # publish/unpublish HTTP action + mapping/eligibility
    ├── ingest.lifecycle.test.ts  # auto go-live / grace end / reconnect epoch
    └── streams.key.test.ts       # reveal/rotate + sanitize non-leak

app/
└── stream/[[...path]]/route.ts   # unchanged (origin now key-derived, still same-origin)

components/dashboard/
├── stream-title-card.tsx   # (or a small new card) reveal-key + rotate + ingest address UI
└── external-connections.tsx# unchanged (restream deferred)
```

**Structure Decision**: Existing single-repo web-app layout. The feature is almost entirely
backend (`convex/`); the only UI touch is an admin-only "Ingest" affordance on the dashboard
to reveal/rotate the key and show the ingest address. The HLS proxy route needs **no change** —
`originForLive` still returns a server-side origin, now derived from the key instead of a
pasted field.

## Complexity Tracking

> No constitution violations — not applicable.
