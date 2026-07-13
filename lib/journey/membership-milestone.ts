import "server-only";

import { revalidatePath } from "next/cache";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { buildMilestoneItemForCotMoc } from "@/lib/journey/milestones-fetch";
import {
  assembleMilestoneMoTa,
  assembleMilestoneTitle,
  assembleVerifiedMembershipMoTa,
  getEffectivePhraseRecipe,
  isHocStartAction,
  isLamViecStartAction,
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
  type OrgMembershipMilestoneRequestItem,
  type SubmitMembershipMilestoneInput,
} from "@/lib/journey/membership-milestone-types";
import type { OrgAttachEvidence } from "@/lib/journey/org-milestone-tag-types";
import { loadOrgAttachOptions } from "@/lib/journey/org-milestone-tag";
import { getAvatarUrl } from "@/lib/journey/profile";
import { notifyMembershipMilestoneResolved } from "@/lib/social/membership-milestone-notify";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { orgPublicHref as buildOrgPublicHref } from "@/lib/search/helpers";

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
  if (loai === "co_so_dao_tao" || loai === "truong_dai_hoc" || loai === "studio") {
    return buildOrgPublicHref(loai, slug);
  }
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

export type MembershipMilestoneCotMocContext = {
  pending: MembershipPendingMeta | null;
  /** Org đã duyệt qua `verify_yeu_cau` membership — không phải cột mốc tạo org. */
  approved: boolean;
  recipeId?: PhraseRecipeId;
  orgId?: string;
  /** Thời điểm user gửi yêu cầu xác thực (`verify_yeu_cau.tao_luc`). */
  submittedAt?: string;
};

function membershipMetaFromVerifyRow(row: {
  id: string;
  id_cot_moc: string;
  noi_dung: string | null;
  tao_luc: string;
}): {
  meta: MembershipPendingMeta;
  recipeId: PhraseRecipeId;
  orgId: string;
} | null {
  const payload = parseMembershipMilestonePayload(row.noi_dung);
  const org = payload?.slots.to_chuc;
  if (!payload || !org) return null;
  return {
    meta: {
      requestId: row.id,
      submittedAt: row.tao_luc,
      orgTen: org.ten,
      orgSlug: org.slug,
      orgLoai: org.loaiToChuc,
      orgAvatarUrl: org.avatarUrl,
      orgHref: orgPublicHref(org.loaiToChuc, org.slug),
      visibilityAfterVerify: payload.visibilityAfterVerify ?? "public",
    },
    recipeId: payload.recipeId,
    orgId: org.id,
  };
}

/** Trạng thái membership theo cot_moc — pending + đã duyệt (mọi trạng thái verify_yeu_cau). */
export async function loadMembershipMilestoneContextForCotMocs(
  admin: ReturnType<typeof createServiceRoleClient>,
  cotMocIds: string[],
): Promise<Map<string, MembershipMilestoneCotMocContext>> {
  const out = new Map<string, MembershipMilestoneCotMocContext>();
  if (cotMocIds.length === 0) return out;

  const { data: rows } = await admin
    .from("verify_yeu_cau")
    .select("id, id_cot_moc, noi_dung, tao_luc, trang_thai")
    .in("id_cot_moc", cotMocIds)
    .returns<
      Array<{
        id: string;
        id_cot_moc: string;
        noi_dung: string | null;
        tao_luc: string;
        trang_thai: string;
      }>
    >();

  for (const row of rows ?? []) {
    const parsed = membershipMetaFromVerifyRow(row);
    if (!parsed) continue;
    const prev = out.get(row.id_cot_moc) ?? { pending: null, approved: false };
    prev.recipeId = parsed.recipeId;
    prev.orgId = parsed.orgId;
    prev.submittedAt = parsed.meta.submittedAt;
    if (row.trang_thai === "cho_xu_ly") {
      prev.pending = parsed.meta;
    } else if (row.trang_thai === "da_duyet") {
      prev.approved = true;
    }
    out.set(row.id_cot_moc, prev);
  }

  return out;
}

