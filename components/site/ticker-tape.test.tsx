import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TickerTape, tickerItemsFor } from "./ticker-tape";

const LIVE = { title: "CHANNEL 01 — MAIN FEED" };
const UPCOMING = [{ title: "LATE FEED", scheduledStart: Date.UTC(2026, 6, 20, 1, 0) }];

// D9: ticker content is derived from backend live/upcoming state only. The old
// static marketing lines must never appear on the real routes.
const STATIC_MARKETING = ["MERCH DROP", "DON'T FEED THE ORBS", "SUBSCRIBE FOR GO-LIVE"];

describe("tickerItemsFor", () => {
  it("announces the live stream title while on air", () => {
    const items = tickerItemsFor(LIVE, UPCOMING);
    const text = items.map((i) => i.text).join(" | ");
    expect(text).toMatch(/ON AIR/);
    expect(text).toContain("CHANNEL 01 — MAIN FEED");
  });

  it("announces the next broadcast from upcoming", () => {
    const items = tickerItemsFor(null, UPCOMING);
    const text = items.map((i) => i.text).join(" | ");
    expect(text).toMatch(/NEXT BROADCAST/);
  });

  it("shows an honest off-air line when nothing is live or scheduled", () => {
    const items = tickerItemsFor(null, []);
    expect(items.length).toBeGreaterThan(0);
    const text = items.map((i) => i.text).join(" | ");
    expect(text).toMatch(/OFF AIR/);
  });

  it("never emits the static marketing lines", () => {
    for (const args of [
      tickerItemsFor(LIVE, UPCOMING),
      tickerItemsFor(null, UPCOMING),
      tickerItemsFor(null, []),
      tickerItemsFor(undefined, undefined),
    ]) {
      const text = args.map((i) => i.text).join(" | ");
      for (const marketing of STATIC_MARKETING) {
        expect(text).not.toContain(marketing);
      }
    }
  });
});

describe("TickerTape", () => {
  it("renders the derived items", () => {
    render(<TickerTape items={tickerItemsFor(LIVE, UPCOMING)} />);
    // Items are duplicated for the marquee, so there is at least one match.
    expect(screen.getAllByText(/ON AIR/).length).toBeGreaterThan(0);
  });
});
