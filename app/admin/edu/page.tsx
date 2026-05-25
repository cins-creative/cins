import { AdminEduScreen } from "@/components/admin/AdminMockScreens";
import { renderAdminPage } from "@/lib/admin/admin-page";

export default function AdminEduPage() {
  return renderAdminPage(<AdminEduScreen />);
}
