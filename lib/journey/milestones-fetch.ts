import "server-only";

import type {
  MilestoneItem,
  MilestoneType,
  MilestoneVariant,
  MilestoneVisibility,
} from "@/components/journey/milestone-types";
import type { Block as ServerBlock } from "@/lib/editor/types";
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
  stats: { cotMoc: number; cotMocVerified: number; tacPham: number };
}> {
  const { userId, isOwner } = params;
  const admin = createServiceRoleClient();

  const { data: cotMocs, error } = await admin
    .from("content_cot_moc")
    .select(
      "id, loai_moc, nguon_goc, tieu_de, mo_ta, thoi_diem, che_do_hien_thi",
    )
    .eq("id_nguoi_dung", userId)
    .order("thoi_diem", { ascending: false })
    .returns<CotMocRow[]>();

  if (error || !cotMocs || cotMocs.length === 0) {
    return {
      milestones: [],
      stats: { cotMoc: 0, cotMocVerified: 0, tacPham: 0 },
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
       wire link "Sửa bài viết" → `/{slug}/p/{postSlug}/sua`. */
    const firstPost = tps[0]?.content_tac_pham ?? null;
    const firstPostSlug = firstPost?.slug ?? null;
    const noiDungBlocks = parseServerBlocks(firstPost?.noi_dung_blocks);

    return {
      id: m.id,
      variant: "self" as MilestoneVariant,
      type: LOAI_MOC_TO_TYPE[m.loai_moc],
      visibility: mapVisibility(m.che_do_hien_thi),
      year,
      month,
      day,
      title: m.tieu_de,
      body: m.mo_ta || null,
      postSlug: firstPostSlug,
      /* `cover_id` KHÔNG render trên card Journey nữa — chỉ dùng cho
         Gallery thumb. Card render `noiDungBlocks` inline (xem
         `JourneyMilestoneCard`). */
      media: [],
      noiDungBlocks,
    };
  });

  return {
    milestones,
    stats: {
      cotMoc: cotMocs.length,
      cotMocVerified: 0,
      tacPham: thuocMocs.length,
    },
  };
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
