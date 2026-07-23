import { AdminGiaoDichScreen } from "@/components/admin/AdminGiaoDichScreen";
import {
  listAdminShopDonHang,
  listAdminShopListings,
  type AdminGiaoDichTab,
} from "@/lib/admin/shop-giao-dich";

export async function AdminGiaoDichLoader({
  tab,
  page,
}: {
  tab: AdminGiaoDichTab;
  page: number;
}) {
  if (tab === "shop") {
    const data = await listAdminShopListings({ page });
    return (
      <AdminGiaoDichScreen
        tab="shop"
        items={[]}
        shops={data.items}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        tongDoanhThu={data.tongDoanhThu}
        tongGiaoDich={data.tongGiaoDich}
      />
    );
  }

  const data = await listAdminShopDonHang({ page });
  return (
    <AdminGiaoDichScreen
      tab="don"
      items={data.items}
      shops={[]}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
    />
  );
}
