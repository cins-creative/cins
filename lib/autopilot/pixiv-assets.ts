/**
 * Lấy ảnh artwork Pixiv (ajax illust + pages) — ưu tiên fetch trực tiếp.
 * Worker thường dính challenge HTML; ảnh i.pximg.net cần Referer pixiv.net.
 */

import "server-only";

import { anhQuaDaiChoFeed } from "@/lib/autopilot/anh-qua-dai";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Cookie giả (không login) — nhiều endpoint ajax vẫn cần PHPSESSID. */
const PIXIV_COOKIE = "PHPSESSID=u6sj3qf5fu976467ehd0323dlgrvcp8c";

export const PIXIV_ALBUM_MAX_ANH = 12;

export type PixivAssetAnh = {
  imageUrl: string;
  width: number | null;
  height: number | null;
};

export type PixivArtworkAssets = {
  illustId: string;
  title: string | null;
  userName: string | null;
  userId: string | null;
  descriptionPlain: string | null;
  coverUrl: string | null;
  anh: PixivAssetAnh[];
};

function workerConfig(): { base: string; secret: string } | null {
  const secret =
    process.env.SINE_ART_WORKER_SECRET?.trim() ||
    process.env.CINS_FETCH_WORKER_SECRET?.trim() ||
    "";
  const base =
    process.env.SINE_ART_WORKER_URL?.trim() ||
    process.env.CINS_FETCH_WORKER_URL?.trim() ||
    "";
  if (!secret || !base) return null;
  return { base: base.replace(/\/$/, ""), secret };
}

/** Illust id từ `/artworks/{id}`. */
export function pixivIllustIdTuUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(String(url || "").trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "pixiv.net") return null;
  const m = u.pathname.match(/\/(?:en\/)?artworks\/(\d+)\b/i);
  return m?.[1] || null;
}

function htmlToPlain(html: string): string {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pixivAjaxHeaders(illustId: string): Record<string, string> {
  return {
    "User-Agent": UA,
    Accept: "application/json",
    Referer: `https://www.pixiv.net/artworks/${illustId}`,
    Cookie: PIXIV_COOKIE,
  };
}

async function fetchJsonDirect(
  url: string,
  headers: Record<string, string>,
): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWorker(
  url: string,
  headers: Record<string, string>,
): Promise<unknown | null> {
  const cfg = workerConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.base}/fetch-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": cfg.secret,
      },
      body: JSON.stringify({ url, headers }),
      cache: "no-store",
    });
    const payload = (await res.json().catch(() => null)) as {
      ok?: boolean;
      html?: string;
    } | null;
    if (!payload?.ok || typeof payload.html !== "string") return null;
    const text = payload.html.trim();
    if (!text.startsWith("{") && !text.startsWith("[")) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function fetchPixivJson(
  url: string,
  headers: Record<string, string>,
): Promise<unknown | null> {
  let data = await fetchJsonDirect(url, headers);
  if (!data) data = await fetchJsonWorker(url, headers);
  return data;
}

/**
 * Fetch meta + pages Pixiv → danh sách URL ảnh (regular).
 * Reject: R18, ugoira; ảnh strip quá dài (trừ khi `choPhepAnhQuaDai` — xem trước admin).
 */
export async function layAnhPixivTuUrl(
  urlNguon: string,
  opts?: { gioiHan?: number; choPhepAnhQuaDai?: boolean },
): Promise<
  | { ok: true; data: PixivArtworkAssets; anhQuaDai?: boolean }
  | {
      ok: false;
      error: string;
      code?: "r18" | "ugoira" | "anh_qua_dai" | "fetch" | "parse";
    }
