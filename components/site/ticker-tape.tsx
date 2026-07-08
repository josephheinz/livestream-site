"use client";

import { Ticker } from "@/components/motion/motion-primitives";
import type { TickerItem } from "@/lib/mock-data";

export function TickerTape({ items }: { items: TickerItem[] }) {
  const row = (dup: string) =>
    items.map((it, i) => (
      <span
        key={dup + i}
        className="px-[22px]"
        style={it.tone ? { color: `var(--${it.tone})` } : undefined}
      >
        {it.text}
      </span>
    ));
  return (
    <div className="flex-none border-t border-border bg-bar py-1.5 font-mono text-[12px] text-bar-ink">
      <Ticker>
        <span className="inline-block">
          {row("a")}
          {row("b")}
        </span>
      </Ticker>
    </div>
  );
}
