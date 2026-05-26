import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

export type AdminGateResult =
  | { ok: true }
  | { ok: false; reason: "no_service_role" };

/**
 * Quyền vào `/admin` chỉ phụ thuộc vào session — middleware đã redirect `/login`
 * nếu chưa đăng nhập. Ở đây chỉ còn check `SUPABASE_SERVICE_ROLE_KEY` (cần để
 * bypass RLS cho thao tác admin); thiếu key → render màn hình hướng dẫn cấu hình.
 */
export function checkAdminAccess(): AdminGateResult {
  if (!hasServiceRoleEnv()) return { ok: false, reason: "no_service_role" };
  return { ok: true };
}
