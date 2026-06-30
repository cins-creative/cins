import { AdminEduScreen } from "@/components/admin/AdminMockScreens";
import { renderAdminPage } from "@/lib/admin/admin-page";

export default async function AdminEduPage() {
  return renderAdminPage(<AdminEduScreen />);
}
