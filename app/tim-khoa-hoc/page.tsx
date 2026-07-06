import { Suspense } from "react";

import type { Metadata } from "next";



import { TimKhoaHocHubLoader } from "@/app/tim-khoa-hoc/_components/TimKhoaHocHubLoader";

import { TimKhoaHocHubSkeleton } from "@/app/tim-khoa-hoc/_components/TimKhoaHocHub.skeleton";

import { parseTimKhoaHocSearchParams } from "@/app/tim-khoa-hoc/_components/tim-khoa-hoc-params";

import { CinsShell } from "@/components/cins/CinsShell";



import "@/app/khoa-hoc-listing.css";

import "@/app/cins-huong-nghiep-hub.css";



export const metadata: Metadata = {

  title: "Học nghề sáng tạo — Khóa học & ngành đại học | CINs",

  description:

    "Khóa học online & offline từ cơ sở đào tạo và tra cứu ngành đại học — mã ngành, khối thi, môn học và trường đào tạo trên CINs.",

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

