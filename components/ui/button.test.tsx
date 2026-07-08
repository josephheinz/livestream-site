import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

const VARIANTS = ["cta", "accent", "solid", "outline", "mono"] as const;

describe("Button neobrutalism variants", () => {
  it.each(VARIANTS)("renders %s as a button with its label", (variant) => {
    render(<Button variant={variant}>{variant} label</Button>);
    expect(screen.getByRole("button", { name: `${variant} label` })).toBeInTheDocument();
  });

  it.each(VARIANTS)("%s lifts on hover and keeps square corners", (variant) => {
    render(<Button variant={variant}>x</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("-translate-x-px");
    expect(btn.className).toContain("-translate-y-px");
    expect(btn.className).toContain("rounded-none");
    // No unprefixed rounded-md (a group-scoped in-…:rounded-md modifier is fine).
    expect(btn.className).not.toMatch(/(^|\s)rounded-md(\s|$)/);
  });
});
