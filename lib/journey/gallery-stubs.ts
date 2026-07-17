import "server-only";

import type {
  MilestoneType,
  MilestoneVariant,
  MilestoneCardLayout,
} from "@/components/journey/milestone-types";
import type { Block } from "@/lib/editor/types";
import type { EmbedProviderId } from "@/lib/editor/embed-providers";
import {
  galleryItemExcerptLine,
  type GalleryMediaKind,
} from "@/lib/journey/post-media";
import { findCoverThumbMeta } from "@/lib/journey/cover-thumb";
import { resolvePostGridEntry } from "@/lib/journey/post-content-kind";
import {
  buildBunnyVideoMp4Url as buildBunnyVideoMp4UrlServer,
  buildBunnyVideoThumbnailUrl as buildBunnyVideoThumbnailUrlServer,
} from "@/lib/bunny/thumbnail";
import {
  bunnyVideoIdFromBlocks,
  resolveBunnyEmbed,
} from "@/lib/journey/video-embed";
import { extractVideoUrl } from "@/lib/journey/post-media";
import {
  type VideoCanvasRatio,
} from "@/lib/journey/video-canvas-ratio";
import { resolveBookmarkJourneyVisibility } from "@/lib/journey/bookmark-visibility";
import type { ForeignJourneyVisibility } from "@/lib/journey/foreign-milestone-visibility";
import {
  isHiddenOnForeignJourney,
} from "@/lib/journey/foreign-milestone-visibility";
import {
  loadVerifiedMetaForCotMocs,
  type VerifiedMilestoneMeta,
} from "@/lib/journey/milestone-verify";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getAvatarUrl } from "@/lib/journey/profile";
import { parseBaiDangBlocks } from "@/lib/truong/bai-dang-blocks";
import { baiDangGridPreviewUrl } from "@/lib/truong/bai-dang-cover";
import { orgLoaiToMilestoneType } from "@/lib/truong/org-bai-dang-bookmark";
import {
  orgBaiDangPermalinkPath,
  type OrgBaiDangPermalinkHub,
} from "@/lib/truong/org-bai-dang-permalink";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

type LoaiMocDb =
  | "hoc"
  | "lam_viec"
  | "du_an"
  | "su_kien"
  | "thanh_tuu"
  | "ca_nhan";

const LOAI_MOC_TO_TYPE: Record<LoaiMocDb, MilestoneType> = {
  hoc: "hoc",
  lam_viec: "lam",
  du_an: "du-an",
  su_kien: "su-kien",
  thanh_tuu: "thanh-tuu",
  ca_nhan: "ca-nhan",
};

type GalleryRow = {
  id_cot_moc: string;
  content_cot_moc: {
    id: string;
    thoi_diem: string;
    tao_luc: string;
    loai_moc: LoaiMocDb;
    che_do_hien_thi: "public" | "theo_nhom" | "chi_minh" | "feature";
    mo_ta: string | null;
  } | null;
  content_tac_pham: {
    id: string;
    slug: string | null;
    tieu_de: string;
    mo_ta: string | null;
    cover_id: string | null;
    id_nguoi_dung: string;
    noi_dung_blocks: unknown;
  } | null;
};

type TaggedTacGiaRow = {
  id_tac_pham: string;
  che_do_hien_thi_journey: string | null;
  xu_ly_luc: string | null;
};

const GALLERY_VARIANT_RANK: Record<MilestoneVariant, number> = {
  self: 0,
  verified: 0,
  tagged: 1,
  bookmark: 2,
};

/** Dedupe theo tác phẩm — feature thắng public; self/verified ưu tiên hơn tagged/bookmark. */
function mergeGalleryStubsByTacPham(stubs: GalleryStub[]): GalleryStub[] {
  const byTacPham = new Map<string, GalleryStub>();

  for (const stub of stubs) {
    const existing = byTacPham.get(stub.tacPhamId);
    if (!existing) {
      byTacPham.set(stub.tacPhamId, stub);
      continue;
    }
    const visibility: GalleryStub["visibility"] =
      existing.visibility === "feature" || stub.visibility === "feature"
        ? "feature"
        : "public";
    const preferExisting =
      GALLERY_VARIANT_RANK[existing.variant] <=
      GALLERY_VARIANT_RANK[stub.variant];
    const base = preferExisting ? existing : stub;
    byTacPham.set(stub.tacPhamId, {
      ...base,
      visibility,
      taoLuc: base.taoLuc >= stub.taoLuc ? base.taoLuc : stub.taoLuc,
    });
  }

  return Array.from(byTacPham.values());
}

