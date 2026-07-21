import type { NextResponse } from "next/server";

export const RECOVERY_EMAIL_COOKIE = "cins-pw-recovery";

export function setRecoveryEmailCookie(response: NextResponse, email: string) {
  response.cookies.set(RECOVERY_EMAIL_COOKIE, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
}

export function clearRecoveryEmailCookie(response: NextResponse) {
  response.cookies.set(RECOVERY_EMAIL_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
