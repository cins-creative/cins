import { AdminTagScreen } from "@/components/admin/AdminTagScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminTagPage() {
  return renderAdminPage(<AdminTagScreen />);
}
