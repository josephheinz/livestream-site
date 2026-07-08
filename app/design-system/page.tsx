import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { TitledCard } from "@/components/ui/titled-card";
import { InputGroup } from "@/components/ui/input-group";
import { ThemeToggle } from "@/components/theme/theme-toggle";

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3.5 border-b-2 border-border pb-2.5 font-display text-[22px] uppercase">
        {heading}
      </h2>
      {children}
    </section>
  );
}

function Swatch({ hex, name, note }: { hex: string; name: string; note?: string }) {
  return (
    <div className="border-2 border-border shadow-brutal-sm">
      <div className="h-14" style={{ background: hex }} />
      <div className="bg-card px-2.5 py-2 font-mono text-[11px] leading-relaxed">
        <b>{name}</b>
        <br />
        {note ?? hex}
      </div>
    </div>
  );
}

const LIGHT = [
  { name: "paper", hex: "#E9E4D8" },
  { name: "card", hex: "#F3EFE4" },
  { name: "ink", hex: "#3A352C" },
  { name: "muted", hex: "#847C6B" },
  { name: "bar", hex: "#2E2B26" },
];
const ACCENTS = [
  { name: "primary", hex: "#C9524F", note: "#C9524F · CTA / live" },
  { name: "yellow", hex: "#E3B45C", note: "#E3B45C · highlight" },
  { name: "green", hex: "#5B9B72", note: "#5B9B72 · ok / brand" },
  { name: "line", hex: "#77705F", note: "#77705F · borders" },
  { name: "shadow", hex: "rgba(58,53,44,.16)", note: "rgba ink @ 16%" },
];
const DARK = [
  { name: "paper", hex: "#1D1C1A" },
  { name: "card", hex: "#26241F" },
  { name: "ink", hex: "#C9C1B0" },
  { name: "primary", hex: "#D05B57" },
  { name: "green", hex: "#5FA377" },
];

const swatchGrid = "grid grid-cols-3 gap-3 md:grid-cols-5";
const label = "mb-2.5 font-mono text-[11px] uppercase tracking-[.12em] text-muted-foreground";
const flatInput =
  "w-full border border-border bg-input px-2.5 py-[9px] font-sans text-sm text-foreground outline-none";
