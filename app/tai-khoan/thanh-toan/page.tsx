import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ThanhToanHubClient } from "@/components/billing/ThanhToanHubClient";
import { CinsShell } from "@/components/cins/CinsShell";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getBillingHubForUser } from "@/lib/billing/hub";

export const metadata: Metadata = {
  title: "Thanh toán — CINs",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TaiKhoanThanhToanPage() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile?.id) {
    redirect("/login?next=/tai-khoan/thanh-toan");
  }

  const initial = await getBillingHubForUser(session.profile.id);

  return (
    <CinsShell data-screen-label="Thanh-toan">
      <Suspense
        fallback={
          <div className="billing-hub" aria-busy="true">
            <p className="billing-hub-lede">Đang tải thanh toán…</p>
          </div>
        }
      >
        <ThanhToanHubClient initial={initial} />
      </Suspense>
    </CinsShell>
  );
}
