import { render, screen, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const connectionState = vi.fn();
vi.mock("convex/react", () => ({
  useConvexConnectionState: () => connectionState(),
}));

import { ConnectionStatus } from "./connection-status";

const GRACE_MS = 3000;

afterEach(() => {
  vi.useRealTimers();
  connectionState.mockReset();
});

describe("ConnectionStatus", () => {
  it("renders nothing while the connection is healthy", () => {
    connectionState.mockReturnValue({ isWebSocketConnected: true, hasEverConnected: true });
    render(<ConnectionStatus />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText(/connection lost/i)).toBeNull();
  });

  it("shows the retry strip immediately when a live connection drops", () => {
    connectionState.mockReturnValue({ isWebSocketConnected: false, hasEverConnected: true });
    render(<ConnectionStatus />);
    const strip = screen.getByRole("status");
    expect(strip).toBeInTheDocument();
    expect(strip.textContent).toMatch(/connection lost/i);
    expect(strip.textContent).toMatch(/retrying/i);
  });

  it("stays quiet during the initial grace window, then shows the strip when initial queries stall", () => {
    vi.useFakeTimers();
    connectionState.mockReturnValue({ isWebSocketConnected: false, hasEverConnected: false });
    render(<ConnectionStatus />);
    // Inside the grace window: no strip yet (avoid flashing on first paint).
    expect(screen.queryByRole("status")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(GRACE_MS);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status").textContent).toMatch(/connection lost/i);
  });

  it("never renders mock or placeholder content", () => {
    connectionState.mockReturnValue({ isWebSocketConnected: false, hasEverConnected: true });
    render(<ConnectionStatus />);
    expect(screen.queryByText(/LIVE NOW/i)).toBeNull();
    expect(screen.queryByText(/WATCHING/i)).toBeNull();
  });
});
