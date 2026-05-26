"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type LoginIntent = "register" | "login";

/**
 * Khởi tạo Google OAuth flow cho 1 intent — dùng cả từ click button lẫn auto-trigger
 * khi user vào `/login?auto=register`.
 *
 * Trả về Promise resolve với `{ error }`. Nếu không lỗi → browser sẽ điều hướng sang
 * Google (caller giữ trạng thái loading=true cho tới khi quay lại).
 *
 * Intent được forward qua query của `redirectTo` (Supabase tự sinh OAuth `state` cho CSRF,
 * không override được — vì vậy không dùng `queryParams.state`).
 */
export async function startGoogleLogin(
  intent: LoginIntent,
): Promise<{ error?: string }> {
  if (typeof window === "undefined") {
    return { error: "Phải chạy ở client để khởi tạo OAuth." };
  }
  try {
    const supabase = createSupabaseBrowserClient();
    const cbUrl = new URL("/auth/callback", window.location.origin);
    cbUrl.searchParams.set("intent", intent);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: cbUrl.toString(),
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Lỗi không xác định khi mở Google.",
    };
  }
}
