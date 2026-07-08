<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- Modified principles: I. Test-First — scope expanded to cover internal code
  (internal.* functions, lib modules), not just outward-facing contracts
- Added sections: Core Principles (I. Test-First; II. Simplicity), Testing Standards, Governance
- Removed sections: unused template placeholder slots (principles 3–5, section 2/3 placeholders)
- Templates requiring updates:
  - ✅ .specify/templates/tasks-template.md (tests no longer optional; test tasks mandatory and first)
  - ✅ .specify/templates/plan-template.md (Constitution Check gate resolves against this file; no text change needed)
  - ✅ .specify/templates/spec-template.md (no change needed)
- Follow-up TODOs: none
-->

# Livestream Site Constitution

## Core Principles

### I. Test-First, Black-Box (NON-NEGOTIABLE)

Every functional change follows red-green-refactor:

1. Tests are written BEFORE implementation, and this applies to ALL code — outward-facing
   surfaces (HTTP endpoints, Convex `api.*` functions) and internal ones (Convex
   `internal.*` functions, shared lib/helper modules) alike. Black-box means each unit is
   tested through its own declared interface — the exported signature or registered
   function — never by reaching past it into module-private helpers, unexported state, or
   table layout beyond the schema contract.
2. Tests MUST be run and observed to FAIL before any implementation code is written.
3. Implementation then makes the tests pass without modifying the tests' assertions
   (fixing a genuinely wrong test is allowed, but the fix is justified against the
   spec, not against the implementation).

Rationale: black-box-first tests pin the behavior the spec promised, stay valid across
refactors, and prevent tests that merely mirror the implementation.

### II. Simplicity

Prefer the smallest change that satisfies the spec. No speculative abstractions,
no configuration for values that never vary, no new dependencies for what a few
lines cover. Complexity beyond this MUST be justified in the plan's Complexity
Tracking table.

## Testing Standards

- Test runner is Vitest; Convex functions are tested with `convex-test` through their
  registered entry points (`api.*` and `internal.*`), per
  `convex/_generated/ai/guidelines.md`. Internal lib modules are tested through their
  exports.
- Contract tests derive from `specs/[###-feature]/contracts/`; integration tests derive
  from user stories' Independent Test criteria.
- In tasks.md, every user story phase lists its test tasks before its implementation
  tasks, and implementation tasks depend on the tests existing and failing.

## Governance

This constitution supersedes other practice docs where they conflict. Amendments are
made by editing this file with a version bump (MAJOR: principle removal/redefinition,
MINOR: new principle or material expansion, PATCH: clarification) and updating
dependent templates in `.specify/templates/`. Plan-stage Constitution Checks and code
review MUST verify compliance; violations are either fixed or justified in Complexity
Tracking.

**Version**: 1.1.0 | **Ratified**: 2026-07-07 | **Last Amended**: 2026-07-07
