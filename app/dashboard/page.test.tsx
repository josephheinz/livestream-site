import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { api } from "@/convex/_generated/api";

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

const useQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (ref: unknown, args?: unknown) => useQuery(ref, args),
  useMutation: () => vi.fn(),
  useConvexConnectionState: () => ({ isWebSocketConnected: true, hasEverConnected: true }),
}));

import Page from "./page";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AuthModalProvider } from "@/components/site/auth-modal";

type Me = { role?: "admin" } | null;

function mockData(opts: { me: Me }) {
  useQuery.mockImplementation((ref: unknown, args?: unknown) => {
    if (ref == null) return undefined;
    const name = getFunctionName(ref as never);
    if (name === getFunctionName(api.users.me)) return opts.me;
    if (name === getFunctionName(api.streams.getLive)) return null;
    if (name === getFunctionName(api.streams.listUpcoming)) return [];
    if (name === getFunctionName(api.bans.list)) return [];
    if (name === getFunctionName(api.presence.count)) return args === "skip" ? undefined : 0;
    return undefined;
  });
}

function renderDash() {
  return render(
    <ThemeProvider>
      <AuthModalProvider>
        <Page />
      </AuthModalProvider>
    </ThemeProvider>
  );
}

beforeEach(() => useQuery.mockReset());
afterEach(() => vi.clearAllMocks());

describe("Dashboard route (/dashboard)", () => {
  it("admin sees the dashboard with real stats and the banned table (FR-002)", () => {
    mockData({ me: { role: "admin" } });
    renderDash();
    expect(screen.getByText("RESTRICTED — BROADCAST CONTROLS")).toBeInTheDocument();
    expect(screen.getAllByTestId("stat-bar")).toHaveLength(4);
    expect(screen.getByText("Banned Users")).toBeInTheDocument();
    expect(screen.queryByText(/Access Denied/i)).toBeNull();
  });

  it("non-admin gets the denied state with no admin data (FR-002)", () => {
    mockData({ me: { role: undefined } });
    renderDash();
    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    expect(screen.queryAllByTestId("stat-bar")).toHaveLength(0);
    expect(screen.queryByText("Banned Users")).toBeNull();
  });

  it("signed-out visitor gets the denied state with no admin data (FR-002)", () => {
    mockData({ me: null });
    renderDash();
    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    expect(screen.queryAllByTestId("stat-bar")).toHaveLength(0);
  });

  it("no query-param state forcing: the page reads no searchParams (FR-006)", () => {
    expect(Page.length).toBe(0);
  });

  it("issues no network request (SC-005)", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    mockData({ me: { role: "admin" } });
    renderDash();
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
