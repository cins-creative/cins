import { notFound } from "next/navigation";

import { OrgQuanLyPageGate } from "@/components/to-chuc/quan-ly/OrgQuanLyPageGate";
import { StudioThongTinQuanLyClient } from "@/components/to-chuc/quan-ly/StudioThongTinQuanLyClient";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getStudioBySlugCached } from "@/lib/to-chuc/studio-page-queries";

type Props = { params: Promise<{ slug: string }> };

export default async function StudioQuanLyThongTinPage({ params }: Props) {
  if (!hasSupabaseEnv()) notFound();
  const { slug } = await params;
  const studio = await getStudioBySlugCached(slug);
  if (!studio?.id) notFound();

  return (
    <OrgQuanLyPageGate orgKind="studio" params={params} section="thong-tin">
      <StudioThongTinQuanLyClient orgId={studio.id} />
    </OrgQuanLyPageGate>
  );
}
