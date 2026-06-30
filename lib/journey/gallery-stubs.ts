import "server-only";

import type {
  MilestoneType,
  MilestoneVariant,
  MilestoneCardLayout,
} from "@/components/journey/milestone-types";
import type { Block } from "@/lib/editor/types";
import {
  extractPhotoImageIds,
  extractVideoUrl,
  galleryItemExcerptLine,
  galleryMediaKindFromBlocks,
  type GalleryMediaKind,
} from "@/lib/journey/post-media";
import { extractVideoProcessingMeta } from "@/lib/journey/video-processing-meta";
import { classifyBunnyVideoUrl } from "@/lib/bunny/embed";
import { buildBunnyVideoThumbnailUrl } from "@/lib/bunny/thumbnail";
import {
  loadVerifiedMetaForCotMocs,
  type VerifiedMilestoneMeta,
} from "@/lib/journey/milestone-verify";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getAvatarUrl } from "@/lib/journey/profile";

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
};

export type GalleryStub = {
  tacPhamId: string;
  cotMocId: string;
  thoiDiem: string;
  visibility: "feature" | "public";
  tacPhamSlug: string | null;
  tieuDe: string;
  excerpt: string;
  /** Cloudflare image id — ảnh / cover bài viết. */
  coverId: string | null;
  /** URL thumbnail trực tiếp (Bunny video / org cover). */
  coverSrc: string | null;
  videoProcessing: boolean;
  postOwnerId: string;
  type: MilestoneType;
  variant: MilestoneVariant;
  mediaKind: GalleryMediaKind;
  cardLayout?: MilestoneCardLayout;
  orgHref?: string | null;
  orgAvatarUrl?: string | null;
  orgKicker?: string | null;
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

function resolveGalleryVisual(
  coverId: string | null | undefined,
  blocks: Block[],
  mediaKind: GalleryMediaKind,
): {
  coverId: string | null;
  coverSrc: string | null;
  videoProcessing: boolean;
} | null {
  const processing =
    extractVideoProcessingMeta(blocks)?.processing === true &&
    mediaKind === "video";

  if (coverId?.trim() && mediaKind !== "photo") {
    return {
      coverId: coverId.trim(),
      coverSrc: null,
      videoProcessing: processing,
    };
  }

  if (mediaKind === "photo") {
    const photoId = extractPhotoImageIds(blocks)[0] ?? null;
    if (photoId) {
      return { coverId: photoId, coverSrc: null, videoProcessing: false };
    }
    if (coverId?.trim()) {
      return { coverId: coverId.trim(), coverSrc: null, videoProcessing: false };
    }
    return null;
  }

  if (mediaKind === "video") {
    const videoUrl = extractVideoUrl(blocks);
    if (!videoUrl) return null;
    const bunny = classifyBunnyVideoUrl(videoUrl);
    const coverSrc = bunny
      ? buildBunnyVideoThumbnailUrl(bunny.videoId)
      : null;
    return { coverId: null, coverSrc, videoProcessing: processing };
  }

  return null;
}

function rowToStub(
  r: GalleryRow,
  source: "self" | "tagged",
): GalleryStub | null {
  const cm = r.content_cot_moc;
  const tp = r.content_tac_pham;
  if (!cm || !tp) return null;
  const blocks = parseBlocks(tp.noi_dung_blocks);
  const mediaKind = galleryMediaKindFromBlocks(blocks);
  const visual = resolveGalleryVisual(tp.cover_id, blocks, mediaKind);
  if (!visual) return null;
  if (
    !visual.coverId &&
    !visual.coverSrc &&
    mediaKind !== "video"
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
    visibility: cm.che_do_hien_thi as "feature" | "public",
    tacPhamSlug: tp.slug,
    tieuDe: tp.tieu_de,
    excerpt: galleryItemExcerptLine(cm.mo_ta, tp.mo_ta, blocks),
    coverId: visual.coverId,
    coverSrc: visual.coverSrc,
    videoProcessing: visual.videoProcessing,
    postOwnerId: tp.id_nguoi_dung,
    type: LOAI_MOC_TO_TYPE[cm.loai_moc],
    variant: source === "tagged" ? "tagged" : "self",
    mediaKind,
  };
}

function mergeGalleryRows(
  selfRows: GalleryRow[],
  taggedRows: GalleryRow[],
): GalleryStub[] {
  const byTacPham = new Map<string, GalleryStub>();

  for (const r of selfRows) {
    const stub = rowToStub(r, "self");
    if (!stub) continue;
    const existing = byTacPham.get(stub.tacPhamId);
    if (existing && existing.visibility === "feature") continue;
    byTacPham.set(stub.tacPhamId, stub);
  }

  for (const r of taggedRows) {
    const stub = rowToStub(r, "tagged");
    if (!stub) continue;
    const existing = byTacPham.get(stub.tacPhamId);
    if (existing) continue;
    byTacPham.set(stub.tacPhamId, stub);
  }

  return Array.from(byTacPham.values()).sort((a, b) => {
    const aFeat = a.visibility === "feature" ? 1 : 0;
    const bFeat = b.visibility === "feature" ? 1 : 0;
    if (aFeat !== bFeat) return bFeat - aFeat;
    return a.thoiDiem > b.thoiDiem ? -1 : a.thoiDiem < b.thoiDiem ? 1 : 0;
  });
}

type OrgAssignCotMocRow = {
  id: string;
  thoi_diem: string;
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
      "id, thoi_diem, loai_moc, che_do_hien_thi, mo_ta, tieu_de, id_to_chuc",
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
      visibility: row.che_do_hien_thi as "feature" | "public",
      tacPhamSlug: null,
      tieuDe: orgName,
      excerpt: row.mo_ta?.trim() || "",
      coverId: null,
      coverSrc: attr?.coverUrl ?? null,
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
    return a.thoiDiem > b.thoiDiem ? -1 : a.thoiDiem < b.thoiDiem ? 1 : 0;
  });
}

