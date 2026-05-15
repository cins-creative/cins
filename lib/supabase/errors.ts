/** Chuỗi mô tả lỗi mạng/fetch (Node thường gắn `cause`). */
export function describeFetchFailure(e: unknown): string {
  if (!(e instanceof Error)) return String(e);
  const lines: string[] = [`${e.name}: ${e.message}`];
  let depth = 0;
  let c: unknown = (e as Error & { cause?: unknown }).cause;
  while (depth < 6) {
    if (c instanceof Error) {
      lines.push(`→ ${c.name}: ${c.message}`);
      c = (c as Error & { cause?: unknown }).cause;
      depth += 1;
      continue;
    }
    if (c != null && typeof c === "object") {
      try {
        lines.push(`→ ${JSON.stringify(c)}`);
      } catch {
        lines.push(`→ [object]`);
      }
    }
    break;
  }
  return lines.join("\n");
}
