import type { Block } from "@/lib/editor/types";

/** Parse `noi_dung_blocks` JSONB → canonical blocks (giữ `thu_tu`, sort). */
export function parseServerBlocks(raw: unknown): Block[] | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return null;
  const out: Block[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.loai !== "string") continue;
    out.push({
      id: typeof obj.id === "string" ? obj.id : `b-${out.length}`,
      loai: obj.loai as Block["loai"],
      thu_tu: typeof obj.thu_tu === "number" ? obj.thu_tu : out.length,
      config:
        obj.config && typeof obj.config === "object"
          ? (obj.config as Record<string, unknown>)
          : {},
    });
  }
  if (out.length === 0) return null;
  out.sort((a, b) => a.thu_tu - b.thu_tu);
  return out;
}
