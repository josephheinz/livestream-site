import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import Page from "./page";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AuthModalProvider } from "@/components/site/auth-modal";

async function renderWatch(params: Record<string, string>) {
  const ui = await Page({ searchParams: Promise.resolve(params) });
  return render(
    <ThemeProvider>
      <AuthModalProvider>{ui}</AuthModalProvider>
    </ThemeProvider>
  );
}

describe("Watch route (/)", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("?live=1 renders the live player", async () => {
    await renderWatch({ live: "1" });
    expect(screen.getByText("REC")).toBeInTheDocument();
  });

  it("default (no params) renders off-air + signed-out chat", async () => {
    await renderWatch({});
    expect(screen.getAllByText("OFF AIR").length).toBeGreaterThan(0);
    expect(screen.getByText("Sign in to chat")).toBeInTheDocument();
  });

  it("?chat=banned renders the ban notice, no composer", async () => {
    await renderWatch({ chat: "banned" });
    expect(screen.getByText(/Repeated off-topic flooding/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Say something...")).toBeNull();
  });

  it("unknown chat value falls back to signed-out", async () => {
    await renderWatch({ chat: "bogus" });
    expect(screen.getByText("Sign in to chat")).toBeInTheDocument();
  });

  it("issues no network request (SC-005)", async () => {
    await renderWatch({});
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
