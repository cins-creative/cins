import "server-only";

import {
  buildBunnyVideoMp4Url as buildBunnyVideoMp4UrlServer,
  buildBunnyVideoThumbnailUrl as buildBunnyVideoThumbnailUrlServer,
} from "@/lib/bunny/thumbnail";
import { journeyImageFields } from "@/lib/journey/images";
import { parseServerBlocks } from "@/lib/journey/parse-server-blocks";
import { resolvePostGridEntry } from "@/lib/journey/post-content-kind";
import { getAvatarUrl } from "@/lib/journey/profile";
import {
  ORG_MILESTONE_TAG_KIND,
  type OrgAttachEvidence,
  type OrgAttachOption,
  type OrgDoanProjectItem,
  type OrgMilestoneTagAlbum,
  type OrgMilestoneTagPayload,
  type OrgMilestoneTagRequestItem,
  type OrgMilestoneTagOwnerItem,
  type OrgMilestoneTagStatus,
  type OrgSearchHit,
} from "@/lib/journey/org-milestone-tag-types";
import { setDiemVerifyChoCotMoc } from "@/lib/cins/feed-scoring-write";
import { notifyOrgMilestoneTagApproved } from "@/lib/social/org-milestone-tag-notify";
import {
  extractVideoUrl,
  isGalleryVideoCoverSrc,
} from "@/lib/journey/post-media";
import {
  bunnyVideoIdFromBlocks,
  resolveBunnyEmbed,
} from "@/lib/journey/video-embed";
import { isCoSoOrgAdmin } from "@/lib/to-chuc/co-so-membership";
import { orgPublicHref } from "@/lib/search/helpers";
import { isTruongOrgAdmin } from "@/lib/truong/org-admin";
import {
  listMonByTruongNganhIds,
  validateMonBelongsToNganh,
} from "@/lib/truong/nganh-mon";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type DoanCoverVisual = {
  coverSrc: string | null;
  isVideo: boolean;
  videoPreviewSrc: string | null;
};

type DoanHrefEntry = {
  cotMocId: string;
  tacPhamId: string;
  studentSlug: string;
};

type DbYeuCauRow = {
  id: string;
  nguoi_yeu_cau: string;
  id_cot_moc: string;
  id_to_chuc: string;
  noi_dung: string | null;
  trang_thai: string;
  tao_luc: string;
  xu_ly_luc?: string | null;
};

const ALLOWED_ORG_LOAI = new Set(["truong_dai_hoc", "co_so_dao_tao"]);

function mapDbStatus(
  raw: string,
  payload?: OrgMilestoneTagPayload | null,
): OrgMilestoneTagStatus {
  if (raw === "da_duyet") return "approved";
  if (raw === "tu_choi") {
    return payload?.unlinkedAt ? "detached" : "rejected";
  }
  return "pending";
}

function dbStatusFromAction(action: "approve" | "reject" | "detach"): string {
  if (action === "approve") return "da_duyet";
  return "tu_choi";
}

export function parseOrgMilestoneTagPayload(
  raw: string | null | undefined,
): OrgMilestoneTagPayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as OrgMilestoneTagPayload;
    if (parsed?.kind !== ORG_MILESTONE_TAG_KIND) return null;
    return parsed;
  } catch {
    return null;
  }
}

function serializePayload(payload: OrgMilestoneTagPayload): string {
  return JSON.stringify(payload);
}

export function doanHienThiSanPham(
  payload: OrgMilestoneTagPayload,
): boolean {
  return payload.hienThiSanPham === true;
}

export function doanDiemSapXep(payload: OrgMilestoneTagPayload): number {
  const n = payload.diemSapXep;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

export type ListOrgDoanProjectsOptions = {
  /** Chỉ bài org đã bật hiển thị tab Sản phẩm. */
  featuredOnly?: boolean;
  khoaHocId?: string | null;
};

export async function canReviewOrgMilestoneTags(
  orgId: string,
  profileId: string,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("org_to_chuc")
    .select("loai_to_chuc")
    .eq("id", orgId)
    .maybeSingle<{ loai_to_chuc: string }>();

  if (!org?.loai_to_chuc || !ALLOWED_ORG_LOAI.has(org.loai_to_chuc)) {
    return false;
  }
  if (org.loai_to_chuc === "truong_dai_hoc") {
    return isTruongOrgAdmin(orgId, profileId);
  }
  return isCoSoOrgAdmin(orgId, profileId);
}

export async function searchOrgsForMilestoneTag(
  query: string,
  viewerId: string | null,
): Promise<OrgSearchHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const admin = createServiceRoleClient();
  const pattern = `%${q.replace(/[%_]/g, "")}%`;

  const { data: orgs } = await admin
    .from("org_to_chuc")
    .select("id, ten, slug, loai_to_chuc, avatar_id")
    .in("loai_to_chuc", ["truong_dai_hoc", "co_so_dao_tao"])
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
      .in("id_doi_tuong", orgIds);
    followed = new Set((followRows ?? []).map((r) => r.id_doi_tuong as string));
  }

  const hits: OrgSearchHit[] = orgs
    .filter((o) => ALLOWED_ORG_LOAI.has(o.loai_to_chuc))
    .map((o) => ({
      id: o.id,
      ten: o.ten,
      slug: o.slug,
      loaiToChuc: o.loai_to_chuc as OrgSearchHit["loaiToChuc"],
      avatarUrl: getAvatarUrl(o.avatar_id),
      dangTheoDoi: followed.has(o.id),
    }));

  hits.sort((a, b) => {
    if (a.dangTheoDoi !== b.dangTheoDoi) return a.dangTheoDoi ? -1 : 1;
    return a.ten.localeCompare(b.ten, "vi");
  });

  return hits;
}

