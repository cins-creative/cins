import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isCinsAdminEmail } from "@/lib/auth/cins-admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Intent = "register" | "login";
function parseIntent(raw: string | null): Intent {
  return raw === "register" ? "register" : "login";
}

/**
 * Tìm cookie PKCE code-verifier mà `@supabase/ssr` browser client viết khi
 * `signInWithOAuth` chạy. Tên cookie có dạng `sb-<projectref>-auth-token-code-verifier`,
 * có thể bị chunk (`.0`, `.1`).
 */
async function hasVerifierCookie(): Promise<boolean> {
  const store = await cookies();
  return store
    .getAll()
    .some(
      (c) =>
        c.name.startsWith("sb-") && c.name.includes("auth-token-code-verifier"),
    );
}

/**
 * Google OAuth callback — Supabase redirect kèm `code` sau khi user xác thực ở Google.
 * Đọc `intent` từ query (do `signInWithOAuth.redirectTo` đính kèm) để rẽ luồng:
 *
 *  • intent=register → /onboarding (kể cả user cũ — họ chủ động bấm Đăng ký)
 *  • intent=login    → admin/onboarding/journey theo `giai_doan`
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const intent = parseIntent(url.searchParams.get("intent"));
  const next = url.searchParams.get("next");
  const errorDescription = url.searchParams.get("error_description");

  const loginUrl = new URL("/login", url.origin);

  if (errorDescription) {
    loginUrl.searchParams.set("error", errorDescription);
    return NextResponse.redirect(loginUrl);
  }
  if (!code) {
    loginUrl.searchParams.set("error", "Thiếu mã xác thực từ Google.");
    return NextResponse.redirect(loginUrl);
  }

  /* Kiểm tra verifier cookie tồn tại trước khi gọi exchangeCodeForSession.
     Nếu thiếu → user (1) bắt đầu OAuth ở domain khác, (2) Supabase fallback Site URL
     do redirect URL không match allow-list, hoặc (3) browser xóa cookie giữa chừng. */
  if (!(await hasVerifierCookie())) {
    loginUrl.searchParams.set(
      "error",
      "Phiên đăng nhập không tìm thấy mã xác minh PKCE trên trình duyệt. " +
        "Hãy chắc rằng URL hiện tại nằm trong Supabase → Authentication → URL Configuration → Redirect URLs, " +
        "rồi xóa cookie và thử lại trong cửa sổ ẩn danh.",
    );
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(
    code,
  );
  if (exchangeErr) {
    loginUrl.searchParams.set("error", exchangeErr.message);
    return NextResponse.redirect(loginUrl);
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    loginUrl.searchParams.set(
      "error",
      userErr?.message ?? "Không lấy được tài khoản sau xác thực.",
    );
    return NextResponse.redirect(loginUrl);
  }

  /* `next=...` chỉ chấp nhận same-origin tương đối — chống open-redirect. */
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  /* INTENT = REGISTER — luôn vào onboarding, kể cả user cũ. */
  if (intent === "register") {
    const onboardUrl = new URL("/onboarding", url.origin);
    onboardUrl.searchParams.set("intent", "register");
    return NextResponse.redirect(onboardUrl);
  }

  /* INTENT = LOGIN — phân nhánh theo email admin và giai_doan. */
  if (isCinsAdminEmail(user.email)) {
    return NextResponse.redirect(new URL("/admin", url.origin));
  }

  const { data: profile } = await supabase
    .from("user_nguoi_dung")
    .select("slug, giai_doan")
    .eq("auth_user_id", user.id)
    .maybeSingle<{ slug: string; giai_doan: string | null }>();

  if (!profile || !profile.giai_doan) {
    return NextResponse.redirect(new URL("/onboarding", url.origin));
  }

  if (safeNext) {
    return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(
    new URL(`/${encodeURIComponent(profile.slug)}/journey`, url.origin),
  );
}
