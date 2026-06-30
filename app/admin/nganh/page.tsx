import { AdminNganhScreen } from "@/components/admin/AdminMockScreens";
import { renderAdminPage } from "@/lib/admin/admin-page";

export default async function AdminNganhPage() {
  return renderAdminPage(<AdminNganhScreen />);
}
