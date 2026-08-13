import { CoSoCaiDatToiCaoClient } from "@/components/co-so/quan-ly/CoSoCaiDatToiCaoClient";
import { CoSoQuanLyPageGate } from "@/components/co-so/quan-ly/CoSoQuanLyPageGate";
import { getCoSoMetaBySlugCached } from "@/lib/to-chuc/co-so-page-queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** Founder-only (owner/admin) — STK + ma trận phân quyền. Ngoài 4 cụm nav. */
export default async function Page({ params }: Props) {
  if (!hasSupabaseEnv()) notFound();
  const { slug } = await params;
  const meta = await getCoSoMetaBySlugCached(slug);
  if (!meta?.id) notFound();

  return (
    <CoSoQuanLyPageGate params={params} section="cai-dat" requireFounder>
      <CoSoCaiDatToiCaoClient orgId={meta.id} />
    </CoSoQuanLyPageGate>
  );
}
