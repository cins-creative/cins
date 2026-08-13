import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CoSoDaoTaoCreateForm } from "@/components/to-chuc/CoSoDaoTaoCreateForm";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Tạo cơ sở đào tạo | CINs",
  description: "Tạo cơ sở đào tạo sáng tạo trên CINs — khóa học, học viên và journey.",
};

export default async function TaoCoSoPage() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    redirect("/login?next=/tao-to-chuc/co-so");
  }

  return <CoSoDaoTaoCreateForm userSlug={session.profile.slug} />;
}
