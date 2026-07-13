# MUST READ

**Never commit directly to `main`.** All work happens on a feature branch (`feature/`, `fix/`, `chore/`) and lands via PR. If you're on `main` and about to make changes, create a branch first. No exceptions.

**Do not require a design spec or approval gate for ordinary implementation edits.** When the user asks to implement or change code, inspect the relevant context and proceed directly unless a genuinely material product decision is missing.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

<!-- bizstream-bcs:start -->
## BizStream BCS docs

For project context, read these:
- `docs/TECH-STACK.md`
- `docs/CODING-STANDARDS.md`
- `docs/DESIGN-PRINCIPLES.md`
- `docs/TESTING-CONSIDERATIONS.md`
- `docs/ADR.md`
- `docs/USING-GITHUB.md` — and check `~/.codex/AGENTS.md` plus per-project auto-memory for personal overrides before any GitHub write operation
<!-- bizstream-bcs:end -->
