import { notFound, redirect } from "next/navigation";

import { CinsShell } from "@/components/cins/CinsShell";
import { OrgQuanLyShell } from "@/components/to-chuc/quan-ly/OrgQuanLyShell";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoMetaBySlugCached } from "@/lib/to-chuc/co-so-page-queries";
import {
  canAccessCoSoQuanLyAsync,
  isCoSoFounderTier,
} from "@/lib/to-chuc/co-so-quan-ly-access";
import {
  orgQuanLyPath,
  type OrgQuanLyKind,
  type OrgQuanLySection,
} from "@/lib/to-chuc/org-quan-ly-routes";
import { getStudioBySlugCached } from "@/lib/to-chuc/studio-page-queries";
import { isStudioOrgAdmin } from "@/lib/to-chuc/studio-members";
import { isTruongOrgAdmin } from "@/lib/truong/org-admin";
import { getTruongMetaBySlugCached } from "@/lib/truong/truong-page-queries";

type Props = {
  orgKind: OrgQuanLyKind;
  params: Promise<{ slug: string }>;
  section: OrgQuanLySection;
  /** Founder-only (owner/admin) — chỉ cơ sở «Cài đặt tối cao». */
  requireFounder?: boolean;
  children: React.ReactNode;
};

type OrgMeta = { id: string; ten: string };

async function resolveOrgMeta(
  orgKind: OrgQuanLyKind,
  slug: string,
): Promise<OrgMeta | null> {
  if (orgKind === "co_so_dao_tao") {
    const meta = await getCoSoMetaBySlugCached(slug);
    if (!meta) return null;
    return { id: meta.id, ten: meta.ten };
  }
  if (orgKind === "truong_dai_hoc") {
    const meta = await getTruongMetaBySlugCached(slug);
    if (!meta) return null;
    return { id: meta.id, ten: meta.ten };
  }
  const studio = await getStudioBySlugCached(slug);
  if (!studio) return null;
  return { id: studio.id, ten: studio.ten };
}

async function canAccessOrgQuanLy(
  orgKind: OrgQuanLyKind,
  orgId: string,
  profileId: string,
  requireFounder: boolean,
): Promise<{ allowed: boolean; isFounder: boolean }> {
  if (orgKind === "co_so_dao_tao") {
    const vaiTro = await getViewerCoSoVaiTro(profileId, orgId);
    const isFounder = isCoSoFounderTier(vaiTro);
    if (requireFounder) {
      return { allowed: isFounder, isFounder };
    }
    const allowed = await canAccessCoSoQuanLyAsync(orgId, profileId, vaiTro);
    return { allowed, isFounder };
  }

  if (orgKind === "truong_dai_hoc") {
    const allowed = await isTruongOrgAdmin(orgId, profileId);
    return { allowed, isFounder: false };
  }

  /* Studio / doanh_nghiep — cùng enum vai trò với cơ sở. */
  const vaiTro = await getViewerCoSoVaiTro(profileId, orgId);
  const isFounder = isCoSoFounderTier(vaiTro);
  if (requireFounder) {
    return { allowed: isFounder, isFounder };
  }
  const allowed = await isStudioOrgAdmin(orgId, profileId);
  return { allowed, isFounder };
}

export async function OrgQuanLyPageGate({
  orgKind,
  params,
  section,
  requireFounder = false,
  children,
}: Props) {
  if (!hasSupabaseEnv()) notFound();
  const { slug } = await params;
  const meta = await resolveOrgMeta(orgKind, slug);
  if (!meta) notFound();

  const session = await getCurrentSessionAndProfile();
  const profileId = session?.profile?.id ?? null;
  if (!profileId) {
    redirect(
      `/login?next=${encodeURIComponent(orgQuanLyPath(orgKind, slug, section))}`,
    );
  }

  const { allowed, isFounder } = await canAccessOrgQuanLy(
    orgKind,
    meta.id,
    profileId,
    requireFounder,
  );
  if (!allowed) notFound();

  const screenLabel =
    orgKind === "co_so_dao_tao"
      ? "Co-so-quan-ly"
      : orgKind === "truong_dai_hoc"
        ? "Truong-quan-ly"
        : "Studio-quan-ly";

  return (
    <CinsShell data-screen-label={screenLabel}>
      <OrgQuanLyShell
        orgKind={orgKind}
        orgId={meta.id}
        orgSlug={slug}
        orgTen={meta.ten}
        active={section}
        isFounder={isFounder}
      >
        {children}
      </OrgQuanLyShell>
    </CinsShell>
  );
}
