/**
 * Thao tác format trên textarea (Markdown wrap / line prefix / insert).
 * Thuần — không đụng DOM; caller tự setSelectionRange sau khi cập nhật value.
 */

export type TextSelection = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

/** Bọc selection bằng `before`/`after`. Không selection → chèn cặp và đặt caret giữa. */
export function applyWrap(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
): TextSelection {
  const s = Math.max(0, Math.min(start, value.length));
  const e = Math.max(s, Math.min(end, value.length));
  const selected = value.slice(s, e);

  if (
    selected.length > 0 &&
    selected.startsWith(before) &&
    selected.endsWith(after) &&
    selected.length >= before.length + after.length
  ) {
    const inner = selected.slice(before.length, selected.length - after.length);
    const next = value.slice(0, s) + inner + value.slice(e);
    return {
      value: next,
      selectionStart: s,
      selectionEnd: s + inner.length,
    };
  }

  if (
    selected.length > 0 &&
    s >= before.length &&
    e + after.length <= value.length &&
    value.slice(s - before.length, s) === before &&
    value.slice(e, e + after.length) === after
  ) {
    const next =
      value.slice(0, s - before.length) + selected + value.slice(e + after.length);
    return {
      value: next,
      selectionStart: s - before.length,
      selectionEnd: s - before.length + selected.length,
    };
  }

  const next = value.slice(0, s) + before + selected + after + value.slice(e);
  if (selected.length === 0) {
    const caret = s + before.length;
    return { value: next, selectionStart: caret, selectionEnd: caret };
  }
  // Chọn phần nội dung (không gồm marker) — khớp UI overlay ẩn `**` / `*` / `~~`.
  return {
    value: next,
    selectionStart: s + before.length,
    selectionEnd: s + before.length + selected.length,
  };
}

function lineRangeForSelection(
  value: string,
  start: number,
  end: number,
): { lineStart: number; lineEnd: number } {
  const s = Math.max(0, Math.min(start, value.length));
  let e = Math.max(s, Math.min(end, value.length));
  if (e > s && value[e - 1] === "\n") e -= 1;
  const lineStart = value.lastIndexOf("\n", s - 1) + 1;
  let lineEnd = value.indexOf("\n", e);
  if (lineEnd < 0) lineEnd = value.length;
  return { lineStart, lineEnd };
}

const BULLET_PREFIX_RE = /^\s*[-*]\s+/;
const ORDERED_PREFIX_RE = /^\s*\d+\.\s+/;

const BULLET_LINE_RE = /^(\s*)([-*]\s+)(.*)$/;
const ORDERED_LINE_RE = /^(\s*)(\d+)\.\s+(.*)$/;

/**
 * Enter trên dòng list → dòng mới với `- ` hoặc `N+1. `.
 * Enter trên item trống (chỉ còn prefix) → thoát list.
 * Trả `null` nếu không phải dòng list (để caller để mặc định).
 */
export function continueListOnEnter(
  value: string,
  start: number,
  end: number,
): TextSelection | null {
  if (start !== end) return null;

  const caret = Math.max(0, Math.min(start, value.length));
  const lineStart = value.lastIndexOf("\n", caret - 1) + 1;
  let lineEnd = value.indexOf("\n", caret);
  if (lineEnd < 0) lineEnd = value.length;
  const line = value.slice(lineStart, lineEnd);

  const ordered = ORDERED_LINE_RE.exec(line);
  const bullet = ordered ? null : BULLET_LINE_RE.exec(line);
  if (!ordered && !bullet) return null;

  const indent = ordered ? ordered[1]! : bullet![1]!;
  const body = ordered ? ordered[3]! : bullet![3]!;
  const prefixLen = ordered
    ? indent.length + String(ordered[2]).length + 2 // "N" + ". "
    : indent.length + bullet![2]!.length;

  // Item trống → gỡ prefix, thoát list
  if (!body.trim()) {
    const next = value.slice(0, lineStart) + value.slice(lineStart + prefixLen);
    return {
      value: next,
      selectionStart: lineStart,
      selectionEnd: lineStart,
    };
  }

  const nextPrefix = ordered
    ? `${indent}${Number(ordered[2]) + 1}. `
    : `${indent}- `;
  const insert = `\n${nextPrefix}`;
  const next = value.slice(0, caret) + insert + value.slice(caret);
  const nextCaret = caret + insert.length;
  return {
    value: next,
    selectionStart: nextCaret,
    selectionEnd: nextCaret,
  };
}

/**
 * Thêm/gỡ prefix đầu mỗi dòng trong vùng selection.
 * `ordered`: dùng `1. ` `2. ` …
 */
export function applyLinePrefix(
  value: string,
  start: number,
  end: number,
  kind: "bullet" | "ordered",
): TextSelection {
  const { lineStart, lineEnd } = lineRangeForSelection(value, start, end);
  const block = value.slice(lineStart, lineEnd);
  const lines = block.length === 0 ? [""] : block.split("\n");

  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  const currentlyListed =
    nonEmpty.length > 0 &&
    nonEmpty.every((line) =>
      kind === "ordered"
        ? ORDERED_PREFIX_RE.test(line)
        : BULLET_PREFIX_RE.test(line),
    );

  const nextLines = lines.map((line, i) => {
    if (!line.trim() && lines.length > 1) return line;
    if (currentlyListed) {
      return kind === "ordered"
        ? line.replace(ORDERED_PREFIX_RE, "")
        : line.replace(BULLET_PREFIX_RE, "");
    }
    const naked = line
      .replace(ORDERED_PREFIX_RE, "")
      .replace(BULLET_PREFIX_RE, "");
    return kind === "ordered" ? `${i + 1}. ${naked}` : `- ${naked}`;
  });

  const joined = nextLines.join("\n");
  const next = value.slice(0, lineStart) + joined + value.slice(lineEnd);
  return {
    value: next,
    selectionStart: lineStart,
    selectionEnd: lineStart + joined.length,
  };
}

/** Chèn `text` tại `index`, caret sau đoạn chèn. */
export function insertAt(
  value: string,
  index: number,
  text: string,
): TextSelection {
  const i = Math.max(0, Math.min(index, value.length));
  const next = value.slice(0, i) + text + value.slice(i);
  const caret = i + text.length;
  return { value: next, selectionStart: caret, selectionEnd: caret };
}
