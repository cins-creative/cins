import { AdminMonThiScreen } from "@/components/admin/AdminMonThiScreen";
import { listMonThiForAdmin } from "@/lib/admin/mon-thi-server";
import { renderAdminPage } from "@/lib/admin/admin-page";

export default async function AdminMonThiPage() {
  const list = await listMonThiForAdmin();
  if (!list.ok) {
    return renderAdminPage(
      <div className="page-body">
        <p className="admin-edit-form__msg admin-edit-form__msg--err" role="alert">
          {list.message}
        </p>
      </div>,
    );
  }
  return renderAdminPage(<AdminMonThiScreen initialRows={list.rows} />);
}
