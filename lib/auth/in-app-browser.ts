/**
 * Phát hiện trình duyệt nhúng (in-app browser / WebView).
 * Google OAuth từ chối môi trường này → 403 `disallowed_useragent`.
 */

const IN_APP_UA_PATTERNS: RegExp[] = [
  /\bwv\b/i, // Android WebView: "; wv)"
  /FBAN|FBAV|FB_IAB|FBIOS/i, // Facebook
  /Instagram/i,
  /Line\//i,
  /Zalo/i,
  /LinkedInApp/i,
  /Twitter/i,
  /MicroMessenger/i, // WeChat
  /Snapchat/i,
  /Pinterest/i,
  /TikTok/i,
  /BytedanceWebview/i,
  /MessengerLite/i,
];

export const IN_APP_BROWSER_OAUTH_MESSAGE =
  "Google không cho đăng nhập trong trình duyệt nhúng (Zalo, Facebook, Messenger…). " +
  "Hãy mở menu trình duyệt → «Mở bằng Safari / Chrome», hoặc copy địa chỉ cins.vn rồi dán vào trình duyệt hệ thống.";

export function isInAppBrowser(userAgent?: string | null): boolean {
  const ua =
    userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : null);
  if (!ua) return false;
  return IN_APP_UA_PATTERNS.some((re) => re.test(ua));
}
