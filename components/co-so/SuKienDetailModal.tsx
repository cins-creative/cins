"use client";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  SuKienDetailView,
  type SuKienDetailViewProps,
} from "@/components/co-so/SuKienDetailView";
import type { SuKienCardData } from "@/lib/to-chuc/su-kien-constants";

type Props = {
  open: boolean;
  orgId: string;
  suKien: SuKienCardData | null;
  onClose: () => void;
  onSoDangKyChange?: SuKienDetailViewProps["onSoDangKyChange"];
  canManage?: boolean;
};

/** @deprecated Prefer URL detail (`SuKienDetailView`) — giữ wrapper mỏng nếu còn chỗ gọi. */
export function SuKienDetailModal({
  open,
  orgId,
  suKien,
  onClose,
  onSoDangKyChange,
  canManage = false,
}: Props) {
  if (!suKien) return null;

  return (
    <TruongInlineModal
      open={open}
      onClose={onClose}
      className="tdh-inline-modal--wide cso-sk-detail-modal"
      labelledBy="cso-sk-detail-modal-title"
      showClose
    >
      <SuKienDetailView
        orgId={orgId}
        suKien={suKien}
        canManage={canManage}
        variant="panel"
        onBack={onClose}
        onSoDangKyChange={onSoDangKyChange}
      />
    </TruongInlineModal>
  );
}
