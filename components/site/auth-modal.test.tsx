import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInCreate = vi.fn();
const signUpCreate = vi.fn();
const setActive = vi.fn();
vi.mock("@clerk/nextjs", () => ({
  useSignIn: () => ({ isLoaded: true, signIn: { create: signInCreate }, setActive }),
  useSignUp: () => ({ isLoaded: true, signUp: { create: signUpCreate }, setActive }),
}));

import { AuthModal } from "./auth-modal";

beforeEach(() => {
  signInCreate.mockReset();
  signUpCreate.mockReset();
  setActive.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("AuthModal (controlled)", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <AuthModal open={false} mode="signin" onClose={() => {}} onSwitchMode={() => {}} />,
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

  it("signin: submitting drives the Clerk sign-in flow and closes on completion", async () => {
    signInCreate.mockResolvedValue({ status: "complete", createdSessionId: "sess_1" });
    const onClose = vi.fn();
    render(<AuthModal open mode="signin" onClose={onClose} onSwitchMode={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText("you@address.net"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "pw123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "SIGN IN" }));

    await waitFor(() =>
      expect(signInCreate).toHaveBeenCalledWith({
        identifier: "a@b.com",
        password: "pw123456",
      }),
    );
    await waitFor(() => expect(setActive).toHaveBeenCalledWith({ session: "sess_1" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("signup: submitting drives the Clerk sign-up flow", async () => {
    signUpCreate.mockResolvedValue({ status: "complete", createdSessionId: "sess_2" });
    const onClose = vi.fn();
    render(<AuthModal open mode="signup" onClose={onClose} onSwitchMode={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText("pick a handle"), {
      target: { value: "cooluser" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@address.net"), {
      target: { value: "c@d.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "pw123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "CREATE ACCOUNT" }));

    await waitFor(() =>
      expect(signUpCreate).toHaveBeenCalledWith({
        emailAddress: "c@d.com",
        password: "pw123456",
        username: "cooluser",
      }),
    );
  });
});
