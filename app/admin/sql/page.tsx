import { redirect } from "next/navigation";

import { checkAdminAccess } from "@/lib/admin/require-admin";

/** SQL chuyển sang bubble góc màn hình — redirect về admin chính. */
export default function AdminSqlPage() {
  const gate = checkAdminAccess();
  if (!gate.ok) {
    redirect("/admin");
  }
  redirect("/admin/bai-viet");
}
