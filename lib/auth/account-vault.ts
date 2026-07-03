import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { getAvatarUrl } from "@/lib/journey/profile";

/**
 * "Kho tài khoản" — cho phép user ghi nhớ nhiều tài khoản cá nhân trên cùng một
 * trình duyệt và chuyển nhanh giữa chúng mà không phải đăng xuất rồi đăng nhập lại.
 *
 * Bản chất: lưu `refresh_token` (cùng metadata hiển thị) của từng tài khoản đã
 * đăng nhập vào **một cookie httpOnly riêng**. Khi chuyển tài khoản, server gọi
 * `supabase.auth.refreshSession({ refresh_token })` để đổi phiên hoạt động.
 *
 * Bảo mật: cookie này chứa refresh token nên cùng mức nhạy cảm với cookie phiên
 * chính (`sb-*-auth-token`). Vì vậy: `httpOnly` + `secure` (prod) + `sameSite=lax`,
 * KHÔNG bao giờ đọc được từ client JS (đồng bộ CINS_DEV_RULES §6, §10).
 */

export const ACCOUNT_VAULT_COOKIE = "cins-accounts";

/**
 * Cookie đánh dấu "được phép tự khôi phục phiên từ kho" (không chứa token).
 * Đặt khi đăng nhập / chuyển / khôi phục thành công; xoá khi đăng xuất chủ động
 * để không tự nhảy sang tài khoản khác (về trạng thái khách).
 */
export const RESTORE_HINT_COOKIE = "cins-restore-hint";

/** Giới hạn số tài khoản ghi nhớ — tránh cookie phình quá 4KB. */
export const MAX_SAVED_ACCOUNTS = 5;

const VAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 ngày

/** Một tài khoản đã ghi nhớ (lưu server-side, KHÔNG lộ token ra client). */
export type SavedAccount = {
  slug: string;
  tenHienThi: string | null;
  avatarId: string | null;
  refreshToken: string;
  addedAt: number;
};

/** Dạng tối giản để hiển thị ở menu (KHÔNG kèm refresh token). */
export type SwitchableAccount = {
  slug: string;
  tenHienThi: string | null;
  avatarUrl: string | null;
};

function isSavedAccount(value: unknown): value is SavedAccount {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.slug === "string" &&
    typeof v.refreshToken === "string" &&
    v.slug.length > 0 &&
    v.refreshToken.length > 0
  );
}

/** Encode danh sách → chuỗi base64url an toàn cho cookie value. */
export function encodeVault(list: SavedAccount[]): string {
  const json = JSON.stringify(list);
  return Buffer.from(json, "utf8").toString("base64url");
}

/** Decode cookie value → danh sách; luôn trả mảng (rỗng nếu hỏng). */
export function decodeVault(raw: string | null | undefined): SavedAccount[] {
  if (!raw) return [];
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedAccount).map((a) => ({
      slug: a.slug,
      tenHienThi: typeof a.tenHienThi === "string" ? a.tenHienThi : null,
      avatarId: typeof a.avatarId === "string" ? a.avatarId : null,
      refreshToken: a.refreshToken,
      addedAt: typeof a.addedAt === "number" ? a.addedAt : Date.now(),
    }));
  } catch {
    return [];
  }
}

/** Thêm/cập nhật một tài khoản; đưa lên đầu, dedupe theo slug, giới hạn số lượng. */
export function upsertAccount(
  list: SavedAccount[],
  entry: SavedAccount,
): SavedAccount[] {
  const rest = list.filter((a) => a.slug !== entry.slug);
  return [entry, ...rest].slice(0, MAX_SAVED_ACCOUNTS);
}

/** Bỏ một tài khoản khỏi kho theo slug. */
export function removeAccount(
  list: SavedAccount[],
  slug: string,
): SavedAccount[] {
  return list.filter((a) => a.slug !== slug);
}

function vaultCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: VAULT_MAX_AGE_SECONDS,
  };
}

/** Đọc kho từ `next/headers` cookies — dùng trong RSC / server action / route GET. */
export async function readAccountVault(): Promise<SavedAccount[]> {
  const store = await cookies();
  return decodeVault(store.get(ACCOUNT_VAULT_COOKIE)?.value);
}

/** Ghi kho qua `next/headers` cookies — CHỈ hợp lệ trong server action / route handler. */
export async function writeAccountVault(list: SavedAccount[]): Promise<void> {
  const store = await cookies();
  if (list.length === 0) {
    store.delete(ACCOUNT_VAULT_COOKIE);
    return;
  }
  store.set(ACCOUNT_VAULT_COOKIE, encodeVault(list), vaultCookieOptions());
}

/**
 * Ghi kho trực tiếp lên `response.cookies` của một Route Handler (login, OAuth
 * callback) — nơi cookie phải nằm trên response redirect/JSON đích.
 */
export function setAccountVaultOnResponse(
  response: NextResponse,
  list: SavedAccount[],
): void {
  if (list.length === 0) {
    response.cookies.delete(ACCOUNT_VAULT_COOKIE);
    return;
  }
  response.cookies.set(
    ACCOUNT_VAULT_COOKIE,
    encodeVault(list),
    vaultCookieOptions(),
  );
}

/* ── Cookie hint tự khôi phục phiên ─────────────────────────────── */

function restoreHintCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: VAULT_MAX_AGE_SECONDS,
  };
}

/** Đọc hint từ `next/headers` — dùng trong RSC / server action. */
export async function hasRestoreHint(): Promise<boolean> {
  const store = await cookies();
  return store.get(RESTORE_HINT_COOKIE)?.value === "1";
}

/** Bật hint qua `next/headers` — CHỈ hợp lệ trong server action / route handler. */
export async function setRestoreHint(): Promise<void> {
  const store = await cookies();
  store.set(RESTORE_HINT_COOKIE, "1", restoreHintCookieOptions());
}

/** Tắt hint qua `next/headers` — CHỈ hợp lệ trong server action / route handler. */
export async function clearRestoreHint(): Promise<void> {
  const store = await cookies();
  store.delete(RESTORE_HINT_COOKIE);
}

/** Bật hint trực tiếp lên `response.cookies` (login / OAuth callback / restore). */
export function setRestoreHintOnResponse(response: NextResponse): void {
  response.cookies.set(RESTORE_HINT_COOKIE, "1", restoreHintCookieOptions());
}

/** Tắt hint trực tiếp lên `response.cookies`. */
export function clearRestoreHintOnResponse(response: NextResponse): void {
  response.cookies.delete(RESTORE_HINT_COOKIE);
}

/**
 * Danh sách tài khoản CÓ THỂ chuyển sang (bỏ tài khoản hiện tại), đã resolve
 * avatar URL — an toàn để đẩy ra client (không kèm refresh token).
 */
export async function getSwitchableAccounts(
  currentSlug: string | null,
): Promise<SwitchableAccount[]> {
  const list = await readAccountVault();
  return list
    .filter((a) => a.slug !== currentSlug)
    .map((a) => ({
      slug: a.slug,
      tenHienThi: a.tenHienThi,
      avatarUrl: getAvatarUrl(a.avatarId),
    }));
}
