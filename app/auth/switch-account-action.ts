"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  readAccountVault,
  removeAccount,
  setRestoreHint,
  upsertAccount,
  writeAccountVault,
  type SavedAccount,
} from "@/lib/auth/account-vault";
import { isDeadRefreshToken } from "@/lib/auth/refresh-error";
import { createClient } from "@/lib/supabase/server";
import { flushDeferredAuthCookies } from "@/lib/supabase/route-handler";

/**
 * Server Action — chuyển sang một tài khoản đã ghi nhớ trong kho (`cins-accounts`)
 * mà KHÔNG cần đăng xuất / nhập lại mật khẩu.
 *
 * Luồng:
 * 1. Chụp lại phiên tài khoản hiện tại vào kho (giữ refresh token mới nhất để
 *    còn quay lại được) — một client, tuần tự getUser → getSession.
 * 2. `refreshSession({ refresh_token })` của tài khoản đích → Supabase cấp phiên
 *    mới + xoay refresh token, `@supabase/ssr` ghi cookie phiên mới.
 * 3. Cập nhật kho với token vừa xoay. Token chết → gỡ khỏi kho + /login.
 *    Lỗi tạm (mạng/5xx) → giữ kho + phiên hiện tại, quay lại trang cũ.
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

  /* (1) Một client, tuần tự: getUser (verify + refresh nếu cần) rồi getSession
   * (đọc refresh_token — không refresh lần hai vì token còn hạn). */
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: sessionData } = await supabase.auth.getSession();
  const currentRefresh = sessionData.session?.refresh_token;

  let currentSlug: string | null = null;
  if (user && currentRefresh) {
    const { data: profile } = await supabase
      .from("user_nguoi_dung")
      .select("slug, ten_hien_thi, avatar_id")
      .eq("auth_user_id", user.id)
      .maybeSingle<{
        slug: string;
        ten_hien_thi: string | null;
        avatar_id: string | null;
      }>();
    if (profile?.slug) {
      currentSlug = profile.slug;
      list = upsertAccount(list, {
        slug: profile.slug,
        tenHienThi: profile.ten_hien_thi,
        avatarId: profile.avatar_id,
        refreshToken: currentRefresh,
        addedAt: Date.now(),
      });
    }
  }

  const target = list.find((a) => a.slug === targetSlug);
  if (!target) {
    await writeAccountVault(list);
    redirect("/login");
  }

  if (currentSlug === targetSlug) {
    await writeAccountVault(list);
    redirect(returnTo);
  }

  /* (2) Đổi phiên sang tài khoản đích. */
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: (target as SavedAccount).refreshToken,
  });

  if (error || !data.session) {
    if (isDeadRefreshToken(error)) {
      await writeAccountVault(removeAccount(list, targetSlug));
      redirect("/login");
    }
    /* Lỗi tạm: giữ kho + phiên hiện tại, quay lại trang cũ. */
    await writeAccountVault(list);
    redirect(returnTo);
  }

  /* (3) Cập nhật kho với refresh token vừa xoay của tài khoản đích. */
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
