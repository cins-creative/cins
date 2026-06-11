import { AdminMonThiScreen } from "@/components/admin/AdminMonThiScreen";
import { listMonThiForAdmin } from "@/lib/admin/mon-thi-server";
import { listToHopMonForAdmin } from "@/lib/admin/to-hop-mon-server";
import { renderAdminPage } from "@/lib/admin/admin-page";

export default async function AdminMonThiPage() {
  const [list, khoiList] = await Promise.all([
    listMonThiForAdmin(),
    listToHopMonForAdmin(),
  ]);

  if (!list.ok) {
    return renderAdminPage(
      <div className="page-body">
        <p className="admin-edit-form__msg admin-edit-form__msg--err" role="alert">
          {list.message}
        </p>
      </div>,
    );
  }

  if (!khoiList.ok) {
    return renderAdminPage(
      <div className="page-body">
        <p className="admin-edit-form__msg admin-edit-form__msg--err" role="alert">
          {khoiList.message}
        </p>
      </div>,
    );
  }

  return renderAdminPage(
    <AdminMonThiScreen
      initialRows={list.rows}
      initialKhoiRows={khoiList.rows}
    />,
  );
}
