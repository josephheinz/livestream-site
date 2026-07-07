# Tech Stack

## Languages & runtimes
- TypeScript 5.x on Node.js 20+ — package manager: **pnpm**

## Frameworks
- Next.js 16.1 (App Router)
- React 19.2
- Tailwind CSS 4 + shadcn/ui (radix-ui, class-variance-authority, lucide-react, tw-animate-css)

## Data layer
- Convex 1.31 — backend, database, and server functions (`convex/`)
- **Read `convex/_generated/ai/guidelines.md` before writing Convex code**

## Auth
- Clerk (`@clerk/nextjs` 6, `@clerk/ui`)

## Test frameworks
- None configured yet — see `docs/TESTING-CONSIDERATIONS.md`
- Type check: `pnpm exec tsc --noEmit` — Lint: `pnpm lint`

## Build & deploy
- Local dev: `pnpm dev` (frontend) + `npx convex dev` (backend)
- Build: `pnpm build`
- Deploy: Vercel (frontend), `npx convex deploy` (backend)

## Notable
- Design source of truth: `docs/livestream-site-design-brief/` (Claude Design handoff — HTML prototypes)
