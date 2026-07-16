/**
 * Chuẩn hoá HTML bài viết CMS (arc-h2, arc-section, placeholder ảnh) trước khi render lead.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripTags(inner: string): string {
  return inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function arcImagePlaceholderHtml(
  label: string,
  kw: string,
  wide = false,
): string {
  const w = wide ? " arc-image-placeholder--wide" : "";
  return `<div class="arc-image-block arc-image-single"><div class="arc-image-placeholder${w}"><span class="arc-img-hint-label">${escapeHtml(label)}</span><span class="arc-img-hint-kw">${escapeHtml(kw || "\u00a0")}</span></div></div>`;
}

function parsePlaceholderPlainText(text: string): { label: string; kw: string } {
  const t = text.replace(/\s+/g, " ").trim();
  const goiY = t.match(/^(GỢI\s*Ý\s*TÌM\s*ẢNH|GOI\s*Y\s*TIM\s*ANH)/i);
  if (goiY) {
    let rest = t.slice(goiY[0].length).trim();
    rest = rest.replace(/^["'""]|["'""]$/g, "").trim();
    return { label: "Gợi ý tìm ảnh", kw: rest || "\u00a0" };
  }
  const quoted = t.match(/["'""]([^"'""]+)["'""]/);
  if (quoted) return { label: "Gợi ý tìm ảnh", kw: quoted[1]!.trim() };
  if (/^minh\s*hoa/i.test(t)) {
    const rest = t.replace(/^minh\s*hoa\s*/i, "").trim();
    return { label: "Minh họa", kw: rest || "\u00a0" };
  }
  return { label: "Minh họa", kw: t || "\u00a0" };
}

/** Placeholder CMS đã có class nhưng thiếu `span.arc-img-hint-*` (chỉ text thô). */
export function restructureArcImagePlaceholders(html: string): string {
  return html.replace(
    /<div([^>]*)\barc-image-placeholder\b([^>]*)>([\s\S]*?)<\/div>/gi,
    (full, a1, a2, inner) => {
      if (/\barc-img-hint-label\b/i.test(inner)) return full;
      const wide = /\barc-image-placeholder--wide\b/i.test(`${a1}${a2}`);
      const { label, kw } = parsePlaceholderPlainText(stripTags(inner) || inner);
      const phClass = `arc-image-placeholder${wide ? " arc-image-placeholder--wide" : ""}`;
      return `<div class="${phClass}"><span class="arc-img-hint-label">${escapeHtml(label)}</span><span class="arc-img-hint-kw">${escapeHtml(kw)}</span></div>`;
    },
  );
}

/** Bọc placeholder lẻ trong `arc-image-block arc-image-single`. */
export function wrapArcImageBlocks(html: string): string {
  return html.replace(
    /<div class="arc-image-placeholder[\s\S]*?<\/div>/gi,
    (match, offset, entire) => {
      const before = entire.slice(Math.max(0, offset - 500), offset);
      if (/<div[^>]*\barc-image-block\b[^>]*>\s*$/i.test(before)) {
        return match;
      }
      return `<div class="arc-image-block arc-image-single">${match}</div>`;
    },
  );
}

function isImageHintMarkdownBlock(text: string): boolean {
  const t = text.trim();
  return (
    /^(GỢI\s*Ý\s*TÌM\s*ẢNH|GOI\s*Y\s*TIM\s*ANH)/i.test(t) ||
    /^!\[[^\]]*\]\([^)]+\)/.test(t) ||
    /^\[IMAGE:/i.test(t) ||
    (/^["'""][^"'""]+["'""]$/m.test(t) && t.length < 200)
  );
}

function parseImageHintMarkdown(text: string): { label: string; kw: string } {
  const t = text.trim();
  const md = t.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
  if (md) {
    return {
      label: md[1]?.trim() || "Gợi ý tìm ảnh",
      kw: md[2]!.trim(),
    };
  }
  return parsePlaceholderPlainText(t);
}

function renderMarkdownBlocks(body: string): string {
  const blocks = body.split(/\n\n+/).filter((b) => b.trim());
  const out: string[] = [];

  for (const block of blocks) {
    const t = block.trim();
    if (!t) continue;

    if (/^###\s+/.test(t)) {
      const title = t.replace(/^###\s+/, "").trim();
      out.push(
        `<h3 class="arc-h3"><span class="arc-heading-body">${escapeHtml(title)}</span></h3>`,
      );
      continue;
    }

    if (isImageHintMarkdownBlock(t)) {
      const { label, kw } = parseImageHintMarkdown(t);
      out.push(arcImagePlaceholderHtml(label, kw));
      continue;
    }

    const lines = t.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (
      lines.length >= 1 &&
      lines.every((l) => /^[-*•]\s+/.test(l) || /^\d+\.\s+/.test(l))
    ) {
      const items = lines
        .map((l) => l.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, ""))
        .map((l) => `<li>${escapeHtml(l)}</li>`)
        .join("");
      out.push(`<ul class="arc-list">${items}</ul>`);
      continue;
    }

    out.push(`<p>${escapeHtml(t).replace(/\n/g, "<br />")}</p>`);
  }

  return out.join("\n");
}

