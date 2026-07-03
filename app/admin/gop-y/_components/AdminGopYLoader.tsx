import { AdminGopYScreen } from "@/components/admin/AdminGopYScreen";
import { listGopYForAdmin } from "@/lib/gop-y/gop-y";

export async function AdminGopYLoader() {
  const items = await listGopYForAdmin();
  return <AdminGopYScreen items={items} />;
}
