import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { StreamHeading } from "@/components/watch/stream-heading";
import { StreamTitleCard } from "@/components/dashboard/stream-title-card";

const KEY = "nightchannel-stream-title";

beforeEach(() => localStorage.clear());

describe("StreamHeading", () => {
  // US1 (T011): the heading now renders the bound stream's title from a prop
  // (research D3) rather than the localStorage/mock value. Visual is unchanged.
  it("renders the bound stream title as a heading", () => {
    render(<StreamHeading title="CHANNEL 01 — MAIN FEED" live={false} />);
    expect(screen.getByRole("heading")).toHaveTextContent("CHANNEL 01 — MAIN FEED");
  });

  it("shows whatever bound title it is given", () => {
    render(<StreamHeading title="LATE NIGHT TAPES" live />);
    expect(screen.getByRole("heading")).toHaveTextContent("LATE NIGHT TAPES");
  });
});

describe("StreamTitleCard (dashboard editor)", () => {
  // Still the spec-002 localStorage editor — US3 (T031) rewires it to streams.update.
  it("persists edits to localStorage", () => {
    render(<StreamTitleCard />);
    fireEvent.change(screen.getByLabelText("Stream title"), {
      target: { value: "GRAVEYARD SHIFT" },
    });
    expect(localStorage.getItem(KEY)).toBe("GRAVEYARD SHIFT");
  });
});
