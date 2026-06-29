/**
 * Vị trí công việc của cộng sự trong một tác phẩm.
 *
 * Cột `content_tac_pham_tac_gia.vai_tro` là `text` (1 giá trị) nên ta lưu nhiều
 * vị trí bằng cách nối qua dấu newline (`\n`). Không dùng `·`/`,` làm separator
 * vì label vị trí (vd. "Thiết kế · UI Designer") đã chứa các ký tự đó.
 *
 * Người được thêm tự quyết vị trí của mình — tối đa {@link MAX_COAUTHOR_POSITIONS}.
 */

export const MAX_COAUTHOR_POSITIONS = 2;

const SEPARATOR = "\n";

/** Tách `vai_tro` thành danh sách vị trí (trim, bỏ rỗng, dedupe, cắt còn tối đa 2). */
export function parseVaiTroPositions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(SEPARATOR)) {
    const value = part.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= MAX_COAUTHOR_POSITIONS) break;
  }
  return out;
}

/** Gộp danh sách vị trí về chuỗi lưu DB (hoặc `null` nếu rỗng). */
export function joinVaiTroPositions(
  positions: ReadonlyArray<string>,
): string | null {
  const cleaned = parseVaiTroPositions(positions.join(SEPARATOR));
  return cleaned.length ? cleaned.join(SEPARATOR) : null;
}
