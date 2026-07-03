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
 * - Gọi `supabase.auth.signOut()` ở server để xoá cookie phiên.
 * - `revalidatePath("/", "layout")` để mọi route đang render đều flush cache
 *   liên quan tới session (sidebar, topbar, /[slug]/journey…).
 * - Tắt hint auto-restore để KHÔNG tự nhảy sang tài khoản khác còn trong kho.
 * - Sau đó `redirect("/")` đưa user về trang chủ ở trạng thái khách.
 *
 * Dùng qua `<form action={signOutAction}>` từ `CinsAppTopbar`.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();

  // Gỡ tài khoản hiện tại khỏi kho ghi nhớ (signOut thu hồi refresh token của nó).
  const current = await getCurrentSessionAndProfile();
  if (current?.profile?.slug) {
    const vault = await readAccountVault();
    await writeAccountVault(removeAccount(vault, current.profile.slug));
  }

  await supabase.auth.signOut();
  await clearRestoreHint();
  revalidatePath("/", "layout");
  redirect("/");
}
