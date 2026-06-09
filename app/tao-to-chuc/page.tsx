import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TaoToChucTypePicker } from "@/components/to-chuc/TaoToChucTypePicker";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Tạo tổ chức | CINs",
  description: "Tạo Studio, Doanh nghiệp hoặc Cơ sở đào tạo trên CINs.",
};

export default async function TaoToChucPage() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    redirect("/login?next=/tao-to-chuc");
  }

  return <TaoToChucTypePicker userSlug={session.profile.slug} />;
}
