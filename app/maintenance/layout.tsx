import type { Metadata } from "next";

import "../cins-maintenance-page.css";

export const metadata: Metadata = {
  title: "Đang nâng cấp · CINs",
  description:
    "CINs đang cập nhật phiên bản mới. Trang web tạm thời bảo trì — quay lại sớm nhé!",
  robots: { index: false, follow: false },
};

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
