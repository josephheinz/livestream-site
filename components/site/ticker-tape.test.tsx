import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TickerTape, tickerItemsFor } from "./ticker-tape";

const LIVE = { title: "CHANNEL 01 — MAIN FEED" };

// Ticker content is derived from live state and admin-authored settings. The old
// static marketing lines must never appear on the real routes.
const STATIC_MARKETING = ["MERCH DROP", "DON'T FEED THE ORBS", "SUBSCRIBE FOR GO-LIVE"];

describe("tickerItemsFor", () => {
  it("announces the live stream title while on air", () => {
    const items = tickerItemsFor(LIVE);
    const text = items.map((i) => i.text).join(" | ");
    expect(text).toMatch(/ON AIR/);
    expect(text).toContain("CHANNEL 01 — MAIN FEED");
  });

  it("does not add a next-broadcast line", () => {
    const items = tickerItemsFor(null);
    const text = items.map((i) => i.text).join(" | ");
    expect(text).not.toMatch(/NEXT BROADCAST/);
  });

  it("shows an honest off-air line when nothing is live or scheduled", () => {
    const items = tickerItemsFor(null);
    expect(items.length).toBeGreaterThan(0);
    const text = items.map((i) => i.text).join(" | ");
    expect(text).toMatch(/OFF AIR/);
  });

  it("appends the admin-authored lines from settings", () => {
    const items = tickerItemsFor(null, ["MERCH DROP FRIDAY", "DAY 115"]);
    const text = items.map((i) => i.text).join(" | ");
    expect(text).toContain("MERCH DROP FRIDAY");
    expect(text).toContain("DAY 115");
    // Custom lines present → no off-air filler.
    expect(text).not.toMatch(/OFF AIR/);
  });

  it("never emits the static marketing lines", () => {
    for (const args of [
      tickerItemsFor(LIVE),
      tickerItemsFor(null),
      tickerItemsFor(undefined),
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
    render(<TickerTape items={tickerItemsFor(LIVE)} />);
    // Items are duplicated for the marquee, so there is at least one match.
    expect(screen.getAllByText(/ON AIR/).length).toBeGreaterThan(0);
  });

  it("renders MiniMessage formatting in custom lines and the live title", () => {
    const items = tickerItemsFor(
      { title: "<green><bold>MAIN FEED</bold></green>" },
      ["<red>ALERT</red>"],
    );
    const { container } = render(<TickerTape items={items} />);

    expect(container).toHaveTextContent("● ON AIR — MAIN FEED");
    expect(screen.getAllByText("ALERT").length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[style*="color"]').length).toBeGreaterThan(0);
    expect(container).not.toHaveTextContent("<green>");
  });
});
