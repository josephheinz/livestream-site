"use client";

import * as React from "react";
import { useSignIn, useSignUp } from "@clerk/nextjs";

type Mode = "signin" | "signup";

// Single-channel site brand (there is no backend channel entity — research D3).
const CHANNEL_NAME = "Joseph Heinz";

const fieldLabel = "mb-[5px] block text-[11px] font-bold tracking-[.06em] uppercase text-foreground";
const flatInput =
  "mb-[13px] w-full border border-border bg-input px-2.5 py-[9px] font-sans text-sm text-foreground outline-none";

// Controlled sign-in / create-account modal wired to Clerk's custom flow.
export function AuthModal({
  open,
  mode,
  onClose,
  onSwitchMode,
}: {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  onSwitchMode: () => void;
}) {
  // Gate the Clerk hooks behind `open` so closed modals (most routes) never
  // require a ClerkProvider in tests or on first paint.
  if (!open) return null;
  return <AuthDialog mode={mode} onClose={onClose} onSwitchMode={onSwitchMode} />;
}

function AuthDialog({
  mode,
  onClose,
  onSwitchMode,
}: {
  mode: Mode;
  onClose: () => void;
  onSwitchMode: () => void;
}) {
  const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const title = mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT";

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        if (!signInLoaded) return;
        const result = await signIn.create({ identifier: email, password });
        if (result.status === "complete") {
          await setSignInActive({ session: result.createdSessionId });
          onClose();
        } else {
          setError("Additional verification required. Continue in the sign-in page.");
        }
      } else {
        if (!signUpLoaded) return;
        const result = await signUp.create({ emailAddress: email, password, username });
        if (result.status === "complete") {
          await setSignUpActive({ session: result.createdSessionId });
          onClose();
        } else {
          // ponytail: email-verification step lives on the hosted /sign-up flow;
          // the modal only drives the create call (research D5).
          setError("Check your email to finish creating your account.");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="auth-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(40,36,30,.3)] p-5 backdrop-blur-[9px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] border-2 border-border bg-card shadow-[7px_7px_0_var(--shadow-color)]"
      >
        <div className="flex items-center justify-between gap-2.5 bg-bar py-[9px] pr-[9px] pl-[15px] text-bar-ink">
          <span className="font-display text-[14px] uppercase">{title}</span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-[29px] w-[29px] items-center justify-center border border-[rgba(230,220,200,.5)] bg-primary text-[16px] font-bold text-primary-foreground transition-transform hover:-translate-x-px hover:-translate-y-px"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-[22px]">
          <div className="mb-[18px] text-center">
            <div className="inline-flex items-center gap-[9px]">
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "10px solid transparent",
                  borderRight: "10px solid transparent",
                  borderBottom: "17px solid var(--green)",
                }}
              />
              <div className="font-display text-[17px] text-foreground uppercase">
                {CHANNEL_NAME}
              </div>
            </div>
            <p className="mt-2 text-[13px] text-muted-foreground">
              {mode === "signin"
                ? "Welcome back. Sign in to join the chat."
                : "Create an account to chat and subscribe."}
            </p>
          </div>

          {mode === "signup" && (
            <>
              <label className={fieldLabel}>Username</label>
              <input
                placeholder="pick a handle"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={flatInput}
              />
            </>
          )}
          <label className={fieldLabel}>Email</label>
          <input
            placeholder="you@address.net"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={flatInput}
          />
          <label className={fieldLabel}>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${flatInput} mb-[18px]`}
          />

          {error !== null && (
            <p className="mb-[13px] text-[13px] text-primary">{error}</p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="w-full border-2 border-border bg-primary py-[11px] text-center font-display text-[13px] text-primary-foreground uppercase shadow-brutal-sm transition-transform hover:-translate-x-px hover:-translate-y-px"
          >
            {title}
          </button>

          <div className="mt-[18px] border-t border-border pt-[13px] text-center text-[13px] text-muted-foreground">
            {mode === "signin" ? (
              <span>
                No account?{" "}
                <button type="button" onClick={onSwitchMode} className="font-bold text-primary underline">
                  Create one
                </button>
              </span>
            ) : (
              <span>
                Already a member?{" "}
                <button type="button" onClick={onSwitchMode} className="font-bold text-primary underline">
                  Sign in
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// One shared modal for every Sign In entry point (banner, footer, chat).
type Ctx = { open: () => void };
const AuthModalContext = React.createContext<Ctx | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>("signin");
  const value = React.useMemo<Ctx>(
    () => ({
      open: () => {
        setMode("signin");
        setOpen(true);
      },
    }),
    []
  );
  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal
        open={open}
        mode={mode}
        onClose={() => setOpen(false)}
        onSwitchMode={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): Ctx {
  const ctx = React.useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within an AuthModalProvider");
  return ctx;
}