export type GalleryStub = {
  tacPhamId: string;
  cotMocId: string;
  thoiDiem: string;
  /** Thời điểm tạo cột mốc — mặc định sort aside nổi bật theo cái này (mới nhất trước). */
  taoLuc: string;
  visibility: "feature" | "public";
  tacPhamSlug: string | null;
  tieuDe: string;
  excerpt: string;
  /** Cloudflare image id — ảnh / cover bài viết. */
  coverId: string | null;
  /** URL thumbnail trực tiếp (Bunny video / org cover). */
  coverSrc: string | null;
  /** MP4 Bunny — frame đầu gallery khi không có thumbnail. */
  videoPreviewSrc: string | null;
  videoProcessing: boolean;
  postOwnerId: string;
  type: MilestoneType;
  variant: MilestoneVariant;
  mediaKind: GalleryMediaKind;
  embedProvider?: EmbedProviderId | null;
  cardLayout?: MilestoneCardLayout;
  orgHref?: string | null;
  orgAvatarUrl?: string | null;
  orgKicker?: string | null;
  /** Tooltip badge verified — vai trò org xác thực (studio, trường, …). */
  verifierRole?: string | null;
  videoCanvasRatio?: VideoCanvasRatio;
  /** Tỉ lệ + điểm neo thumbnail (từ `noi_dung_blocks.coverThumb`). */
  coverThumb?: import("@/lib/journey/cover-thumb").CoverThumbMeta | null;
};

function parseBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  const out: Block[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.loai !== "string") continue;
    out.push({
      id: typeof obj.id === "string" ? obj.id : `b-${out.length}`,
      loai: obj.loai as Block["loai"],
      thu_tu: typeof obj.thu_tu === "number" ? obj.thu_tu : out.length,
      config:
        obj.config && typeof obj.config === "object"
          ? (obj.config as Record<string, unknown>)
          : {},
    });
  }
  return out;
}

function enrichVideoGridVisuals(
  blocks: Block[],
  gridEntry: NonNullable<ReturnType<typeof resolvePostGridEntry>>,
): NonNullable<ReturnType<typeof resolvePostGridEntry>> {
  if (gridEntry.mediaKind !== "video") return gridEntry;
  const url = extractVideoUrl(blocks) ?? "";
  const bunny = resolveBunnyEmbed(url, bunnyVideoIdFromBlocks(blocks));
  if (!bunny) return gridEntry;
  return {
    ...gridEntry,
    coverSrc:
      gridEntry.coverSrc ??
      buildBunnyVideoThumbnailUrlServer(bunny.videoId),
    videoPreviewSrc:
      gridEntry.videoPreviewSrc ??
      buildBunnyVideoMp4UrlServer(bunny.videoId),
  };
}

