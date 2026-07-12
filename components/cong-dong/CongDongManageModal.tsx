"use client";

import { Pencil, Settings2, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { CongDongFilterAdminPanel } from "@/components/cong-dong/CongDongFilterAdmin";
import { CongDongGroupSettingsPanel } from "@/components/cong-dong/CongDongGroupSettingsModal";
import { CongDongMembersModal } from "@/components/cong-dong/CongDongMembersModal";
import type {
  CongDongCategory,
  CongDongFilter,
  CongDongLinhVuc,
} from "@/lib/cong-dong/types";

export type CongDongManageSection = "chu_de" | "nhan" | "thanh_vien";

type Props = {
  open: boolean;
  onClose: () => void;
  initialSection?: CongDongManageSection;
  orgId: string;
  orgSlug: string;
  orgLabel: string;
  viewerIsOwner: boolean;
  canTopics: boolean;
  canLabels: boolean;
  canMembers: boolean;
  categories: CongDongCategory[];
  linhVucs: CongDongLinhVuc[];
  filters: CongDongFilter[];
  onFiltersChange: (filters: CongDongFilter[]) => void;
  onTopicsSaved: (next: {
    categories: CongDongCategory[];
    linhVucs: CongDongLinhVuc[];
  }) => void;
};

export function CongDongManageModal({
  open,
  onClose,
  initialSection,
  orgId,
  orgSlug,
  orgLabel,
  viewerIsOwner,
  canTopics,
  canLabels,
  canMembers,
  categories,
  linhVucs,
  filters,
  onFiltersChange,
  onTopicsSaved,
}: Props) {
  const titleId = useId();

  const nav = useMemo(() => {
    const items: Array<{ id: CongDongManageSection; label: string }> = [];
    if (canTopics) items.push({ id: "chu_de", label: "Chủ đề nhóm" });
    if (canLabels) items.push({ id: "nhan", label: "Quản lý nhãn" });
    if (canMembers) items.push({ id: "thanh_vien", label: "Thành viên & quyền" });
    return items;
  }, [canTopics, canLabels, canMembers]);

  const resolvedInitial = useMemo(() => {
    if (initialSection && nav.some((n) => n.id === initialSection)) {
      return initialSection;
    }
    return nav[0]?.id ?? "chu_de";
  }, [initialSection, nav]);

  const [section, setSection] = useState<CongDongManageSection>(resolvedInitial);

  useEffect(() => {
    if (!open) return;
    setSection(resolvedInitial);
  }, [open, resolvedInitial]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined" || nav.length === 0) return null;

  return createPortal(
    <div
      className="tdh-inline-modal-backdrop cso-settings-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="tdh-inline-modal tdh-inline-modal--wide cso-settings-modal cd-manage-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cso-settings-head">
          <div className="cso-settings-head-copy">
            <Settings2 size={18} strokeWidth={2} aria-hidden />
            <div className="cso-settings-head-text">
              <h2
                id={titleId}
                className="tdh-inline-modal-title cso-settings-title"
              >
                Quản lý cộng đồng
              </h2>
              <p className="cso-settings-role-banner">
                Chủ đề, nhãn feed và thành viên — cùng một bảng.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="cso-settings-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <nav className="cso-settings-nav" aria-label="Mục quản lý cộng đồng">
          {nav.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`cso-settings-nav-btn${section === id ? " on" : ""}`}
              aria-current={section === id ? "true" : undefined}
              onClick={() => setSection(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="cso-settings-body cd-manage-modal-body">
          {canTopics && section === "chu_de" ? (
            <CongDongGroupSettingsPanel
              active={open && section === "chu_de"}
              embedded
              orgId={orgId}
              categories={categories}
              linhVucs={linhVucs}
              onSaved={onTopicsSaved}
            />
          ) : null}

          {canLabels && section === "nhan" ? (
            <div className="cd-manage-section">
              <CongDongFilterAdminPanel
                orgId={orgId}
                filters={filters}
                onChange={onFiltersChange}
              />
            </div>
          ) : null}

          {canMembers && section === "thanh_vien" ? (
            <CongDongMembersModal
              embedded
              open={open && section === "thanh_vien"}
              onClose={onClose}
              orgId={orgId}
              orgSlug={orgSlug}
              orgLabel={orgLabel}
              viewerIsOwner={viewerIsOwner}
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function CongDongManageTriggerButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button type="button" className="cd-v4-edit-info-btn" onClick={onClick}>
      <Pencil size={14} strokeWidth={2.2} aria-hidden />
      Quản lý cộng đồng
    </button>
  );
}
