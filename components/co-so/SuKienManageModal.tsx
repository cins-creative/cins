"use client";

import { X } from "lucide-react";
import { useId } from "react";
import { createPortal } from "react-dom";

import { SuKienManagePanel } from "@/components/co-so/SuKienManagePanel";
import type { SuKienCardData } from "@/lib/to-chuc/su-kien-constants";

type Props = {
  open: boolean;
  orgId: string;
  suKien: SuKienCardData | null;
  onClose: () => void;
};

export function SuKienManageModal({ open, orgId, suKien, onClose }: Props) {
  const titleId = useId();

  if (!open || !suKien) return null;

  return createPortal(
    <div className="uas-backdrop" role="presentation" onClick={onClose}>
      <div
        className="uas-modal cso-sk-manage-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="uas-head">
          <div className="cso-sk-manage-head-copy">
            <h2 id={titleId} className="uas-title">
              Quản lý sự kiện
            </h2>
            <p className="cso-sk-manage-sub">{suKien.ten}</p>
          </div>
          <button type="button" className="uas-close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <SuKienManagePanel
          orgId={orgId}
          suKienId={suKien.id}
          active={open}
        />
      </div>
    </div>,
    document.body,
  );
}