function rowToStub(
  r: GalleryRow,
  source: "self" | "tagged",
): GalleryStub | null {
  const cm = r.content_cot_moc;
  const tp = r.content_tac_pham;
  if (!cm || !tp) return null;
  const blocks = parseBlocks(tp.noi_dung_blocks);
  const gridEntryRaw = resolvePostGridEntry({
    moTa: tp.mo_ta ?? cm.mo_ta,
    coverId: tp.cover_id,
    blocks,
  });
  if (!gridEntryRaw) return null;
  const gridEntry = enrichVideoGridVisuals(blocks, gridEntryRaw);
  if (
    !gridEntry.coverId &&
    !gridEntry.coverSrc &&
    gridEntry.mediaKind !== "video"
  ) {
    return null;
  }
  if (cm.che_do_hien_thi !== "feature" && cm.che_do_hien_thi !== "public") {
    return null;
  }
  return {
    tacPhamId: tp.id,
    cotMocId: cm.id,
    thoiDiem: cm.thoi_diem,
    taoLuc: cm.tao_luc,
    visibility: cm.che_do_hien_thi as "feature" | "public",
    tacPhamSlug: tp.slug,
    tieuDe: tp.tieu_de,
    excerpt: galleryItemExcerptLine(cm.mo_ta, tp.mo_ta, blocks),
    coverId: gridEntry.coverId,
    coverSrc: gridEntry.coverSrc,
    videoPreviewSrc: gridEntry.videoPreviewSrc,
    videoProcessing: gridEntry.videoProcessing,
    postOwnerId: tp.id_nguoi_dung,
    type: LOAI_MOC_TO_TYPE[cm.loai_moc],
    variant: source === "tagged" ? "tagged" : "self",
    mediaKind: gridEntry.mediaKind,
    embedProvider: gridEntry.embedProvider,
    videoCanvasRatio: gridEntry.videoCanvasRatio ?? undefined,
    coverThumb: findCoverThumbMeta(blocks),
  };
}

function mergeGallerySelfRows(selfRows: GalleryRow[]): GalleryStub[] {
  const out: GalleryStub[] = [];
  for (const r of selfRows) {
    const stub = rowToStub(r, "self");
    if (stub) out.push(stub);
  }
  return out;
}

async function fetchTaggedGalleryStubs(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
): Promise<GalleryStub[]> {
  const { data: tagRows } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_tac_pham, che_do_hien_thi_journey, xu_ly_luc")
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "accepted")
    .eq("la_chu_so_huu", false)
    .returns<TaggedTacGiaRow[]>();

  const journeyVisByTp = new Map<string, ForeignJourneyVisibility>();
  const acceptedAtByTp = new Map<string, string | null>();
  for (const row of tagRows ?? []) {
    const tpId = row.id_tac_pham;
    const journeyVis = (row.che_do_hien_thi_journey ??
      "public") as ForeignJourneyVisibility;
    journeyVisByTp.set(tpId, journeyVis);
    acceptedAtByTp.set(tpId, row.xu_ly_luc ?? null);
  }

  const tacPhamIds = [...journeyVisByTp.keys()];
  if (tacPhamIds.length === 0) return [];

  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(
      "id_cot_moc, id_tac_pham, content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, mo_ta, cover_id, id_nguoi_dung, noi_dung_blocks)",
    )
    .in("id_tac_pham", tacPhamIds)
    .order("thu_tu", { ascending: true });

  const firstLinkByTp = new Map<string, NonNullable<typeof links>[number]>();
  for (const link of links ?? []) {
    const tpId = link.id_tac_pham as string;
    if (!firstLinkByTp.has(tpId)) firstLinkByTp.set(tpId, link);
  }

  const cotMocIds = [
    ...new Set(
      [...firstLinkByTp.values()].map((link) => link.id_cot_moc as string),
    ),
  ];
  if (cotMocIds.length === 0) return [];

  const { data: cotMocs } = await admin
    .from("content_cot_moc")
    .select("id, thoi_diem, tao_luc, loai_moc, che_do_hien_thi, mo_ta, id_nguoi_dung")
    .in("id", cotMocIds)
    .returns<
      Array<{
        id: string;
        thoi_diem: string;
        tao_luc: string;
        loai_moc: LoaiMocDb;
        che_do_hien_thi: string;
        mo_ta: string | null;
        id_nguoi_dung: string;
      }>
    >();

  const cmById = new Map((cotMocs ?? []).map((cm) => [cm.id, cm]));
  const stubs: GalleryStub[] = [];

  for (const tpId of tacPhamIds) {
    const journeyVis = journeyVisByTp.get(tpId) ?? "public";

    const link = firstLinkByTp.get(tpId);
    const cmId = link?.id_cot_moc as string | undefined;
    const cm = cmId ? cmById.get(cmId) : undefined;
    if (!cm) continue;
    if (cm.che_do_hien_thi !== "feature" && cm.che_do_hien_thi !== "public") {
      continue;
    }

    const tpRaw = link?.content_tac_pham;
    const tp = Array.isArray(tpRaw) ? tpRaw[0] : tpRaw;
    if (!tp?.id || !tp.slug) continue;

    const isSelfAuthoredTagged = tp.id_nguoi_dung === userId;
    if (!isSelfAuthoredTagged) {
      if (isHiddenOnForeignJourney(journeyVis)) continue;
      if (journeyVis !== "feature" && journeyVis !== "public") continue;
    }

    const visibility: GalleryStub["visibility"] = isSelfAuthoredTagged
      ? (cm.che_do_hien_thi as "feature" | "public")
      : (journeyVis as "feature" | "public");

    const blocks = parseBlocks(tp.noi_dung_blocks);
    const gridEntryRaw = resolvePostGridEntry({
      moTa: tp.mo_ta ?? cm.mo_ta,
      coverId: tp.cover_id,
      blocks,
    });
    if (!gridEntryRaw) continue;
    const gridEntry = enrichVideoGridVisuals(blocks, gridEntryRaw);
    if (
      !gridEntry.coverId &&
      !gridEntry.coverSrc &&
      gridEntry.mediaKind !== "video"
    ) {
      continue;
    }

    const sortAt = acceptedAtByTp.get(tpId) ?? cm.tao_luc;
    stubs.push({
      tacPhamId: tp.id,
      cotMocId: cm.id,
      thoiDiem: cm.thoi_diem,
      taoLuc: sortAt,
      visibility,
      tacPhamSlug: tp.slug,
      tieuDe: tp.tieu_de,
      excerpt: galleryItemExcerptLine(cm.mo_ta, tp.mo_ta, blocks),
      coverId: gridEntry.coverId,
      coverSrc: gridEntry.coverSrc,
      videoPreviewSrc: gridEntry.videoPreviewSrc,
      videoProcessing: gridEntry.videoProcessing,
      postOwnerId: tp.id_nguoi_dung,
      type: LOAI_MOC_TO_TYPE[cm.loai_moc],
      variant: isSelfAuthoredTagged ? "self" : "tagged",
      mediaKind: gridEntry.mediaKind,
      embedProvider: gridEntry.embedProvider,
      videoCanvasRatio: gridEntry.videoCanvasRatio ?? undefined,
      coverThumb: findCoverThumbMeta(blocks),
    });
  }

  return stubs;
}

