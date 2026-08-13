import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import {
  createBearerSupabaseClient,
  looksLikeSupabaseUserJwt,
  parseBearerAccessToken,
} from "@/lib/supabase/bearer";

export type GiaiDoan =
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

type ProfileRow = {
  id: string;
  auth_user_id: string;
  slug: string;
  ten_hien_thi: string | null;
  giai_doan: GiaiDoan | null;
  avatar_id: string | null;
};

async function loadProfileForUser(
  supabase: SupabaseClient,
  user: User,
): Promise<SessionAndProfile> {
  const { data: profile } = await supabase
    .from("user_nguoi_dung")
    .select("id, auth_user_id, slug, ten_hien_thi, giai_doan, avatar_id")
    .eq("auth_user_id", user.id)
    .maybeSingle<ProfileRow>();

  return {
    authUserId: user.id,
    email: user.email ?? null,
    profile: profile ? { ...profile, email: user.email ?? null } : null,
  };
}

/**
 * JWT user trên `Authorization: Bearer`.
 * `undefined` = không có header user → fall through cookie.
 * `null` = có JWT user nhưng không hợp lệ — không trộn cookie (tránh nhầm identity).
 *
 * Secret nội bộ (upload inline, cron) không phải JWT: bỏ qua, đọc cookie.
 */
async function sessionFromBearerHeader(): Promise<
  SessionAndProfile | null | undefined
> {
  let authorization: string | null = null;
  try {
    authorization = (await headers()).get("authorization");
  } catch {
    return undefined;
  }

  const token = parseBearerAccessToken(authorization);
  if (!token) return undefined;
  if (!looksLikeSupabaseUserJwt(token)) return undefined;

  const supabase = createBearerSupabaseClient(token);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return loadProfileForUser(supabase, user);
}

/**
 * Lấy session hiện tại + profile từ `user_nguoi_dung`.
 * Ưu tiên `Authorization: Bearer <jwt user>` (app native).
 * Secret nội bộ trên cùng header (upload/cron) bị bỏ qua — đọc cookie web.
 *
 * Trả `null` nếu chưa đăng nhập.
 *
 * Trigger `handle_new_user()` insert profile tự động khi auth user mới được tạo,
 * nhưng vẫn có race nhỏ ngay sau OAuth callback đầu tiên — caller cần xử lý
 * trường hợp `profile === null` (thường = redirect về /onboarding bridge).
 */
async function getCurrentSessionAndProfileUncached(): Promise<SessionAndProfile | null> {
  const fromBearer = await sessionFromBearerHeader();
  if (fromBearer !== undefined) return fromBearer;

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  return loadProfileForUser(supabase, user);
}

/** Dedupe auth + profile trong cùng một request RSC (layout / shell / topbar). */
export const getCurrentSessionAndProfile = cache(
  getCurrentSessionAndProfileUncached,
);

/** Convenience — chỉ lấy auth user, bỏ qua profile. Dùng cho middleware-level check. */
export async function getCurrentAuthUserId(): Promise<string | null> {
  const session = await getCurrentSessionAndProfile();
  return session?.authUserId ?? null;
}
