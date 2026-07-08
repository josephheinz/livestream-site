import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { StatRow, type DashboardStats } from "./stat-row";
import { BroadcastCard } from "./broadcast-card";

const STATS: DashboardStats = {
  status: "ON AIR",
  watchingNow: "1,204",
  connectionsLive: "1/2",
  activeBans: 3,
};

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

describe("BroadcastCard", () => {
  function Harness() {
    const [live, setLive] = useState(false);
    return <BroadcastCard live={live} onToggle={() => setLive((v) => !v)} />;
  }

  it("reflects live state and toggles", () => {
    render(<Harness />);
    expect(screen.getByText("OFF AIR")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "GO LIVE" }));
    expect(screen.getByText(/ON AIR/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GO OFF AIR" })).toBeInTheDocument();
  });
});
