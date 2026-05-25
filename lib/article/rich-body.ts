/** Bỏ các dòng comment SQL (`-- …`) đầu chuỗi trong seed/migration. */
export function stripLeadingSqlComments(text: string): string {
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (t === "") {
      i += 1;
      continue;
    }
    if (/^--(\s|$)/.test(t)) {
      i += 1;
      continue;
    }
    break;
  }
  return lines.slice(i).join("\n").trim();
}

export function isProbablyHtmlContent(source: string): boolean {
  return /^\s*</.test(source.trim());
}
