import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCoSoMetaBySlugCached } from "@/lib/to-chuc/co-so-page-queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; jobId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, jobId } = await params;
  if (!hasSupabaseEnv() || !jobId?.trim()) {
    return { title: "Cơ sở đào tạo | CINs" };
  }

  const meta = await getCoSoMetaBySlugCached(slug);
  if (!meta) {
    return { title: "Không tìm thấy cơ sở | CINs" };
  }

  return {
    title: `Tuyển dụng — ${meta.ten} | CINs`,
    description: `Vị trí tuyển dụng tại ${meta.ten} trên CINs.`,
  };
}

/** Chi tiết tin tuyển dụng URL — UI render trong `[slug]/layout.tsx`. */
export default async function CoSoTuyenDungDetailPage({ params }: Props) {
  const { jobId } = await params;
  if (!hasSupabaseEnv() || !jobId?.trim()) notFound();
  return null;
}
