"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// 20 s heartbeats survive one dropped request inside the backend's 60 s fresh
// window (research D4).
const HEARTBEAT_MS = 20_000;
const SESSION_KEY = "livestream-presence-session";

/** Per-tab id: kept in sessionStorage so multiple tabs count as distinct sessions. */
function sessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (id === null) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Heartbeat presence while the Watch page is mounted and visible; leave on
 * unmount and on pagehide (research D4). No-op until a live stream id is known.
 */
export function usePresence(streamId: Id<"streams"> | undefined) {
  const heartbeat = useMutation(api.presence.heartbeat);
  const leave = useMutation(api.presence.leave);

  useEffect(() => {
    if (streamId === undefined) return;
    const id = sessionId();

    const beat = () => {
      if (document.visibilityState === "visible") {
        void heartbeat({ streamId, sessionId: id });
      }
    };
    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);

    const onPageHide = () => void leave({ streamId, sessionId: id });
    window.addEventListener("pagehide", onPageHide);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pagehide", onPageHide);
      void leave({ streamId, sessionId: id });
    };
  }, [streamId, heartbeat, leave]);
}
