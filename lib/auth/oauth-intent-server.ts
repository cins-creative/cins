import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { OAUTH_INTENT_COOKIE } from "@/lib/auth/oauth-intent-constants";
import type { LoginIntent } from "@/lib/auth/login-intent";

export async function readOAuthIntent(
  /** Fallback từ query (bài cũ / redirect URL có ?intent=). */
  queryIntent: string | null,
): Promise<LoginIntent> {
  const store = await cookies();
  const fromCookie = store.get(OAUTH_INTENT_COOKIE)?.value;
  if (fromCookie === "register" || fromCookie === "login") {
    return fromCookie;
  }
  return queryIntent === "register" ? "register" : "login";
}

export function clearOAuthIntentOnResponse(response: NextResponse): void {
  response.cookies.set(OAUTH_INTENT_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });
}
