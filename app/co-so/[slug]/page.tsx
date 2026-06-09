import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CoSoDaoTaoView } from "@/components/co-so/CoSoDaoTaoView";
import { CinsShell } from "@/components/cins/CinsShell";
import { getCoSoPagePayloadCached } from "@/lib/to-chuc/co-so-page-queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCoSoPagePayloadCached(slug);
  if (!data) return { title: "Cơ sở đào tạo | CINs" };
  return {
    title: `${data.ten} — Cơ sở đào tạo | CINs`,
    description:
      data.moTa ??
      `Trang cơ sở đào tạo ${data.ten} trên CINs — khóa học, học viên và journey.`,
  };
}

export default async function CoSoPage({ params }: Props) {
  const { slug } = await params;
  if (!hasSupabaseEnv()) notFound();

  const data = await getCoSoPagePayloadCached(slug);
  if (!data) notFound();

  return (
    <CinsShell data-screen-label="Cơ sở đào tạo">
      <CoSoDaoTaoView data={data} />
    </CinsShell>
  );
}
