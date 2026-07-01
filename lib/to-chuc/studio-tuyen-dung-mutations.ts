import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isTruongOrgAdmin } from "@/lib/truong/org-admin";
import {
  normalizeGiaiDoanMucTieu,
  TUYEN_DUNG_GIAI_DOAN_DEFAULT,
} from "@/lib/to-chuc/studio-tuyen-dung-distribution";
import {
  mapStudioJobRow,
  STUDIO_JOB_LOAI_HINH_LABEL,
  STUDIO_JOB_SELECT,
  STUDIO_JOB_STATUS_LABEL,
  type StudioJob,
  type StudioJobLoaiHinh,
  type StudioJobStatus,
} from "@/lib/to-chuc/studio-tuyen-dung-types";
import type { GiaiDoan } from "@/lib/cins/home-adaptive/persona";
import { normalizeTinhThanhForDb } from "@/lib/truong/contact";

export type StudioJobInput = {
  tieuDe: string;
  moTa?: string | null;
  yeuCau?: string | null;
  quyenLoi?: string | null;
  moTaNgan?: string | null;
  loaiHinh?: StudioJobLoaiHinh;
  capDo?: string | null;
  tinhThanh?: string | null;
  lamTuXa?: boolean;
  idLinhVuc?: string | null;
  mucLuongTu?: number | null;
  mucLuongDen?: number | null;
  hienThiLuong?: boolean;
  soLuong?: number | null;
  hanNop?: string | null;
  hienThiCoHoi?: boolean;
  giaiDoanMucTieu?: GiaiDoan[] | null;
  trangThai?: StudioJobStatus;
};

type MutationResult =
  | { ok: true; job: StudioJob }
  | { ok: false; error: string; status: number };

type SimpleResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

function normalizeInput(
  input: StudioJobInput,
):
  | { error: string }
  | {
      payload: {
        tieu_de: string;
        mo_ta: string | null;
        yeu_cau: string | null;
        quyen_loi: string | null;
        mo_ta_ngan: string | null;
        loai_hinh: StudioJobLoaiHinh;
        cap_do: string | null;
        tinh_thanh: string | null;
        lam_tu_xa: boolean;
        id_linh_vuc: string | null;
        muc_luong_tu: number | null;
        muc_luong_den: number | null;
        hien_thi_luong: boolean;
        so_luong: number | null;
        han_nop: string | null;
        hien_thi_co_hoi: boolean;
        giai_doan_muc_tieu: GiaiDoan[];
        trang_thai: StudioJobStatus;
      };
    } {
  const tieuDe = input.tieuDe?.trim();
  if (!tieuDe) return { error: "Cần nhập tiêu đề vị trí." };

  const loaiHinh =
    input.loaiHinh && input.loaiHinh in STUDIO_JOB_LOAI_HINH_LABEL
      ? input.loaiHinh
      : "toan_thoi_gian";
  const trangThai =
    input.trangThai && input.trangThai in STUDIO_JOB_STATUS_LABEL
      ? input.trangThai
      : "dang_mo";

  const toInt = (v: number | null | undefined) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null;

  const tinhThanh = input.lamTuXa
    ? null
    : normalizeTinhThanhForDb(input.tinhThanh) ?? null;

  const giaiDoanMucTieu = normalizeGiaiDoanMucTieu(
    input.giaiDoanMucTieu ?? TUYEN_DUNG_GIAI_DOAN_DEFAULT,
  );

  const idLinhVuc = input.idLinhVuc?.trim() || null;

  return {
    payload: {
      tieu_de: tieuDe,
      mo_ta: input.moTa?.trim() || null,
      yeu_cau: input.yeuCau?.trim() || null,
      quyen_loi: input.quyenLoi?.trim() || null,
      mo_ta_ngan: input.moTaNgan?.trim() || null,
      loai_hinh: loaiHinh,
      cap_do: input.capDo?.trim() || null,
      tinh_thanh: tinhThanh,
      lam_tu_xa: Boolean(input.lamTuXa),
      id_linh_vuc: idLinhVuc,
      muc_luong_tu: toInt(input.mucLuongTu),
      muc_luong_den: toInt(input.mucLuongDen),
      hien_thi_luong: Boolean(input.hienThiLuong),
      so_luong: toInt(input.soLuong),
      han_nop: input.hanNop?.trim() || null,
      hien_thi_co_hoi: input.hienThiCoHoi !== false,
      giai_doan_muc_tieu: giaiDoanMucTieu,
      trang_thai: trangThai,
    },
  };
}

