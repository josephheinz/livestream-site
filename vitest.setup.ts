import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// No `globals` in the UI project, so RTL's auto-cleanup isn't wired — do it here.
afterEach(() => cleanup());

/**
 * jsdom has no matchMedia; the theme controller and useReducedMotion() depend
 * on it. Install a controllable stub. Tests that care about the resolved value
 * call mockMatchMedia(true|false); the returned object can dispatch changes.
 */
export function mockMatchMedia(matches = false) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mql = {
    matches,
    media: "",
    onchange: null,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
    addListener: (cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeListener: (cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
    dispatchEvent: () => true,
    dispatch(next: boolean) {
      mql.matches = next;
      listeners.forEach((cb) => cb({ matches: next } as MediaQueryListEvent));
    },
  };
  window.matchMedia = vi.fn().mockImplementation(() => mql) as typeof window.matchMedia;
  return mql;
}

// Default stub so component mounts don't crash when a test doesn't set one.
mockMatchMedia(false);
