import type { AdminGateResult } from "@/lib/admin/require-admin";

export function AdminGate({ gate }: { gate: AdminGateResult }) {
  if (gate.ok) return null;

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
