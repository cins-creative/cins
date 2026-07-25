"use client";

import { CoSoPageSettingsModal } from "@/components/co-so/CoSoPageSettingsModal";

type Props = {
  orgId: string;
};

/** Settings (gồm bảng chi nhánh) trên `/quan-ly/co-so`. */
export function CoSoThongTinQuanLyClient({ orgId }: Props) {
  return (
    <div className="cso-co-so-stack">
      <CoSoPageSettingsModal
        open
        orgId={orgId}
        variant="page"
        chiNhanhExternal
        onClose={() => undefined}
        onSaved={() => undefined}
      />
    </div>
  );
}
