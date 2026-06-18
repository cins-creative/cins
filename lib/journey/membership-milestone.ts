import "server-only";

import { revalidatePath } from "next/cache";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { buildMilestoneItemForCotMoc } from "@/lib/journey/milestones-fetch";
import {
  assembleMilestoneMoTa,
  assembleMilestoneTitle,
  getEffectivePhraseRecipe,
  isHocStartAction,
  MILESTONE_PHRASE_RECIPES,
  thoiDiemIsoFromSlot,
  type PhraseRecipe,
  type PhraseRecipeId,
} from "@/lib/journey/milestone-phrase-recipes";
import type { MembershipPendingMeta } from "@/components/journey/milestone-types";
import {
  MEMBERSHIP_MILESTONE_KIND,
  type MembershipMilestoneOrgLoai,
  type MembershipMilestonePayload,
  type MembershipMilestoneSearchHit,
  type MembershipMilestoneSlotValues,
  type OutboundMembershipPending,
  type SubmitMembershipMilestoneInput,
} from "@/lib/journey/membership-milestone-types";
import type { OrgAttachEvidence } from "@/lib/journey/org-milestone-tag-types";
import { loadOrgAttachOptions } from "@/lib/journey/org-milestone-tag";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { truongRootPath } from "@/lib/truong/truong-routes";

export type SubmitMembershipMilestoneResult =
  | { ok: true; cotMocId: string; milestone?: Awaited<ReturnType<typeof buildMilestoneItemForCotMoc>> }
  | { ok: false; error: string; field?: string };

export type MembershipMilestoneEditData = {
  cotMocId: string;
  requestId: string;
  recipeId: PhraseRecipeId;
  slots: MembershipMilestoneSlotValues;
  evidence: OrgAttachEvidence[];
  visibilityAfterVerify: "public" | "theo_nhom" | "chi_minh";
};

function orgPublicHref(
  loai: MembershipMilestoneOrgLoai,
  slug: string,
): string | null {
  if (loai === "co_so_dao_tao") return `/co-so/${encodeURIComponent(slug)}`;
  if (loai === "truong_dai_hoc") return truongRootPath(slug);
  if (loai === "studio") return `/studio/${encodeURIComponent(slug)}`;
  return null;
}

