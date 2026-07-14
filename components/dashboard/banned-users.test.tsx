import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const banMock = vi.fn();
const unbanMock = vi.fn();
const useQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (ref: unknown, args?: unknown) => useQuery(ref, args),
  useMutation: (ref: unknown) => {
    const name = getFunctionName(ref as never);
    if (name === getFunctionName(api.bans.ban)) return banMock;
    if (name === getFunctionName(api.bans.unban)) return unbanMock;
    return vi.fn();
  },
}));

import { BannedUsers } from "./banned-users";

type Ban = { _id: string; userId: Id<"users">; userName: string; reason: string; expiresAt?: number };

function mockBans(rows: Ban[]) {
  useQuery.mockImplementation((ref: unknown) => {
    if (ref == null) return undefined;
    const name = getFunctionName(ref as never);
    if (name === getFunctionName(api.bans.list)) return rows;
    return undefined;
  });
}

const ROWS: Ban[] = [
  { _id: "b1", userId: "u1" as Id<"users">, userName: "floodbot_44", reason: "Spam / flooding chat" },
  {
    _id: "b2",
    userId: "u2" as Id<"users">,
    userName: "grief_er",
    reason: "Harassment of viewers",
    expiresAt: new Date("2026-07-14").getTime(),
  },
];

beforeEach(() => {
  useQuery.mockReset();
  banMock.mockReset();
  unbanMock.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("BannedUsers (wired to bans.*)", () => {
  it("lists rows from bans.list", () => {
    mockBans(ROWS);
    render(<BannedUsers />);
    expect(screen.getByText("floodbot_44")).toBeInTheDocument();
    expect(screen.getByText("grief_er")).toBeInTheDocument();
    expect(screen.getByText("Spam / flooding chat")).toBeInTheDocument();
    // No expiry → permanent.
    expect(screen.getByText("PERMANENT")).toBeInTheDocument();
  });

  it("shows the empty state when there are no active bans", () => {
    mockBans([]);
    render(<BannedUsers />);
    expect(screen.getByText("No active bans.")).toBeInTheDocument();
  });

  it("unban action calls bans.unban with the row's userId", async () => {
    mockBans(ROWS);
    render(<BannedUsers />);
    fireEvent.click(screen.getByLabelText("Unban floodbot_44"));
    await waitFor(() => expect(unbanMock).toHaveBeenCalledWith({ userId: "u1" }));
  });

  it("add-ban form calls bans.ban with reason (required) and optional expiry", async () => {
    mockBans([]);
    render(<BannedUsers />);
    fireEvent.change(screen.getByLabelText("User ID"), { target: { value: "u9" } });
    fireEvent.change(screen.getByLabelText("Ban reason"), { target: { value: "abuse" } });
    fireEvent.change(screen.getByLabelText("Ban expiry"), { target: { value: "2026-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Ban" }));
    await waitFor(() =>
      expect(banMock).toHaveBeenCalledWith({
        userId: "u9",
        reason: "abuse",
        expiresAt: new Date("2026-08-01").getTime(),
      })
    );
  });

  it("does not submit a ban when the reason is empty (reason required)", () => {
    mockBans([]);
    render(<BannedUsers />);
    fireEvent.change(screen.getByLabelText("User ID"), { target: { value: "u9" } });
    fireEvent.click(screen.getByRole("button", { name: "Ban" }));
    expect(banMock).not.toHaveBeenCalled();
  });

  it("bans with no expiry omit expiresAt", async () => {
    mockBans([]);
    render(<BannedUsers />);
    fireEvent.change(screen.getByLabelText("User ID"), { target: { value: "u9" } });
    fireEvent.change(screen.getByLabelText("Ban reason"), { target: { value: "abuse" } });
    fireEvent.click(screen.getByRole("button", { name: "Ban" }));
    await waitFor(() =>
      expect(banMock).toHaveBeenCalledWith({ userId: "u9", reason: "abuse", expiresAt: undefined })
    );
  });
});