const fieldLabel = "mb-[5px] block text-[11px] font-bold uppercase tracking-[.06em]";

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* header */}
      <header className="flex flex-wrap items-end gap-4 bg-bar px-7 py-6 text-bar-ink">
        <div>
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "13px solid transparent",
                borderRight: "13px solid transparent",
                borderBottom: "22px solid var(--green)",
              }}
            />
            <div className="font-display text-[30px] leading-none uppercase">Nightchannel</div>
          </div>
          <div className="mt-2.5 font-mono text-[12px] tracking-[.1em] text-bar-muted">
            DESIGN SYSTEM — SOFTENED NEOBRUTALISM · V2
          </div>
        </div>
        <div className="flex-1" />
        <ThemeToggle className="px-3 py-[7px] text-[12px]" />
      </header>

      <div className="mx-auto flex max-w-[1100px] flex-col gap-9 px-6 pt-7 pb-16">
        <Section heading="01 — Principles">
          <div className="grid gap-3.5 md:grid-cols-2">
            <div className="border-2 border-border bg-card p-4 text-sm leading-relaxed shadow-brutal">
              <b>Softened neobrutalism.</b> Chunky type, visible borders, and hard offset shadows —
              but on warm charcoal-and-cream instead of pure black-on-white. Contrast is legible,
              never straining.
            </div>
            <div className="border-2 border-border bg-card p-4 text-sm leading-relaxed shadow-brutal">
              <b>Broadcast-room utility.</b> Mono type for data and status, blinking/pulsing
              indicators for live state, flat surfaces, no gradients or rounded corners. Everything
              looks like equipment.
            </div>
          </div>
        </Section>

        <Section heading="02 — Color">
          <div className={label}>Light theme</div>
          <div className={`${swatchGrid} mb-5`}>
            {LIGHT.map((s) => (
              <Swatch key={s.name} {...s} />
            ))}
          </div>
          <div className={label}>Accents (shared)</div>
          <div className={`${swatchGrid} mb-5`}>
            {ACCENTS.map((s) => (
              <Swatch key={s.name} {...s} />
            ))}
          </div>
          <div className={label}>Dark theme</div>
          <div className={swatchGrid}>
            {DARK.map((s) => (
              <Swatch key={s.name} {...s} />
            ))}
          </div>
        </Section>

        <Section heading="03 — Typography">
          <div className="border-2 border-border bg-card shadow-brutal">
            <div className="flex flex-wrap items-baseline gap-5 border-b border-border px-5 py-[18px]">
              <div className="font-display text-[38px] leading-none uppercase">Archivo Black</div>
              <div className="font-mono text-[12px] text-muted-foreground">
                display · headings, buttons, card titles · always uppercase · 13–42px
              </div>
            </div>
            <div className="flex flex-wrap items-baseline gap-5 border-b border-border px-5 py-[18px]">
              <div className="text-2xl leading-tight">Space Grotesk — body &amp; UI copy, 400/700</div>
              <div className="font-mono text-[12px] text-muted-foreground">
                body · 13–15px · line-height 1.4–1.55
              </div>
            </div>
            <div className="flex flex-wrap items-baseline gap-5 px-5 py-[18px]">
              <div className="font-mono text-[18px]">SPACE MONO — DATA, STATUS, LABELS</div>
              <div className="font-mono text-[12px] text-muted-foreground">
                mono · 10–15px · letter-spacing .04–.2em · uppercase for labels
              </div>
            </div>
          </div>
        </Section>

        <Section heading="04 — Buttons">
          <div className="flex flex-col gap-4 border-2 border-border bg-card p-5 shadow-brutal">
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="cta" className="h-auto px-5 py-2.5">
                Primary CTA
              </Button>
              <Button variant="accent" className="h-auto px-4 py-2.5">
                Accent
              </Button>
              <Button variant="solid" className="h-auto px-4 py-2.5">
                Solid
              </Button>
              <Button variant="outline" className="h-auto px-4 py-2.5">
                Outline
              </Button>
              <Button variant="mono" className="h-auto px-3 py-1.5">
                ON
              </Button>
            </div>
            <div className="border-t border-border pt-3 font-mono text-[12px] text-muted-foreground">
              RULES — square corners · 2px border · 3px offset shadow · hover = translate(-1px,-1px) ·
              primary = red CTA, yellow = secondary emphasis, mono toggles for utility
            </div>
          </div>
        </Section>

        <Section heading="05 — Forms">
          <div className="grid items-start gap-3.5 md:grid-cols-2">
            <div className="border-2 border-border bg-card p-[18px] shadow-brutal">
              <label className={fieldLabel}>Text field</label>
              <input className={`${flatInput} mb-[13px]`} placeholder="you@address.net" />
              <label className={fieldLabel}>Secret (write-only)</label>
              <input className={`${flatInput} font-mono`} type="password" placeholder="stream key" />
            </div>
            <div className="flex flex-col gap-3 border-2 border-border bg-card p-[18px] shadow-brutal">
              <div className={label + " mb-0"}>Attached action</div>
              <InputGroup placeholder="Say something..." buttonLabel="Send" />
              <div className="font-mono text-[12px] text-muted-foreground">
                Inputs are flat: 1px border, tinted background, no shadow. Buttons fuse to inputs with
                a 1px seam.
              </div>
            </div>
          </div>
        </Section>

        <Section heading="06 — Cards">
          <div className="grid items-start gap-3.5 md:grid-cols-2">
            <TitledCard title="Titled card">
              Dark bar header in Archivo Black, 2px border, 4px offset shadow. The workhorse container
              for every panel.
            </TitledCard>
            <StatCard className="max-w-[260px]" label="Stat card" value="1,204" barColor="green" />
          </div>
        </Section>

        <Section heading="07 — Status & Live">
          <div className="flex flex-wrap items-center gap-x-7 gap-y-3 border-2 border-border bg-card p-5 shadow-brutal">
            <StatusIndicator kind="live" label="LIVE — 1,204 WATCHING" />
            <StatusIndicator kind="onair" />
            <StatusIndicator kind="offair" />
            <StatusIndicator kind="connected" />
            <div className="basis-full border-t border-border pt-3 font-mono text-[12px] text-muted-foreground">
              Live = blink (step-end). Connections = soft pulse. Squares, never circles or pills.
              Status text is always Space Mono, uppercase.
            </div>
          </div>
        </Section>

        <Section heading="08 — Layout Rules">
          <div className="border-2 border-border bg-card px-5 py-[18px] text-sm shadow-brutal">
            <div className="grid grid-cols-[auto_1fr] gap-x-[18px] gap-y-1.5 text-[13px]">
              <span className="font-mono text-muted-foreground">CORNERS</span>
              <span>0px everywhere — no border-radius, ever</span>
              <span className="font-mono text-muted-foreground">BORDERS</span>
              <span>
                2px <b>line</b> on containers, 1px on rows and inputs
              </span>
              <span className="font-mono text-muted-foreground">SHADOWS</span>
              <span>
                hard offset only: 4px 4px 0 <b>shadow</b> (3px on buttons), no blur
              </span>
              <span className="font-mono text-muted-foreground">SPACING</span>
              <span>14–20px gaps between cards, 14–16px card padding</span>
              <span className="font-mono text-muted-foreground">HOVER</span>
              <span>translate(-1px,-1px) — the element lifts toward its shadow</span>
              <span className="font-mono text-muted-foreground">CHROME</span>
              <span>
                page frame (banner, ticker, footer) uses <b>bar</b> surfaces in both themes
              </span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
