import { headers } from "next/headers";
import type { ReactNode } from "react";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  getHiddenAdminTabHrefsForUser,
  isAdminPathHidden,
} from "@/lib/admin/admin-tab-visibility";
import { checkAdminAccess, type AdminGateResult } from "@/lib/admin/require-admin";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  canAccessAdminPanel,
  getCurrentUserProfileId,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

export async function renderAdminPage(content: ReactNode) {
  const gate = checkAdminAccess();
  if (!gate.ok) {
    return <AdminGateWrapper gate={gate} />;
  }

  const [role, profileId] = await Promise.all([
    getCurrentUserSystemRole(),
    getCurrentUserProfileId(),
  ]);
  if (!canAccessAdminPanel(role)) {
    return <AdminGateWrapper gate={{ ok: false, reason: "no_role" }} />;
  }

  const hiddenTabHrefs = await getHiddenAdminTabHrefsForUser({
    role,
    profileId,
  });
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (isAdminPathHidden(pathname, hiddenTabHrefs)) {
    return (
      <AdminShell hiddenTabHrefs={hiddenTabHrefs}>
        <header className="page-header">
          <h1 className="page-title">Không xem được tab này</h1>
        </header>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-title">Tab đã ẩn</div>
            <div className="empty-desc">
              Tài khoản của bạn không được xem tab này. Liên hệ Admin tối cao
              nếu cần mở lại.
            </div>
          </div>
        </div>
      </AdminShell>
    );
  }

  return <AdminShell hiddenTabHrefs={hiddenTabHrefs}>{content}</AdminShell>;
}

async function AdminGateWrapper({
  gate,
}: {
  gate: Extract<AdminGateResult, { ok: false }>;
}) {
  const session =
    gate.reason === "no_role" ? await getCurrentSessionAndProfile() : null;
  return (
    <div className="cins-admin">
      <AdminGate gate={gate} currentSlug={session?.profile?.slug ?? null} />
    </div>
  );
}
