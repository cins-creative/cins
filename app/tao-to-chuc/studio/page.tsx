import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { TaoToChucPageChrome } from "@/components/to-chuc/TaoToChucPageChrome";
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
    <>
      <TaoToChucPageChrome />
      <div className="ttc-shell">
      <div className="ttc-card">
        <div className="ttc-card-head">
          <h1 className="ttc-card-title">Studio / Doanh nghiệp</h1>
          <p className="ttc-card-sub">
            Luồng tạo Studio đang được hoàn thiện. Quay lại chọn loại tổ chức
            khác hoặc tạo Cơ sở đào tạo.
          </p>
        </div>
        <div className="ttc-card-body">
          <div className="ttc-actions" style={{ borderTop: "none", marginTop: 0, paddingTop: 0 }}>
            <Link href="/tao-to-chuc" className="ttc-btn ttc-btn-ghost" prefetch={false}>
              <ArrowLeft size={17} aria-hidden />
              Quay lại
            </Link>
            <div className="ttc-btn-spacer" />
            <Link href="/tao-to-chuc/co-so" className="ttc-btn ttc-btn-primary" prefetch={false}>
              Tạo cơ sở đào tạo
            </Link>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
