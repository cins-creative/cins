import "server-only";

import { collectGalleryStubs } from "@/lib/journey/gallery-stubs";
import { isUuid } from "@/lib/social/su-kien-constants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type OrderRow = {
  id_cot_moc: string;
  thu_tu: number;
};

/** Map id_cot_moc → thu_tu cho cột Nội dung nổi bật của một Journey. */
export async function fetchGalleryNoiBatOrderMap(
  userId: string,
): Promise<Map<string, number>> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_gallery_noi_bat")
    .select("id_cot_moc, thu_tu")
    .eq("id_nguoi_dung", userId)
    .order("thu_tu", { ascending: true })
    .returns<OrderRow[]>();

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(row.id_cot_moc, row.thu_tu);
  }
  return map;
}

/**
 * Áp thứ tự tùy chỉnh trên cột nổi bật:
 * - Bài chưa có thu_tu (mới gắn Nổi bật) → lên trước, giữ thứ tự mặc định (mới nhất).
 * - Bài đã kéo sắp → theo thu_tu ASC.
 */
export function sortPinnedByNoiBatOrder<T extends { cotMocId?: string }>(
  items: readonly T[],
  orderMap: Map<string, number>,
): T[] {
  if (orderMap.size === 0 || items.length <= 1) return [...items];

  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aId = a.item.cotMocId?.trim() ?? "";
      const bId = b.item.cotMocId?.trim() ?? "";
      const aOrd = aId ? orderMap.get(aId) : undefined;
      const bOrd = bId ? orderMap.get(bId) : undefined;
      const aHas = aOrd !== undefined;
      const bHas = bOrd !== undefined;
      if (aHas && bHas && aOrd !== bOrd) return aOrd - bOrd;
      // Chưa từng sắp → nổi lên đầu (mặc định mới nhất), không bị kẹt dưới hàng đã lock.
      if (aHas !== bHas) return aHas ? 1 : -1;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

/**
 * Lưu thứ tự aside — chỉ chủ Journey. cotMocIds = permutation của bài feature
 * đang hiện (content_cot_moc hoặc org_bai_dang; có thể thiếu bài ngoài limit aside;
 * phần còn lại nối sau).
 */
export async function reorderGalleryNoiBat(params: {
  userId: string;
  cotMocIds: string[];
}): Promise<{ ok: true; cotMocIds: string[] } | { ok: false; error: string }> {
  const ordered = [
    ...new Set(
      params.cotMocIds
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter((id) => isUuid(id)),
    ),
  ];
  if (ordered.length === 0) {
    return { ok: false, error: "Danh sách thứ tự trống hoặc không hợp lệ." };
  }

  const stubs = await collectGalleryStubs(params.userId);
  const featuredIds = stubs
    .filter((s) => s.visibility === "feature")
    .map((s) => s.cotMocId);
  const featuredSet = new Set(featuredIds);

  for (const id of ordered) {
    if (!featuredSet.has(id)) {
      return {
        ok: false,
        error: "Chỉ sắp được bài đang gắn Nổi bật trên Journey này.",
      };
    }
  }

  const orderedSet = new Set(ordered);
  const existingOrder = await fetchGalleryNoiBatOrderMap(params.userId);
  const remainder = featuredIds
    .filter((id) => !orderedSet.has(id))
    .map((id, index) => ({
      id,
      rank: existingOrder.get(id) ?? 10_000 + index,
      index,
    }))
    .sort((a, b) =>
      a.rank !== b.rank ? a.rank - b.rank : a.index - b.index,
    )
    .map((x) => x.id);

  const finalOrder = [...ordered, ...remainder];

  const admin = createServiceRoleClient();
  const rows = finalOrder.map((id_cot_moc, thu_tu) => ({
    id_nguoi_dung: params.userId,
    id_cot_moc,
    thu_tu,
  }));

  const { error: upsertError } = await admin
    .from("user_gallery_noi_bat")
    .upsert(rows, { onConflict: "id_nguoi_dung,id_cot_moc" });

  if (upsertError) {
    return { ok: false, error: upsertError.message };
  }

  const keep = new Set(finalOrder);
  const staleIds = [...existingOrder.keys()].filter((id) => !keep.has(id));
  if (staleIds.length > 0) {
    await admin
      .from("user_gallery_noi_bat")
      .delete()
      .eq("id_nguoi_dung", params.userId)
      .in("id_cot_moc", staleIds);
  }

  return { ok: true, cotMocIds: finalOrder };
}
