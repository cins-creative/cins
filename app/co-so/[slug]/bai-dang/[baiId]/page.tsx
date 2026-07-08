import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCoSoMetaBySlugCached } from "@/lib/to-chuc/co-so-page-queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; baiId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, baiId } = await params;
  if (!hasSupabaseEnv() || !baiId?.trim()) {
    return { title: "Cơ sở đào tạo | CINs" };
  }

  const meta = await getCoSoMetaBySlugCached(slug);
  if (!meta) {
    return { title: "Không tìm thấy cơ sở | CINs" };
  }

  return {
    title: `Bài đăng — ${meta.ten} | CINs`,
    description: `Bài đăng tại ${meta.ten} trên CINs.`,
  };
}

/** Chi tiết bài đăng URL — UI render trong `[slug]/layout.tsx`. */
export default async function CoSoBaiDangDetailPage({ params }: Props) {
  const { baiId } = await params;
  if (!hasSupabaseEnv() || !baiId?.trim()) notFound();
  return null;
}
