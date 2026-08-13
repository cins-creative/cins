import { CoSoQuanLyPageGate } from "@/components/co-so/quan-ly/CoSoQuanLyPageGate";
import { DoanhThuQuanLyClient } from "@/components/co-so/quan-ly/DoanhThuQuanLyClient";
import { getCoSoMetaBySlugCached } from "@/lib/to-chuc/co-so-page-queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  if (!hasSupabaseEnv()) notFound();
  const { slug } = await params;
  const meta = await getCoSoMetaBySlugCached(slug);
  if (!meta?.id) notFound();

  return (
    <CoSoQuanLyPageGate params={params} section="doanh-thu">
      <DoanhThuQuanLyClient orgId={meta.id} />
    </CoSoQuanLyPageGate>
  );
}