export async function loadOrgAttachOptions(
  orgId: string,
): Promise<
  | { ok: true; loaiToChuc: "truong_dai_hoc" | "co_so_dao_tao"; options: OrgAttachOption[] }
  | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("org_to_chuc")
    .select("loai_to_chuc")
    .eq("id", orgId)
    .maybeSingle<{ loai_to_chuc: string }>();

  if (!org?.loai_to_chuc || !ALLOWED_ORG_LOAI.has(org.loai_to_chuc)) {
    return { ok: false, error: "Tổ chức không hỗ trợ gắn milestone." };
  }

  if (org.loai_to_chuc === "co_so_dao_tao") {
    const { data: rows } = await admin
      .from("org_khoa_hoc")
      .select("id, ten_khoa_hoc, slug")
      .eq("id_to_chuc", orgId)
      .order("ten_khoa_hoc", { ascending: true })
      .returns<Array<{ id: string; ten_khoa_hoc: string; slug: string }>>();

    return {
      ok: true,
      loaiToChuc: "co_so_dao_tao",
      options: (rows ?? []).map((r) => ({
        id: r.id,
        label: r.ten_khoa_hoc,
        slug: r.slug,
      })),
    };
  }

  const { data: rows } = await admin
    .from("org_truong_nganh")
    .select("id, ten_chuong_trinh, slug, article_bai_viet:article_bai_viet(tieu_de)")
    .eq("id_to_chuc", orgId)
    .eq("trang_thai_chuong_trinh", "dang_tuyen")
    .order("ten_chuong_trinh", { ascending: true })
    .returns<
      Array<{
        id: string;
        ten_chuong_trinh: string;
        slug: string;
        article_bai_viet: { tieu_de: string | null } | null;
      }>
    >();

  const programIds = (rows ?? []).map((r) => r.id);
  const monByNganh = await listMonByTruongNganhIds(admin, programIds);

  return {
    ok: true,
    loaiToChuc: "truong_dai_hoc",
    options: (rows ?? []).map((r) => ({
      id: r.id,
      label:
        r.ten_chuong_trinh?.trim() ||
        r.article_bai_viet?.tieu_de?.trim() ||
        r.slug,
      slug: r.slug,
      monOptions: (monByNganh.get(r.id) ?? [])
        .filter((m) => !m.ngungDay)
        .map((m) => ({
          id: m.monHocId,
          label: m.label,
          slug: m.slug,
        })),
    })),
  };
}

/** Gắn `mon_hoc` lên cột mốc + tác phẩm để lens trang môn thấy bài. */
async function linkMonHocToMilestone(
  admin: ReturnType<typeof createServiceRoleClient>,
  params: {
    cotMocId: string;
    tacPhamId: string;
    monHocId: string;
  },
): Promise<void> {
  const { cotMocId, tacPhamId, monHocId } = params;
  await admin
    .from("article_gan_cot_moc")
    .upsert(
      { id_bai_viet: monHocId, id_cot_moc: cotMocId },
      { onConflict: "id_bai_viet,id_cot_moc" },
    );

  const tpId = tacPhamId.trim();
  if (!tpId) return;

  const { data: existing } = await admin
    .from("article_gan_tac_pham")
    .select("id_bai_viet")
    .eq("id_bai_viet", monHocId)
    .eq("id_tac_pham", tpId)
    .maybeSingle();

  if (!existing) {
    await admin.from("article_gan_tac_pham").insert({
      id_bai_viet: monHocId,
      id_tac_pham: tpId,
    });
  }
}

