"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";

import { TitledCard } from "@/components/ui/titled-card";
import { api } from "@/convex/_generated/api";

const ACCEPT = "image/png,image/webp,image/jpeg,image/gif";
// Must match the chat :name: token charset (chat-panel.tsx TOKEN regex).
const NAME_PATTERN = /^[a-zA-Z0-9_+-]+$/;

export function EmojiCard() {
  const emojis = useQuery(api.emojis.list) ?? [];
  const generateUploadUrl = useMutation(api.emojis.generateUploadUrl);
  const create = useMutation(api.emojis.create);
  const deactivate = useMutation(api.emojis.deactivate);

  const [name, setName] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const validName = NAME_PATTERN.test(name);
  const ready = validName && file !== null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || !file) return;
    setSending(true);
    setStatus("");
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed");
      const { storageId } = await response.json();
      await create({ name, storageId });
      setName("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setStatus(`Added — use :${name}: in chat.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not upload emoji");
    } finally {
      setSending(false);
    }
  };

  return (
    <TitledCard title="Custom Emoji">
      <form onSubmit={submit}>
        <label className="mb-[5px] block text-[11px] font-bold tracking-[.06em] uppercase">
          Name
        </label>
        <input
          aria-label="Emoji name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="party_parrot"
          className="w-full border border-border bg-input px-2.5 py-2 font-sans text-sm text-foreground outline-none"
        />
        {name.length > 0 && !validName && (
          <div className="mt-1 font-mono text-[12px] text-muted-foreground">
            Letters, numbers, _ + - only (no spaces).
          </div>
        )}

        <label className="mt-3 mb-[5px] block text-[11px] font-bold tracking-[.06em] uppercase">
          Image (32×32 — PNG, WebP, JPEG, or GIF)
        </label>
        <input
          ref={fileRef}
          aria-label="Emoji image"
          type="file"
          accept={ACCEPT}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="w-full border border-border bg-input px-2.5 py-2 font-sans text-sm text-foreground file:mr-2.5 file:cursor-pointer file:border file:border-border file:bg-transparent file:px-2 file:py-0.5 file:font-mono file:text-[12px] file:text-muted-foreground"
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <span aria-live="polite" className="font-mono text-[12px] text-muted-foreground">
            {status}
          </span>
          <button
            type="submit"
            disabled={sending || !ready}
            className="border-2 border-border bg-primary px-[18px] py-[9px] font-display text-[12px] text-primary-foreground uppercase shadow-brutal-sm transition-transform hover:-translate-x-px hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Uploading..." : "Add emoji"}
          </button>
        </div>
      </form>

      {emojis.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
          {emojis.map((emoji) => (
            <button
              key={emoji._id}
              type="button"
              title={`Remove :${emoji.name}:`}
              aria-label={`Remove emoji ${emoji.name}`}
              onClick={() => deactivate({ emojiId: emoji._id })}
              className="group flex cursor-pointer items-center gap-1.5 border border-border px-2 py-1 font-mono text-[12px] text-muted-foreground hover:border-primary hover:text-primary"
            >
              {emoji.imageUrl !== null && (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic Convex-storage emoji URL
                <img src={emoji.imageUrl} alt={emoji.name} className="h-5 w-5" />
              )}
              :{emoji.name}:
              <span aria-hidden className="opacity-0 group-hover:opacity-100">✕</span>
            </button>
          ))}
        </div>
      )}
    </TitledCard>
  );
}
