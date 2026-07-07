import type { GoiHocPhiKhoa, KhoaHocCardData, LoaiMoHinhKhoa } from "@/lib/to-chuc/khoa-hoc-types";
import { formatKhoaHocPhi } from "@/lib/to-chuc/khoa-hoc-labels";

export type GoiHocPhiDraft = {
  id: string;
  tenGoi: string;
  hocPhi: string;
  soBuoi: string;
  phutMoiBuoi: string;
};

export function newGoiHocPhiId(): string {
  return `gphi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyGoiHocPhiDraft(): GoiHocPhiDraft {
  return {
    id: newGoiHocPhiId(),
    tenGoi: "",
    hocPhi: "",
    soBuoi: "",
    phutMoiBuoi: "",
  };
}

function parseOptionalInt(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalMoney(raw: string): number | null {
  const t = raw.trim().replace(/\./g, "").replace(/,/g, "");
  if (!t) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function sanitizeGoi(raw: unknown): GoiHocPhiKhoa | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const tenGoi = typeof row.tenGoi === "string" ? row.tenGoi.trim() : "";
  const hocPhi =
    typeof row.hocPhi === "number" && Number.isFinite(row.hocPhi)
      ? row.hocPhi
      : null;
  if (!tenGoi || hocPhi == null || hocPhi < 0) return null;
  const id =
    typeof row.id === "string" && row.id.trim()
      ? row.id.trim()
      : newGoiHocPhiId();
  const soBuoi =
    typeof row.soBuoi === "number" && Number.isFinite(row.soBuoi)
      ? row.soBuoi
      : null;
  const phutMoiBuoi =
    typeof row.phutMoiBuoi === "number" && Number.isFinite(row.phutMoiBuoi)
      ? row.phutMoiBuoi
      : null;
  return {
    id,
    tenGoi,
    hocPhi,
    soBuoi: soBuoi != null && soBuoi >= 0 ? soBuoi : null,
    phutMoiBuoi:
      phutMoiBuoi != null && phutMoiBuoi >= 0 ? phutMoiBuoi : null,
  };
}

/** Chuẩn hoá mảng gói từ meta JSON. */
export function parseGoiHocPhiMeta(raw: unknown): GoiHocPhiKhoa[] {
  if (!Array.isArray(raw)) return [];
  const out: GoiHocPhiKhoa[] = [];
  for (const item of raw) {
    const goi = sanitizeGoi(item);
    if (goi) out.push(goi);
  }
  return out;
}

export function goiHocPhiDraftsFromKhoa(khoa: Pick<
  KhoaHocCardData,
  "goiHocPhi" | "hocPhi" | "thoiLuongBuoi" | "thoiLuongPhutMoiBuoi" | "loaiMoHinh"
>): GoiHocPhiDraft[] {
  const stored = khoa.goiHocPhi ?? [];
  if (stored.length > 0) {
    return stored.map((goi) => ({
      id: goi.id,
      tenGoi: goi.tenGoi,
      hocPhi: String(goi.hocPhi),
      soBuoi: goi.soBuoi != null ? String(goi.soBuoi) : "",
      phutMoiBuoi: goi.phutMoiBuoi != null ? String(goi.phutMoiBuoi) : "",
    }));
  }
  if (khoa.hocPhi == null) return [emptyGoiHocPhiDraft()];
  return [
    {
      id: newGoiHocPhiId(),
      tenGoi:
        khoa.loaiMoHinh === "lien_tuc_theo_thang" ? "1 tháng" : "Khóa học",
      hocPhi: String(khoa.hocPhi),
      soBuoi:
        khoa.thoiLuongBuoi != null ? String(khoa.thoiLuongBuoi) : "",
      phutMoiBuoi:
        khoa.thoiLuongPhutMoiBuoi != null
          ? String(khoa.thoiLuongPhutMoiBuoi)
          : "",
    },
  ];
}

export function normalizeGoiHocPhiDrafts(
  drafts: ReadonlyArray<GoiHocPhiDraft>,
): GoiHocPhiKhoa[] {
  const out: GoiHocPhiKhoa[] = [];
  for (const draft of drafts) {
    const tenGoi = draft.tenGoi.trim();
    const hocPhi = parseOptionalMoney(draft.hocPhi);
    if (!tenGoi || hocPhi == null) continue;
    out.push({
      id: draft.id.trim() || newGoiHocPhiId(),
      tenGoi,
      hocPhi,
      soBuoi: parseOptionalInt(draft.soBuoi),
      phutMoiBuoi: parseOptionalInt(draft.phutMoiBuoi),
    });
  }
  return out;
}

/** Đồng bộ cột legacy `hoc_phi` / `thoi_luong_*` từ gói đầu tiên. */
export function deriveLegacyFieldsFromGoiHocPhi(
  goiHocPhi: ReadonlyArray<GoiHocPhiKhoa>,
): {
  hocPhi: number | null;
  thoiLuongBuoi: number | null;
  thoiLuongPhutMoiBuoi: number | null;
} {
  const first = goiHocPhi[0];
  if (!first) {
    return {
      hocPhi: null,
      thoiLuongBuoi: null,
      thoiLuongPhutMoiBuoi: null,
    };
  }
  return {
    hocPhi: first.hocPhi,
    thoiLuongBuoi: first.soBuoi ?? null,
    thoiLuongPhutMoiBuoi: first.phutMoiBuoi ?? null,
  };
}

/** Gói hiển thị trên trang chi tiết — fallback cột legacy khi chưa có meta. */
export function resolveGoiHocPhiForDisplay(
  khoa: Pick<
    KhoaHocCardData,
    | "goiHocPhi"
    | "hocPhi"
    | "thoiLuongBuoi"
    | "thoiLuongPhutMoiBuoi"
    | "loaiMoHinh"
  >,
): GoiHocPhiKhoa[] {
  if (khoa.goiHocPhi?.length) return khoa.goiHocPhi;
  if (khoa.hocPhi == null) return [];
  return [
    {
      id: "legacy",
      tenGoi:
        khoa.loaiMoHinh === "lien_tuc_theo_thang" ? "1 tháng" : "Khóa học",
      hocPhi: khoa.hocPhi,
      soBuoi: khoa.thoiLuongBuoi,
      phutMoiBuoi: khoa.thoiLuongPhutMoiBuoi,
    },
  ];
}

export function formatGoiHocPhiLine(
  goi: GoiHocPhiKhoa,
  loaiMoHinh: LoaiMoHinhKhoa,
): string {
  const fee = formatKhoaHocPhi(goi.hocPhi, loaiMoHinh).replace(/\/th$/, "");
  return `${goi.tenGoi} · ${fee}`;
}

export function hocPhiUnitForGoi(
  goi: GoiHocPhiKhoa,
  loaiMoHinh: LoaiMoHinhKhoa,
  multiPackage: boolean,
): string {
  if (multiPackage) return goi.tenGoi;
  return loaiMoHinh === "lien_tuc_theo_thang" ? "VNĐ/tháng" : "VNĐ/khóa";
}
