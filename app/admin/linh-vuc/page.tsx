import { AdminLinhVucScreen } from "@/components/admin/AdminLinhVucScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";
import {
  listLinhVucForAdmin,
  listLinhVucNhomForAdmin,
} from "@/lib/admin/linh-vuc-server";

export const dynamic = "force-dynamic";

export default async function AdminLinhVucPage() {
  const [lv, nhom] = await Promise.all([
    listLinhVucForAdmin(),
    listLinhVucNhomForAdmin(),
  ]);

  if (!lv.ok) {
    return renderAdminPage(
      <div className="page-body">
        <p className="admin-edit-form__msg admin-edit-form__msg--err" role="alert">
          {lv.message}
        </p>
      </div>,
    );
  }

  if (!nhom.ok) {
    return renderAdminPage(
      <div className="page-body">
        <p className="admin-edit-form__msg admin-edit-form__msg--err" role="alert">
          {nhom.message}
        </p>
      </div>,
    );
  }

  return renderAdminPage(
    <AdminLinhVucScreen
      initialRows={lv.rows}
      initialNhomRows={nhom.rows}
    />,
  );
}
