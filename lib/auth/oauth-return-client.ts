import {
  OAUTH_RETURN_COOKIE,
  OAUTH_RETURN_MAX_AGE_SEC,
} from "@/lib/auth/oauth-return-constants";

/** Gọi trên client ngay trước `signInWithOAuth`. */
export function stashOAuthReturnTo(path: string): void {
  if (typeof document === "undefined") return;
  if (!path.startsWith("/") || path.startsWith("//")) return;

  const secure = window.location.protocol === "https:";
  document.cookie = [
    `${OAUTH_RETURN_COOKIE}=${encodeURIComponent(path)}`,
    "Path=/",
    `Max-Age=${OAUTH_RETURN_MAX_AGE_SEC}`,
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}
