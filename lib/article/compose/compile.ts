import { escapeHtml } from "@/lib/article/blocks/escape";
import { compileImagePlaceholderHtml } from "@/lib/article/blocks/compile-html";
import type { ArticleComposeBlock } from "@/lib/article/compose/types";
import {
  buildBunnyEmbedUrl,
  classifyBunnyVideoUrl,
} from "@/lib/bunny/embed";
import {
  buildEmbedIframeSrc,
  classifyEmbedUrl,
  embedIframeAllowAttr,
} from "@/lib/editor/embed-providers";

function plainToParagraphs(
  text: string,
  tag: "p" | "blockquote" = "p",
): string {
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

function compileListHtml(
  items: string[],
  ordered: boolean,
): string {
  const tag = ordered ? "ol" : "ul";
  const lis = items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  if (!lis) return "";
  return `<${tag} class="arc-list">${lis}</${tag}>`;
}

function compileTableHtml(block: ArticleComposeBlock): string {
  const rows = block.tableRows ?? [];
  if (rows.length === 0) return "";

  const withHeader = block.tableHeader !== false;
  const parts: string[] = ['<table class="arc-table">'];

  if (withHeader && rows.length > 0) {
    const headerCells = rows[0]!
      .map((cell) => `<th>${escapeHtml(cell.trim())}</th>`)
      .join("");
    parts.push(`<thead><tr>${headerCells}</tr></thead>`);
  }

  const bodyRows = withHeader ? rows.slice(1) : rows;
  if (bodyRows.length > 0) {
    parts.push("<tbody>");
    for (const row of bodyRows) {
      const cells = row
        .map((cell) => `<td>${escapeHtml(cell.trim())}</td>`)
        .join("");
      parts.push(`<tr>${cells}</tr>`);
    }
    parts.push("</tbody>");
  }

  parts.push("</table>");
  return parts.join("\n");
}

function embedIframeAllow(provider: string): string {
  const allow = embedIframeAllowAttr(provider);
  if (provider === "youtube" || provider === "vimeo") {
    return `allow="${allow}" referrerpolicy="strict-origin-when-cross-origin"`;
  }
  return `allow="${allow}"`;
}

function compileEmbedHtml(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  const bunny = classifyBunnyVideoUrl(trimmed);
  if (bunny) {
    const src = buildBunnyEmbedUrl(bunny.libraryId, bunny.videoId);
    return `<div class="rich-embed rich-embed-iframe" data-provider="bunny"><iframe src="${escapeHtml(src)}" title="Video" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowfullscreen loading="lazy"></iframe></div>`;
  }

  const cls = classifyEmbedUrl(trimmed);
  if (!cls) return "";

  if (cls.provider === "rive-file") {
    return `<div class="rich-embed rich-embed-rive-file" data-provider="rive-file" data-rive-src="${escapeHtml(cls.url)}"></div>`;
  }

  const src = buildEmbedIframeSrc(cls);
  if (src) {
    const allow = embedIframeAllow(cls.provider);
    return `<div class="rich-embed rich-embed-iframe" data-provider="${cls.provider}"><iframe src="${escapeHtml(src)}" title="Embedded content" ${allow} allowfullscreen loading="lazy"></iframe></div>`;
  }

  return `<div class="rich-embed" data-provider="${cls.provider}"><a href="${escapeHtml(cls.url)}" rel="noopener noreferrer" target="_blank">${escapeHtml(cls.url)}</a></div>`;
}

function compileBlock(block: ArticleComposeBlock): string {
  switch (block.t) {
    case "h2":
      return `<h2>${escapeHtml(block.text?.trim() ?? "")}</h2>`;
    case "h3":
      return `<h3>${escapeHtml(block.text?.trim() ?? "")}</h3>`;
    case "body":
      return plainToParagraphs(block.text ?? "", "p");
    case "quote":
      return plainToParagraphs(block.text ?? "", "blockquote");
    case "list-ul":
      return compileListHtml(block.items ?? [], false);
    case "list-ol":
      return compileListHtml(block.items ?? [], true);
    case "table":
      return compileTableHtml(block);
    case "imgs":
      return compileImagePlaceholderHtml({
        label: block.imgLabel?.trim() || "Gợi ý tìm ảnh",
        keywords: block.imgKeywords?.trim() ?? "",
        wide: false,
      });
    case "embed":
      return compileEmbedHtml(block.embedUrl ?? "");
    case "divider": {
      const lenRaw = block.dividerLen ?? 8;
      const len = Math.max(5, Math.min(100, lenRaw));
      const thick =
        block.dividerThick === "thin" || block.dividerThick === "thick"
          ? block.dividerThick
          : "med";
      const heightPx = thick === "thin" ? 2 : thick === "thick" ? 6 : 3;
      return `<hr class="rich-divider rich-divider-${thick}" style="width:${len}%;height:${heightPx}px;border:0;background:currentColor;border-radius:${heightPx}px;margin-left:auto;margin-right:auto">`;
    }
    case "spacer": {
      const size = block.size === "l" ? "l" : block.size === "s" ? "s" : "m";
      return `<div class="rich-spacer rich-spacer-${size}"></div>`;
    }
    default:
      return "";
  }
}

/** Biên dịch danh sách block → HTML lưu `noi_dung`. */
export function compileComposeBlocksToHtml(
  blocks: ReadonlyArray<ArticleComposeBlock>,
): string {
  const body = blocks.map(compileBlock).filter(Boolean).join("\n");
  if (!body) return "";
  return `<div class="article-rich-content article-content-html">\n${body}\n</div>`;
}