async function fetchTaggedGalleryRows(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
): Promise<GalleryRow[]> {
  const { data: tags } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_tac_pham")
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "accepted")
    .eq("la_chu_so_huu", false)
    .returns<TaggedTacGiaRow[]>();

  const tacPhamIds = [...new Set((tags ?? []).map((row) => row.id_tac_pham))];
  if (tacPhamIds.length === 0) return [];

  const { data } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(
      "id_cot_moc, content_cot_moc:content_cot_moc!inner(id, thoi_diem, loai_moc, che_do_hien_thi, mo_ta, id_nguoi_dung), content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, mo_ta, cover_id, id_nguoi_dung, noi_dung_blocks)",
    )
    .in("id_tac_pham", tacPhamIds)
    .in("content_cot_moc.che_do_hien_thi", ["feature", "public"])
    .order("thu_tu", { ascending: true })
    .returns<GalleryRow[]>();

  return data ?? [];
}

/** Index nhẹ gallery — dedupe + sort, không resolve ảnh. */
export async function collectGalleryStubs(userId: string): Promise<GalleryStub[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(
      "id_cot_moc, content_cot_moc:content_cot_moc!inner(id, thoi_diem, loai_moc, che_do_hien_thi, mo_ta, id_nguoi_dung), content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, mo_ta, cover_id, id_nguoi_dung, noi_dung_blocks)",
    )
    .eq("content_cot_moc.id_nguoi_dung", userId)
    .in("content_cot_moc.che_do_hien_thi", ["feature", "public"])
    .order("thu_tu", { ascending: true })
    .returns<GalleryRow[]>();

  const taggedRows = await fetchTaggedGalleryRows(admin, userId);
  const merged = mergeGalleryRows(rows ?? [], taggedRows);
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
