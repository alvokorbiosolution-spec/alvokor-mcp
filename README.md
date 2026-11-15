# Alvokor MCP (starter)

Private, stateless Streamable HTTP MCP server for Vercel. This first version exposes read-only Zoho Social tools:
- `alvokor_service_status`
- `zoho_social_list_portals`
- `zoho_social_list_brands`
- `zoho_social_list_channels`

It does **not** publish or schedule posts yet. Publishing will be added only after the correct write scopes and Zoho's post payload requirements are confirmed.

## Requirements
- Node.js 20+
- Vercel project connected to this repository
- Zoho Social API access enabled for the portal
- Zoho EU OAuth refresh token with the scopes below

## Zoho OAuth scopes
Use only the read scopes needed for this stage:
- `ZohoSocial.Organization.READ` — portals and brands
- `ZohoSocial.Integration.READ` — connected social channels

The previously used `ZohoSocial.posts.READ` scope is not a substitute for these documented scopes. If the existing refresh token was created without the required scopes, generate a new authorization grant with the exact scopes above and exchange it securely. Do not paste secrets or tokens into chat or commit them to Git.

## Vercel environment variables
Set these in Vercel → Project → Settings → Environment Variables (Production and Preview as needed):
- `MCP_AUTH_TOKEN` — long random bearer secret used to protect the MCP endpoint
- `ZOHO_ACCOUNTS_BASE_URL` — `https://accounts.zoho.eu`
- `ZOHO_CLIENT_ID` — Zoho OAuth client ID
- `ZOHO_CLIENT_SECRET` — newly rotated Zoho client secret
- `ZOHO_REFRESH_TOKEN` — refresh token with the read scopes above
- `ZOHO_SOCIAL_API_BASE` — the EU API domain returned by Zoho OAuth (`api_domain`) where available; commonly `https://www.zohoapis.eu`
- `ZOHO_SOCIAL_PORTAL_ID` — optional convenience value
- `ZOHO_SOCIAL_BRAND_ID` — optional convenience value

Never put real secrets in `.env.example`, source code, GitHub, or chat. The old Client Secret and token values previously pasted into chat should be rotated/revoked before using this deployment.

## Local run
```bash
npm install
cp .env.example .env.local
# Fill .env.local locally only
npm run dev
```
Endpoint: `http://localhost:3000/api/mcp`

## Deploy
Push these files to the `main` branch of `alvokorbiosolution-spec/alvokor-mcp`. Vercel should build the linked project automatically. Framework: Next.js. Build command: `next build`.

## Security / integration notes
- The MCP endpoint requires `Authorization: Bearer <MCP_AUTH_TOKEN>`.
- This is a protected starter endpoint, not yet an OAuth authorization server for ChatGPT. Before connecting it directly to ChatGPT, we must configure an authentication method supported by the ChatGPT MCP connector and confirm the account's connector availability.
- Tools are read-only; no social posts are created, changed, or published.
- The API base is configurable because Zoho's API domain should match the EU tenant and OAuth response.

## Official references
- Zoho Social OAuth scopes: https://www.zoho.com/social/api/oauth-authentication.html
- Get portals: https://www.zoho.com/social/api/portals.html
- Get brands: https://www.zoho.com/social/api/brands.html
- Get channels: https://www.zoho.com/social/api/channels.html
- Vercel MCP handler: https://github.com/vercel-labs/mcp-handler
