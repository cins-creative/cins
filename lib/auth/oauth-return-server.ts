import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { OAUTH_RETURN_COOKIE } from "@/lib/auth/oauth-return-constants";

export async function readOAuthReturnTo(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(OAUTH_RETURN_COOKIE)?.value;
  if (!raw) return null;

  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) {
      return decoded;
    }
  } catch {
    /* ignore malformed cookie */
  }
  return null;
}

export function clearOAuthReturnOnResponse(response: NextResponse): void {
  response.cookies.set(OAUTH_RETURN_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });
}
