import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    externalId: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.literal("admin")),
  }).index("by_externalId", ["externalId"]),

  streams: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    scheduledStart: v.number(),
    actualStart: v.optional(v.number()),
    actualEnd: v.optional(v.number()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("live"),
      v.literal("ended"),
      v.literal("canceled"),
    ),
    liveUrl: v.optional(v.string()),
    recordingUrl: v.optional(v.string()),
    visibility: v.union(v.literal("public"), v.literal("private")),
  }).index("by_status", ["status", "scheduledStart"]),

  chatMessages: defineTable({
    streamId: v.id("streams"),
    userId: v.id("users"),
    body: v.string(),
    removed: v.boolean(),
  })
    .index("by_stream", ["streamId"])
    .index("by_user_and_stream", ["userId", "streamId"]),

  reactions: defineTable({
    streamId: v.id("streams"),
    userId: v.id("users"),
    kind: v.string(),
  }).index("by_stream", ["streamId"]),

  customEmojis: defineTable({
    name: v.string(),
    storageId: v.id("_storage"),
    active: v.boolean(),
  }).index("by_active", ["active"]),

  clips: defineTable({
    streamId: v.id("streams"),
    userId: v.id("users"),
    start: v.number(),
    end: v.number(),
    title: v.optional(v.string()),
    removed: v.boolean(),
  })
    .index("by_stream", ["streamId"])
    .index("by_user", ["userId"]),

  bans: defineTable({
    userId: v.id("users"),
    reason: v.string(),
    expiresAt: v.optional(v.number()),
    createdBy: v.id("users"),
  }).index("by_user", ["userId"]),

  presenceSessions: defineTable({
    streamId: v.id("streams"),
    sessionId: v.string(),
    userId: v.optional(v.id("users")),
    lastSeen: v.number(),
  })
    .index("by_stream_and_lastSeen", ["streamId", "lastSeen"])
    .index("by_lastSeen", ["lastSeen"])
    .index("by_session", ["streamId", "sessionId"]),
});
