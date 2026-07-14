import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

// Banner is auth-aware; the modal mounts Clerk's custom flow when opened.
const signOut = vi.fn();
let signedIn = false;
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    isSignedIn: signedIn,
    user: signedIn ? { username: "cooluser", firstName: "Cool" } : null,
  }),
  useClerk: () => ({ signOut }),
  useSignIn: () => ({ isLoaded: true, signIn: { create: vi.fn() }, setActive: vi.fn() }),
  useSignUp: () => ({ isLoaded: true, signUp: { create: vi.fn() }, setActive: vi.fn() }),
}));

import { Banner } from "./banner";
import { AuthModalProvider } from "./auth-modal";

function renderBanner(live: boolean, viewers?: number) {
  return render(
    <AuthModalProvider>
      <Banner live={live} viewers={viewers} />
    </AuthModalProvider>,
  );
}

beforeEach(() => {
  signedIn = false;
  signOut.mockReset();
});

describe("Banner", () => {
  it("has no Watch/Dashboard nav", () => {
    renderBanner(false);
    expect(screen.queryByRole("link", { name: "Watch" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();
  });

  it("reflects the live state", () => {
    const { unmount } = renderBanner(false);
    expect(screen.getByTestId("banner-live").textContent).toMatch(/OFF AIR/);
    unmount();
    renderBanner(true);
    expect(screen.getByTestId("banner-live").textContent).toMatch(/LIVE/);
  });

  it("shows the real viewer count in the live badge", () => {
    renderBanner(true, 1204);
    expect(screen.getByTestId("banner-live").textContent).toMatch(/1,204 WATCHING/);
  });

  it("signed out: Sign In opens the auth modal", () => {
    renderBanner(false);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("signed in: shows the username and Sign Out instead of Sign In", () => {
    signedIn = true;
    renderBanner(false);
    expect(screen.queryByRole("button", { name: "Sign In" })).toBeNull();
    expect(screen.getByText("cooluser")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
