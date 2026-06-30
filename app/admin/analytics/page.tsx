import { AdminPlaceholderScreen } from "@/components/admin/AdminMockScreens";
import { renderAdminPage } from "@/lib/admin/admin-page";

export default async function AdminAnalyticsPage() {
  return renderAdminPage(
    <AdminPlaceholderScreen
      title="Analytics"
      icon="📊"
      desc="Dashboard analytics đang được xây dựng."
    />,
  );
}
