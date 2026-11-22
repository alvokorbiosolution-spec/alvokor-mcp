export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "alvokor-mcp",
    mcpEndpoint: "/api/mcp",
    authConfigured: Boolean(process.env.MCP_AUTH_TOKEN),
    zohoSocialConfigured: Boolean(
      process.env.ZOHO_CLIENT_ID &&
      process.env.ZOHO_CLIENT_SECRET &&
      process.env.ZOHO_REFRESH_TOKEN
    )
  });
}
