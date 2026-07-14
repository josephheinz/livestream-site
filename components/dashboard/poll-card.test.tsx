import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("convex/react", () => ({ useMutation: () => create }));

import { PollCard } from "./poll-card";

beforeEach(() => create.mockReset());

function fill(label: string, value: string) {
  fireEvent.change(screen.getByRole("textbox", { name: label }), {
    target: { value },
  });
}

it("starts a poll with the entered question, options, and duration", async () => {
  create.mockResolvedValue("p1");
  render(<PollCard />);

  fill("Poll question", "Best snack?");
  fill("Option 1", "chips");
  fill("Option 2", "candy");
  fireEvent.change(screen.getByRole("spinbutton", { name: "Poll duration in minutes" }), {
    target: { value: "10" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Start poll" }));

  await waitFor(() =>
    expect(create).toHaveBeenCalledWith({
      question: "Best snack?",
      options: ["chips", "candy"],
      durationMinutes: 10,
    }),
  );
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Poll question" })).toHaveValue(""),
  );
});

it("can add and remove options beyond the initial two", () => {
  render(<PollCard />);
  fireEvent.click(screen.getByRole("button", { name: "+ Add option" }));
  expect(screen.getByRole("textbox", { name: "Option 3" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove option 3" }));
  expect(screen.queryByRole("textbox", { name: "Option 3" })).toBeNull();
});

it("disables submit until every option is filled", () => {
  render(<PollCard />);
  fill("Poll question", "q?");
  fill("Option 1", "a");
  expect(screen.getByRole("button", { name: "Start poll" })).toBeDisabled();
  fill("Option 2", "b");
  expect(screen.getByRole("button", { name: "Start poll" })).toBeEnabled();
});