type OrgTaggedPostRow = {
  id: string;
  tieu_de: string;
  tom_tat: string | null;
  noi_dung_blocks: unknown;
  cover_id: string | null;
  tao_luc: string;
  loai_bai_dang: string | null;
  id_to_chuc: string;
  org_to_chuc:
    | {
        slug: string | null;
        ten: string | null;
        loai_to_chuc: string | null;
        avatar_id: string | null;
        logo_id: string | null;
      }
    | Array<{
        slug: string | null;
        ten: string | null;
        loai_to_chuc: string | null;
        avatar_id: string | null;
        logo_id: string | null;
      }>
    | null;
};

function pickOrgEmbedFromRow(raw: OrgTaggedPostRow["org_to_chuc"]) {
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

function orgPermalinkHub(loai: string | null | undefined): OrgBaiDangPermalinkHub {
  if (loai === "co_so_dao_tao") return "co-so";
  if (loai === "studio" || loai === "doanh_nghiep") return "studio";
  return "truong";
}

function orgVerifierRoleLabel(loai: string | null | undefined): string {
  if (loai === "studio" || loai === "doanh_nghiep") return "Xác nhận bởi studio";
  if (loai === "cong_dong") return "Người tạo cộng đồng";
  if (loai === "co_so_dao_tao") return "Xác nhận bởi cơ sở đào tạo";
  if (loai === "truong_dai_hoc") return "Xác nhận bởi trường";
  return "Xác nhận bởi tổ chức";
}

/** Bài `org_bai_dang` viewer là cộng sự — hiện gallery + aside nổi bật trên Journey. */
async function fetchOrgTaggedGalleryStubs(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
): Promise<GalleryStub[]> {
  const { data: tagRows } = await admin
    .from("org_bai_dang_tac_gia")
    .select("id_bai_dang, xu_ly_luc, che_do_hien_thi_journey")
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "accepted");

  const journeyVisByPost = new Map<string, ForeignJourneyVisibility>();
  const acceptedAtByPost = new Map<string, string | null>();
  for (const row of tagRows ?? []) {
    const postId = row.id_bai_dang as string;
    journeyVisByPost.set(
      postId,
      (row.che_do_hien_thi_journey as ForeignJourneyVisibility | null) ??
        "public",
    );
    acceptedAtByPost.set(postId, (row.xu_ly_luc as string | null) ?? null);
  }

  const postIds = [...journeyVisByPost.keys()];
  if (postIds.length === 0) return [];

  const nowIso = new Date().toISOString();
  const { data: posts } = await admin
    .from("org_bai_dang")
    .select(
      `
      id,
      tieu_de,
      tom_tat,
      noi_dung_blocks,
      cover_id,
      tao_luc,
      loai_bai_dang,
      id_to_chuc,
      org_to_chuc!inner ( slug, ten, loai_to_chuc, avatar_id, logo_id )
    `,
    )
    .in("id", postIds)
    .eq("trang_thai", "da_dang")
    .lte("tao_luc", nowIso)
    .returns<OrgTaggedPostRow[]>();

  const stubs: GalleryStub[] = [];
  for (const post of posts ?? []) {
    const journeyVis = journeyVisByPost.get(post.id) ?? "public";
    if (isHiddenOnForeignJourney(journeyVis)) continue;
    if (journeyVis !== "feature" && journeyVis !== "public") continue;

    const org = pickOrgEmbedFromRow(post.org_to_chuc);
    if (!org) continue;
    const orgSlug = org.slug?.trim();
    const orgName = org.ten?.trim();
    if (!orgSlug || !orgName) continue;

    const blocks = parseBaiDangBlocks(post.noi_dung_blocks);
    const gridEntryRaw = resolvePostGridEntry({
      moTa: post.tom_tat,
      coverId: post.cover_id,
      blocks: parseBlocks(post.noi_dung_blocks),
    });
    const gridEntry = gridEntryRaw
      ? enrichVideoGridVisuals(parseBlocks(post.noi_dung_blocks), gridEntryRaw)
      : null;

    let coverId: string | null = gridEntry?.coverId ?? post.cover_id ?? null;
    let coverSrc: string | null = gridEntry?.coverSrc ?? null;
    let videoPreviewSrc: string | null = gridEntry?.videoPreviewSrc ?? null;
    let videoProcessing = gridEntry?.videoProcessing ?? false;
    const mediaKind: GalleryMediaKind = gridEntry?.mediaKind ?? "article";

    if (!coverId && !coverSrc && mediaKind !== "video") {
      coverSrc = baiDangGridPreviewUrl({
        cover_id: post.cover_id,
        cover_src: null,
        noiDungBlocks: blocks,
      });
      if (!coverSrc) continue;
    }

    const avatarId = org.avatar_id ?? org.logo_id;
    const orgAvatarUrl = avatarId
      ? resolveTruongImageSrcSync(avatarId, ["public", "avatar"])
      : null;
    const sortAt = acceptedAtByPost.get(post.id) ?? post.tao_luc;

    stubs.push({
      tacPhamId: post.id,
      cotMocId: post.id,
      thoiDiem: post.tao_luc,
      taoLuc: sortAt,
      visibility: journeyVis,
      tacPhamSlug: null,
      tieuDe: post.tieu_de,
      excerpt: galleryItemExcerptLine(post.tom_tat, null, blocks),
      coverId,
      coverSrc,
      videoPreviewSrc,
      videoProcessing,
      postOwnerId: userId,
      type: orgLoaiToMilestoneType(post.loai_bai_dang),
      variant: "verified",
      mediaKind,
      embedProvider: gridEntry?.embedProvider,
      videoCanvasRatio: gridEntry?.videoCanvasRatio ?? undefined,
      coverThumb: findCoverThumbMeta(blocks),
      orgHref: orgBaiDangPermalinkPath(
        orgSlug,
        post.id,
        orgPermalinkHub(org.loai_to_chuc),
      ),
      orgAvatarUrl,
      orgKicker: orgName,
      verifierRole: orgVerifierRoleLabel(org.loai_to_chuc),
    });
  }

  return stubs;
}

