import { renderAdminPage } from "@/lib/admin/admin-page";

import { AdminBaiVietTableSkeleton } from "./_components/AdminBaiVietTable.skeleton";

export default async function AdminBaiVietLoading() {
  return renderAdminPage(<AdminBaiVietTableSkeleton />);
}
