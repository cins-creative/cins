import "server-only";

import type {
  MilestoneItem,
  MilestoneType,
  MilestoneVariant,
  MilestoneVisibility,
} from "@/components/journey/milestone-types";
import type { Block as ServerBlock } from "@/lib/editor/types";
import type { CoAuthorCredit } from "@/components/journey/milestone-types";
import { fetchArticleTagsForTacPham } from "@/lib/journey/article-tags-batch";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ Fetch milestones cho 1 user (Journey center column).             ║
   ║                                                                  ║
   ║ Source: `content_cot_moc` của user, kèm các tác phẩm gắn vào     ║
   ║ qua `content_tac_pham_thuoc_moc → content_tac_pham`. Adapter map ║
   ║ về `MilestoneItem` (component-level type).                       ║
   ║                                                                  ║
   ║ Visibility: nếu viewer KHÔNG phải owner, lọc `chi_minh` đi.      ║
   ║ `theo_nhom` lượt này coi như public (chưa có user_nhom_boi_canh  ║
   ║ filter — wire sau).                                              ║
   ╚══════════════════════════════════════════════════════════════════╝ */

type CotMocRow = {
  id: string;
  loai_moc:
    | "hoc"
    | "lam_viec"
    | "du_an"
    | "su_kien"
    | "thanh_tuu"
    | "ca_nhan";
  nguon_goc: string;
  tieu_de: string;
  mo_ta: string | null;
  thoi_diem: string; // YYYY-MM-DD
  che_do_hien_thi: "public" | "theo_nhom" | "chi_minh" | "feature";
  /** Thời điểm tạo record (timestamptz) — tiebreak khi cùng `thoi_diem`. */
  tao_luc: string | null;
};

type ThuocMocRow = {
  id_cot_moc: string;
  id_tac_pham: string;
  thu_tu: number;
  content_tac_pham: {
    id: string;
    slug: string | null;
    tieu_de: string;
    cover_id: string | null;
    loai_tac_pham: string;
    noi_dung_blocks: unknown;
  } | null;
};

const LOAI_MOC_TO_TYPE: Record<CotMocRow["loai_moc"], MilestoneType> = {
  hoc: "hoc",
  lam_viec: "lam",
  du_an: "du-an",
  su_kien: "su-kien",
  thanh_tuu: "thanh-tuu",
  ca_nhan: "ca-nhan",
};