type OrgAssignCotMocRow = {
  id: string;
  thoi_diem: string;
  tao_luc: string;
  loai_moc: LoaiMocDb;
  che_do_hien_thi: "public" | "theo_nhom" | "chi_minh" | "feature";
  mo_ta: string | null;
  tieu_de: string | null;
  id_to_chuc: string | null;
};

function resolveOrgCreateCardLayout(
  verified: VerifiedMilestoneMeta | undefined,
): MilestoneCardLayout {
  if (!verified?.attribution) return "default";
  if (
    verified.attribution.orgKind === "cong_dong" &&
    verified.attribution.role === "Người tạo cộng đồng"
  ) {
    return "cong-dong-create";
  }
  if (
    verified.attribution.orgKind === "co_so_dao_tao" &&
    verified.attribution.role === "Người tạo cơ sở đào tạo"
  ) {
    return "co-so-create";
  }
  if (
    verified.attribution.orgKind === "studio" &&
    verified.attribution.role === "Người tạo studio"
  ) {
    return "studio-create";
  }
  return "default";
}

async function fetchOrgCreateGalleryStubs(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  skipCotMocIds: Set<string>,
): Promise<GalleryStub[]> {
  const { data: rows } = await admin
    .from("content_cot_moc")
    .select(
      "id, thoi_diem, tao_luc, loai_moc, che_do_hien_thi, mo_ta, tieu_de, id_to_chuc",
    )
    .eq("id_nguoi_dung", userId)
    .eq("nguon_goc", "sinh_tu_org_assign")
    .in("che_do_hien_thi", ["feature", "public"])
    .returns<OrgAssignCotMocRow[]>();

  const candidates = (rows ?? []).filter((row) => !skipCotMocIds.has(row.id));
  if (candidates.length === 0) return [];

  const orgByCotMoc = new Map(
    candidates.map((row) => [row.id, row.id_to_chuc ?? null]),
  );
  const verifiedMeta = await loadVerifiedMetaForCotMocs(
    candidates.map((row) => row.id),
    orgByCotMoc,
  );

  const stubs: GalleryStub[] = [];
  for (const row of candidates) {
    const verified = verifiedMeta.get(row.id);
    const cardLayout = resolveOrgCreateCardLayout(verified);
    if (cardLayout === "default") continue;

    const attr = verified?.attribution;
    const orgName =
      attr?.name?.trim() ||
      row.tieu_de?.replace(/^Tạo (cộng đồng|cơ sở đào tạo|studio)\s+/i, "").trim() ||
      row.tieu_de?.trim() ||
      "Tổ chức";

    stubs.push({
      tacPhamId: row.id,
      cotMocId: row.id,
      thoiDiem: row.thoi_diem,
      taoLuc: row.tao_luc,
      visibility: row.che_do_hien_thi as "feature" | "public",
      tacPhamSlug: null,
      tieuDe: orgName,
      excerpt: row.mo_ta?.trim() || "",
      coverId: null,
      coverSrc: attr?.coverUrl ?? null,
      videoPreviewSrc: null,
      videoProcessing: false,
      postOwnerId: userId,
      type: LOAI_MOC_TO_TYPE[row.loai_moc],
      variant: "verified",
      mediaKind: "article",
      cardLayout,
      orgHref: verified?.orgHref ?? attr?.href ?? null,
      orgAvatarUrl: attr?.avatarUrl ?? null,
      orgKicker: attr?.role ?? null,
    });
  }

  return stubs;
}

