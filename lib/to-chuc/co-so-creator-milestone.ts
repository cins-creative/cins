import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Cột mốc Journey cá nhân khi user tạo cơ sở đào tạo (`org_to_chuc.loai_to_chuc = co_so_dao_tao`).
 * Verified qua org (người tạo = admin org).
 */
export async function createCoSoCreatorMilestone(params: {
  creatorId: string;
  orgId: string;
  orgTen: string;
  orgSlug: string;
  orgMoTa?: string | null;
}): Promise<{ ok: true; cotMocId: string } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("content_cot_moc")
    .select("id")
    .eq("id_nguoi_dung", params.creatorId)
    .eq("id_to_chuc", params.orgId)
    .eq("nguon_goc", "sinh_tu_org_assign")
    .maybeSingle<{ id: string }>();

  if (existing?.id) {
    return { ok: true, cotMocId: existing.id };
  }

  const tieuDe = `Tạo cơ sở đào tạo ${params.orgTen}`;
  const moTa =
    params.orgMoTa?.trim() ||
    `Người tạo cơ sở đào tạo · ${params.orgTen} trên CINs.`;

  const { data: cotMoc, error: cotErr } = await admin
    .from("content_cot_moc")
    .insert({
      id_nguoi_dung: params.creatorId,
      loai_moc: "thanh_tuu",
      nguon_goc: "sinh_tu_org_assign",
      tieu_de: tieuDe,
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

  const now = new Date().toISOString();
  const { error: verifyErr } = await admin.from("verify_xac_nhan").insert({
    id_cot_moc: cotMoc.id,
    loai_nguoi_xac_nhan: "to_chuc",
    id_nguoi_xac_nhan: null,
    trang_thai: "da_xac_nhan",
    url_proof: `/co-so/${params.orgSlug}`,
    xu_ly_luc: now,
  });

  if (verifyErr) {
    await admin.from("content_cot_moc").delete().eq("id", cotMoc.id);
    return { ok: false, error: verifyErr.message };
  }

  return { ok: true, cotMocId: cotMoc.id };
}

/**
 * Backfill cột mốc creator cho cơ sở đã tạo trước khi có auto-milestone.
 * Idempotent — gọi lại an toàn.
 */
export async function backfillCoSoCreatorMilestone(params: {
  orgSlug: string;
  userSlug: string;
}): Promise<
  | { ok: true; cotMocId: string; created: boolean }
  | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();

  const { data: org, error: orgErr } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten, mo_ta, loai_to_chuc, nguoi_tao")
    .eq("slug", params.orgSlug.trim())
    .maybeSingle<{
      id: string;
      slug: string;
      ten: string;
      mo_ta: string | null;
      loai_to_chuc: string;
      nguoi_tao: string | null;
    }>();

  if (orgErr) {
    return { ok: false, error: orgErr.message };
  }
  if (!org) {
    return { ok: false, error: `Không tìm thấy org slug «${params.orgSlug}».` };
  }
  if (org.loai_to_chuc !== "co_so_dao_tao") {
    return {
      ok: false,
      error: `Org «${params.orgSlug}» không phải cơ sở đào tạo.`,
    };
  }

  const { data: user, error: userErr } = await admin
    .from("user_nguoi_dung")
    .select("id, slug")
    .eq("slug", params.userSlug.trim())
    .maybeSingle<{ id: string; slug: string }>();

  if (userErr) {
    return { ok: false, error: userErr.message };
  }
  if (!user) {
    return {
      ok: false,
      error: `Không tìm thấy user slug «${params.userSlug}».`,
    };
  }

  const { data: membership } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro")
    .eq("id_to_chuc", org.id)
    .eq("id_nguoi_dung", user.id)
    .maybeSingle<{ vai_tro: string }>();

  const isCreator = org.nguoi_tao === user.id;
  const isAdmin =
    membership?.vai_tro === "admin" || membership?.vai_tro === "owner";
  if (!isCreator && !isAdmin) {
    return {
      ok: false,
      error: `User «${params.userSlug}» không phải người tạo/admin của cơ sở «${params.orgSlug}».`,
    };
  }

  const before = await admin
    .from("content_cot_moc")
    .select("id")
    .eq("id_nguoi_dung", user.id)
    .eq("id_to_chuc", org.id)
    .eq("nguon_goc", "sinh_tu_org_assign")
    .maybeSingle<{ id: string }>();

  const result = await createCoSoCreatorMilestone({
    creatorId: user.id,
    orgId: org.id,
    orgTen: org.ten,
    orgSlug: org.slug,
    orgMoTa: org.mo_ta,
  });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    cotMocId: result.cotMocId,
    created: !before?.id,
  };
}