export async function fetchMilestonesForUser(params: {
  userId: string;
  isOwner: boolean;
}): Promise<{
  milestones: MilestoneItem[];
  stats: { cotMoc: number; cotMocVerified: number; tacPham: number; noiBat: number };
}> {
  const { userId, isOwner } = params;
  const admin = createServiceRoleClient();
  const { count: totalTacPham } = await admin
    .from("content_tac_pham")
    .select("id", { count: "exact", head: true })
    .eq("id_nguoi_dung", userId);

  const { data: cotMocs, error } = await admin
    .from("content_cot_moc")
    .select(
      "id, loai_moc, nguon_goc, tieu_de, mo_ta, thoi_diem, che_do_hien_thi, tao_luc",
    )
    .eq("id_nguoi_dung", userId)
    /* Order chính: ngày xảy ra (`thoi_diem`) DESC. Tiebreak: `tao_luc` DESC
       → milestone mới tạo trong cùng ngày lên trên. */
    .order("thoi_diem", { ascending: false })
    .order("tao_luc", { ascending: false, nullsFirst: false })
    .returns<CotMocRow[]>();

  if (error || !cotMocs || cotMocs.length === 0) {
    return {
      milestones: [],
      stats: {
        cotMoc: 0,
        cotMocVerified: 0,
        tacPham: totalTacPham ?? 0,
        noiBat: 0,
      },
    };
  }

  /* Lọc theo visibility. Owner thấy tất cả; guest bỏ `chi_minh`. */
  const visible = isOwner
    ? cotMocs
    : cotMocs.filter((m) => m.che_do_hien_thi !== "chi_minh");

  /* Lấy tất cả tác phẩm gắn vào các cột mốc (1 query gộp). */
  const ids = visible.map((m) => m.id);
  let thuocMocs: ThuocMocRow[] = [];
  if (ids.length > 0) {
    const { data } = await admin
      .from("content_tac_pham_thuoc_moc")
      .select(
        "id_cot_moc, id_tac_pham, thu_tu, content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, cover_id, loai_tac_pham, noi_dung_blocks)",
      )
      .in("id_cot_moc", ids)
      .order("thu_tu", { ascending: true })
      .returns<ThuocMocRow[]>();
    thuocMocs = data || [];
  }

  const tpByMoc = new Map<string, ThuocMocRow[]>();
  for (const t of thuocMocs) {
    const arr = tpByMoc.get(t.id_cot_moc) || [];
    arr.push(t);
    tpByMoc.set(t.id_cot_moc, arr);
  }

  /* Article tags — batch fetch cho tác phẩm CHÍNH (thu_tu = 0) của mỗi cột
     mốc. Chỉ lấy first post vì card Journey render 1 bài chính; nếu muốn
     tag cho mọi post cần đổi quan hệ render trên card. */
  const firstPostIds: string[] = [];
  for (const arr of tpByMoc.values()) {
    const first = arr[0]?.content_tac_pham;
    if (first?.id) firstPostIds.push(first.id);
  }
  const tagsByTacPham = await fetchArticleTagsForTacPham(admin, firstPostIds);
  const creditsByTacPham = await loadAcceptedCredits(admin, firstPostIds);

  /* Sort: `feature` ghim lên đầu (giữ thứ tự `thoi_diem` desc trong nhóm).
     Sau đó tới các milestone thường (cũng sort `thoi_diem` desc đã có sẵn
     từ query). Stable sort của `Array.prototype.sort` đảm bảo thứ tự
     trong từng nhóm không bị xáo. */
  const sorted = [...visible].sort((a, b) => {
    const aFeat = a.che_do_hien_thi === "feature" ? 1 : 0;
    const bFeat = b.che_do_hien_thi === "feature" ? 1 : 0;
    if (aFeat !== bFeat) return bFeat - aFeat;
    return 0;
  });

  const milestones: MilestoneItem[] = sorted.map((m) => {
    const tps = tpByMoc.get(m.id) || [];
    const dateObj = new Date(m.thoi_diem);
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth() + 1;
    const day = dateObj.getUTCDate();

    /* `postSlug` lấy từ tác phẩm đầu tiên (thu_tu = 0). Dùng để menu owner
       wire link "Sửa bài viết" → `/{slug}/p/{postSlug}/edit`. */
    const firstPost = tps[0]?.content_tac_pham ?? null;
    const firstPostSlug = firstPost?.slug ?? null;
    const noiDungBlocks = parseServerBlocks(firstPost?.noi_dung_blocks);
    const articleTags = firstPost?.id
      ? (tagsByTacPham.get(firstPost.id) ?? [])
      : [];

    return {
      id: m.id,
      variant: "self" as MilestoneVariant,
      type: LOAI_MOC_TO_TYPE[m.loai_moc],
      visibility: mapVisibility(m.che_do_hien_thi),
      year,
      month,
      day,
      createdAt: m.tao_luc,
      title: m.tieu_de,
      body: m.mo_ta || null,
      postSlug: firstPostSlug,
      /* `cover_id` KHÔNG render trên card Journey nữa — chỉ dùng cho
         Gallery thumb. Card render `noiDungBlocks` inline (xem
         `JourneyMilestoneCard`). */
      media: [],
      noiDungBlocks,
      articleTags,
      coAuthorCredits: firstPost?.id
        ? (creditsByTacPham.get(firstPost.id) ?? [])
        : [],
    };
  });

  const tagged = await fetchTaggedMilestonesForUser({
    userId,
    isOwner,
    admin,
  });

  const merged = mergeMilestoneLists(milestones, tagged);

  return {
    milestones: merged,
    stats: {
      cotMoc: cotMocs.length,
      cotMocVerified: 0,
      tacPham: totalTacPham ?? 0,
      noiBat: new Set(
        thuocMocs
          .filter((row) => {
            const cm = cotMocs.find((m) => m.id === row.id_cot_moc);
            return cm?.che_do_hien_thi === "feature";
          })
          .map((row) => row.id_tac_pham),
      ).size,
    },
  };
}

