import "server-only";

import { getCinsSystemUserId } from "@/lib/cong-dong/cins-system";
import {
  isOrgSlugTaken,
  slugifyOrgName,
  validateOrgSlug,
} from "@/lib/cong-dong/org-slug";
import { normalizeTinhThanhForDb } from "@/lib/truong/contact";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type CreateStudioInput = {
  ten: string;
  slug: string;
  moTa?: string;
  tenChinhThuc?: string;
  tinhThanh?: string;
  diaChi?: string;
  dienThoai?: string;
  emailLienHe?: string;
  avatarId?: string;
  gioiThieu?: string;
  website?: string;
};

export type CreateStudioFieldError = {
  ok: false;
  error: string;
  field?: "ten" | "slug" | "email_lien_he" | "website";
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Cột mốc Journey cá nhân khi user tạo studio (`loai_to_chuc = studio`). */
async function createStudioCreatorMilestone(params: {
  creatorId: string;
  orgId: string;
  orgTen: string;
  orgSlug: string;
  orgMoTa?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("content_cot_moc")
    .select("id")
    .eq("id_nguoi_dung", params.creatorId)
    .eq("id_to_chuc", params.orgId)
    .eq("nguon_goc", "sinh_tu_org_assign")
    .maybeSingle<{ id: string }>();

  if (existing?.id) return { ok: true };

  const moTa =
    params.orgMoTa?.trim() || `Người tạo studio · ${params.orgTen} trên CINs.`;

  const { data: cotMoc, error: cotErr } = await admin
    .from("content_cot_moc")
    .insert({
      id_nguoi_dung: params.creatorId,
      loai_moc: "thanh_tuu",
      nguon_goc: "sinh_tu_org_assign",
      tieu_de: `Tạo studio ${params.orgTen}`,
      mo_ta: moTa,
      thoi_diem: todayIsoDate(),
      che_do_hien_thi: "public",
      id_to_chuc: params.orgId,
    })
    .select("id")
    .single<{ id: string }>();

  if (cotErr || !cotMoc) {
    return { ok: false, error: cotErr?.message ?? "Không tạo được cột mốc." };
  }

  const { error: verifyErr } = await admin.from("verify_xac_nhan").insert({
    id_cot_moc: cotMoc.id,
    loai_nguoi_xac_nhan: "to_chuc",
    id_nguoi_xac_nhan: null,
    trang_thai: "da_xac_nhan",
    url_proof: `/studio/${params.orgSlug}`,
    xu_ly_luc: new Date().toISOString(),
  });

  if (verifyErr) {
    await admin.from("content_cot_moc").delete().eq("id", cotMoc.id);
    return { ok: false, error: verifyErr.message };
  }

  return { ok: true };
}

/**
 * Tạo org `studio` — chỉ ghi `org_to_chuc` (không bảng mở rộng như co-so).
 * Gộp `doanh_nghiep` vào `studio` (DECISIONS L7). Website lưu trong `cau_hinh`.
 */
export async function createStudioOrg(
  creatorId: string,
  input: CreateStudioInput,
): Promise<
  | { ok: true; data: { id: string; slug: string } }
  | CreateStudioFieldError
> {
  const ten = input.ten?.trim();
  if (!ten || ten.length < 2) {
    return { ok: false, error: "Tên studio phải có ít nhất 2 ký tự.", field: "ten" };
  }
  if (ten.length > 120) {
    return { ok: false, error: "Tên studio tối đa 120 ký tự.", field: "ten" };
  }

  const slugInput = input.slug?.trim() || slugifyOrgName(ten);
  const slugValidation = validateOrgSlug(slugInput);
  if (!slugValidation.ok) {
    return { ok: false, error: slugValidation.error, field: "slug" };
  }
  const slug = slugValidation.slug;

  if (await isOrgSlugTaken(slug)) {
    return { ok: false, error: "Đường dẫn này đã có người dùng.", field: "slug" };
  }

  const email = input.emailLienHe?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Email liên hệ không hợp lệ.", field: "email_lien_he" };
  }

  const website = input.website?.trim();
  if (website && !/^https?:\/\//i.test(website)) {
    return {
      ok: false,
      error: "Website phải bắt đầu bằng http:// hoặc https://.",
      field: "website",
    };
  }

  let cinsOwnerId: string;
  try {
    cinsOwnerId = getCinsSystemUserId();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Thiếu CINS_SYSTEM_USER_ID.",
    };
  }

  const admin = createServiceRoleClient();

  const cauHinh: Record<string, unknown> = {};
  if (website) cauHinh.website = website;
  if (input.tenChinhThuc?.trim()) cauHinh.ten_chinh_thuc = input.tenChinhThuc.trim();

  const { data: org, error: orgError } = await admin
    .from("org_to_chuc")
    .insert({
      ten,
      slug,
      loai_to_chuc: "studio",
      mo_ta: input.moTa?.trim() || null,
      tinh_thanh: normalizeTinhThanhForDb(input.tinhThanh),
      dia_chi: input.diaChi?.trim() || null,
      dien_thoai: input.dienThoai?.trim() || null,
      email_lien_he: email || null,
      avatar_id: input.avatarId?.trim() || null,
      gioi_thieu_truong: input.gioiThieu?.trim() || null,
      nguoi_tao: creatorId,
      trang_thai_tin_cay: "binh_thuong",
      cau_hinh: cauHinh,
    })
    .select("id, slug")
    .single<{ id: string; slug: string }>();

  if (orgError || !org) {
    const msg = orgError?.message ?? "Không tạo được studio.";
    if (msg.includes("slug") || msg.includes("unique")) {
      return { ok: false, error: "Đường dẫn này đã có người dùng.", field: "slug" };
    }
    return { ok: false, error: msg };
  }

  const rollbackAll = async () => {
    await admin.from("user_thanh_vien_to_chuc").delete().eq("id_to_chuc", org.id);
    await admin.from("org_to_chuc").delete().eq("id", org.id);
  };

  const { error: ownerError } = await admin.from("user_thanh_vien_to_chuc").insert({
    id_to_chuc: org.id,
    id_nguoi_dung: cinsOwnerId,
    vai_tro: "owner",
  });
  if (ownerError) {
    await rollbackAll();
    return { ok: false, error: ownerError.message };
  }

  const { error: adminMemberError } = await admin
    .from("user_thanh_vien_to_chuc")
    .insert({
      id_to_chuc: org.id,
      id_nguoi_dung: creatorId,
      vai_tro: "admin",
    });
  if (adminMemberError) {
    await rollbackAll();
    return { ok: false, error: adminMemberError.message };
  }

  const milestone = await createStudioCreatorMilestone({
    creatorId,
    orgId: org.id,
    orgTen: ten,
    orgSlug: org.slug,
    orgMoTa: input.moTa,
  });
  if (!milestone.ok) {
    await rollbackAll();
    return { ok: false, error: milestone.error };
  }

  return { ok: true, data: { id: org.id, slug: org.slug } };
}
