import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const updateMock = vi.fn();
const useQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (ref: unknown, args?: unknown) => useQuery(ref, args),
  useMutation: (ref: unknown) => {
    const name = getFunctionName(ref as never);
    if (name === getFunctionName(api.streams.update)) return updateMock;
    return vi.fn();
  },
}));

import { StreamHeading } from "@/components/watch/stream-heading";
import { StreamTitleCard } from "@/components/dashboard/stream-title-card";

type Stream = { _id: Id<"streams">; title: string };

function mockData(opts: { admin?: boolean; live?: Stream | null; upcoming?: Stream[] }) {
  useQuery.mockImplementation((ref: unknown) => {
    if (ref == null) return undefined;
    const name = getFunctionName(ref as never);
    if (name === getFunctionName(api.users.me)) return opts.admin ? { role: "admin" } : { role: undefined };
    if (name === getFunctionName(api.streams.getLive)) return opts.live ?? null;
    if (name === getFunctionName(api.streams.listUpcoming)) return opts.upcoming ?? [];
    return undefined;
  });
}

beforeEach(() => {
  useQuery.mockReset();
  updateMock.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("StreamHeading", () => {
  // US1 (T011): the heading renders the bound stream's title from a prop
  // (research D3). Visual is unchanged.
  it("renders the bound stream title as a heading", () => {
    render(<StreamHeading title="CHANNEL 01 — MAIN FEED" live={false} />);
    expect(screen.getByRole("heading")).toHaveTextContent("CHANNEL 01 — MAIN FEED");
  });

  it("shows whatever bound title it is given", () => {
    render(<StreamHeading title="LATE NIGHT TAPES" live />);
    expect(screen.getByRole("heading")).toHaveTextContent("LATE NIGHT TAPES");
  });
});

describe("StreamTitleCard (dashboard editor — wired to streams.update)", () => {
  it("shows the bound stream title as an editable input for the admin", () => {
    mockData({ admin: true, live: { _id: "s1" as Id<"streams">, title: "MAIN FEED" } });
    render(<StreamTitleCard />);
    const input = screen.getByLabelText("Stream title") as HTMLInputElement;
    expect(input.value).toBe("MAIN FEED");
    expect(input).not.toHaveAttribute("readonly");
  });

  it("persists a confirmed edit via streams.update", async () => {
    mockData({ admin: true, live: { _id: "s1" as Id<"streams">, title: "MAIN FEED" } });
    render(<StreamTitleCard />);
    const input = screen.getByLabelText("Stream title");
    fireEvent.change(input, { target: { value: "GRAVEYARD SHIFT" } });
    fireEvent.blur(input);
    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith({ streamId: "s1", title: "GRAVEYARD SHIFT" })
    );
  });

  it("offers no edit affordance to a non-admin (read-only)", () => {
    mockData({ admin: false, live: { _id: "s1" as Id<"streams">, title: "MAIN FEED" } });
    render(<StreamTitleCard />);
    const input = screen.getByLabelText("Stream title");
    expect(input).toHaveAttribute("readonly");
    fireEvent.change(input, { target: { value: "HIJACK" } });
    fireEvent.blur(input);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("converges on the persisted value when another admin's write lands (last write wins)", () => {
    mockData({ admin: true, live: { _id: "s1" as Id<"streams">, title: "MAIN FEED" } });
    const { rerender } = render(<StreamTitleCard />);
    expect((screen.getByLabelText("Stream title") as HTMLInputElement).value).toBe("MAIN FEED");
    // A concurrent write updates the persisted title; the unedited card follows.
    mockData({ admin: true, live: { _id: "s1" as Id<"streams">, title: "TAKEOVER" } });
    rerender(<StreamTitleCard />);
    expect((screen.getByLabelText("Stream title") as HTMLInputElement).value).toBe("TAKEOVER");
  });
});