function sortGalleryStubs(stubs: GalleryStub[]): GalleryStub[] {
  return [...stubs].sort((a, b) => {
    const aFeat = a.visibility === "feature" ? 1 : 0;
    const bFeat = b.visibility === "feature" ? 1 : 0;
    if (aFeat !== bFeat) return bFeat - aFeat;
    if (a.taoLuc !== b.taoLuc) return a.taoLuc > b.taoLuc ? -1 : 1;
    return a.thoiDiem > b.thoiDiem ? -1 : a.thoiDiem < b.thoiDiem ? 1 : 0;
  });
}

async function fetchBookmarkGalleryStubs(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
): Promise<GalleryStub[]> {
  const { data: savedRows } = await admin
    .from("social_luu")
    .select("id_doi_tuong, tao_luc, che_do_hien_thi, che_do_hien_thi_journey")
    .eq("id_nguoi_dung", userId)
    .eq("loai_doi_tuong", "cot_moc");

  const journeyVisByMoc = new Map<string, ForeignJourneyVisibility>();
  const savedAtByMoc = new Map<string, string | null>();
  for (const row of savedRows ?? []) {
    const mocId = row.id_doi_tuong as string;
    journeyVisByMoc.set(
      mocId,
      resolveBookmarkJourneyVisibility(
        row.che_do_hien_thi_journey as string | null,
        row.che_do_hien_thi as string | null,
      ),
    );
    savedAtByMoc.set(mocId, (row.tao_luc as string | null) ?? null);
  }

  const cotMocIds = [...journeyVisByMoc.entries()]
    .filter(([, vis]) => vis === "feature" || vis === "public")
    .map(([id]) => id);
  if (cotMocIds.length === 0) return [];

  const { data: cotMocs } = await admin
    .from("content_cot_moc")
    .select("id, thoi_diem, tao_luc, loai_moc, che_do_hien_thi, mo_ta, id_nguoi_dung")
    .in("id", cotMocIds)
    .returns<
      Array<{
        id: string;
        thoi_diem: string;
        tao_luc: string;
        loai_moc: LoaiMocDb;
        che_do_hien_thi: string;
        mo_ta: string | null;
        id_nguoi_dung: string;
      }>
    >();

  const visibleCotMocs = (cotMocs ?? []).filter(
    (cm) =>
      cm.id_nguoi_dung !== userId &&
      (cm.che_do_hien_thi === "feature" || cm.che_do_hien_thi === "public"),
  );
  if (visibleCotMocs.length === 0) return [];

  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(
      "id_cot_moc, id_tac_pham, content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, mo_ta, cover_id, id_nguoi_dung, noi_dung_blocks)",
    )
    .in(
      "id_cot_moc",
      visibleCotMocs.map((cm) => cm.id),
    )
    .order("thu_tu", { ascending: true });

  const firstLinkByMoc = new Map<string, NonNullable<typeof links>[number]>();
  for (const link of links ?? []) {
    const mocId = link.id_cot_moc as string;
    if (!firstLinkByMoc.has(mocId)) firstLinkByMoc.set(mocId, link);
  }

  const stubs: GalleryStub[] = [];
  for (const cm of visibleCotMocs) {
    const journeyVis = journeyVisByMoc.get(cm.id);
    if (journeyVis !== "feature" && journeyVis !== "public") continue;

    const link = firstLinkByMoc.get(cm.id);
    const tpRaw = link?.content_tac_pham;
    const tp = Array.isArray(tpRaw) ? tpRaw[0] : tpRaw;
    if (!tp?.id || !tp.slug) continue;

    const blocks = parseBlocks(tp.noi_dung_blocks);
    const gridEntryRaw = resolvePostGridEntry({
      moTa: tp.mo_ta ?? cm.mo_ta,
      coverId: tp.cover_id,
      blocks,
    });
    if (!gridEntryRaw) continue;
    const gridEntry = enrichVideoGridVisuals(blocks, gridEntryRaw);
    if (
      !gridEntry.coverId &&
      !gridEntry.coverSrc &&
      gridEntry.mediaKind !== "video"
    ) {
      continue;
    }

    stubs.push({
      tacPhamId: tp.id,
      cotMocId: cm.id,
      thoiDiem: cm.thoi_diem,
      taoLuc: savedAtByMoc.get(cm.id) ?? cm.tao_luc,
      visibility: journeyVis,
      tacPhamSlug: tp.slug,
      tieuDe: tp.tieu_de,
      excerpt: galleryItemExcerptLine(cm.mo_ta, tp.mo_ta, blocks),
      coverId: gridEntry.coverId,
      coverSrc: gridEntry.coverSrc,
      videoPreviewSrc: gridEntry.videoPreviewSrc,
      videoProcessing: gridEntry.videoProcessing,
      postOwnerId: tp.id_nguoi_dung,
      type: LOAI_MOC_TO_TYPE[cm.loai_moc],
      variant: "bookmark",
      mediaKind: gridEntry.mediaKind,
      embedProvider: gridEntry.embedProvider,
      videoCanvasRatio: gridEntry.videoCanvasRatio ?? undefined,
      coverThumb: findCoverThumbMeta(blocks),
    });
  }

  return stubs;
}

