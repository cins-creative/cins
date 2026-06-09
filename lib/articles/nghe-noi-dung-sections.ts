import { splitHtmlForChunkedHydrate } from "@/lib/articles/chunked-tiptap-hydrate";

/** Khối dẫn đầu bài nghề — `<section class="arc-intro">`. */
export const ARC_INTRO_RE =
  /<section\s+class=["']arc-intro["'][^>]*>[\s\S]*?<\/section>/i;

/** HTML nhỏ cho tab Soạn thảo inline — tránh parse toàn bộ `noi_dung`. */
export function introHtmlForNgheEditor(fullHtml: string): string {
  const html = fullHtml.trim();
  const intro = html.match(ARC_INTRO_RE)?.[0]?.trim();
  if (intro) return intro;
  const chunks = splitHtmlForChunkedHydrate(html);
  return chunks[0] ?? html;
}

function ensureArcIntroSection(block: string): string {
  const trimmed = block.trim();
  if (!trimmed) return '<section class="arc-intro"></section>';
  if (ARC_INTRO_RE.test(trimmed)) return trimmed;
  return `<section class="arc-intro">\n${trimmed}\n</section>`;
}

/** Ghi intro đã sửa vào `noi_dung`, giữ nguyên các `arc-section` phía sau. */
export function mergeIntroIntoNgheNoiDung(
  introBlock: string,
  fullHtml: string,
): string {
  const section = ensureArcIntroSection(introBlock);
  const html = fullHtml.trim();
  if (ARC_INTRO_RE.test(html)) {
    return html.replace(ARC_INTRO_RE, section);
  }
  const chunks = splitHtmlForChunkedHydrate(html);
  if (chunks.length > 1) {
    const rest = html.slice(chunks[0]!.length).trimStart();
    return rest ? `${section}\n${rest}` : section;
  }
  return section;
}

/** Phần `noi_dung` sau `arc-intro` — hiển thị read-only dưới editor Soạn thảo. */
export function remainderHtmlAfterNgheIntro(fullHtml: string): string | null {
  const html = fullHtml.trim();
  if (!html) return null;
  const intro = introHtmlForNgheEditor(html);
  if (!intro || intro === html) return null;

  const introIdx = html.indexOf(intro);
  if (introIdx >= 0) {
    const rest = html.slice(introIdx + intro.length).trim();
    return rest || null;
  }

  if (ARC_INTRO_RE.test(html)) {
    const rest = html.replace(ARC_INTRO_RE, "").trim();
    return rest || null;
  }

  const chunks = splitHtmlForChunkedHydrate(html);
  if (chunks.length > 1) {
    const rest = html.slice(chunks[0]!.length).trim();
    return rest || null;
  }

  return null;
}

/** Nguồn HTML tab Soạn thảo theo variant. */
export function visualHtmlForEditor(
  fullHtml: string,
  variant: "default" | "nghe-lead-inline" | "truong-inline" | "nganh-admin",
): string {
  if (variant === "nghe-lead-inline") {
    return introHtmlForNgheEditor(fullHtml);
  }
  return fullHtml;
}
