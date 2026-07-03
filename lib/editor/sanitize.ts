import "server-only";

import { resolveImageSeedUrl } from "@/lib/editor/resolve-image-seed-url";

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
import {
  flattenMosaicCells,
  normalizeLegacyLayout,
} from "@/lib/editor/image-layout";
import {
  buildBunnyEmbedUrl,
  classifyBunnyVideoUrl,
} from "@/lib/bunny/embed";

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

/* Tách video ID YouTube (đồng bộ với `PostRenderer.extractYouTubeId`). */
function extractYouTubeIdSrv(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.replace(/^\/+/, "").split("/")[0];
    return id || null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = u.searchParams.get("v");
    if (v) return v;
    const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/);
    if (m) return m[2];
  }
  return null;
}

/* Build iframe HTML cho embed. Behance trả về null → caller dùng anchor. */
function buildEmbedIframe(cls: {
  provider: "youtube" | "figma" | "behance";
  url: string;
}): string | null {
  if (cls.provider === "youtube") {
    const id = extractYouTubeIdSrv(cls.url);
    if (!id) return null;
    return `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>`;
  }
  if (cls.provider === "figma") {
    const src = `https://www.figma.com/embed?embed_host=cins&url=${encodeURIComponent(cls.url)}`;
    return `<iframe src="${escapeHtml(src)}" title="Figma file" allowfullscreen loading="lazy"></iframe>`;
  }
  return null;
}

/**
 * Render toàn bộ array Block sang HTML để lưu vào `content_tac_pham.noi_dung_html`.
 *
 * Quy ước:
 *   - Wrap toàn bài trong `<div class="article-rich-content">…</div>` để CSS scope
 *     không rò ra ngoài (khớp pattern hiện có cho `article_bai_viet`).
 *   - Block image/embed/palette serialize ra HTML tĩnh, ảnh dùng `<img loading="lazy">`.
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
      case "divider": {
        const lenRaw = (b.config?.len as number | undefined) ?? 8;
        const len = Math.max(5, Math.min(100, lenRaw));
        const thickRaw = b.config?.thick as string | undefined;
        const thick: "thin" | "med" | "thick" =
          thickRaw === "thin" || thickRaw === "thick" ? thickRaw : "med";
        const heightPx = thick === "thin" ? 2 : thick === "thick" ? 6 : 3;
        parts.push(
          `<hr class="rich-divider rich-divider-${thick}" style="width:${len}%;height:${heightPx}px;border:0;background:currentColor;border-radius:${heightPx}px;margin-left:auto;margin-right:auto">`,
        );
        break;
      }
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
        const bunny = classifyBunnyVideoUrl(url ?? "");
        if (bunny) {
          const src = buildBunnyEmbedUrl(bunny.libraryId, bunny.videoId);
          parts.push(
            `<div class="rich-embed rich-embed-iframe" data-provider="bunny"><iframe src="${escapeHtml(src)}" title="Video" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowfullscreen loading="lazy"></iframe></div>`,
          );
          break;
        }
        const cls = classifyEmbedUrl(url);
        if (cls) {
          /* YouTube/Figma → iframe thật để render trực tiếp trong HTML cache.
             Behance (không bóc được project ID) fallback anchor link. */
          const iframe = buildEmbedIframe(cls);
          if (iframe) {
            parts.push(
              `<div class="rich-embed rich-embed-iframe" data-provider="${cls.provider}">${iframe}</div>`,
            );
          } else {
            parts.push(
              `<div class="rich-embed" data-provider="${cls.provider}"><a href="${escapeHtml(cls.url)}" rel="noopener noreferrer" target="_blank">${escapeHtml(cls.url)}</a></div>`,
            );
          }
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
  // Layout: full / masonry / justified / duo / grid2 / grid3 / grid4 / hero.
  // Layout cũ được map sang qua normalizeLegacyLayout.
  const layout = normalizeLegacyLayout(b.config?.layout);
  const rounded = !!b.config?.rounded;
  const cap = (b.config?.cap as string | undefined) || "";

  const capHtml = cap
    ? `<div class="rich-img-cap">${escapeHtml(cap)}</div>`
    : "";

  const rawImgs = Array.isArray(b.config?.imgs)
    ? (b.config.imgs as unknown[]).map((s) => (typeof s === "string" ? s : "")).filter(Boolean)
    : [];
  // Bài cũ dùng mosaic chỉ có `cells` → gom seed ảnh ra thành album.
  const imgs = (rawImgs.length > 0
    ? rawImgs
    : flattenMosaicCells(b.config?.cells)
  ).filter((s) => !/^m-|^extra-/.test(s));

  if (imgs.length === 0) return "";

  const cellsHtml = imgs
    .map((s) => {
      const src = imgSrcForSeed(s);
      return `<div class="rich-img-cell"><img loading="lazy" src="${escapeHtml(src)}" alt=""></div>`;
    })
    .join("");

  return `<figure class="rich-imgs rich-imgs--${layout}${rounded ? " is-rounded" : ""}">${cellsHtml}${capHtml}</figure>`;
}

function imgSrcForSeed(seed: string): string {
  return resolveImageSeedUrl(seed, 1200, 800);
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
