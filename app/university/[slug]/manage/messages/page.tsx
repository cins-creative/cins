import { notFound } from "next/navigation";

import { OrgQuanLyPageGate } from "@/components/to-chuc/quan-ly/OrgQuanLyPageGate";
import { OrgTinNhanQuanLyClient } from "@/components/to-chuc/quan-ly/OrgTinNhanQuanLyClient";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getTruongMetaBySlugCached } from "@/lib/truong/truong-page-queries";

type Props = { params: Promise<{ slug: string }> };

export default async function TruongQuanLyTinNhanPage({ params }: Props) {
  if (!hasSupabaseEnv()) notFound();
  const { slug } = await params;
  const meta = await getTruongMetaBySlugCached(slug);
  if (!meta?.id) notFound();

  return (
    <OrgQuanLyPageGate
      orgKind="truong_dai_hoc"
      params={params}
      section="tin-nhan"
    >
      <OrgTinNhanQuanLyClient
        orgKind="truong_dai_hoc"
        orgId={meta.id}
        orgSlug={slug}
      />
    </OrgQuanLyPageGate>
  );
}