/** Index nhẹ gallery — dedupe + sort, không resolve ảnh. */
export async function collectGalleryStubs(userId: string): Promise<GalleryStub[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(
      "id_cot_moc, content_cot_moc:content_cot_moc!inner(id, thoi_diem, tao_luc, loai_moc, che_do_hien_thi, mo_ta, id_nguoi_dung), content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, mo_ta, cover_id, id_nguoi_dung, noi_dung_blocks)",
    )
    .eq("content_cot_moc.id_nguoi_dung", userId)
    .in("content_cot_moc.che_do_hien_thi", ["feature", "public"])
    .order("thu_tu", { ascending: true })
    .returns<GalleryRow[]>();

  const selfStubs = mergeGallerySelfRows(rows ?? []);
  const [taggedStubs, bookmarkStubs, orgTaggedStubs] = await Promise.all([
    fetchTaggedGalleryStubs(admin, userId),
    fetchBookmarkGalleryStubs(admin, userId),
    fetchOrgTaggedGalleryStubs(admin, userId),
  ]);
  const merged = mergeGalleryStubsByTacPham([
    ...selfStubs,
    ...taggedStubs,
    ...bookmarkStubs,
    ...orgTaggedStubs,
  ]);
  const existingCotMocIds = new Set(merged.map((stub) => stub.cotMocId));
  const orgCreateStubs = await fetchOrgCreateGalleryStubs(
    admin,
    userId,
    existingCotMocIds,
  );
  return sortGalleryStubs([...merged, ...orgCreateStubs]);
}

