import { notFound } from "next/navigation";

import { OrgQuanLyPageGate } from "@/components/to-chuc/quan-ly/OrgQuanLyPageGate";
import { OrgQuanLyPlaceholderClient } from "@/components/to-chuc/quan-ly/OrgQuanLyPlaceholderClient";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getStudioBySlugCached } from "@/lib/to-chuc/studio-page-queries";

type Props = { params: Promise<{ slug: string }> };

export default async function StudioQuanLyTongQuanPage({ params }: Props) {
  if (!hasSupabaseEnv()) notFound();
  const { slug } = await params;
  const studio = await getStudioBySlugCached(slug);
  if (!studio?.id) notFound();

  return (
    <OrgQuanLyPageGate orgKind="studio" params={params} section="tong-quan">
      <OrgQuanLyPlaceholderClient
        title="Tổng quan"
        description={`Bảng tổng quan vận hành «${studio.ten}» — sắp có số liệu tin nhắn, bài đăng và hoạt động gần đây.`}
      />
    </OrgQuanLyPageGate>
  );
}
