"use client";

import { Ticker } from "@/components/motion/motion-primitives";
import { MiniMessageText } from "@/components/ui/minimessage-text";

export type TickerItem = { text: string; tone?: "primary" | "green" };

// Minimal shape the ticker derives from — structurally the stream doc.
type LiveStream = { title: string };

/**
 * Ticker content derived from backend state (research D9): the live title
 * while on air, plus the admin-authored lines from settings.tickerItems
 * (editable on the Dashboard).
 */
export function tickerItemsFor(
  live: LiveStream | null | undefined,
  custom?: string[],
): TickerItem[] {
  const items: TickerItem[] = [];
  if (live) {
    items.push({ text: `● ON AIR — ${live.title}`, tone: "primary" });
  }
  for (const text of custom ?? []) {
    items.push({ text });
  }
  if (items.length === 0) {
    items.push({ text: "● OFF AIR — STREAM RESUMES SOON" });
  }
  return items;
}

export function TickerTape({ items }: { items: TickerItem[] }) {
  // Each copy spans at least the viewport with the items distributed evenly,
  // so short lists fill the whole tape and the loop's second copy never shows
  // alongside the first.
  const row = (dup: string) => (
    <span key={dup} className="inline-flex min-w-[100vw] justify-around align-top">
      {items.map((it, i) => (
        <span
          key={dup + i}
          className="px-[22px]"
          style={it.tone ? { color: `var(--${it.tone})` } : undefined}
        >
          <MiniMessageText text={it.text} />
        </span>
      ))}
    </span>
  );
  return (
    <div className="sticky bottom-0 z-40 w-full flex-none border-t border-border bg-bar py-1.5 font-mono text-[12px] text-bar-ink">
      <Ticker>
        <span className="inline-flex">
          {row("a")}
          {row("b")}
        </span>
      </Ticker>
    </div>
  );
}
