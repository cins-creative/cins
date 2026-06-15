import "server-only";

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
import { notifyOrgMilestoneTagApproved } from "@/lib/social/org-milestone-tag-notify";
import { isCoSoOrgAdmin } from "@/lib/to-chuc/co-so-membership";
import { truongRootPath } from "@/lib/truong/truong-routes";
import { isTruongOrgAdmin } from "@/lib/truong/org-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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

function mapDbStatus(raw: string): OrgMilestoneTagStatus {
  if (raw === "da_duyet") return "approved";
  if (raw === "tu_choi") return "rejected";
  return "pending";
}

function dbStatusFromAction(action: "approve" | "reject"): string {
  return action === "approve" ? "da_duyet" : "tu_choi";
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

async function canReviewOrgMilestoneTags(
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
    })),
  };
}

export async function submitOrgMilestoneTagRequest(params: {
  viewerId: string;
  cotMocId: string;
  orgId: string;
  nam: number;
  khoaHocId?: string | null;
  nganhId?: string | null;
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
    status: mapDbStatus(row.trang_thai),
    taggedAt: row.tao_luc,
    studentName: payload.studentName,
    studentSlug: payload.studentSlug,
    studentAvatarUrl,
    projectTitle: payload.projectTitle,
    milestoneTitle: payload.milestoneTitle,
    milestoneKind: payload.milestoneKind,
    nganhLabel: payload.nganhLabel ?? null,
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
    status: mapDbStatus(row.trang_thai),
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

export async function respondOrgMilestoneTagRequest(params: {
  orgId: string;
  requestId: string;
  viewerId: string;
  action: "approve" | "reject";
}): Promise<{ ok: true } | { ok: false; error: string }> {
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

type DoanHrefEntry = {
  cotMocId: string;
  tacPhamId: string;
  studentSlug: string;
};

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
      fromMoc?.slug?.trim()
        ? fromMoc
        : fromPayload?.slug?.trim()
          ? fromPayload
          : fromMoc ?? fromPayload;

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

export async function listApprovedOrgDoanProjects(
  orgId: string,
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
  const hrefByMoc = await resolveDoanProjectHrefs(admin, hrefEntries);

  for (const [index, row] of (rows ?? []).entries()) {
    const payload = parseOrgMilestoneTagPayload(row.noi_dung);
    if (!payload) continue;
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
      milestoneTitle: payload.milestoneTitle,
      href:
        hrefByMoc.get(row.id_cot_moc) ??
        postPublicHref(payload.studentSlug, null),
      submittedAt: row.tao_luc,
      reactionCount: reactionByMoc.get(row.id_cot_moc) ?? 0,
      coverSrc: payload.album.coverSrc ?? null,
      coverAlt: payload.album.coverAlt ?? null,
      coverGradient: payload.album.coverGradient ?? null,
      photoCount: payload.album.photoCount ?? null,
      tile: pickTile(index),
    });
  }
  return items;
}

export function orgPublicPath(
  loai: "truong_dai_hoc" | "co_so_dao_tao",
  slug: string,
): string {
  if (loai === "co_so_dao_tao") return `/co-so/${slug}`;
  return truongRootPath(slug);
}
