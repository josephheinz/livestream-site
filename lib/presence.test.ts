import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { api } from "@/convex/_generated/api";

// Mutations mocked at the module boundary; the hook is exercised through its
// exported signature only (constitution I, black-box).
const heartbeat = vi.fn();
const leave = vi.fn();
const useMutation = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (ref: unknown) => useMutation(ref),
}));

const HEARTBEAT_MS = 20_000;

async function loadHook() {
  const mod = await import("./presence");
  return mod.usePresence;
}

beforeEach(() => {
  heartbeat.mockReset();
  leave.mockReset();
  useMutation.mockReset();
  useMutation.mockImplementation((ref: unknown) =>
    getFunctionName(ref as never) === getFunctionName(api.presence.heartbeat)
      ? heartbeat
      : leave,
  );
  sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("usePresence", () => {
  it("heartbeats on mount with a per-tab sessionId kept in sessionStorage", async () => {
    const usePresence = await loadHook();
    renderHook(() => usePresence());

    expect(heartbeat).toHaveBeenCalledTimes(1);
    const arg = heartbeat.mock.calls[0][0] as { sessionId: string };
    expect(arg.sessionId).toEqual(expect.any(String));
    expect(arg.sessionId.length).toBeGreaterThan(0);
    // Same id is persisted for the tab so the backend session is stable.
    const stored = Object.values({ ...sessionStorage });
    expect(stored).toContain(arg.sessionId);
  });

  it("reuses the same sessionId across remounts in the same tab", async () => {
    const usePresence = await loadHook();
    const first = renderHook(() => usePresence());
    const firstId = (heartbeat.mock.calls[0][0] as { sessionId: string }).sessionId;
    first.unmount();
    heartbeat.mockClear();

    renderHook(() => usePresence());
    const secondId = (heartbeat.mock.calls[0][0] as { sessionId: string }).sessionId;
    expect(secondId).toBe(firstId);
  });

  it("re-sends a heartbeat on the ~20s interval", async () => {
    vi.useFakeTimers();
    const usePresence = await loadHook();
    renderHook(() => usePresence());
    expect(heartbeat).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(HEARTBEAT_MS);
    expect(heartbeat).toHaveBeenCalledTimes(2);
  });

  it("leaves on unmount", async () => {
    const usePresence = await loadHook();
    const { unmount } = renderHook(() => usePresence());
    const sessionId = (heartbeat.mock.calls[0][0] as { sessionId: string }).sessionId;

    unmount();
    expect(leave).toHaveBeenCalledWith({ sessionId });
  });

  it("leaves on pagehide", async () => {
    const usePresence = await loadHook();
    renderHook(() => usePresence());
    const sessionId = (heartbeat.mock.calls[0][0] as { sessionId: string }).sessionId;
    leave.mockClear();

    window.dispatchEvent(new Event("pagehide"));
    expect(leave).toHaveBeenCalledWith({ sessionId });
  });

  it("leaves when hidden and heartbeats when visible again", async () => {
    let visibilityState: DocumentVisibilityState = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(
      () => visibilityState,
    );
    const usePresence = await loadHook();
    renderHook(() => usePresence());
    const sessionId = (heartbeat.mock.calls[0][0] as { sessionId: string }).sessionId;
    heartbeat.mockClear();

    visibilityState = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));
    expect(leave).toHaveBeenCalledWith({ sessionId });

    visibilityState = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
    expect(heartbeat).toHaveBeenCalledWith({ sessionId });
  });

});
