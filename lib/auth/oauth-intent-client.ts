import {
  OAUTH_INTENT_COOKIE,
  OAUTH_INTENT_MAX_AGE_SEC,
} from "@/lib/auth/oauth-intent-constants";
import type { LoginIntent } from "@/lib/auth/login-intent";

/** Gọi trên client ngay trước `signInWithOAuth`. */
export function stashOAuthIntent(intent: LoginIntent): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:";
  document.cookie = [
    `${OAUTH_INTENT_COOKIE}=${intent}`,
    "Path=/",
    `Max-Age=${OAUTH_INTENT_MAX_AGE_SEC}`,
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}
