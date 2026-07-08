import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let reduced = false;
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => reduced };
});

import { StatusIndicator, type StatusKind } from "./status-indicator";

afterEach(() => {
  reduced = false;
});

const KINDS: StatusKind[] = ["live", "onair", "offair", "connected"];

describe("StatusIndicator", () => {
  it("live blinks its dot and shows the LIVE label", () => {
    render(<StatusIndicator kind="live" />);
    expect(screen.getByTestId("indicator-dot").dataset.anim).toBe("blink");
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  it.each(KINDS)("%s renders a square dot (equal sides, never round)", (kind) => {
    render(<StatusIndicator kind={kind} />);
    const dot = screen.getByTestId("indicator-dot");
    expect(dot.style.width).toBe(dot.style.height);
    expect(dot.className).not.toContain("rounded-full");
  });

  it.each(KINDS)("%s applies no animation under reduced motion", (kind) => {
    reduced = true;
    render(<StatusIndicator kind={kind} />);
    const dot = screen.getByTestId("indicator-dot");
    expect(dot.dataset.anim).toBe("none");
    expect(dot.className).not.toContain("animate-");
  });
});
