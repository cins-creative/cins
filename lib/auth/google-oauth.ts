"use client";

import {
  authOriginMismatchMessage,
  resolveAuthOrigin,
} from "@/lib/auth/auth-origin";
import type { LoginIntent } from "@/lib/auth/login-intent";
import { stashOAuthIntent } from "@/lib/auth/oauth-intent-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type { LoginIntent } from "@/lib/auth/login-intent";

/**
 * Khởi tạo Google OAuth (PKCE + cookie) — dùng từ nút hoặc `/login?auto=...`.
 *
 * `redirectTo` = `{SITE_ORIGIN}/auth/callback` (không query) để khớp Supabase Redirect URLs.
 * Intent lưu cookie `cins-oauth-intent` trước khi redirect sang Google.
 */
export async function startGoogleLogin(
  intent: LoginIntent,
): Promise<{ error?: string }> {
  if (typeof window === "undefined") {
    return { error: "Phải chạy ở client để khởi tạo OAuth." };
  }

  const originMismatch = authOriginMismatchMessage();
  if (originMismatch) {
    return { error: originMismatch };
  }

  try {
    stashOAuthIntent(intent);

    const supabase = createSupabaseBrowserClient();
    const origin = resolveAuthOrigin();
    const redirectTo = `${origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          /* Chỉ bắt chọn tài khoản khi đăng ký — đăng nhập lại dùng Google session đã nhớ. */
          ...(intent === "register" ? { prompt: "select_account" } : {}),
        },
        skipBrowserRedirect: false,
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
