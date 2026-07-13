import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { api } from "@/convex/_generated/api";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ replace, push: vi.fn() }),
}));
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

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isSignedIn: false, user: null }),
  useClerk: () => ({ signOut: vi.fn() }),
  useSignIn: () => ({ isLoaded: true, signIn: { create: vi.fn() }, setActive: vi.fn() }),
  useSignUp: () => ({ isLoaded: true, signUp: { create: vi.fn() }, setActive: vi.fn() }),
}));

import Page from "./page";
import { AuthModalProvider } from "@/components/site/auth-modal";

// `undefined` = still loading; null = signed out; role omitted = non-admin.
type Me = { role?: "admin" } | null | undefined;

function mockData(opts: { me: Me }) {
  useQuery.mockImplementation((ref: unknown, args?: unknown) => {
    if (ref == null) return undefined;
    const name = getFunctionName(ref as never);
    if (name === getFunctionName(api.users.me)) return opts.me;
    if (name === getFunctionName(api.streams.getLive)) return null;
    if (name === getFunctionName(api.streams.listUpcoming)) return [];
    if (name === getFunctionName(api.bans.list)) return [];
    if (name === getFunctionName(api.settings.get)) return null;
    if (name === getFunctionName(api.presence.count)) return args === "skip" ? undefined : 0;
    return undefined;
  });
}

function renderDash() {
  return render(
    <AuthModalProvider>
      <Page />
    </AuthModalProvider>,
  );
}

beforeEach(() => {
  useQuery.mockReset();
  replace.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("Dashboard route (/dashboard)", () => {
  it("admin sees the dashboard with real stats and the banned table (FR-002)", () => {
    mockData({ me: { role: "admin" } });
    renderDash();
    expect(screen.getByText("RESTRICTED — BROADCAST CONTROLS")).toBeInTheDocument();
    expect(screen.getAllByTestId("stat-bar")).toHaveLength(4);
    expect(screen.getByText("Banned Users")).toBeInTheDocument();
    expect(screen.getByText("Ticker Tape")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("non-admin renders nothing and is redirected home (FR-002)", () => {
    mockData({ me: { role: undefined } });
    const { container } = renderDash();
    expect(container.textContent).toBe("");
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("signed-out visitor renders nothing and is redirected home (FR-002)", () => {
    mockData({ me: null });
    const { container } = renderDash();
    expect(container.textContent).toBe("");
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("does not redirect while the identity is still loading", () => {
    mockData({ me: undefined });
    renderDash();
    expect(replace).not.toHaveBeenCalled();
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
