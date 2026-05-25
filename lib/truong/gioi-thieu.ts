import { stripHtmlToPlainText } from "@/lib/truong/bai-dang-content";

/** Có nội dung hiển thị (bỏ qua `<p></p>`, khoảng trắng). */
export function hasTruongGioiThieuContent(
  html: string | null | undefined,
): boolean {
  if (!html?.trim()) return false;
  return stripHtmlToPlainText(html).length > 0;
}

export function normalizeTruongGioiThieuHtml(
  html: string | null | undefined,
): string | null {
  const trimmed = html?.trim();
  if (!trimmed) return null;
  if (!hasTruongGioiThieuContent(trimmed)) return null;
  return trimmed;
}
