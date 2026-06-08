import "server-only";

import { getCoverUrl } from "@/lib/articles/cover";
import { getGiaiDoanLabel } from "@/lib/journey/profile";
import type { GiaiDoan } from "@/lib/auth/session";
import { milestonePreviewMedia } from "@/lib/journey/milestone-preview-media";
import { parseServerBlocks } from "@/lib/journey/parse-server-blocks";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type {
  TagAggSort,
  TagAggUser,
  TagAggWork,
} from "@/lib/tag/aggregation-types";

import { isMilestoneVisibleOnEntityPage } from "@/lib/tag/entity-visible-clause";

function parseSort(raw: string | null | undefined): TagAggSort {
  if (raw === "nhieu_tuong_tac" || raw === "a_z") return raw;
  return "moi_nhat";
}

export function parseTagAggSort(
  raw: string | null | undefined,
): TagAggSort {
  return parseSort(raw);
}

/** Tác phẩm hiện trên trang aggregation công khai (gallery / keyword). */
function isWorkDiscoverableOnTagPage(params: {
  tacPhamCheDo: string;
  milestoneCheDos: string[];
}): boolean {
  if (params.milestoneCheDos.some((c) => isMilestoneVisibleOnEntityPage(c))) {
    return true;
  }
  if (params.milestoneCheDos.length === 0) {
    return isMilestoneVisibleOnEntityPage(params.tacPhamCheDo);
  }
  return false;
}

function resolveWorkPreview(
  coverId: string | null,
  blocksRaw: unknown,
): { src: string | null; width: number; height: number } {
  const blocks = parseServerBlocks(blocksRaw);
  const media = milestonePreviewMedia(coverId, blocks, "");
  const first = media[0];
  if (first?.src) {
    return {
      src: first.src,
      width: first.width || 4,
      height: first.height || 3,
    };
  }
  const coverSrc = getCoverUrl(coverId, "public");
  if (coverSrc) {
    return { src: coverSrc, width: 4, height: 3 };
  }
  return { src: null, width: 4, height: 3 };
}

export async function fetchTagTaggedUsers(
  tagId: string,
): Promise<TagAggUser[]> {
  const admin = createServiceRoleClient();
  const byId = new Map<string, TagAggUser>();

  const { data: mocLinks } = await admin
    .from("article_gan_cot_moc")
    .select(
      "content_cot_moc:content_cot_moc!inner(id_nguoi_dung, che_do_hien_thi, user_nguoi_dung: id_nguoi_dung ( id, slug, ten_hien_thi, avatar_id, giai_doan ))",
    )
    .eq("id_bai_viet", tagId);

  for (const row of mocLinks ?? []) {
    const moc = row.content_cot_moc as {
      che_do_hien_thi?: string;
      user_nguoi_dung?: {
        id: string;
        slug: string;
        ten_hien_thi: string | null;
        avatar_id: string | null;
        giai_doan: GiaiDoan | null;
      } | null;
    } | null;
    if (!moc?.user_nguoi_dung?.id) continue;
    if (!isMilestoneVisibleOnEntityPage(String(moc.che_do_hien_thi ?? ""))) {
      continue;
    }
    const u = moc.user_nguoi_dung;
    byId.set(u.id, {
      id: u.id,
      slug: u.slug,
      tenHienThi: u.ten_hien_thi?.trim() || u.slug,
      avatarId: u.avatar_id,
      ngheChinh: u.giai_doan ? getGiaiDoanLabel(u.giai_doan) : null,
    });
  }

  const { data: tpLinks } = await admin
    .from("article_gan_tac_pham")
    .select(
      "content_tac_pham:content_tac_pham!inner(id, content_tac_pham_tac_gia ( id_nguoi_dung, trang_thai, user_nguoi_dung: id_nguoi_dung ( id, slug, ten_hien_thi, avatar_id, giai_doan )))",
    )
    .eq("id_bai_viet", tagId);

  for (const row of tpLinks ?? []) {
    const tp = row.content_tac_pham as {
      content_tac_pham_tac_gia?: Array<{
        trang_thai?: string;
        user_nguoi_dung?: {
          id: string;
          slug: string;
          ten_hien_thi: string | null;
          avatar_id: string | null;
          giai_doan: GiaiDoan | null;
        } | null;
      }>;
    } | null;
    for (const tg of tp?.content_tac_pham_tac_gia ?? []) {
      if (tg.trang_thai !== "accepted") continue;
      const u = tg.user_nguoi_dung;
      if (!u?.id) continue;
      byId.set(u.id, {
        id: u.id,
        slug: u.slug,
        tenHienThi: u.ten_hien_thi?.trim() || u.slug,
        avatarId: u.avatar_id,
        ngheChinh: u.giai_doan ? getGiaiDoanLabel(u.giai_doan) : null,
      });
    }
  }

  return [...byId.values()].sort((a, b) =>
    a.tenHienThi.localeCompare(b.tenHienThi, "vi"),
  );
}

