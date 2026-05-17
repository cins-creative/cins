/**
 * Chuẩn hoá HTML skill grid: CMS thường để icon + nhãn dính inline thiếu `.arc-skill-icon-item`.
 */

function escapeLabel(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeSkillGridInner(inner: string): string {
  if (inner.includes("arc-skill-icon-item")) {
    return inner;
  }

  const re =
    /<span\s+class="([^"]*\barc-skill-emoji\b[^"]*)"[^>]*>[\s\S]*?<\/span>/gi;
  const matches = [...inner.matchAll(re)];
  if (matches.length === 0) {
    return inner;
  }

  const parts: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]!;
    const start = m.index ?? 0;
    const fullSpan = m[0]!;
    const endOfText =
      i + 1 < matches.length ? (matches[i + 1]!.index ?? inner.length) : inner.length;
    const textSlice = inner.slice(start + fullSpan.length, endOfText).trim();
    const label = textSlice
      ? `<span class="arc-skill-label">${escapeLabel(textSlice)}</span>`
      : "";
    parts.push(
      `<div class="arc-skill-icon-item">${fullSpan}${label}</div>`,
    );
  }

  return parts.join("\n");
}

function normalizeArcSkillGridDivs(html: string): string {
  return html.replace(
    /<div\s+class="([^"]*\barc-skill-grid\b[^"]*)"[^>]*>([\s\S]*?)<\/div>/gi,
    (_full, _cls, innerRaw: string) => {
      const inner = innerRaw.trim();
      const n = normalizeSkillGridInner(inner);
      return `<div class="arc-skill-grid">${n}</div>`;
    },
  );
}

/** `section.arc-section` có icon nhưng không có `.arc-skill-grid` — bọc phần sau `</h2>` vào grid. */
function wrapOrphanIconsInArcSections(html: string): string {
  return html.replace(
    /<section\s+class="([^"]*\barc-section\b[^"]*)"[^>]*>([\s\S]*?)<\/section>/gi,
    (full, cls: string, body: string) => {
      if (body.includes("arc-skill-grid") || !body.includes("arc-skill-emoji")) {
        return full;
      }

      const h2Match = /<\/h2\s*>/i.exec(body);
      let head: string;
      let tail: string;
      if (h2Match?.index !== undefined) {
        const cut = h2Match.index + h2Match[0].length;
        head = body.slice(0, cut);
        tail = body.slice(cut);
      } else {
        head = "";
        tail = body;
      }

      const normalized = normalizeSkillGridInner(tail.trim());
      if (!normalized.includes("arc-skill-icon-item")) {
        return full;
      }

      return `<section class="${cls}">${head}<div class="arc-skill-grid">${normalized}</div></section>`;
    },
  );
}

/** Gọi sau `transformArcSkillEmojiSpans`, trước inject related jobs. */
export function normalizeArcSkillRichHtml(html: string): string {
  return wrapOrphanIconsInArcSections(normalizeArcSkillGridDivs(html));
}
