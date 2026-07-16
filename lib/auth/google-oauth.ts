"use client";

import {
  authOriginMismatchMessage,
  resolveAuthOrigin,
} from "@/lib/auth/auth-origin";
import {
  IN_APP_BROWSER_OAUTH_MESSAGE,
  isInAppBrowser,
} from "@/lib/auth/in-app-browser";
import type { LoginIntent } from "@/lib/auth/login-intent";
import { mapOAuthError } from "@/lib/auth/oauth-errors";
import { stashOAuthIntent } from "@/lib/auth/oauth-intent-client";
import { resolveOAuthReturnPath } from "@/lib/auth/oauth-return-path";
import { stashOAuthReturnTo } from "@/lib/auth/oauth-return-client";
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
  options?: { returnTo?: string },
): Promise<{ error?: string }> {
  if (typeof window === "undefined") {
    return { error: "Phải chạy ở client để khởi tạo OAuth." };
  }

  if (isInAppBrowser()) {
    return { error: IN_APP_BROWSER_OAUTH_MESSAGE };
  }

  const originMismatch = authOriginMismatchMessage();
  if (originMismatch) {
    return { error: originMismatch };
  }

  try {
    stashOAuthIntent(intent);
    const returnPath = resolveOAuthReturnPath(options);
    if (returnPath) {
      stashOAuthReturnTo(returnPath);
    }

    const supabase = createSupabaseBrowserClient();
    const origin = resolveAuthOrigin();
    /* redirectTo KHÔNG thêm query — OAuth redirect_uri phải khớp chính xác Supabase allowlist. */
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
    if (error) return { error: mapOAuthError(error.message) };
    return {};
  } catch (e) {
    const raw =
      e instanceof Error ? e.message : "Lỗi không xác định khi mở Google.";
    return { error: mapOAuthError(raw) };
  }
}
