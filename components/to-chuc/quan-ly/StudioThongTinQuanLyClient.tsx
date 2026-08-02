"use client";

import { StudioPageSettingsModal } from "@/components/to-chuc/StudioPageSettingsModal";

type Props = {
  orgId: string;
};

/** Hồ sơ + hiển thị + thành viên trên `/quan-ly/thong-tin`. */
export function StudioThongTinQuanLyClient({ orgId }: Props) {
  return (
    <div className="cso-co-so-stack">
      <StudioPageSettingsModal
        open
        orgId={orgId}
        variant="page"
        allowedSections={["identity", "about", "contact", "display", "members"]}
        onClose={() => undefined}
        onSaved={() => undefined}
      />
    </div>
  );
}
