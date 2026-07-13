import { Suspense } from "react";
import type { Metadata } from "next";

import { TruongListingLoader } from "@/app/co-so-dao-tao/_components/TruongListingLoader";
import { TruongListingSkeleton } from "@/app/co-so-dao-tao/_components/TruongListing.skeleton";
import { CinsShell } from "@/components/cins/CinsShell";

const HUB_TITLE = "Trường đại học — Ngành sáng tạo | CINs";
const HUB_DESC =
  "Danh sách trường đào tạo ngành sáng tạo tại Việt Nam — so sánh chương trình, mã trường và ngành đang tuyển.";

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_DESC,
  openGraph: {
    type: "website",
    siteName: "CINs",
    locale: "vi_VN",
    url: "/co-so-dao-tao",
    title: HUB_TITLE,
    description: HUB_DESC,
    images: [{ url: "/co-so-dao-tao/opengraph-image", alt: HUB_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: HUB_TITLE,
    description: HUB_DESC,
    images: ["/co-so-dao-tao/opengraph-image"],
  },
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
