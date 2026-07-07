import { expect, test } from "vitest";
import { rewritePlaylist } from "./hls";

const PLAYLIST = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXT-X-MAP:URI="init.mp4"
#EXTINF:6.0,
index0.ts
#EXTINF:6.0,
http://nms.internal:8000/live/SECRET_KEY/index1.ts
`;

test("relative segment URIs get the proxy prefix; tags stay intact", () => {
  const out = rewritePlaylist(PLAYLIST, "/stream/");
  expect(out).toContain("/stream/index0.ts");
  expect(out).toContain("#EXT-X-TARGETDURATION:6");
  expect(out).toContain('#EXT-X-MAP:URI="/stream/init.mp4"');
});

test("absolute URIs never leak the origin host", () => {
  const out = rewritePlaylist(PLAYLIST, "/stream/vod/abc123/");
  expect(out).not.toContain("nms.internal");
  expect(out).not.toContain("SECRET_KEY");
  expect(out).toContain("/stream/vod/abc123/index1.ts");
});
