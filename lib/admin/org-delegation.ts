import "server-only";

import { timingSafeEqual } from "node:crypto";

import {
  canGrantAdmin,
  getCurrentUserProfileId,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

const ENV_KEY = "CINS_ORG_DELEGATION_PASSWORD";

export type SuperAdminDelegationActor =
  | { ok: true; profileId: string }
  | { ok: false; error: string; status: 401 | 403 | 503 };

/** Mật khẩu ủy quyền gán quyền org đã cấu hình trên server. */
export function isOrgDelegationConfigured(): boolean {
  return Boolean(process.env[ENV_KEY]?.trim());
}

function readConfiguredPassword(): string | null {
  const value = process.env[ENV_KEY]?.trim();
  return value || null;
}

/**
 * So khớp mật khẩu ủy quyền (timing-safe). Không log giá trị nhập.
 */
export function verifyOrgDelegationPassword(
  password: string | null | undefined,
): { ok: true } | { ok: false; error: string } {
  const expected = readConfiguredPassword();
  if (!expected) {
    return {
      ok: false,
      error: "Server chưa cấu hình CINS_ORG_DELEGATION_PASSWORD.",
    };
  }

  const provided = typeof password === "string" ? password : "";
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "Mật khẩu ủy quyền không đúng." };
  }

  return { ok: true };
}

/** Chỉ super_admin — dùng gate API phân quyền org (trục 1 → trục 2). */
export async function assertSuperAdminDelegationActor(): Promise<SuperAdminDelegationActor> {
  const role = await getCurrentUserSystemRole();
  if (!canGrantAdmin(role)) {
    return {
      ok: false,
      error: "Chỉ Admin tối cao được phân quyền tổ chức.",
      status: 403,
    };
  }

  const profileId = await getCurrentUserProfileId();
  if (!profileId) {
    return { ok: false, error: "Cần đăng nhập.", status: 401 };
  }

  if (!isOrgDelegationConfigured()) {
    return {
      ok: false,
      error: "Server chưa cấu hình CINS_ORG_DELEGATION_PASSWORD.",
      status: 503,
    };
  }

  return { ok: true, profileId };
}

export function assertDelegationPasswordForMutation(
  password: string | null | undefined,
): { ok: true } | { ok: false; error: string } {
  return verifyOrgDelegationPassword(password);
}
