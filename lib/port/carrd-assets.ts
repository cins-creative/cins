/**
 * Parse HTML trang Carrd → title + URL ảnh (cho port import).
 * Không phụ thuộc DOM — regex trên HTML extension gửi về.
 */
import "server-only";

export const CARRD_ALBUM_MAX_ANH = 40;

export type CarrdParsed = {
  title: string | null;
  imageUrls: string[];
  soAnhVuotGioiHan: number;
  excerpt: string;
};

function decodeHtmlAttr(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function absUrl(raw: string, baseUrl: string): string | null {
  const t = decodeHtmlAttr(raw.trim());
  if (!t || t.startsWith("data:")) return null;
  try {
    return new URL(t, baseUrl).href;
  } catch {
    return null;
  }
}

function isLikelyImageUrl(u: string): boolean {
  const low = u.toLowerCase();
  if (/\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(low)) return true;
  if (/\/(?:uploads?|assets?|images?)\//i.test(low)) return true;
  if (/cloudfront|imgix|carrd\.co|cdn\./i.test(low)) return true;
  return false;
}

/**
 * Rút title, ảnh, đoạn text ngắn từ HTML Carrd (hoặc trang tĩnh tương tự).
 */
export function parseCarrdPageHtml(
  html: string,
  opts?: { baseUrl?: string; gioiHan?: number },
): CarrdParsed {
  const base = opts?.baseUrl || "https://carrd.co";
  const gioiHan = opts?.gioiHan ?? CARRD_ALBUM_MAX_ANH;
  const decoded = String(html || "")
    .replace(/\\u002F/gi, "/")
    .replace(/\\\//g, "/");

  let title: string | null = null;
  const ogTitle = decoded.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
  );
  const ogTitle2 = decoded.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
  );
  const titleTag = decoded.match(/<title[^>]*>([^<]+)<\/title>/i);
  title = (
    ogTitle?.[1] ||
    ogTitle2?.[1] ||
    titleTag?.[1] ||
    ""
  )
    .trim()
    .slice(0, 200) || null;

  const seen = new Set<string>();
  const imageUrls: string[] = [];
  let soAnhVuotGioiHan = 0;

  const push = (raw: string | undefined) => {
    if (!raw) return;
    const href = absUrl(raw, base);
    if (!href || !/^https?:\/\//i.test(href)) return;
    if (!isLikelyImageUrl(href)) return;
    if (seen.has(href)) return;
    seen.add(href);
    if (imageUrls.length >= gioiHan) {
      soAnhVuotGioiHan += 1;
      return;
    }
    imageUrls.push(href);
  };

  for (const m of decoded.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    push(m[1]);
  }
  for (const m of decoded.matchAll(
    /<img[^>]+(?:data-src|data-lazy-src|srcset)=["']([^"']+)["']/gi,
  )) {
    const first = (m[1] || "").split(",")[0]?.trim().split(/\s+/)[0];
    push(first);
  }
  for (const m of decoded.matchAll(
    /background(?:-image)?\s*:\s*url\(["']?([^"')]+)["']?\)/gi,
  )) {
    push(m[1]);
  }
  for (const m of decoded.matchAll(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi,
  )) {
    push(m[1]);
  }

  let excerpt = "";
  const texts: string[] = [];
  for (const m of decoded.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = (m[1] || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (t.length >= 20) texts.push(t);
    if (texts.length >= 3) break;
  }
  excerpt = texts.join(" ").slice(0, 400);

  return { title, imageUrls, soAnhVuotGioiHan, excerpt };
}
