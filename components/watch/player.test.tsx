import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as React from "react";

// hls.js is mocked at the module boundary; the Player is exercised through its
// rendered behavior and the calls it makes into the (mocked) player library.
const loadSource = vi.fn();
const attachMedia = vi.fn();
const on = vi.fn();
const startLoad = vi.fn();
const recoverMediaError = vi.fn();
const destroy = vi.fn();
const cfg = { supported: true };

// Dice UI's media-player (via media-chrome) injects modern CSS that jsdom's
// css-tree parser can't handle; the primitives are mocked with plain elements.
// Real playback/controls are verified in the browser, not here.
vi.mock("@/components/ui/media-player", () => ({
  MediaPlayer: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  MediaPlayerVideo: (props: React.ComponentProps<"video">) => <video {...props} />,
  MediaPlayerControls: (props: React.ComponentProps<"div">) => <div {...props} />,
  MediaPlayerPlay: () => <button type="button" aria-label="Play" />,
  MediaPlayerSeek: ({ className }: { className?: string }) => (
    <div data-slot="media-player-seek" className={className} />
  ),
  MediaPlayerVolume: () => <div data-slot="media-player-volume" />,
  MediaPlayerFullscreen: () => <button type="button" aria-label="Fullscreen" />,
}));

vi.mock("hls.js", () => {
  class Hls {
    static isSupported() {
      return cfg.supported;
    }
    static Events = { ERROR: "hlsError", MANIFEST_PARSED: "hlsManifestParsed" };
    static ErrorTypes = {
      NETWORK_ERROR: "networkError",
      MEDIA_ERROR: "mediaError",
      OTHER_ERROR: "otherError",
    };
    loadSource = loadSource;
    attachMedia = attachMedia;
    on = on;
    startLoad = startLoad;
    recoverMediaError = recoverMediaError;
    destroy = destroy;
  }
  return { default: Hls };
});

import { Player } from "./player";

const LIVE_PROXY_PATH = "/stream/live.m3u8";

beforeEach(() => {
  loadSource.mockReset();
  attachMedia.mockReset();
  on.mockReset();
  startLoad.mockReset();
  recoverMediaError.mockReset();
  destroy.mockReset();
  cfg.supported = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Player", () => {
  it("keeps the live visual: REC, channel/quality, LIVE NOW! and a control bar", () => {
    render(<Player live />);
    expect(screen.getByText("REC")).toBeInTheDocument();
    expect(screen.getByText(/1080p/)).toBeInTheDocument();
    expect(screen.getByText("LIVE NOW!")).toBeInTheDocument();
    expect(screen.getByTestId("player-controls")).toBeInTheDocument();
  });

  it("keeps the off-air visual: OFF AIR panel and stand-by copy", () => {
    render(<Player live={false} />);
    expect(screen.getByText("OFF AIR")).toBeInTheDocument();
    expect(screen.getByText(/STREAM RESUMES SOON/)).toBeInTheDocument();
  });

  it("off-air: hides the control bar (nothing to control)", () => {
    render(<Player live={false} />);
    expect(screen.queryByTestId("player-controls")).toBeNull();
  });

  it("live: attaches the HLS proxy playlist to the video via hls.js", async () => {
    render(<Player live />);
    await waitFor(() => expect(loadSource).toHaveBeenCalledWith(LIVE_PROXY_PATH));
    expect(attachMedia).toHaveBeenCalledWith(screen.getByTestId("player-video"));
  });

  it("live: falls back to native HLS when MSE is unsupported", async () => {
    cfg.supported = false;
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("maybe");
    render(<Player live />);
    const video = screen.getByTestId("player-video") as HTMLVideoElement;
    await waitFor(() => expect(video.getAttribute("src")).toBe(LIVE_PROXY_PATH));
    expect(loadSource).not.toHaveBeenCalled();
  });

  it("live: recovers from a transient (fatal) network error without crashing", async () => {
    render(<Player live />);
    await waitFor(() => expect(on).toHaveBeenCalled());
    const errorHandler = on.mock.calls.find((c) => c[0] === "hlsError")?.[1] as
      | ((event: string, data: { fatal: boolean; type: string }) => void)
      | undefined;
    expect(errorHandler).toBeTypeOf("function");
    errorHandler!("hlsError", { fatal: true, type: "networkError" });
    expect(startLoad).toHaveBeenCalled();
  });

  it("off-air: never touches the player library", () => {
    render(<Player live={false} />);
    expect(loadSource).not.toHaveBeenCalled();
    expect(attachMedia).not.toHaveBeenCalled();
  });
});
