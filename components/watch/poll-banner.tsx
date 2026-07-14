"use client";

import * as React from "react";
import { BarChart3 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthModal } from "@/components/site/auth-modal";

// "m:ss" countdown label.
function remainingLabel(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Active poll pinned above chat. Anyone can see it; only signed-in users can
// vote (one vote, no changes). Results show once you've voted. The backend
// won't push an update at expiry, so a 1s local tick hides it on time.
export function PollBanner({ streamId }: { streamId?: Id<"streams"> }) {
  const { isSignedIn } = useAuth();
  const { open } = useAuthModal();
  const poll = useQuery(api.polls.active, streamId ? { streamId } : "skip");
  const vote = useMutation(api.polls.vote);
  const [now, setNow] = React.useState(() => Date.now());
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (poll == null) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [poll]);

  if (poll == null || poll.expiresAt <= now) {
    return null;
  }

  const voted = poll.myVote !== null;
  const total = poll.counts.reduce((a, b) => a + b, 0);

  const castVote = async (optionIndex: number) => {
    try {
      await vote({ pollId: poll._id, optionIndex });
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message.replace(/^.*Uncaught Error:\s*/, "")
          : "Could not vote",
      );
    }
  };

  return (
    <div className="flex-none border-b-2 border-border bg-card px-3.5 py-2">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <BarChart3
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 flex-none text-muted-foreground"
          />
          <span className="text-[13px] leading-tight font-bold break-words">
            {poll.question}
          </span>
        </div>
        <span className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">
          {remainingLabel(poll.expiresAt - now)}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {poll.options.map((option, i) => {
          const count = poll.counts[i] ?? 0;
          const pct = total === 0 ? 0 : Math.round((count / total) * 100);
          if (voted) {
            const mine = poll.myVote === i;
            return (
              <div key={i} className="relative border border-border bg-background">
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-primary/20"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex justify-between gap-2 px-2 py-1 text-[12px]">
                  <span className={`break-words ${mine ? "font-bold" : ""}`}>
                    {option}
                    {mine && <span className="ml-1 text-primary">✓</span>}
                  </span>
                  <span className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                    {pct}% ({count})
                  </span>
                </div>
              </div>
            );
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => (isSignedIn ? castVote(i) : open())}
              className="cursor-pointer border border-border bg-background px-2 py-1 text-left text-[12px] break-words hover:border-primary hover:text-primary"
            >
              {option}
            </button>
          );
        })}
      </div>

      <div className="mt-1 flex justify-between gap-2 font-mono text-[11px] text-muted-foreground">
        <span className="text-primary">{error}</span>
        <span>
          {!isSignedIn && !voted ? "sign in to vote — " : ""}
          {total} vote{total === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
