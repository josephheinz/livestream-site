"use client";

import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Blink } from "@/components/motion/motion-primitives";
import { useAuthModal } from "./auth-modal";

// Single-channel site brand (there is no backend channel entity — research D3).
const CHANNEL_NAME = "Joseph Heinz";

const chromeBtn =
  "cursor-pointer border-2 border-[#57524a] px-[13px] py-[7px] font-sans text-[13px] font-bold uppercase tracking-[.04em] shadow-[2px_2px_0_rgba(0,0,0,.25)] transition-transform hover:-translate-x-px hover:-translate-y-px";

export function Banner({ live, viewers = 0 }: { live: boolean; viewers?: number }) {
  const { open } = useAuthModal();
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  return (
    <header className="flex flex-wrap items-center gap-3 bg-bar px-4 py-3 text-bar-ink">
      <Link href="/" className="flex items-center gap-2.5">
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "11px solid transparent",
            borderRight: "11px solid transparent",
            borderBottom: "19px solid var(--green)",
          }}
        />
        <span className="font-display text-[19px] text-bar-ink uppercase">{CHANNEL_NAME}</span>
      </Link>

      <div className="flex-1" />

      <div
        data-testid="banner-live"
        className="border-2 border-[#57524a] px-3 py-1.5 font-mono text-[12px] font-bold tracking-[.04em]"
      >
        {live ? (
          <span className="text-primary">
            <Blink>● LIVE — {viewers.toLocaleString("en-US")} WATCHING</Blink>
          </span>
        ) : (
          <span className="text-bar-muted">OFF AIR</span>
        )}
      </div>

      <button type="button" className={cn(chromeBtn, "bg-yellow text-[#3a352c]")}>
        Subscribe
      </button>
      {isSignedIn ? (
        <>
          <span className="font-mono text-[12px] font-bold tracking-[.04em] text-bar-muted uppercase">
            {user?.username ?? user?.firstName ?? "Signed in"}
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className={cn(chromeBtn, "bg-transparent text-bar-ink")}
          >
            Sign Out
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={open}
          className={cn(chromeBtn, "bg-primary text-primary-foreground")}
        >
          Sign In
        </button>
      )}
    </header>
  );
}
