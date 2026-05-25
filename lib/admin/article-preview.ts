const PREVIEW_LEN = 56;

export function stripHtmlForPreview(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Preview từ `article_bai_viet.noi_dung` (HTML) — schema không có `noi_dung_markdown`. */
export function buildContentPreview(raw: {
  noi_dung?: string | null;
}): { hasData: boolean; preview: string | null; charCount: number } {
  const body = (raw.noi_dung ?? "").trim();
  if (!body) {
    return { hasData: false, preview: null, charCount: 0 };
  }
  const plain = stripHtmlForPreview(body);
  const text = plain || body.replace(/\s+/g, " ").trim();
  const charCount = body.length;
  const slice = text.slice(0, PREVIEW_LEN);
  const preview =
    text.length > PREVIEW_LEN ? `${slice}…` : slice || `${charCount} ký tự`;
  return { hasData: true, preview, charCount };
}

export function buildMetaPreview(meta: unknown): {
  hasData: boolean;
  preview: string | null;
} {
  if (meta == null) return { hasData: false, preview: null };
  if (typeof meta !== "object") {
    const s = String(meta).trim();
    return s
      ? { hasData: true, preview: s.slice(0, PREVIEW_LEN) + (s.length > PREVIEW_LEN ? "…" : "") }
      : { hasData: false, preview: null };
  }
  const keys = Object.keys(meta as object);
  if (!keys.length) return { hasData: false, preview: null };
  try {
    const json = JSON.stringify(meta);
    const compact = keys.length <= 4 ? keys.join(", ") : `${keys.slice(0, 3).join(", ")} +${keys.length - 3}`;
    const preview =
      json.length <= PREVIEW_LEN
        ? json
        : `${compact} · ${json.slice(0, 32)}…`;
    return { hasData: true, preview };
  } catch {
    return { hasData: true, preview: keys.join(", ") };
  }
}
