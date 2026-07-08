import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
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

import Page from "./page";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AuthModalProvider } from "@/components/site/auth-modal";

async function renderDash(params: Record<string, string>) {
  const ui = await Page({ searchParams: Promise.resolve(params) });
  return render(
    <ThemeProvider>
      <AuthModalProvider>{ui}</AuthModalProvider>
    </ThemeProvider>
  );
}

describe("Dashboard route (/dashboard)", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("?live=1 drives the status stat and broadcast card ON AIR", async () => {
    await renderDash({ live: "1" });
    expect(screen.getAllByText(/ON AIR/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("button", { name: "GO OFF AIR" }).length).toBeGreaterThanOrEqual(1);
  });

  it("default renders four stat cards and the banned table", async () => {
    await renderDash({});
    expect(screen.getAllByTestId("stat-bar")).toHaveLength(4);
    expect(screen.getByText("floodbot_44")).toBeInTheDocument();
  });

  it("issues no network request (SC-005)", async () => {
    await renderDash({});
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
