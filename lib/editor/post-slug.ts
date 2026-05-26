import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ Slug cho bài đăng (`content_tac_pham.slug`).                    ║
   ║                                                                  ║
   ║ - Kebab-case, ASCII (bỏ dấu tiếng Việt).                         ║
   ║ - Unique trong phạm vi `id_nguoi_dung` (xem migration v6).       ║
   ║ - Nếu trùng → thêm `-2`, `-3`, … (giống pattern `nganh`).        ║
   ║ - Fallback `bai-viet` nếu tiêu đề rỗng (e.g. ai bypass FE).      ║
   ╚══════════════════════════════════════════════════════════════════╝ */

const MAX_BASE_LEN = 72;
const MAX_TOTAL_LEN = 80;

export function slugifyPostTitle(value: string): string {
  const cleaned = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_BASE_LEN);
  return cleaned || "bai-viet";
}

/** Trả về slug khả dụng (sau khi check unique) — fallback `-{ts}` nếu loop quá nhiều. */
export async function uniquePostSlugForUser(params: {
  userId: string;
  baseSlug: string;
}): Promise<string> {
  const { userId, baseSlug } = params;
  const admin = createServiceRoleClient();

  let candidate = baseSlug.slice(0, MAX_TOTAL_LEN);
  let n = 2;
  while (n < 100) {
    const { data, error } = await admin
      .from("content_tac_pham")
      .select("id")
      .eq("id_nguoi_dung", userId)
      .eq("slug", candidate)
      .maybeSingle();
    if (error && error.code !== "PGRST116") {
      /* DB lỗi thật — bubble lên cho action xử lý. */
      throw error;
    }
    if (!data) return candidate;
    const suffix = `-${n}`;
    candidate =
      baseSlug.slice(0, MAX_TOTAL_LEN - suffix.length) + suffix;
    n += 1;
  }
  /* Edge case cực hiếm — fallback timestamp để chắc chắn unique. */
  return `${baseSlug.slice(0, 60)}-${Date.now().toString(36)}`;
}