async function fetchTaggedMilestonesForUser(params: {
  userId: string;
  isOwner: boolean;
  admin: ReturnType<typeof createServiceRoleClient>;
}): Promise<MilestoneItem[]> {
  const { userId, isOwner, admin } = params;

  const { data: tagRows } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_tac_pham, vai_tro")
    .eq("id_nguoi_dung", userId)
    .in("trang_thai", isOwner ? ["accepted", "pending"] : ["accepted"])
    .eq("la_chu_so_huu", false);

  if (!tagRows?.length) return [];

  const tacPhamIds = tagRows.map((r) => r.id_tac_pham as string);
  const roleByTp = new Map(
    tagRows.map((r) => [r.id_tac_pham as string, r.vai_tro as string | null]),
  );

  const { data: tacPhams } = await admin
    .from("content_tac_pham")
    .select(
      "id, slug, tieu_de, cover_id, loai_tac_pham, noi_dung_blocks, id_nguoi_dung",
    )
    .in("id", tacPhamIds);

  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_tac_pham, id_cot_moc")
    .in("id_tac_pham", tacPhamIds)
    .order("thu_tu", { ascending: true });

  const cotMocIdByTp = new Map<string, string>();
  for (const link of links ?? []) {
    if (!cotMocIdByTp.has(link.id_tac_pham as string)) {
      cotMocIdByTp.set(link.id_tac_pham as string, link.id_cot_moc as string);
    }
  }

  const cotMocIds = [...new Set(cotMocIdByTp.values())];
  const { data: cotMocs } = await admin
    .from("content_cot_moc")
    .select(
      "id, loai_moc, nguon_goc, tieu_de, mo_ta, thoi_diem, che_do_hien_thi, tao_luc",
    )
    .in("id", cotMocIds)
    .returns<CotMocRow[]>();

  const cmById = new Map((cotMocs ?? []).map((cm) => [cm.id, cm]));

  const items: Array<{
    cm: CotMocRow;
    tp: NonNullable<typeof tacPhams>[number];
    myRole: string | null;
    tacPhamId: string;
  }> = [];

  for (const tp of tacPhams ?? []) {
    if (!tp.slug) continue;
    const cmId = cotMocIdByTp.get(tp.id as string);
    const cm = cmId ? cmById.get(cmId) : undefined;
    if (!cm) continue;
    if (!isOwner && cm.che_do_hien_thi === "chi_minh") continue;
    if (
      !isOwner &&
      cm.che_do_hien_thi !== "public" &&
      cm.che_do_hien_thi !== "feature"
    ) {
      continue;
    }
    items.push({
      cm,
      tp,
      myRole: roleByTp.get(tp.id as string) ?? null,
      tacPhamId: tp.id as string,
    });
  }

  if (items.length === 0) return [];

  const ownerIds = [...new Set(items.map((i) => i.tp.id_nguoi_dung))];
  const { data: owners } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", ownerIds);
  const ownerById = new Map((owners ?? []).map((o) => [o.id as string, o]));

  const taggedTpIds = items.map((i) => i.tacPhamId);
  const creditsByTacPham = await loadAcceptedCredits(admin, taggedTpIds);
  const tagsByTacPham = await fetchArticleTagsForTacPham(admin, taggedTpIds);

  return items.map(({ cm, tp, myRole, tacPhamId }) => {
    const owner = ownerById.get(tp.id_nguoi_dung);
    const dateObj = new Date(cm.thoi_diem);
    return {
      id: `${cm.id}:${tacPhamId}`,
      variant: "tagged" as MilestoneVariant,
      type: LOAI_MOC_TO_TYPE[cm.loai_moc],
      visibility: mapVisibility(cm.che_do_hien_thi),
      year: dateObj.getUTCFullYear(),
      month: dateObj.getUTCMonth() + 1,
      day: dateObj.getUTCDate(),
      createdAt: cm.tao_luc,
      title: cm.tieu_de,
      body: cm.mo_ta || null,
      postSlug: tp.slug,
      postOwnerSlug: (owner?.slug as string) ?? null,
      media: [],
      noiDungBlocks: parseServerBlocks(tp.noi_dung_blocks),
      articleTags: tagsByTacPham.get(tacPhamId) ?? [],
      attribution: owner
        ? {
            name: (owner.ten_hien_thi as string) || (owner.slug as string),
            role: myRole,
            slug: owner.slug as string,
            avatarUrl: getAvatarUrl((owner.avatar_id as string) || null) ?? null,
            initial: ((owner.ten_hien_thi as string) || owner.slug as string)
              .slice(0, 1)
              .toUpperCase(),
            isOrg: false,
          }
        : null,
      coAuthorCredits: creditsByTacPham.get(tacPhamId) ?? [],
    };
  });
}

