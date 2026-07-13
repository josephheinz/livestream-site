import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

let settings: undefined | null | { announcement: { message: string; sentAt: number } };
vi.mock("convex/react", () => ({ useQuery: () => settings }));

import { AnnouncementModal } from "./announcement-modal";

it("shows announcements sent after the visitor connected", () => {
  settings = null;
  const view = render(<AnnouncementModal />);
  expect(screen.queryByRole("dialog")).toBeNull();

  settings = { announcement: { message: "Stream starts now!", sentAt: 2 } };
  view.rerender(<AnnouncementModal />);
  expect(screen.getByRole("dialog")).toHaveTextContent("Stream starts now!");

  fireEvent.click(screen.getByRole("button", { name: "Dismiss announcement" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("does not replay an announcement that predates the visit", () => {
  settings = { announcement: { message: "Old news", sentAt: 1 } };
  render(<AnnouncementModal />);
  expect(screen.queryByRole("dialog")).toBeNull();
});
