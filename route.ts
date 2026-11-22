import { createMcpHandler } from "mcp-handler";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  createDraft, getConfigStatus, getPublishStatus, listBrands, listChannels,
  listPortals, listSchedules, schedulePost, uploadImageFromUrl
} from "@/zoho-social";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const networks = [
  "facebookpage", "twitter", "instagram", "linkedinpage", "linkedinprofile",
  "youtube", "pinterest", "googlemybusiness", "mastodon", "threadsbyig",
  "bluesky", "tiktok", "arattai"
] as const;

function assertPostChannels(post: Record<string, unknown>, brandId: string) {
  const messages = post.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("post.messages must be a non-empty array");
  }
  for (const message of messages) {
    if (!message || typeof message !== "object" || !Array.isArray((message as {channels?: unknown}).channels)) {
      throw new Error("Each post message must include a channels array");
    }
    const channels = (message as {channels: unknown[]}).channels;
    if (channels.length === 0) throw new Error("Each message must target at least one channel");
    for (const channel of channels) {
      if (!channel || typeof channel !== "object") throw new Error("Invalid channel entry");
      const item = channel as {network?: unknown; brand_id?: unknown};
      if (typeof item.network !== "string" || !networks.includes(item.network as typeof networks[number])) {
        throw new Error("Unsupported or missing channel network");
      }
      if (item.brand_id !== brandId) {
        throw new Error("Every channel brand_id must match the selected brandId");
      }
    }
  }
}

function safePublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !host || host === "localhost" || host.endsWith(".local")) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return false;
    const match = host.match(/^172\.(\d+)\./);
    if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return false;
    return true;
  } catch {
    return false;
  }
}

