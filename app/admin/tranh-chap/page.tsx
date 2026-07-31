import { AdminTranhChapScreen } from "@/components/admin/AdminTranhChapScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminTranhChapPage() {
  return renderAdminPage(<AdminTranhChapScreen />);
}
