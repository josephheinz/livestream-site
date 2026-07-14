"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";

import { TitledCard } from "@/components/ui/titled-card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const MEDIA_SERVER_HOST = process.env.NEXT_PUBLIC_MEDIA_SERVER_HOST ?? "localhost:1935";

export function IngestCard({
  streamId,
  isLive,
  ingestActive,
}: {
  streamId?: Id<"streams">;
  isLive: boolean;
  ingestActive: boolean;
}) {
  const [isRevealed, setIsRevealed] = React.useState(false);
  const [rotatedKey, setRotatedKey] = React.useState<string | null>(null);
  const [isRotating, setIsRotating] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const revealedKey = useQuery(
    api.streams.revealIngestKey,
    isRevealed && streamId ? { streamId } : "skip",
  );
  const createStream = useMutation(api.streams.create);
  const rotate = useMutation(api.streams.rotateIngestKey);
  const ingestKey = rotatedKey ?? revealedKey;
  let address = "Ingest address hidden";

  if (isRevealed) {
    if (ingestKey === undefined) address = "Loading ingest address...";
    else if (ingestKey === null) address = "No ingest key configured.";
    else address = `rtmp://${MEDIA_SERVER_HOST}/live/${ingestKey}`;
  }

  const rotateKey = async () => {
    if (!streamId) return;
    if (isLive && !window.confirm("Rotate key? this will drop the active broadcast.")) return;

    setIsRotating(true);
    setStatus("");
    try {
      setRotatedKey(await rotate({ streamId }));
      setIsRevealed(true);
      setStatus("Ingest key rotated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not rotate ingest key");
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <TitledCard title="Ingest">
      <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">
        Publish this stream from OBS or another RTMP encoder.
      </p>
      <div className="mb-3 font-mono text-[12px] text-muted-foreground">
        SIGNAL: {ingestActive ? "ACTIVE" : "NONE"}
      </div>

      {!streamId ? (
        <button
          type="button"
          onClick={() => createStream({ title: "LIVE NOW", scheduledStart: Date.now() })}
          className="border-2 border-border bg-primary px-[18px] py-[9px] font-display text-[12px] text-primary-foreground uppercase shadow-brutal-sm transition-transform hover:-translate-x-px hover:-translate-y-px"
        >
          Create stream
        </button>
      ) : (
        <>
          <div className="break-all border border-border bg-input px-2.5 py-2 font-mono text-[13px] text-foreground">
            {address}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span aria-live="polite" className="font-mono text-[12px] text-muted-foreground">
              {status}
            </span>
            <div className="flex gap-2">
              {!isRevealed && (
                <button
                  type="button"
                  onClick={() => setIsRevealed(true)}
                  className="border-2 border-border bg-card px-[18px] py-[9px] font-display text-[12px] uppercase shadow-brutal-sm transition-transform hover:-translate-x-px hover:-translate-y-px"
                >
                  Reveal
                </button>
              )}
              <button
                type="button"
                onClick={rotateKey}
                disabled={isRotating}
                className="border-2 border-border bg-primary px-[18px] py-[9px] font-display text-[12px] text-primary-foreground uppercase shadow-brutal-sm transition-transform hover:-translate-x-px hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRotating ? "Rotating..." : "Rotate key"}
              </button>
            </div>
          </div>
        </>
      )}
    </TitledCard>
  );
}
