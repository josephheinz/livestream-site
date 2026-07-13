import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("convex/react", () => ({ useMutation: () => send }));

import { AnnouncementCard } from "./announcement-card";

beforeEach(() => send.mockReset());

it("sends a site announcement and clears the box", async () => {
  send.mockResolvedValue(null);
  render(<AnnouncementCard />);

  const box = screen.getByRole("textbox", { name: "Announcement message" });
  fireEvent.change(box, { target: { value: "Stream starts now!" } });
  fireEvent.click(screen.getByRole("button", { name: "Send popup" }));

  await waitFor(() => expect(send).toHaveBeenCalledWith({ message: "Stream starts now!" }));
  await waitFor(() => expect(box).toHaveValue(""));
});
