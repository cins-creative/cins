import type { AdminGateResult } from "@/lib/admin/require-admin";

export function AdminGate({ gate }: { gate: AdminGateResult }) {
  if (gate.ok) return null;

  if (gate.reason === "disabled") {
    return (
      <div className="cins-admin admin-gate">
        <h1 className="page-title">CINS Admin</h1>
        <p className="admin-gate-desc">
          Trang <code>/admin</code> chỉ mở khi <strong>development</strong> hoặc{" "}
          <code>CINS_INLINE_ARTICLE_EDIT=1</code>, rồi khởi động lại server.
        </p>
      </div>
    );
  }

  return (
    <div className="cins-admin admin-gate">
      <h1 className="page-title">Thiếu Service Role</h1>
      <p className="admin-gate-desc">
        Thêm <code>SUPABASE_SERVICE_ROLE_KEY</code> vào môi trường server, rồi chạy lại{" "}
        <code>npm run dev</code>.
      </p>
    </div>
  );
}
