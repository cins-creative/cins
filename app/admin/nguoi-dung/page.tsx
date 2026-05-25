import { AdminPlaceholderScreen } from "@/components/admin/AdminMockScreens";
import { renderAdminPage } from "@/lib/admin/admin-page";

export default function AdminNguoiDungPage() {
  return renderAdminPage(
    <AdminPlaceholderScreen
      title="Người dùng"
      icon="👤"
      desc="Màn hình quản lý người dùng đang được xây dựng."
    />,
  );
}