/** Giữ bản mới nhất khi user gửi trùng recipe + org (dữ liệu cũ). */
export function dedupeMembershipCotMocs<T extends { id: string; tao_luc: string | null }>(
  cotMocs: T[],
  membershipContextByMoc: Map<string, MembershipMilestoneCotMocContext>,
): T[] {
  const latestIdByKey = new Map<string, string>();
  const cotById = new Map(cotMocs.map((m) => [m.id, m]));

  for (const m of cotMocs) {
    const ctx = membershipContextByMoc.get(m.id);
    if (!ctx?.recipeId || !ctx.orgId) continue;
    const key = `${ctx.recipeId}:${ctx.orgId}`;
    const prevId = latestIdByKey.get(key);
    if (!prevId) {
      latestIdByKey.set(key, m.id);
      continue;
    }
    const prev = cotById.get(prevId);
    const prevTime = new Date(prev?.tao_luc ?? 0).getTime();
    const curTime = new Date(m.tao_luc ?? 0).getTime();
    if (curTime >= prevTime) latestIdByKey.set(key, m.id);
  }

  const keepIds = new Set(latestIdByKey.values());
  return cotMocs.filter((m) => {
    const ctx = membershipContextByMoc.get(m.id);
    if (!ctx?.recipeId || !ctx.orgId) return true;
    return keepIds.has(m.id);
  });
}

export async function loadMembershipPendingMetaForCotMocs(
  admin: ReturnType<typeof createServiceRoleClient>,
  cotMocIds: string[],
): Promise<Map<string, MembershipPendingMeta>> {
  const ctx = await loadMembershipMilestoneContextForCotMocs(admin, cotMocIds);
  const out = new Map<string, MembershipPendingMeta>();
  for (const [id, row] of ctx) {
    if (row.pending) out.set(id, row.pending);
  }
  return out;
}

