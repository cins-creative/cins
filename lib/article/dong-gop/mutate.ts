import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  canContributorEditDongGop,
  canContributorSubmitDongGop,
  type ArticleDongGopRow,
  type TrangThaiDongGop,
} from "./types";
import { fetchDongGopByUserAndArticle } from "./fetch";

export type MutateResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

function nowIso(): string {
  return new Date().toISOString();
}

export async function upsertDongGopDraft(input: {
  idBaiViet: string;
  idNguoiDung: string;
  noiDung: string;
}): Promise<MutateResult<{ id: string }>> {
  const noiDung = input.noiDung.trim();
  if (!noiDung) {
    return { ok: false, message: "Nội dung không được trống." };
  }

  const admin = createServiceRoleClient();
  const existing = await fetchDongGopByUserAndArticle(
    input.idNguoiDung,
    input.idBaiViet,
  );

  const capNhatLuc = nowIso();

  if (existing) {
    if (!canContributorEditDongGop(existing.trang_thai)) {
      return {
        ok: false,
        message:
          existing.trang_thai === "duoc_duyet"
            ? "Bản đã duyệt — không thể sửa."
            : "Không thể sửa bản ở trạng thái hiện tại.",
      };
    }

    const { error } = await admin
      .from("article_dong_gop")
      .update({
        noi_dung: noiDung,
        cap_nhat_luc: capNhatLuc,
        trang_thai: existing.trang_thai === "tu_choi" ? "nhap" : existing.trang_thai,
      })
      .eq("id", existing.id)
      .eq("id_nguoi_dong_gop", input.idNguoiDung);

    if (error) return { ok: false, message: error.message };
    return { ok: true, data: { id: existing.id } };
  }

  const { data, error } = await admin
    .from("article_dong_gop")
    .insert({
      id_bai_viet: input.idBaiViet,
      id_nguoi_dong_gop: input.idNguoiDung,
      noi_dung: noiDung,
      trang_thai: "nhap",
      cap_nhat_luc: capNhatLuc,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data?.id) {
    return { ok: false, message: error?.message ?? "Không lưu được bản đóng góp." };
  }
  return { ok: true, data: { id: data.id } };
}

export async function submitDongGopForReview(input: {
  idDongGop: string;
  idNguoiDung: string;
}): Promise<MutateResult> {
  const admin = createServiceRoleClient();
  const { data: row, error: readErr } = await admin
    .from("article_dong_gop")
    .select("id, id_nguoi_dong_gop, trang_thai, noi_dung, da_xoa")
    .eq("id", input.idDongGop)
    .maybeSingle<Pick<ArticleDongGopRow, "id" | "id_nguoi_dong_gop" | "trang_thai" | "noi_dung" | "da_xoa">>();

  if (readErr) return { ok: false, message: readErr.message };
  if (!row || row.da_xoa) return { ok: false, message: "Không tìm thấy bản đóng góp." };
  if (row.id_nguoi_dong_gop !== input.idNguoiDung) {
    return { ok: false, message: "Bạn không có quyền gửi bản này." };
  }
  if (!canContributorSubmitDongGop(row.trang_thai)) {
    return { ok: false, message: "Bản đang ở trạng thái không thể gửi duyệt." };
  }
  if (!(row.noi_dung ?? "").trim()) {
    return { ok: false, message: "Nội dung trống — không thể gửi duyệt." };
  }

  const { error } = await admin
    .from("article_dong_gop")
    .update({
      trang_thai: "cho_duyet" satisfies TrangThaiDongGop,
      cap_nhat_luc: nowIso(),
      hien_thi: true,
    })
    .eq("id", input.idDongGop);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function showDongGopByOwner(input: {
  idDongGop: string;
  idNguoiDung: string;
}): Promise<MutateResult> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("article_dong_gop")
    .update({ hien_thi: true, cap_nhat_luc: nowIso() })
    .eq("id", input.idDongGop)
    .eq("id_nguoi_dong_gop", input.idNguoiDung)
    .eq("da_xoa", false)
    .neq("trang_thai", "nhap");

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function hideDongGopByOwner(input: {
  idDongGop: string;
  idNguoiDung: string;
}): Promise<MutateResult> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("article_dong_gop")
    .update({ hien_thi: false, cap_nhat_luc: nowIso() })
    .eq("id", input.idDongGop)
    .eq("id_nguoi_dong_gop", input.idNguoiDung)
    .eq("da_xoa", false);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function softDeleteDongGopByOwner(input: {
  idDongGop: string;
  idNguoiDung: string;
}): Promise<MutateResult> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("article_dong_gop")
    .update({
      da_xoa: true,
      hien_thi: false,
      cap_nhat_luc: nowIso(),
    })
    .eq("id", input.idDongGop)
    .eq("id_nguoi_dong_gop", input.idNguoiDung)
    .neq("trang_thai", "duoc_duyet");

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
