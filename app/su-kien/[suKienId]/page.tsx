import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SuKienDetailView } from "@/components/co-so/SuKienDetailView";
import { CinsShell } from "@/components/cins/CinsShell";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  canViewerManageSuKien,
  getSuKienByIdPublic,
} from "@/lib/to-chuc/su-kien";
import { orgSuKienHref, suKienDetailPath } from "@/lib/to-chuc/su-kien-routes";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ suKienId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { suKienId } = await params;
  const metadataBase = new URL(getConfiguredSiteOrigin() ?? "https://cins.vn");

  if (!hasSupabaseEnv() || !suKienId?.trim()) {
    return { metadataBase, title: "Sự kiện | CINs" };
  }

  const detail = await getSuKienByIdPublic(suKienId);
  if (!detail) {
    return { metadataBase, title: "Không tìm thấy sự kiện | CINs" };
  }

  const title = `${detail.suKien.ten} — ${detail.orgTen} | CINs`;
  const description =
    detail.suKien.moTa?.trim() ||
    `Sự kiện ${detail.suKien.ten} tại ${detail.orgTen} trên CINs.`;
  const pagePath = suKienDetailPath(detail.suKien.id);
  const images = detail.suKien.coverSrc
    ? [{ url: detail.suKien.coverSrc, alt: detail.suKien.ten }]
    : undefined;

  return {
    metadataBase,
    title,
    description,
    openGraph: {
      type: "article",
      siteName: "CINs",
      locale: "vi_VN",
      url: pagePath,
      title,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: detail.suKien.coverSrc ? [detail.suKien.coverSrc] : undefined,
    },
  };
}

export default async function SuKienDetailPage({ params }: Props) {
  if (!hasSupabaseEnv()) notFound();

  const { suKienId } = await params;
  const detail = await getSuKienByIdPublic(suKienId);
  if (!detail) notFound();

  const session = await getCurrentSessionAndProfile();
  const canManage = await canViewerManageSuKien(
    session?.profile?.id ?? null,
    detail.orgId,
  );

  return (
    <CinsShell data-screen-label="Su-kien-detail">
      <SuKienDetailView
        orgId={detail.orgId}
        suKien={detail.suKien}
        canManage={canManage}
        variant="page"
        orgTen={detail.orgTen}
        orgHref={orgSuKienHref(detail.orgLoai, detail.orgSlug)}
      />
    </CinsShell>
  );
}
