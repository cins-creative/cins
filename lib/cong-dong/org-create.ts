import "server-only";

import {
  validateCategoryArticleIds,
} from "@/lib/cong-dong/categories";
import { CONG_DONG_CHE_DO, CONG_DONG_FILTER_CONTEXT } from "@/lib/cong-dong/constants";
import { createCongDongCreatorMilestone } from "@/lib/cong-dong/creator-milestone";
import { seedDefaultCongDongFilters } from "@/lib/cong-dong/default-filters";
import { getCinsSystemUserId } from "@/lib/cong-dong/cins-system";
import { slugifyOrgName, uniqueOrgSlug } from "@/lib/cong-dong/org-slug";
import { normalizeTinhThanhForDb } from "@/lib/truong/contact";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type CreateCongDongInput = {
  ten: string;
  slug?: string;
  moTa?: string;
  tinhThanh?: string;
  avatarId?: string;
  coverId?: string;
  cheDo?: string;
  categoryArticleIds?: string[];
};

export async function createCongDongOrg(
  creatorId: string,
  input: CreateCongDongInput,
): Promise<
  | { ok: true; data: { id: string; slug: string } }
  | { ok: false; error: string }
> {
  const ten = input.ten?.trim();
  if (!ten || ten.length < 2) {
    return { ok: false, error: "Tên cộng đồng phải có ít nhất 2 ký tự." };
  }
  if (ten.length > 120) {
    return { ok: false, error: "Tên cộng đồng tối đa 120 ký tự." };
  }

  const baseSlug = slugifyOrgName(input.slug?.trim() || ten);
  const slug = await uniqueOrgSlug(baseSlug);
  const cheDo =
    input.cheDo === CONG_DONG_CHE_DO.RIENG_TU
      ? CONG_DONG_CHE_DO.RIENG_TU
      : CONG_DONG_CHE_DO.CONG_KHAI;

  const categoryValidation = await validateCategoryArticleIds(
    input.categoryArticleIds ?? [],
  );
  if (!categoryValidation.ok) {
    return { ok: false, error: categoryValidation.error };
  }
  const categoryIds = categoryValidation.categories.map((c) => c.id);

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

  const { data: org, error: orgError } = await admin
    .from("org_to_chuc")
    .insert({
      ten,
      slug,
      loai_to_chuc: "cong_dong",
      mo_ta: input.moTa?.trim() || null,
      tinh_thanh: normalizeTinhThanhForDb(input.tinhThanh),
      avatar_id: input.avatarId?.trim() || null,
      cover_id: input.coverId?.trim() || null,
      trang_thai_tin_cay: "binh_thuong",
      cau_hinh: {
        che_do: cheDo,
        ...(categoryIds.length ? { danh_muc: categoryIds } : {}),
      },
    })
    .select("id, slug")
    .single<{ id: string; slug: string }>();

  if (orgError || !org) {
    return {
      ok: false,
      error: orgError?.message ?? "Không tạo được cộng đồng.",
    };
  }

  const rollbackAll = async () => {
    await admin
      .from("cong_dong_filter")
      .delete()
      .eq("loai_context", CONG_DONG_FILTER_CONTEXT.CONG_DONG)
      .eq("id_context", org.id);
    const { data: mocRows } = await admin
      .from("content_cot_moc")
      .select("id")
      .eq("id_to_chuc", org.id)
      .returns<Array<{ id: string }>>();
    const mocIds = (mocRows ?? []).map((r) => r.id);
    if (mocIds.length > 0) {
      await admin.from("verify_xac_nhan").delete().in("id_cot_moc", mocIds);
      await admin.from("content_cot_moc").delete().in("id", mocIds);
    }
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

  const { error: adminError } = await admin.from("user_thanh_vien_to_chuc").insert({
    id_to_chuc: org.id,
    id_nguoi_dung: creatorId,
    vai_tro: "admin",
  });
  if (adminError) {
    await rollbackAll();
    return { ok: false, error: adminError.message };
  }

  const seed = await seedDefaultCongDongFilters(org.id);
  if (!seed.ok) {
    await rollbackAll();
    return { ok: false, error: seed.error };
  }

  const milestone = await createCongDongCreatorMilestone({
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
