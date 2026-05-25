import type { NganhCompareItem } from "@/lib/nganh/parseNoiDung";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCompareItemHtml(item: NganhCompareItem): string {
  const title = item.title.trim();
  const code = item.maNganh?.trim();
  const h3 = code
    ? `${escapeHtml(title)} (${escapeHtml(code)})`
    : escapeHtml(title);
  const body = item.descriptionHtml.trim() || "<p></p>";
  return `<div class="compare-item"><h3>${h3}</h3>${body}</div>`;
}

export function buildCompareSectionInner(items: NganhCompareItem[]): string {
  return items.map(buildCompareItemHtml).join("\n");
}

import { SEC_COMPARE_RE } from "@/lib/nganh/noi-dung-sections";

/** Ghi đè hoặc thêm `<section class="sec-compare">` trong `noi_dung`. */
export function mergeCompareIntoNoiDung(
  fullHtml: string,
  items: NganhCompareItem[],
): string {
  const inner = buildCompareSectionInner(items);
  const section = `<section class="sec-compare">\n${inner}\n</section>`;
  const html = fullHtml.trim();
  if (SEC_COMPARE_RE.test(html)) {
    return html.replace(SEC_COMPARE_RE, section);
  }
  return html ? `${html}\n${section}` : section;
}
