import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CongDongPageClient } from "@/components/cong-dong/CongDongPageClient";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadCongDongPageData } from "@/lib/cong-dong/queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const revalidate = 30;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} — Cộng đồng | CINs`,
    description: "Cộng đồng nghề trên CINs",
  };
}

export default async function CongDongDetailPage({ params }: Props) {
  if (!hasSupabaseEnv()) notFound();

  const { slug } = await params;
  const session = await getCurrentSessionAndProfile();
  const data = await loadCongDongPageData({
    slug,
    viewerId: session?.profile?.id ?? null,
  });

  if (!data) notFound();

  return <CongDongPageClient initial={data} />;
}
