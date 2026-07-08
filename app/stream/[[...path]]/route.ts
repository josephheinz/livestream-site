import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { rewritePlaylist } from "../hls";

/**
 * Same-origin HLS proxy (FR-022, research D15).
 *
 *   GET /stream/live.m3u8            → live playlist (404 when nothing is live)
 *   GET /stream/<segment>            → live segment
 *   GET /stream/vod/<streamId>.m3u8  → recording playlist (404 for private VODs unless admin)
 *   GET /stream/vod/<streamId>/<seg> → recording segment
 *
 * Origin URLs (which can embed the node-media-server publish key) are resolved
 * server-side via the secret-guarded Convex `/stream-origin` HTTP action and
 * never appear in any response.
 *
 * Required env: NEXT_PUBLIC_CONVEX_URL, STREAM_PROXY_SECRET (same value set in
 * the Convex deployment env). Optional: CONVEX_SITE_URL when the HTTP-action
 * host isn't derivable from the cloud URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await params;
  if (path.length === 0 || path.some((seg) => seg === "" || seg.includes(".."))) {
    return notFound();
  }
  if (path[0] === "vod") {
    return await serveVod(path.slice(1));
  }
  return await serveLive(path);
}

async function serveLive(path: string[]): Promise<Response> {
  const resolved = await resolveOrigin();
  const originUrl: string | null = resolved?.live ?? null;
  if (originUrl === null) {
    return notFound();
  }
  const isPlaylist = path.length === 1 && path[0] === "live.m3u8";
  const target = isPlaylist ? originUrl : originDir(originUrl) + path.join("/");
  return await relay(target, "/stream/");
}

async function serveVod(rest: string[]): Promise<Response> {
  let streamId: string;
  let file: string | null;
  if (rest.length === 1 && rest[0].endsWith(".m3u8")) {
    streamId = rest[0].slice(0, -".m3u8".length);
    file = null;
  } else if (rest.length >= 2) {
    streamId = rest[0];
    file = rest.slice(1).join("/");
  } else {
    return notFound();
  }

  const resolved = await resolveOrigin(streamId);
  const vod: { url: string; visibility: "public" | "private" } | null =
    resolved?.vod ?? null;
  if (vod === null) {
    return notFound();
  }
  if (vod.visibility === "private" && !(await callerIsAdmin())) {
    return notFound();
  }
  const target = file === null ? vod.url : originDir(vod.url) + file;
  return await relay(target, `/stream/vod/${streamId}/`);
}

async function relay(targetUrl: string, proxyPrefix: string): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, { cache: "no-store" });
  } catch {
    return new Response(null, { status: 502 });
  }
  if (!upstream.ok) {
    return new Response(null, { status: upstream.status === 404 ? 404 : 502 });
  }
  if (new URL(targetUrl).pathname.endsWith(".m3u8")) {
    const rewritten = rewritePlaylist(
      await upstream.text(),
      proxyPrefix,
      targetUrl,
    );
    return new Response(rewritten, {
      headers: {
        "content-type": "application/vnd.apple.mpegurl",
        "cache-control": "no-store",
      },
    });
  }
  return new Response(upstream.body, {
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "public, max-age=60",
    },
  });
}

/** Directory of an origin URL, trailing slash included. */
function originDir(originUrl: string): string {
  return originUrl.slice(0, originUrl.lastIndexOf("/") + 1);
}

function notFound(): Response {
  return new Response(null, { status: 404 });
}

async function callerIsAdmin(): Promise<boolean> {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) {
    return false;
  }
  const me = await fetchQuery(api.users.me, {}, { token });
  return me?.role === "admin";
}

/** Ask Convex (secret-guarded HTTP action) for the origin URL behind a proxy path. */
async function resolveOrigin(streamId?: string) {
  const url = new URL("/stream-origin", convexSiteUrl());
  if (streamId !== undefined) {
    url.searchParams.set("streamId", streamId);
  }
  const response = await fetch(url, {
    headers: { "x-proxy-secret": process.env.STREAM_PROXY_SECRET ?? "" },
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  return await response.json();
}

function convexSiteUrl(): string {
  const explicit =
    process.env.CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (explicit) {
    return explicit;
  }
  const cloudUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!cloudUrl) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
  }
  return cloudUrl.replace(/\.convex\.cloud$/, ".convex.site");
}
