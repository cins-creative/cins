import { AdminDongGopScreen } from "@/components/admin/AdminDongGopScreen";
import { listDongGopForAdmin } from "@/lib/article/dong-gop/admin-list";

export async function AdminDongGopLoader() {
  const items = await listDongGopForAdmin();
  return <AdminDongGopScreen items={items} />;
}
