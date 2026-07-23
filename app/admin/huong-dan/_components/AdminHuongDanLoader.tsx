import { AdminHuongDanScreen } from "@/components/admin/AdminHuongDanScreen";
import { listHuongDanForAdmin } from "@/lib/huong-dan/huong-dan";

export async function AdminHuongDanLoader() {
  const nhom = await listHuongDanForAdmin();
  return <AdminHuongDanScreen initialNhom={nhom} />;
}
