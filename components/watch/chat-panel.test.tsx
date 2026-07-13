import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// Clerk drives the chat mode (research D5). A mutable holder keeps the hoisted
// mock switchable per test.
const authState = { isSignedIn: false as boolean | undefined };
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: authState.isSignedIn, isLoaded: true }),
}));

const sendMock = vi.fn();
const useQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (ref: unknown, args?: unknown) => useQuery(ref, args),
  useMutation: () => sendMock,
}));

import { ChatPanel } from "./chat-panel";
import { AuthModalProvider } from "@/components/site/auth-modal";

type Message = {
  _id: string;
  body: string;
  authorName: string;
  authorImageUrl?: string;
};
type Emoji = { _id: string; name: string; imageUrl: string | null };

function mockData(opts: { messages?: Message[]; emojis?: Emoji[] }) {
  useQuery.mockImplementation((ref: unknown) => {
    if (ref == null) return undefined;
    const name = getFunctionName(ref as never);
    if (name === getFunctionName(api.chat.list)) return opts.messages ?? [];
    if (name === getFunctionName(api.emojis.list)) return opts.emojis ?? [];
    return undefined;
  });
}

function renderPanel() {
  return render(
    <AuthModalProvider>
      <ChatPanel streamId={"s1" as Id<"streams">} live viewers={1204} />
    </AuthModalProvider>,
  );
}

beforeEach(() => {
  useQuery.mockReset();
  sendMock.mockReset();
  authState.isSignedIn = false;
});
afterEach(() => vi.clearAllMocks());

describe("ChatPanel (wired)", () => {
  it("renders the real message history from chat.list", () => {
    authState.isSignedIn = true;
    mockData({
      messages: [
        { _id: "m1", body: "first", authorName: "orb_watcher" },
        { _id: "m2", body: "quiet in here", authorName: "nite_ops" },
      ],
    });
    renderPanel();
    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getByText("quiet in here")).toBeInTheDocument();
    expect(screen.getByText("orb_watcher")).toBeInTheDocument();
  });

  it("signed-out: sign-in prompt replaces the composer and opens the auth modal", () => {
    authState.isSignedIn = false;
    mockData({});
    renderPanel();
    expect(screen.queryByPlaceholderText("Say something...")).toBeNull();
    fireEvent.click(screen.getByText("Sign in to chat"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("signed-in: composer sends via chat.send", async () => {
    authState.isSignedIn = true;
    sendMock.mockResolvedValue(undefined);
    mockData({});
    renderPanel();

    const input = screen.getByPlaceholderText("Say something...");
    fireEvent.change(input, { target: { value: "hello world" } });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() =>
      expect(sendMock).toHaveBeenCalledWith({
        streamId: "s1",
        body: "hello world",
      }),
    );
  });

  it("ban error flips the composer to the banned notice", async () => {
    authState.isSignedIn = true;
    sendMock.mockRejectedValue(new Error("You are banned from chat"));
    mockData({});
    renderPanel();

    fireEvent.change(screen.getByPlaceholderText("Say something..."), {
      target: { value: "let me in" },
    });
    fireEvent.click(screen.getByText("Send"));

    expect(await screen.findByText(/You are banned from chat/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Say something...")).toBeNull();
  });

  it("mid-session auth expiry reverts the composer to the sign-in prompt", async () => {
    authState.isSignedIn = true;
    sendMock.mockRejectedValue(new Error("Must be signed in"));
    mockData({});
    renderPanel();

    fireEvent.change(screen.getByPlaceholderText("Say something..."), {
      target: { value: "still here?" },
    });
    fireEvent.click(screen.getByText("Send"));

    expect(await screen.findByText("Sign in to chat")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Say something...")).toBeNull();
  });

  it("renders :name: tokens as <img> for active emojis and literal text for unknown", () => {
    authState.isSignedIn = true;
    mockData({
      messages: [{ _id: "m1", body: "hi :party: and :nope:", authorName: "vhs" }],
      emojis: [{ _id: "e1", name: "party", imageUrl: "https://img.test/party.png" }],
    });
    renderPanel();

    const img = screen.getByAltText("party") as HTMLImageElement;
    expect(img.tagName).toBe("IMG");
    expect(img.src).toBe("https://img.test/party.png");
    expect(screen.getByText(/:nope:/)).toBeInTheDocument();
  });
});
