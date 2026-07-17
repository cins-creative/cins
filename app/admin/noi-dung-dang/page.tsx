import { AdminNoiDungDangScreen } from "@/components/admin/AdminNoiDungDangScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";
import { canManageUsers, getCurrentUserSystemRole } from "@/lib/auth/system-role";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type NoiDungDangView =
  | "grid"
  | "listing"
  | "dashboard"
  | "score"
  | "pendingVerify";

function pickView(sp: Record<string, string | string[] | undefined>): NoiDungDangView {
  const raw = sp.view;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    value === "listing" ||
    value === "dashboard" ||
    value === "score" ||
    value === "pendingVerify"
  ) {
    return value;
  }
  return "grid";
}

export default async function AdminNoiDungDangPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return renderAdminPage(
      <>
        <header className="page-header">
          <h1 className="page-title">Nội dung đăng (World)</h1>
        </header>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-title">Không có quyền</div>
            <div className="empty-desc">
              Chỉ Admin hoặc Admin tối cao được quản lý editorial boost World.
            </div>
          </div>
        </div>
      </>,
    );
  }

  const sp = await searchParams;
  const initialView = pickView(sp);

  return renderAdminPage(<AdminNoiDungDangScreen initialView={initialView} />);
}
