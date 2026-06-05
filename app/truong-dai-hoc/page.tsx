import { Suspense } from "react";
import type { Metadata } from "next";

import { TruongListingLoader } from "@/app/truong-dai-hoc/_components/TruongListingLoader";
import { TruongListingSkeleton } from "@/app/truong-dai-hoc/_components/TruongListing.skeleton";
import { CinsShell } from "@/components/cins/CinsShell";

export const metadata: Metadata = {
  title: "Trường đại học — Ngành sáng tạo | CINs",
  description:
    "Danh sách trường đào tạo ngành sáng tạo tại Việt Nam — so sánh chương trình, mã trường và ngành đang tuyển.",
};

export const dynamic = "force-dynamic";

export default function TruongDaiHocPage() {
  return (
    <CinsShell data-screen-label="Truong-dai-hoc">
      <Suspense fallback={<TruongListingSkeleton />}>
        <TruongListingLoader />
      </Suspense>
    </CinsShell>
  );
}
