import { getCoverUrl } from "@/lib/articles/cover";

export function parseEditorialImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}

/** URL tuyệt đối hoặc Cloudflare Images id → URL hiển thị. */
export function resolveEditorialImageUrl(src: string): string {
  const s = src.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return getCoverUrl(s) ?? s;
}

/** Gỡ block `.image-break` khỏi HTML intro khi dùng gallery động. */
export function stripImageBreakFromHtml(html: string): string {
  return html
    .replace(
      /<div[^>]*class=["'][^"']*\bimage-break\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
      "",
    )
    .replace(
      /<section[^>]*class=["'][^"']*\bimage-break\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi,
      "",
    );
}