export async function submitOrgMilestoneTagRequest(params: {
  viewerId: string;
  cotMocId: string;
  orgId: string;
  nam: number;
  khoaHocId?: string | null;
  nganhId?: string | null;
  monHocId?: string | null;
  evidence: OrgAttachEvidence[];
  album: OrgMilestoneTagAlbum;
  milestoneTitle: string;
  milestoneKind: string;
  projectTitle: string;
  tacPhamId: string;
}): Promise<{ ok: true; requestId: string } | { ok: false; error: string }> {
  if (params.evidence.length === 0) {
    return { ok: false, error: "Cần ít nhất một mục bằng chứng." };
  }
  if (params.nam < 1990 || params.nam > 2100) {
    return { ok: false, error: "Năm không hợp lệ." };
  }

  const admin = createServiceRoleClient();

  const { data: cotMoc } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung, loai_moc")
    .eq("id", params.cotMocId)
    .maybeSingle<{ id: string; id_nguoi_dung: string; loai_moc: string }>();

  if (!cotMoc?.id || cotMoc.id_nguoi_dung !== params.viewerId) {
    return { ok: false, error: "Không có quyền gắn tổ chức cho cột mốc này." };
  }

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("id, ten, slug, loai_to_chuc, avatar_id")
    .eq("id", params.orgId)
    .maybeSingle<{
      id: string;
      ten: string;
      slug: string;
      loai_to_chuc: string;
      avatar_id: string | null;
    }>();

  if (!org?.id || !ALLOWED_ORG_LOAI.has(org.loai_to_chuc)) {
    return { ok: false, error: "Tổ chức không hợp lệ." };
  }

  const { data: profile } = await admin
    .from("user_nguoi_dung")
    .select("slug, ten_hien_thi, avatar_id")
    .eq("id", params.viewerId)
    .maybeSingle<{ slug: string; ten_hien_thi: string | null; avatar_id: string | null }>();

  let khoaHocTen: string | null = null;
  let nganhLabel: string | null = null;
  let monHocId: string | null = null;
  let monHocLabel: string | null = null;

  if (org.loai_to_chuc === "co_so_dao_tao") {
    if (!params.khoaHocId) {
      return { ok: false, error: "Chọn khóa học." };
    }
    const { data: khoa } = await admin
      .from("org_khoa_hoc")
      .select("id, ten_khoa_hoc")
      .eq("id", params.khoaHocId)
      .eq("id_to_chuc", org.id)
      .maybeSingle<{ id: string; ten_khoa_hoc: string }>();
    if (!khoa?.id) return { ok: false, error: "Khóa học không thuộc cơ sở này." };
    khoaHocTen = khoa.ten_khoa_hoc;
  } else {
    if (!params.nganhId) {
      return { ok: false, error: "Chọn ngành / chương trình." };
    }
    const options = await loadOrgAttachOptions(org.id);
    if (!options.ok) return { ok: false, error: options.error };
    const match = options.options.find((o) => o.id === params.nganhId);
    if (!match) return { ok: false, error: "Ngành không thuộc trường này." };
    nganhLabel = match.label;

    const monOptions = match.monOptions ?? [];
    const requestedMon = params.monHocId?.trim() || null;
    if (monOptions.length > 0) {
      if (!requestedMon) {
        return { ok: false, error: "Chọn môn học." };
      }
      const monOk = await validateMonBelongsToNganh(
        admin,
        params.nganhId,
        requestedMon,
      );
      if (!monOk.ok) return monOk;
      monHocId = requestedMon;
      monHocLabel = monOk.label;
    } else if (requestedMon) {
      const monOk = await validateMonBelongsToNganh(
        admin,
        params.nganhId,
        requestedMon,
      );
      if (!monOk.ok) return monOk;
      monHocId = requestedMon;
      monHocLabel = monOk.label;
    }
  }

  const { data: pendingDup } = await admin
    .from("verify_yeu_cau")
    .select("id")
    .eq("id_cot_moc", params.cotMocId)
    .eq("id_to_chuc", org.id)
    .eq("trang_thai", "cho_xu_ly")
    .limit(1)
    .maybeSingle();

  if (pendingDup?.id) {
    return { ok: false, error: "Đã có yêu cầu chờ duyệt cho tổ chức này." };
  }

  const payload: OrgMilestoneTagPayload = {
    kind: ORG_MILESTONE_TAG_KIND,
    tacPhamId: params.tacPhamId,
    orgLoai: org.loai_to_chuc as OrgMilestoneTagPayload["orgLoai"],
    orgTen: org.ten,
    orgSlug: org.slug,
    orgAvatarUrl: getAvatarUrl(org.avatar_id ?? null),
    nam: params.nam,
    khoaHocId: params.khoaHocId ?? null,
    khoaHocTen,
    nganhId: params.nganhId ?? null,
    nganhLabel,
    monHocId,
    monHocLabel,
    milestoneTitle: params.milestoneTitle,
    milestoneKind: params.milestoneKind || cotMoc.loai_moc,
    projectTitle: params.projectTitle,
    studentName: profile?.ten_hien_thi?.trim() || profile?.slug || "User",
    studentSlug: profile?.slug ?? "",
    studentAvatarUrl: getAvatarUrl(profile?.avatar_id ?? null),
    album: {
      ...params.album,
      href: (
        await resolveDoanProjectHrefs(admin, [
          {
            cotMocId: params.cotMocId,
            tacPhamId: params.tacPhamId,
            studentSlug: profile?.slug ?? "",
          },
        ])
      ).get(params.cotMocId) ?? params.album.href,
    },
    evidence: params.evidence,
  };

  const { data: inserted, error } = await admin
    .from("verify_yeu_cau")
    .insert({
      nguoi_yeu_cau: params.viewerId,
      id_cot_moc: params.cotMocId,
      id_to_chuc: org.id,
      noi_dung: serializePayload(payload),
      trang_thai: "cho_xu_ly",
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !inserted?.id) {
    return {
      ok: false,
      error: error?.message ?? "Không gửi được yêu cầu.",
    };
  }

  if (monHocId) {
    await linkMonHocToMilestone(admin, {
      cotMocId: params.cotMocId,
      tacPhamId: params.tacPhamId,
      monHocId,
    });
  }

  return { ok: true, requestId: inserted.id };
}

function rowToRequestItem(
  row: DbYeuCauRow,
  avatarByUserId?: Map<string, string | null>,
): OrgMilestoneTagRequestItem | null {
  const payload = parseOrgMilestoneTagPayload(row.noi_dung);
  if (!payload) return null;
  const studentAvatarUrl =
    avatarByUserId?.get(row.nguoi_yeu_cau) ??
    payload.studentAvatarUrl ??
    null;
  return {
    id: row.id,
    status: mapDbStatus(row.trang_thai, payload),
    taggedAt: row.tao_luc,
    studentUserId: row.nguoi_yeu_cau,
    studentName: payload.studentName,
    studentSlug: payload.studentSlug,
    studentAvatarUrl,
    projectTitle: payload.projectTitle,
    milestoneTitle: payload.milestoneTitle,
    milestoneKind: payload.milestoneKind,
    nganhLabel: payload.nganhLabel ?? null,
    monHocLabel: payload.monHocLabel ?? null,
    khoaHocTen: payload.khoaHocTen ?? null,
    nam: payload.nam,
    album: payload.album,
    evidence: payload.evidence,
  };
}

function rowToOwnerItem(row: DbYeuCauRow): OrgMilestoneTagOwnerItem | null {
  const payload = parseOrgMilestoneTagPayload(row.noi_dung);
  if (!payload) return null;
  return {
    id: row.id,
    status: mapDbStatus(row.trang_thai, payload),
    submittedAt: row.tao_luc,
    reviewedAt: row.xu_ly_luc ?? null,
    orgId: row.id_to_chuc,
    orgTen: payload.orgTen,
    orgSlug: payload.orgSlug,
    orgLoai: payload.orgLoai,
    orgAvatarUrl: payload.orgAvatarUrl ?? null,
    nam: payload.nam,
    khoaHocId: payload.khoaHocId ?? null,
    khoaHocTen: payload.khoaHocTen ?? null,
    nganhId: payload.nganhId ?? null,
    nganhLabel: payload.nganhLabel ?? null,
    monHocId: payload.monHocId ?? null,
    monHocLabel: payload.monHocLabel ?? null,
    milestoneTitle: payload.milestoneTitle,
    projectTitle: payload.projectTitle,
    album: payload.album,
    evidence: payload.evidence,
  };
}

export async function listMilestoneOrgTagRequestsForOwner(params: {
  cotMocId: string;
  viewerId: string;
}): Promise<
  | { ok: true; items: OrgMilestoneTagOwnerItem[] }
  | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();

  const { data: cotMoc } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung")
    .eq("id", params.cotMocId)
    .maybeSingle<{ id: string; id_nguoi_dung: string }>();

  if (!cotMoc?.id || cotMoc.id_nguoi_dung !== params.viewerId) {
    return { ok: false, error: "Không có quyền xem yêu cầu." };
  }

  const { data: rows, error } = await admin
    .from("verify_yeu_cau")
    .select(
      "id, nguoi_yeu_cau, id_cot_moc, id_to_chuc, noi_dung, trang_thai, tao_luc, xu_ly_luc",
    )
    .eq("id_cot_moc", params.cotMocId)
    .eq("nguoi_yeu_cau", params.viewerId)
    .order("tao_luc", { ascending: false })
    .returns<DbYeuCauRow[]>();

  if (error) return { ok: false, error: error.message };

  const items = (rows ?? [])
    .map(rowToOwnerItem)
    .filter((item): item is OrgMilestoneTagOwnerItem => item !== null);

  const orgIds = [...new Set(items.map((item) => item.orgId))];
  let avatarByOrgId = new Map<string, string | null>();
  if (orgIds.length > 0) {
    const { data: orgs } = await admin
      .from("org_to_chuc")
      .select("id, avatar_id")
      .in("id", orgIds)
      .returns<Array<{ id: string; avatar_id: string | null }>>();
    avatarByOrgId = new Map(
      (orgs ?? []).map((org) => [org.id, getAvatarUrl(org.avatar_id)]),
    );
  }

  const enriched = items.map((item) => ({
    ...item,
    orgAvatarUrl: avatarByOrgId.get(item.orgId) ?? item.orgAvatarUrl,
  }));

  return { ok: true, items: enriched };
}

