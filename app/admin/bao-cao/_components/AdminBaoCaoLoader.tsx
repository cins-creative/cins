import { AdminBaoCaoScreen } from "@/components/admin/AdminBaoCaoScreen";
import { listBaoCaoGroupsForAdmin } from "@/lib/social/bao-cao";

export async function AdminBaoCaoLoader() {
  const groups = await listBaoCaoGroupsForAdmin();
  return <AdminBaoCaoScreen groups={groups} />;
}
