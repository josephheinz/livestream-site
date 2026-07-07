import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getCurrentUser, requireAdmin } from "./lib/auth";

export const LIVE_PROXY_PATH = "/stream/live.m3u8";

export function vodProxyPath(streamId: string) {
  return `/stream/vod/${streamId}.m3u8`;
}

async function callerIsAdmin(ctx: QueryCtx): Promise<boolean> {
  const user = await getCurrentUser(ctx);
  return user?.role === "admin";
}

/**
 * FR-022 / research D15: origin URLs can embed the node-media-server publish
 * key, so non-admins only ever see same-origin proxy paths.
 */
export function sanitize(stream: Doc<"streams">, isAdmin: boolean): Doc<"streams"> {
  if (isAdmin) {
    return stream;
  }
  return {
    ...stream,
    liveUrl:
      stream.status === "live" && stream.liveUrl !== undefined
        ? LIVE_PROXY_PATH
        : undefined,
    recordingUrl:
      stream.recordingUrl !== undefined ? vodProxyPath(stream._id) : undefined,
  };
}

async function findLive(ctx: QueryCtx): Promise<Doc<"streams"> | null> {
  return await ctx.db
    .query("streams")
    .withIndex("by_status", (q) => q.eq("status", "live"))
    .unique();
}

async function getStreamOrThrow(
  ctx: { db: QueryCtx["db"] },
  streamId: Doc<"streams">["_id"],
): Promise<Doc<"streams">> {
  const stream = await ctx.db.get(streamId);
  if (stream === null) {
    throw new Error("Stream not found");
  }
  return stream;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getLive = query({
  args: {},
  handler: async (ctx) => {
    const stream = await findLive(ctx);
    if (stream === null) {
      return null;
    }
    return sanitize(stream, await callerIsAdmin(ctx));
  },
});

export const get = query({
  args: { streamId: v.id("streams") },
  handler: async (ctx, { streamId }) => {
    const stream = await ctx.db.get(streamId);
    if (stream === null) {
      return null;
    }
    const isAdmin = await callerIsAdmin(ctx);
    if (stream.visibility === "private" && !isAdmin) {
      return null;
    }
    return sanitize(stream, isAdmin);
  },
});

export const listUpcoming = query({
  args: {},
  handler: async (ctx) => {
    const isAdmin = await callerIsAdmin(ctx);
    const upcoming = await ctx.db
      .query("streams")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .order("asc") // index is [status, scheduledStart] → soonest first
      .take(100);
    return upcoming.map((stream) => sanitize(stream, isAdmin));
  },
});

export const listArchive = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const max = Math.min(limit ?? 50, 100);
    const isAdmin = await callerIsAdmin(ctx);
    const archive: Doc<"streams">[] = [];
    const ended = ctx.db
      .query("streams")
      .withIndex("by_status", (q) => q.eq("status", "ended"))
      .order("desc"); // newest first
    for await (const stream of ended) {
      if (stream.recordingUrl === undefined) {
        continue; // ended but never archived
      }
      if (stream.visibility === "private" && !isAdmin) {
        continue; // read-time privacy (research D13)
      }
      archive.push(sanitize(stream, isAdmin));
      if (archive.length >= max) {
        break;
      }
    }
    return archive;
  },
});

// ---------------------------------------------------------------------------
// Admin mutations (lifecycle per data-model.md state machine)
// ---------------------------------------------------------------------------

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    scheduledStart: v.number(),
    liveUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("streams", {
      ...args,
      status: "scheduled",
      visibility: "public",
    });
  },
});

export const goLive = mutation({
  args: { streamId: v.id("streams") },
  handler: async (ctx, { streamId }) => {
    await requireAdmin(ctx);
    const stream = await getStreamOrThrow(ctx, streamId);
    if (stream.status !== "scheduled") {
      throw new Error(`Cannot go live from status "${stream.status}"`);
    }
    // Transactional single-live invariant (FR-002, research D2): mutations are
    // serializable, so this check-then-write cannot race.
    const alreadyLive = await findLive(ctx);
    if (alreadyLive !== null) {
      throw new Error("Another stream is already live");
    }
    await ctx.db.patch(streamId, { status: "live", actualStart: Date.now() });
    return null;
  },
});

export const end = mutation({
  args: { streamId: v.id("streams") },
  handler: async (ctx, { streamId }) => {
    await requireAdmin(ctx);
    const stream = await getStreamOrThrow(ctx, streamId);
    if (stream.status !== "live") {
      throw new Error(`Cannot end from status "${stream.status}"`);
    }
    await ctx.db.patch(streamId, { status: "ended", actualEnd: Date.now() });
    return null;
  },
});

export const update = mutation({
  args: {
    streamId: v.id("streams"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    scheduledStart: v.optional(v.number()),
    liveUrl: v.optional(v.string()),
  },
  handler: async (ctx, { streamId, ...fields }) => {
    await requireAdmin(ctx);
    await getStreamOrThrow(ctx, streamId);
    await ctx.db.patch(streamId, fields);
    return null;
  },
});

export const attachRecording = mutation({
  args: { streamId: v.id("streams"), recordingUrl: v.string() },
  handler: async (ctx, { streamId, recordingUrl }) => {
    await requireAdmin(ctx);
    const stream = await getStreamOrThrow(ctx, streamId);
    if (stream.status !== "ended") {
      throw new Error(`Cannot attach a recording to a "${stream.status}" stream`);
    }
    await ctx.db.patch(streamId, { recordingUrl });
    return null;
  },
});

export const setVisibility = mutation({
  args: {
    streamId: v.id("streams"),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  handler: async (ctx, { streamId, visibility }) => {
    await requireAdmin(ctx);
    await getStreamOrThrow(ctx, streamId);
    await ctx.db.patch(streamId, { visibility });
    return null;
  },
});

export const cancel = mutation({
  args: { streamId: v.id("streams") },
  handler: async (ctx, { streamId }) => {
    await requireAdmin(ctx);
    const stream = await getStreamOrThrow(ctx, streamId);
    if (stream.status !== "scheduled") {
      throw new Error(`Cannot cancel from status "${stream.status}"`);
    }
    await ctx.db.patch(streamId, { status: "canceled" });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal — HLS proxy resolution (app/stream/[[...path]]/route.ts, D15)
// ---------------------------------------------------------------------------

export const originForLive = internalQuery({
  args: {},
  handler: async (ctx) => {
    const stream = await findLive(ctx);
    return stream?.liveUrl ?? null;
  },
});

export const originForVod = internalQuery({
  args: { streamId: v.string() },
  handler: async (ctx, args) => {
    const streamId = ctx.db.normalizeId("streams", args.streamId);
    if (streamId === null) {
      return null;
    }
    const stream = await ctx.db.get(streamId);
    if (
      stream === null ||
      stream.status !== "ended" ||
      stream.recordingUrl === undefined
    ) {
      return null;
    }
    return { url: stream.recordingUrl, visibility: stream.visibility };
  },
});
