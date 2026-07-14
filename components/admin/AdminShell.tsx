import { AdminSidebar } from "@/components/admin/AdminSidebar";

type Props = {
  children: React.ReactNode;
};

export function AdminShell({ children }: Props) {
  return (
    <div className="cins-admin">
      <div className="admin-layout">
        <AdminSidebar />
        <div className="main">{children}</div>
      </div>
    </div>
  );
}
