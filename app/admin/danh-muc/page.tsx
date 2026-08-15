import { AdminShopDanhMucScreen } from "@/components/admin/AdminShopDanhMucScreen";
import { listShopDanhMucForAdmin } from "@/lib/admin/shop-danh-muc-server";
import { renderAdminPage } from "@/lib/admin/admin-page";
import { listHangChoDanhMuc } from "@/lib/shop/danh-muc-dong-gop";

import "./danh-muc-admin.css";

export const dynamic = "force-dynamic";

export default async function AdminShopDanhMucPage() {
  try {
    const [rows, hangCho] = await Promise.all([
      listShopDanhMucForAdmin({ nganhHang: "merch" }),
      listHangChoDanhMuc().catch(() => ({ alias: [], yeuCau: [] })),
    ]);
    return renderAdminPage(
      <AdminShopDanhMucScreen initialRows={rows} initialHangCho={hangCho} />,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không tải được danh mục hàng.";
    return renderAdminPage(
      <div className="page-body">
        <p
          className="admin-edit-form__msg admin-edit-form__msg--err"
          role="alert"
        >
          {message}
        </p>
      </div>,
    );
  }
}
