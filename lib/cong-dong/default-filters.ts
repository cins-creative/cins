import "server-only";

import { THAO_LUAN_LOAI_CONTEXT } from "@/lib/cong-dong/constants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** 4 nhãn mặc định — hardcode, không bảng template. Chỉ seed cho `cong_dong`. */
export const DEFAULT_CONG_DONG_FILTER_TEMPLATES = [
  {
    ten: "🎨 Khoe tác phẩm",
    slug: "khoe-tac-pham",
    icon: "palette",
    mau: "#BB89F8",
    thu_tu: 0,
  },
  {
    ten: "❓ Hỏi đáp",
    slug: "hoi-dap",
    icon: "help-circle",
    mau: "#1F74C9",
    thu_tu: 1,
  },
  {
    ten: "💼 Tuyển người",
    slug: "tuyen-nguoi",
    icon: "briefcase",
    mau: "#FFB85C",
    thu_tu: 2,
  },
  {
    ten: "📚 Tài nguyên",
    slug: "tai-nguyen",
    icon: "book-open",
    mau: "#6EFEC0",
    thu_tu: 3,
  },
] as const;

/** Bổ sung nhãn mặc định còn thiếu (idempotent — không trùng slug). */
export async function ensureDefaultCongDongFilters(
  orgId: string,
): Promise<
  | { ok: true; inserted: number }
  | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("content_thao_luan_filter")
    .select("slug")
    .eq("loai_context", THAO_LUAN_LOAI_CONTEXT.CONG_DONG)
    .eq("id_context", orgId)
    .returns<Array<{ slug: string }>>();

  const existingSlugs = new Set((existing ?? []).map((row) => row.slug));
  const missing = DEFAULT_CONG_DONG_FILTER_TEMPLATES.filter(
    (t) => !existingSlugs.has(t.slug),
  );
  if (missing.length === 0) return { ok: true, inserted: 0 };

  const rows = missing.map((t) => ({
    loai_context: THAO_LUAN_LOAI_CONTEXT.CONG_DONG,
    id_context: orgId,
    ten: t.ten,
    slug: t.slug,
    icon: t.icon,
    mau: t.mau,
    thu_tu: t.thu_tu,
  }));

  const { error } = await admin.from("content_thao_luan_filter").insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true, inserted: missing.length };
}

/** Seed đủ 4 nhãn khi tạo cộng đồng mới. */
export async function seedDefaultCongDongFilters(
  orgId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await ensureDefaultCongDongFilters(orgId);
  if (!result.ok) return result;
  return { ok: true };
}
