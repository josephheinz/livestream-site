"use client";

import { useEffect, useRef } from "react";
import { Blink } from "@/components/motion/motion-primitives";
import {
  MediaPlayer,
  MediaPlayerControls,
  MediaPlayerFullscreen,
  MediaPlayerPlay,
  MediaPlayerSeek,
  MediaPlayerVideo,
  MediaPlayerVolume,
} from "@/components/ui/media-player";
import { TooltipProvider } from "@/components/ui/tooltip";

const ctrlBtn =
  "size-[30px] rounded-none border border-[rgba(200,190,165,.35)] text-[#d6cfbc] hover:bg-[rgba(200,190,165,.15)] hover:text-[#d6cfbc]";

// The 001 proxy serves same-origin HLS here (research D1); playback never touches
// the encoder origin directly.
const LIVE_PROXY_PATH = "/stream/live.m3u8";
// Decorative chrome — the backend tracks no channel/quality fields.
const CHANNEL = "01";
const QUALITY = "1080p";

/**
 * Attaches the live HLS feed to `video`, lazy-loading hls.js for MSE browsers and
 * falling back to native HLS on Safari/iOS (research D1). Returns a cleanup fn.
 * Recovers from transient (fatal) network/media errors instead of freezing (FR-004).
 */
function playLive(video: HTMLVideoElement): () => void {
  let disposed = false;
  let hls: { destroy: () => void } | null = null;

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = LIVE_PROXY_PATH;
    return () => {
      video.removeAttribute("src");
      video.load();
    };
  }

  void import("hls.js").then(({ default: Hls }) => {
    if (disposed || !Hls.isSupported()) return;
    // Ride 2 segments behind the live edge (default is 3) — with 2s segments
    // (OBS keyframe interval 2s, see README) that's ~4-5s glass-to-glass.
    const instance = new Hls({ liveSyncDurationCount: 2 });
    hls = instance;
    instance.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        instance.startLoad();
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        instance.recoverMediaError();
      } else {
        instance.destroy();
      }
    });
    instance.loadSource(LIVE_PROXY_PATH);
    instance.attachMedia(video);
  });

  return () => {
    disposed = true;
    hls?.destroy();
  };
}

// Video player with distinct live / off-air visuals; live controls are Dice UI
// media-player parts restyled to the site's brutalist chrome.
export function Player({ live }: { live: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!live || videoRef.current === null) return;
    return playLive(videoRef.current);
  }, [live]);

  return (
    <div className="relative min-h-[240px] flex-1 overflow-hidden border-2 border-border bg-[#16140f] shadow-brutal">
      {live ? (
        <TooltipProvider>
        <MediaPlayer
          label="Live stream"
          className="absolute inset-0 rounded-none bg-transparent"
        >
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(120% 90% at 50% 40%, #1b1813 0%, #100e0a 78%)",
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 1px, transparent 1px 3px)",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[13px] tracking-[.14em] text-[#6f6a58]">
            [ LIVE CAMERA FEED ]
          </div>
          <MediaPlayerVideo
            ref={videoRef}
            data-testid="player-video"
            autoPlay
            playsInline
            muted
            className="h-full w-full object-contain"
          />
          <div className="pointer-events-none absolute top-3 left-3.5 font-mono text-[12px] font-bold tracking-[.06em] text-[#d47a72]">
            <Blink>●</Blink> REC
          </div>
          <div className="pointer-events-none absolute top-3 right-3.5 font-mono text-[11px] text-[#a59d89]">
            CH {CHANNEL} · {QUALITY}
          </div>
          <div className="pointer-events-none absolute top-7 -right-1.5 rotate-[9deg] border-2 border-[#57524a] bg-yellow px-3.5 py-1.5 font-display text-[15px] text-[#3a352c] uppercase shadow-[2px_2px_0_rgba(0,0,0,.35)]">
            LIVE NOW!
          </div>

          <MediaPlayerControls
            data-testid="player-controls"
            className="absolute right-2.5 bottom-2.5 left-2.5 flex-row items-center gap-2.5 rounded-none border border-[rgba(200,190,165,.25)] bg-[rgba(22,20,15,.72)] px-2.5 py-[7px] backdrop-blur-[5px]"
          >
            <MediaPlayerPlay className={ctrlBtn} />
            <div className="min-w-[44px] text-center font-mono text-[12px] font-bold">
              <span className="text-[#d47a72]">LIVE</span>
            </div>
            <MediaPlayerSeek
              tooltipSideOffset={12}
              className="flex-1 [&_[role=slider]]:size-[13px] [&_[role=slider]]:rounded-none [&_[role=slider]]:border [&_[role=slider]]:border-[#16140f] [&_[role=slider]]:bg-[#d6cfbc] [&_span]:rounded-none"
            />
            <MediaPlayerVolume
              expandable
              className="[&_[role=slider]]:rounded-none [&_[role=slider]]:bg-[#d6cfbc] [&_span]:rounded-none"
            />
            <MediaPlayerFullscreen className={ctrlBtn} />
          </MediaPlayerControls>
        </MediaPlayer>
        </TooltipProvider>
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
    </div>
  );
}
