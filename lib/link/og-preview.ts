/**
 * OG / link preview — scrape meta an toàn cho chat bubble.
 * Không thêm dependency parse HTML (regex đủ cho og:* / twitter:*).
 */

import { buildVideoIframeSrc } from "@/lib/journey/video-embed";

const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"']+/gi;
const FETCH_TIMEOUT_MS = 6_000;
const MAX_HTML_BYTES = 512_000;

export type LinkOgPreview = {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

export function trimUrlTrailingPunctuation(url: string): string {
  return url.replace(/[),.;!?]+$/g, "");
}

export function extractUrlsFromText(text: string): string[] {
  if (!text.trim()) return [];
  const matches = text.match(URL_IN_TEXT_RE);
  if (!matches) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of matches) {
    const candidate = trimUrlTrailingPunctuation(raw);
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    out.push(candidate);
  }
  return out;
}

/** URL đầu tiên không phải video embed (YouTube/Vimeo/…) — dùng cho OG card. */
export function findFirstOgPreviewUrl(text: string): string | null {
  for (const url of extractUrlsFromText(text)) {
    if (buildVideoIframeSrc(url)) continue;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
      return parsed.href;
    } catch {
      continue;
    }
  }
  return null;
}

export function isUrlOnlyBody(body: string, url: string): boolean {
  const trimmed = body.trim();
  const u = trimUrlTrailingPunctuation(url.trim());
  return trimmed === u || trimmed === url.trim();
}

/** Chặn SSRF cơ bản theo hostname (không resolve DNS). */
export function isSafePublicHttpUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;

  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]" ||
    host === "metadata.google.internal"
  ) {
    return false;
  }

  // IPv4 literal
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const parts = ipv4.slice(1).map(Number);
    if (parts.some((n) => n > 255)) return false;
    const [a, b] = parts;
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 0) return false;
    if (a === 169 && b === 254) return false;
    if (a === 192 && b === 168) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  }

  // IPv6 literal sơ bộ
  if (host.includes(":")) {
    if (
      host === "::1" ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe80")
    ) {
      return false;
    }
  }

  return true;
}

/** Decode entity HTML cơ bản — gồm hex (`&#x2F;` = `/`). PlayCanvas og:image dùng hex cho `/`. */
export function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = Number.parseInt(h, 16);
      if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return "";
      try {
        return String.fromCodePoint(code);
      } catch {
        return "";
      }
    })
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return "";
      try {
        return String.fromCodePoint(code);
      } catch {
        return "";
      }
    })
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * URL ảnh OG sau decode — sửa lỗi absolutize khi entity hex chưa decode
 * (vd. `https://playcanv.as/p/…/&#x2F;&#x2F;s3-…` → `https://s3-…`).
 */
export function normalizeOgImageUrl(
  raw: string,
  pageUrl?: string | null,
): string | null {
  const decoded = decodeBasicEntities(raw.trim());
  if (!decoded) return null;

  let candidate = decoded;
  try {
    candidate = pageUrl
      ? new URL(decoded, pageUrl).href
      : new URL(decoded).href;
  } catch {
    return null;
  }

  try {
    const parsed = new URL(candidate);
    /* Host bị nuốt vào path: /p/id///s3-….amazonaws.com/… */
    const embedded = parsed.pathname.match(
      /\/{2,}((?:[\w-]+\.)+(?:amazonaws\.com|playcanvas\.com)\/[^\s"'<>]*)/i,
    );
    if (embedded?.[1]) {
      const recovered = `https://${embedded[1]}`;
      return isSafePublicHttpUrl(recovered) ? recovered : null;
    }
  } catch {
    return null;
  }

  return isSafePublicHttpUrl(candidate) ? candidate : null;
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
      const v = decodeBasicEntities(m[1]);
      if (v) return v;
    }
  }
  return null;
}

function htmlTitle(html: string): string | null {
  const m = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  if (!m?.[1]) return null;
  const v = decodeBasicEntities(m[1]);
  return v || null;
}

function absolutizeUrl(base: string, maybeRelative: string | null): string | null {
  if (!maybeRelative?.trim()) return null;
  return normalizeOgImageUrl(maybeRelative, base);
}

export function parseOgFromHtml(html: string, pageUrl: string): LinkOgPreview | null {
  const title =
    metaContent(html, "og:title") ||
    metaContent(html, "twitter:title") ||
    htmlTitle(html);
  if (!title) return null;

  const description =
    metaContent(html, "og:description") ||
    metaContent(html, "twitter:description") ||
    metaContent(html, "description");

  const imageRaw =
    metaContent(html, "og:image") ||
    metaContent(html, "twitter:image") ||
    metaContent(html, "twitter:image:src");

  const siteName =
    metaContent(html, "og:site_name") ||
    (() => {
      try {
        return new URL(pageUrl).hostname.replace(/^www\./, "");
      } catch {
        return null;
      }
    })();

  const canonical =
    metaContent(html, "og:url") || pageUrl;

  return {
    url: absolutizeUrl(pageUrl, canonical) || pageUrl,
    title: title.slice(0, 200),
    description: description ? description.slice(0, 280) : null,
    image: absolutizeUrl(pageUrl, imageRaw),
    siteName: siteName ? siteName.slice(0, 80) : null,
  };
}

export async function fetchLinkOgPreview(
  rawUrl: string,
): Promise<LinkOgPreview | null> {
  if (!isSafePublicHttpUrl(rawUrl)) return null;

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(target.href, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent": "CINSLinkPreview/1.0 (+https://cins.vn)",
      },
    });

    if (!res.ok) return null;

    // Sau redirect — kiểm tra lại host cuối (SSRF).
    if (!isSafePublicHttpUrl(res.url || target.href)) return null;

    const ctype = (res.headers.get("content-type") || "").toLowerCase();
    if (ctype && !ctype.includes("text/html") && !ctype.includes("application/xhtml")) {
      return null;
    }

    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
    return parseOgFromHtml(html, res.url || target.href);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
