import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CoSoDetailLoader } from "@/app/co-so/[slug]/_components/CoSoDetailLoader";
import { getCoSoMetaBySlugCached } from "@/lib/to-chuc/co-so-page-queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";

import CoSoDetailLoading from "./loading";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!hasSupabaseEnv()) {
    return { title: "Cơ sở đào tạo | CINs" };
  }

  const meta = await getCoSoMetaBySlugCached(slug);
  if (!meta) {
    return { title: "Không tìm thấy cơ sở | CINs" };
  }

  return {
    title: `${meta.ten} — Cơ sở đào tạo | CINs`,
    description:
      meta.moTa ??
      `Trang cơ sở đào tạo ${meta.ten} trên CINs — khóa học, học viên và journey.`,
  };
}

async function CoSoDetailGate({ slug }: { slug: string }) {
  if (!hasSupabaseEnv()) notFound();

  const meta = await getCoSoMetaBySlugCached(slug);
  if (!meta) notFound();

  return <CoSoDetailLoader slug={slug} />;
}

export default async function CoSoPage({ params }: Props) {
  const { slug } = await params;

  return (
    <Suspense fallback={<CoSoDetailLoading />}>
      <CoSoDetailGate slug={slug} />
    </Suspense>
  );
}
