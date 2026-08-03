import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Bố cục chỉ đổi qua `PUT/DELETE /api/user/home-layout` → tag invalidate là đủ. */
const HOME_LAYOUT_REVALIDATE_SEC = 300;

export function homeLayoutTag(profileId: string): string {
  return `home-layout:${profileId}`;
}

async function readHomeLayout(profileId: string): Promise<unknown> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_nguoi_dung")
    .select("home_layout")
    .eq("id", profileId)
    .maybeSingle<{ home_layout: unknown }>();
  if (error) throw new Error(error.message);
  return data?.home_layout ?? {};
}

/**
 * `home_layout` thô của viewer. Cache theo tag để trang chủ không đọc DB mỗi lần
 * tải; lỗi đọc được catch **ngoài** cache nên fallback không bị ghim 5 phút
 * (cột chưa migrate → `{}` = mặc định theo persona, không chặn trang chủ).
 */
export async function loadHomeLayoutRaw(profileId: string): Promise<unknown> {
  try {
    return await unstable_cache(
      () => readHomeLayout(profileId),
      ["home-layout", profileId],
      {
        revalidate: HOME_LAYOUT_REVALIDATE_SEC,
        tags: [homeLayoutTag(profileId)],
      },
    )();
  } catch (err) {
    console.warn(
      "[home-layout] read skipped:",
      err instanceof Error ? err.message : err,
    );
    return {};
  }
}

export function revalidateHomeLayout(profileId: string): void {
  // Next 16: cần cache profile ở tham số 2; `updateTag` chỉ dùng được trong
  // Server Action nên route handler dùng `revalidateTag(tag, "max")`.
  revalidateTag(homeLayoutTag(profileId), "max");
}
