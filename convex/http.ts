import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (event === null) {
      return new Response("Invalid webhook signature", { status: 400 });
    }
    const { type, data } = event;
    if ((type === "user.created" || type === "user.updated") && data.id) {
      await ctx.runMutation(internal.users.upsertFromClerk, {
        externalId: data.id,
        name:
          [data.first_name, data.last_name].filter(Boolean).join(" ") ||
          "Anonymous",
        imageUrl: data.image_url ?? undefined,
        email: data.email_addresses?.[0]?.email_address ?? undefined,
      });
    } else if (type === "user.deleted" && data.id) {
      await ctx.runMutation(internal.users.deleteFromClerk, {
        externalId: data.id,
      });
    }
    // other Clerk event types are none of our business
    return new Response(null, { status: 200 });
  }),
});

// Origin-URL resolution for the same-origin HLS proxy (research D15).
// Only the Next.js server may call this — guarded by a shared secret that
// lives in both the Convex deployment env and the web server env.
http.route({
  path: "/stream-origin",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.STREAM_PROXY_SECRET;
    if (!secret || request.headers.get("x-proxy-secret") !== secret) {
      return new Response("Forbidden", { status: 403 });
    }
    const streamId = new URL(request.url).searchParams.get("streamId");
    if (streamId === null) {
      const url = await ctx.runQuery(internal.streams.originForLive, {});
      return Response.json({ live: url });
    }
    const vod = await ctx.runQuery(internal.streams.originForVod, { streamId });
    return Response.json({ vod });
  }),
});

http.route({
  path: "/ingest/publish",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.INGEST_WEBHOOK_SECRET;
    if (!secret || request.headers.get("x-ingest-secret") !== secret) {
      return Response.json({ ok: false }, { status: 403 });
    }
    const { streamKey } = (await request.json().catch(() => ({}))) as {
      streamKey?: unknown;
    };
    if (typeof streamKey !== "string") {
      return Response.json({ ok: false }, { status: 400 });
    }
    const result = await ctx.runMutation(internal.streams.beginPublish, {
      streamKey,
    });
    return Response.json(result, { status: result.ok ? 200 : 403 });
  }),
});

http.route({
  path: "/ingest/unpublish",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.INGEST_WEBHOOK_SECRET;
    if (!secret || request.headers.get("x-ingest-secret") !== secret) {
      return Response.json({ ok: false }, { status: 403 });
    }
    const { streamKey } = (await request.json().catch(() => ({}))) as {
      streamKey?: unknown;
    };
    await ctx.runMutation(internal.streams.endPublish, {
      streamKey: typeof streamKey === "string" ? streamKey : "",
    });
    return Response.json({ ok: true });
  }),
});

type ClerkWebhookEvent = {
  type: string;
  data: {
    id?: string;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
    email_addresses?: { email_address: string }[];
  };
};

async function validateRequest(request: Request): Promise<ClerkWebhookEvent | null> {
  const payload = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return null;
  }
  const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  try {
    return webhook.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return null;
  }
}

export default http;
