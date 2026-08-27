"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { webHref } from "@/lib/cins/manage-site";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action — đăng xuất user hiện tại.
 *
 * - Gọi `supabase.auth.signOut({ scope: "local" })` ở server để xoá cookie
 *   phiên của riêng thiết bị này (không thu hồi phiên trên thiết bị khác).
 * - `revalidatePath("/", "layout")` để mọi route đang render đều flush cache
 *   liên quan tới session (sidebar, topbar, /[slug]/journey…).
 * - Sau đó `redirect(webHref("/"))` — trên manage là `cins.vn`, không 308 `/admin`.
 *
 * Dùng qua `<form action={signOutAction}>` từ `CinsAppTopbar`.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();

  // scope "local": chỉ thu hồi phiên trên thiết bị này, giữ nguyên phiên đã
  // đăng nhập trên các thiết bị khác (không bắt đăng nhập lại toàn bộ).
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect(webHref("/"));
}
