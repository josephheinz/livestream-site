# Testing Considerations

## The bar

**Every PR has tests.** If a PR changes behavior, it ships with tests that prove the behavior.

## What we test

- **Unit tests** (vitest) for all business logic — Convex functions, validators, transformers, utilities. If it has a branch, it has a test.
- **Convex functions** tested with `convex-test` against the local Convex runtime — not mocked.
- **E2E tests** (Playwright) for critical user flows: landing → find stream → play; auth flows.
- **Type checks count as tests.** `pnpm exec tsc --noEmit` is a required gate, same as the suites.

## What we skip

- Snapshot tests for component rendering — brittle, low-signal.
- Tests for thin pass-through wrappers around well-tested libraries.

## Test data approach

- Synthetic fixtures only. No production data ever.

## When tests run

- Locally before push.
- In CI on every PR — required to pass before merge.

## Status

No test framework is installed yet. First PR that adds logic also adds vitest + convex-test; Playwright comes with the first critical UI flow.
