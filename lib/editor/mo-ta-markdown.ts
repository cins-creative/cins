import {
  createElement,
  Fragment,
  type ReactNode,
} from "react";

/**
 * Subset Markdown an toàn cho `mo_ta` / caption Journey.
 * Autolink URL http(s); không hỗ trợ `[text](url)`, heading, code fence, HTML raw.
 */

/** http(s) trong plain text — không khớp scheme nguy hiểm. */
const MOTA_URL_RE = /https?:\/\/[^\s<>"'`]+/gi;

function splitTrailingUrlJunk(matched: string): {
  href: string;
  trailing: string;
} {
  let href = matched;
  let trailing = "";
  while (href.length > 0) {
    const last = href[href.length - 1]!;
    if (!".,;:!?)]}>'\"".includes(last)) break;
    if (last === ")") {
      const opens = (href.match(/\(/g) ?? []).length;
      const closes = (href.match(/\)/g) ?? []).length;
      if (opens >= closes) break;
    }
    trailing = last + trailing;
    href = href.slice(0, -1);
  }
  return { href, trailing };
}

function isSafeHttpUrl(href: string): boolean {
  try {
    const u = new URL(href);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function linkifyToNodes(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = new RegExp(MOTA_URL_RE.source, "gi");
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(text)) !== null) {
    const raw = m[0]!;
    const { href, trailing } = splitTrailingUrlJunk(raw);
    if (m.index > last) {
      nodes.push(text.slice(last, m.index));
    }
    if (href && isSafeHttpUrl(href)) {
      nodes.push(
        createElement(
          "a",
          {
            key: `${keyPrefix}-a${i++}`,
            href,
            className: "mota-md-a",
            target: "_blank",
            rel: "noopener noreferrer",
          },
          href,
        ),
      );
      if (trailing) nodes.push(trailing);
    } else {
      nodes.push(raw);
    }
    last = m.index + raw.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  if (nodes.length === 0 && text.length > 0) nodes.push(text);
  return nodes;
}

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] ?? ch);
}

/** Gỡ marker markdown → plain text (collapse / aria / title). */
export function stripMoTaMarkdown(text: string): string {
  if (!text) return "";
  let out = text;
  out = out.replace(/~~([^~\n]+)~~/g, "$1");
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "$1");
  // italic *...* — tránh khớp **
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1$2");
  out = out.replace(/(^|[^A-Za-z0-9_])_([^_\n]+)_(?![A-Za-z0-9_])/g, "$1$2");
  out = out.replace(/^\s*[-*]\s+/gm, "");
  out = out.replace(/^\s*\d+\.\s+/gm, "");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

type InlinePart =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "s"; text: string };

function parseInline(raw: string): InlinePart[] {
  const parts: InlinePart[] = [];
  // Thứ tự: strike → bold → *italic* → _italic_
  const re =
    /~~([^~\n]+?)~~|\*\*([^*\n]+?)\*\*|\*([^*\n]+?)\*|_([^_\n]+?)_/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      parts.push({ kind: "text", text: raw.slice(last, m.index) });
    }
    if (m[1] != null) parts.push({ kind: "s", text: m[1] });
    else if (m[2] != null) parts.push({ kind: "strong", text: m[2] });
    else if (m[3] != null) parts.push({ kind: "em", text: m[3] });
    else if (m[4] != null) parts.push({ kind: "em", text: m[4] });
    last = m.index + m[0].length;
  }
  if (last < raw.length) {
    parts.push({ kind: "text", text: raw.slice(last) });
  }
  if (parts.length === 0 && raw.length > 0) {
    parts.push({ kind: "text", text: raw });
  }
  return parts;
}

function inlineToNodes(parts: InlinePart[], keyPrefix: string): ReactNode[] {
  return parts.flatMap((p, i) => {
    const key = `${keyPrefix}-${i}`;
    if (p.kind === "text") {
      return linkifyToNodes(p.text, key);
    }
    const children = linkifyToNodes(p.text, `${key}-c`);
    if (p.kind === "strong") {
      return [createElement("strong", { key }, ...children)];
    }
    if (p.kind === "em") {
      return [createElement("em", { key }, ...children)];
    }
    return [createElement("s", { key }, ...children)];
  });
}

/**
 * Highlight 1:1 với textarea — giữ đủ ký tự (kể cả `**` / `*` / `~~`)
 * để caret/wrap khớp; caller ẩn `.ed-md-mark` bằng CSS.
 */
