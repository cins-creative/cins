import "server-only";

import {
  isLikelyVideoUrl,
  parseShopeeProductUrl,
  shopeeCanonicalProductUrl,
  shopeeImageUrl,
} from "./parse-url";
import type { ShopeeMauDraft, ShopeeProductDraft } from "./types";

const FB_UA =
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

type WorkerFetchResult = {
  ok: boolean;
  status?: number;
  contentType?: string;
  html?: string;
  error?: string;
};

function workerConfig(): { base: string; secret: string } | null {
  const secret =
    process.env.SINE_ART_WORKER_SECRET?.trim() ||
    process.env.CINS_FETCH_WORKER_SECRET?.trim() ||
    process.env.WORKER_API_SECRET?.trim();
  const base =
    process.env.SINE_ART_WORKER_URL?.trim() ||
    process.env.CINS_FETCH_WORKER_URL?.trim() ||
    "";
  if (!secret || !base) return null;
  return { base: base.replace(/\/$/, ""), secret };
}

async function fetchViaWorker(
  url: string,
  headers?: Record<string, string>,
): Promise<WorkerFetchResult> {
  const cfg = workerConfig();
  if (!cfg) {
    throw new Error(
      "Thiếu SINE_ART_WORKER_SECRET / SINE_ART_WORKER_URL — không fetch được Shopee.",
    );
  }

  const res = await fetch(`${cfg.base}/fetch-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-secret": cfg.secret,
    },
    body: JSON.stringify({ url, headers }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as WorkerFetchResult | null;
  if (!data) {
    throw new Error(`Worker fetch-url lỗi JSON (HTTP ${res.status}).`);
  }
  return data;
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function metaContent(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta\\s+[^>]*?(?:property|name)=["']${escaped}["'][^>]*?content=["']([^"']*)["'][^>]*?>`,
      "i",
    ),
    new RegExp(
      `<meta\\s+[^>]*?content=["']([^"']*)["'][^>]*?(?:property|name)=["']${escaped}["'][^>]*?>`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m?.[1]) {
      const v = decodeBasicEntities(m[1]).trim();
      if (v) return v;
    }
  }
  return null;
}

function htmlTitle(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!m?.[1]) return null;
  return decodeBasicEntities(m[1].replace(/\s+/g, " ").trim()) || null;
}