export function parseMembershipMilestonePayload(
  raw: string | null | undefined,
): MembershipMilestonePayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as MembershipMilestonePayload & {
      visibility?: MembershipMilestonePayload["visibilityAfterVerify"];
    };
    if (parsed?.kind !== MEMBERSHIP_MILESTONE_KIND) return null;
    if (!parsed.visibilityAfterVerify && parsed.visibility) {
      parsed.visibilityAfterVerify = parsed.visibility;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function loadMembershipPendingMetaForCotMocs(
  admin: ReturnType<typeof createServiceRoleClient>,
  cotMocIds: string[],
): Promise<Map<string, MembershipPendingMeta>> {
  const out = new Map<string, MembershipPendingMeta>();
  if (cotMocIds.length === 0) return out;

  const { data: rows } = await admin
    .from("verify_yeu_cau")
    .select("id, id_cot_moc, noi_dung, tao_luc")
    .in("id_cot_moc", cotMocIds)
    .eq("trang_thai", "cho_xu_ly")
    .returns<
      Array<{
        id: string;
        id_cot_moc: string;
        noi_dung: string | null;
        tao_luc: string;
      }>
    >();

  for (const row of rows ?? []) {
    const payload = parseMembershipMilestonePayload(row.noi_dung);
    const org = payload?.slots.to_chuc;
    if (!payload || !org) continue;
    out.set(row.id_cot_moc, {
      requestId: row.id,
      submittedAt: row.tao_luc,
      orgTen: org.ten,
      orgSlug: org.slug,
      orgLoai: org.loaiToChuc,
      orgAvatarUrl: org.avatarUrl,
      orgHref: orgPublicHref(org.loaiToChuc, org.slug),
      visibilityAfterVerify: payload.visibilityAfterVerify ?? "public",
    });
  }

  return out;
}

/** Yêu cầu membership user gửi đi — hiển thị banner «Việc cần xác nhận» trên Journey. */
export async function loadOutboundMembershipPendingForUser(
  profileId: string,
): Promise<OutboundMembershipPending[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("verify_yeu_cau")
    .select("id, id_cot_moc, noi_dung, tao_luc")
    .eq("nguoi_yeu_cau", profileId)
    .eq("trang_thai", "cho_xu_ly")
    .returns<
      Array<{
        id: string;
        id_cot_moc: string | null;
        noi_dung: string | null;
        tao_luc: string;
      }>
    >();

  const out: OutboundMembershipPending[] = [];
  for (const row of rows ?? []) {
    const payload = parseMembershipMilestonePayload(row.noi_dung);
    const org = payload?.slots.to_chuc;
    if (!payload || !org || !row.id_cot_moc) continue;
    out.push({
      cotMocId: row.id_cot_moc,
      requestId: row.id,
      title: payload.tieuDe,
      body: payload.moTa || null,
      orgTen: org.ten,
      orgAvatarUrl: org.avatarUrl,
      orgHref: orgPublicHref(org.loaiToChuc, org.slug),
      submittedAt: row.tao_luc,
    });
  }

  out.sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
  return out;
}

async function resolveMembershipContextIds(
  admin: ReturnType<typeof createServiceRoleClient>,
  recipeId: PhraseRecipeId,
  recipe: PhraseRecipe,
  slots: MembershipMilestoneSlotValues,
  org: { id: string; loai_to_chuc: string },
): Promise<
  | { ok: true; idKhoaHoc: string | null; idTruongNganh: string | null }
  | { ok: false; error: string; field?: string }
> {
  let idKhoaHoc: string | null = null;
  let idTruongNganh: string | null = null;

  if (recipe.id === "bat_dau_lam") {
    const viTri = slots.vi_tri?.value?.trim();
    if (!viTri || viTri.length > 80) {
      return { ok: false, error: "Nhập vị trí (tối đa 80 ký tự).", field: "vi_tri" };
    }
    return { ok: true, idKhoaHoc, idTruongNganh };
  }

  if (recipeId === "bat_dau_hoc" || recipeId === "hoan_thanh_khoa") {
    const startHoc = recipeId === "bat_dau_hoc" && isHocStartAction(slots.hanh_dong?.value);
    if (startHoc && !slots.vai_tro?.value) {
      return { ok: false, error: "Chọn vai trò.", field: "vai_tro" };
    }
    if (!slots.context?.id) {
      const msg =
        org.loai_to_chuc === "co_so_dao_tao" ? "Chọn khóa học." : "Chọn ngành.";
      return { ok: false, error: msg, field: "context" };
    }
    const attach = await loadOrgAttachOptions(org.id);
    if (!attach.ok) return { ok: false, error: attach.error };
    const match = attach.options.find((o) => o.id === slots.context!.id);
    if (!match) {
      return { ok: false, error: "Ngành/khóa không thuộc tổ chức này." };
    }
    if (org.loai_to_chuc === "co_so_dao_tao") idKhoaHoc = match.id;
    else idTruongNganh = match.id;
  }

  return { ok: true, idKhoaHoc, idTruongNganh };
}

function validEvidence(rows: OrgAttachEvidence[]): boolean {
  return rows.some((r) => {
    if (r.kind === "file") return Boolean(r.href?.trim());
    if (r.kind === "link") return Boolean(r.href?.trim());
    return Boolean(r.detail?.trim() || r.label?.trim());
  });
}

export async function searchOrgsForMembershipMilestone(
  query: string,
  recipeId: PhraseRecipeId,
  viewerId: string | null,
): Promise<MembershipMilestoneSearchHit[]> {
  const recipe = MILESTONE_PHRASE_RECIPES[recipeId];
  if (!recipe) return [];

  const q = query.trim();
  if (q.length < 1) return [];

  const admin = createServiceRoleClient();
  const pattern = `%${q.replace(/[%_]/g, "")}%`;

  const { data: orgs } = await admin
    .from("org_to_chuc")
    .select("id, ten, slug, loai_to_chuc, avatar_id")
    .in("loai_to_chuc", [...recipe.orgLoai])
    .or(`ten.ilike.${pattern},slug.ilike.${pattern}`)
    .limit(24)
    .returns<
      Array<{
        id: string;
        ten: string;
        slug: string;
        loai_to_chuc: string;
        avatar_id: string | null;
      }>
    >();

  if (!orgs?.length) return [];

  let followed = new Set<string>();
  if (viewerId) {
    const orgIds = orgs.map((o) => o.id);
    const { data: followRows } = await admin
      .from("user_theo_doi")
      .select("id_doi_tuong")
      .eq("id_nguoi_theo_doi", viewerId)
      .eq("loai_doi_tuong", "to_chuc")
      .in("id_doi_tuong", orgIds)
      .returns<Array<{ id_doi_tuong: string }>>();
    followed = new Set((followRows ?? []).map((r) => r.id_doi_tuong));
  }

  const hits: MembershipMilestoneSearchHit[] = orgs.map((o) => ({
    id: o.id,
    ten: o.ten,
    slug: o.slug,
    loaiToChuc: o.loai_to_chuc as MembershipMilestoneSearchHit["loaiToChuc"],
    avatarUrl: getAvatarUrl(o.avatar_id),
    dangTheoDoi: followed.has(o.id),
  }));

  hits.sort((a, b) => {
    if (a.dangTheoDoi !== b.dangTheoDoi) return a.dangTheoDoi ? -1 : 1;
    return a.ten.localeCompare(b.ten, "vi");
  });

  return hits;
}

export async function submitMembershipMilestone(
  input: SubmitMembershipMilestoneInput,
): Promise<SubmitMembershipMilestoneResult> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }
  if (session.profile.slug !== input.ownerSlug) {
    return { ok: false, error: "Bạn không có quyền tạo cột mốc cho user khác." };
  }

  if (!MILESTONE_PHRASE_RECIPES[input.recipeId]) {
    return { ok: false, error: "Loại cột mốc không hợp lệ.", field: "recipeId" };
  }

  const slots = input.slots;
  const recipe = getEffectivePhraseRecipe(input.recipeId, slots);
  if (!slots.to_chuc?.id) {
    return { ok: false, error: "Chọn tổ chức.", field: "to_chuc" };
  }
  if (!slots.thoi_diem) {
    return { ok: false, error: "Chọn tháng/năm.", field: "thoi_diem" };
  }
  if (!validEvidence(input.evidence)) {
    return { ok: false, error: "Cần ít nhất một mục bằng chứng.", field: "evidence" };
  }

  const admin = createServiceRoleClient();

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("id, ten, slug, loai_to_chuc")
    .eq("id", slots.to_chuc.id)
    .maybeSingle<{ id: string; ten: string; slug: string; loai_to_chuc: string }>();

  if (!org?.id || !recipe.orgLoai.includes(org.loai_to_chuc as (typeof recipe.orgLoai)[number])) {
    return { ok: false, error: "Tổ chức không hợp lệ cho loại cột mốc này." };
  }

  let idKhoaHoc: string | null = null;
  let idTruongNganh: string | null = null;

  const ctx = await resolveMembershipContextIds(
    admin,
    input.recipeId,
    recipe,
    slots,
    org,
  );
  if (!ctx.ok) return { ok: false, error: ctx.error, field: ctx.field };
  idKhoaHoc = ctx.idKhoaHoc;
  idTruongNganh = ctx.idTruongNganh;

  if (!slots.hanh_dong?.value) {
    return { ok: false, error: "Chọn hành động.", field: "hanh_dong" };
  }

  const tieuDe = assembleMilestoneTitle(recipe, slots);
  const moTa = assembleMilestoneMoTa(recipe, slots);
  const thoiDiem = thoiDiemIsoFromSlot(slots.thoi_diem);

  const visibilityAfterVerify = input.visibilityAfterVerify;
  if (!["public", "theo_nhom", "chi_minh"].includes(visibilityAfterVerify)) {
    return { ok: false, error: "Quyền hiển thị không hợp lệ." };
  }

  const { data: pendingRows } = await admin
    .from("verify_yeu_cau")
    .select("id, noi_dung")
    .eq("nguoi_yeu_cau", session.profile.id)
    .eq("id_to_chuc", org.id)
    .eq("trang_thai", "cho_xu_ly");

  const hasMembershipPending = (pendingRows ?? []).some((row) => {
    try {
      const parsed = JSON.parse(row.noi_dung ?? "") as { kind?: string };
      return parsed.kind === MEMBERSHIP_MILESTONE_KIND;
    } catch {
      return false;
    }
  });

  if (hasMembershipPending) {
    return {
      ok: false,
      error: "Bạn đã có yêu cầu cột mốc chờ duyệt với tổ chức này.",
    };
  }

  const { data: cotMoc, error: cotErr } = await admin
    .from("content_cot_moc")
    .insert({
      id_nguoi_dung: session.profile.id,
      loai_moc: recipe.loaiMoc,
      nguon_goc: "tu_tao",
      tieu_de: tieuDe.slice(0, 200),
      mo_ta: moTa,
      thoi_diem: thoiDiem,
      che_do_hien_thi: "chi_minh",
      id_to_chuc: org.id,
      id_khoa_hoc: idKhoaHoc,
      id_truong_nganh: idTruongNganh,
    })
    .select("id")
    .single<{ id: string }>();

  if (cotErr || !cotMoc) {
    return { ok: false, error: cotErr?.message ?? "Không tạo được cột mốc." };
  }

  const payload: MembershipMilestonePayload = {
    kind: MEMBERSHIP_MILESTONE_KIND,
    recipeId: input.recipeId,
    loaiMoc: recipe.loaiMoc,
    tieuDe,
    moTa,
    slots,
    evidence: input.evidence,
    visibilityAfterVerify,
  };

  const { data: yeuCau, error: yeuCauErr } = await admin
    .from("verify_yeu_cau")
    .insert({
      nguoi_yeu_cau: session.profile.id,
      id_cot_moc: cotMoc.id,
      id_to_chuc: org.id,
      noi_dung: JSON.stringify(payload),
      trang_thai: "cho_xu_ly",
    })
    .select("id")
    .single<{ id: string }>();

  if (yeuCauErr || !yeuCau) {
    await admin.from("content_cot_moc").delete().eq("id", cotMoc.id);
    return { ok: false, error: yeuCauErr?.message ?? "Không gửi được yêu cầu duyệt." };
  }

  revalidatePath(`/${input.ownerSlug}`);

  const milestone = await buildMilestoneItemForCotMoc(admin, cotMoc.id);

  return { ok: true, cotMocId: cotMoc.id, milestone: milestone ?? undefined };
}

