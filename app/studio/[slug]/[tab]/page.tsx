import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { STUDIO_TAB_LABELS } from "@/lib/to-chuc/studio-page-config";
import { getStudioMetaBySlugCached } from "@/lib/to-chuc/studio-page-queries";
import { isStudioTabId } from "@/lib/to-chuc/studio-routes";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; tab: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, tab } = await params;
  if (!hasSupabaseEnv() || !isStudioTabId(tab)) {
    return { title: "Studio / Doanh nghiệp | CINs" };
  }

  const meta = await getStudioMetaBySlugCached(slug);
  if (!meta) return { title: "Không tìm thấy studio | CINs" };

  return {
    title: `${meta.ten} — ${STUDIO_TAB_LABELS[tab]} | CINs`,
    description:
      meta.moTa ??
      `Trang studio / doanh nghiệp ${meta.ten} trên CINs — ${STUDIO_TAB_LABELS[tab].toLowerCase()}.`,
  };
}

/** Tab URL — UI render trong `[slug]/layout.tsx`. */
export default async function StudioTabPage({ params }: Props) {
  const { tab } = await params;
  if (!hasSupabaseEnv() || !isStudioTabId(tab)) notFound();
  return null;
}
