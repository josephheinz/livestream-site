"use client";

import Link from "next/link";
import { stream } from "@/lib/mock-data";
import { useAuthModal } from "./auth-modal";

export function Footer() {
  const { open } = useAuthModal();
  return (
    <footer className="flex flex-none flex-wrap items-center gap-[18px] bg-bar px-4 py-[11px] font-mono text-[12px] text-bar-muted">
      <span className="font-display text-[12px] text-bar-ink uppercase">{stream.channelName}</span>
      <Link href="/" className="underline">
        Watch
      </Link>
      <Link href="/dashboard" className="underline">
        Dashboard
      </Link>
      <button type="button" onClick={open} className="cursor-pointer underline">
        Sign In
      </button>
      <span className="flex-1" />
      <span>© 2026 — best viewed loud</span>
    </footer>
  );
}
