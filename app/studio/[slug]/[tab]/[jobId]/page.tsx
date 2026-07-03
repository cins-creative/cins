import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getStudioMetaBySlugCached } from "@/lib/to-chuc/studio-page-queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; tab: string; jobId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, tab } = await params;
  if (!hasSupabaseEnv() || tab !== "tuyen-dung") {
    return { title: "Tuyển dụng | CINs" };
  }

  const meta = await getStudioMetaBySlugCached(slug);
  if (!meta) return { title: "Không tìm thấy studio | CINs" };

  return {
    title: `Tuyển dụng — ${meta.ten} | CINs`,
    description:
      meta.moTa ??
      `Chi tiết vị trí tuyển dụng tại ${meta.ten} trên CINs.`,
  };
}

/** URL sâu cho một tin tuyển dụng — UI popup render trong `[slug]/layout.tsx`. */
export default async function StudioJobPage({ params }: Props) {
  const { tab } = await params;
  if (!hasSupabaseEnv() || tab !== "tuyen-dung") notFound();
  return null;
}
