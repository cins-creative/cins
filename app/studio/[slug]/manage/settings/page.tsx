import { notFound } from "next/navigation";

import { OrgQuanLyPageGate } from "@/components/to-chuc/quan-ly/OrgQuanLyPageGate";
import { StudioCaiDatQuanLyClient } from "@/components/to-chuc/quan-ly/StudioCaiDatQuanLyClient";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getStudioBySlugCached } from "@/lib/to-chuc/studio-page-queries";

type Props = { params: Promise<{ slug: string }> };

/** Founder-only — thành viên + lifecycle tổ chức. */
export default async function StudioQuanLyCaiDatPage({ params }: Props) {
  if (!hasSupabaseEnv()) notFound();
  const { slug } = await params;
  const studio = await getStudioBySlugCached(slug);
  if (!studio?.id) notFound();

  return (
    <OrgQuanLyPageGate
      orgKind="studio"
      params={params}
      section="cai-dat"
      requireFounder
    >
      <StudioCaiDatQuanLyClient orgId={studio.id} />
    </OrgQuanLyPageGate>
  );
}
