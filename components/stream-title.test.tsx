import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { StreamHeading } from "@/components/watch/stream-heading";
import { StreamTitleCard } from "@/components/dashboard/stream-title-card";

const KEY = "nightchannel-stream-title";

beforeEach(() => localStorage.clear());

describe("StreamHeading", () => {
  it("renders the default stream title as a heading", () => {
    render(<StreamHeading live={false} />);
    expect(screen.getByRole("heading")).toHaveTextContent("CHANNEL 01 — MAIN FEED");
  });

  it("prefers a title saved in localStorage", () => {
    localStorage.setItem(KEY, "LATE NIGHT TAPES");
    render(<StreamHeading live />);
    expect(screen.getByRole("heading")).toHaveTextContent("LATE NIGHT TAPES");
  });
});

describe("StreamTitleCard (dashboard editor)", () => {
  it("persists edits to localStorage so the Watch heading picks them up", () => {
    render(<StreamTitleCard />);
    fireEvent.change(screen.getByLabelText("Stream title"), {
      target: { value: "GRAVEYARD SHIFT" },
    });
    expect(localStorage.getItem(KEY)).toBe("GRAVEYARD SHIFT");

    // A freshly mounted Watch heading reads the saved value.
    render(<StreamHeading live={false} />);
    expect(screen.getByRole("heading")).toHaveTextContent("GRAVEYARD SHIFT");
  });
});
