import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Số quầy đã duyệt của 1 sự kiện — dùng hiện tab mà không chạy pipeline nặng. */
export async function countQuayDaDuyet(suKienId: string): Promise<number> {
  const id = suKienId?.trim();
  if (!id) return 0;
  const admin = createServiceRoleClient();
  const { count, error } = await admin
    .from("shop_quay_su_kien")
    .select("id", { count: "exact", head: true })
    .eq("id_su_kien", id)
    .eq("trang_thai", "da_duyet");
  if (error) {
    console.error("[shop] countQuayDaDuyet", error);
    return 0;
  }
  return typeof count === "number" && count > 0 ? count : 0;
}

/** Batch count quầy đã duyệt theo danh sách sự kiện. */
export async function countQuayDaDuyetBySuKienIds(
  suKienIds: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const unique = [...new Set(suKienIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_quay_su_kien")
    .select("id_su_kien")
    .in("id_su_kien", unique)
    .eq("trang_thai", "da_duyet")
    .limit(Math.min(unique.length * 100, 5000));
  if (error) {
    console.error("[shop] countQuayDaDuyetBySuKienIds", error);
    return out;
  }
  for (const row of (data ?? []) as Array<{ id_su_kien: string }>) {
    const sid = row.id_su_kien;
    out.set(sid, (out.get(sid) ?? 0) + 1);
  }
  return out;
}
