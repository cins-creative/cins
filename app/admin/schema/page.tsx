import { AdminSchemaScreen } from "@/components/admin/AdminSchemaScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";
import { fetchAdminSchemaListing } from "@/lib/admin/schema-listing";

export const dynamic = "force-dynamic";

export default async function AdminSchemaPage() {
  const result = await fetchAdminSchemaListing();

  if (!result.ok) {
    return renderAdminPage(
      <div className="page-body">
        <header className="page-header">
          <div>
            <h1 className="page-title">Schema DB</h1>
            <p className="page-subtitle">Không đọc được cấu trúc từ Postgres.</p>
          </div>
        </header>
        <p className="admin-edit-form__msg admin-edit-form__msg--err" role="alert">
          {result.message}
        </p>
      </div>,
    );
  }

  return renderAdminPage(<AdminSchemaScreen data={result.data} />);
}
