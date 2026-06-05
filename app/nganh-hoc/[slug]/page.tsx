import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { NganhChiTietLoader } from "@/app/nganh-hoc/[slug]/_components/NganhChiTietLoader";
import { getNganhMetaBySlugCached } from "@/lib/nganh/nganh-page-queries";
import { hasSupabaseEnv } from "@/lib/supabase/server";

import NganhChiTietLoading from "./loading";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!hasSupabaseEnv()) {
    return { title: "Ngành đào tạo | CINs" };
  }

  const meta = await getNganhMetaBySlugCached(slug);
  if (!meta) {
    return { title: "Không tìm thấy ngành | CINs" };
  }

  const title =
    meta.tieu_de_viet?.trim() || meta.tieu_de?.trim() || "Ngành đào tạo";
  const desc =
    meta.tom_tat?.trim() ||
    `Thông tin ngành ${title} — mã ngành, khối thi, môn học và trường đào tạo trên CINs.`;
  return {
    title: `${title} — Ngành đào tạo | CINs`,
    description: desc,
  };
}

async function NganhChiTietGate({ slug }: { slug: string }) {
  if (!hasSupabaseEnv()) notFound();

  const meta = await getNganhMetaBySlugCached(slug);
  if (!meta) notFound();

  return <NganhChiTietLoader slug={slug} />;
}

export default async function NganhChiTietPage({ params }: Props) {
  const { slug } = await params;

  return (
    <Suspense fallback={<NganhChiTietLoading />}>
      <NganhChiTietGate slug={slug} />
    </Suspense>
  );
}
