import { Suspense } from "react";

import type { Metadata } from "next";



import { TimKhoaHocHubLoader } from "@/app/find-courses/_components/TimKhoaHocHubLoader";

import { TimKhoaHocHubSkeleton } from "@/app/find-courses/_components/TimKhoaHocHub.skeleton";

import { parseTimKhoaHocSearchParams } from "@/app/find-courses/_components/tim-khoa-hoc-params";

import { CinsShell } from "@/components/cins/CinsShell";



import "@/app/khoa-hoc-listing.css";

import "@/app/cins-huong-nghiep-hub.css";



const HUB_TITLE = "Học nghề sáng tạo — Khóa học & ngành đại học | CINs";
const HUB_DESC =
  "Khóa học online & offline từ cơ sở đào tạo và tra cứu ngành đại học — mã ngành, khối thi, môn học và trường đào tạo trên CINs.";

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_DESC,
  openGraph: {
    type: "website",
    siteName: "CINs",
    locale: "vi_VN",
    url: "/find-courses",
    title: HUB_TITLE,
    description: HUB_DESC,
    images: [{ url: "/find-courses/opengraph-image", alt: HUB_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: HUB_TITLE,
    description: HUB_DESC,
    images: ["/find-courses/opengraph-image"],
  },
};



export const dynamic = "force-dynamic";



type SearchParams = Promise<Record<string, string | string[] | undefined>>;



export default async function TimKhoaHocPage(props: { searchParams: SearchParams }) {

  const sp = await props.searchParams;

  const { q, loai } = parseTimKhoaHocSearchParams(sp);



  return (

    <CinsShell data-screen-label="Tim-khoa-hoc-listing">

      <div className="tkh-page">

        <Suspense

          key={`${q}|${loai}`}

          fallback={<TimKhoaHocHubSkeleton loai={loai} />}

        >

          <TimKhoaHocHubLoader q={q} loai={loai} />

        </Suspense>

      </div>

    </CinsShell>

  );

}

