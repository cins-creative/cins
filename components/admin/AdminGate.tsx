import type { AdminGateResult } from "@/lib/admin/require-admin";
import { SUPER_ADMIN_EMAIL } from "@/lib/auth/system-role";

export function AdminGate({ gate }: { gate: Extract<AdminGateResult, { ok: false }> }) {
  if (gate.reason === "no_role") {
    return (
      <div className="cins-admin admin-gate">
        <h1 className="page-title">Không có quyền</h1>
        <p className="admin-gate-desc">
          Chỉ Admin, Curator hoặc Admin tối cao được truy cập panel nội bộ. Liên hệ{" "}
          <code>{SUPER_ADMIN_EMAIL}</code>{" "}
          nếu bạn cần quyền truy cập.
        </p>
      </div>
    );
  }

  return (
    <div className="cins-admin admin-gate">
      <h1 className="page-title">Thiếu Service Role</h1>
      <p className="admin-gate-desc">
        Thêm <code>SUPABASE_SERVICE_ROLE_KEY</code> vào môi trường server, rồi khởi động
        lại server.
      </p>
    </div>
  );
}
