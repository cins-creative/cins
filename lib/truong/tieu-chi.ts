export type TieuChiRow = { name: string; score: string };

export function parseTieuChiRows(tieu_chi: unknown): TieuChiRow[] {
  if (tieu_chi == null) return [];
  if (typeof tieu_chi === "string" && tieu_chi.trim()) {
    return tieu_chi
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf(":");
        if (idx === -1) return { name: line, score: "" };
        return {
          name: line.slice(0, idx).trim(),
          score: line.slice(idx + 1).trim(),
        };
      });
  }
  if (typeof tieu_chi !== "object") return [];
  const o = tieu_chi as Record<string, unknown>;
  if (typeof o.dieu_kien === "string" && o.dieu_kien.trim()) {
    return parseTieuChiRows(o.dieu_kien);
  }
  return Object.entries(o)
    .filter(([k]) => k !== "dieu_kien")
    .map(([name, v]) => ({
      name,
      score: v == null ? "" : String(v),
    }));
}