export async function listOrgMilestoneTagRequests(
  orgId: string,
  viewerId: string,
): Promise<
  | { ok: true; items: OrgMilestoneTagRequestItem[] }
  | { ok: false; error: string }
> {
  if (!(await canReviewOrgMilestoneTags(orgId, viewerId))) {
    return { ok: false, error: "Không có quyền xem yêu cầu." };
  }

  const admin = createServiceRoleClient();
  const { data: rows, error } = await admin
    .from("verify_yeu_cau")
    .select("id, nguoi_yeu_cau, id_cot_moc, id_to_chuc, noi_dung, trang_thai, tao_luc")
    .eq("id_to_chuc", orgId)
    .order("tao_luc", { ascending: false })
    .returns<DbYeuCauRow[]>();

  if (error) return { ok: false, error: error.message };

  const userIds = [...new Set((rows ?? []).map((row) => row.nguoi_yeu_cau))];
  let avatarByUserId = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_nguoi_dung")
      .select("id, avatar_id")
      .in("id", userIds)
      .returns<Array<{ id: string; avatar_id: string | null }>>();
    avatarByUserId = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        getAvatarUrl(profile.avatar_id),
      ]),
    );
  }

  const items = (rows ?? [])
    .map((row) => rowToRequestItem(row, avatarByUserId))
    .filter((item): item is OrgMilestoneTagRequestItem => item !== null);

  return { ok: true, items };
}

