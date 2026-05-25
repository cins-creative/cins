import type { Metadata } from "next";

import { TruongListingClient } from "@/components/truong/TruongListingClient";
import { CinsShell } from "@/components/cins/CinsShell";
import { listTruongDaiHoc } from "@/lib/truong/queries";

export const metadata: Metadata = {
  title: "Trường đại học — Ngành sáng tạo | CINs",
  description:
    "Danh sách trường đào tạo ngành sáng tạo tại Việt Nam — so sánh chương trình, mã trường và ngành đang tuyển.",
};

export const dynamic = "force-dynamic";

export default async function TruongDaiHocPage() {
  const schools = await listTruongDaiHoc();

  return (
    <CinsShell data-screen-label="Truong-dai-hoc">
      <div className="tdh-page">
        <TruongListingClient schools={schools} />
      </div>
    </CinsShell>
  );
}
