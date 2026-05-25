/** Cấu trúc `noi_dung` ngành: `<section class="sec-intro">` + `<section class="sec-compare">`. */

export const SEC_COMPARE_RE =
  /<section\s+class=["']sec-compare["'][^>]*>[\s\S]*?<\/section>/i;

export const SEC_INTRO_RE =
  /<section\s+class=["']sec-intro["'][^>]*>[\s\S]*?<\/section>/i;

export function extractNganhSection(
  html: string,
  className: "sec-intro" | "sec-compare",
): string | null {
  const re =
    className === "sec-intro"
      ? SEC_INTRO_RE
      : SEC_COMPARE_RE;
  const m = html.match(re);
  if (!m) return null;
  const innerRe = new RegExp(
    `<section\\s+class=["']${className}["'][^>]*>([\\s\\S]*?)</section>`,
    "i",
  );
  return html.match(innerRe)?.[1]?.trim() ?? null;
}

/** HTML intro để soạn trong editor (chỉ phần hiển thị ở `.nct-prose.body`). */
export function introHtmlForEditor(fullHtml: string): string {
  const inner = extractNganhSection(fullHtml, "sec-intro");
  if (inner) return inner;
  return fullHtml.replace(SEC_COMPARE_RE, "").trim();
}

/** Intro cho trang public — có `sec-intro`, hoặc phần còn lại sau khi bỏ `sec-compare`. */
export function resolveNganhIntroHtml(fullHtml: string): string | null {
  const inner = extractNganhSection(fullHtml, "sec-intro");
  if (inner) return inner;
  const rest = fullHtml.replace(SEC_COMPARE_RE, "").trim();
  return rest || null;
}

/** Ghi intro vào `noi_dung`, giữ nguyên `sec-compare` nếu có. */
export function mergeIntroIntoNoiDung(
  introInner: string,
  fullHtml: string,
): string {
  const inner = introInner.trim();
  const section = `<section class="sec-intro">\n${inner}\n</section>`;
  const html = fullHtml.trim();
  if (SEC_INTRO_RE.test(html)) {
    return html.replace(SEC_INTRO_RE, section);
  }
  const compare = html.match(SEC_COMPARE_RE)?.[0];
  return compare ? `${section}\n${compare}` : section;
}
