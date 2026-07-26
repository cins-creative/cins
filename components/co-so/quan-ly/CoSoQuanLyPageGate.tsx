import { notFound, redirect } from "next/navigation";

import { CoSoQuanLyShell } from "@/components/co-so/quan-ly/CoSoQuanLyShell";
import { CinsShell } from "@/components/cins/CinsShell";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoMetaBySlugCached } from "@/lib/to-chuc/co-so-page-queries";
import {
  canAccessCoSoQuanLyAsync,
  isCoSoFounderTier,
} from "@/lib/to-chuc/co-so-quan-ly-access";
import { coSoQuanLyPath, type CoSoQuanLySection } from "@/lib/to-chuc/co-so-routes";
import { hasSupabaseEnv } from "@/lib/supabase/env";

type Props = {
  params: Promise<{ slug: string }>;
  section: CoSoQuanLySection;
  /** Founder-only (owner/admin) — dùng cho "Cài đặt tối cao", bỏ qua ma trận module. */
  requireFounder?: boolean;
  children: React.ReactNode;
};

export async function CoSoQuanLyPageGate({
  params,
  section,
  requireFounder = false,
  children,
}: Props) {
  if (!hasSupabaseEnv()) notFound();
  const { slug } = await params;
  const meta = await getCoSoMetaBySlugCached(slug);
  if (!meta) notFound();

  const session = await getCurrentSessionAndProfile();
  const profileId = session?.profile?.id ?? null;
  if (!profileId) {
    redirect(
      `/login?next=${encodeURIComponent(coSoQuanLyPath(slug, section))}`,
    );
  }

  const vaiTro = await getViewerCoSoVaiTro(profileId, meta.id);
  const isFounder = isCoSoFounderTier(vaiTro);
  const allowed = requireFounder
    ? isFounder
    : await canAccessCoSoQuanLyAsync(meta.id, profileId, vaiTro);
  if (!allowed) {
    notFound();
  }

  return (
    <CinsShell data-screen-label="Co-so-quan-ly">
      <CoSoQuanLyShell
        orgId={meta.id}
        orgSlug={slug}
        orgTen={meta.ten}
        active={section}
        isFounder={isFounder}
      >
        {children}
      </CoSoQuanLyShell>
    </CinsShell>
  );
}
