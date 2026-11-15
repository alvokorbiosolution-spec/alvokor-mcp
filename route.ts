import { createMcpHandler } from "mcp-handler";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getConfigStatus, listBrands, listChannels, listPortals } from "@/lib/zoho-social";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mcpHandler = createMcpHandler((server) => {
  server.registerTool(
    "alvokor_service_status",
    {
      title: "Alvokor service status",
      description: "Check whether the Alvokor MCP service and its Zoho Social environment variables are configured. Never returns secret values."
    },
    async () => ({
      content: [{ type: "text", text: JSON.stringify({
        service: "alvokor-mcp",
        status: "ok",
        zohoSocial: getConfigStatus()
      }, null, 2) }]
    })
  );

  server.registerTool(
    "zoho_social_list_portals",
    {
      title: "List Zoho Social portals",
      description: "Read the Zoho Social portals accessible to the configured EU Zoho account. Requires ZohoSocial.Organization.READ.",
      inputSchema: z.object({})
    },
    async () => {
      try {
        const result = await listPortals();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "Zoho Social request failed" }] };
      }
    }
  );

  server.registerTool(
    "zoho_social_list_brands",
    {
      title: "List Zoho Social brands",
      description: "Read brands in a Zoho Social portal. Requires ZohoSocial.Organization.READ.",
      inputSchema: z.object({ portalId: z.string().min(1) })
    },
    async ({ portalId }) => {
      try {
        const result = await listBrands(portalId);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "Zoho Social request failed" }] };
      }
    }
  );

  server.registerTool(
    "zoho_social_list_channels",
    {
      title: "List connected social channels",
      description: "Read Facebook, Instagram, LinkedIn and other channels connected to a Zoho Social brand. Requires ZohoSocial.Integration.READ.",
      inputSchema: z.object({
        portalId: z.string().min(1),
        brandId: z.string().min(1)
      })
    },
    async ({ portalId, brandId }) => {
      try {
        const result = await listChannels(portalId, brandId);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "Zoho Social request failed" }] };
      }
    }
  );
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
  if (!process.env.MCP_AUTH_TOKEN) {
    return Response.json({ error: "MCP_AUTH_TOKEN is not configured" }, { status: 503 });
  }
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: { "WWW-Authenticate": 'Bearer realm="Alvokor MCP"' }
    });
  }
  return mcpHandler(request);
}

export { protectedHandler as GET, protectedHandler as POST };
