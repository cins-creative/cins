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
   ║ Embed URL: whitelist Tier 1 + Behance (lib/editor/embed-providers). ║
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
import {
  buildEmbedIframeSrc,
  classifyEmbedUrl,
  embedIframeAllowAttr,
  embedIframeTitle,
} from "@/lib/editor/embed-providers";

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

export { classifyEmbedUrl } from "@/lib/editor/embed-providers";

function embedIframeAllow(provider: string): string {
  const allow = embedIframeAllowAttr(provider);
  if (provider === "youtube" || provider === "vimeo") {
    return `allow="${allow}" referrerpolicy="strict-origin-when-cross-origin"`;
  }
  return `allow="${allow}"`;
}

/* Build iframe HTML cho embed. Behance trả về null → caller dùng anchor. */
function buildEmbedIframeHtml(cls: {
  provider: string;
  url: string;
}): string | null {
  const src = buildEmbedIframeSrc(
    cls as Parameters<typeof buildEmbedIframeSrc>[0],
  );
  if (!src) return null;
  const allow = embedIframeAllow(cls.provider);
  const title = embedIframeTitle(cls.provider);
  return `<iframe src="${escapeHtml(src)}" title="${escapeHtml(title)}" ${allow} allowfullscreen loading="lazy"></iframe>`;
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
        if (cls?.provider === "rive-file") {
          parts.push(
            `<div class="rich-embed rich-embed-rive-file" data-provider="rive-file" data-rive-src="${escapeHtml(cls.url)}"></div>`,
          );
          break;
        }
        if (cls?.provider === "lottie-file") {
          parts.push(
            `<div class="rich-embed rich-embed-lottie-file" data-provider="lottie-file" data-lottie-src="${escapeHtml(cls.url)}"></div>`,
          );
          break;
        }
        if (cls) {
          /* YouTube/Figma → iframe thật để render trực tiếp trong HTML cache.
             Behance (không bóc được project ID) fallback anchor link. */
          const iframe = buildEmbedIframeHtml(cls);
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
  // Layout: full / masonry / justified / duo / grid3 / grid4.
  // Layout cũ (grid2, hero, …) được map sang qua normalizeLegacyLayout.
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
      if (t) return t;
    }
  }
  return "";
}

export type { Block, BlockType };
