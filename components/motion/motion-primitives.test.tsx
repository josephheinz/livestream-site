import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Force the reduced-motion path.
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => true };
});

import { Blink, PulseSquare, Ticker } from "./motion-primitives";

describe("motion primitives under reduced motion", () => {
  it("Blink renders its children statically", () => {
    render(
      <Blink>
        <span>● LIVE</span>
      </Blink>
    );
    expect(screen.getByText("● LIVE")).toBeInTheDocument();
  });

  it("Ticker renders its children statically", () => {
    render(
      <Ticker>
        <span>NEXT BROADCAST 21:00 ET</span>
      </Ticker>
    );
    expect(screen.getByText("NEXT BROADCAST 21:00 ET")).toBeInTheDocument();
  });

  it("PulseSquare renders a square element (equal width/height)", () => {
    const { container } = render(<PulseSquare size={12} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.style.width).toBe(el.style.height);
    expect(el.style.width).toBe("12px");
  });
});
