import type { NextResponse } from "next/server";

export const RECOVERY_EMAIL_COOKIE = "cins-pw-recovery";
/** Đánh dấu OTP recovery đã verify — bắt buộc trước khi `updateUser({ password })`. */
export const RECOVERY_OK_COOKIE = "cins-pw-recovery-ok";

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
};

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

export function setRecoveryEmailCookie(response: NextResponse, email: string) {
  response.cookies.set(RECOVERY_EMAIL_COOKIE, email, {
    ...COOKIE_BASE,
    secure: cookieSecure(),
    maxAge: 60 * 60,
  });
}

export function clearRecoveryEmailCookie(response: NextResponse) {
  response.cookies.set(RECOVERY_EMAIL_COOKIE, "", {
    ...COOKIE_BASE,
    secure: cookieSecure(),
    maxAge: 0,
  });
}

export function setRecoveryVerifiedCookie(response: NextResponse) {
  response.cookies.set(RECOVERY_OK_COOKIE, "1", {
    ...COOKIE_BASE,
    secure: cookieSecure(),
    maxAge: 15 * 60,
  });
}

export function clearRecoveryVerifiedCookie(response: NextResponse) {
  response.cookies.set(RECOVERY_OK_COOKIE, "", {
    ...COOKIE_BASE,
    secure: cookieSecure(),
    maxAge: 0,
  });
}

export function clearRecoveryCookies(response: NextResponse) {
  clearRecoveryEmailCookie(response);
  clearRecoveryVerifiedCookie(response);
}
