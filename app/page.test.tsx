import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: never) => {
    const p = props as Record<string, unknown>;
    const h = typeof href === "string" ? href : "#";
    return (
      <a href={h} {...p}>
        {children as never}
      </a>
    );
  },
}));

// hls.js is exercised by the wired Player; a minimal mock keeps the live branch
// from touching the real media library under jsdom.
vi.mock("hls.js", () => {
  class Hls {
    static isSupported() {
      return true;
    }
    static Events = { ERROR: "hlsError", MANIFEST_PARSED: "hlsManifestParsed" };
    static ErrorTypes = { NETWORK_ERROR: "networkError", MEDIA_ERROR: "mediaError", OTHER_ERROR: "otherError" };
    loadSource = vi.fn();
    attachMedia = vi.fn();
    on = vi.fn();
    startLoad = vi.fn();
    recoverMediaError = vi.fn();
    destroy = vi.fn();
  }
  return { default: Hls };
});

const useQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (ref: unknown, args?: unknown) => useQuery(ref, args),
  useMutation: () => vi.fn(),
  useConvexConnectionState: () => ({ isWebSocketConnected: true, hasEverConnected: true }),
}));

import Page from "./page";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AuthModalProvider } from "@/components/site/auth-modal";

type Stream = { _id: Id<"streams">; title: string; status: string; scheduledStart: number };

function mockData(opts: { live?: Stream | null; upcoming?: Stream[]; viewers?: number }) {
  useQuery.mockImplementation((ref: unknown, args?: unknown) => {
    if (ref == null) return undefined;
    const name = getFunctionName(ref as never);
    if (name === getFunctionName(api.streams.getLive)) return opts.live ?? null;
    if (name === getFunctionName(api.streams.listUpcoming)) return opts.upcoming ?? [];
    if (name === getFunctionName(api.presence.count)) return args === "skip" ? undefined : (opts.viewers ?? 0);
    return undefined;
  });
}

function renderWatch() {
  return render(
    <ThemeProvider>
      <AuthModalProvider>
        <Page />
      </AuthModalProvider>
    </ThemeProvider>
  );
}

beforeEach(() => useQuery.mockReset());
afterEach(() => vi.clearAllMocks());

describe("Watch route (/)", () => {
  it("live stream: renders the player, the real title, and the viewer count", () => {
    mockData({
      live: { _id: "s1" as Id<"streams">, title: "REAL BROADCAST TITLE", status: "live", scheduledStart: 0 },
      viewers: 1204,
    });
    renderWatch();
    expect(screen.getByText("REC")).toBeInTheDocument();
    expect(screen.getByRole("heading").textContent).toContain("REAL BROADCAST TITLE");
    expect(screen.getByTestId("banner-live").textContent).toMatch(/1,204 WATCHING/);
  });

  it("no live stream: renders off-air with the next slot from upcoming", () => {
    mockData({
      live: null,
      upcoming: [
        { _id: "s2" as Id<"streams">, title: "UPCOMING SHOW", status: "scheduled", scheduledStart: Date.UTC(2026, 6, 20, 1, 0) },
      ],
    });
    renderWatch();
    expect(screen.getAllByText("OFF AIR").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading").textContent).toContain("UPCOMING SHOW");
  });

  it("no query-param state forcing: the page reads no searchParams", () => {
    // FR-006: the route no longer accepts searchParams to force live/chat state.
    expect(Page.length).toBe(0);
    mockData({ live: null, upcoming: [] });
    renderWatch();
    expect(screen.getAllByText("OFF AIR").length).toBeGreaterThan(0);
  });

  it("imports no placeholder mock-data (SC-005)", () => {
    const source = readFileSync("app/page.tsx", "utf8");
    expect(source).not.toMatch(/lib\/mock-data/);
  });
});
