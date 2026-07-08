import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExternalConnections } from "./external-connections";
import { MASKED_KEY } from "@/lib/mock-data";

describe("ExternalConnections", () => {
  it("seeds rows with masked keys only (never the raw key)", () => {
    render(<ExternalConnections />);
    expect(screen.getByText("YouTube")).toBeInTheDocument();
    expect(screen.getByText("Twitch")).toBeInTheDocument();
    expect(screen.getAllByText(MASKED_KEY).length).toBeGreaterThanOrEqual(2);
  });

  it("toggles a connection ON/OFF", () => {
    render(<ExternalConnections />);
    // seed: YouTube ON, Twitch OFF → one ON button, one OFF button
    expect(screen.getAllByRole("button", { name: "OFF" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "ON" }));
    expect(screen.getAllByRole("button", { name: "OFF" })).toHaveLength(2);
  });

  it("removes a connection", () => {
    render(<ExternalConnections />);
    fireEvent.click(screen.getByLabelText("Remove YouTube"));
    expect(screen.queryByText("YouTube")).toBeNull();
  });

  it("adds a connection, masking the key and never echoing it back", () => {
    render(<ExternalConnections />);
    fireEvent.change(screen.getByPlaceholderText("platform (e.g. Twitch)"), {
      target: { value: "Kick" },
    });
    fireEvent.change(screen.getByPlaceholderText("stream key"), {
      target: { value: "secret-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByText("Kick")).toBeInTheDocument();
    expect(screen.queryByText("secret-123")).toBeNull();
    expect(screen.queryByDisplayValue("secret-123")).toBeNull();
  });

  it("shows a dashed empty state when all are removed", () => {
    render(<ExternalConnections />);
    fireEvent.click(screen.getByLabelText("Remove YouTube"));
    fireEvent.click(screen.getByLabelText("Remove Twitch"));
    expect(screen.getByText("No external connections yet.")).toBeInTheDocument();
  });
});
