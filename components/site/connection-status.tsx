"use client";

import { useEffect, useState } from "react";
import { useConvexConnectionState } from "convex/react";

/** Short delay before the initial-load stall is treated as degraded (research D10). */
const GRACE_MS = 3000;

/**
 * Shared degraded-state strip (FR-019, D10). Renders nothing while the Convex
 * connection is healthy; shows an explicit "connection lost / retrying" strip when
 * the client reports disconnected, or when the initial connection stalls past a short
 * grace window. Never renders placeholder content.
 */
export function ConnectionStatus() {
  const { isWebSocketConnected, hasEverConnected } = useConvexConnectionState();
  const [graceElapsed, setGraceElapsed] = useState(false);

  useEffect(() => {
    if (isWebSocketConnected) return;
    const timer = setTimeout(() => setGraceElapsed(true), GRACE_MS);
    return () => clearTimeout(timer);
  }, [isWebSocketConnected]);

  // Degraded once disconnected — immediately if we had ever connected (a live drop),
  // otherwise only after the grace window (an initial-load stall).
  const degraded = !isWebSocketConnected && (hasEverConnected || graceElapsed);
  if (!degraded) return null;

  return (
    <div
      role="status"
      data-testid="connection-status"
      className="flex-none border-t border-border bg-bar px-4 py-1.5 font-mono text-[12px] font-bold uppercase tracking-[.04em] text-primary"
    >
      ● Connection lost — retrying…
    </div>
  );
}
