import { CoSoQuanLyPageGate } from "@/components/co-so/quan-ly/CoSoQuanLyPageGate";
import { CoSoThongTinQuanLyClient } from "@/components/co-so/quan-ly/CoSoThongTinQuanLyClient";
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
    <CoSoQuanLyPageGate params={params} section="co-so">
      <CoSoThongTinQuanLyClient
        orgId={meta.id}
        orgSlug={slug}
        orgTen={meta.ten}
        orgLogoSrc={meta.avatarSrc}
        gioiThieuTruong={meta.gioiThieuTruong}
      />
    </CoSoQuanLyPageGate>
  );
}