const mcpHandler = createMcpHandler((server) => {
  server.registerTool("alvokor_service_status", {
    title: "Alvokor service status",
    description: "Check Alvokor MCP and Zoho Social configuration without returning credentials."
  }, async () => ({
    content: [{ type: "text", text: JSON.stringify({
      service: "alvokor-mcp",
      status: "ok",
      zohoSocial: getConfigStatus(),
      crm: { mode: "external_read_only_connector", embedded: false, note: "CRM access remains on the separately authorized read-only Zoho CRM MCP connection." },
      zapier: { mode: "not_configured", note: "No executable Zapier app actions have been verified for this integration." }
    }, null, 2) }]
  }));

  server.registerTool("zoho_social_list_portals", {
    title: "List Zoho Social portals",
    description: "Read Zoho Social portals. Requires ZohoSocial.Organization.READ.",
    inputSchema: z.object({})
  }, async () => {
    try { return { content: [{ type: "text", text: JSON.stringify(await listPortals(), null, 2) }] }; }
    catch (error) { return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "Zoho Social request failed" }] }; }
  });

  server.registerTool("zoho_social_list_brands", {
    title: "List Zoho Social brands",
    description: "Read brands in a Zoho Social portal. Requires ZohoSocial.Organization.READ.",
    inputSchema: z.object({ portalId: z.string().min(1) })
  }, async ({ portalId }) => {
    try { return { content: [{ type: "text", text: JSON.stringify(await listBrands(portalId), null, 2) }] }; }
    catch (error) { return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "Zoho Social request failed" }] }; }
  });

  server.registerTool("zoho_social_list_channels", {
    title: "List connected social channels",
    description: "Read channels connected to a Zoho Social brand. Requires ZohoSocial.Integration.READ.",
    inputSchema: z.object({ portalId: z.string().min(1), brandId: z.string().min(1) })
  }, async ({ portalId, brandId }) => {
    try { return { content: [{ type: "text", text: JSON.stringify(await listChannels(portalId, brandId), null, 2) }] }; }
    catch (error) { return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "Zoho Social request failed" }] }; }
  });

  server.registerTool("zoho_social_create_draft", {
    title: "Create Zoho Social draft",
    description: "Create a draft post across selected connected channels. Does not publish. Requires ZohoSocial.Publish.CREATE or ZohoSocial.Publish.ALL.",
    inputSchema: z.object({
      portalId: z.string().min(1),
      brandId: z.string().min(1),
      post: z.record(z.string(), z.unknown())
    })
  }, async ({ portalId, brandId, post }) => {
    try {
      assertPostChannels(post, brandId);
      return { content: [{ type: "text", text: JSON.stringify(await createDraft(portalId, brandId, post), null, 2) }] };
    } catch (error) { return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "Draft creation failed" }] }; }
  });

  server.registerTool("zoho_social_schedule_post", {
    title: "Schedule Zoho Social post",
    description: "Schedule a post for a future time in Unix milliseconds. This performs a real publishing workflow action. Requires ZohoSocial.Publish.CREATE or ZohoSocial.Publish.ALL.",
    inputSchema: z.object({
      portalId: z.string().min(1),
      brandId: z.string().min(1),
      post: z.record(z.string(), z.unknown())
    })
  }, async ({ portalId, brandId, post }) => {
    try {
      assertPostChannels(post, brandId);
      const scheduleTime = post.schedule_time;
      if (typeof scheduleTime !== "number" || !Number.isSafeInteger(scheduleTime) || scheduleTime < Date.now() + 5 * 60 * 1000) {
        throw new Error("post.schedule_time must be a Unix timestamp in milliseconds at least 5 minutes in the future");
      }
      return { content: [{ type: "text", text: JSON.stringify(await schedulePost(portalId, brandId, post), null, 2) }] };
    } catch (error) { return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "Scheduling failed" }] }; }
  });

  server.registerTool("zoho_social_upload_image_url", {
    title: "Upload image to Zoho Social",
    description: "Ask Zoho Social to fetch a publicly accessible HTTPS image URL and return its media file_path for use in a post. Requires ZohoSocial.Media.CREATE or ZohoSocial.Media.ALL.",
    inputSchema: z.object({
      portalId: z.string().min(1),
      brandId: z.string().min(1),
      imageUrl: z.string().url(),
      fileName: z.string().max(255).optional()
    })
  }, async ({ portalId, brandId, imageUrl, fileName }) => {
    try {
      if (!safePublicHttpsUrl(imageUrl)) throw new Error("imageUrl must be a public HTTPS URL");
      return { content: [{ type: "text", text: JSON.stringify(await uploadImageFromUrl(portalId, brandId, imageUrl, fileName), null, 2) }] };
    } catch (error) { return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "Image upload failed" }] }; }
  });

  server.registerTool("zoho_social_list_schedules", {
    title: "List scheduled Zoho Social posts",
    description: "Read scheduled posts for selected networks. Requires ZohoSocial.Publish.READ or ZohoSocial.Publish.ALL.",
    inputSchema: z.object({
      portalId: z.string().min(1),
      brandId: z.string().min(1),
      networks: z.array(z.enum(networks)).min(1),
      offset: z.number().int().min(0).default(0),
      limit: z.number().int().min(1).max(100).default(20)
    })
  }, async ({ portalId, brandId, networks: selectedNetworks, offset, limit }) => {
    try {
      return { content: [{ type: "text", text: JSON.stringify(await listSchedules(portalId, brandId, selectedNetworks.join(","), offset, limit), null, 2) }] };
    } catch (error) { return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "Schedule lookup failed" }] }; }
  });

  server.registerTool("zoho_social_get_publish_status", {
    title: "Get Zoho Social publish status",
    description: "Read per-network publish results for a post. Requires ZohoSocial.Publish.READ or ZohoSocial.Publish.ALL.",
    inputSchema: z.object({ portalId: z.string().min(1), brandId: z.string().min(1), postId: z.string().min(1) })
  }, async ({ portalId, brandId, postId }) => {
    try { return { content: [{ type: "text", text: JSON.stringify(await getPublishStatus(portalId, brandId, postId), null, 2) }] }; }
    catch (error) { return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "Publish status lookup failed" }] }; }
  });
});

function authorized(request: Request): boolean {
  const expected = process.env.MCP_AUTH_TOKEN;
  const supplied = request.headers.get("authorization") || "";
  if (!expected || !supplied.startsWith("Bearer ")) return false;
  const actualBuffer = Buffer.from(supplied.slice(7));
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

async function protectedHandler(request: Request): Promise<Response> {
  if (!process.env.MCP_AUTH_TOKEN) return Response.json({ error: "MCP_AUTH_TOKEN is not configured" }, { status: 503 });
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="Alvokor MCP"' } });
  }
  return mcpHandler(request);
}

export { protectedHandler as GET, protectedHandler as POST };
