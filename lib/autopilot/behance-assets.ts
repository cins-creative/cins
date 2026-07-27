/**
 * Lấy nội dung project Behance từ HTML gallery (modules text + ảnh).
 * Worker Sine thường 403 Cloudflare — ưu tiên fetch từ runtime app.
 */

import "server-only";

import { coAnhQuaDaiTrongDanhSach } from "@/lib/autopilot/anh-qua-dai";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const BEHANCE_ALBUM_MAX_ANH = 12;

const SIZE_PREF = [
  "max_1200",
  "1400",
  "disp",
  "hd",
  "fs",
  "max_632",
  "source",
];

export type BehanceAssetAnh = {
  imageUrl: string;
  width: number | null;
  height: number | null;
};

export type BehanceModule =
  | { kind: "text"; text: string }
  | { kind: "image"; anh: BehanceAssetAnh }
  | { kind: "video"; url: string };

export type BehanceProjectAssets = {
  projectId: string;
  title: string | null;
  coverUrl: string | null;
  /** Ảnh (dedup) — tương thích caller cũ. */
  anh: BehanceAssetAnh[];
  /** Thứ tự module trên trang (chữ + ảnh + video embed). */
  modules: BehanceModule[];
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

/** Project id từ URL `/gallery/{id}/…`. */
export function behanceProjectIdTuUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(String(url || "").trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "behance.net") return null;
  const m = u.pathname.match(/\/gallery\/(\d+)\b/i);
  return m?.[1] || null;
}

function decodeBasic(s: string): string {
  return String(s || "")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/\\u002F/gi, "/")
    .replace(/\\\//g, "/");
}

function metaContent(html: string, prop: string): string | null {
  const escaped = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re1 = new RegExp(
    `property=["']${escaped}["'][^>]*content=["']([^"']+)["']`,
    "i",
  );
  const re2 = new RegExp(
    `content=["']([^"']+)["'][^>]*property=["']${escaped}["']`,
    "i",
  );
  const raw = html.match(re1)?.[1] || html.match(re2)?.[1] || null;
  return raw ? decodeBasic(raw) : null;
}

function htmlToPlain(html: string): string {
  return decodeBasic(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chuanHoaTieuDe(raw: string | null): string | null {
  if (!raw) return null;
  let t = decodeBasic(raw).replace(/\s+/g, " ").trim();
  /* "Title - Artist" → Title */
  t = t.replace(/\s+[-–—]\s+[^-–—]{2,60}$/u, "").trim();
  return t || null;
}

/** Tiêu đề thô kiểu extension khi card không có tên: `Behance 123456`. */
export function laTieuDeThoBehance(raw: string | null | undefined): boolean {
  return /^Behance\s+\d+$/i.test(String(raw || "").trim());
}

/**
 * Tên project từ slug URL `/gallery/{id}/{slug}` (không fetch).
 * Bỏ `p` / `project` (path rút gọn).
 */
export function tieuDeTuSlugUrlBehance(url: string): string | null {
  try {
    const path = new URL(String(url || "").trim()).pathname;
    const m = path.match(/\/gallery\/\d+\/([^/]+)/i);
    if (!m?.[1]) return null;
    const slug = decodeURIComponent(m[1]).replace(/[-_]+/g, " ").trim();
    if (!slug || /^(p|project)$/i.test(slug)) return null;
    return slug.slice(0, 200);
  } catch {
    return null;
  }
}

/**
 * Cover + title từ HTML gallery — dùng backfill khi listing chỉ có `Behance {id}`.
 */
export async function layBehanceMetaTuUrl(
  urlNguon: string,
): Promise<{ title: string | null; coverUrl: string | null }> {
  const projectId = behanceProjectIdTuUrl(urlNguon);
  if (!projectId) return { title: null, coverUrl: null };
  const pageUrl = `https://www.behance.net/gallery/${projectId}/p`;
  let html = await fetchHtmlDirect(urlNguon);
  if (!html) html = await fetchHtmlDirect(pageUrl);
  if (!html) html = await fetchHtmlWorker(urlNguon);
  if (!html) return { title: null, coverUrl: null };
  const parsed = parseBehanceProjectHtml(html, { gioiHan: 1 });
  const cover =
    (parsed.coverUrl && /^https:\/\//i.test(parsed.coverUrl)
      ? parsed.coverUrl
      : null) ||
    parsed.anh[0]?.imageUrl ||
    null;
  let title = parsed.title;
  if (laTieuDeThoBehance(title)) title = null;
  if (!title) title = tieuDeTuSlugUrlBehance(urlNguon);
  return { title, coverUrl: cover };
}

/**
 * Chỉ lấy cover (og:image) — dùng backfill / hàng đợi khi extension thiếu anhBia.
 * Không reject video/strip (cover vẫn dùng được cho admin card).
 */
export async function layBehanceCoverTuUrl(
  urlNguon: string,
): Promise<string | null> {
  const meta = await layBehanceMetaTuUrl(urlNguon);
  return meta.coverUrl;
}

/** Trích mảng JSON `"modules":[…]` (tôn trọng string có `[`/`]`). */
function extractModulesJson(html: string): string | null {
  const marker = '"modules":[';
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const i = start + '"modules":'.length;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let p = i; p < html.length; p++) {
    const ch = html[p]!;
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        continue;
      }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) return html.slice(i, p + 1);
    }
  }
  return null;
}

