import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CongDongFilterSetupTutorial } from "@/components/cong-dong/CongDongFilterSetupTutorial";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listCongDongFilters } from "@/lib/cong-dong/filters";
import { isCongDongAdmin } from "@/lib/cong-dong/membership";
import { fetchCongDongBySlug } from "@/lib/cong-dong/queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = {
  title: "Thiết lập nhãn cộng đồng | CINs",
  robots: { index: false, follow: false },
};

export default async function CongDongFilterSetupPage({ params }: Props) {
  if (!hasSupabaseEnv()) notFound();

  const { slug } = await params;
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    redirect(`/login?next=/cong-dong/${encodeURIComponent(slug)}/nhan`);
  }

  const orgRow = await fetchCongDongBySlug(slug);
  if (!orgRow) notFound();

  const isAdmin = await isCongDongAdmin(session.profile.id, orgRow.id);
  if (!isAdmin) {
    redirect(`/cong-dong/${slug}`);
  }

  const filters = await listCongDongFilters(orgRow.id);

  return (
    <CongDongFilterSetupTutorial
      orgId={orgRow.id}
      slug={slug}
      orgTen={orgRow.ten}
      initialFilters={filters}
    />
  );
}
