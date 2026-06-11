import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCoSoMetaBySlugCached } from "@/lib/to-chuc/co-so-page-queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; khoaSlug: string }> };

function titleFromKhoaSlug(khoaSlug: string): string {
  return khoaSlug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, khoaSlug } = await params;
  if (!hasSupabaseEnv() || !khoaSlug?.trim()) {
    return { title: "Cơ sở đào tạo | CINs" };
  }

  const meta = await getCoSoMetaBySlugCached(slug);
  if (!meta) {
    return { title: "Không tìm thấy cơ sở | CINs" };
  }

  const tenKhoa = titleFromKhoaSlug(khoaSlug);
  return {
    title: `${tenKhoa} — ${meta.ten} | CINs`,
    description: `Khóa học ${tenKhoa} tại ${meta.ten} trên CINs.`,
  };
}

/** Chi tiết khóa URL — UI render trong `[slug]/layout.tsx`. */
export default async function CoSoKhoaHocDetailPage({ params }: Props) {
  const { khoaSlug } = await params;
  if (!hasSupabaseEnv() || !khoaSlug?.trim()) notFound();
  return null;
}
