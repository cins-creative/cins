/** Parse body.loaiVe từ API POST/PATCH sự kiện. */
export function parseLoaiVeBody(
  raw: unknown,
): import("@/lib/to-chuc/su-kien-constants").SuKienLoaiVeInput[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    const o =
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : {};
    return {
      ten: typeof o.ten === "string" ? o.ten : "",
      moTa:
        o.moTa === null
          ? null
          : typeof o.moTa === "string"
            ? o.moTa
            : null,
      gia: typeof o.gia === "number" ? o.gia : Number(o.gia),
      coverId:
        o.coverId === null
          ? null
          : typeof o.coverId === "string"
            ? o.coverId
            : null,
      thuTu: typeof o.thuTu === "number" ? o.thuTu : i,
    };
  });
}
