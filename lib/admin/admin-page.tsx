import type { ReactNode } from "react";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { hasAdminDbUrl } from "@/lib/admin/db-url";
import { checkAdminAccess, type AdminGateResult } from "@/lib/admin/require-admin";

export function renderAdminPage(content: ReactNode) {
  const gate = checkAdminAccess();
  if (!gate.ok) {
    return <AdminGateWrapper gate={gate} />;
  }
  const dbReady = hasAdminDbUrl();
  return (
    <AdminShell
      showSqlBubble
      sqlDbReady={dbReady}
      sqlPasswordReady={dbReady}
    >
      {content}
    </AdminShell>
  );
}

function AdminGateWrapper({ gate }: { gate: Extract<AdminGateResult, { ok: false }> }) {
  return (
    <div className="cins-admin">
      <AdminGate gate={gate} />
    </div>
  );
}