async function loadAcceptedCredits(
  admin: ReturnType<typeof createServiceRoleClient>,
  tacPhamIds: string[],
): Promise<Map<string, CoAuthorCredit[]>> {
  const out = new Map<string, CoAuthorCredit[]>();
  if (tacPhamIds.length === 0) return out;

  const { data: rows } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_tac_pham, id_nguoi_dung, vai_tro, la_chu_so_huu, thu_tu")
    .in("id_tac_pham", tacPhamIds)
    .eq("trang_thai", "accepted")
    .order("thu_tu", { ascending: true });

  if (!rows?.length) return out;

  const userIds = [...new Set(rows.map((r) => r.id_nguoi_dung as string))];
  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", userIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  for (const row of rows) {
    const p = profileById.get(row.id_nguoi_dung as string);
    const credit: CoAuthorCredit = {
      name: (p?.ten_hien_thi as string) || (p?.slug as string) || "?",
      role: (row.vai_tro as string) || null,
      slug: (p?.slug as string) ?? null,
      avatarUrl: getAvatarUrl((p?.avatar_id as string) || null) ?? null,
      initial: ((p?.ten_hien_thi as string) || (p?.slug as string) || "?")
        .slice(0, 1)
        .toUpperCase(),
    };
    const list = out.get(row.id_tac_pham as string) ?? [];
    list.push(credit);
    out.set(row.id_tac_pham as string, list);
  }
  return out;
}

function mergeMilestoneLists(
  self: MilestoneItem[],
  tagged: MilestoneItem[],
): MilestoneItem[] {
  const selfIds = new Set(self.map((m) => m.id));
  const extra = tagged.filter((m) => !selfIds.has(m.id));
  const all = [...self, ...extra];
  return all.sort((a, b) => {
    const aFeat = a.visibility === "feature" ? 1 : 0;
    const bFeat = b.visibility === "feature" ? 1 : 0;
    if (aFeat !== bFeat) return bFeat - aFeat;
    const aDate = new Date(
      `${a.year}-${String(a.month).padStart(2, "0")}-${String(a.day).padStart(2, "0")}`,
    ).getTime();
    const bDate = new Date(
      `${b.year}-${String(b.month).padStart(2, "0")}-${String(b.day).padStart(2, "0")}`,
    ).getTime();
    if (aDate !== bDate) return bDate - aDate;
    const aCreated = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bCreated = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bCreated - aCreated;
  });
}

function mapVisibility(
  v: CotMocRow["che_do_hien_thi"],
): MilestoneVisibility {
  if (v === "feature") return "feature";
  if (v === "chi_minh") return "private";
  if (v === "theo_nhom") return "unlisted";
  return "public";
}

/**
 * Defensive parse `noi_dung_blocks` (jsonb / unknown) → canonical
 * `ServerBlock[]`. Trả `null` khi data trống/lỗi để consumer biết fallback
 * sang `body` / `mo_ta` thay vì render block list rỗng.
 */
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
  if (out.length === 0) return null;
  out.sort((a, b) => a.thu_tu - b.thu_tu);
  return out;
}