function stripShopeeTitleSuffix(title: string): string {
  return title
    .replace(/\s*\|\s*Shopee.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Thu thập URL ảnh CDN Shopee từ HTML OG / preload. */
function extractShopeeImageUrls(html: string): string[] {
  const re =
    /https:\/\/down-vn\.img\.susercontent\.com\/file\/[a-zA-Z0-9_-]+/gi;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of html.matchAll(re)) {
    const url = (m[0] ?? "").split("?")[0]!;
    if (seen.has(url)) continue;
    if (url.includes("promo-dim-")) continue;
    if (isLikelyVideoUrl(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function shopeePriceToVnd(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  // Shopee thường lưu giá * 100000 (micros)
  if (raw >= 100_000) return Math.round(raw / 100_000);
  if (raw > 0) return Math.round(raw);
  return null;
}

/** Lấy danh sách image hash từ mảng string hoặc `{ image_id }` / `{ image_hash }`. */
function readImageKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry === "string" && entry.trim()) {
      out.push(entry.trim());
      continue;
    }
    if (entry && typeof entry === "object") {
      const o = entry as Record<string, unknown>;
      const id = o.image_id ?? o.image_hash ?? o.image ?? o.url;
      if (typeof id === "string" && id.trim()) out.push(id.trim());
    }
  }
  return out;
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickNum(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function collectModelDrafts(
  item: Record<string, unknown>,
  dataRoot: Record<string, unknown>,
): ShopeeMauDraft[] {
  const models: ShopeeMauDraft[] = [];
  const pushModel = (ten: string, imageKey: string | null) => {
    const name = ten.trim();
    if (!name) return;
    const img = imageKey ? shopeeImageUrl(imageKey) : null;
    models.push({
      ten: name,
      imageUrl: img && !isLikelyVideoUrl(img) ? img : null,
    });
  };

  const modelArrays: unknown[] = [];
  if (Array.isArray(item.models)) modelArrays.push(...item.models);
  const attrs = dataRoot.product_attributes;
  if (attrs && typeof attrs === "object") {
    const am = (attrs as Record<string, unknown>).models;
    if (Array.isArray(am)) modelArrays.push(...am);
  }

  for (const m of modelArrays) {
    if (!m || typeof m !== "object") continue;
    const o = m as Record<string, unknown>;
    const ten = pickStr(o, ["name", "model_name"]);
    const imgKey =
      typeof o.image === "string"
        ? o.image
        : typeof o.gallery_image === "string"
          ? o.gallery_image
          : null;
    pushModel(ten, imgKey);
  }

  if (models.length > 0) return models;

  // tier_variations (legacy + một số wire hiện đại)
  const tiers = Array.isArray(item.tier_variations)
    ? item.tier_variations
    : [];
  for (const tier of tiers) {
    if (!tier || typeof tier !== "object") continue;
    const t = tier as Record<string, unknown>;
    const opts = Array.isArray(t.options) ? t.options : [];
    const imgs = readImageKeys(t.images);
    opts.forEach((opt, i) => {
      pushModel(String(opt ?? ""), imgs[i] ?? null);
    });
  }

  return models;
}

function collectPriceMin(
  item: Record<string, unknown>,
  dataRoot: Record<string, unknown>,
  models: ShopeeMauDraft[],
  rawModels: unknown[],
): number | null {
  let priceMin =
    shopeePriceToVnd(pickNum(item, ["price_min", "price"])) ?? null;

  const pp = dataRoot.product_price;
  if (priceMin == null && pp && typeof pp === "object") {
    const priceObj = (pp as Record<string, unknown>).price;
    if (priceObj && typeof priceObj === "object") {
      const p = priceObj as Record<string, unknown>;
      const single = pickNum(p, ["single_value"]);
      const rangeMin = pickNum(p, ["range_min"]);
      // range_min = -1 khi không phải range
      if (rangeMin != null && rangeMin > 0) {
        priceMin = shopeePriceToVnd(rangeMin);
      } else if (single != null) {
        priceMin = shopeePriceToVnd(single);
      }
    }
  }

  if (priceMin == null && rawModels.length > 0) {
    const prices: number[] = [];
    for (const m of rawModels) {
      if (!m || typeof m !== "object") continue;
      const o = m as Record<string, unknown>;
      const nested =
        o.price && typeof o.price === "object"
          ? pickNum(o.price as Record<string, unknown>, ["single_value"])
          : null;
      const flat = pickNum(o, ["price"]);
      const v = shopeePriceToVnd(nested ?? flat);
      if (v != null && v > 0) prices.push(v);
    }
    if (prices.length) priceMin = Math.min(...prices);
  }

  void models;
  return priceMin;
}

/**
 * Parse get_pc — hỗ trợ legacy (`item.images`) và modern fan-out
 * (`data.product_images.images` dạng `{ image_id }`).
 */
function draftFromGetPcPayload(
  root: Record<string, unknown>,
  ids: { shopId: string; itemId: string; sourceUrl: string },
): ShopeeProductDraft | null {
  const dataRoot =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  const itemRaw = dataRoot.item ?? dataRoot;
  if (!itemRaw || typeof itemRaw !== "object") return null;
  const item = itemRaw as Record<string, unknown>;

  const title = pickStr(item, ["title", "name"]);
  if (!title) return null;

  const imageKeys: string[] = [];
  const seen = new Set<string>();
  const addKeys = (keys: string[]) => {
    for (const k of keys) {
      if (!k || seen.has(k)) continue;
      seen.add(k);
      imageKeys.push(k);
    }
  };

  // Cover trước
  const cover = pickStr(item, ["image"]);
  if (cover) addKeys([cover]);

  addKeys(readImageKeys(item.images));

  const productImages = dataRoot.product_images;
  if (productImages && typeof productImages === "object") {
    addKeys(
      readImageKeys((productImages as Record<string, unknown>).images),
    );
  }

  const imageUrls = imageKeys
    .map((k) => shopeeImageUrl(k))
    .filter((u) => u && !isLikelyVideoUrl(u) && !u.includes("promo-dim-"));

  const rawModelList: unknown[] = [];
  if (Array.isArray(item.models)) rawModelList.push(...item.models);
  const attrs = dataRoot.product_attributes;
  if (attrs && typeof attrs === "object") {
    const am = (attrs as Record<string, unknown>).models;
    if (Array.isArray(am)) rawModelList.push(...am);
  }

  const models = collectModelDrafts(item, dataRoot);
  const priceMin = collectPriceMin(item, dataRoot, models, rawModelList);
  const description = pickStr(item, ["description"]);

  return {
    shopId: ids.shopId,
    itemId: ids.itemId,
    sourceUrl: ids.sourceUrl,
    title,
    description,
    priceMin,
    imageUrls,
    models,
    source: "api",
    warnings:
      imageUrls.length === 0
        ? ["Không tìm thấy ảnh trong dữ liệu Shopee (get_pc)."]
        : [],
  };
}

function draftFromOgHtml(
  html: string,
  ids: { shopId: string; itemId: string; sourceUrl: string },
): ShopeeProductDraft {
  const ogTitle =
    metaContent(html, "og:title") || htmlTitle(html) || "Sản phẩm Shopee";
  const title = stripShopeeTitleSuffix(ogTitle);
  const ogDesc =
    metaContent(html, "og:description") ||
    metaContent(html, "description") ||
    "";
  const ogImage = metaContent(html, "og:image");
  const fromHtml = extractShopeeImageUrls(html);
  const imageUrls: string[] = [];
  const seen = new Set<string>();
  for (const u of [
    ...(ogImage ? [ogImage.split("?")[0]!] : []),
    ...fromHtml,
  ]) {
    if (!u || seen.has(u) || u.includes("promo-dim-") || isLikelyVideoUrl(u)) {
      continue;
    }
    seen.add(u);
    imageUrls.push(u);
  }

  const warnings = [
    "Shopee chặn API sản phẩm từ server — chỉ lấy được tiêu đề + ảnh (OG). Bật trợ lý AI để lấy đủ giá và mẫu.",
  ];

  return {
    shopId: ids.shopId,
    itemId: ids.itemId,
    sourceUrl: ids.sourceUrl,
    title,
    description: ogDesc.trim(),
    priceMin: null,
    imageUrls,
    models: [],
    source: "og",
    warnings,
  };
}

/** Parse JSON get_pc / item mà extension hoặc user gửi. */
export function parseShopeeRawPayload(
  raw: unknown,
  fallbackUrl?: string,
): ShopeeProductDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;

  // Bỏ lớp bọc { ok, data } nếu có
  const payload =
    root.data &&
    typeof root.data === "object" &&
    !("item" in (root.data as object)) &&
    "data" in (root.data as object)
      ? (root.data as Record<string, unknown>)
      : root;

  const dataRoot =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;

  const itemRaw = dataRoot.item ?? dataRoot;
  if (!itemRaw || typeof itemRaw !== "object") return null;
  const item = itemRaw as Record<string, unknown>;

  let shopId = "";
  let itemId = "";
  if (fallbackUrl) {
    const parsed = parseShopeeProductUrl(fallbackUrl);
    if (parsed) {
      shopId = parsed.shopId;
      itemId = parsed.itemId;
    }
  }
  if (!shopId) {
    const s = item.shop_id ?? item.shopid;
    if (s != null) shopId = String(s);
  }
  if (!itemId) {
    const i = item.item_id ?? item.itemid;
    if (i != null) itemId = String(i);
  }
  if (!shopId || !itemId) return null;

  const draft = draftFromGetPcPayload(payload, {
    shopId,
    itemId,
    sourceUrl: fallbackUrl || shopeeCanonicalProductUrl(shopId, itemId),
  });
  if (!draft) return null;
  return { ...draft, source: "raw" };
}

/**
 * Lấy draft sản phẩm từ URL Shopee.
 * 1) Thử get_pc (thường bị 90309999)
 * 2) Fallback HTML crawler (Facebook UA) → title + ảnh
 */
export async function fetchShopeeProductDraft(
  url: string,
): Promise<ShopeeProductDraft> {
  const ids = parseShopeeProductUrl(url);
  if (!ids) {
    throw new Error("URL Shopee không hợp lệ (cần dạng …-i.shopId.itemId).");
  }

  const canonical = shopeeCanonicalProductUrl(ids.shopId, ids.itemId);
  const apiUrl = `https://shopee.vn/api/v4/pdp/get_pc?shop_id=${ids.shopId}&item_id=${ids.itemId}`;

  try {
    const apiRes = await fetchViaWorker(apiUrl, {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "application/json",
      Referer: canonical,
      "X-API-SOURCE": "pc",
      "X-Requested-With": "XMLHttpRequest",
    });
    if (apiRes.ok && apiRes.html) {
      const json = JSON.parse(apiRes.html) as Record<string, unknown>;
      const err = json.error;
      if (err == null || err === 0) {
        const draft = draftFromGetPcPayload(json, {
          shopId: ids.shopId,
          itemId: ids.itemId,
          sourceUrl: ids.sourceUrl,
        });
        if (draft && (draft.imageUrls.length > 0 || draft.title)) {
          return draft;
        }
      }
    }
  } catch {
    // fall through to OG
  }

  const pageRes = await fetchViaWorker(canonical, {
    "User-Agent": FB_UA,
    Accept: "text/html,application/xhtml+xml",
  });
  if (!pageRes.ok || !pageRes.html?.trim()) {
    throw new Error(
      `Không đọc được trang Shopee (HTTP ${pageRes.status ?? "?"}).`,
    );
  }

  const draft = draftFromOgHtml(pageRes.html, {
    shopId: ids.shopId,
    itemId: ids.itemId,
    sourceUrl: ids.sourceUrl,
  });
  if (!draft.title) {
    throw new Error("Không trích được tiêu đề sản phẩm Shopee.");
  }
  if (draft.imageUrls.length === 0) {
    draft.warnings.push("Không tìm thấy ảnh sản phẩm trên trang.");
  }
  return draft;
}
