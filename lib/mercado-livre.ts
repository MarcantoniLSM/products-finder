import { cookies } from "next/headers";

const ML_API_BASE_URL = "https://api.mercadolibre.com";
const ML_AUTH_URL = "https://auth.mercadolivre.com.br/authorization";
const SITE_ID = "MLB";

export type MlTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  user_id: number;
  refresh_token?: string;
};

export type MlTrend = {
  keyword: string;
  url: string;
};

export type MlHighlight = {
  id: string;
  type?: string;
  position?: number;
};

export type MlCategory = {
  id: string;
  name: string;
  total_items_in_this_category?: number;
  children_categories?: MlCategory[];
  path_from_root?: Array<{ id: string; name: string }>;
};

export type MlSearchItem = {
  id: string;
  title: string;
  permalink: string;
  price?: number;
  currency_id?: string;
  thumbnail?: string;
  category_id?: string;
  sold_quantity?: number;
  available_quantity?: number;
};

export type MlSearchResponse = {
  site_id: string;
  query?: string;
  source?: "search" | "highlights";
  paging: {
    total: number;
    primary_results?: number;
    offset: number;
    limit: number;
  };
  results: MlSearchItem[];
};

type MlBulkItemResponse = {
  code: number;
  body: MlSearchItem;
};

export function getMlConfig() {
  const clientId = process.env.MERCADO_LIVRE_CLIENT_ID;
  const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET;
  const redirectUri = process.env.MERCADO_LIVRE_REDIRECT_URI;

  return {
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: Boolean(clientId && clientSecret && redirectUri)
  };
}

export function buildMlAuthorizationUrl(state: string) {
  const { clientId, redirectUri, isConfigured } = getMlConfig();

  if (!isConfigured || !clientId || !redirectUri) {
    throw new Error("Mercado Livre OAuth is not configured.");
  }

  const url = new URL(ML_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url;
}

export async function exchangeMlCode(code: string) {
  const { clientId, clientSecret, redirectUri, isConfigured } = getMlConfig();

  if (!isConfigured || !clientId || !clientSecret || !redirectUri) {
    throw new Error("Mercado Livre OAuth is not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri
  });

  return postMlToken(body);
}

export async function refreshMlAccessToken(refreshToken: string) {
  const { clientId, clientSecret, isConfigured } = getMlConfig();

  if (!isConfigured || !clientId || !clientSecret) {
    throw new Error("Mercado Livre OAuth is not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken
  });

  return postMlToken(body);
}

export async function getMlConnectionStatus() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("ml_access_token")?.value;
  const refreshToken = cookieStore.get("ml_refresh_token")?.value;

  return {
    isConfigured: getMlConfig().isConfigured,
    isConnected: Boolean(accessToken || refreshToken)
  };
}

export async function readMlAccessToken() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("ml_access_token")?.value;
  const refreshToken = cookieStore.get("ml_refresh_token")?.value;

  if (accessToken) {
    return accessToken;
  }

  if (!refreshToken) {
    return null;
  }

  const refreshed = await refreshMlAccessToken(refreshToken);
  setMlTokenCookies(cookieStore, refreshed);

  return refreshed.access_token;
}

export async function readMlSessionTokens() {
  const cookieStore = await cookies();

  return {
    accessToken: cookieStore.get("ml_access_token")?.value ?? null,
    refreshToken: cookieStore.get("ml_refresh_token")?.value ?? null
  };
}

export function setMlTokenCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  token: MlTokenResponse
) {
  cookieStore.set("ml_access_token", token.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.max(token.expires_in - 60, 60),
    path: "/"
  });

  if (token.refresh_token) {
    cookieStore.set("ml_refresh_token", token.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 120,
      path: "/"
    });
  }
}

export async function fetchMlTrends(categoryId?: string) {
  const path = categoryId ? `/trends/${SITE_ID}/${categoryId}` : `/trends/${SITE_ID}`;
  return fetchMl<MlTrend[]>(path);
}

export async function fetchMlHighlights(categoryId: string) {
  return fetchMl<{ content?: MlHighlight[] }>(`/highlights/${SITE_ID}/category/${categoryId}`);
}

export async function fetchMlCategories() {
  return fetchMl<MlCategory[]>(`/sites/${SITE_ID}/categories`);
}

export async function fetchMlCategory(categoryId: string) {
  return fetchMl<MlCategory>(`/categories/${categoryId}`);
}

export async function searchMlItems({
  query,
  categoryId,
  offset = 0,
  limit = 50
}: {
  query?: string;
  categoryId?: string;
  offset?: number;
  limit?: number;
}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });

  if (query) {
    params.set("q", query);
  }

  if (categoryId) {
    params.set("category", categoryId);
  }

  const data = await fetchMl<MlSearchResponse>(`/sites/${SITE_ID}/search?${params.toString()}`);
  return { ...data, source: "search" as const };
}

export async function fetchMlHighlightedItems({
  categoryId,
  offset = 0,
  limit = 50
}: {
  categoryId: string;
  offset?: number;
  limit?: number;
}) {
  const highlights = await fetchMlHighlights(categoryId);
  const content = highlights.content ?? [];
  const page = content.slice(offset, offset + limit);
  const itemIds = page
    .filter((highlight) => highlight.type === "ITEM" || highlight.id.startsWith("MLB"))
    .map((highlight) => highlight.id);
  const items = itemIds.length > 0 ? await fetchMlItemsBulk(itemIds) : [];
  const itemById = new Map(items.map((item) => [item.id, item]));

  return {
    site_id: SITE_ID,
    source: "highlights" as const,
    paging: {
      total: content.length,
      offset,
      limit
    },
    results: page.map((highlight) => {
      const item = itemById.get(highlight.id);

      return (
        item ?? {
          id: highlight.id,
          title: `${highlight.type ?? "Produto"} ${highlight.id}`,
          permalink: `https://produto.mercadolivre.com.br/${highlight.id}`,
          category_id: categoryId
        }
      );
    })
  } satisfies MlSearchResponse;
}

export async function fetchMlItemsBulk(itemIds: string[]) {
  const ids = itemIds.slice(0, 20).join(",");
  const response = await fetchMl<MlBulkItemResponse[]>(`/items/bulk?ids=${encodeURIComponent(ids)}`);

  return response
    .filter((item) => item.code >= 200 && item.code < 300)
    .map((item) => item.body);
}

async function postMlToken(body: URLSearchParams) {
  const response = await fetch(`${ML_API_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Mercado Livre token request failed: ${response.status} ${detail}`);
  }

  return (await response.json()) as MlTokenResponse;
}

async function fetchMl<T>(path: string) {
  const accessToken = await readMlAccessToken();

  if (!accessToken) {
    throw new Error("Mercado Livre account is not connected.");
  }

  const response = await fetch(`${ML_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Mercado Livre request failed: ${response.status} ${detail}`);
  }

  return (await response.json()) as T;
}

async function fetchMlPublic<T>(path: string) {
  const response = await fetch(`${ML_API_BASE_URL}${path}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Mercado Livre public request failed: ${response.status} ${detail}`);
  }

  return (await response.json()) as T;
}
