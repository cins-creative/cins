import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type GiaiDoan =
  | "moi_bat_dau"
  | "dang_hoc"
  | "dang_lam"
  | "tim_viec"
  | "freelance"
  | "dang_day";

export type UserProfile = {
  id: string;
  auth_user_id: string;
  slug: string;
  ten_hien_thi: string | null;
  giai_doan: GiaiDoan | null;
  email: string | null;
  /** Cloudflare Images id — resolve sang URL bằng `getAvatarUrl` (lib/journey). */
  avatar_id: string | null;
};

export type SessionAndProfile = {
  authUserId: string;
  email: string | null;
  profile: UserProfile | null;
};

/**
 * Lấy session hiện tại + profile từ `user_nguoi_dung`.
 * Trả `null` nếu chưa đăng nhập.
 *
 * Trigger `handle_new_user()` insert profile tự động khi auth user mới được tạo,
 * nhưng vẫn có race nhỏ ngay sau OAuth callback đầu tiên — caller cần xử lý
 * trường hợp `profile === null` (thường = redirect về /onboarding bridge).
 */
async function getCurrentSessionAndProfileUncached(): Promise<SessionAndProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("user_nguoi_dung")
    .select("id, auth_user_id, slug, ten_hien_thi, giai_doan, avatar_id")
    .eq("auth_user_id", user.id)
    .maybeSingle<{
      id: string;
      auth_user_id: string;
      slug: string;
      ten_hien_thi: string | null;
      giai_doan: GiaiDoan | null;
      avatar_id: string | null;
    }>();

  return {
    authUserId: user.id,
    email: user.email ?? null,
    profile: profile
      ? { ...profile, email: user.email ?? null }
      : null,
  };
}

/** Dedupe auth + profile trong cùng một request RSC (layout / shell / topbar). */
export const getCurrentSessionAndProfile = cache(getCurrentSessionAndProfileUncached);

/** Convenience — chỉ lấy auth user, bỏ qua profile. Dùng cho middleware-level check. */
export async function getCurrentAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