/** Markdown lead → HTML `arc-*` (khi `noi_dung` chưa phải HTML CMS). */
export function markdownToArcLeadHtml(md: string): string {
  const trimmed = md.trim();
  if (!trimmed) return "";

  if (/^##\s+/m.test(trimmed)) {
    const chunks = trimmed.split(/(?=^##\s+)/m).filter((c) => c.trim());
    let section = 0;
    const parts: string[] = [];

    for (const chunk of chunks) {
      const c = chunk.trim();
      if (!c.startsWith("##")) {
        parts.push(renderMarkdownBlocks(c));
        continue;
      }
      section += 1;
      const lines = c.split("\n");
      const title = lines[0]!.replace(/^##\s+/, "").trim();
      const body = lines.slice(1).join("\n").trim();
      parts.push(
        `<section class="arc-section"><h2 class="arc-h2" data-arc-section="${String(section).padStart(2, "0")}"><span class="arc-heading-body">${escapeHtml(title)}</span></h2>${renderMarkdownBlocks(body)}</section>`,
      );
    }
    return parts.join("\n");
  }

  const paras = trimmed.split(/\n\n+/).filter((p) => p.trim());
  const first = paras[0]?.trim() ?? "";
  const useFirstAsTitle =
    first.length > 0 &&
    first.length < 120 &&
    !first.includes("\n\n") &&
    (first.endsWith("?") || first.length < 80);

  if (useFirstAsTitle && paras.length > 1) {
    return `<section class="arc-section"><h2 class="arc-h2" data-arc-section="01"><span class="arc-heading-body">${escapeHtml(first)}</span></h2>${renderMarkdownBlocks(paras.slice(1).join("\n\n"))}</section>`;
  }

  return `<section class="arc-section">${renderMarkdownBlocks(trimmed)}</section>`;
}

/** H2/H3 thường / CMS cũ → `arc-h2` + `data-arc-section` + `.arc-heading-body`. */
export function normalizeArticleRichHeadings(html: string): string {
  let section = 0;

  let out = html.replace(
    /<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi,
    (full, attrs = "", inner: string) => {
      const attr = attrs ?? "";
      if (/\barc-h2\b/i.test(attr)) return full;

      const existing = attr.match(/data-arc-section=["'](\d{2})["']/i)?.[1];
      const num = existing ?? String(++section).padStart(2, "0");
      if (!existing) section = Math.max(section, parseInt(num, 10));

      const body = stripTags(inner) || inner.trim();
      return `<h2 class="arc-h2" data-arc-section="${num}"><span class="arc-heading-body">${body}</span></h2>`;
    },
  );

  out = out.replace(
    /<h3(\s[^>]*)?>([\s\S]*?)<\/h3>/gi,
    (full, attrs = "", inner: string) => {
      const attr = attrs ?? "";
      if (/\barc-h3\b/i.test(attr)) return full;
      const body = stripTags(inner) || inner.trim();
      return `<h3 class="arc-h3"><span class="arc-heading-body">${body}</span></h3>`;
    },
  );

  return out;
}

/** Bọc `<section class="arc-section">` quanh các khối giữa hai `arc-h2` (nếu CMS chưa bọc). */
export function wrapArcSections(html: string): string {
  if (
    html.includes('class="arc-section"') ||
    html.includes("class='arc-section'")
  ) {
    return html;
  }
  if (!/<h2[^>]*\barc-h2\b/i.test(html)) return html;

  const parts = html.split(/(?=<h2[^>]*\barc-h2\b)/i);
  if (parts.length <= 1) return html;

  return parts
    .map((chunk, i) => {
      const t = chunk.trim();
      if (!t) return "";
      if (i === 0 && !/^<h2/i.test(t)) return t;
      return `<section class="arc-section">${t}</section>`;
    })
    .filter(Boolean)
    .join("\n");
}

/** `img` rỗng / khối gợi ý ảnh CMS → `.arc-image-placeholder`. */
export function normalizeArticleImagePlaceholders(html: string): string {
  let out = html.replace(
    /<img([^>]*)\bsrc=["']\s*["']([^>]*)>/gi,
    (_m, a1, a2) => {
      const alt = (a1 + a2).match(/\balt=["']([^"']*)["']/i)?.[1]?.trim();
      const label = alt ? escapeHtml(alt) : "Minh họa";
      return arcImagePlaceholderHtml(label, "\u00a0");
    },
  );

  out = out.replace(
    /<p>(\s*GỢI\s*Ý\s*TÌM\s*ẢNH[\s\S]*?)<\/p>/gi,
    (_full, inner) => {
      const { label, kw } = parsePlaceholderPlainText(stripTags(inner));
      return arcImagePlaceholderHtml(label, kw);
    },
  );

  out = out.replace(
    /<div([^>]*)\bdata-type=["']image-placeholder["']([^>]*)>([\s\S]*?)<\/div>/gi,
    (_full, a1, a2, inner) => {
      if (/\barc-image-placeholder\b/i.test(a1 + a2 + inner)) return _full;
      const { label, kw } = parsePlaceholderPlainText(
        stripTags(inner) ||
          (a1 + a2).match(/\bdata-label=["']([^"']*)["']/i)?.[1]?.trim() ||
          "",
      );
      return arcImagePlaceholderHtml(label, kw);
    },
  );

  return out;
}

/** CMS chỉ có `<p>` đầu là tiêu đề (vd. «Hình họa là gì?») — nâng thành `arc-h2` + `arc-section`. */
function promoteLeadTitleParagraph(html: string): string {
  if (/\barc-h2\b/i.test(html) || /\barc-section\b/i.test(html)) return html;
  const m = html.trim().match(/^<p>([^<]{3,120}?)<\/p>([\s\S]*)$/i);
  if (!m) return html;
  const title = stripTags(m[1]!);
  const rest = m[2]!.trim();
  if (!title || (!title.endsWith("?") && title.length > 80)) return html;
  return `<section class="arc-section"><h2 class="arc-h2" data-arc-section="01"><span class="arc-heading-body">${escapeHtml(title)}</span></h2>${rest}</section>`;
}

function findClosingDivEnd(html: string, contentStart: number): number {
  let depth = 1;
  let i = contentStart;
  while (i < html.length && depth > 0) {
    const open = html.indexOf("<div", i);
    const close = html.indexOf("</div>", i);
    if (close === -1) return -1;
    if (open !== -1 && open < close) {
      depth += 1;
      i = open + 4;
    } else {
      depth -= 1;
      if (depth === 0) return close + 6;
      i = close + 6;
    }
  }
  return -1;
}

/** Gỡ khối `.arc-image-block` không chứa `<img>` thật (chỉ placeholder / caption). */
function removeArcImageBlocksWithoutImg(html: string): string {
  let out = "";
  let cursor = 0;

  while (cursor < html.length) {
    const rel = html.slice(cursor);
    const m = rel.match(/<div[^>]*\barc-image-block\b[^>]*>/i);
    if (!m || m.index === undefined) {
      out += html.slice(cursor);
      break;
    }

    const start = cursor + m.index;
    out += html.slice(cursor, start);
    const openEnd = start + m[0].length;
    const closeEnd = findClosingDivEnd(html, openEnd);
    if (closeEnd === -1) {
      out += html.slice(start);
      break;
    }

    const inner = html.slice(openEnd, closeEnd - 6);
    if (!/<img\b/i.test(inner)) {
      cursor = closeEnd;
    } else {
      out += html.slice(start, closeEnd);
      cursor = closeEnd;
    }
  }

  return out;
}

/**
 * Ẩn khối gợi ý tìm ảnh CMS (`.arc-image-placeholder`) khỏi nội dung đọc công khai.
 * Giữ nguyên trong editor soạn thảo (Tiptap).
 */
export function stripArcImagePlaceholdersFromHtml(html: string): string {
  if (!/\barc-image-placeholder\b/i.test(html)) return html;

  let out = html.replace(
    /<(?:div|motion)[^>]*\barc-image-placeholder\b[^>]*>[\s\S]*?<\/(?:div|motion)>/gi,
    "",
  );

  let prev = "";
  while (prev !== out) {
    prev = out;
    out = removeArcImageBlocksWithoutImg(out);
  }

  return out;
}

export function normalizeArticleRichHtml(html: string): string {
  let out = promoteLeadTitleParagraph(html);
  out = restructureArcImagePlaceholders(out);
  out = normalizeArticleImagePlaceholders(out);
  out = wrapArcImageBlocks(out);
  out = normalizeArticleRichHeadings(out);
  out = wrapArcSections(out);
  return out;
}
