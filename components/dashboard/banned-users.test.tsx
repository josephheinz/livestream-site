import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BannedUsers } from "./banned-users";

describe("BannedUsers", () => {
  it("lists seeded bans", () => {
    render(<BannedUsers />);
    expect(screen.getByText("floodbot_44")).toBeInTheDocument();
    expect(screen.getByText("grief_er")).toBeInTheDocument();
    expect(screen.getByText("copypasta9")).toBeInTheDocument();
  });

  it("unban removes that row", () => {
    render(<BannedUsers />);
    fireEvent.click(screen.getByLabelText("Unban floodbot_44"));
    expect(screen.queryByText("floodbot_44")).toBeNull();
  });

  it("shows the empty state once all are unbanned", () => {
    render(<BannedUsers />);
    fireEvent.click(screen.getByLabelText("Unban floodbot_44"));
    fireEvent.click(screen.getByLabelText("Unban grief_er"));
    fireEvent.click(screen.getByLabelText("Unban copypasta9"));
    expect(screen.getByText("No active bans.")).toBeInTheDocument();
  });
});
