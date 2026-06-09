import { AuthGateRoot } from "@/components/auth/AuthGateProvider";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

import "./tao-to-chuc.css";

/**
 * Luồng tạo tổ chức — không bọc `CinsShell` (giống `cong-dong/tao`).
 * Tránh topbar + 7+ query đếm thông báo mỗi lần mở form đơn giản.
 */
export default async function TaoToChucLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSessionAndProfile();
  const initialAuthenticated = Boolean(session?.profile);

  return (
    <AuthGateRoot initialAuthenticated={initialAuthenticated}>
      {children}
    </AuthGateRoot>
  );
}
