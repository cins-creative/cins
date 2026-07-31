import { AdminBangThongScreen } from "@/components/admin/AdminBangThongScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";

export default async function AdminBangThongPage() {
  return renderAdminPage(<AdminBangThongScreen />);
}