type RespondOrgMilestoneTagRequestParams = {
  orgId: string;
  requestId: string;
  viewerId: string;
  action: "approve" | "reject" | "detach";
};

async function respondOrgMilestoneTagRequestCore(
  params: RespondOrgMilestoneTagRequestParams,
  requireOrgMembership: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (
    requireOrgMembership &&
    !(await canReviewOrgMilestoneTags(params.orgId, params.viewerId))
  ) {
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

  if (params.action === "detach") {
    if (row.trang_thai !== "da_duyet") {
      return { ok: false, error: "Chỉ có thể gỡ tag đã gắn." };
    }

    const payload = parseOrgMilestoneTagPayload(row.noi_dung);
    if (!payload) {
      return { ok: false, error: "Payload yêu cầu không hợp lệ." };
    }

    const now = new Date().toISOString();
    const updatedPayload: OrgMilestoneTagPayload = { ...payload, unlinkedAt: now };

    const { error: mocErr } = await admin
      .from("content_cot_moc")
      .update({ id_to_chuc: null })
      .eq("id", row.id_cot_moc)
      .eq("id_nguoi_dung", row.nguoi_yeu_cau)
      .eq("id_to_chuc", params.orgId);

    if (mocErr) return { ok: false, error: mocErr.message };

    await admin
      .from("verify_xac_nhan")
      .delete()
      .eq("id_cot_moc", row.id_cot_moc)
      .eq("bang_chung", row.id);

    const { error } = await admin
      .from("verify_yeu_cau")
      .update({
        trang_thai: "tu_choi",
        noi_dung: JSON.stringify(updatedPayload),
        nguoi_xu_ly: params.viewerId,
        xu_ly_luc: now,
      })
      .eq("id", params.requestId);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  if (row.trang_thai !== "cho_xu_ly") {
    return { ok: false, error: "Yêu cầu đã được xử lý." };
  }

  if (params.action === "approve") {
    const payload = parseOrgMilestoneTagPayload(row.noi_dung);
    if (!payload) {
      return { ok: false, error: "Payload yêu cầu không hợp lệ." };
    }

    const now = new Date().toISOString();
    const orgPath = orgPublicPath(payload.orgLoai, payload.orgSlug);

    const { error: mocErr } = await admin
      .from("content_cot_moc")
      .update({ id_to_chuc: params.orgId })
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

    await setDiemVerifyChoCotMoc(row.id_cot_moc);

    if (payload.monHocId?.trim()) {
      await linkMonHocToMilestone(admin, {
        cotMocId: row.id_cot_moc,
        tacPhamId: payload.tacPhamId,
        monHocId: payload.monHocId.trim(),
      });
    }

    await notifyOrgMilestoneTagApproved({
      studentId: row.nguoi_yeu_cau,
      cotMocId: row.id_cot_moc,
      requestId: row.id,
      payload,
    });
  }

  const { error } = await admin
    .from("verify_yeu_cau")
    .update({
      trang_thai: dbStatusFromAction(params.action),
      nguoi_xu_ly: params.viewerId,
      xu_ly_luc: new Date().toISOString(),
    })
    .eq("id", params.requestId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Duyệt tại trang tổ chức — bắt buộc người xử lý quản trị đúng tổ chức. */
export async function respondOrgMilestoneTagRequest(
  params: RespondOrgMilestoneTagRequestParams,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return respondOrgMilestoneTagRequestCore(params, true);
}

/**
 * Duyệt từ hàng đợi Admin toàn hệ thống.
 * Caller bắt buộc gate `canManageUsers` trước khi gọi.
 */
export async function respondAdminOrgMilestoneTagRequest(
  params: RespondOrgMilestoneTagRequestParams,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return respondOrgMilestoneTagRequestCore(params, false);
}

function postPublicHref(
  ownerSlug: string,
  postSlug: string | null | undefined,
): string {
  const owner = ownerSlug.trim();
  if (!owner) return "/";
  const post = postSlug?.trim();
  if (!post) return `/${owner}`;
  return `/${owner}/p/${post}`;
}

async function resolveDoanProjectHrefs(
  admin: ReturnType<typeof createServiceRoleClient>,
  entries: DoanHrefEntry[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (entries.length === 0) return out;

  const tacPhamIds = [...new Set(entries.map((e) => e.tacPhamId).filter(Boolean))];
  const cotMocIds = [...new Set(entries.map((e) => e.cotMocId).filter(Boolean))];

  const tpById = new Map<
    string,
    { slug: string | null; id_nguoi_dung: string }
  >();
  if (tacPhamIds.length > 0) {
    const { data: tacPhams } = await admin
      .from("content_tac_pham")
      .select("id, slug, id_nguoi_dung")
      .in("id", tacPhamIds)
      .returns<Array<{ id: string; slug: string | null; id_nguoi_dung: string }>>();
    for (const tp of tacPhams ?? []) {
      tpById.set(tp.id, tp);
    }
  }

  const firstTpByMoc = new Map<
    string,
    { slug: string | null; id_nguoi_dung: string }
  >();
  if (cotMocIds.length > 0) {
    const { data: links } = await admin
      .from("content_tac_pham_thuoc_moc")
      .select(
        "id_cot_moc, content_tac_pham:content_tac_pham!inner(id, slug, id_nguoi_dung)",
      )
      .in("id_cot_moc", cotMocIds)
      .order("thu_tu", { ascending: true })
      .returns<
        Array<{
          id_cot_moc: string;
          content_tac_pham: {
            id: string;
            slug: string | null;
            id_nguoi_dung: string;
          } | null;
        }>
      >();

    for (const link of links ?? []) {
      if (firstTpByMoc.has(link.id_cot_moc)) continue;
      const tp = link.content_tac_pham;
      if (!tp) continue;
      firstTpByMoc.set(link.id_cot_moc, tp);
    }
  }

  const ownerIds = new Set<string>();
  for (const tp of tpById.values()) ownerIds.add(tp.id_nguoi_dung);
  for (const tp of firstTpByMoc.values()) ownerIds.add(tp.id_nguoi_dung);

  const ownerSlugById = new Map<string, string>();
  if (ownerIds.size > 0) {
    const { data: owners } = await admin
      .from("user_nguoi_dung")
      .select("id, slug")
      .in("id", [...ownerIds])
      .returns<Array<{ id: string; slug: string }>>();
    for (const owner of owners ?? []) {
      ownerSlugById.set(owner.id, owner.slug);
    }
  }

  for (const entry of entries) {
    const fromMoc = firstTpByMoc.get(entry.cotMocId);
    const fromPayload = entry.tacPhamId ? tpById.get(entry.tacPhamId) : undefined;
    const tp =
      fromPayload?.slug?.trim()
        ? fromPayload
        : fromMoc?.slug?.trim()
          ? fromMoc
          : fromPayload ?? fromMoc;

    if (tp?.slug?.trim()) {
      const ownerSlug =
        ownerSlugById.get(tp.id_nguoi_dung) ?? entry.studentSlug.trim();
      out.set(entry.cotMocId, postPublicHref(ownerSlug, tp.slug));
      continue;
    }

    out.set(entry.cotMocId, postPublicHref(entry.studentSlug, null));
  }

  return out;
}

function pickTile(index: number): OrgDoanProjectItem["tile"] {
  const tiles: OrgDoanProjectItem["tile"][] = ["tall", "square", "short"];
  return tiles[index % tiles.length]!;
}

/** Đồng bộ Gallery Journey: `coverId` → CF URL, Bunny thumb/MP4 khi video. */
function doanCoverVisualFromTacPham(row: {
  cover_id: string | null;
  mo_ta: string | null;
  noi_dung_blocks: unknown;
}): DoanCoverVisual | null {
  const blocks = parseServerBlocks(row.noi_dung_blocks) ?? [];
  const gridRaw = resolvePostGridEntry({
    moTa: row.mo_ta,
    coverId: row.cover_id,
    blocks,
  });
  if (!gridRaw) return null;

  let grid = gridRaw;
  if (grid.mediaKind === "video") {
    const url = extractVideoUrl(blocks) ?? "";
    const bunny = resolveBunnyEmbed(url, bunnyVideoIdFromBlocks(blocks));
    if (bunny) {
      grid = {
        ...grid,
        coverSrc: grid.coverSrc ?? buildBunnyVideoThumbnailUrlServer(bunny.videoId),
        videoPreviewSrc:
          grid.videoPreviewSrc ?? buildBunnyVideoMp4UrlServer(bunny.videoId),
      };
    }
  }

  if (grid.mediaKind === "video" && grid.coverId) {
    const custom = journeyImageFields(grid.coverId, "gallery-grid");
    if (custom?.src) {
      return {
        coverSrc: custom.src,
        isVideo: true,
        videoPreviewSrc: grid.videoPreviewSrc,
      };
    }
  }
  if (grid.coverSrc) {
    return {
      coverSrc: grid.coverSrc,
      isVideo: grid.mediaKind === "video",
      videoPreviewSrc: grid.videoPreviewSrc,
    };
  }
  if (grid.coverId) {
    const img = journeyImageFields(grid.coverId, "gallery-grid");
    if (img?.src) {
      return {
        coverSrc: img.src,
        isVideo: grid.mediaKind === "video",
        videoPreviewSrc: grid.videoPreviewSrc,
      };
    }
  }

  return {
    coverSrc: null,
    isVideo: grid.mediaKind === "video",
    videoPreviewSrc: grid.videoPreviewSrc,
  };
}

/**
 * Cover/thumb theo bài live — snapshot `album.coverSrc` lúc gắn org hay thiếu
 * (album không `cover_id`, video Bunny…). Key = `id_cot_moc`.
 */
async function resolveDoanCoverVisualsByCotMoc(
  admin: ReturnType<typeof createServiceRoleClient>,
  entries: DoanHrefEntry[],
): Promise<Map<string, DoanCoverVisual>> {
  const out = new Map<string, DoanCoverVisual>();
  if (entries.length === 0) return out;

  const tacPhamIds = [
    ...new Set(entries.map((e) => e.tacPhamId).filter(Boolean)),
  ];
  const cotMocIds = [
    ...new Set(entries.map((e) => e.cotMocId).filter(Boolean)),
  ];

  const tpById = new Map<
    string,
    {
      cover_id: string | null;
      mo_ta: string | null;
      noi_dung_blocks: unknown;
    }
  >();
  if (tacPhamIds.length > 0) {
    const { data: tacPhams } = await admin
      .from("content_tac_pham")
      .select("id, cover_id, mo_ta, noi_dung_blocks")
      .in("id", tacPhamIds)
      .returns<
        Array<{
          id: string;
          cover_id: string | null;
          mo_ta: string | null;
          noi_dung_blocks: unknown;
        }>
      >();
    for (const tp of tacPhams ?? []) {
      tpById.set(tp.id, tp);
    }
  }

  const firstTpIdByMoc = new Map<string, string>();
  if (cotMocIds.length > 0) {
    const { data: links } = await admin
      .from("content_tac_pham_thuoc_moc")
      .select("id_cot_moc, id_tac_pham")
      .in("id_cot_moc", cotMocIds)
      .order("thu_tu", { ascending: true })
      .returns<Array<{ id_cot_moc: string; id_tac_pham: string }>>();

    const missingTpIds: string[] = [];
    for (const link of links ?? []) {
      if (firstTpIdByMoc.has(link.id_cot_moc)) continue;
      firstTpIdByMoc.set(link.id_cot_moc, link.id_tac_pham);
      if (!tpById.has(link.id_tac_pham)) missingTpIds.push(link.id_tac_pham);
    }

    if (missingTpIds.length > 0) {
      const { data: extras } = await admin
        .from("content_tac_pham")
        .select("id, cover_id, mo_ta, noi_dung_blocks")
        .in("id", [...new Set(missingTpIds)])
        .returns<
          Array<{
            id: string;
            cover_id: string | null;
            mo_ta: string | null;
            noi_dung_blocks: unknown;
          }>
        >();
      for (const tp of extras ?? []) {
        tpById.set(tp.id, tp);
      }
    }
  }

  for (const entry of entries) {
    const tpId =
      (entry.tacPhamId && tpById.has(entry.tacPhamId)
        ? entry.tacPhamId
        : null) ??
      firstTpIdByMoc.get(entry.cotMocId) ??
      null;
    if (!tpId) continue;
    const row = tpById.get(tpId);
    if (!row) continue;
    const visual = doanCoverVisualFromTacPham(row);
    if (visual) out.set(entry.cotMocId, visual);
  }

  return out;
}

/**
 * Cover/thumb live theo cột mốc — cover bài hoặc ảnh đầu tiên trong blocks.
 * Dùng khi snapshot `album.coverSrc` lúc gắn org bị thiếu.
 */
export async function resolveLiveCoverSrcByCotMoc(
  entries: Array<{ cotMocId: string; tacPhamId: string }>,
): Promise<Map<string, string | null>> {
  const admin = createServiceRoleClient();
  const visuals = await resolveDoanCoverVisualsByCotMoc(
    admin,
    entries.map((entry) => ({ ...entry, studentSlug: "" })),
  );
  const out = new Map<string, string | null>();
  for (const [cotMocId, visual] of visuals) {
    out.set(cotMocId, visual.coverSrc?.trim() || null);
  }
  return out;
}

export async function countOrgApprovedDoanTags(orgId: string): Promise<number> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("verify_yeu_cau")
    .select("noi_dung")
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "da_duyet")
    .returns<Array<{ noi_dung: string | null }>>();

  let count = 0;
  for (const row of rows ?? []) {
    if (parseOrgMilestoneTagPayload(row.noi_dung)) count += 1;
  }
  return count;
}

export async function updateOrgDoanProjectDisplay(
  orgId: string,
  requestId: string,
  viewerId: string,
  patch: { hienThiSanPham?: boolean; diemSapXep?: number },
): Promise<{ ok: true; item: OrgDoanProjectItem } | { ok: false; error: string }> {
  const allowed = await canReviewOrgMilestoneTags(orgId, viewerId);
  if (!allowed) {
    return { ok: false, error: "Không có quyền quản lý sản phẩm học viên." };
  }

  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("verify_yeu_cau")
    .select("id, id_cot_moc, noi_dung, tao_luc, nguoi_yeu_cau")
    .eq("id", requestId)
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "da_duyet")
    .maybeSingle<{
      id: string;
      id_cot_moc: string;
      noi_dung: string | null;
      tao_luc: string;
      nguoi_yeu_cau: string;
    }>();

  if (!row?.id) {
    return { ok: false, error: "Không tìm thấy sản phẩm đã duyệt." };
  }

  const payload = parseOrgMilestoneTagPayload(row.noi_dung);
  if (!payload) {
    return { ok: false, error: "Payload yêu cầu không hợp lệ." };
  }

  const nextPayload: OrgMilestoneTagPayload = { ...payload };
  if (patch.hienThiSanPham !== undefined) {
    nextPayload.hienThiSanPham = patch.hienThiSanPham;
  }
  if (patch.diemSapXep !== undefined) {
    nextPayload.diemSapXep = patch.diemSapXep;
  }

  const { error } = await admin
    .from("verify_yeu_cau")
    .update({ noi_dung: serializePayload(nextPayload) })
    .eq("id", requestId);

  if (error) return { ok: false, error: error.message };

  const items = await listApprovedOrgDoanProjects(orgId);
  const item = items.find((p) => p.id === requestId);
  if (!item) {
    return { ok: false, error: "Không tải lại được sản phẩm sau khi lưu." };
  }
  return { ok: true, item };
}

export async function listApprovedOrgDoanProjects(
  orgId: string,
  options: ListOrgDoanProjectsOptions = {},
): Promise<OrgDoanProjectItem[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("verify_yeu_cau")
    .select("id, id_cot_moc, noi_dung, tao_luc, nguoi_yeu_cau")
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "da_duyet")
    .order("tao_luc", { ascending: false })
    .returns<
      Array<{
        id: string;
        id_cot_moc: string;
        noi_dung: string | null;
        tao_luc: string;
        nguoi_yeu_cau: string;
      }>
    >();

  const mocIds = [
    ...new Set((rows ?? []).map((row) => row.id_cot_moc).filter(Boolean)),
  ];
  const reactionByMoc = new Map<string, number>();
  if (mocIds.length > 0) {
    const { data: reactions } = await admin
      .from("social_reaction")
      .select("id_doi_tuong")
      .eq("loai_doi_tuong", "cot_moc")
      .eq("emoji", "heart")
      .in("id_doi_tuong", mocIds);
    for (const row of reactions ?? []) {
      const id = String(row.id_doi_tuong);
      reactionByMoc.set(id, (reactionByMoc.get(id) ?? 0) + 1);
    }
  }

  const userIds = [
    ...new Set((rows ?? []).map((row) => row.nguoi_yeu_cau).filter(Boolean)),
  ];
  let avatarByUserId = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_nguoi_dung")
      .select("id, avatar_id")
      .in("id", userIds)
      .returns<Array<{ id: string; avatar_id: string | null }>>();
    avatarByUserId = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        getAvatarUrl(profile.avatar_id),
      ]),
    );
  }

  const items: OrgDoanProjectItem[] = [];
  const hrefEntries: DoanHrefEntry[] = [];
  for (const row of rows ?? []) {
    const payload = parseOrgMilestoneTagPayload(row.noi_dung);
    if (!payload) continue;
    hrefEntries.push({
      cotMocId: row.id_cot_moc,
      tacPhamId: payload.tacPhamId,
      studentSlug: payload.studentSlug,
    });
  }
  const [hrefByMoc, coverByMoc] = await Promise.all([
    resolveDoanProjectHrefs(admin, hrefEntries),
    resolveDoanCoverVisualsByCotMoc(admin, hrefEntries),
  ]);

  for (const [index, row] of (rows ?? []).entries()) {
    const payload = parseOrgMilestoneTagPayload(row.noi_dung);
    if (!payload) continue;

    if (options.featuredOnly && !doanHienThiSanPham(payload)) continue;
    if (
      options.khoaHocId &&
      payload.khoaHocId &&
      payload.khoaHocId !== options.khoaHocId
    ) {
      continue;
    }
    if (options.khoaHocId && !payload.khoaHocId) continue;

    const liveCover = coverByMoc.get(row.id_cot_moc);
    const coverSrc =
      liveCover?.coverSrc?.trim() || payload.album.coverSrc?.trim() || null;
    const isVideo =
      liveCover?.isVideo ?? isGalleryVideoCoverSrc(coverSrc);

    items.push({
      id: row.id,
      cotMocId: row.id_cot_moc,
      nam: payload.nam,
      projectTitle: payload.projectTitle,
      studentName: payload.studentName,
      studentSlug: payload.studentSlug,
      studentAvatarUrl:
        payload.studentAvatarUrl ??
        avatarByUserId.get(row.nguoi_yeu_cau) ??
        null,
      nganhLabel: payload.nganhLabel ?? payload.khoaHocTen ?? null,
      monHocId: payload.monHocId ?? null,
      monHocLabel: payload.monHocLabel ?? null,
      milestoneTitle: payload.milestoneTitle,
      href:
        hrefByMoc.get(row.id_cot_moc) ??
        (payload.album.href?.trim() && /\/p\/[^/?#]+/.test(payload.album.href)
          ? payload.album.href.trim()
          : postPublicHref(payload.studentSlug, null)),
      submittedAt: row.tao_luc,
      reactionCount: reactionByMoc.get(row.id_cot_moc) ?? 0,
      coverSrc,
      coverAlt: payload.album.coverAlt ?? null,
      coverGradient: payload.album.coverGradient ?? null,
      photoCount: payload.album.photoCount ?? null,
      videoPreviewSrc: liveCover?.videoPreviewSrc ?? null,
      isVideo,
      tile: pickTile(items.length),
      khoaHocId: payload.khoaHocId ?? null,
      khoaHocTen: payload.khoaHocTen ?? null,
      hienThiSanPham: doanHienThiSanPham(payload),
      diemSapXep: doanDiemSapXep(payload),
    });
  }
  return items;
}

export function orgPublicPath(
  loai: "truong_dai_hoc" | "co_so_dao_tao",
  slug: string,
): string {
  return orgPublicHref(loai, slug);
}
