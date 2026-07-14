"use client";

import * as React from "react";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";

export function AnnouncementModal() {
  const settings = useQuery(api.settings.get);
  const initialized = React.useRef(false);
  const lastSeen = React.useRef<number | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const loaded = settings !== undefined;
  const announcementMessage = settings?.announcement?.message;
  const sentAt = settings?.announcement?.sentAt;

  React.useEffect(() => {
    if (!loaded) return;
    if (!initialized.current) {
      initialized.current = true;
      lastSeen.current = sentAt ?? null;
      return;
    }
    if (
      announcementMessage !== undefined &&
      sentAt !== undefined &&
      sentAt !== lastSeen.current
    ) {
      lastSeen.current = sentAt;
      setMessage(announcementMessage);
    }
  }, [announcementMessage, loaded, sentAt]);

  if (message === null) return null;

  return (
    <div
      onClick={() => setMessage(null)}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(40,36,30,.45)] p-5 backdrop-blur-[6px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Site announcement"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[520px] border-2 border-border bg-card shadow-[7px_7px_0_var(--shadow-color)]"
      >
        <div className="bg-primary px-5 py-3 font-display text-[15px] text-primary-foreground uppercase">
          Site Announcement
        </div>
        <div className="p-5">
          <p className="whitespace-pre-wrap text-base leading-relaxed">{message}</p>
          <button
            type="button"
            autoFocus
            aria-label="Dismiss announcement"
            onClick={() => setMessage(null)}
            className="mt-5 w-full border-2 border-border bg-foreground px-[18px] py-[10px] font-display text-[12px] text-background uppercase shadow-brutal-sm transition-transform hover:-translate-x-px hover:-translate-y-px"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
