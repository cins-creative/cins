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
  return {
    text: text.slice(0, trigger.start) + text.slice(trigger.end),
    caret: trigger.start,
  };
}
