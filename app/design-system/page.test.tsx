import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Page from "./page";

describe("Design system route (/design-system)", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders the reference gallery without any network request (SC-005)", () => {
    render(<Page />);
    expect(screen.getByText("01 — Principles")).toBeInTheDocument();
    expect(screen.getByText("07 — Status & Live")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