/** Cot mốc membership đang chờ org duyệt — luôn hiện trên timeline owner (kể cả khi lọc nhãn). */
export async function loadPendingMembershipCotMocIdsForUser(
  profileId: string,
): Promise<Set<string>> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("verify_yeu_cau")
    .select("id_cot_moc, noi_dung")
    .eq("nguoi_yeu_cau", profileId)
    .eq("trang_thai", "cho_xu_ly")
    .returns<Array<{ id_cot_moc: string | null; noi_dung: string | null }>>();

  const ids = new Set<string>();
  for (const row of rows ?? []) {
    if (!row.id_cot_moc) continue;
    if (parseMembershipMilestonePayload(row.noi_dung)) {
      ids.add(row.id_cot_moc);
    }
  }
  return ids;
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
  const latestByKey = new Map<string, OutboundMembershipPending>();
  for (const row of rows ?? []) {
    const payload = parseMembershipMilestonePayload(row.noi_dung);
    const org = payload?.slots.to_chuc;
    if (!payload || !org || !row.id_cot_moc) continue;
    const item: OutboundMembershipPending = {
      cotMocId: row.id_cot_moc,
      requestId: row.id,
      title: payload.tieuDe,
      body: payload.moTa || null,
      orgTen: org.ten,
      orgAvatarUrl: org.avatarUrl,
      orgHref: orgPublicHref(org.loaiToChuc, org.slug),
      submittedAt: row.tao_luc,
    };
    const key = `${payload.recipeId}:${org.id}`;
    const prev = latestByKey.get(key);
    if (
      !prev ||
      new Date(item.submittedAt).getTime() > new Date(prev.submittedAt).getTime()
    ) {
      latestByKey.set(key, item);
    }
  }

  out.push(...latestByKey.values());

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
    const hd = slots.hanh_dong?.value;
    const startHoc = recipeId === "bat_dau_hoc" && isHocStartAction(hd);
    const startLam = recipeId === "bat_dau_hoc" && isLamViecStartAction(hd);
    if ((startHoc || startLam) && !slots.vai_tro?.value) {
      return { ok: false, error: "Chọn vai trò.", field: "vai_tro" };
    }
    if (startLam) {
      return { ok: true, idKhoaHoc, idTruongNganh };
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
    .select("id, noi_dung, trang_thai")
    .eq("nguoi_yeu_cau", session.profile.id)
    .eq("id_to_chuc", org.id)
    .in("trang_thai", ["cho_xu_ly", "da_duyet"]);

  for (const row of pendingRows ?? []) {
    const parsed = parseMembershipMilestonePayload(row.noi_dung);
    if (!parsed) continue;
    if (parsed.recipeId === input.recipeId) {
      const label =
        row.trang_thai === "cho_xu_ly"
          ? "đang chờ duyệt"
          : "đã được xác thực";
      return {
        ok: false,
        error: `Bạn đã có cột mốc loại này với ${org.ten} (${label}).`,
      };
    }
    if (row.trang_thai === "cho_xu_ly") {
      return {
        ok: false,
        error: "Bạn đã có yêu cầu cột mốc chờ duyệt với tổ chức này.",
      };
    }
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

type DbMembershipYeuCauRow = {
  id: string;
  nguoi_yeu_cau: string;
  id_cot_moc: string;
  id_to_chuc: string;
  noi_dung: string | null;
  trang_thai: string;
  tao_luc: string;
  xu_ly_luc?: string | null;
};

function mapMembershipRequestStatus(raw: string): OrgMembershipMilestoneRequestItem["status"] {
  if (raw === "da_duyet") return "approved";
  if (raw === "tu_choi") return "rejected";
  return "pending";
}

function visibilityLabel(
  value: MembershipMilestonePayload["visibilityAfterVerify"],
): string {
  if (value === "public") return "Công khai";
  if (value === "theo_nhom") return "Bạn bè";
  return "Chỉ mình tôi";
}

export function summarizeMembershipPayload(
  payload: MembershipMilestonePayload,
): string[] {
  const lines: string[] = [];
  const slots = payload.slots;
  if (slots.hanh_dong?.label) lines.push(`Hành động: ${slots.hanh_dong.label}`);
  if (slots.vai_tro?.label) lines.push(`Vai trò: ${slots.vai_tro.label}`);
  if (slots.vi_tri?.value?.trim()) lines.push(`Vị trí: ${slots.vi_tri.value.trim()}`);
  if (slots.context?.label) lines.push(`Ngành / khóa: ${slots.context.label}`);
  if (slots.thoi_diem) {
    lines.push(`Thời điểm: ${slots.thoi_diem.month}/${slots.thoi_diem.year}`);
  }
  lines.push(`Hiển thị sau duyệt: ${visibilityLabel(payload.visibilityAfterVerify)}`);
  return lines;
}

function membershipRowToRequestItem(
  row: DbMembershipYeuCauRow,
  profileByUserId: Map<
    string,
    { slug: string; ten_hien_thi: string | null; avatar_id: string | null }
  >,
): OrgMembershipMilestoneRequestItem | null {
  const payload = parseMembershipMilestonePayload(row.noi_dung);
  if (!payload) return null;

  const profile = profileByUserId.get(row.nguoi_yeu_cau);
  const studentName =
    profile?.ten_hien_thi?.trim() || profile?.slug?.trim() || "User";

  return {
    id: row.id,
    status: mapMembershipRequestStatus(row.trang_thai),
    submittedAt: row.tao_luc,
    reviewedAt: row.xu_ly_luc ?? null,
    cotMocId: row.id_cot_moc,
    studentUserId: row.nguoi_yeu_cau,
    studentName,
    studentSlug: profile?.slug ?? "",
    studentAvatarUrl: getAvatarUrl(profile?.avatar_id ?? null),
    recipeId: payload.recipeId,
    loaiMoc: payload.loaiMoc,
    title: payload.tieuDe,
    body: payload.moTa || null,
    contextLabel: payload.slots.context?.label ?? null,
    visibilityAfterVerify: payload.visibilityAfterVerify ?? "public",
    slotSummary: summarizeMembershipPayload(payload),
    evidence: payload.evidence,
  };
}

function mapSlotToOrgVaiTro(payload: MembershipMilestonePayload): string {
  const slotRole = payload.slots.vai_tro?.value;
  if (slotRole === "hoc_vien" || slotRole === "sinh_vien" || slotRole === "hoc_bong") {
    return "hoc_vien";
  }
  if (
    slotRole === "giao_vien" ||
    slotRole === "nhan_vien" ||
    slotRole === "quan_ly_noi_dung" ||
    slotRole === "quan_ly_tuyen_sinh"
  ) {
    return slotRole;
  }
  if (payload.recipeId === "bat_dau_lam") return "nhan_vien";
  return "thanh_vien";
}

function shouldUpsertOrgMembership(payload: MembershipMilestonePayload): boolean {
  if (payload.recipeId === "bat_dau_lam") return true;
  if (payload.recipeId === "bat_dau_hoc") {
    const hd = payload.slots.hanh_dong?.value;
    return isHocStartAction(hd) || isLamViecStartAction(hd);
  }
  return false;
}

async function upsertVerifiedOrgMembership(params: {
  admin: ReturnType<typeof createServiceRoleClient>;
  orgId: string;
  userId: string;
  payload: MembershipMilestonePayload;
  cotMocId: string;
}): Promise<void> {
  if (!shouldUpsertOrgMembership(params.payload)) return;

  const { data: cotMoc } = await params.admin
    .from("content_cot_moc")
    .select("id_truong_nganh, thoi_diem")
    .eq("id", params.cotMocId)
    .maybeSingle<{ id_truong_nganh: string | null; thoi_diem: string | null }>();

  const thoiDiem = params.payload.slots.thoi_diem;
  const tuNgay = thoiDiem
    ? `${thoiDiem.year}-${String(thoiDiem.month).padStart(2, "0")}-01`
    : cotMoc?.thoi_diem?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  const { data: existing } = await params.admin
    .from("user_thanh_vien_to_chuc")
    .select("id")
    .eq("id_nguoi_dung", params.userId)
    .eq("id_to_chuc", params.orgId)
    .eq("trang_thai", "active")
    .is("den_ngay", null)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existing?.id) return;

  await params.admin.from("user_thanh_vien_to_chuc").insert({
    id_nguoi_dung: params.userId,
    id_to_chuc: params.orgId,
    vai_tro: mapSlotToOrgVaiTro(params.payload),
    trang_thai: "active",
    tu_ngay: tuNgay,
    nam_bat_dau: thoiDiem?.year ?? null,
    id_nganh: cotMoc?.id_truong_nganh ?? null,
  });
}

export async function listOrgMembershipMilestoneRequests(
  orgId: string,
  viewerId: string,
): Promise<
  | { ok: true; items: OrgMembershipMilestoneRequestItem[] }
  | { ok: false; error: string }
> {
  const { canReviewOrgMilestoneTags } = await import("@/lib/journey/org-milestone-tag");
  if (!(await canReviewOrgMilestoneTags(orgId, viewerId))) {
    return { ok: false, error: "Không có quyền xem yêu cầu." };
  }

  const admin = createServiceRoleClient();
  const { data: rows, error } = await admin
    .from("verify_yeu_cau")
    .select(
      "id, nguoi_yeu_cau, id_cot_moc, id_to_chuc, noi_dung, trang_thai, tao_luc, xu_ly_luc",
    )
    .eq("id_to_chuc", orgId)
    .order("tao_luc", { ascending: false })
    .returns<DbMembershipYeuCauRow[]>();

  if (error) return { ok: false, error: error.message };

  const membershipRows = (rows ?? []).filter((row) =>
    Boolean(parseMembershipMilestonePayload(row.noi_dung)),
  );

  const userIds = [...new Set(membershipRows.map((row) => row.nguoi_yeu_cau))];
  const profileByUserId = new Map<
    string,
    { slug: string; ten_hien_thi: string | null; avatar_id: string | null }
  >();

  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id")
      .in("id", userIds)
      .returns<
        Array<{
          id: string;
          slug: string;
          ten_hien_thi: string | null;
          avatar_id: string | null;
        }>
      >();
    for (const profile of profiles ?? []) {
      profileByUserId.set(profile.id, profile);
    }
  }

  const items = membershipRows
    .map((row) => membershipRowToRequestItem(row, profileByUserId))
    .filter((item): item is OrgMembershipMilestoneRequestItem => item !== null);

  return { ok: true, items };
}

