"use client";

import * as React from "react";
import { useMutation } from "convex/react";

import { TitledCard } from "@/components/ui/titled-card";
import { api } from "@/convex/_generated/api";

const MAX_LENGTH = 280;

export function AnnouncementCard() {
  const send = useMutation(api.settings.sendAnnouncement);
  const [message, setMessage] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setStatus("");
    try {
      await send({ message });
      setMessage("");
      setStatus("Sent to everyone currently on the site.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not send announcement");
    } finally {
      setSending(false);
    }
  };

  return (
    <TitledCard title="Site Announcement">
      <form onSubmit={submit}>
        <label className="mb-[5px] block text-[11px] font-bold tracking-[.06em] uppercase">
          Popup message
        </label>
        <textarea
          aria-label="Announcement message"
          rows={3}
          maxLength={MAX_LENGTH}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Type a message for everyone currently on the site..."
          className="w-full resize-y border border-border bg-input px-2.5 py-2 font-sans text-sm text-foreground outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <span aria-live="polite" className="font-mono text-[12px] text-muted-foreground">
            {status || `${message.length}/${MAX_LENGTH}`}
          </span>
          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="border-2 border-border bg-primary px-[18px] py-[9px] font-display text-[12px] text-primary-foreground uppercase shadow-brutal-sm transition-transform hover:-translate-x-px hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send popup"}
          </button>
        </div>
      </form>
    </TitledCard>
  );
}
