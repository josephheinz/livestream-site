import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Player } from "./player";

describe("Player", () => {
  it("live: REC, channel/quality, LIVE NOW! and a control bar", () => {
    render(<Player live />);
    expect(screen.getByText("REC")).toBeInTheDocument();
    expect(screen.getByText(/1080p/)).toBeInTheDocument();
    expect(screen.getByText("LIVE NOW!")).toBeInTheDocument();
    expect(screen.getByTestId("player-controls")).toBeInTheDocument();
  });

  it("off-air: OFF AIR panel and stand-by copy", () => {
    render(<Player live={false} />);
    expect(screen.getByText("OFF AIR")).toBeInTheDocument();
    expect(screen.getByText(/STREAM RESUMES SOON/)).toBeInTheDocument();
  });
});
