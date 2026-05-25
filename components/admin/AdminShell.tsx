import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminSqlBubble } from "@/components/admin/AdminSqlBubble";

type Props = {
  children: React.ReactNode;
  showSqlBubble?: boolean;
  sqlDbReady?: boolean;
  sqlPasswordReady?: boolean;
};

export function AdminShell({
  children,
  showSqlBubble = false,
  sqlDbReady = false,
  sqlPasswordReady = false,
}: Props) {
  return (
    <div className="cins-admin">
      <div className="admin-layout">
        <AdminSidebar />
        <div className="main">{children}</div>
      </div>
      {showSqlBubble ? (
        <AdminSqlBubble
          dbReady={sqlDbReady}
          passwordReady={sqlPasswordReady}
        />
      ) : null}
    </div>
  );
}
