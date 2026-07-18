import { AdminGiaoDichScreen } from "@/components/admin/AdminGiaoDichScreen";
import {
  listAdminShopDonHang,
  type AdminGiaoDichTab,
} from "@/lib/admin/shop-giao-dich";

export async function AdminGiaoDichLoader({
  tab,
  page,
}: {
  tab: AdminGiaoDichTab;
  page: number;
}) {
  const data = await listAdminShopDonHang({ tab, page });
  return (
    <AdminGiaoDichScreen
      tab={tab}
      items={data.items}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
    />
  );
}
