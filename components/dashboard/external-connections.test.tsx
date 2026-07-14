import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExternalConnections } from "./external-connections";

// research D7 / spec assumption: the backend tracks no restream targets, so the
// card shows an honest empty state rather than the spec-002 demo rows (SC-005).
describe("ExternalConnections (honest empty state)", () => {
  it("renders the card with the honest empty state and no demo rows", () => {
    render(<ExternalConnections />);
    expect(screen.getByText("External Connections")).toBeInTheDocument();
    expect(screen.getByText("No external connections yet.")).toBeInTheDocument();
    expect(screen.queryByText("YouTube")).toBeNull();
    expect(screen.queryByText("Twitch")).toBeNull();
  });

  it("imports no placeholder mock-data (SC-005)", () => {
    const source = readFileSync("components/dashboard/external-connections.tsx", "utf8");
    expect(source).not.toMatch(/lib\/mock-data/);
  });
});
