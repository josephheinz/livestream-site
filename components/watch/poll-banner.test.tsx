import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";

const authState = { isSignedIn: false as boolean | undefined };
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: authState.isSignedIn, isLoaded: true }),
  useSignIn: () => ({ isLoaded: true, signIn: { create: vi.fn() }, setActive: vi.fn() }),
  useSignUp: () => ({ isLoaded: true, signUp: { create: vi.fn() }, setActive: vi.fn() }),
}));

const voteMock = vi.fn();
const useQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (ref: unknown, args?: unknown) => useQuery(ref, args),
  useMutation: () => voteMock,
}));

import { PollBanner } from "./poll-banner";
import { AuthModalProvider } from "@/components/site/auth-modal";

const basePoll = {
  _id: "p1" as Id<"polls">,
  question: "Best snack?",
  options: ["chips", "candy"],
  counts: [3, 1],
  expiresAt: Date.now() + 60_000,
  myVote: null as number | null,
};

function renderBanner() {
  return render(
    <AuthModalProvider>
      <PollBanner streamId={"s1" as Id<"streams">} />
    </AuthModalProvider>,
  );
}

beforeEach(() => {
  useQuery.mockReset();
  voteMock.mockReset();
  authState.isSignedIn = false;
});
afterEach(() => vi.clearAllMocks());

it("renders nothing when there is no active poll", () => {
  useQuery.mockReturnValue(null);
  const { container } = renderBanner();
  expect(container).toBeEmptyDOMElement();
});

it("signed-out: shows the poll but voting opens the auth modal", () => {
  useQuery.mockReturnValue({ ...basePoll });
  renderBanner();
  expect(screen.getByText("Best snack?")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "chips" }));
  expect(voteMock).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

it("signed-in: clicking an option casts a vote", async () => {
  authState.isSignedIn = true;
  voteMock.mockResolvedValue(null);
  useQuery.mockReturnValue({ ...basePoll });
  renderBanner();
  fireEvent.click(screen.getByRole("button", { name: "candy" }));
  await waitFor(() =>
    expect(voteMock).toHaveBeenCalledWith({ pollId: "p1", optionIndex: 1 }),
  );
});

it("after voting: shows results with the viewer's pick marked", () => {
  authState.isSignedIn = true;
  useQuery.mockReturnValue({ ...basePoll, myVote: 0 });
  renderBanner();
  expect(screen.queryByRole("button", { name: "chips" })).toBeNull();
  expect(screen.getByText("75% (3)")).toBeInTheDocument();
  expect(screen.getByText("25% (1)")).toBeInTheDocument();
  expect(screen.getByText("4 votes")).toBeInTheDocument();
});
