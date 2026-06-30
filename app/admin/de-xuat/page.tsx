import { AdminDeXuatScreen } from "@/components/admin/AdminMockScreens";
import { renderAdminPage } from "@/lib/admin/admin-page";

export default async function AdminDeXuatPage() {
  return renderAdminPage(<AdminDeXuatScreen />);
}
