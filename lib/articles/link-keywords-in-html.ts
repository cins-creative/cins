import type {
  KeywordLinkEntry,
  LinkKeywordsOptions,
} from "@/lib/articles/keyword-link-types";

const SKIP_TAG = new Set([
  "a",
  "code",
  "pre",
  "script",
  "style",
  "noscript",
  "kbd",
  "svg",
]);

const MIN_PHRASE_LEN = 2;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPhraseBoundary(text: string, start: number, end: number): boolean {
  const before = start > 0 ? text[start - 1]! : "";
  const after = end < text.length ? text[end]! : "";
  const beforeOk = start === 0 || !/[\p{L}\p{N}]/u.test(before);
  const afterOk = end === text.length || !/[\p{L}\p{N}]/u.test(after);
  return beforeOk && afterOk;
}

type HtmlPart = { type: "tag" | "text"; value: string };

function splitHtmlParts(html: string): HtmlPart[] {
  const parts: HtmlPart[] = [];
  const re = /<[^>]+>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m.index > last) {
      parts.push({ type: "text", value: html.slice(last, m.index) });
    }
    parts.push({ type: "tag", value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < html.length) {
    parts.push({ type: "text", value: html.slice(last) });
  }
  return parts;
}

function tagName(openTag: string): string {
  const m = openTag.match(/^<\/?\s*([a-z0-9]+)/i);
  return m?.[1]?.toLowerCase() ?? "";
}

function isClosingTag(tag: string): boolean {
  return /^<\//.test(tag);
}

function isSelfClosing(tag: string): boolean {
  return /\/>$/.test(tag) || /^<(br|hr|img|meta|link|input|source)\b/i.test(tag);
}

type Match = {
  start: number;
  end: number;
  entry: KeywordLinkEntry;
  text: string;
};

type PhraseRef = { phrase: string; entry: KeywordLinkEntry };

function buildPhraseRefs(entries: KeywordLinkEntry[]): PhraseRef[] {
  const refs: PhraseRef[] = [];
  for (const entry of entries) {
    for (const phrase of entry.phrases) {
      if (phrase.length < MIN_PHRASE_LEN) continue;
      refs.push({ phrase, entry });
    }
  }
  refs.sort((a, b) => b.phrase.length - a.phrase.length);
  return refs;
}

function findMatchesInText(
  text: string,
  phraseRefs: PhraseRef[],
  options: LinkKeywordsOptions,
): Match[] {
  const matches: Match[] = [];
  const slugCounts = new Map<string, number>();
  const maxPer = options.maxPerSlug;
  const unlimited = maxPer == null || maxPer <= 0;

  for (const { phrase, entry } of phraseRefs) {
    if (options.excludeSlug && entry.slug === options.excludeSlug) continue;
    const re = new RegExp(escapeRegExp(phrase), "giu");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const start = m.index;
      const end = start + m[0].length;
      if (!isPhraseBoundary(text, start, end)) continue;
      const count = slugCounts.get(entry.slug) ?? 0;
      if (!unlimited && count >= maxPer) break;
      matches.push({
        start,
        end,
        entry,
        text: m[0],
      });
      slugCounts.set(entry.slug, count + 1);
    }
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end - (a.end - a.start));

  const accepted: Match[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start < cursor) continue;
    accepted.push(m);
    cursor = m.end;
  }
  return accepted;
}

function wrapMatch(m: Match): string {
  const e = m.entry;
  const summary = e.summary?.replace(/"/g, "&quot;") ?? "";
  const thumb = e.thumbUrl?.replace(/"/g, "&quot;") ?? "";
  const title = e.title.replace(/"/g, "&quot;");
  const attrs =
    `data-kw-slug="${e.slug}" data-kw-href="${e.href}"` +
    ` data-kw-title="${title}" data-kw-summary="${summary}"` +
    ` data-kw-thumb="${thumb}"`;
  return (
    `<span class="kw-inline" ${attrs}>` +
    `<span class="kw-inline-mark" ${attrs}>${m.text}</span></span>`
  );
}

function linkTextSegment(
  text: string,
  phraseRefs: PhraseRef[],
  options: LinkKeywordsOptions,
): string {
  const matches = findMatchesInText(text, phraseRefs, options);
  if (!matches.length) return text;
  let out = "";
  let pos = 0;
  for (const m of matches) {
    out += text.slice(pos, m.start);
    out += wrapMatch(m);
    pos = m.end;
  }
  out += text.slice(pos);
  return out;
}

/** Gắn mark keyword — khớp không phân biệt hoa thường; gồm cả heading (h1–h6). */
export function linkKeywordsInHtml(
  html: string,
  entries: KeywordLinkEntry[],
  options: LinkKeywordsOptions = {},
): string {
  if (!html.trim() || !entries.length) return html;

  const phraseRefs = buildPhraseRefs(entries);
  if (!phraseRefs.length) return html;

  const parts = splitHtmlParts(html);
  const stack: string[] = [];
  const out: string[] = [];

  for (const part of parts) {
    if (part.type === "tag") {
      const name = tagName(part.value);
      if (!isClosingTag(part.value)) {
        if (!isSelfClosing(part.value)) stack.push(name);
      } else if (stack.length) {
        stack.pop();
      }
      out.push(part.value);
      continue;
    }

    const skip = stack.some((t) => SKIP_TAG.has(t));
    out.push(
      skip ? part.value : linkTextSegment(part.value, phraseRefs, options),
    );
  }

  return out.join("");
}

export function collectLinkedSlugs(html: string): Set<string> {
  const slugs = new Set<string>();
  for (const m of html.matchAll(/data-kw-slug="([^"]+)"/g)) {
    slugs.add(m[1]!);
  }
  return slugs;
}

export function injectKeywordThumbsInHtml(
  html: string,
  entriesBySlug: Map<string, KeywordLinkEntry>,
): string {
  let out = html;
  for (const [slug, entry] of entriesBySlug) {
    if (!entry.thumbUrl) continue;
    const thumb = entry.thumbUrl.replace(/"/g, "&quot;");
    const re = new RegExp(
      `(data-kw-slug="${escapeRegExp(slug)}"[^>]*data-kw-thumb=")([^"]*)(")`,
      "g",
    );
    out = out.replace(re, `$1${thumb}$3`);
  }
  return out;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** @deprecated Không lọc nữa — trả về toàn bộ index (tương thích import cũ / cache dev). */
export function filterKeywordEntriesInPlainText(
  entries: KeywordLinkEntry[],
  _plainText?: string,
): KeywordLinkEntry[] {
  return entries;
}
