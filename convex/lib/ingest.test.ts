import { expect, test } from "vitest";
import { deriveLiveUrl, generateIngestKey } from "./ingest";

test("generateIngestKey returns unique, high-entropy, URL-safe keys", () => {
  const first = generateIngestKey();
  const second = generateIngestKey();

  expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(first.length).toBeGreaterThanOrEqual(22);
  expect(second).not.toBe(first);
});

test("deriveLiveUrl builds the HLS manifest URL", () => {
  expect(deriveLiveUrl("https://media.example.com", "stream_key")).toBe(
    "https://media.example.com/live/stream_key/index.m3u8",
  );
});