type RawWork = {
  id: string;
  slug: string;
  tieu_de: string | null;
  cover_id: string | null;
  noi_dung_blocks: unknown;
  tao_luc: string | null;
  tagged_at: string;
  owner_slug: string;
  owner_name: string | null;
  owner_avatar_id: string | null;
  cot_moc_ids: string[];
};

type TacPhamRow = {
  id: string;
  slug: string | null;
  tieu_de: string | null;
  cover_id: string | null;
  noi_dung_blocks: unknown;
  tao_luc: string | null;
  che_do_hien_thi: string;
  user_nguoi_dung?: {
    slug?: string;
    ten_hien_thi?: string | null;
    avatar_id?: string | null;
  } | null;
  content_tac_pham_thuoc_moc?: Array<{
    id_cot_moc?: string;
    content_cot_moc?: { id?: string; che_do_hien_thi?: string } | null;
  }>;
};

function rawWorkFromTacPham(
  tp: TacPhamRow,
  taggedAt: string,
): RawWork | null {
  if (!tp.id) return null;

  const mocLinks = tp.content_tac_pham_thuoc_moc ?? [];
  const milestoneCheDos = mocLinks
    .map((m) => String(m.content_cot_moc?.che_do_hien_thi ?? ""))
    .filter(Boolean);

  if (
    !isWorkDiscoverableOnTagPage({
      tacPhamCheDo: String(tp.che_do_hien_thi ?? "public"),
      milestoneCheDos,
    })
  ) {
    return null;
  }

  const visibleMocs = mocLinks.filter((m) =>
    isMilestoneVisibleOnEntityPage(
      String(m.content_cot_moc?.che_do_hien_thi ?? ""),
    ),
  );
  const cotMocIds = visibleMocs
    .map((m) => m.content_cot_moc?.id ?? m.id_cot_moc)
    .filter(Boolean) as string[];

  return {
    id: tp.id,
    slug: tp.slug?.trim() || "",
    tieu_de: tp.tieu_de,
    cover_id: tp.cover_id,
    noi_dung_blocks: tp.noi_dung_blocks,
    tao_luc: tp.tao_luc,
    tagged_at: taggedAt,
    owner_slug: tp.user_nguoi_dung?.slug ?? "",
    owner_name: tp.user_nguoi_dung?.ten_hien_thi ?? null,
    owner_avatar_id: tp.user_nguoi_dung?.avatar_id ?? null,
    cot_moc_ids: cotMocIds,
  };
}

async function loadRawWorksFromTacPhamLinks(tagId: string): Promise<RawWork[]> {
  const admin = createServiceRoleClient();
  const { data: links } = await admin
    .from("article_gan_tac_pham")
    .select(
      "tao_luc, content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, cover_id, tao_luc, che_do_hien_thi, noi_dung_blocks, user_nguoi_dung: id_nguoi_dung ( slug, ten_hien_thi, avatar_id ), content_tac_pham_thuoc_moc ( id_cot_moc, content_cot_moc:content_cot_moc!inner ( id, che_do_hien_thi )))",
    )
    .eq("id_bai_viet", tagId);

  const out: RawWork[] = [];
  for (const link of links ?? []) {
    const tp = (link as { content_tac_pham?: unknown }).content_tac_pham as
      | TacPhamRow
      | null
      | undefined;
    if (!tp) continue;
    const taggedAt = String(
      (link as { tao_luc?: string | null }).tao_luc ?? tp.tao_luc ?? "",
    );
    const row = rawWorkFromTacPham(tp, taggedAt);
    if (row) out.push(row);
  }
  return out;
}

