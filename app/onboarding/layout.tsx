import type { Metadata } from "next";

import "./onboarding.css";

/**
 * Onboarding route — dùng chung CINs design system với toàn site.
 * Fonts (Be Vietnam Pro + Crimson Pro) và tokens (`--cins-*`) đều inherit từ
 * root layout (`app/layout.tsx`). File này chỉ gắn metadata + import CSS riêng.
 */

export const metadata: Metadata = {
  title: "Bắt đầu Journey — CINs",
  description:
    "Hoàn tất hồ sơ trên CINs để khám phá hành trình sáng tạo của bạn.",
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