export async function createStudioJob(
  orgId: string,
  profileId: string,
  input: StudioJobInput,
): Promise<MutationResult> {
  if (!(await isTruongOrgAdmin(orgId, profileId))) {
    return { ok: false, error: "Bạn không có quyền quản lý tổ chức này.", status: 403 };
  }

  const normalized = normalizeInput(input);
  if ("error" in normalized) {
    return { ok: false, error: normalized.error, status: 400 };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("org_tuyen_dung")
    .insert({ id_to_chuc: orgId, ...normalized.payload })
    .select(STUDIO_JOB_SELECT)
    .single();

  if (error || !data) {
    return { ok: false, error: "Không tạo được tin tuyển dụng.", status: 500 };
  }
  return { ok: true, job: mapStudioJobRow(data) };
}

export async function updateStudioJob(
  jobId: string,
  profileId: string,
  input: StudioJobInput,
): Promise<MutationResult> {
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from("org_tuyen_dung")
    .select("id_to_chuc")
    .eq("id", jobId)
    .eq("da_xoa", false)
    .maybeSingle<{ id_to_chuc: string }>();

  if (!existing) {
    return { ok: false, error: "Không tìm thấy tin tuyển dụng.", status: 404 };
  }
  if (!(await isTruongOrgAdmin(existing.id_to_chuc, profileId))) {
    return { ok: false, error: "Bạn không có quyền quản lý tổ chức này.", status: 403 };
  }

  const normalized = normalizeInput(input);
  if ("error" in normalized) {
    return { ok: false, error: normalized.error, status: 400 };
  }

  const { data, error } = await supabase
    .from("org_tuyen_dung")
    .update({ ...normalized.payload, cap_nhat_luc: new Date().toISOString() })
    .eq("id", jobId)
    .select(STUDIO_JOB_SELECT)
    .single();

  if (error || !data) {
    return { ok: false, error: "Không cập nhật được tin tuyển dụng.", status: 500 };
  }
  return { ok: true, job: mapStudioJobRow(data) };
}

export async function applyToStudioJob(
  jobId: string,
  profileId: string,
  thuNgo: string | null,
): Promise<SimpleResult> {
  const supabase = createServiceRoleClient();
  const { data: job } = await supabase
    .from("org_tuyen_dung")
    .select("id, trang_thai, da_xoa")
    .eq("id", jobId)
    .maybeSingle<{ id: string; trang_thai: string; da_xoa: boolean }>();

  if (!job || job.da_xoa) {
    return { ok: false, error: "Không tìm thấy tin tuyển dụng.", status: 404 };
  }
  if (job.trang_thai !== "dang_mo") {
    return { ok: false, error: "Vị trí này đã đóng nhận hồ sơ.", status: 400 };
  }

  const { error } = await supabase.from("org_tuyen_dung_ung_tuyen").upsert(
    {
      id_tuyen_dung: jobId,
      id_nguoi_dung: profileId,
      thu_ngo: thuNgo?.trim() || null,
    },
    { onConflict: "id_tuyen_dung,id_nguoi_dung" },
  );

  if (error) {
    return { ok: false, error: "Không gửi được hồ sơ ứng tuyển.", status: 500 };
  }
  return { ok: true };
}
