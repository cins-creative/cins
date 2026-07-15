"use client";

import { Layers3, Settings2, Tags, Users, X } from "lucide-react";
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

type NavItem = {
  id: CongDongManageSection;
  label: string;
  blurb: string;
  icon: typeof Layers3;
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
    const items: NavItem[] = [];
    if (canTopics) {
      items.push({
        id: "chu_de",
        label: "Chủ đề",
        blurb: "Lĩnh vực và ngành đào tạo",
        icon: Layers3,
      });
    }
    if (canLabels) {
      items.push({
        id: "nhan",
        label: "Nhãn feed",
        blurb: "Nhãn gắn bài trong nhóm",
        icon: Tags,
      });
    }
    if (canMembers) {
      items.push({
        id: "thanh_vien",
        label: "Thành viên",
        blurb: "Vai trò và quyền hạn",
        icon: Users,
      });
    }
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

  const activeNav = nav.find((n) => n.id === section) ?? nav[0];

  if (!open || typeof document === "undefined" || nav.length === 0) return null;

  return createPortal(
    <div
      className="tdh-inline-modal-backdrop cso-settings-backdrop cd-manage-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="tdh-inline-modal tdh-inline-modal--wide cd-manage-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cd-manage-head">
          <div className="cd-manage-head-copy">
            <span className="cd-manage-head-icon" aria-hidden>
              <Settings2 size={18} strokeWidth={2} />
            </span>
            <div className="cd-manage-head-text">
              <h2 id={titleId} className="cd-manage-title">
                Quản lý cộng đồng
              </h2>
              <p className="cd-manage-subtitle">{orgLabel}</p>
            </div>
          </div>
          <button
            type="button"
            className="cd-manage-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="cd-manage-layout">
          <nav className="cd-manage-nav" aria-label="Mục quản lý cộng đồng">
            {nav.map((item) => {
              const Icon = item.icon;
              const on = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`cd-manage-nav-btn${on ? " is-on" : ""}`}
                  aria-current={on ? "true" : undefined}
                  onClick={() => setSection(item.id)}
                >
                  <span className="cd-manage-nav-ico" aria-hidden>
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <span className="cd-manage-nav-copy">
                    <span className="cd-manage-nav-label">{item.label}</span>
                    <span className="cd-manage-nav-blurb">{item.blurb}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="cd-manage-pane">
            {activeNav ? (
              <div className="cd-manage-pane-head">
                <h3 className="cd-manage-pane-title">{activeNav.label}</h3>
                <p className="cd-manage-pane-blurb">{activeNav.blurb}</p>
              </div>
            ) : null}

            <div className="cd-manage-pane-body">
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
      <Settings2 size={14} strokeWidth={2.2} aria-hidden />
      Quản lý cộng đồng
    </button>
  );
}
