"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

// Live indicator: hard on/off blink (step-end). Static when motion is reduced.
export function Blink({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <span>{children}</span>;
  return (
    <motion.span
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1.2, times: [0, 0.49, 0.5, 1], repeat: Infinity, ease: "linear" }}
    >
      {children}
    </motion.span>
  );
}

// Connection/on-air indicator: soft opacity pulse on a square. Never rounded.
export function PulseSquare({
  color = "var(--primary)",
  size = 12,
}: {
  color?: string;
  size?: number;
}) {
  const reduced = useReducedMotion();
  const style: React.CSSProperties = {
    width: size,
    height: size,
    background: color,
    display: "inline-block",
    flex: "none",
  };
  if (reduced) return <span aria-hidden style={style} />;
  return (
    <motion.span
      aria-hidden
      style={style}
      animate={{ opacity: [1, 0.35, 1] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// Marquee: translate the (doubled) track from 0 → -50% for a seamless loop.
// Caller duplicates the content. Static when motion is reduced.
export function Ticker({
  children,
  durationSec = 26,
}: {
  children: React.ReactNode;
  durationSec?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className="overflow-hidden whitespace-nowrap">{children}</div>;
  return (
    <div className="overflow-hidden whitespace-nowrap">
      <motion.div
        className="inline-block"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: durationSec, repeat: Infinity, ease: "linear" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
