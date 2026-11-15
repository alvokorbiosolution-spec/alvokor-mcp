const accountsBase = (process.env.ZOHO_ACCOUNTS_BASE_URL || "https://accounts.zoho.eu").replace(/\/+$/, "");
const socialApiBase = (process.env.ZOHO_SOCIAL_API_BASE || "https://www.zohoapis.eu").replace(/\/+$/, "");

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required Vercel environment variable: ${name}`);
  return value;
}

async function getAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: requiredEnv("ZOHO_CLIENT_ID"),
    client_secret: requiredEnv("ZOHO_CLIENT_SECRET"),
    refresh_token: requiredEnv("ZOHO_REFRESH_TOKEN")
  });

  const response = await fetch(`${accountsBase}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15000)
  });

  const payload = await response.json().catch(() => ({})) as {
    access_token?: string;
    error?: string;
  };

  if (!response.ok || !payload.access_token) {
    // Deliberately do not include request credentials or token values in errors.
    throw new Error(`Zoho OAuth refresh failed (${response.status}): ${payload.error || "No access token returned"}`);
  }

  return payload.access_token;
}

async function zohoGet(path: string, headers: Record<string, string> = {}, query?: Record<string, string>) {
  const token = await getAccessToken();
  const url = new URL(`${socialApiBase}/social/v2/${path.replace(/^\/+/, "")}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      Accept: "application/json",
      ...headers
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = typeof payload?.error?.code === "number" ? payload.error.code : response.status;
    const message = typeof payload?.error?.message === "string" ? payload.error.message : "Zoho Social API request failed";
    throw new Error(`Zoho Social API error ${code}: ${message}`);
  }
  return payload;
}

export function getConfigStatus() {
  return {
    accountsRegion: accountsBase.endsWith("zoho.eu") ? "EU" : "custom",
    hasClientId: Boolean(process.env.ZOHO_CLIENT_ID),
    hasClientSecret: Boolean(process.env.ZOHO_CLIENT_SECRET),
    hasRefreshToken: Boolean(process.env.ZOHO_REFRESH_TOKEN),
    hasApiBase: Boolean(process.env.ZOHO_SOCIAL_API_BASE),
    hasPortalId: Boolean(process.env.ZOHO_SOCIAL_PORTAL_ID),
    hasBrandId: Boolean(process.env.ZOHO_SOCIAL_BRAND_ID)
  };
}

export async function listPortals() {
  return zohoGet("socialportals", {}, { fields: "id,portal_name,plan,is_default" });
}

export async function listBrands(portalId: string) {
  return zohoGet("socialbrands", { portal_id: portalId }, { offset: "0", limit: "100", fields: "id,name,description,timezone,is_default" });
}

export async function listChannels(portalId: string, brandId: string) {
  return zohoGet("channels", {
    portal_id: portalId,
    brand_id: brandId
  }, { fields: "id,name,network,status,profile_id" });
}
