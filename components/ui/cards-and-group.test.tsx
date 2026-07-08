import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TitledCard } from "./titled-card";
import { StatCard } from "./stat-card";
import { InputGroup } from "./input-group";

describe("TitledCard", () => {
  it("renders its title and children", () => {
    render(
      <TitledCard title="External Connections">
        <p>panel body</p>
      </TitledCard>
    );
    expect(screen.getByText("External Connections")).toBeInTheDocument();
    expect(screen.getByText("panel body")).toBeInTheDocument();
  });
});

describe("StatCard", () => {
  it("renders label, value, and a bar reflecting barColor", () => {
    render(<StatCard label="Watching now" value="1,204" barColor="green" />);
    expect(screen.getByText("Watching now")).toBeInTheDocument();
    expect(screen.getByText("1,204")).toBeInTheDocument();
    expect(screen.getByTestId("stat-bar").dataset.color).toBe("green");
  });
});

describe("InputGroup", () => {
  it("renders the placeholder input and the fused button", () => {
    render(<InputGroup placeholder="Say something..." buttonLabel="Send" />);
    expect(screen.getByPlaceholderText("Say something...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });
});
