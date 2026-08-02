"use client";

import { StudioPageSettingsModal } from "@/components/to-chuc/StudioPageSettingsModal";

type Props = {
  orgId: string;
};

/** Thành viên + tổ chức (founder) trên `/quan-ly/cai-dat`. */
export function StudioCaiDatQuanLyClient({ orgId }: Props) {
  return (
    <div className="cso-co-so-stack">
      <StudioPageSettingsModal
        open
        orgId={orgId}
        variant="page"
        pageTitle="Cài đặt tối cao"
        initialSection="members"
        allowedSections={["members", "organization"]}
        onClose={() => undefined}
        onSaved={() => undefined}
      />
    </div>
  );
}
