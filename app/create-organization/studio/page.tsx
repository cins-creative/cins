import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StudioCreateForm } from "@/components/to-chuc/StudioCreateForm";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Tạo Studio / Doanh nghiệp | CINs",
  description: "Tạo Studio hoặc Doanh nghiệp sáng tạo trên CINs — dự án, tác phẩm & đội nhóm.",
};

export default async function TaoStudioPage() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    redirect("/login?next=/tao-to-chuc/studio");
  }

  return <StudioCreateForm userSlug={session.profile.slug} />;
}
