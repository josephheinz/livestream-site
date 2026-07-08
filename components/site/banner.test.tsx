import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: never) => {
    const p = props as Record<string, unknown>;
    const h = typeof href === "string" ? href : "#";
    return (
      <a href={h} {...p}>
        {children as never}
      </a>
    );
  },
}));

import { Banner } from "./banner";
import { AuthModalProvider } from "./auth-modal";
import { ThemeProvider } from "@/components/theme/theme-provider";

function renderBanner(live: boolean) {
  return render(
    <ThemeProvider>
      <AuthModalProvider>
        <Banner live={live} />
      </AuthModalProvider>
    </ThemeProvider>
  );
}

describe("Banner", () => {
  it("marks the active route (Watch at /)", () => {
    renderBanner(false);
    expect(screen.getByRole("link", { name: "Watch" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("data-active", "false");
  });

  it("reflects the live prop", () => {
    const { unmount } = renderBanner(false);
    expect(screen.getByTestId("banner-live").textContent).toMatch(/OFF AIR/);
    unmount();
    renderBanner(true);
    expect(screen.getByTestId("banner-live").textContent).toMatch(/LIVE/);
  });

  it("Sign In opens the auth modal", () => {
    renderBanner(false);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
