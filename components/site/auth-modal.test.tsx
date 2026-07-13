import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthModal } from "./auth-modal";

describe("AuthModal (controlled)", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <AuthModal open={false} mode="signin" onClose={() => {}} onSwitchMode={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("signin: shows the dialog, no username field, switch link calls onSwitchMode", () => {
    const onSwitch = vi.fn();
    render(<AuthModal open mode="signin" onClose={() => {}} onSwitchMode={onSwitch} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("pick a handle")).toBeNull();
    fireEvent.click(screen.getByText("Create one"));
    expect(onSwitch).toHaveBeenCalledTimes(1);
  });

  it("signup: shows the username field", () => {
    render(<AuthModal open mode="signup" onClose={() => {}} onSwitchMode={() => {}} />);
    expect(screen.getByPlaceholderText("pick a handle")).toBeInTheDocument();
  });

  it("closes via the close control and the backdrop", () => {
    const onClose = vi.fn();
    render(<AuthModal open mode="signin" onClose={onClose} onSwitchMode={() => {}} />);
    fireEvent.click(screen.getByLabelText("Close"));
    fireEvent.click(screen.getByTestId("auth-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
