# Phase 1 Contracts: Component & Route Interfaces

The "interfaces this feature exposes" are React component props and the route query-param contract.
These are the declared surfaces the black-box tests assert against (Constitution I). Signatures are
indicative TypeScript; exact class strings live in implementation.

## Route query-param contract

| Route | Param | Values | Default | Behavior |
|-------|-------|--------|---------|----------|
| `/` (Watch) | `live` | `"1"` / absent | off-air | `1` → live visuals + ON AIR |
| `/` (Watch) | `chat` | `signedin` \| `signedout` \| `banned` | `signedout` | selects chat panel state |
| `/dashboard` | `live` | `"1"` / absent | off-air | drives status stat + broadcast card |
| any | unknown/invalid value | — | documented default | never errors (spec Edge Cases) |

**Test**: given `?chat=banned`, the ban notice renders and the composer does not; given an unknown
`chat` value, the signed-out prompt renders.

## UI primitives (`components/ui/`)

```ts
// button.tsx — extend existing CVA
type ButtonVariant = 'cta' | 'accent' | 'solid' | 'outline' | 'mono' | /* existing shadcn variants */;
// cta=red primary, accent=yellow, solid=ink, outline=card, mono=Space Mono utility toggle

// status-indicator.tsx
type StatusKind = 'live' | 'onair' | 'offair' | 'connected';
interface StatusIndicatorProps { kind: StatusKind; label?: string; }
// live → blinking dot + label; onair/offair → square; connected → pulsing square.
// Square only (never rounded). Motion respects prefers-reduced-motion.

// titled-card.tsx
interface TitledCardProps { title: string; children: React.ReactNode; className?: string; }
// dark bar header (Archivo Black, uppercase) + 2px border + 4px offset shadow body.

// stat-card.tsx
interface StatCardProps { label: string; value: React.ReactNode; barColor: 'primary'|'green'|'yellow'|'muted'; }
// mono label, Archivo Black value, colored underline bar.

// input-group.tsx
interface InputGroupProps { placeholder?: string; buttonLabel: string; type?: string; onSubmit?: (v:string)=>void; }
// fused input + button joined by a 1px seam (flat inputs, no shadow).
```

**Tests (per primitive)**:
- Button: each variant renders with the expected role/text and the hover-lift + square-corner classes.
- StatusIndicator: `kind="live"` marks the blink element; `kind` is always square; with reduced
  motion, no animation is applied.
- TitledCard / StatCard / InputGroup: title/label/value/button text render; StatCard bar reflects
  `barColor`.

## Theme (`components/theme/`)

```ts
// theme-provider.tsx
interface ThemeProviderProps { children: React.ReactNode; }
// exposes useTheme(): { mode, resolved, cycle() }
// applies .dark to <html> per resolved; auto follows matchMedia with a live listener.

// theme-toggle.tsx  → renders "THEME:{MODE}", calls cycle() on click.
// theme-script.tsx  → inline pre-hydration script; no external imports.
```

**Tests**: cycle order `auto→light→dark→auto`; `dark` adds `.dark` to the root; `light` removes it;
`auto` maps to the mocked `matchMedia` result.

## Motion (`components/motion/motion-primitives.tsx`)

```ts
// Framer Motion wrappers, all reduced-motion aware via useReducedMotion()
export function Blink(props: { children: React.ReactNode });       // opacity blink; static if reduced
export function PulseSquare(props: { color?: string; size?: number }); // pulsing square; static if reduced
export function Ticker(props: { children: React.ReactNode; durationSec?: number }); // marquee; static if reduced
```

**Tests**: with `useReducedMotion()` mocked `true`, each renders its content without motion
props/animation; mounted at root under `<MotionConfig reducedMotion="user">`.

## Shared chrome (`components/site/`)

```ts
// banner.tsx    — logo+channelName, Watch/Dashboard nav (active state), live indicator, Subscribe,
//                 Sign In (opens AuthModal), ThemeToggle. Props: { live: boolean }.
// ticker-tape.tsx — scrolling messages (Ticker); Props: { items: string[] }.
// footer.tsx    — channelName + Watch/Dashboard/Sign In links.
// auth-modal.tsx — controlled modal; Props: { open, mode, onClose, onSwitchMode }.
```

**Tests**: banner marks the active route; Sign In opens the modal; footer links point to `/` and
`/dashboard`; auth modal switches signin↔signup (signup shows the username field) and closes on
backdrop/close.

## Watch sections (`components/watch/`)

```ts
// player.tsx      — Props: { live: boolean }; live→REC/CH/quality/LIVE NOW! + control bar;
//                   off→OFF AIR panel. Control bar affordances are inert.
// stream-info.tsx — Props: { stream: Stream }; titled header ON AIR/OFF AIR + metadata row.
// chat-panel.tsx  — Props: { state: ChatState }; signedin(messages+composer) / signedout(prompt) /
//                   banned(notice). Composer is inert (or local-echo only), no network.
```

## Dashboard sections (`components/dashboard/`)

```ts
// stat-row.tsx            — Props: { stats: DashboardStats }; four StatCards.
// external-connections.tsx— local ExternalConnection[]; add/toggle/remove; masked keys only.
// broadcast-card.tsx      — Props: { live }; ON AIR/OFF AIR + go-live/off toggle (local).
// banned-users.tsx        — local BannedUser[]; table + unban + empty state.
```

**Cross-cutting test (SC-005)**: rendering any route issues no network request (spy on `fetch`).
