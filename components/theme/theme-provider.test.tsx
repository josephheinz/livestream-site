import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "./theme-provider";
import { mockMatchMedia } from "../../vitest.setup";

function Probe() {
  const { mode, resolved, cycle } = useTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="resolved">{resolved}</span>
      <button onClick={cycle}>cycle</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  mockMatchMedia(false);
});

describe("ThemeProvider / useTheme", () => {
  it("defaults to auto and cycles auto → light → dark → auto", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId("mode").textContent).toBe("auto");
    fireEvent.click(screen.getByText("cycle"));
    expect(screen.getByTestId("mode").textContent).toBe("light");
    fireEvent.click(screen.getByText("cycle"));
    expect(screen.getByTestId("mode").textContent).toBe("dark");
    fireEvent.click(screen.getByText("cycle"));
    expect(screen.getByTestId("mode").textContent).toBe("auto");
  });

  it("dark adds .dark to <html>, light removes it", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    // auto + matchMedia(false) → resolved light → no .dark
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    fireEvent.click(screen.getByText("cycle")); // light
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    fireEvent.click(screen.getByText("cycle")); // dark
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("auto resolves from matchMedia (dark)", () => {
    mockMatchMedia(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId("mode").textContent).toBe("auto");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