export async function getMembershipMilestoneForEdit(
  ownerSlug: string,
  cotMocId: string,
): Promise<
  | { ok: true; data: MembershipMilestoneEditData }
  | { ok: false; error: string }
> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile || session.profile.slug !== ownerSlug) {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const { data: cotMoc } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung")
    .eq("id", cotMocId)
    .maybeSingle<{ id: string; id_nguoi_dung: string }>();

  if (!cotMoc?.id || cotMoc.id_nguoi_dung !== session.profile.id) {
    return { ok: false, error: "Không tìm thấy cột mốc." };
  }

  const { data: yeuCau } = await admin
    .from("verify_yeu_cau")
    .select("id, noi_dung")
    .eq("id_cot_moc", cotMocId)
    .eq("trang_thai", "cho_xu_ly")
    .maybeSingle<{ id: string; noi_dung: string | null }>();

  const payload = parseMembershipMilestonePayload(yeuCau?.noi_dung);
  if (!yeuCau?.id || !payload) {
    return { ok: false, error: "Yêu cầu không còn ở trạng thái chờ duyệt." };
  }

  return {
    ok: true,
    data: {
      cotMocId,
      requestId: yeuCau.id,
      recipeId: payload.recipeId,
      slots: payload.slots,
      evidence: payload.evidence,
      visibilityAfterVerify: payload.visibilityAfterVerify ?? "public",
    },
  };
}