function sizeScore(pathOrKey: string): number {
  const k = pathOrKey.toLowerCase();
  for (let i = 0; i < SIZE_PREF.length; i++) {
    if (k.includes(SIZE_PREF[i]!)) {
      return i + (/_webp/.test(k) ? 0.5 : 0);
    }
  }
  return 80;
}

function pickImageFromModule(mod: Record<string, unknown>): BehanceAssetAnh | null {
  const imageSizes =
    mod.imageSizes && typeof mod.imageSizes === "object"
      ? (mod.imageSizes as Record<string, unknown>)
      : null;
  const allAvailable = Array.isArray(imageSizes?.allAvailable)
    ? (imageSizes!.allAvailable as Array<Record<string, unknown>>)
    : [];

  type Cand = { url: string; width: number | null; height: number | null; score: number };
  const cands: Cand[] = [];

  for (const a of allAvailable) {
    const url = typeof a.url === "string" ? a.url.trim() : "";
    if (!/^https:\/\/mir-s3-cdn-cf\.behance\.net\//i.test(url)) continue;
    if (/_webp\//i.test(url) && !url.includes("max_1200")) continue;
    cands.push({
      url,
      width: typeof a.width === "number" ? a.width : null,
      height: typeof a.height === "number" ? a.height : null,
      score: sizeScore(url),
    });
  }

  /* Fallback keys size_* */
  if (imageSizes) {
    for (const [key, val] of Object.entries(imageSizes)) {
      if (!key.startsWith("size_") || !val || typeof val !== "object") continue;
      const row = val as Record<string, unknown>;
      const url = typeof row.url === "string" ? row.url.trim() : "";
      if (!/^https:\/\//i.test(url)) continue;
      cands.push({
        url,
        width: typeof row.width === "number" ? row.width : null,
        height: typeof row.height === "number" ? row.height : null,
        score: sizeScore(key),
      });
    }
  }

  if (!cands.length) return null;
  /* Ưu tiên candidate có đủ width×height (size_* có dims; allAvailable thường thiếu height). */
  cands.sort((a, b) => {
    const sa = a.score - (a.width && a.height ? 0.05 : 0);
    const sb = b.score - (b.width && b.height ? 0.05 : 0);
    return sa - sb;
  });
  const best = cands[0]!;
  let width = best.width;
  let height = best.height;
  if ((!width || !height) && imageSizes) {
    for (const [key, val] of Object.entries(imageSizes)) {
      if (!key.startsWith("size_") || !val || typeof val !== "object") continue;
      const row = val as Record<string, unknown>;
      const w = typeof row.width === "number" ? row.width : null;
      const h = typeof row.height === "number" ? row.height : null;
      if (!w || !h || w <= 0 || h <= 0) continue;
      if (width && Math.abs(w - width) <= 2) {
        height = h;
        break;
      }
      if (!width && !height) {
        width = w;
        height = h;
      }
    }
  }
  return {
    imageUrl: best.url,
    width,
    height,
  };
}

/**
 * YouTube / Vimeo từ EmbedModule · VideoModule (originalEmbed / fluidEmbed / src).
 * Trả URL canonical để block `embed` CINs tự nhúng.
 */
export function pickBehanceVideoEmbedUrl(
  mod: Record<string, unknown>,
): string | null {
  const blobs = [
    mod.originalEmbed,
    mod.fluidEmbed,
    mod.src,
    mod.url,
    mod.embed,
    mod.embedUrl,
    mod.videoUrl,
  ]
    .map((x) => String(x || ""))
    .join("\n");
  if (!blobs.trim()) return null;

  const vim = blobs.match(
    /(?:player\.)?vimeo\.com\/(?:video\/)?(\d{6,})/i,
  );
  if (vim?.[1]) return `https://vimeo.com/${vim[1]}`;

  const ytEmbed = blobs.match(
    /youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{6,})/i,
  );
  if (ytEmbed?.[1]) {
    return `https://www.youtube.com/watch?v=${ytEmbed[1]}`;
  }
  const ytWatch = blobs.match(
    /youtube\.com\/watch\?[^"'<\s]*v=([a-zA-Z0-9_-]{6,})/i,
  );
  if (ytWatch?.[1]) {
    return `https://www.youtube.com/watch?v=${ytWatch[1]}`;
  }
  const ytShort = blobs.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/i);
  if (ytShort?.[1]) {
    return `https://www.youtube.com/watch?v=${ytShort[1]}`;
  }
  return null;
}

/**
 * Parse modules + fallback regex ảnh nếu JSON lỗi.
 */
export function parseBehanceProjectHtml(
  html: string,
  opts?: { gioiHan?: number },
): {
  title: string | null;
  coverUrl: string | null;
  anh: BehanceAssetAnh[];
  modules: BehanceModule[];
} {
  const decoded = decodeBasic(html);
  const title = chuanHoaTieuDe(metaContent(html, "og:title"));
  const coverUrl = metaContent(html, "og:image");
  const gioiHan = Math.min(
    BEHANCE_ALBUM_MAX_ANH,
    Math.max(1, opts?.gioiHan ?? BEHANCE_ALBUM_MAX_ANH),
  );

  const modules: BehanceModule[] = [];
  const anh: BehanceAssetAnh[] = [];
  const seenImg = new Set<string>();
  const seenVideo = new Set<string>();

  const rawJson = extractModulesJson(decoded);
  if (rawJson) {
    try {
      const list = JSON.parse(rawJson) as Array<Record<string, unknown>>;
      for (const mod of list) {
        const typename = String(mod.__typename || mod.type || "");
        if (typename === "TextModule") {
          const plain = htmlToPlain(String(mod.text || ""));
          if (plain.length >= 2) modules.push({ kind: "text", text: plain });
          continue;
        }
        if (
          typename === "EmbedModule" ||
          typename === "VideoModule" ||
          /VideoModule/i.test(typename)
        ) {
          const videoUrl = pickBehanceVideoEmbedUrl(mod);
          if (videoUrl && !seenVideo.has(videoUrl)) {
            seenVideo.add(videoUrl);
            modules.push({ kind: "video", url: videoUrl });
          }
          continue;
        }
        if (
          typename === "ImageModule" ||
          mod.imageSizes ||
          (mod as { src?: string }).src
        ) {
          if (anh.length >= gioiHan) continue;
          const picked = pickImageFromModule(mod);
          if (!picked || seenImg.has(picked.imageUrl)) continue;
          seenImg.add(picked.imageUrl);
          anh.push(picked);
          modules.push({ kind: "image", anh: picked });
        }
      }
    } catch {
      /* fallback regex bên dưới */
    }
  }

  if (!anh.length) {
    const re =
      /https:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/([a-z0-9_]+)\/([a-zA-Z0-9_.%-]+\.(?:jpg|jpeg|png|webp))/gi;
    const byFile = new Map<string, { size: string; url: string }>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(decoded))) {
      const size = m[1] || "";
      const file = m[2] || "";
      if (!size || !file) continue;
      if (/^(max_158|max_316)/i.test(size)) continue;
      const url = `https://mir-s3-cdn-cf.behance.net/project_modules/${size}/${file}`;
      const prev = byFile.get(file);
      if (!prev || sizeScore(size) < sizeScore(prev.size)) {
        byFile.set(file, { size, url });
      }
    }
    for (const x of [...byFile.values()].slice(0, gioiHan)) {
      const item = { imageUrl: x.url, width: null, height: null };
      anh.push(item);
      modules.push({ kind: "image", anh: item });
    }
  }

  /* Fallback: iframe Vimeo/YouTube trong HTML nếu modules JSON không có EmbedModule. */
  if (!modules.some((m) => m.kind === "video")) {
    const iframeRe =
      /(?:player\.)?vimeo\.com\/(?:video\/)?(\d{6,})|youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{6,})/gi;
    let im: RegExpExecArray | null;
    while ((im = iframeRe.exec(decoded))) {
      const url = im[1]
        ? `https://vimeo.com/${im[1]}`
        : im[2]
          ? `https://www.youtube.com/watch?v=${im[2]}`
          : null;
      if (!url || seenVideo.has(url)) continue;
      seenVideo.add(url);
      modules.push({ kind: "video", url });
    }
  }

  if (!anh.length && coverUrl) {
    const item = { imageUrl: coverUrl, width: null, height: null };
    anh.push(item);
    if (!modules.some((m) => m.kind === "image")) {
      modules.push({ kind: "image", anh: item });
    }
  }

  return { title, coverUrl, anh, modules };
}

