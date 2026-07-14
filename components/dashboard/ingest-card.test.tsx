import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const rotateMock = vi.fn();
const createMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (ref: unknown, args?: unknown) => useQueryMock(ref, args),
  useMutation: (ref: unknown) => {
    if (getFunctionName(ref as never) === getFunctionName(api.streams.rotateIngestKey)) {
      return rotateMock;
    }
    if (getFunctionName(ref as never) === getFunctionName(api.streams.create)) return createMock;
    return vi.fn();
  },
}));

import { IngestCard } from "./ingest-card";

const streamId = "stream-1" as Id<"streams">;

beforeEach(() => {
  rotateMock.mockReset();
  createMock.mockReset();
  useQueryMock.mockReset();
  useQueryMock.mockImplementation((_ref: unknown, args?: unknown) =>
    args === "skip" ? undefined : "secret-key",
  );
});

describe("IngestCard", () => {
  it("skips the key query until Reveal is clicked", () => {
    render(<IngestCard streamId={streamId} isLive={false} ingestActive={false} />);
    expect(screen.getByText("SIGNAL: NONE")).toBeInTheDocument();
    expect(useQueryMock).toHaveBeenLastCalledWith(api.streams.revealIngestKey, "skip");
    expect(screen.queryByText(/secret-key/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Reveal" }));

    expect(useQueryMock).toHaveBeenLastCalledWith(api.streams.revealIngestKey, { streamId });
    expect(screen.getByText("rtmp://localhost:1935/live/secret-key")).toBeInTheDocument();
  });

  it("warns before rotating a live stream and shows the new key", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    rotateMock.mockResolvedValue("new-key");
    render(<IngestCard streamId={streamId} isLive ingestActive />);
    expect(screen.getByText("SIGNAL: ACTIVE")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rotate key" }));

    expect(confirm).toHaveBeenCalledWith("Rotate key? this will drop the active broadcast.");
    await waitFor(() => expect(rotateMock).toHaveBeenCalledWith({ streamId }));
    expect(await screen.findByText("rtmp://localhost:1935/live/new-key")).toBeInTheDocument();
    confirm.mockRestore();
  });

  it("creates a stream when none exists", async () => {
    render(<IngestCard isLive={false} ingestActive={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Create stream" }));

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({
        title: "LIVE NOW",
        scheduledStart: expect.any(Number),
      }),
    );
  });
});
