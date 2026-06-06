import "server-only";

import type {
  MilestoneItem,
  MilestoneMediaItem,
  MilestoneType,
  MilestoneVisibility,
} from "@/components/journey/milestone-types";
import type { Block as ServerBlock } from "@/lib/editor/types";
import { fetchArticleTagsForTacPham } from "@/lib/journey/article-tags-batch";
import { milestonePreviewMedia } from "@/lib/journey/milestone-preview-media";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type CoAuthorInviteMilestoneResult =
  | { ok: true; milestone: MilestoneItem }
  | { ok: false; error: string };

type CotMocRow = {
  id: string;
  loai_moc:
    | "hoc"
    | "lam_viec"
    | "du_an"
    | "su_kien"
    | "thanh_tuu"
    | "ca_nhan";
  tieu_de: string;
  mo_ta: string | null;
  thoi_diem: string;
  che_do_hien_thi: "public" | "theo_nhom" | "chi_minh" | "feature";
  tao_luc: string | null;
};

const LOAI_MOC_TO_TYPE: Record<CotMocRow["loai_moc"], MilestoneType> = {
  hoc: "hoc",
  lam_viec: "lam",
  du_an: "du-an",
  su_kien: "su-kien",
  thanh_tuu: "thanh-tuu",
  ca_nhan: "ca-nhan",
};

function mapVisibility(
  mode: CotMocRow["che_do_hien_thi"],
): MilestoneVisibility | undefined {
  if (mode === "feature") return "feature";
  if (mode === "chi_minh") return "private";
  return "public";
}

function parseServerBlocks(raw: unknown): ServerBlock[] | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return null;
  const out: ServerBlock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.loai !== "string") continue;
    out.push({
      id: typeof obj.id === "string" ? obj.id : `b-${out.length}`,
      loai: obj.loai as ServerBlock["loai"],
      thu_tu: typeof obj.thu_tu === "number" ? obj.thu_tu : out.length,
      config:
        obj.config && typeof obj.config === "object"
          ? (obj.config as Record<string, unknown>)
          : {},
    });
  }
  out.sort((a, b) => a.thu_tu - b.thu_tu);
  return out;
}

function milestoneCoverMedia(
  coverId: string | null | undefined,
  blocks: unknown,
  label: string,
): MilestoneMediaItem[] {
  return milestonePreviewMedia(coverId, parseServerBlocks(blocks), label);
}

/**
 * Card timeline cho lời mời đồng tác giả — dùng preload UI trước khi accept.
 * Chỉ trả về khi viewer còn row `pending` trên `content_tac_pham_tac_gia`.
 */
export async function fetchCoAuthorInviteMilestoneCard(
  tacPhamId: string,
  viewerId: string,
): Promise<CoAuthorInviteMilestoneResult> {
  const admin = createServiceRoleClient();

  const { data: tagRow } = await admin
    .from("content_tac_pham_tac_gia")
    .select("vai_tro, trang_thai")
    .eq("id_tac_pham", tacPhamId)
    .eq("id_nguoi_dung", viewerId)
    .eq("la_chu_so_huu", false)
    .maybeSingle();

  if (!tagRow || tagRow.trang_thai !== "pending") {
    return { ok: false, error: "Không tìm thấy lời mời đồng tác giả." };
  }

  const { data: tp } = await admin
    .from("content_tac_pham")
    .select(
      "id, slug, tieu_de, cover_id, noi_dung_blocks, id_nguoi_dung",
    )
    .eq("id", tacPhamId)
    .maybeSingle();

  if (!tp?.slug) {
    return { ok: false, error: "Bài viết không tồn tại." };
  }

  const { data: link } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_cot_moc")
    .eq("id_tac_pham", tacPhamId)
    .order("thu_tu", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!link?.id_cot_moc) {
    return { ok: false, error: "Bài viết chưa gắn vào cột mốc." };
  }

  const { data: cm } = await admin
    .from("content_cot_moc")
    .select(
      "id, loai_moc, tieu_de, mo_ta, thoi_diem, che_do_hien_thi, tao_luc",
    )
    .eq("id", link.id_cot_moc as string)
    .maybeSingle<CotMocRow>();

  if (!cm) {
    return { ok: false, error: "Cột mốc không tồn tại." };
  }

  const { data: owner } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .eq("id", tp.id_nguoi_dung as string)
    .maybeSingle();

  const tagsByTacPham = await fetchArticleTagsForTacPham(admin, [tacPhamId]);
  const myRole = (tagRow.vai_tro as string | null) ?? "";
  const dateObj = new Date(cm.thoi_diem);

  const milestone: MilestoneItem = {
    id: `${cm.id}:${tacPhamId}`,
    cotMocId: cm.id,
    variant: "tagged",
    type: LOAI_MOC_TO_TYPE[cm.loai_moc],
    visibility: mapVisibility(cm.che_do_hien_thi),
    year: dateObj.getUTCFullYear(),
    month: dateObj.getUTCMonth() + 1,
    day: dateObj.getUTCDate(),
    createdAt: cm.tao_luc,
    title: cm.tieu_de,
    body: cm.mo_ta || null,
    postSlug: tp.slug as string,
    postOwnerSlug: (owner?.slug as string) ?? null,
    postOwnerId: tp.id_nguoi_dung as string,
    tacPhamId,
    canProposeCoAuthor: true,
    media: milestoneCoverMedia(
      tp.cover_id as string | null,
      tp.noi_dung_blocks,
      (tp.tieu_de as string) || cm.tieu_de,
    ),
    noiDungBlocks: parseServerBlocks(tp.noi_dung_blocks),
    articleTags: tagsByTacPham.get(tacPhamId) ?? [],
    attribution: owner
      ? {
          name: (owner.ten_hien_thi as string) || (owner.slug as string),
          role: myRole || null,
          slug: owner.slug as string,
          avatarUrl: getAvatarUrl((owner.avatar_id as string) || null) ?? null,
          initial: ((owner.ten_hien_thi as string) || (owner.slug as string))
            .slice(0, 1)
            .toUpperCase(),
          isOrg: false,
        }
      : null,
    coAuthorCredits: [],
  };

  return { ok: true, milestone };
}
