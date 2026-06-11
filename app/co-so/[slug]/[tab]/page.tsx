import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CO_SO_TAB_LABELS } from "@/lib/to-chuc/co-so-page-cau-hinh";
import { getCoSoMetaBySlugCached } from "@/lib/to-chuc/co-so-page-queries";
import { isCoSoTabId } from "@/lib/to-chuc/co-so-routes";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; tab: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, tab } = await params;
  if (!hasSupabaseEnv() || !isCoSoTabId(tab)) {
    return { title: "Cơ sở đào tạo | CINs" };
  }

  const meta = await getCoSoMetaBySlugCached(slug);
  if (!meta) {
    return { title: "Không tìm thấy cơ sở | CINs" };
  }

  return {
    title: `${meta.ten} — ${CO_SO_TAB_LABELS[tab]} | CINs`,
    description:
      meta.moTa ??
      `Trang cơ sở đào tạo ${meta.ten} trên CINs — ${CO_SO_TAB_LABELS[tab].toLowerCase()}.`,
  };
}

/** Tab URL — UI render trong `[slug]/layout.tsx`. */
export default async function CoSoTabPage({ params }: Props) {
  const { tab } = await params;
  if (!hasSupabaseEnv() || !isCoSoTabId(tab)) notFound();
  return null;
}
