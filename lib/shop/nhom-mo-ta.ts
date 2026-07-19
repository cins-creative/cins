/**
 * Parse / render mô tả ngắn nhóm shop (`shop_nhom.mo_ta`).
 * Hỗ trợ dòng thường + list `- ` / `* ` / `• ` / `1. `.
 */

export type ShopNhomMoTaBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

const BULLET_RE = /^\s*(?:[-*]|•|·|‣)\s+(.*)$/u;
const ORDERED_RE = /^\s*\d+[.)]\s+(.*)$/;

function isBulletLine(line: string): string | null {
  const m = BULLET_RE.exec(line);
  return m ? (m[1] ?? "").trimEnd() : null;
}

function isOrderedLine(line: string): string | null {
  const m = ORDERED_RE.exec(line);
  return m ? (m[1] ?? "").trimEnd() : null;
}

/** Chuẩn hoá xuống dòng + bullet Word → markdown `- `. */
export function normalizeShopNhomMoTaInput(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^\s*[•·‣]\s+/gm, "- ");
}

export function parseShopNhomMoTa(raw: string): ShopNhomMoTaBlock[] {
  const text = normalizeShopNhomMoTaInput(raw).trim();
  if (!text) return [];

  const lines = text.split("\n");
  const blocks: ShopNhomMoTaBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    const bulletBody = isBulletLine(line);
    if (bulletBody !== null) {
      const items: string[] = [bulletBody];
      i += 1;
      while (i < lines.length) {
        const next = isBulletLine(lines[i] ?? "");
        if (next === null) break;
        items.push(next);
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const orderedBody = isOrderedLine(line);
    if (orderedBody !== null) {
      const items: string[] = [orderedBody];
      i += 1;
      while (i < lines.length) {
        const next = isOrderedLine(lines[i] ?? "");
        if (next === null) break;
        items.push(next);
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Gom đoạn văn liên tiếp (bỏ dòng trống thừa giữa đoạn)
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const paras: string[] = [line.trimEnd()];
    i += 1;
    while (i < lines.length) {
      const next = lines[i] ?? "";
      if (!next.trim()) break;
      if (isBulletLine(next) !== null || isOrderedLine(next) !== null) break;
      paras.push(next.trimEnd());
      i += 1;
    }
    blocks.push({ type: "p", text: paras.join("\n") });
  }

  return blocks;
}
