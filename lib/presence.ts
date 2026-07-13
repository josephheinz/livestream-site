"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// 20 s heartbeats survive one dropped request inside the backend's 60 s fresh
// window (research D4).
const HEARTBEAT_MS = 20_000;
const SESSION_KEY = "livestream-presence-session";

/** Per-tab id: lets the backend keep the latest tab as the session owner. */
function sessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (id === null) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Heartbeat while mounted and visible; leave when hidden or closed. The
 * backend binds the session to the current stream, so this works on or off air.
 */
export function usePresence() {
  const heartbeat = useMutation(api.presence.heartbeat);
  const leave = useMutation(api.presence.leave);

  useEffect(() => {
    const id = sessionId();

    const beat = () => {
      if (document.visibilityState === "visible") {
        void heartbeat({ sessionId: id });
      }
    };
    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);

    const depart = () => void leave({ sessionId: id });
    const onVisibilityChange = () =>
      document.visibilityState === "visible" ? beat() : depart();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", depart);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", depart);
      depart();
    };
  }, [heartbeat, leave]);
}
