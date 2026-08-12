import {
  GIF_CONTENT_FILTER,
  GIF_COUNTRY,
  GIF_LOCALE,
  GIF_MEDIA_FILTER,
  GIF_SEARCH_LIMIT,
  GIPHY_CLIENT_KEY_DEFAULT,
  GIPHY_TENOR_HOST,
} from "@/lib/gif/constants";
import type { GifPage, GifResult } from "@/lib/gif/types";

type TenorMediaFormat = {
  url?: string;
  dims?: number[];
};

type TenorGifObject = {
  id?: string;
  title?: string;
  content_description?: string;
  media_formats?: Record<string, TenorMediaFormat | undefined>;
};

type TenorPageResponse = {
  results?: TenorGifObject[];
  next?: string;
};

export type TenorCompatError =
  | { kind: "missing_key" }
  | { kind: "upstream"; status: number; message: string }
  | { kind: "network"; message: string };

function apiKey(): string | null {
  const key = process.env.GIPHY_API_KEY?.trim();
  return key || null;
}

function clientKey(): string {
  return process.env.GIPHY_CLIENT_KEY?.trim() || GIPHY_CLIENT_KEY_DEFAULT;
}

function pickFormat(
  formats: Record<string, TenorMediaFormat | undefined> | undefined,
  name: string,
): TenorMediaFormat | null {
  const f = formats?.[name];
  if (!f?.url?.trim()) return null;
  return f;
}

function normalizeItem(raw: TenorGifObject): GifResult | null {
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  if (!id) return null;
  const formats = raw.media_formats;
  const gif = pickFormat(formats, "gif") ?? pickFormat(formats, "mediumgif");
  const tiny =
    pickFormat(formats, "tinygif") ??
    pickFormat(formats, "nanogif") ??
    gif;
  if (!gif?.url || !tiny?.url) return null;

  const dims = gif.dims ?? tiny.dims ?? [];
  const width = Number(dims[0]) || 0;
  const height = Number(dims[1]) || 0;
  const title =
    (typeof raw.title === "string" && raw.title.trim()) ||
    (typeof raw.content_description === "string" &&
      raw.content_description.trim()) ||
    undefined;

  return {
    id,
    previewUrl: tiny.url,
    url: gif.url,
    width,
    height,
    ...(title ? { title } : {}),
  };
}

function normalizePage(json: TenorPageResponse): GifPage {
  const items: GifResult[] = [];
  for (const row of json.results ?? []) {
    const item = normalizeItem(row);
    if (item) items.push(item);
  }
  const next =
    typeof json.next === "string" && json.next.trim() ? json.next.trim() : null;
  return { items, next };
}

async function fetchTenorCompat(
  path: "/v2/search" | "/v2/featured",
  params: Record<string, string>,
): Promise<{ ok: true; page: GifPage } | { ok: false; error: TenorCompatError }> {
  const key = apiKey();
  if (!key) return { ok: false, error: { kind: "missing_key" } };

  const qs = new URLSearchParams({
    key,
    client_key: clientKey(),
    locale: GIF_LOCALE,
    country: GIF_COUNTRY,
    contentfilter: GIF_CONTENT_FILTER,
    media_filter: GIF_MEDIA_FILTER,
    limit: String(GIF_SEARCH_LIMIT),
    ...params,
  });

  try {
    const res = await fetch(`${GIPHY_TENOR_HOST}${path}?${qs.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: {
          kind: "upstream",
          status: res.status,
          message:
            res.status === 429
              ? "Giphy đang giới hạn tốc độ. Thử lại sau."
              : body.slice(0, 200) || `Giphy lỗi ${res.status}.`,
        },
      };
    }
    const json = (await res.json()) as TenorPageResponse;
    return { ok: true, page: normalizePage(json) };
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "network",
        message:
          err instanceof Error ? err.message : "Không kết nối được Giphy.",
      },
    };
  }
}

export async function searchGifs(opts: {
  q: string;
  pos?: string | null;
}): Promise<{ ok: true; page: GifPage } | { ok: false; error: TenorCompatError }> {
  const q = opts.q.trim();
  if (!q) {
    return featuredGifs({ pos: opts.pos });
  }
  const params: Record<string, string> = { q };
  if (opts.pos?.trim()) params.pos = opts.pos.trim();
  return fetchTenorCompat("/v2/search", params);
}

export async function featuredGifs(opts?: {
  pos?: string | null;
}): Promise<{ ok: true; page: GifPage } | { ok: false; error: TenorCompatError }> {
  const params: Record<string, string> = {};
  if (opts?.pos?.trim()) params.pos = opts.pos.trim();
  return fetchTenorCompat("/v2/featured", params);
}

export function isGiphyConfigured(): boolean {
  return Boolean(apiKey());
}