async function loadRawWorksFromCotMocLinks(tagId: string): Promise<RawWork[]> {
  const admin = createServiceRoleClient();
  const { data: links } = await admin
    .from("article_gan_cot_moc")
    .select(
      "tao_luc, content_cot_moc:content_cot_moc!inner(id, che_do_hien_thi, content_tac_pham_thuoc_moc ( thu_tu, content_tac_pham:content_tac_pham!inner ( id, slug, tieu_de, cover_id, tao_luc, che_do_hien_thi, noi_dung_blocks, user_nguoi_dung: id_nguoi_dung ( slug, ten_hien_thi, avatar_id ))))",
    )
    .eq("id_bai_viet", tagId)
    .in("content_cot_moc.che_do_hien_thi", ["public", "feature", "cong_dong"]);

  const out: RawWork[] = [];
  for (const link of links ?? []) {
    const moc = (link as {
      tao_luc?: string;
      content_cot_moc?: {
        content_tac_pham_thuoc_moc?: Array<{
          thu_tu?: number;
          content_tac_pham?: TacPhamRow | null;
        }>;
      } | null;
    }).content_cot_moc;
    const thuoc = [...(moc?.content_tac_pham_thuoc_moc ?? [])].sort(
      (a, b) => (a.thu_tu ?? 0) - (b.thu_tu ?? 0),
    );
    const tp = thuoc[0]?.content_tac_pham;
    if (!tp) continue;
    const taggedAt = String(link.tao_luc ?? tp.tao_luc ?? "");
    const row = rawWorkFromTacPham(tp, taggedAt);
    if (row) out.push(row);
  }
  return out;
}

async function loadRawWorks(tagId: string): Promise<RawWork[]> {
  const [fromTp, fromMoc] = await Promise.all([
    loadRawWorksFromTacPhamLinks(tagId),
    loadRawWorksFromCotMocLinks(tagId),
  ]);

  const byId = new Map<string, RawWork>();
  for (const row of [...fromTp, ...fromMoc]) {
    const prev = byId.get(row.id);
    if (!prev || row.tagged_at.localeCompare(prev.tagged_at) > 0) {
      byId.set(row.id, row);
    }
  }
  return [...byId.values()];
}

async function reactionCountsForMilestones(
  cotMocIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (cotMocIds.length === 0) return counts;

  const admin = createServiceRoleClient();
  const unique = [...new Set(cotMocIds)];
  const { data } = await admin
    .from("social_reaction")
    .select("id_doi_tuong")
    .eq("loai_doi_tuong", "cot_moc")
    .eq("emoji", "heart")
    .in("id_doi_tuong", unique);

  for (const row of data ?? []) {
    const id = String(row.id_doi_tuong);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export async function fetchTagTaggedWorks(
  tagId: string,
  sort: TagAggSort,
): Promise<TagAggWork[]> {
  const raw = await loadRawWorks(tagId);
  const allMocIds = raw.flatMap((w) => w.cot_moc_ids);
  const reactionByMoc = await reactionCountsForMilestones(allMocIds);

  const works: TagAggWork[] = raw.map((w) => {
    const reactionCount = w.cot_moc_ids.reduce(
      (sum, id) => sum + (reactionByMoc.get(id) ?? 0),
      0,
    );
    const preview = resolveWorkPreview(w.cover_id, w.noi_dung_blocks);
    return {
      id: w.id,
      slug: w.slug,
      tieuDe: w.tieu_de,
      coverId: w.cover_id,
      previewSrc: preview.src,
      ownerSlug: w.owner_slug,
      ownerName: w.owner_name,
      ownerAvatarId: w.owner_avatar_id,
      width: preview.width,
      height: preview.height,
      taggedAt: w.tagged_at,
      reactionCount,
    };
  });

  if (sort === "a_z") {
    works.sort((a, b) =>
      (a.tieuDe ?? "").localeCompare(b.tieuDe ?? "", "vi"),
    );
  } else if (sort === "nhieu_tuong_tac") {
    works.sort(
      (a, b) =>
        b.reactionCount - a.reactionCount ||
        b.taggedAt.localeCompare(a.taggedAt),
    );
  } else {
    works.sort((a, b) => b.taggedAt.localeCompare(a.taggedAt));
  }

  return works;
}

export function tagWorkCoverSrc(coverId: string | null): string | null {
  return getCoverUrl(coverId, "public");
}