export async function updateMembershipMilestone(
  ownerSlug: string,
  cotMocId: string,
  input: Omit<SubmitMembershipMilestoneInput, "ownerSlug">,
): Promise<SubmitMembershipMilestoneResult> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile || session.profile.slug !== ownerSlug) {
    return { ok: false, error: "Không có quyền." };
  }

  const existing = await getMembershipMilestoneForEdit(ownerSlug, cotMocId);
  if (!existing.ok) return { ok: false, error: existing.error };

  if (!MILESTONE_PHRASE_RECIPES[input.recipeId]) {
    return { ok: false, error: "Loại cột mốc không hợp lệ.", field: "recipeId" };
  }

  const slots = input.slots;
  const recipe = getEffectivePhraseRecipe(input.recipeId, slots);
  if (!slots.to_chuc?.id || !slots.thoi_diem) {
    return { ok: false, error: "Thiếu thông tin cột mốc." };
  }
  if (!validEvidence(input.evidence)) {
    return { ok: false, error: "Cần ít nhất một mục bằng chứng.", field: "evidence" };
  }

  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("org_to_chuc")
    .select("id, ten, slug, loai_to_chuc")
    .eq("id", slots.to_chuc.id)
    .maybeSingle<{ id: string; ten: string; slug: string; loai_to_chuc: string }>();

  if (!org?.id || !recipe.orgLoai.includes(org.loai_to_chuc as (typeof recipe.orgLoai)[number])) {
    return { ok: false, error: "Tổ chức không hợp lệ." };
  }

  const ctx = await resolveMembershipContextIds(
    admin,
    input.recipeId,
    recipe,
    slots,
    org,
  );
  if (!ctx.ok) return { ok: false, error: ctx.error, field: ctx.field };

  const visibilityAfterVerify = input.visibilityAfterVerify;
  if (!["public", "theo_nhom", "chi_minh"].includes(visibilityAfterVerify)) {
    return { ok: false, error: "Quyền hiển thị không hợp lệ." };
  }

  const tieuDe = assembleMilestoneTitle(recipe, slots);
  const moTa = assembleMilestoneMoTa(recipe, slots);
  const thoiDiem = thoiDiemIsoFromSlot(slots.thoi_diem);

  const payload: MembershipMilestonePayload = {
    kind: MEMBERSHIP_MILESTONE_KIND,
    recipeId: input.recipeId,
    loaiMoc: recipe.loaiMoc,
    tieuDe,
    moTa,
    slots,
    evidence: input.evidence,
    visibilityAfterVerify,
  };

  const { error: cotErr } = await admin
    .from("content_cot_moc")
    .update({
      loai_moc: recipe.loaiMoc,
      tieu_de: tieuDe.slice(0, 200),
      mo_ta: moTa,
      thoi_diem: thoiDiem,
      che_do_hien_thi: "chi_minh",
      id_to_chuc: org.id,
      id_khoa_hoc: ctx.idKhoaHoc,
      id_truong_nganh: ctx.idTruongNganh,
    })
    .eq("id", cotMocId)
    .eq("id_nguoi_dung", session.profile.id);

  if (cotErr) return { ok: false, error: cotErr.message };

  const { error: reqErr } = await admin
    .from("verify_yeu_cau")
    .update({ noi_dung: JSON.stringify(payload), id_to_chuc: org.id })
    .eq("id", existing.data.requestId)
    .eq("trang_thai", "cho_xu_ly");

  if (reqErr) return { ok: false, error: reqErr.message };

  revalidatePath(`/${ownerSlug}`);
  const milestone = await buildMilestoneItemForCotMoc(admin, cotMocId);
  return { ok: true, cotMocId, milestone: milestone ?? undefined };
}