> {
  const illustId = pixivIllustIdTuUrl(urlNguon);
  if (!illustId) {
    return {
      ok: false,
      error: "URL Pixiv không phải trang /artworks/{id}.",
      code: "parse",
    };
  }

  const headers = pixivAjaxHeaders(illustId);
  const infoRaw = await fetchPixivJson(
    `https://www.pixiv.net/ajax/illust/${illustId}`,
    headers,
  );
  const info = infoRaw as {
    error?: boolean;
    body?: {
      illustTitle?: string;
      userName?: string;
      userId?: string;
      description?: string;
      pageCount?: number;
      xRestrict?: number;
      illustType?: number;
      width?: number;
      height?: number;
      urls?: { regular?: string; original?: string };
    };
  } | null;

  if (!info || info.error || !info.body) {
    return {
      ok: false,
      error: "Không đọc được meta artwork Pixiv (ajax).",
      code: "fetch",
    };
  }

  const body = info.body;
  if (Number(body.xRestrict) > 0) {
    return {
      ok: false,
      error: "Artwork R18 — không đăng Autopilot.",
      code: "r18",
    };
  }
  if (Number(body.illustType) === 2) {
    return {
      ok: false,
      error: "Ugoira (gif động) — chưa hỗ trợ album tĩnh.",
      code: "ugoira",
    };
  }

  const w0 = typeof body.width === "number" ? body.width : null;
  const h0 = typeof body.height === "number" ? body.height : null;
  let anhQuaDai = anhQuaDaiChoFeed({ width: w0, height: h0 });
  if (anhQuaDai && !opts?.choPhepAnhQuaDai) {
    return {
      ok: false,
      error: "Ảnh artwork quá dài (strip) — không phù hợp feed.",
      code: "anh_qua_dai",
    };
  }

  const gioiHan = Math.min(
    PIXIV_ALBUM_MAX_ANH,
    Math.max(1, opts?.gioiHan ?? PIXIV_ALBUM_MAX_ANH),
  );

  const pagesRaw = await fetchPixivJson(
    `https://www.pixiv.net/ajax/illust/${illustId}/pages`,
    headers,
  );
  const pages = pagesRaw as {
    error?: boolean;
    body?: Array<{
      urls?: { regular?: string; original?: string; small?: string };
      width?: number;
      height?: number;
    }>;
  } | null;

  const anh: PixivAssetAnh[] = [];
  const list = Array.isArray(pages?.body) ? pages!.body! : [];
  for (const page of list.slice(0, gioiHan)) {
    const imageUrl =
      page.urls?.regular?.trim() ||
      page.urls?.original?.trim() ||
      page.urls?.small?.trim() ||
      "";
    if (!/^https:\/\/i\.pximg\.net\//i.test(imageUrl)) continue;
    const width =
      typeof page.width === "number"
        ? page.width
        : anh.length === 0
          ? w0
          : null;
    const height =
      typeof page.height === "number"
        ? page.height
        : anh.length === 0
          ? h0
          : null;
    if (anhQuaDaiChoFeed({ width, height })) {
      anhQuaDai = true;
      if (!opts?.choPhepAnhQuaDai) {
        return {
          ok: false,
          error: "Artwork có trang ảnh quá dài — không phù hợp feed.",
          code: "anh_qua_dai",
        };
      }
    }
    anh.push({ imageUrl, width, height });
  }

  if (!anh.length && body.urls?.regular) {
    anh.push({
      imageUrl: body.urls.regular,
      width: w0,
      height: h0,
    });
  }

  if (!anh.length) {
    return {
      ok: false,
      error: "Không tìm thấy URL ảnh trên Pixiv.",
      code: "parse",
    };
  }

  const descriptionPlain = htmlToPlain(String(body.description || ""));
  return {
    ok: true,
    data: {
      illustId,
      title: body.illustTitle?.trim() || null,
      userName: body.userName?.trim() || null,
      userId: body.userId ? String(body.userId) : null,
      descriptionPlain: descriptionPlain || null,
      coverUrl: anh[0]?.imageUrl || null,
      anh,
    },
    anhQuaDai: anhQuaDai || undefined,
  };
}

/** Header bắt buộc khi tải i.pximg.net. */
export function pixivImageFetchHeaders(): Record<string, string> {
  return {
    "User-Agent": UA,
    Accept: "image/*,*/*;q=0.8",
    Referer: "https://www.pixiv.net/",
  };
}

/** URL proxy admin — trình duyệt không gửi Referer nên cần đi qua API. */
export function pixivAdminProxyUrl(imageUrl: string): string {
  const u = String(imageUrl || "").trim();
  if (!/^https:\/\/i\.pximg\.net\//i.test(u)) return u;
  return `/api/admin/autopilot/pixiv-proxy?u=${encodeURIComponent(u)}`;
}
