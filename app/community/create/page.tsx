import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CongDongCreateForm } from "@/components/cong-dong/CongDongCreateForm";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Tạo cộng đồng | CINs",
  description:
    "Tạo cộng đồng nghề trên CINs — thảo luận có ngữ cảnh verified journey.",
};

export default async function TaoCongDongPage() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    redirect("/login?next=/cong-dong/tao");
  }

  return <CongDongCreateForm />;
}