export async function resolveOwnerSlugs(
  admin: ReturnType<typeof createServiceRoleClient>,
  ownerIds: string[],
): Promise<Map<string, string>> {
  const ownerSlugById = new Map<string, string>();
  if (ownerIds.length === 0) return ownerSlugById;

  const { data: owners } = await admin
    .from("user_nguoi_dung")
    .select("id, slug")
    .in("id", ownerIds)
    .returns<Array<{ id: string; slug: string }>>();

  for (const owner of owners ?? []) {
    ownerSlugById.set(owner.id, owner.slug);
  }
  return ownerSlugById;
}

export type OwnerProfile = {
  slug: string;
  name: string | null;
  avatarUrl: string | null;
};

/** Như `resolveOwnerSlugs` nhưng kèm tên hiển thị + avatar — cho overlay tác giả. */
export async function resolveOwnerProfiles(
  admin: ReturnType<typeof createServiceRoleClient>,
  ownerIds: string[],
): Promise<Map<string, OwnerProfile>> {
  const byId = new Map<string, OwnerProfile>();
  if (ownerIds.length === 0) return byId;

  const { data: owners } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", ownerIds)
    .returns<
      Array<{
        id: string;
        slug: string;
        ten_hien_thi: string | null;
        avatar_id: string | null;
      }>
    >();

  for (const owner of owners ?? []) {
    byId.set(owner.id, {
      slug: owner.slug,
      name: owner.ten_hien_thi?.trim() || owner.slug,
      avatarUrl: getAvatarUrl(owner.avatar_id ?? null),
    });
  }
  return byId;
}