export function renderMoTaMarkdownHighlight(text: string): ReactNode {
  if (!text) return null;

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];

  lines.forEach((line, li) => {
    if (li > 0) nodes.push("\n");
    nodes.push(...inlineHighlightWithMarks(line, `hl-${li}`));
  });

  return createElement(Fragment, null, ...nodes);
}

function inlineHighlightWithMarks(
  raw: string,
  keyPrefix: string,
): ReactNode[] {
  const re =
    /~~([^~\n]+?)~~|\*\*([^*\n]+?)\*\*|\*([^*\n]+?)\*|_([^_\n]+?)_/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  const pushMark = (mark: string) => {
    nodes.push(
      createElement(
        "span",
        { key: `${keyPrefix}-m${i++}`, className: "ed-md-mark", "aria-hidden": true },
        mark,
      ),
    );
  };

  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      nodes.push(raw.slice(last, m.index));
    }
    if (m[1] != null) {
      pushMark("~~");
      nodes.push(createElement("s", { key: `${keyPrefix}-s${i++}` }, m[1]));
      pushMark("~~");
    } else if (m[2] != null) {
      pushMark("**");
      nodes.push(
        createElement("strong", { key: `${keyPrefix}-b${i++}` }, m[2]),
      );
      pushMark("**");
    } else if (m[3] != null) {
      pushMark("*");
      nodes.push(createElement("em", { key: `${keyPrefix}-e${i++}` }, m[3]));
      pushMark("*");
    } else if (m[4] != null) {
      pushMark("_");
      nodes.push(createElement("em", { key: `${keyPrefix}-e${i++}` }, m[4]));
      pushMark("_");
    }
    last = m.index + m[0].length;
  }
  if (last < raw.length) nodes.push(raw.slice(last));
  if (nodes.length === 0 && raw.length > 0) nodes.push(raw);
  return nodes;
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const ulMatch = /^[-*]\s+(.*)$/.exec(line);
    if (ulMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = /^[-*]\s+(.*)$/.exec(lines[i]!);
        if (!m) break;
        items.push(m[1]!);
        i += 1;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    const olMatch = /^\d+\.\s+(.*)$/.exec(line);
    if (olMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = /^\d+\.\s+(.*)$/.exec(lines[i]!);
        if (!m) break;
        items.push(m[1]!);
        i += 1;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i]!;
      if (!l.trim()) break;
      if (/^[-*]\s+/.test(l) || /^\d+\.\s+/.test(l)) break;
      paraLines.push(l);
      i += 1;
    }
    blocks.push({ kind: "p", lines: paraLines });
  }

  return blocks;
}

/** React nodes an toàn — text luôn là string (không HTML raw). */
export function renderMoTaMarkdownToReactNodes(text: string): ReactNode {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const blocks = parseBlocks(trimmed);
  if (blocks.length === 0) return null;

  // Một đoạn đơn giản → chỉ nodes inline (giữ `.jcard-desc` là <p>)
  if (blocks.length === 1 && blocks[0]!.kind === "p") {
    const lines = blocks[0]!.lines;
    const nodes: ReactNode[] = [];
    lines.forEach((line, li) => {
      if (li > 0) nodes.push(createElement("br", { key: `br-${li}` }));
      nodes.push(
        ...inlineToNodes(parseInline(line), `p0-l${li}`),
      );
    });
    return createElement(Fragment, null, ...nodes);
  }

  return createElement(
    Fragment,
    null,
    ...blocks.map((block, bi) => {
      if (block.kind === "p") {
        const children: ReactNode[] = [];
        block.lines.forEach((line, li) => {
          if (li > 0) children.push(createElement("br", { key: `p${bi}-br${li}` }));
          children.push(...inlineToNodes(parseInline(line), `p${bi}-l${li}`));
        });
        return createElement(
          "span",
          { key: `blk-${bi}`, className: "mota-md-p" },
          ...children,
        );
      }
      if (block.kind === "ul") {
        return createElement(
          "ul",
          { key: `blk-${bi}`, className: "mota-md-ul" },
          ...block.items.map((item, ii) =>
            createElement(
              "li",
              { key: `ul-${bi}-${ii}` },
              ...inlineToNodes(parseInline(item), `ul${bi}-${ii}`),
            ),
          ),
        );
      }
      return createElement(
        "ol",
        { key: `blk-${bi}`, className: "mota-md-ol" },
        ...block.items.map((item, ii) =>
          createElement(
            "li",
            { key: `ol-${bi}-${ii}` },
            ...inlineToNodes(parseInline(item), `ol${bi}-${ii}`),
          ),
        ),
      );
    }),
  );
}
