import type { Stream } from "@/lib/mock-data";

export function StreamInfo({ stream }: { stream: Stream }) {
  const meta: [string, string | number][] = [
    ["CHANNEL", stream.channel],
    ["DAY", stream.day],
    ["NEXT", stream.nextSlot],
    ["QUALITY", stream.quality],
  ];
  return (
    <div className="flex-none border-2 border-border bg-card shadow-brutal">
      <div className="flex items-center justify-between gap-2.5 bg-bar px-3.5 py-[9px] text-bar-ink">
        <span className="font-display text-[13px] tracking-[.02em] uppercase">{stream.streamTitle}</span>
        {stream.live ? (
          <span className="font-mono text-[12px] text-[#d47a72]">● ON AIR</span>
        ) : (
          <span className="font-mono text-[12px] text-bar-muted">OFF AIR</span>
        )}
      </div>
      <div className="px-4 py-3 text-sm leading-relaxed text-foreground">
        <p className="mb-2.5">
          A continuous single-camera broadcast from the main set. When the light is red, we&apos;re
          recording; when it&apos;s off, the tapes are resting. Talk to other viewers in chat,
          subscribe for the go-live ping, and don&apos;t feed the orbs.
        </p>
        <div className="flex flex-wrap gap-x-5 border-t border-border pt-[9px] font-mono text-[12px] text-muted-foreground">
          {meta.map(([k, v]) => (
            <span key={k}>
              {k} <b className="text-foreground">{v}</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
