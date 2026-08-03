/** Meta đơn vị thời lượng gói — nhúng đầu `mo_ta` (chưa có cột don_vi trên DB). */

export type DonViThoiLuong = "ngay" | "buoi" | "gio";

export const DON_VI_THOI_LUONG_OPTIONS: Array<{
  value: DonViThoiLuong;
  label: string;
}> = [
  { value: "ngay", label: "Ngày" },
  { value: "buoi", label: "Buổi" },
  { value: "gio", label: "Giờ" },
];

export type GoiThoiLuongMeta = {
  donVi: DonViThoiLuong;
  soLuong: number;
};

const META_PREFIX = "<!--cins-goi-meta-->";

function isDonVi(v: unknown): v is DonViThoiLuong {
  return v === "ngay" || v === "buoi" || v === "gio";
}

export function donViLabel(donVi: DonViThoiLuong): string {
  return DON_VI_THOI_LUONG_OPTIONS.find((o) => o.value === donVi)?.label ?? donVi;
}

export function formatThoiLuong(donVi: DonViThoiLuong, soLuong: number): string {
  const n = Math.max(0, Math.floor(soLuong));
  if (donVi === "ngay") return `${n} ngày`;
  if (donVi === "buoi") return `${n} buổi`;
  return `${n} giờ`;
}

export function parseGoiMoTa(
  moTa: string | null | undefined,
  soNgayFallback: number,
): {
  meta: GoiThoiLuongMeta;
  note: string | null;
} {
  const raw = moTa?.trim() ?? "";
  if (raw.startsWith(META_PREFIX)) {
    const rest = raw.slice(META_PREFIX.length);
    const nl = rest.indexOf("\n");
    const jsonPart = nl >= 0 ? rest.slice(0, nl) : rest;
    const notePart = nl >= 0 ? rest.slice(nl + 1).trim() : "";
    try {
      const parsed = JSON.parse(jsonPart) as Record<string, unknown>;
      const donVi = isDonVi(parsed.donVi) ? parsed.donVi : "ngay";
      const soLuong =
        typeof parsed.soLuong === "number" && Number.isFinite(parsed.soLuong)
          ? Math.max(1, Math.floor(parsed.soLuong))
          : Math.max(1, Math.floor(soNgayFallback) || 1);
      return {
        meta: { donVi, soLuong },
        note: notePart || null,
      };
    } catch {
      /* fall through */
    }
  }
  return {
    meta: {
      donVi: "ngay",
      soLuong: Math.max(1, Math.floor(soNgayFallback) || 1),
    },
    note: raw || null,
  };
}

export function encodeGoiMoTa(
  meta: GoiThoiLuongMeta,
  note?: string | null,
): string {
  const payload: GoiThoiLuongMeta = {
    donVi: meta.donVi,
    soLuong: Math.max(1, Math.floor(meta.soLuong) || 1),
  };
  const notePart = note?.trim() || "";
  return notePart
    ? `${META_PREFIX}${JSON.stringify(payload)}\n${notePart}`
    : `${META_PREFIX}${JSON.stringify(payload)}`;
}

/** `so_ngay` trên DB = ngày hiệu lực entitlement (O12). */
export function resolveSoNgayHieuLuc(input: {
  donVi: DonViThoiLuong;
  soLuong: number;
  soNgayHieuLuc?: number | null;
}): number {
  if (input.donVi === "ngay") {
    return Math.max(1, Math.floor(input.soLuong) || 1);
  }
  const n = input.soNgayHieuLuc;
  if (n != null && Number.isFinite(n) && n >= 1) {
    return Math.floor(n);
  }
  return 30;
}
