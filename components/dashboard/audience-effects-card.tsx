"use client";

import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import { TitledCard } from "@/components/ui/titled-card";

export function AudienceEffectsCard() {
  const trigger = useMutation(api.settings.triggerAudienceEffect);

  return (
    <TitledCard title="Audience Effects" contentClassName="p-4">
      <p className="mb-3 text-sm text-muted-foreground">
        Trigger a moment on every viewer&apos;s screen.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void trigger({ kind: "confetti" })}
          className="border-2 border-border bg-primary px-3 py-2 font-display text-[12px] text-primary-foreground uppercase shadow-brutal-sm transition-transform hover:-translate-x-px hover:-translate-y-px"
        >
          Burst confetti
        </button>
        <button
          type="button"
          onClick={() => void trigger({ kind: "imageRain" })}
          className="border-2 border-border bg-foreground px-3 py-2 font-display text-[12px] text-background uppercase shadow-brutal-sm transition-transform hover:-translate-x-px hover:-translate-y-px"
        >
          Drop images
        </button>
      </div>
    </TitledCard>
  );
}
