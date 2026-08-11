import { listShopDangKyMoForAdmin } from "@/lib/shop/dang-ky-mo-admin";
import { AdminMoShopScreen } from "@/components/admin/AdminMoShopScreen";

export async function AdminMoShopLoader() {
  const items = await listShopDangKyMoForAdmin();
  return <AdminMoShopScreen items={items} />;
}
