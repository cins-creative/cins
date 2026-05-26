import type { Metadata } from "next";

import "./login.css";

export const metadata: Metadata = {
  title: "Đăng nhập · CINs",
  description:
    "Đăng nhập CINs bằng Google — không lưu mật khẩu, không spam. Bắt đầu Journey sáng tạo của bạn.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
