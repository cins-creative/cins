import { AdminTuyenDungScreen } from "@/components/admin/AdminTuyenDungScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";
import { fetchAdminTuyenDungJobs } from "@/lib/cins/home-adaptive/co-hoi";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminTuyenDungPage() {
  const jobs = await fetchAdminTuyenDungJobs();
  return renderAdminPage(<AdminTuyenDungScreen jobs={jobs} />);
}
