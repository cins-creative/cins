import { notFound } from "next/navigation";

import { OrgQuanLyPageGate } from "@/components/to-chuc/quan-ly/OrgQuanLyPageGate";
import { OrgQuanLyPlaceholderClient } from "@/components/to-chuc/quan-ly/OrgQuanLyPlaceholderClient";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getStudioBySlugCached } from "@/lib/to-chuc/studio-page-queries";

type Props = { params: Promise<{ slug: string }> };

export default async function StudioQuanLyTuyenDungPage({ params }: Props) {
  if (!hasSupabaseEnv()) notFound();
  const { slug } = await params;
  const studio = await getStudioBySlugCached(slug);
  if (!studio?.id) notFound();

  return (
    <OrgQuanLyPageGate orgKind="studio" params={params} section="tuyen-dung">
      <OrgQuanLyPlaceholderClient
        title="Tuyển dụng"
        description={`Tin đăng, hồ sơ ứng viên và talent pool của «${studio.ten}» sẽ xuất hiện tại đây.`}
      />
    </OrgQuanLyPageGate>
  );
}
