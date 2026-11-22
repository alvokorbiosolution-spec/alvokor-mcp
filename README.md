# Alvokor MCP

Private, stateless Streamable HTTP MCP server for Vercel. The hybrid integration keeps CRM read access on the separately authorized Zoho CRM MCP connection and uses this server for Zoho Social API operations.

## Tool registry

### Service and permissions
- `alvokor_service_status` — reports configured capabilities without exposing secrets.

### Zoho Social read tools
- `zoho_social_list_portals` — `ZohoSocial.Organization.READ`
- `zoho_social_list_brands` — `ZohoSocial.Organization.READ`
- `zoho_social_list_channels` — `ZohoSocial.Integration.READ`
- `zoho_social_list_schedules` — `ZohoSocial.Publish.READ` or `ZohoSocial.Publish.ALL`
- `zoho_social_get_publish_status` — `ZohoSocial.Publish.READ` or `ZohoSocial.Publish.ALL`

### Zoho Social write tools
- `zoho_social_create_draft` — `ZohoSocial.Publish.CREATE` or `ZohoSocial.Publish.ALL`; creates a draft and does not publish it.
- `zoho_social_schedule_post` — `ZohoSocial.Publish.CREATE` or `ZohoSocial.Publish.ALL`; schedules for a future timestamp (milliseconds).
- `zoho_social_upload_image_url` — `ZohoSocial.Media.CREATE` or `ZohoSocial.Media.ALL`; imports an image from a public HTTPS URL and returns the media `file_path`.

The scheduling tool validates that every selected channel belongs to the requested brand and that the schedule is at least five minutes in the future. A schedule operation is a real external write. Immediate publish, delete, campaign, and calendar tools are not exposed in this phase.

## Hybrid connector boundaries

### Zoho CRM
CRM remains read-only through the existing Zoho CRM MCP connection in the MCP client. That connection's OAuth session is held by the client and is not automatically available to a Vercel-hosted server. Do not copy an OAuth access/refresh token from the client or try to reuse its private connection state. A server-side CRM bridge requires a separately approved service endpoint and credentials, or a new Zoho CRM OAuth grant restricted to READ scopes. Until then, connect the existing CRM MCP separately alongside Alvokor MCP.

### Zapier
Zapier remains a separate MCP connection. The configured endpoint currently exposes generic MCP meta-tools but no verified app actions. This server therefore does not advertise fake Zapier actions. Add Zapier tools only after app actions have been selected and verified in Zapier's tool configuration.

## Zoho OAuth scopes

Request least privilege scopes for the tools enabled:
- `ZohoSocial.Organization.READ`
- `ZohoSocial.Integration.READ`
- `ZohoSocial.Publish.READ`
- `ZohoSocial.Publish.CREATE`
- `ZohoSocial.Media.CREATE`

Use `ZohoSocial.Publish.ALL` or `ZohoSocial.Media.ALL` only if the account's app configuration requires those broader scopes. Zoho documents that scopes ending in `.ALL` include read and write access.

If the current refresh token was issued without these scopes, create a new authorization grant and refresh token. Store credentials only in Vercel Environment Variables. Rotate/revoke any secret that has previously been pasted into chat or committed to Git.

## Vercel environment variables

- `MCP_AUTH_TOKEN` — long random bearer secret protecting the MCP endpoint
- `ZOHO_ACCOUNTS_BASE_URL` — OAuth accounts domain for the Zoho tenant, e.g. `https://accounts.zoho.com` or `https://accounts.zoho.eu`
- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `ZOHO_SOCIAL_API_BASE` — API domain for the same Zoho data center, preferably the `api_domain` returned by Zoho OAuth
- `ZOHO_SOCIAL_PORTAL_ID` — optional convenience value
- `ZOHO_SOCIAL_BRAND_ID` — optional convenience value

Never put real secrets in `.env.example`, source code, GitHub, or chat.

## Local run

```bash
npm install
cp .env.example .env.local
# Fill .env.local locally only
npm run dev
npm run typecheck
```

Endpoint: `http://localhost:3000/api/mcp`

## Deploy

Push to the linked repository branch to trigger a Vercel Preview deployment. Merge to the production branch only after typecheck, preview MCP handshake, and live Zoho read tests pass. The production endpoint is `https://alvokor-mcp.vercel.app/api/mcp`.

## Security notes

- MCP endpoint requires `Authorization: Bearer <MCP_AUTH_TOKEN>`.
- Secret values are never returned by the status tool.
- No CRM write tools are exposed.
- No Zapier app action is claimed until verified.
- No immediate social publishing or deletion tool is exposed in this release.
- Zoho API errors are sanitized; OAuth credentials and access tokens are not included in error text.
- The image URL tool only accepts HTTPS public URLs.
- This bearer-token protection is not an OAuth authorization server for ChatGPT. Configure a client-supported auth method before exposing this endpoint to other users.

## Official references

- Zoho Social API scopes: https://www.zoho.com/social/api/oauth-authentication.html
- Create drafts: https://www.zoho.com/social/api/create-drafts.html
- Create schedules: https://www.zoho.com/social/api/create-schedules.html
- Image upload by URL: https://www.zoho.com/social/api/image-upload-url.html
- Publish status: https://www.zoho.com/social/api/publish-status.html
- Vercel MCP handler: https://github.com/vercel-labs/mcp-handler
