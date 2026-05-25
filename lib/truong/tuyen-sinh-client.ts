import type { TruongNganhProgram, TruongTuyenSinhNamRow } from "@/lib/truong/types";

export type TuyenSinhInsertPayload = {
  truongNganhId: string;
  chi_tieu?: number | null;
  diem_chuan?: number | null;
  thoi_gian_thang?: number | null;
};

export type TuyenSinhInsertRawRow = {
  id: string;
  nam: number;
  id_truong_nganh: string;
  chi_tieu?: number | null;
  diem_chuan?: number | null;
};

export function enrichTuyenSinhRows(
  raw: TuyenSinhInsertRawRow[],
  programs: TruongNganhProgram[],
): TruongTuyenSinhNamRow[] {
  const byId = new Map(programs.map((p) => [p.id, p]));
  return raw.map((r) => {
    const prog = byId.get(r.id_truong_nganh);
    return {
      id: r.id,
      nam: r.nam,
      chi_tieu: r.chi_tieu ?? null,
      diem_chuan: r.diem_chuan ?? null,
      tinh_trang: null,
      ngay_mo_ho_so: null,
      ngay_dong_ho_so: null,
      ngay_thi_tu: null,
      ngay_thi_den: null,
      ngay_cong_bo_diem: null,
      ngay_xac_nhan_nhap_hoc_tu: null,
      ngay_xac_nhan_nhap_hoc_den: null,
      ghi_chu_timeline: null,
      link_thong_tin: null,
      truongNganhId: r.id_truong_nganh,
      programSlug: prog?.programSlug ?? prog?.nganhSlug ?? null,
      nganhTitle: prog?.nganhTitle ?? null,
      phuongThuc: [],
    };
  });
}
