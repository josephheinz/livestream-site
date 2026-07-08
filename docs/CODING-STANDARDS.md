# Coding Standards

## Naming

- Files and folders: `kebab-case`
- Variables and functions: `camelCase`
- Types, classes, components: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Booleans: prefix with `is`, `has`, `should`, `can`

## Function design

- Functions are small and do one thing. If you can't summarize the function in one short sentence, split it.
- Prefer guard clauses for early returns over nested conditionals.
- Extract complex inline logic to named helper functions. Names beat comments.
- Orchestrating functions read like a high-level story; details live in helpers.

## Type safety

- No untyped `any` where a real type fits.
- Prefer union / literal types over bare `string` where the set is known.
- Prefer `interface` / typed objects over `Record<string, any>`.
- Function parameters use the narrowest type that works.

## Imports

- Order: standard library → third-party → local. Blank line between groups.
- No circular imports. Refactor when a cycle appears.
- Remove unused imports.

## Principles

- **YAGNI.** Don't build for speculative needs. No abstractions, config, or scaffolding "for later" — later can build for itself.
- **Functions do one thing.** One function, one responsibility, one level of abstraction. If you can't name it in one short verb phrase, split it.
- **SOLID.**
  - *Single responsibility* — a module has one reason to change.
  - *Open/closed* — extend behavior via composition, not by editing stable code.
  - *Liskov substitution* — subtypes honor the contract of their base type.
  - *Interface segregation* — small, focused interfaces over fat ones.
  - *Dependency inversion* — depend on abstractions at boundaries (but see YAGNI: don't invert a dependency that has one implementation and no seam worth testing).

## Architecture conventions

- Business logic does NOT live in route handlers or presentation components — it lives in Convex functions or `lib/`.
- Database rows map to domain objects at the data-access boundary, not in views.
- Modules are created for encapsulation, even when not yet reused.

## Things to avoid

- Magic strings and numbers — extract to named constants.
- Deep nesting — refactor with guard clauses or extracted helpers.
- Premature abstraction — wait for the third example before generalizing.
- Comments that describe *what* the code does. The code says *what*; comments say *why*.
