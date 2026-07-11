import { stripArticleWrapper } from "@/lib/article/blocks/compile-html";
import { newComposeBlockId } from "@/lib/article/compose/id";
import type {
  ArticleComposeBlock,
  ArticleComposeBlockType,
} from "@/lib/article/compose/types";

/** Khối arc chuyên biệt — bỏ qua khi parse (không hiện trong compose). */
const ARC_SKIP_CLASS =
  /\b(arc-skill-grid|arc-accordion|arc-path|arc-infobox|arc-lead)\b/i;

function textContent(el: Element): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

function headingText(el: Element): string {
  const body = el.querySelector(".arc-heading-body");
  if (body) return textContent(body);
  return textContent(el);
}

function parseListItems(el: Element): string[] {
  return Array.from(el.querySelectorAll(":scope > li"))
    .map((li) => textContent(li))
    .filter(Boolean);
}

function parseTableRows(el: HTMLTableElement): {
  rows: string[][];
  header: boolean;
} {
  const rows: string[][] = [];
  let header = false;

  const thead = el.querySelector("thead");
  if (thead) {
    header = true;
    for (const tr of Array.from(thead.querySelectorAll("tr"))) {
      rows.push(
        Array.from(tr.querySelectorAll("th, td")).map((cell) =>
          textContent(cell),
        ),
      );
    }
  }

  const bodyRows = el.querySelector("tbody")
    ? Array.from(el.querySelector("tbody")!.querySelectorAll("tr"))
    : Array.from(el.querySelectorAll(":scope > tr"));

  for (const tr of bodyRows) {
    if (thead && tr.closest("thead")) continue;
    rows.push(
      Array.from(tr.querySelectorAll("th, td")).map((cell) => textContent(cell)),
    );
    if (!thead && rows.length === 1 && tr.querySelector("th")) {
      header = true;
    }
  }

  return { rows: rows.length ? rows : [[""]], header };
}

function shouldSkipElement(el: Element): boolean {
  const cls = el.getAttribute("class") ?? "";
  return ARC_SKIP_CLASS.test(cls);
}

function blockFromElement(el: Element): ArticleComposeBlock[] {
  const id = newComposeBlockId();
  const tag = el.tagName.toLowerCase();

  if (shouldSkipElement(el)) {
    return [];
  }

  if (tag === "section" && /\barc-section\b/i.test(el.className)) {
    return Array.from(el.children).flatMap(blockFromElement);
  }

  if (tag === "div" && /\barc-job-item\b/i.test(el.className)) {
    const blocks: ArticleComposeBlock[] = [];
    const h3 = el.querySelector("h3");
    const p = el.querySelector("p");
    if (h3) {
      blocks.push({
        id: newComposeBlockId(),
        t: "h3",
        text: headingText(h3),
      });
    }
    if (p) {
      blocks.push({
        id: newComposeBlockId(),
        t: "body",
        text: textContent(p),
      });
    }
    return blocks;
  }

  if (tag === "h2") {
    return [{ id, t: "h2", text: headingText(el) }];
  }
  if (tag === "h3") {
    return [{ id, t: "h3", text: headingText(el) }];
  }
  if (tag === "p") {
    const t = textContent(el);
    if (!t) return [];
    return [{ id, t: "body", text: t }];
  }
  if (tag === "blockquote") {
    return [{ id, t: "quote", text: textContent(el) }];
  }
  if (tag === "ul") {
    const items = parseListItems(el);
    return [{ id, t: "list-ul", items: items.length ? items : [""] }];
  }
  if (tag === "ol") {
    const items = parseListItems(el);
    return [{ id, t: "list-ol", items: items.length ? items : [""] }];
  }
  if (tag === "table") {
    const { rows, header } = parseTableRows(el as HTMLTableElement);
    return [{ id, t: "table", tableRows: rows, tableHeader: header }];
  }
  if (tag === "hr" && /\brich-divider\b/i.test(el.className)) {
    const style = el.getAttribute("style") ?? "";
    const lenMatch = style.match(/width:\s*(\d+)%/i);
    const thick = /\brich-divider-thin\b/i.test(el.className)
      ? "thin"
      : /\brich-divider-thick\b/i.test(el.className)
        ? "thick"
        : "med";
    return [
      {
        id,
        t: "divider",
        dividerLen: lenMatch ? Number(lenMatch[1]) : 8,
        dividerThick: thick,
      },
    ];
  }
  if (tag === "div" && /\brich-spacer\b/i.test(el.className)) {
    const sizeMatch = el.className.match(/\brich-spacer-([sml])\b/i);
    const size = (sizeMatch?.[1] as "s" | "m" | "l" | undefined) ?? "m";
    return [{ id, t: "spacer", size }];
  }
  if (tag === "figure" && /\brich-imgs\b/i.test(el.className)) {
    const cap = el.querySelector(".rich-img-cap");
    const imgs = Array.from(el.querySelectorAll("img"))
      .map((img) => img.getAttribute("alt") ?? "")
      .join(", ");
    return [
      {
        id,
        t: "imgs",
        imgLabel: "Ảnh",
        imgKeywords: imgs,
        imgCaption: cap ? textContent(cap) : "",
      },
    ];
  }
  if (
    tag === "div" &&
    /\b(arc-image-block|arc-image-placeholder)\b/i.test(el.className)
  ) {
    const label = el.querySelector(".arc-img-hint-label");
    const kw = el.querySelector(".arc-img-hint-kw");
    const cap = el.querySelector(".arc-image-caption");
    return [
      {
        id,
        t: "imgs",
        imgLabel: label ? textContent(label) : "Gợi ý tìm ảnh",
        imgKeywords: kw ? textContent(kw) : "",
        imgCaption: cap ? textContent(cap) : "",
      },
    ];
  }
  if (tag === "div" && /\brich-embed\b/i.test(el.className)) {
    const iframe = el.querySelector("iframe");
    const link = el.querySelector("a");
    const url =
      iframe?.getAttribute("src") ??
      el.getAttribute("data-rive-src") ??
      link?.getAttribute("href") ??
      "";
    return [{ id, t: "embed", embedUrl: url }];
  }

  const inner = textContent(el);
  if (inner) {
    return [{ id, t: "body", text: inner }];
  }
  return [];
}

function parseHtmlDocument(html: string): ArticleComposeBlock[] {
  const stripped = stripArticleWrapper(html.trim());
  if (!stripped) return [];

  if (typeof DOMParser === "undefined") {
    return [{ id: newComposeBlockId(), t: "body", text: stripped }];
  }

  const doc = new DOMParser().parseFromString(
    `<div id="compose-root">${stripped}</div>`,
    "text/html",
  );
  const root = doc.getElementById("compose-root");
  if (!root) return [];

  const blocks: ArticleComposeBlock[] = [];
  for (const child of Array.from(root.children)) {
    blocks.push(...blockFromElement(child));
  }
  return blocks;
}

/** Parse HTML `noi_dung` → block list cho compose editor. */
export function parseComposeHtmlToBlocks(html: string): ArticleComposeBlock[] {
  const blocks = parseHtmlDocument(html);
  return blocks.length > 0 ? blocks : [];
}

export type { ArticleComposeBlockType };
