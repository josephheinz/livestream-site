import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// DashboardBody owns the live queries + go-live mutations (research D7/D8); the
// StatRow stays a pure prop-driven component (frozen visuals).
const goLiveMock = vi.fn();
const endMock = vi.fn();
const createMock = vi.fn();
const useQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (ref: unknown, args?: unknown) => useQuery(ref, args),
  useMutation: (ref: unknown) => {
    const name = getFunctionName(ref as never);
    if (name === getFunctionName(api.streams.goLive)) return goLiveMock;
    if (name === getFunctionName(api.streams.end)) return endMock;
    if (name === getFunctionName(api.streams.create)) return createMock;
    return vi.fn();
  },
}));

import { StatRow, type DashboardStats } from "./stat-row";
import { DashboardBody } from "./dashboard-body";

const STATS: DashboardStats = {
  status: "ON AIR",
  watchingNow: "1,204",
  connectionsLive: "1/2",
  activeBans: 3,
};

type Stream = {
  _id: Id<"streams">;
  title: string;
  status: string;
  scheduledStart: number;
  ingestActive?: boolean;
};

function mockData(opts: {
  me?: { role?: "admin" } | null;
  live?: Stream | null;
  upcoming?: Stream[];
  bans?: unknown[];
  viewers?: number;
}) {
  useQuery.mockImplementation((ref: unknown, args?: unknown) => {
    if (ref == null) return undefined;
    const name = getFunctionName(ref as never);
    if (name === getFunctionName(api.users.me)) return opts.me ?? { role: "admin" };
    if (name === getFunctionName(api.streams.getLive)) return opts.live ?? null;
    if (name === getFunctionName(api.streams.listUpcoming)) return opts.upcoming ?? [];
    if (name === getFunctionName(api.bans.list)) return opts.bans ?? [];
    if (name === getFunctionName(api.presence.count)) return args === "skip" ? undefined : (opts.viewers ?? 0);
    return undefined;
  });
}

beforeEach(() => {
  useQuery.mockReset();
  goLiveMock.mockReset();
  endMock.mockReset();
  createMock.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("StatRow", () => {
  it("renders four stat cards with the documented bar colors", () => {
    render(<StatRow stats={STATS} />);
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Watching now")).toBeInTheDocument();
    expect(screen.getByText("Connections live")).toBeInTheDocument();
    expect(screen.getByText("Active bans")).toBeInTheDocument();

    const bars = screen.getAllByTestId("stat-bar");
    expect(bars).toHaveLength(4);
    expect(bars.map((b) => b.dataset.color)).toEqual(["primary", "green", "yellow", "muted"]);

    expect(screen.getByText("1,204")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

describe("DashboardBody (wired stats — research D7)", () => {
  it("maps stats: status/watching from getLive+presence, connections honest 0/0, bans from bans.list", () => {
    mockData({
      live: { _id: "s1" as Id<"streams">, title: "ON AIR NOW", status: "live", scheduledStart: 0 },
      viewers: 1204,
      bans: [{ _id: "b1" }, { _id: "b2" }, { _id: "b3" }],
    });
    render(<DashboardBody />);
    expect(screen.getAllByText("ON AIR").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("0/0")).toBeInTheDocument();
    expect(screen.getAllByText("1,204").length).toBeGreaterThanOrEqual(1);
    // Active bans stat reflects bans.list length.
    const bars = screen.getAllByTestId("stat-bar");
    const bansCard = bars.find((b) => b.dataset.color === "muted")!.parentElement!;
    expect(bansCard).toHaveTextContent("3");
  });

  it("off air: watching shows an em dash and status is OFF AIR", () => {
    mockData({ live: null, bans: [] });
    render(<DashboardBody />);
    expect(screen.getAllByText("OFF AIR").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("DashboardBody (go-live control — research D8)", () => {
  it("GO LIVE transitions an armed upcoming stream via streams.goLive", async () => {
    mockData({
      live: null,
      upcoming: [
        {
          _id: "up1" as Id<"streams">,
          title: "NEXT",
          status: "scheduled",
          scheduledStart: 0,
          ingestActive: true,
        },
      ],
    });
    render(<DashboardBody />);
    fireEvent.click(screen.getAllByRole("button", { name: "GO LIVE" })[0]);
    await waitFor(() => expect(goLiveMock).toHaveBeenCalledWith({ streamId: "up1" }));
    expect(createMock).not.toHaveBeenCalled();
  });

  it("shows a disabled NO SIGNAL control when no armed stream exists", () => {
    mockData({
      live: null,
      upcoming: [
        {
          _id: "up1" as Id<"streams">,
          title: "NEXT",
          status: "scheduled",
          scheduledStart: 0,
          ingestActive: false,
        },
      ],
    });
    render(<DashboardBody />);
    fireEvent.click(screen.getByRole("button", { name: "NO SIGNAL" }));
    expect(screen.getByRole("button", { name: "NO SIGNAL" })).toBeDisabled();
    expect(goLiveMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("GO OFF AIR ends the live stream via streams.end", async () => {
    mockData({
      live: { _id: "s1" as Id<"streams">, title: "LIVE", status: "live", scheduledStart: 0 },
      viewers: 10,
    });
    render(<DashboardBody />);
    fireEvent.click(screen.getAllByRole("button", { name: "GO OFF AIR" })[0]);
    await waitFor(() => expect(endMock).toHaveBeenCalledWith({ streamId: "s1" }));
  });
});
