"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clearRestoreHint,
  readAccountVault,
  removeAccount,
  writeAccountVault,
} from "@/lib/auth/account-vault";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action — đăng xuất user hiện tại.
 *
 * - Gọi `supabase.auth.signOut({ scope: "local" })` ở server để xoá cookie
 *   phiên của riêng thiết bị này (không thu hồi phiên trên thiết bị khác).
 * - `revalidatePath("/", "layout")` để mọi route đang render đều flush cache
 *   liên quan tới session (sidebar, topbar, /[slug]/journey…).
 * - Tắt hint auto-restore để KHÔNG tự nhảy sang tài khoản khác còn trong kho.
 * - Sau đó `redirect("/")` đưa user về trang chủ ở trạng thái khách.
 *
 * Dùng qua `<form action={signOutAction}>` từ `CinsAppTopbar`.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();

  // Gỡ tài khoản hiện tại khỏi kho ghi nhớ trên máy này (phiên thiết bị khác giữ nguyên).
  const current = await getCurrentSessionAndProfile();
  if (current?.profile?.slug) {
    const vault = await readAccountVault();
    await writeAccountVault(removeAccount(vault, current.profile.slug));
  }

  // scope "local": chỉ thu hồi phiên trên thiết bị này, giữ nguyên phiên đã
  // đăng nhập trên các thiết bị khác (không bắt đăng nhập lại toàn bộ).
  await supabase.auth.signOut({ scope: "local" });
  await clearRestoreHint();
  revalidatePath("/", "layout");
  redirect("/");
}
