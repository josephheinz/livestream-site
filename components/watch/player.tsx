import { Blink } from "@/components/motion/motion-primitives";
import { stream } from "@/lib/mock-data";

const ctrlBtn =
  "flex h-[30px] w-[30px] items-center justify-center border border-[rgba(200,190,165,.35)] text-[#d6cfbc]";

// Video-player placeholder — distinct live / off-air visuals with an inert,
// overlaid control bar.
export function Player({ live }: { live: boolean }) {
  return (
    <div className="relative min-h-[240px] flex-1 overflow-hidden border-2 border-border bg-[#16140f] shadow-brutal">
      {live ? (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(120% 90% at 50% 40%, #1b1813 0%, #100e0a 78%)",
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 1px, transparent 1px 3px)",
            }}
          />
          <div className="absolute top-3 left-3.5 font-mono text-[12px] font-bold tracking-[.06em] text-[#d47a72]">
            <Blink>●</Blink> REC
          </div>
          <div className="absolute top-3 right-3.5 font-mono text-[11px] text-[#a59d89]">
            CH {stream.channel} · {stream.quality}
          </div>
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[13px] tracking-[.14em] text-[#6f6a58]">
            [ LIVE CAMERA FEED ]
          </div>
          <div className="absolute top-7 -right-1.5 rotate-[9deg] border-2 border-[#57524a] bg-yellow px-3.5 py-1.5 font-display text-[15px] text-[#3a352c] uppercase shadow-[2px_2px_0_rgba(0,0,0,.35)]">
            LIVE NOW!
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-[repeating-linear-gradient(45deg,#14120e_0_14px,#1b1914_14px_28px)] text-center">
          <div className="font-display leading-[.9] text-[#b3ab97]" style={{ fontSize: "min(8vw,60px)" }}>
            OFF AIR
          </div>
          <div className="font-mono text-[12px] tracking-[.2em] text-[#847d6a]">
            STREAM RESUMES SOON — STAND BY
          </div>
        </div>
      )}

      <div
        data-testid="player-controls"
        className="absolute right-2.5 bottom-2.5 left-2.5 flex items-center gap-2.5 border border-[rgba(200,190,165,.25)] bg-[rgba(22,20,15,.72)] px-2.5 py-[7px] backdrop-blur-[5px]"
      >
        <div className={`${ctrlBtn} text-[11px]`}>❚❚</div>
        <div className="min-w-[44px] text-center font-mono text-[12px] font-bold">
          {live ? <span className="text-[#d47a72]">LIVE</span> : <span className="text-[#847d6a]">--:--</span>}
        </div>
        <div className="relative h-1.5 flex-1 bg-[rgba(200,190,165,.2)]">
          <div className="absolute inset-y-0 left-0 w-full bg-primary" />
          <div className="absolute -top-1 -right-0.5 h-[13px] w-[13px] border border-[#16140f] bg-[#d6cfbc]" />
        </div>
        <div className={`${ctrlBtn} font-sans text-[10px] font-bold`}>CC</div>
        <div className={`${ctrlBtn} text-[13px]`}>⚙</div>
        <div className={`${ctrlBtn} text-[14px]`}>⛶</div>
      </div>
    </div>
  );
}
