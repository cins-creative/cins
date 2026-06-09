import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Nhãn filter mặc định cho org `co_so_dao_tao` — seed app layer (L13). */
export const DEFAULT_CO_SO_FILTER_TEMPLATES = [
  { ten: "Bài viết", slug: "bai-viet", mau: "#1F74C9", thu_tu: 0 },
  { ten: "Khóa học", slug: "khoa-hoc", mau: "#BB89F8", thu_tu: 1 },
  { ten: "Sự kiện", slug: "su-kien", mau: "#FFB85C", thu_tu: 2 },
  { ten: "Thành tựu", slug: "thanh-tuu", mau: "#6EFEC0", thu_tu: 3 },
] as const;

function isFilterTableMissingError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("filter_nhan") || m.includes("does not exist") || m.includes("42p01");
}

/**
 * Seed `filter_nhan` cho org. Bỏ qua an toàn nếu bảng chưa có (migration chưa chạy).
 * Lỗi insert thật (không phải missing table) → trả lỗi để caller rollback.
 */
export async function seedDefaultCoSoFilters(
  orgId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  const { error: probeError } = await admin.from("filter_nhan").select("id").limit(1);
  if (probeError) {
    if (isFilterTableMissingError(probeError.message)) return { ok: true };
    return { ok: false, error: probeError.message };
  }

  const { data: existing } = await admin
    .from("filter_nhan")
    .select("slug")
    .eq("id_to_chuc", orgId)
    .returns<Array<{ slug: string }>>();

  const existingSlugs = new Set((existing ?? []).map((row) => row.slug));
  const missing = DEFAULT_CO_SO_FILTER_TEMPLATES.filter((t) => !existingSlugs.has(t.slug));
  if (missing.length === 0) return { ok: true };

  const rows = missing.map((t) => ({
    id_to_chuc: orgId,
    id_nguoi_dung: null,
    ten: t.ten,
    slug: t.slug,
    mau: t.mau,
    thu_tu: t.thu_tu,
  }));

  const { error } = await admin.from("filter_nhan").insert(rows);
  if (error) {
    if (isFilterTableMissingError(error.message)) return { ok: true };
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
