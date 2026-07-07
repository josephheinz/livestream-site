import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getCurrentUser, requireUser } from "./lib/auth";
import { vodProxyPath } from "./streams";

const MAX_CLIP_SECONDS = 15;
const MAX_TITLE_CHARS = 100;

/** Playback URL of the clip's source VOD, sanitized per FR-022 / research D15. */
function sourceUrl(stream: Doc<"streams">, isAdmin: boolean): string | undefined {
  if (stream.recordingUrl === undefined) {
    return undefined;
  }
  return isAdmin ? stream.recordingUrl : vodProxyPath(stream._id);
}

export const list = query({
  args: { streamId: v.id("streams") },
  handler: async (ctx, { streamId }) => {
    const isAdmin = (await getCurrentUser(ctx))?.role === "admin";
    const stream = await ctx.db.get(streamId);
    // visibility is derived from the source at read time, never copied (D13/D14)
    if (stream === null || (stream.visibility === "private" && !isAdmin)) {
      return [];
    }
    const clips = await ctx.db
      .query("clips")
      .withIndex("by_stream", (q) => q.eq("streamId", streamId))
      .order("desc")
      .take(200);
    return clips
      .filter((clip) => !clip.removed)
      .map((clip) => ({ ...clip, sourceUrl: sourceUrl(stream, isAdmin) }));
  },
});

export const get = query({
  args: { clipId: v.id("clips") },
  handler: async (ctx, { clipId }) => {
    const clip = await ctx.db.get(clipId);
    if (clip === null || clip.removed) {
      return null;
    }
    const isAdmin = (await getCurrentUser(ctx))?.role === "admin";
    const stream = await ctx.db.get(clip.streamId);
    if (stream === null || (stream.visibility === "private" && !isAdmin)) {
      return null;
    }
    return { ...clip, sourceUrl: sourceUrl(stream, isAdmin) };
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const isAdmin = user.role === "admin";
    const clips = await ctx.db
      .query("clips")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(200);
    const result = [];
    for (const clip of clips) {
      if (clip.removed) {
        continue;
      }
      const stream = await ctx.db.get(clip.streamId);
      const playable =
        stream !== null && (stream.visibility === "public" || isAdmin);
      result.push({
        ...clip,
        sourceUrl: playable ? sourceUrl(stream, isAdmin) : undefined,
      });
    }
    return result;
  },
});

export const create = mutation({
  args: {
    streamId: v.id("streams"),
    start: v.number(),
    end: v.number(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.title !== undefined && args.title.length > MAX_TITLE_CHARS) {
      throw new Error(`Title exceeds ${MAX_TITLE_CHARS} characters`);
    }
    if (args.start < 0 || args.end <= args.start) {
      throw new Error("Clip bounds are invalid");
    }
    if (args.end - args.start > MAX_CLIP_SECONDS) {
      throw new Error(`Clips are limited to ${MAX_CLIP_SECONDS} seconds`);
    }
    const stream = await ctx.db.get(args.streamId);
    if (
      stream === null ||
      stream.status !== "ended" ||
      stream.recordingUrl === undefined
    ) {
      throw new Error("Clips can only be created from archived streams");
    }
    if (stream.visibility !== "public") {
      throw new Error("This VOD is not public");
    }
    return await ctx.db.insert("clips", {
      ...args,
      userId: user._id,
      removed: false,
    });
  },
});

export const remove = mutation({
  args: { clipId: v.id("clips") },
  handler: async (ctx, { clipId }) => {
    const user = await requireUser(ctx);
    const clip = await ctx.db.get(clipId);
    if (clip === null) {
      throw new Error("Clip not found");
    }
    if (clip.userId !== user._id && user.role !== "admin") {
      throw new Error("Only the clip's creator or an admin can remove it");
    }
    await ctx.db.patch(clipId, { removed: true });
    return null;
  },
});
