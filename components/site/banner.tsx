"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Blink } from "@/components/motion/motion-primitives";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuthModal } from "./auth-modal";

// Single-channel site brand (there is no backend channel entity — research D3).
const CHANNEL_NAME = "Joseph Heinz";

const navBase =
  "cursor-pointer border-2 border-[#57524a] px-[13px] py-[7px] font-sans text-[13px] font-bold uppercase tracking-[.05em] transition-transform hover:-translate-x-px hover:-translate-y-px";
const chromeBtn =
  "cursor-pointer border-2 border-[#57524a] px-[13px] py-[7px] font-sans text-[13px] font-bold uppercase tracking-[.04em] shadow-[2px_2px_0_rgba(0,0,0,.25)] transition-transform hover:-translate-x-px hover:-translate-y-px";

export function Banner({ live, viewers = 0 }: { live: boolean; viewers?: number }) {
  const pathname = usePathname();
  const { open } = useAuthModal();

  const nav = (href: string, labelText: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        data-active={active}
        className={cn(navBase, active ? "bg-yellow text-[#3a352c]" : "bg-transparent text-bar-ink")}
      >
        {labelText}
      </Link>
    );
  };

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

      <nav className="ml-1.5 flex items-center gap-2">
        {nav("/", "Watch")}
        {nav("/dashboard", "Dashboard")}
      </nav>

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
      <button type="button" onClick={open} className={cn(chromeBtn, "bg-primary text-primary-foreground")}>
        Sign In
      </button>
      <ThemeToggle />
    </header>
  );
}
