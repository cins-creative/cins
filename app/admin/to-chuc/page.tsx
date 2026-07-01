import { AdminToChucScreen } from "@/components/admin/AdminToChucScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";
import { canGrantAdmin, getCurrentUserSystemRole } from "@/lib/auth/system-role";

export default async function AdminToChucPage() {
  const role = await getCurrentUserSystemRole();
  return renderAdminPage(
    <AdminToChucScreen canDelegateOrgMembers={canGrantAdmin(role)} />,
  );
}
