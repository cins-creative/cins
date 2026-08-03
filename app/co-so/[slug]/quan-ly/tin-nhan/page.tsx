import { Suspense } from "react";

import { CoSoQuanLyPageGate } from "@/components/co-so/quan-ly/CoSoQuanLyPageGate";
import { TinNhanQuanLyClient } from "@/components/co-so/quan-ly/TinNhanQuanLyClient";
import { getCoSoMetaBySlugCached } from "@/lib/to-chuc/co-so-page-queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export default async function CoSoQuanLyTinNhanPage({ params }: Props) {
  if (!hasSupabaseEnv()) notFound();
  const { slug } = await params;
  const meta = await getCoSoMetaBySlugCached(slug);
  if (!meta?.id) notFound();

  return (
    <CoSoQuanLyPageGate params={params} section="tin-nhan">
      <Suspense
        fallback={
          <div className="cso-hv-loading" style={{ padding: "24px 0" }}>
            Đang tải tin nhắn…
          </div>
        }
      >
        <TinNhanQuanLyClient
          orgId={meta.id}
          orgSlug={slug}
          orgTen={meta.ten}
          orgAvatarUrl={meta.avatarSrc}
        />
      </Suspense>
    </CoSoQuanLyPageGate>
  );
}
