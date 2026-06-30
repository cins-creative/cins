import "server-only";

import {
  isOrgSlugTaken,
  slugifyOrgName,
  validateOrgSlug,
} from "@/lib/cong-dong/org-slug";
import { LOAI_CO_SO_SET, type LoaiCoSo } from "@/lib/to-chuc/constants";
import { createCoSoCreatorMilestone } from "@/lib/to-chuc/co-so-creator-milestone";
import { seedDefaultCoSoFilters } from "@/lib/to-chuc/default-filters";
import { normalizeTinhThanhForDb } from "@/lib/truong/contact";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type CreateCoSoDaoTaoInput = {
  ten: string;
  slug: string;
  loaiCoSo: string;
  moTa?: string;
  tenChinhThuc?: string;
  tinhThanh?: string;
  diaChi?: string;
  dienThoai?: string;
  emailLienHe?: string;
  avatarId?: string;
  gioiThieuTruong?: string;
  namThanhLap?: number;
  website?: string;
  giayPhepDaoTao?: string;
};

export type CreateCoSoFieldError = {
  ok: false;
  error: string;
  field?: "ten" | "slug" | "loai_co_so" | "nam_thanh_lap" | "email_lien_he" | "website";
};

function generateMaCoSo(slug: string, orgId: string): string {
  const fromSlug = slug.replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (fromSlug.length >= 4) {
    return `CS-${fromSlug.padEnd(6, "0").slice(0, 6)}`;
  }
  return `CS-${orgId.replace(/-/g, "").toUpperCase().slice(0, 6)}`;
}

function parseNamThanhLap(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1800 || n > 2100) return "invalid";
  return n;
}

export async function createCoSoDaoTaoOrg(
  creatorId: string,
  input: CreateCoSoDaoTaoInput,
): Promise<
  | { ok: true; data: { id: string; slug: string } }
  | CreateCoSoFieldError
> {
  const ten = input.ten?.trim();
  if (!ten) {
    return { ok: false, error: "Tên cơ sở không được trống.", field: "ten" };
  }
  if (ten.length > 120) {
    return { ok: false, error: "Tên cơ sở tối đa 120 ký tự.", field: "ten" };
  }

  const slugInput = input.slug?.trim() || slugifyOrgName(ten);
  const slugValidation = validateOrgSlug(slugInput);
  if (!slugValidation.ok) {
    return { ok: false, error: slugValidation.error, field: "slug" };
  }
  const slug = slugValidation.slug;

  if (await isOrgSlugTaken(slug)) {
    return {
      ok: false,
      error: "Đường dẫn này đã có người dùng.",
      field: "slug",
    };
  }

  if (!LOAI_CO_SO_SET.has(input.loaiCoSo)) {
    return {
      ok: false,
      error: "Chọn loại cơ sở hợp lệ.",
      field: "loai_co_so",
    };
  }
  const loaiCoSo = input.loaiCoSo as LoaiCoSo;

  const namThanhLap = parseNamThanhLap(input.namThanhLap);
  if (namThanhLap === "invalid") {
    return {
      ok: false,
      error: "Năm thành lập phải là số từ 1800–2100.",
      field: "nam_thanh_lap",
    };
  }

  const email = input.emailLienHe?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      error: "Email liên hệ không hợp lệ.",
      field: "email_lien_he",
    };
  }

  const website = input.website?.trim();
  if (website && !/^https?:\/\//i.test(website)) {
    return {
      ok: false,
      error: "Website phải bắt đầu bằng http:// hoặc https://.",
      field: "website",
    };
  }

  const tenChinhThuc = input.tenChinhThuc?.trim() || ten;
  const admin = createServiceRoleClient();

  const { data: org, error: orgError } = await admin
    .from("org_to_chuc")
    .insert({
      ten,
      slug,
      loai_to_chuc: "co_so_dao_tao",
      mo_ta: input.moTa?.trim() || null,
      tinh_thanh: normalizeTinhThanhForDb(input.tinhThanh),
      dia_chi: input.diaChi?.trim() || null,
      dien_thoai: input.dienThoai?.trim() || null,
      email_lien_he: email || null,
      avatar_id: input.avatarId?.trim() || null,
      gioi_thieu_truong: input.gioiThieuTruong?.trim() || null,
      nguoi_tao: creatorId,
      trang_thai_tin_cay: "binh_thuong",
      cau_hinh: {},
    })
    .select("id, slug")
    .single<{ id: string; slug: string }>();

  if (orgError || !org) {
    const msg = orgError?.message ?? "Không tạo được cơ sở đào tạo.";
    if (msg.includes("slug") || msg.includes("unique")) {
      return { ok: false, error: "Đường dẫn này đã có người dùng.", field: "slug" };
    }
    return { ok: false, error: msg };
  }

  const maCoSo = generateMaCoSo(slug, org.id);

  const rollbackAll = async () => {
    await admin.from("filter_nhan").delete().eq("id_to_chuc", org.id);
    await admin.from("user_thanh_vien_to_chuc").delete().eq("id_to_chuc", org.id);
    await admin.from("org_co_so_dao_tao").delete().eq("id_to_chuc", org.id);
    await admin.from("org_to_chuc").delete().eq("id", org.id);
  };

  const { error: extError } = await admin.from("org_co_so_dao_tao").insert({
    id_to_chuc: org.id,
    ma_co_so: maCoSo,
    ten_chinh_thuc: tenChinhThuc,
    loai_co_so: loaiCoSo,
    nam_thanh_lap: namThanhLap,
    website: website || null,
    giay_phep_dao_tao: input.giayPhepDaoTao?.trim() || null,
    da_verify: false,
  });

  if (extError) {
    await rollbackAll();
    return { ok: false, error: extError.message };
  }

  // Người tạo = owner (quyền tối đa). CINs admin truy cập qua quyền hệ thống,
  // không cần thêm tài khoản hệ thống vào org.
  const { error: ownerError } = await admin.from("user_thanh_vien_to_chuc").insert({
    id_to_chuc: org.id,
    id_nguoi_dung: creatorId,
    vai_tro: "owner",
  });
  if (ownerError) {
    await rollbackAll();
    return { ok: false, error: ownerError.message };
  }

  const seed = await seedDefaultCoSoFilters(org.id);
  if (!seed.ok) {
    await rollbackAll();
    return { ok: false, error: seed.error };
  }

  const milestone = await createCoSoCreatorMilestone({
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
