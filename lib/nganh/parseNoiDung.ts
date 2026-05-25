import { extractNganhSection, resolveNganhIntroHtml } from "@/lib/nganh/noi-dung-sections";

export type NganhCompareItem = {
  title: string;
  maNganh: string | null;
  /** HTML sau &lt;h3&gt; trong compare-item (p, ul, …). */
  descriptionHtml: string;
};

export type ParsedNganhNoiDung = {
  introHtml: string | null;
  compareItems: NganhCompareItem[];
};

/**
 * Tách H1 hero ngành theo wireframe v4.
 * - `Thiết kế | đồ họa` → lead / em (pipe đơn)
 * - `Thiết kế đồ họa` → `Thiết kế` + `đồ họa` (2 từ cuối khi ≥3 từ)
 * - Một từ → toàn bộ trong em
 */
export function heroTitlePartsVi(title: string): {
  lead: string;
  em: string | null;
} {
  const t = title.trim();
  if (!t) return { lead: "", em: null };

  const pipe = t.indexOf(" | ");
  if (pipe !== -1) {
    const lead = t.slice(0, pipe).trim();
    const em = t.slice(pipe + 3).trim();
    if (em) return { lead, em };
    return { lead: lead || t, em: null };
  }

  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { lead: "", em: parts[0] ?? t };
  }
  if (parts.length === 2) {
    return { lead: parts[0]!, em: parts[1]! };
  }

  const emWordCount = parts.length <= 4 ? 2 : Math.ceil(parts.length / 2);
  const leadWords = parts.slice(0, -emWordCount);
  const emWords = parts.slice(-emWordCount);
  return {
    lead: leadWords.join(" "),
    em: emWords.join(" ") || null,
  };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseTitleAndCode(h3Text: string): { title: string; maNganh: string | null } {
  const m = h3Text.trim().match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (m) return { title: m[1]!.trim(), maNganh: m[2]!.trim() };
  return { title: h3Text.trim(), maNganh: null };
}

function compareItemBodyHtml(block: string): string {
  const h3Match = block.match(/<h3[^>]*>[\s\S]*?<\/h3>/i);
  if (!h3Match) return "";
  const start = block.indexOf(h3Match[0]) + h3Match[0].length;
  return block.slice(start).trim();
}

function parseCompareItems(inner: string): NganhCompareItem[] {
  const items: NganhCompareItem[] = [];
  const re = /<div\s+class=["']compare-item["'][^>]*>([\s\S]*?)<\/div>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    const block = m[1]!;
    const h3 = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1];
    if (!h3) continue;
    const { title, maNganh } = parseTitleAndCode(stripTags(h3));
    items.push({
      title,
      maNganh,
      descriptionHtml: compareItemBodyHtml(block),
    });
  }
  return items;
}

export function parseNganhNoiDung(
  raw: string | null | undefined,
): ParsedNganhNoiDung {
  const html = raw?.trim() ?? "";
  if (!html) {
    return { introHtml: null, compareItems: [] };
  }

  const compareInner = extractNganhSection(html, "sec-compare");

  return {
    introHtml: resolveNganhIntroHtml(html),
    compareItems: compareInner ? parseCompareItems(compareInner) : [],
  };
}

export function heroDescFromArticle(
  moTaNgan: string | null | undefined,
  tomTat: string | null | undefined,
  introHtml: string | null,
): string | null {
  const a = moTaNgan?.trim();
  if (a) return a;
  const b = tomTat?.trim();
  if (b) return b;
  if (!introHtml) return null;
  const firstP = introHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  if (!firstP) return null;
  const text = stripTags(firstP);
  return text.length > 280 ? `${text.slice(0, 277)}…` : text;
}
