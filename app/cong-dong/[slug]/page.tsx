import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CinsShell } from "@/components/cins/CinsShell";
import { CongDongPageClient } from "@/components/cong-dong/CongDongPageClient";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadCongDongPageData } from "@/lib/cong-dong/queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";

/** Pulse theo phiên; face pile + career map fetch realtime qua API. */
export const dynamic = "force-dynamic";

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

  return (
    <CinsShell data-screen-label={`Cong-dong-${slug}`}>
      <CongDongPageClient initial={data} />
    </CinsShell>
  );
}