async function fetchHtmlDirect(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 500 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtmlWorker(url: string): Promise<string | null> {
  const cfg = workerConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.base}/fetch-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": cfg.secret,
      },
      body: JSON.stringify({
        url,
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
      }),
      cache: "no-store",
    });
    const payload = (await res.json().catch(() => null)) as {
      ok?: boolean;
      html?: string;
    } | null;
    if (!payload?.ok || typeof payload.html !== "string") return null;
    return payload.html.length > 500 ? payload.html : null;
  } catch {
    return null;
  }
}

/**
 * Fetch trang gallery Behance → modules (chữ + ảnh) + danh sách ảnh.
 */
export async function layAnhBehanceTuUrl(
  urlNguon: string,
  opts?: { gioiHan?: number },
): Promise<
  | { ok: true; data: BehanceProjectAssets }
  | {
      ok: false;
      error: string;
      code?: "anh_qua_dai" | "fetch" | "parse";
    }
> {
  const projectId = behanceProjectIdTuUrl(urlNguon);
  if (!projectId) {
    return {
      ok: false,
      error: "URL Behance không phải trang /gallery/{id}.",
      code: "parse",
    };
  }

  const pageUrl = `https://www.behance.net/gallery/${projectId}/p`;
  let html = await fetchHtmlDirect(urlNguon);
  if (!html) html = await fetchHtmlDirect(pageUrl);
  if (!html) html = await fetchHtmlWorker(urlNguon);
  if (!html) {
    return {
      ok: false,
      error: "Không fetch được HTML Behance (Cloudflare chặn).",
      code: "fetch",
    };
  }

  const parsed = parseBehanceProjectHtml(html, opts);
  const coVideo = parsed.modules.some((m) => m.kind === "video");
  if (!parsed.anh.length && !coVideo) {
    return {
      ok: false,
      error: "Không tìm thấy ảnh/video project trên trang Behance.",
      code: "parse",
    };
  }

  /* Strip / sheet siêu cao (vd. icon dump 1200×6690) — không đưa vào feed. */
  if (coAnhQuaDaiTrongDanhSach(parsed.anh)) {
    return {
      ok: false,
      error:
        "Project có ảnh quá dài (strip/sheet) — không phù hợp feed Autopilot.",
      code: "anh_qua_dai",
    };
  }

  return {
    ok: true,
    data: {
      projectId,
      title: parsed.title,
      coverUrl: parsed.coverUrl,
      anh: parsed.anh,
      modules: parsed.modules,
    },
  };
}
