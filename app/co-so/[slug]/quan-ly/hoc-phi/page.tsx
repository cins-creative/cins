import { Suspense } from "react";
import { notFound } from "next/navigation";

import { CoSoQuanLyPageGate } from "@/components/co-so/quan-ly/CoSoQuanLyPageGate";
import { HocPhiQuanLyClient } from "@/components/co-so/quan-ly/HocPhiQuanLyClient";
import { getCoSoMetaBySlugCached } from "@/lib/to-chuc/co-so-page-queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  if (!hasSupabaseEnv()) notFound();
  const { slug } = await params;
  const meta = await getCoSoMetaBySlugCached(slug);
  if (!meta?.id) notFound();

  return (
    <CoSoQuanLyPageGate params={params} section="hoc-phi">
      <Suspense fallback={<div className="cso-hv-loading">Đang tải…</div>}>
        <HocPhiQuanLyClient orgId={meta.id} />
      </Suspense>
    </CoSoQuanLyPageGate>
  );
}
