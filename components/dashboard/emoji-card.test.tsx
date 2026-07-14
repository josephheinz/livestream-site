import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { api } from "@/convex/_generated/api";

const generateUploadUrlMock = vi.fn();
const createMock = vi.fn();
const deactivateMock = vi.fn();
const useQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (ref: unknown) => useQuery(ref),
  useMutation: (ref: unknown) => {
    const name = getFunctionName(ref as never);
    if (name === getFunctionName(api.emojis.generateUploadUrl)) return generateUploadUrlMock;
    if (name === getFunctionName(api.emojis.create)) return createMock;
    if (name === getFunctionName(api.emojis.deactivate)) return deactivateMock;
    return vi.fn();
  },
}));

import { EmojiCard } from "./emoji-card";

beforeEach(() => {
  useQuery.mockReturnValue([]);
  generateUploadUrlMock.mockReset();
  createMock.mockReset();
  deactivateMock.mockReset();
});
afterEach(() => vi.clearAllMocks());

function pickFile() {
  const file = new File(["png-bytes"], "party.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Emoji image"), { target: { files: [file] } });
}

describe("EmojiCard", () => {
  it("uploads via generateUploadUrl → POST → create with the returned storageId", async () => {
    generateUploadUrlMock.mockResolvedValue("https://upload.test/u1");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ storageId: "st1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<EmojiCard />);
    fireEvent.change(screen.getByLabelText("Emoji name"), { target: { value: "party_parrot" } });
    pickFile();
    fireEvent.click(screen.getByRole("button", { name: "Add emoji" }));

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({ name: "party_parrot", storageId: "st1" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://upload.test/u1",
      expect.objectContaining({ method: "POST", headers: { "Content-Type": "image/png" } }),
    );
    vi.unstubAllGlobals();
  });

  it("rejects names outside the chat :name: token charset", () => {
    render(<EmojiCard />);
    fireEvent.change(screen.getByLabelText("Emoji name"), { target: { value: "bad name!" } });
    pickFile();
    expect(screen.getByText(/Letters, numbers/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add emoji" })).toBeDisabled();
  });

  it("lists active emojis and deactivates on click", () => {
    useQuery.mockReturnValue([{ _id: "e1", name: "party", imageUrl: "https://img.test/p.png" }]);
    render(<EmojiCard />);
    fireEvent.click(screen.getByLabelText("Remove emoji party"));
    expect(deactivateMock).toHaveBeenCalledWith({ emojiId: "e1" });
  });
});
