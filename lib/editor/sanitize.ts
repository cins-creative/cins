import "server-only";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ Editor sanitize + serialize.                                     ║
   ║                                                                  ║
   ║ Vì textarea-based editor (KHÔNG rich text contenteditable), text ║
   ║ blocks là PLAIN TEXT — không có HTML input từ user → không cần   ║
   ║ DOMPurify nặng nề. Ta:                                           ║
   ║   - escape `<>&"'` của plain text                                ║
   ║   - convert paragraph break (\\n\\n) → <p>                       ║
   ║   - convert single \\n → <br>                                    ║
   ║                                                                  ║
   ║ Embed URL: chỉ whitelist domain youtube / figma / behance.       ║
   ║ Image block: lưu seed/cloudflare_id, không nhúng HTML thô.       ║
   ╚══════════════════════════════════════════════════════════════════╝ */

import type { Block, BlockType } from "@/lib/editor/types";

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] || c);
}

/** Plain text → HTML đoạn (\\n\\n thành paragraph mới, \\n đơn thành <br>). */
function plainToParagraphs(text: string, tag: "p" | "blockquote" = "p"): string {
  const parts = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  return parts
    .map((p) => {
      const inner = escapeHtml(p).replace(/\n/g, "<br>");
      return `<${tag}>${inner}</${tag}>`;
    })
    .join("\n");
}

const EMBED_DOMAINS: Array<{
  host: RegExp;
  provider: "youtube" | "figma" | "behance";
}> = [
  { host: /^(www\.)?(youtube\.com|youtu\.be)$/i, provider: "youtube" },
  { host: /^(www\.)?figma\.com$/i, provider: "figma" },
  { host: /^(www\.)?behance\.net$/i, provider: "behance" },
];

export function classifyEmbedUrl(
  rawUrl: string | undefined,
): { provider: "youtube" | "figma" | "behance"; url: string } | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  for (const e of EMBED_DOMAINS) {
    if (e.host.test(parsed.host)) {
      return { provider: e.provider, url: parsed.toString() };
    }
  }
  return null;
}

/**
 * Render toàn bộ array Block sang HTML để lưu vào `content_tac_pham.noi_dung_html`.
 *
 * Quy ước:
 *   - Wrap toàn bài trong `<div class="article-rich-content">…</div>` để CSS scope
 *     không rò ra ngoài (khớp pattern hiện có cho `article_bai_viet`).
 *   - Block image/embed/palette/mosaic serialize ra HTML tĩnh, ảnh dùng `<img loading="lazy">`.
 *     Khi sang Cloudflare Images sẽ thay src qua `imagedelivery.net` (chỉ đổi src builder
 *     trong `imgSrcForSeed`, layout không đổi).
 *   - Sanitize: text blocks là plain text (đã escape), KHÔNG nhúng HTML thô từ user.
 */
export function blocksToHtml(blocks: ReadonlyArray<Block>): string {
  const parts: string[] = [];

  for (const b of blocks) {
    switch (b.loai) {
      case "h2":
        parts.push(`<h2>${escapeHtml(getText(b))}</h2>`);
        break;
      case "h3":
        parts.push(`<h3>${escapeHtml(getText(b))}</h3>`);
        break;
      case "body":
        parts.push(plainToParagraphs(getText(b), "p"));
        break;
      case "quote":
        parts.push(plainToParagraphs(getText(b), "blockquote"));
        break;
      case "divider":
        parts.push("<hr>");
        break;
      case "spacer": {
        const size = (b.config?.size as string) || "m";
        parts.push(`<div class="rich-spacer rich-spacer-${size}"></div>`);
        break;
      }
      case "palette": {
        const colors = (b.config?.colors as string[] | undefined) || [];
        const swatches = colors
          .filter((c) => /^#[0-9a-fA-F]{3,8}$/.test(c))
          .map(
            (c) =>
              `<span class="rich-swatch" style="background:${escapeHtml(c)}"><span>${escapeHtml(c)}</span></span>`,
          )
          .join("");
        parts.push(`<div class="rich-palette">${swatches}</div>`);
        break;
      }
      case "imgs": {
        parts.push(renderImgsBlock(b));
        break;
      }
      case "embed": {
        const url = b.config?.url as string | undefined;
        const cls = classifyEmbedUrl(url);
        if (cls) {
          parts.push(
            `<div class="rich-embed" data-provider="${cls.provider}"><a href="${escapeHtml(cls.url)}" rel="noopener noreferrer" target="_blank">${escapeHtml(cls.url)}</a></div>`,
          );
        }
        break;
      }
      default:
        break;
    }
  }

  return `<div class="article-rich-content">${parts.join("\n")}</div>`;
}

function getText(b: Block): string {
  return (b.config?.html as string | undefined)?.toString() || "";
}

function renderImgsBlock(b: Block): string {
  const layout = (b.config?.layout as string) || "full";
  const rounded = !!b.config?.rounded;
  const cap = (b.config?.cap as string | undefined) || "";
  const imgs = (b.config?.imgs as string[] | undefined) || [];

  if (imgs.length === 0) return "";

  const cellsHtml = imgs
    .map((s) => {
      const src = imgSrcForSeed(s);
      return `<div class="rich-img-cell"><img loading="lazy" src="${escapeHtml(src)}" alt=""></div>`;
    })
    .join("");

  const capHtml = cap
    ? `<div class="rich-img-cap">${escapeHtml(cap)}</div>`
    : "";

  return `<figure class="rich-imgs rich-imgs--${escapeHtml(layout)}${rounded ? " is-rounded" : ""}">${cellsHtml}${capHtml}</figure>`;
}

/**
 * Build src từ seed.
 *
 * - Seed picsum (placeholder lượt này): `https://picsum.photos/seed/{seed}/1200/800`.
 * - Khi tích hợp Cloudflare Images (lượt sau): nếu seed match Cloudflare id
 *   pattern → trả về `https://imagedelivery.net/{ACCOUNT_HASH}/{seed}/public`.
 *
 * Toàn bộ link đi qua hàm này → đổi 1 chỗ là cả site sync.
 */
function imgSrcForSeed(seed: string): string {
  const trimmed = String(seed || "").trim();
  if (!trimmed) return "";
  return `https://picsum.photos/seed/${encodeURIComponent(trimmed)}/1200/800`;
}

/** Cắt mo_ta (description) tự động từ block đầu nếu user không nhập. */
export function deriveMoTaFallback(blocks: ReadonlyArray<Block>): string {
  for (const b of blocks) {
    if (b.loai === "body" || b.loai === "h2" || b.loai === "h3") {
      const t = getText(b).trim();
      if (t) return t.slice(0, 280);
    }
  }
  return "";
}

export type { Block, BlockType };
