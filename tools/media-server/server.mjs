// Local dev media server: RTMP in → HLS out, with Convex ingest hooks.
// Run from the repo root so .env.local is picked up:
//   node --env-file=.env.local tools/media-server/server.mjs
import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import NodeMediaServer from "node-media-server";

const here = path.dirname(fileURLToPath(import.meta.url));

const SECRET = process.env.INGEST_WEBHOOK_SECRET;
if (!SECRET) {
  console.error("INGEST_WEBHOOK_SECRET is not set (add it to .env.local)");
  process.exit(1);
}

// Convex HTTP actions live on the deployment's .site host.
const SITE_URL =
  process.env.CONVEX_SITE_URL ??
  process.env.NEXT_PUBLIC_CONVEX_URL?.replace(".convex.cloud", ".convex.site");
if (!SITE_URL) {
  console.error("Set CONVEX_SITE_URL or NEXT_PUBLIC_CONVEX_URL in .env.local");
  process.exit(1);
}

function findFfmpeg() {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  try {
    return execSync(process.platform === "win32" ? "where ffmpeg" : "which ffmpeg")
      .toString()
      .split(/\r?\n/)[0]
      .trim();
  } catch {
    // winget installs may not be on PATH in already-open shells
    const winget = path.join(
      process.env.LOCALAPPDATA ?? "",
      "Microsoft",
      "WinGet",
      "Packages",
      "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
      "ffmpeg-8.1.2-full_build",
      "bin",
      "ffmpeg.exe",
    );
    if (existsSync(winget)) return winget;
    console.error("ffmpeg not found — install it (winget install Gyan.FFmpeg) or set FFMPEG_PATH");
    process.exit(1);
  }
}

const ffmpeg = findFfmpeg();
console.log(`[media-server] ffmpeg: ${ffmpeg}`);
console.log(`[media-server] ingest hooks → ${SITE_URL}/ingest/*`);

// forward slashes everywhere — ffmpeg arg parsing treats backslashes as escapes
const mediaRoot = path.join(here, "media").replaceAll("\\", "/");

const nms = new NodeMediaServer({
  // errors only — NMS's INFO logs print stream paths, which contain the ingest key
  logType: 1,
  rtmp: { port: 1935, chunk_size: 60000, gop_cache: true, ping: 30, ping_timeout: 60 },
  http: { port: 8000, mediaroot: mediaRoot, allow_origin: "*" },
  // ponytail: NMS's trans module spawns ffmpeg silently and died without a trace
  // on this machine — we run the HLS transmux ourselves below, with visible errors.
});

function keyFrom(streamPath) {
  // StreamPath is "/live/<ingestKey>"
  return streamPath.split("/")[2] ?? "";
}

// Never log the raw ingest key — it's a publish credential.
function redact(streamPath) {
  const key = keyFrom(streamPath);
  return `/live/${key.slice(0, 4)}…`;
}

async function hook(pathName, streamKey) {
  const res = await fetch(`${SITE_URL}/ingest/${pathName}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-ingest-secret": SECRET },
    body: JSON.stringify({ streamKey }),
  });
  return res.ok;
}

nms.on("prePublish", async (id, streamPath) => {
  const streamKey = keyFrom(streamPath);
  let ok = false;
  try {
    ok = await hook("publish", streamKey);
  } catch (err) {
    console.error(`[media-server] publish hook failed: ${err}`);
  }
  if (!ok) {
    console.log(`[media-server] rejected publish ${redact(streamPath)}`);
    nms.getSession(id)?.reject();
  } else {
    console.log(`[media-server] armed ${redact(streamPath)}`);
  }
});

nms.on("donePublish", async (id, streamPath) => {
  stopTransmux(streamPath);
  try {
    await hook("unpublish", keyFrom(streamPath));
    console.log(`[media-server] unpublished ${redact(streamPath)}`);
  } catch (err) {
    console.error(`[media-server] unpublish hook failed: ${err}`);
  }
});

// --- HLS transmux (ours, not NMS trans — see note above) ---------------------
const transmuxes = new Map(); // streamPath → ChildProcess

nms.on("postPublish", (id, streamPath) => {
  if (!streamPath.startsWith("/live/")) return;
  const outDir = `${mediaRoot}${streamPath}`;
  mkdirSync(outDir, { recursive: true });
  const proc = spawn(ffmpeg, [
    "-hide_banner", "-loglevel", "error",
    "-y", "-i", `rtmp://127.0.0.1:1935${streamPath}`,
    "-c:v", "copy", "-c:a", "copy",
    "-f", "hls",
    "-hls_time", "2", "-hls_list_size", "3",
    "-hls_flags", "delete_segments",
    `${outDir}/index.m3u8`,
  ]);
  let stderr = "";
  proc.stderr.on("data", (d) => (stderr += d));
  proc.on("close", (code) => {
    transmuxes.delete(streamPath);
    if (code !== 0 && code !== null) {
      const key = keyFrom(streamPath);
      console.error(
        `[media-server] transmux ${redact(streamPath)} exited ${code}: ` +
          stderr.replaceAll(key, "<key>").slice(-500),
      );
    }
  });
  transmuxes.set(streamPath, proc);
  console.log(`[media-server] transmuxing ${redact(streamPath)} → HLS`);
});

function stopTransmux(streamPath) {
  transmuxes.get(streamPath)?.kill();
  transmuxes.delete(streamPath);
}

nms.run();
