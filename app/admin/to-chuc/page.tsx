import { AdminToChucScreen } from "@/components/admin/AdminToChucScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";

export default async function AdminToChucPage() {
  return renderAdminPage(<AdminToChucScreen />);
}
