/**
 * Lấy danh sách ảnh project ArtStation (public JSON) qua fetch-worker.
 * Dùng khi đăng album curator — không scrape HTML.
 */

import "server-only";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Tối đa ảnh/album khi đăng Autopilot (tránh abuse / timeout CF). */
export const ARTSTATION_ALBUM_MAX_ANH = 12;

export type ArtstationAssetAnh = {
  imageUrl: string;
  width: number | null;
  height: number | null;
};

export type ArtstationProjectAssets = {
  hashId: string;
  title: string | null;
  permalink: string | null;
  coverUrl: string | null;
  anh: ArtstationAssetAnh[];
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

/** Hash project từ URL artwork / projects. */
export function artstationHashTuUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(String(url || "").trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "artstation.com") return null;
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const kind = parts[0]?.toLowerCase();
  if (kind !== "artwork" && kind !== "projects") return null;
  const raw = parts[1] || "";
  const hash = raw.replace(/\.json$/i, "").trim();
  if (!/^[a-zA-Z0-9_-]{4,32}$/.test(hash)) return null;
  return hash;
}

function preferLargeUrl(url: string): string {
  /* `/original/` / `/4k/` nặng — ưu tiên `/large/` khi có. */
  return url.replace(
    /\/(?:original|4k|micro_square|small|medium)\//i,
    "/large/",
  );
}

/**
 * Parse JSON project ArtStation (`/projects/{hash}.json`) → assets.
 * Tách riêng để dùng cho cả worker (`layAnhArtstationTuUrl`) lẫn import qua
 * extension (JSON fetch same-origin trong tab người dùng).
 */
export function parseArtstationProjectJson(
  jsonText: string,
  opts?: { hashId?: string | null; gioiHan?: number },
):
  | { ok: true; data: ArtstationProjectAssets }
  | { ok: false; error: string } {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "JSON ArtStation không hợp lệ." };
  }

  const assetsRaw = Array.isArray(parsed.assets) ? parsed.assets : [];
  const gioiHan = Math.min(
    ARTSTATION_ALBUM_MAX_ANH,
    Math.max(1, opts?.gioiHan ?? ARTSTATION_ALBUM_MAX_ANH),
  );

  const anh: ArtstationAssetAnh[] = [];
  const seen = new Set<string>();
  for (const raw of assetsRaw) {
    if (anh.length >= gioiHan) break;
    if (!raw || typeof raw !== "object") continue;
    const a = raw as Record<string, unknown>;
    const assetType = String(a.asset_type || "").toLowerCase();
    if (assetType && assetType !== "image") continue;
    const imageUrlRaw =
      typeof a.image_url === "string" ? a.image_url.trim() : "";
    if (!imageUrlRaw || !/^https?:\/\//i.test(imageUrlRaw)) continue;
    const imageUrl = preferLargeUrl(imageUrlRaw);
    if (seen.has(imageUrl)) continue;
    seen.add(imageUrl);
    const width =
      typeof a.width === "number" && Number.isFinite(a.width)
        ? Math.round(a.width)
        : null;
    const height =
      typeof a.height === "number" && Number.isFinite(a.height)
        ? Math.round(a.height)
        : null;
    anh.push({ imageUrl, width, height });
  }

  if (!anh.length) {
    return { ok: false, error: "Project ArtStation không có ảnh." };
  }

  const coverUrl =
    typeof parsed.cover_url === "string" && parsed.cover_url.trim()
      ? preferLargeUrl(parsed.cover_url.trim())
      : anh[0]?.imageUrl || null;

  return {
    ok: true,
    data: {
      hashId:
        (typeof parsed.hash_id === "string" ? parsed.hash_id : null) ||
        opts?.hashId ||
        "",
      title: typeof parsed.title === "string" ? parsed.title : null,
      permalink:
        typeof parsed.permalink === "string" ? parsed.permalink : null,
      coverUrl,
      anh,
    },
  };
}

/** Mô tả plain-text ngắn của project (nếu có) — cho caption khi import. */
export function moTaArtstationTuJson(jsonText: string): string | null {
  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    const raw =
      typeof parsed.description === "string" ? parsed.description : "";
    const clean = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return clean || null;
  } catch {
    return null;
  }
}

/**
 * Fetch `https://www.artstation.com/projects/{hash}.json` qua worker.
 */
export async function layAnhArtstationTuUrl(
  urlNguon: string,
  opts?: { gioiHan?: number },
): Promise<
  | { ok: true; data: ArtstationProjectAssets }
  | { ok: false; error: string }
> {
  const hashId = artstationHashTuUrl(urlNguon);
  if (!hashId) {
    return { ok: false, error: "URL ArtStation không phải trang artwork/project." };
  }

  const cfg = workerConfig();
  if (!cfg) {
    return {
      ok: false,
      error: "Thiếu SINE_ART_WORKER_URL / SINE_ART_WORKER_SECRET.",
    };
  }

  const jsonUrl = `https://www.artstation.com/projects/${hashId}.json`;
  const res = await fetch(`${cfg.base}/fetch-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-secret": cfg.secret,
    },
    body: JSON.stringify({
      url: jsonUrl,
      headers: {
        "User-Agent": UA,
        Accept: "application/json, text/plain, */*",
      },
    }),
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => null)) as {
    ok?: boolean;
    status?: number;
    html?: string;
    error?: string;
  } | null;

  if (!payload?.ok || typeof payload.html !== "string") {
    return {
      ok: false,
      error:
        payload?.error ||
        `Không lấy được JSON ArtStation (HTTP ${payload?.status || res.status}).`,
    };
  }

  return parseArtstationProjectJson(payload.html, {
    hashId,
    gioiHan: opts?.gioiHan,
  });
}
