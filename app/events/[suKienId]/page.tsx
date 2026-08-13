import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { CinsShell } from "@/components/cins/CinsShell";
import { SuKienStandaloneDetailHost } from "@/components/su-kien/SuKienStandaloneDetailHost";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  canViewerManageSuKien,
  getSuKienByPublicKey,
} from "@/lib/to-chuc/su-kien";
import {
  orgSuKienHref,
  suKienCardPath,
  suKienDetailPath,
} from "@/lib/to-chuc/su-kien-routes";
import { looksLikeUuid } from "@/lib/to-chuc/su-kien-slug";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ suKienId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { suKienId } = await params;
  const metadataBase = new URL(getConfiguredSiteOrigin() ?? "https://cins.vn");

  if (!hasSupabaseEnv() || !suKienId?.trim()) {
    return { metadataBase, title: "Sự kiện | CINs" };
  }

  const detail = await getSuKienByPublicKey(suKienId);
  if (!detail) {
    return { metadataBase, title: "Không tìm thấy sự kiện | CINs" };
  }

  const title = `${detail.suKien.ten} — ${detail.orgTen} | CINs`;
  const description =
    detail.suKien.moTa?.trim() ||
    `Sự kiện ${detail.suKien.ten} tại ${detail.orgTen} trên CINs.`;
  const pagePath = suKienCardPath(detail.suKien);
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

  const { suKienId: rawKey } = await params;
  const key = rawKey?.trim() ?? "";

  const [detail, session] = await Promise.all([
    getSuKienByPublicKey(key),
    getCurrentSessionAndProfile(),
  ]);
  if (!detail) notFound();

  const canonical = suKienCardPath(detail.suKien);
  if (
    looksLikeUuid(key) &&
    detail.suKien.slug?.trim() &&
    key.toLowerCase() !== detail.suKien.slug.trim().toLowerCase()
  ) {
    permanentRedirect(canonical);
  }
  if (
    detail.suKien.slug?.trim() &&
    key !== detail.suKien.slug.trim() &&
    !looksLikeUuid(key)
  ) {
    permanentRedirect(suKienDetailPath(detail.suKien.slug.trim()));
  }

  const canManage = await canViewerManageSuKien(
    session?.profile?.id ?? null,
    detail.orgId,
  );

  return (
    <CinsShell data-screen-label="Su-kien-detail">
      <SuKienStandaloneDetailHost
        orgId={detail.orgId}
        orgTen={detail.orgTen}
        orgLoai={detail.orgLoai}
        orgAvatarUrl={detail.orgAvatarUrl}
        orgHref={orgSuKienHref(detail.orgLoai, detail.orgSlug)}
        orgTinhThanh={detail.orgTinhThanh}
        canManage={canManage}
        suKien={detail.suKien}
        viewerProfileId={session?.profile?.id ?? null}
      />
    </CinsShell>
  );
}
