"use client";

import * as React from "react";
import { stream } from "@/lib/mock-data";

type Mode = "signin" | "signup";

const fieldLabel = "mb-[5px] block text-[11px] font-bold tracking-[.06em] uppercase text-foreground";
const flatInput =
  "mb-[13px] w-full border border-border bg-input px-2.5 py-[9px] font-sans text-sm text-foreground outline-none";

// Controlled sign-in / create-account modal. Inputs are inert (static shell);
// the primary button just closes.
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
  if (!open) return null;
  const title = mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT";
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
                {stream.channelName}
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
              <input placeholder="pick a handle" className={flatInput} />
            </>
          )}
          <label className={fieldLabel}>Email</label>
          <input placeholder="you@address.net" className={flatInput} />
          <label className={fieldLabel}>Password</label>
          <input type="password" placeholder="••••••••" className={`${flatInput} mb-[18px]`} />

          <button
            type="button"
            onClick={onClose}
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
