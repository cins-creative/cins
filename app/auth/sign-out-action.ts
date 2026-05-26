"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Server Action — đăng xuất user hiện tại.
 *
 * - Gọi `supabase.auth.signOut()` ở server để xoá cookie phiên.
 * - `revalidatePath("/", "layout")` để mọi route đang render đều flush cache
 *   liên quan tới session (sidebar, topbar, /[slug]/journey…).
 * - Sau đó `redirect("/login")` đưa user về trang đăng nhập.
 *
 * Dùng qua `<form action={signOutAction}>` từ `CinsAppTopbar`.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
