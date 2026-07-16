/** Phát hiện trigger `@` / `#` ngay trước caret trong textarea plain-text. */

export type AtHashTrigger = {
  char: "@" | "#";
  query: string;
  /** Index của ký tự `@` hoặc `#` trong chuỗi. */
  start: number;
  /** Index caret (kết thúc query). */
  end: number;
};

const TRIGGER_RE = /([@#])([\p{L}\p{N}._-]*)$/u;

function isTriggerBoundary(text: string, at: number): boolean {
  if (at <= 0) return true;
  const prev = text[at - 1];
  return prev === " " || prev === "\n" || prev === "\t" || prev === "\r";
}

/** Trả trigger nếu caret nằm ngay sau `@query` hoặc `#query`. */
export function getAtHashTrigger(
  text: string,
  cursor: number,
): AtHashTrigger | null {
  const before = text.slice(0, cursor);
  const match = before.match(TRIGGER_RE);
  if (!match) return null;
  const start = before.length - match[0].length;
  if (!isTriggerBoundary(text, start)) return null;
  return {
    char: match[1] as "@" | "#",
    query: match[2] ?? "",
    start,
    end: cursor,
  };
}

/** Xóa `@query` / `#query` khỏi chuỗi; caret đặt tại `start`. */
export function stripAtHashTrigger(
  text: string,
  trigger: AtHashTrigger,
): { text: string; caret: number } {
  const start = Math.max(0, Math.min(trigger.start, text.length));
  const end = Math.max(start, Math.min(trigger.end, text.length));
  return {
    text: text.slice(0, start) + text.slice(end),
    caret: start,
  };
}

/** Thay `@query` / `#query` bằng `replacement`; caret đặt sau phần thay. */
export function replaceAtHashTrigger(
  text: string,
  trigger: AtHashTrigger,
  replacement: string,
): { text: string; caret: number } {
  const start = Math.max(0, Math.min(trigger.start, text.length));
  const end = Math.max(start, Math.min(trigger.end, text.length));
  return {
    text: text.slice(0, start) + replacement + text.slice(end),
    caret: start + replacement.length,
  };
}