export async function respondOrgMembershipMilestoneRequest(params: {
  orgId: string;
  requestId: string;
  viewerId: string;
  action: "approve" | "reject";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { canReviewOrgMilestoneTags, orgPublicPath } = await import(
    "@/lib/journey/org-milestone-tag"
  );
  if (!(await canReviewOrgMilestoneTags(params.orgId, params.viewerId))) {
    return { ok: false, error: "Không có quyền duyệt." };
  }

  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("verify_yeu_cau")
    .select(
      "id, trang_thai, id_to_chuc, id_cot_moc, nguoi_yeu_cau, noi_dung",
    )
    .eq("id", params.requestId)
    .eq("id_to_chuc", params.orgId)
    .maybeSingle<{
      id: string;
      trang_thai: string;
      id_to_chuc: string;
      id_cot_moc: string;
      nguoi_yeu_cau: string;
      noi_dung: string | null;
    }>();

  if (!row?.id) return { ok: false, error: "Không tìm thấy yêu cầu." };

  const payload = parseMembershipMilestonePayload(row.noi_dung);
  if (!payload) {
    return { ok: false, error: "Yêu cầu không phải cột mốc danh tính." };
  }

  if (row.trang_thai !== "cho_xu_ly") {
    return { ok: false, error: "Yêu cầu đã được xử lý." };
  }

  const now = new Date().toISOString();

  if (params.action === "reject") {
    const { error } = await admin
      .from("verify_yeu_cau")
      .update({
        trang_thai: "tu_choi",
        nguoi_xu_ly: params.viewerId,
        xu_ly_luc: now,
      })
      .eq("id", params.requestId);

    if (error) return { ok: false, error: error.message };

    const { data: profile } = await admin
      .from("user_nguoi_dung")
      .select("slug")
      .eq("id", row.nguoi_yeu_cau)
      .maybeSingle<{ slug: string }>();

    const orgSlot = payload.slots.to_chuc;
    if (profile?.slug && orgSlot) {
      await notifyMembershipMilestoneResolved({
        studentId: row.nguoi_yeu_cau,
        studentSlug: profile.slug,
        cotMocId: row.id_cot_moc,
        requestId: params.requestId,
        action: "rejected",
        orgTen: orgSlot.ten,
        orgSlug: orgSlot.slug,
        orgLoai: orgSlot.loaiToChuc,
        milestoneTitle: payload.tieuDe,
      });
    }

    if (profile?.slug) revalidatePath(`/${profile.slug}`);

    return { ok: true };
  }

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("slug, loai_to_chuc")
    .eq("id", params.orgId)
    .maybeSingle<{ slug: string; loai_to_chuc: string }>();

  const orgLoai = org?.loai_to_chuc;
  const orgPath =
    orgLoai === "co_so_dao_tao" ||
    orgLoai === "truong_dai_hoc" ||
    orgLoai === "studio"
      ? org?.slug
        ? buildOrgPublicHref(orgLoai, org.slug)
        : null
      : null;

  const recipe = getEffectivePhraseRecipe(payload.recipeId, payload.slots);
  const verifiedMoTa = assembleVerifiedMembershipMoTa(recipe, payload.slots);

  const { error: mocErr } = await admin
    .from("content_cot_moc")
    .update({
      che_do_hien_thi: payload.visibilityAfterVerify ?? "public",
      mo_ta: verifiedMoTa,
    })
    .eq("id", row.id_cot_moc)
    .eq("id_nguoi_dung", row.nguoi_yeu_cau);

  if (mocErr) return { ok: false, error: mocErr.message };

  const { data: existingVerify } = await admin
    .from("verify_xac_nhan")
    .select("id")
    .eq("id_cot_moc", row.id_cot_moc)
    .eq("trang_thai", "da_xac_nhan")
    .maybeSingle<{ id: string }>();

  if (!existingVerify?.id) {
    const { error: verifyErr } = await admin.from("verify_xac_nhan").insert({
      id_cot_moc: row.id_cot_moc,
      loai_nguoi_xac_nhan: "to_chuc",
      id_nguoi_xac_nhan: params.viewerId,
      trang_thai: "da_xac_nhan",
      url_proof: orgPath,
      bang_chung: row.id,
      xu_ly_luc: now,
    });
    if (verifyErr) return { ok: false, error: verifyErr.message };
  }

  await upsertVerifiedOrgMembership({
    admin,
    orgId: params.orgId,
    userId: row.nguoi_yeu_cau,
    payload,
    cotMocId: row.id_cot_moc,
  });

  const { error } = await admin
    .from("verify_yeu_cau")
    .update({
      trang_thai: "da_duyet",
      nguoi_xu_ly: params.viewerId,
      xu_ly_luc: now,
    })
    .eq("id", params.requestId);

  if (error) return { ok: false, error: error.message };

  const { data: profile } = await admin
    .from("user_nguoi_dung")
    .select("slug")
    .eq("id", row.nguoi_yeu_cau)
    .maybeSingle<{ slug: string }>();

  const orgSlot = payload.slots.to_chuc;
  if (profile?.slug && orgSlot) {
    await notifyMembershipMilestoneResolved({
      studentId: row.nguoi_yeu_cau,
      studentSlug: profile.slug,
      cotMocId: row.id_cot_moc,
      requestId: params.requestId,
      action: "approved",
      orgTen: orgSlot.ten,
      orgSlug: orgSlot.slug,
      orgLoai: orgSlot.loaiToChuc,
      milestoneTitle: payload.tieuDe,
    });
  }

  if (profile?.slug) revalidatePath(`/${profile.slug}`);
  if (org?.slug) {
    if (orgLoai === "co_so_dao_tao") {
      revalidatePath(`/co-so/${org.slug}`);
    } else if (orgLoai === "truong_dai_hoc") {
      revalidatePath(truongRootPath(org.slug));
    }
  }

  return { ok: true };
}
