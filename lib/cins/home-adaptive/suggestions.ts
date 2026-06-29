import "server-only";

import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type FollowSuggestion = {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
  giaiDoan: string | null;
};

type UserRow = {
  id: string;
  slug: string | null;
  ten_hien_thi: string | null;
  avatar_id: string | null;
  giai_doan: string | null;
};

/**
 * Gợi ý người để theo dõi (module `goi_y_theo_doi`, luôn có — brief §5).
 * Loại bản thân + người đã theo dõi; ưu tiên hoạt động gần đây.
 * MVP gợi ý người dùng; gợi ý org/tag để session sau.
 */
export async function loadFollowSuggestions(
  viewerId: string,
  limit = 4,
): Promise<FollowSuggestion[]> {
  const admin = createServiceRoleClient();

  const { data: followed } = await admin
    .from("user_theo_doi")
    .select("id_doi_tuong")
    .eq("id_nguoi_theo_doi", viewerId)
    .eq("loai_doi_tuong", "nguoi_dung")
    .returns<Array<{ id_doi_tuong: string }>>();

  const excluded = new Set<string>([
    viewerId,
    ...(followed ?? []).map((r) => r.id_doi_tuong),
  ]);

  const { data } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
    .eq("trang_thai_tai_khoan", "dang_hoat_dong")
    .order("lan_cuoi_active", { ascending: false, nullsFirst: false })
    .limit(limit + excluded.size + 12)
    .returns<UserRow[]>();

  const out: FollowSuggestion[] = [];
  for (const row of data ?? []) {
    if (excluded.has(row.id) || !row.slug?.trim()) continue;
    out.push({
      id: row.id,
      slug: row.slug.trim(),
      name: row.ten_hien_thi?.trim() || row.slug.trim(),
      avatarUrl: getAvatarUrl(row.avatar_id),
      giaiDoan: row.giai_doan,
    });
    if (out.length >= limit) break;
  }
  return out;
}
