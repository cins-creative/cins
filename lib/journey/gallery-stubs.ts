import "server-only";

import type {
  MilestoneType,
  MilestoneVariant,
} from "@/components/journey/milestone-types";
import type { Block } from "@/lib/editor/types";
import {
  extractPhotoImageIds,
  galleryMediaKindFromBlocks,
  type GalleryMediaKind,
} from "@/lib/journey/post-media";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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
  } | null;
  content_tac_pham: {
    id: string;
    slug: string | null;
    tieu_de: string;
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
  coverId: string;
  postOwnerId: string;
  type: MilestoneType;
  variant: MilestoneVariant;
  mediaKind: GalleryMediaKind;
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

function resolveGalleryCoverId(
  coverId: string | null | undefined,
  blocks: Block[],
  mediaKind: GalleryMediaKind,
): string | null {
  if (coverId?.trim()) return coverId.trim();
  if (mediaKind === "photo") {
    return extractPhotoImageIds(blocks)[0] ?? null;
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
  const coverId = resolveGalleryCoverId(tp.cover_id, blocks, mediaKind);
  if (!coverId) return null;
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
    coverId,
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
      "id_cot_moc, content_cot_moc:content_cot_moc!inner(id, thoi_diem, loai_moc, che_do_hien_thi, id_nguoi_dung), content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, cover_id, id_nguoi_dung, noi_dung_blocks)",
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
      "id_cot_moc, content_cot_moc:content_cot_moc!inner(id, thoi_diem, loai_moc, che_do_hien_thi, id_nguoi_dung), content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, cover_id, id_nguoi_dung, noi_dung_blocks)",
    )
    .eq("content_cot_moc.id_nguoi_dung", userId)
    .in("content_cot_moc.che_do_hien_thi", ["feature", "public"])
    .order("thu_tu", { ascending: true })
    .returns<GalleryRow[]>();

  const taggedRows = await fetchTaggedGalleryRows(admin, userId);
  return mergeGalleryRows(rows ?? [], taggedRows);
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
