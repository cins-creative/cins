import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getTruongMetaBySlugCached } from "@/lib/truong/truong-page-queries";
import {
  isTruongTabId,
  TRUONG_TAB_LABELS,
} from "@/lib/truong/truong-routes";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; tab: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, tab } = await params;
  if (!hasSupabaseEnv() || !isTruongTabId(tab)) {
    return { title: "Trường đại học | CINs" };
  }

  const meta = await getTruongMetaBySlugCached(slug);
  if (!meta) {
    return { title: "Không tìm thấy trường | CINs" };
  }

  return {
    title: `${meta.ten} — ${TRUONG_TAB_LABELS[tab]} | CINs`,
    description: `Thông tin ${TRUONG_TAB_LABELS[tab].toLowerCase()} tại ${meta.ten} trên CINs.`,
  };
}

/** Tab URL — UI render trong `[slug]/layout.tsx`. */
export default async function TruongTabPage({ params }: Props) {
  const { tab } = await params;
  if (!hasSupabaseEnv() || !isTruongTabId(tab)) notFound();
  return null;
}
