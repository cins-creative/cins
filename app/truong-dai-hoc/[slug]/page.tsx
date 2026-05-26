import type { Metadata } from "next";

import { notFound } from "next/navigation";



import { TruongDetailView } from "@/components/truong/TruongDetailView";

import { CinsShell } from "@/components/cins/CinsShell";


import { getCurrentAuthUserId } from "@/lib/auth/session";

import { getOrgAdminStatus } from "@/lib/truong/org-admin";

import { getTruongPagePayload } from "@/lib/truong/queries";



/** Cache payload 60s — `getTruongPagePayload` dùng unstable_cache + React cache. */

export const revalidate = 60;



type Props = { params: Promise<{ slug: string }> };



export async function generateMetadata({ params }: Props): Promise<Metadata> {

  const { slug } = await params;

  const payload = await getTruongPagePayload(slug);

  if (!payload) {

    return { title: "Không tìm thấy trường | CINs" };

  }

  return {

    title: `${payload.school.ten} — Trường đại học | CINs`,

    description: `Thông tin tuyển sinh, ngành đào tạo và chương trình đang tuyển tại ${payload.school.ten} trên CINs.`,

  };

}



export default async function TruongDaiHocDetailPage({ params }: Props) {

  const { slug } = await params;

  const payload = await getTruongPagePayload(slug);

  if (!payload) notFound();



  const authUserId = await getCurrentAuthUserId();

  const canEdit = await getOrgAdminStatus(slug, authUserId);



  return (

    <CinsShell data-screen-label="Truong-chi-tiet">

      <div className={`tdh-page tdh-page--v6${canEdit ? " tdh-page--can-edit" : ""}`}>

        <TruongDetailView payload={payload} canEdit={canEdit} />

      </div>

    </CinsShell>

  );

}

