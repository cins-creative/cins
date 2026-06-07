import "server-only";

import {
  attachFiltersToPost,
  resolveFilterIdsBySlugs,
} from "@/lib/cong-dong/filters";

/** Gắn nhãn flair lên cột mốc cộng đồng vừa tạo khi publish từ editor. */
export async function syncCongDongPostFromPublish(params: {
  orgId: string;
  cotMocId: string;
  filterSlugs: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const filterIds = await resolveFilterIdsBySlugs(
    params.orgId,
    params.filterSlugs,
  );
  if (params.filterSlugs.length > 0 && filterIds.length === 0) {
    return { ok: false, error: "Nhãn bài đăng không hợp lệ." };
  }

  if (filterIds.length === 0) return { ok: true };

  const result = await attachFiltersToPost(params.cotMocId, filterIds);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
