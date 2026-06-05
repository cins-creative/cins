import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { TruongDetailLoader } from "@/app/truong-dai-hoc/[slug]/_components/TruongDetailLoader";
import { getTruongMetaBySlugCached } from "@/lib/truong/truong-page-queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";

import TruongDetailLoading from "./loading";

/** Cache payload 60s — `getTruongPagePayload` dùng unstable_cache + React cache. */
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!hasSupabaseEnv()) {
    return { title: "Trường đại học | CINs" };
  }

  const meta = await getTruongMetaBySlugCached(slug);
  if (!meta) {
    return { title: "Không tìm thấy trường | CINs" };
  }

  return {
    title: `${meta.ten} — Trường đại học | CINs`,
    description: `Thông tin tuyển sinh, ngành đào tạo và chương trình đang tuyển tại ${meta.ten} trên CINs.`,
  };
}

async function TruongDetailGate({ slug }: { slug: string }) {
  if (!hasSupabaseEnv()) notFound();

  const meta = await getTruongMetaBySlugCached(slug);
  if (!meta) notFound();

  return <TruongDetailLoader slug={slug} />;
}

export default async function TruongDaiHocDetailPage({ params }: Props) {
  const { slug } = await params;

  return (
    <Suspense fallback={<TruongDetailLoading />}>
      <TruongDetailGate slug={slug} />
    </Suspense>
  );
}
