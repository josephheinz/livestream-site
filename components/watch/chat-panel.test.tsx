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
  // The sign-in prompt can open the Clerk-driven auth dialog.
  useSignIn: () => ({ isLoaded: true, signIn: { create: vi.fn() }, setActive: vi.fn() }),
  useSignUp: () => ({ isLoaded: true, signUp: { create: vi.fn() }, setActive: vi.fn() }),
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
  userId?: string;
  removed?: boolean;
};
type Emoji = { _id: string; name: string; imageUrl: string | null };

type Profile = {
  createdAt: number;
  messages: Array<{ _id: string; body: string; createdAt: number; removed: boolean }>;
};

function mockData(opts: {
  messages?: Message[];
  emojis?: Emoji[];
  admin?: boolean;
  profile?: Profile;
}) {
  useQuery.mockImplementation((ref: unknown) => {
    if (ref == null) return undefined;
    const name = getFunctionName(ref as never);
    if (name === getFunctionName(api.chat.list)) return opts.messages ?? [];
    if (name === getFunctionName(api.chat.userProfile)) return opts.profile;
    if (name === getFunctionName(api.emojis.list)) return opts.emojis ?? [];
    if (name === getFunctionName(api.users.me))
      return opts.admin ? { role: "admin" } : null;
    return undefined;
  });
}

function renderPanel(streamId: Id<"streams"> | null = "s1" as Id<"streams">) {
  return render(
    <AuthModalProvider>
      <ChatPanel streamId={streamId ?? undefined} viewers={1204} />
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

  it("always shows the online count in the header", () => {
    mockData({});
    renderPanel();
    expect(screen.getByText("[1,204 ONLINE]")).toBeInTheDocument();
  });

  it("no bound stream: send still works — the backend resolves the current stream", async () => {
    authState.isSignedIn = true;
    sendMock.mockResolvedValue(undefined);
    mockData({});
    renderPanel(null);

    fireEvent.change(screen.getByPlaceholderText("Say something..."), {
      target: { value: "anyone there?" },
    });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() => expect(sendMock).toHaveBeenCalledWith({ body: "anyone there?" }));
  });

  it("surfaces other send errors inline instead of eating the message", async () => {
    authState.isSignedIn = true;
    sendMock.mockRejectedValue(new Error("Slow down — one message every 2 seconds"));
    mockData({});
    renderPanel();

    fireEvent.change(screen.getByPlaceholderText("Say something..."), {
      target: { value: "spam spam" },
    });
    fireEvent.click(screen.getByText("Send"));

    expect(await screen.findByText(/Slow down/)).toBeInTheDocument();
    // Composer stays; the draft is not cleared.
    expect(screen.getByPlaceholderText("Say something...")).toBeInTheDocument();
  });

  it("emoji picker always offers the unicode set and inserts into the draft", () => {
    authState.isSignedIn = true;
    mockData({ emojis: [] });
    renderPanel();

    fireEvent.click(screen.getByLabelText("Emoji picker"));
    fireEvent.click(screen.getByLabelText("emoji 🔥"));
    expect((screen.getByPlaceholderText("Say something...") as HTMLInputElement).value).toBe("🔥");
  });

  it("admin: shows a remove button per message and calls chat.remove", async () => {
    authState.isSignedIn = true;
    sendMock.mockResolvedValue(undefined);
    mockData({
      admin: true,
      messages: [
        { _id: "m1", body: "rude thing", authorName: "orb_watcher", userId: "u1" },
      ],
    });
    renderPanel();

    fireEvent.click(screen.getByLabelText("Remove message"));
    await waitFor(() => expect(sendMock).toHaveBeenCalledWith({ messageId: "m1" }));
  });

  it("non-admin: no remove button, removed messages are not present", () => {
    authState.isSignedIn = true;
    mockData({
      messages: [{ _id: "m1", body: "hi", authorName: "orb_watcher", userId: "u1" }],
    });
    renderPanel();
    expect(screen.queryByLabelText("Remove message")).toBeNull();
  });

  it("admin: a removed message renders struck-through with a [removed] tag", () => {
    authState.isSignedIn = true;
    mockData({
      admin: true,
      messages: [
        { _id: "m1", body: "bad", authorName: "orb_watcher", userId: "u1", removed: true },
      ],
    });
    renderPanel();
    expect(screen.getByText("[removed]")).toBeInTheDocument();
    // removed messages get no remove button (already gone)
    expect(screen.queryByLabelText("Remove message")).toBeNull();
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
    // Wrapped in a Radix tooltip trigger so hover shows the :name: token.
    expect(img.dataset.state).toBe("closed");
    expect(screen.getByText(/:nope:/)).toBeInTheDocument();
  });

  it("renders :name: tokens as <img> inside the profile popover history", () => {
    const createdAt = Date.UTC(2026, 6, 14, 16);
    mockData({
      messages: [{ _id: "m1", body: "hello", authorName: "vhs", userId: "u1" }],
      emojis: [{ _id: "e1", name: "party", imageUrl: "https://img.test/party.png" }],
      profile: {
        createdAt,
        messages: [{ _id: "pm1", body: "gg :party:", createdAt, removed: false }],
      },
    });
    renderPanel();

    fireEvent.click(screen.getByText("vhs"));

    const img = screen.getByAltText("party") as HTMLImageElement;
    expect(img.src).toBe("https://img.test/party.png");
    expect(img.dataset.state).toBe("closed");
  });

  it("renders profile-history dates as labeled separators without dash text", () => {
    const createdAt = Date.UTC(2026, 6, 14, 16);
    mockData({
      messages: [{ _id: "m1", body: "hello", authorName: "vhs", userId: "u1" }],
      profile: {
        createdAt,
        messages: [{ _id: "pm1", body: "hello", createdAt, removed: false }],
      },
    });
    renderPanel();

    fireEvent.click(screen.getByText("vhs"));

    expect(screen.getByRole("separator", { name: "jul 14" })).toBeInTheDocument();
    expect(screen.queryByText(/----/)).toBeNull();
  });
});
