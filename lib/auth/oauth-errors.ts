import { IN_APP_BROWSER_OAUTH_MESSAGE } from "@/lib/auth/in-app-browser";

/**
 * Map thông báo lỗi OAuth / Google Auth sang tiếng Việt thân thiện.
 * Dùng ở client (`startGoogleLogin`) và server (`/auth/callback`).
 */
export function mapOAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("disallowed_useragent") ||
    lower.includes("disallowed user agent") ||
    (lower.includes("403") && lower.includes("useragent"))
  ) {
    return IN_APP_BROWSER_OAUTH_MESSAGE;
  }

  if (lower.includes("access_denied") || lower.includes("access denied")) {
    return "Bạn đã hủy đăng nhập Google. Thử lại khi sẵn sàng.";
  }

  if (
    lower.includes("redirect_uri_mismatch") ||
    lower.includes("redirect uri mismatch")
  ) {
    return "Cấu hình đăng nhập Google chưa khớp domain. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.";
  }

  if (
    lower.includes("pkce") ||
    lower.includes("code verifier") ||
    lower.includes("code_verifier")
  ) {
    return "Phiên đăng nhập hết hạn hoặc mở sai trình duyệt. Vui lòng thử «Đăng nhập với Google» lại.";
  }

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.";
  }

  return message;
}
