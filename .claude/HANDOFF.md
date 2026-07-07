# Handoff: Spec 001 Implementation Complete — Convex Data Architecture

**Branch**: `feature/001-convex-data-architecture` (no remote configured; nothing pushed)
**State**: All code tasks done and committed as six logical commits (`7c95bdd`..`32db1aa`).
26/27 tasks in `specs/001-convex-data-architecture/tasks.md` checked off.

## What was built (this session)

The complete Convex data layer per `specs/001-convex-data-architecture/` — read those
artifacts (spec/plan/research/data-model/contracts) for design authority; `docs/ADR.md`
(new, ADR-001..008) records the load-bearing decisions.

| Commit | Contents |
|---|---|
| `7c95bdd` | vitest + convex-test + svix deps, vitest.config.ts, convex 1.31→**1.42** (convex-test 0.0.54 requires it), messages template deleted |
| `544509c` | `convex/schema.ts` (7 tables), `convex/lib/auth.ts` guards, `convex/users.ts`, svix-verified Clerk webhook in `convex/http.ts` |
| `4ebd4da` | `convex/streams.ts` (lifecycle + listings + URL sanitization + internal origin queries), `/stream-origin` HTTP action, HLS proxy `app/stream/[[...path]]/route.ts` + `app/stream/hls.ts` playlist rewriting |
| `d9df80b` | `convex/chat.ts`, `presence.ts`, `reactions.ts`, `emojis.ts`, `crons.ts` (purges) |
| `85764e5` | `convex/clips.ts` — pointer clips, visibility derived from source at read time |
| `32db1aa` | lint fixes, `docs/ADR.md`, tasks.md checkoffs |

**Verification done**: 39/39 tests green (`pnpm test`), `tsc --noEmit` clean, `pnpm lint`
0 errors, and one real `npx convex dev --once` push succeeded (schema/crons/http all valid).
Convex test files (`convex/__tests__/*.test.ts`) are safe: the CLI skips multi-dot
filenames when bundling.

## Next steps

1. **T026 — manual two-browser validation** (the one unchecked task): follow
   `specs/001-convex-data-architecture/quickstart.md` steps 1–11. Needs a human
   (Clerk sign-in, setting `role: "admin"` on your user row via the Convex dashboard)
   and a running node-media-server for real HLS URLs.
2. **Env vars before the proxy/webhook work end-to-end**:
   - `STREAM_PROXY_SECRET` — same value in the Convex deployment env AND the Next.js env
     (the proxy route calls the secret-guarded `/stream-origin` HTTP action with it).
   - `CLERK_WEBHOOK_SECRET` — in the Convex deployment env (svix verification).
   - Proxy resolves the Convex site URL from `CONVEX_SITE_URL` /
     `NEXT_PUBLIC_CONVEX_SITE_URL`, else derives from `NEXT_PUBLIC_CONVEX_URL`.
3. **Check which deployment you're on**: `npx convex dev` connected to the cloud dev
   deployment `josephheinz-live` (deafening-sockeye-842), not the anonymous local one
   `.env.local` originally pointed at — logged-in CLI credentials took precedence.
4. **Frontend wiring is a later feature** (per plan.md): components consume the contract
   in `specs/001-convex-data-architecture/contracts/convex-functions.md` via
   `useQuery`/`useMutation`. `app/page.tsx` only got a minimal fix (uses `users.me`).
5. Optionally run `/speckit-converge` to double-check nothing in the spec is unbuilt,
   and a code review (`/code-review` or `bizstream-bcs:code-review`) before opening a PR.
   No remote exists yet — add one before pushing/PRing.

## Conventions that bit (or almost bit) this session

- Commit as `josephheinz <josephheinz28@gmail.com>` — repo-local config is set; verify
  with `git var GIT_AUTHOR_IDENT`.
- Never commit to `main`; stay on this feature branch.
- Read `convex/_generated/ai/guidelines.md` before Convex work (it exists; CLI says
  `npx convex ai-files update` has a newer version).
- Prefix shell commands with `rtk`; multi-line commit messages via bash heredoc
  (PowerShell here-strings mangle through rtk).
- Something else touches this worktree: another session's dev server runs here, an IDE
  Convex watcher regenerates `convex/_generated/*`, and `components/ConvexClientProvider.tsx`
  showed up modified without this session touching it. Check `git status` before staging.
