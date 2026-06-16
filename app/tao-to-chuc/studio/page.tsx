import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TaoToChucPageShell } from "@/components/to-chuc/TaoToChucPageShell";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Tạo Studio / Doanh nghiệp | CINs",
  description: "Tạo Studio hoặc Doanh nghiệp trên CINs.",
};

export default async function TaoStudioPage() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    redirect("/login?next=/tao-to-chuc/studio");
  }

  return (
    <TaoToChucPageShell cardLabel="Studio / Doanh nghiệp">
      <p className="cins-login-eyebrow">@{session.profile.slug} · tạo tổ chức</p>
      <h1 className="cins-login-title">Studio / Doanh nghiệp</h1>
      <p className="cins-login-sub">
        Luồng tạo Studio đang được hoàn thiện. Quay lại chọn loại tổ chức
        khác hoặc tạo Cơ sở đào tạo.
      </p>

      <div className="ttc-actions ttc-actions--plain">
        <Link href="/tao-to-chuc" className="ttc-btn ttc-btn-ghost" prefetch={false}>
          <ArrowLeft size={17} aria-hidden />
          Quay lại
        </Link>
        <div className="ttc-btn-spacer" />
        <Link href="/tao-to-chuc/co-so" className="ttc-btn ttc-btn-primary" prefetch={false}>
          Tạo cơ sở đào tạo
        </Link>
      </div>
    </TaoToChucPageShell>
  );
}
