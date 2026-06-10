import { effectiveThangDiemForCalc } from "@/lib/truong/calc";
import type { TruongCauHinhTinhDiem, TruongCauHinhMon } from "@/lib/truong/types";

export type MonThiDauVaoItem = {
  key: string;
  label: string;
  ten: string;
  loai: string | null;
  ma: string | null;
  thumbnail_id: string | null;
  thumbnail_url: string | null;
};

export type MonThiDauVaoDisplay = {
  khoiLabel: string | null;
  monLabels: string[];
  monItems: MonThiDauVaoItem[];
};

function formatMonLabel(m: Pick<TruongCauHinhMon, "ten" | "he_so" | "thang_diem">): string {
  const hs = m.he_so !== 1 ? ` ×${m.he_so}` : "";
  const thang = effectiveThangDiemForCalc(m);
  const scale = thang === 10 ? "" : ` /${thang}`;
  return `${m.ten}${hs}${scale}`;
}

export function monThiDauVaoFromConfig(
  config: TruongCauHinhTinhDiem | null | undefined,
): MonThiDauVaoDisplay {
  if (!config?.mon?.length) {
    return { khoiLabel: null, monLabels: [], monItems: [] };
  }

  const khoi = config.khoiThi;
  const khoiLabel = khoi
    ? [khoi.ma?.trim(), khoi.ten?.trim()].filter(Boolean).join(" — ") || null
    : null;

  const sorted = [...config.mon].sort((a, b) => a.so_thu_tu - b.so_thu_tu);
  const monItems: MonThiDauVaoItem[] = sorted.map((m) => ({
    key: m.id_mon_thi,
    label: formatMonLabel(m),
    ten: m.ten,
    loai: m.loai,
    ma: m.ma ?? null,
    thumbnail_id: m.thumbnail_id ?? null,
    thumbnail_url: m.thumbnail_url ?? null,
  }));

  return {
    khoiLabel,
    monLabels: monItems.map((i) => i.label),
    monItems,
  };
}

/** Một dòng tóm tắt cho bảng (vd. modal thêm năm). */
export function formatMonThiShort(
  config: TruongCauHinhTinhDiem | null | undefined,
  maxLabels = 2,
): string {
  const { monLabels } = monThiDauVaoFromConfig(config);
  if (!monLabels.length) return "—";
  if (monLabels.length <= maxLabels) return monLabels.join(", ");
  return `${monLabels.slice(0, maxLabels).join(", ")} +${monLabels.length - maxLabels}`;
}
