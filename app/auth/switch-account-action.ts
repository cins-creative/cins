"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  readAccountVault,
  removeAccount,
  setRestoreHint,
  upsertAccount,
  writeAccountVault,
  type SavedAccount,
} from "@/lib/auth/account-vault";
import { createClient } from "@/lib/supabase/server";
import { flushDeferredAuthCookies } from "@/lib/supabase/route-handler";

/**
 * Server Action — chuyển sang một tài khoản đã ghi nhớ trong kho (`cins-accounts`)
 * mà KHÔNG cần đăng xuất / nhập lại mật khẩu.
 *
 * Luồng:
 * 1. Chụp lại phiên tài khoản hiện tại vào kho (giữ refresh token mới nhất để
 *    còn quay lại được).
 * 2. `refreshSession({ refresh_token })` của tài khoản đích → Supabase cấp phiên
 *    mới + xoay refresh token, `@supabase/ssr` ghi cookie phiên mới.
 * 3. Cập nhật kho với token vừa xoay. Nếu token đích hỏng/hết hạn → gỡ khỏi kho
 *    và đưa về trang đăng nhập.
 *
 * Dùng qua `<form action={switchAccountAction.bind(null, slug)}>`.
 */
/** Chỉ nhận đường dẫn nội bộ an toàn (bắt đầu bằng "/" nhưng không phải "//"). */
function safeReturnTo(raw: FormDataEntryValue | null | undefined): string {
  if (typeof raw !== "string") return "/";
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  return value;
}

export async function switchAccountAction(
  slug: string,
  _formData?: FormData,
): Promise<void> {
  const targetSlug = slug.trim().toLowerCase();
  const returnTo = safeReturnTo(_formData?.get("returnTo"));
  if (!targetSlug) redirect("/login");

  const supabase = await createClient();

  let list = await readAccountVault();

  // (1) Chụp phiên hiện tại vào kho để lát nữa còn quay lại.
  const [current, { data: sessionData }] = await Promise.all([
    getCurrentSessionAndProfile(),
    supabase.auth.getSession(),
  ]);
  const currentRefresh = sessionData.session?.refresh_token;
  if (current?.profile && currentRefresh) {
    list = upsertAccount(list, {
      slug: current.profile.slug,
      tenHienThi: current.profile.ten_hien_thi,
      avatarId: current.profile.avatar_id,
      refreshToken: currentRefresh,
      addedAt: Date.now(),
    });
  }

  const target = list.find((a) => a.slug === targetSlug);
  if (!target) {
    await writeAccountVault(list);
    redirect("/login");
  }

  // Đã đứng sẵn ở tài khoản đích → không cần làm gì.
  if (current?.profile?.slug === targetSlug) {
    await writeAccountVault(list);
    redirect(returnTo);
  }

  // (2) Đổi phiên sang tài khoản đích.
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: (target as SavedAccount).refreshToken,
  });

  if (error || !data.session) {
    // Token đích không còn hiệu lực → gỡ khỏi kho, buộc đăng nhập lại tài khoản đó.
    await writeAccountVault(removeAccount(list, targetSlug));
    redirect("/login");
  }

  // (3) Cập nhật kho với refresh token vừa xoay của tài khoản đích.
  const rotated = upsertAccount(list, {
    ...(target as SavedAccount),
    refreshToken: data.session!.refresh_token,
    addedAt: Date.now(),
  });
  await writeAccountVault(rotated);
  await setRestoreHint();

  await flushDeferredAuthCookies();
  revalidatePath("/", "layout");
  redirect(returnTo);
}

/**
 * Server Action — gỡ một tài khoản khỏi kho ghi nhớ (không đăng xuất phiên hiện
 * tại). Dùng qua `<form action={removeSavedAccountAction.bind(null, slug)}>`.
 */
export async function removeSavedAccountAction(
  slug: string,
  _formData?: FormData,
): Promise<void> {
  const targetSlug = slug.trim().toLowerCase();
  if (!targetSlug) return;

  const list = await readAccountVault();
  await writeAccountVault(removeAccount(list, targetSlug));
  revalidatePath("/", "layout");
}
