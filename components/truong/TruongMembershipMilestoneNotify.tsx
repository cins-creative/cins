"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  Clock3,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MilestoneTagOrgMessagePanel } from "@/components/truong/MilestoneTagOrgMessagePanel";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type {
  OrgMembershipMilestoneRequestItem,
  OrgMembershipMilestoneStatus,
} from "@/lib/journey/membership-milestone-types";
import type { OrgAttachEvidence } from "@/lib/journey/org-milestone-tag-types";
import {
  formatTaggedAt,
  milestoneKindLabel,
} from "@/lib/truong/milestone-tag-notify-mock";

function membershipStatusLabel(status: OrgMembershipMilestoneStatus): string {
  switch (status) {
    case "pending":
      return "Chờ duyệt";
    case "approved":
      return "Đã xác thực";
    case "rejected":
      return "Từ chối";
    default:
      return status;
  }
}

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

function StudentAvatar({
  name,
  avatarUrl,
  compact = false,
}: {
  name: string;
  avatarUrl: string | null;
  compact?: boolean;
}) {
  return (
    <span
      className={`tdh-milestone-tag-avatar${compact ? " tdh-milestone-tag-avatar--sm" : ""}`}
      aria-hidden
    >
      {avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={avatarUrl} alt="" />
      ) : (
        studentInitials(name)
      )}
    </span>
  );
}

function StatusBadge({ status }: { status: OrgMembershipMilestoneStatus }) {
  const Icon =
    status === "approved" ? CheckCircle2 : status === "rejected" ? XCircle : Clock3;
  return (
    <span className={`tdh-milestone-tag-status tdh-milestone-tag-status--${status}`}>
      <Icon size={13} strokeWidth={2.4} aria-hidden />
      {membershipStatusLabel(status)}
    </span>
  );
}

type FilterKey = "all" | OrgMembershipMilestoneStatus;

export function TruongMembershipMilestoneNotify() {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OrgMembershipMilestoneRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const loadItems = useCallback(async () => {
    if (!ctx?.orgId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/org/${ctx.orgId}/membership-milestone-requests`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as {
        items?: OrgMembershipMilestoneRequestItem[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(json.error ?? "Không tải được yêu cầu.");
        setItems([]);
        return;
      }
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch {
      setLoadError("Lỗi mạng.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [ctx?.orgId]);

  useEffect(() => {
    if (open) {
      setFilter("pending");
      void loadItems();
    } else {
      setSelectedId(null);
      setMobileShowDetail(false);
    }
  }, [open, loadItems]);

  const pendingCount = useMemo(
    () => items.filter((i) => i.status === "pending").length,
    [items],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((r) => r.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  const selectedRow =
    filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  if (!ctx?.canEdit || !ctx.isEditing) return null;

  async function respondRequest(id: string, action: "approve" | "reject") {
    if (!ctx?.orgId) return;
    try {
      const res = await fetch(
        `/api/org/${ctx.orgId}/membership-milestone-requests/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        ctx.showToast(json.error ?? "Không cập nhật được.");
        return;
      }
      const nextStatus: OrgMembershipMilestoneStatus =
        action === "approve" ? "approved" : "rejected";
      setItems((list) =>
        list.map((row) => (row.id === id ? { ...row, status: nextStatus } : row)),
      );
      ctx.showToast(
        action === "approve" ? "Đã xác thực cột mốc" : "Đã từ chối yêu cầu",
      );
    } catch {
      ctx.showToast("Lỗi mạng.");
    }
  }

  function selectRow(id: string) {
    setSelectedId(id);
    setMobileShowDetail(true);
  }

  return (
    <>
      <button
        type="button"
        className="ss-btn ss-btn-notify ss-btn-notify--verify"
        onClick={() => setOpen(true)}
        aria-label={
          pendingCount > 0
            ? `Xác thực cột mốc — ${pendingCount} chờ duyệt`
            : "Xác thực cột mốc danh tính"
        }
        title="Duyệt cột mốc danh tính từ học viên / thành viên"
      >
        <ShieldCheck size={18} strokeWidth={2.2} aria-hidden />
        <span className="ss-btn-notify-label">Xác thực</span>
        {pendingCount > 0 ? (
          <span className="ss-btn-notify-badge" aria-hidden>
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        ) : null}
      </button>

      <TruongInlineModal
        open={open}
        onClose={() => setOpen(false)}
        className="tdh-inline-modal--wide tdh-milestone-tag-modal tdh-membership-milestone-modal"
        labelledBy="tdh-membership-milestone-title"
      >
        <div className="tdh-milestone-tag-hdr">
          <div>
            <h3 id="tdh-membership-milestone-title" className="tdh-inline-modal-title">
              Duyệt cột mốc danh tính
            </h3>
            <p className="tdh-membership-milestone-subtitle">
              Xác thực quan hệ học viên / thành viên trên Journey — tách khỏi đồ án.
            </p>
          </div>
          <button
            type="button"
            className="tdh-inline-btn ghost"
            onClick={() => setOpen(false)}
          >
            Đóng
          </button>
        </div>

        <div
          className="tdh-milestone-tag-filters"
          role="tablist"
          aria-label="Lọc trạng thái"
        >
          {(
            [
              ["all", "Tất cả", items.length],
              ["pending", "Chờ duyệt", pendingCount],
              [
                "approved",
                "Đã xác thực",
                items.filter((i) => i.status === "approved").length,
              ],
              [
                "rejected",
                "Từ chối",
                items.filter((i) => i.status === "rejected").length,
              ],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={`tdh-milestone-tag-filter${filter === key ? " on" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
              <span className="tdh-milestone-tag-filter-count">{count}</span>
            </button>
          ))}
        </div>

        <div
          className={`tdh-milestone-tag-split${mobileShowDetail ? " tdh-milestone-tag-split--detail" : ""}`}
        >
          <aside className="tdh-milestone-tag-list-pane" aria-label="Danh sách yêu cầu">
            <ul className="tdh-milestone-tag-rows">
              {loading ? (
                <li className="tdh-milestone-tag-empty">Đang tải…</li>
              ) : loadError ? (
                <li className="tdh-milestone-tag-empty">{loadError}</li>
              ) : filtered.length === 0 ? (
                <li className="tdh-milestone-tag-empty">
                  Không có mục trong bộ lọc này.
                </li>
              ) : (
                filtered.map((row) => (
                  <MembershipListRow
                    key={row.id}
                    row={row}
                    selected={row.id === selectedId}
                    onSelect={() => selectRow(row.id)}
                  />
                ))
              )}
            </ul>
          </aside>

          <div className="tdh-milestone-tag-detail-pane">
            {selectedRow ? (
              <MembershipDetail
                row={selectedRow}
                orgId={ctx.orgId}
                showBack={mobileShowDetail}
                onBack={() => setMobileShowDetail(false)}
                onApprove={() => void respondRequest(selectedRow.id, "approve")}
                onReject={() => void respondRequest(selectedRow.id, "reject")}
              />
            ) : (
              <p className="tdh-milestone-tag-detail-empty">
                Chọn một yêu cầu để xem chi tiết.
              </p>
            )}
          </div>
        </div>
      </TruongInlineModal>
    </>
  );
}

function MembershipListRow({
  row,
  selected,
  onSelect,
}: {
  row: OrgMembershipMilestoneRequestItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const kindLabel = milestoneKindLabel(
    row.loaiMoc as "du_an" | "hoc" | "lam_viec" | "thanh_tuu",
  );

  return (
    <li
      className={`tdh-milestone-tag-row tdh-milestone-tag-row--${row.status}${selected ? " is-selected" : ""}`}
    >
      <button type="button" className="tdh-milestone-tag-row-btn" onClick={onSelect}>
        <StudentAvatar
          name={row.studentName}
          avatarUrl={row.studentAvatarUrl}
          compact
        />
        <span className="tdh-milestone-tag-row-main">
          <span className="tdh-milestone-tag-row-top">
            <span className="tdh-milestone-tag-row-student">{row.studentName}</span>
            <StatusBadge status={row.status} />
          </span>
          <span className="tdh-milestone-tag-row-milestone">{row.title}</span>
          <span className="tdh-milestone-tag-row-sub">
            {kindLabel}
            {row.contextLabel ? (
              <>
                <span className="tdh-milestone-tag-row-dot" aria-hidden>
                  ·
                </span>
                {row.contextLabel}
              </>
            ) : null}
            <span className="tdh-milestone-tag-row-dot" aria-hidden>
              ·
            </span>
            <time dateTime={row.submittedAt}>{formatTaggedAt(row.submittedAt)}</time>
          </span>
        </span>
      </button>
    </li>
  );
}

function MembershipDetail({
  row,
  orgId,
  showBack,
  onBack,
  onApprove,
  onReject,
}: {
  row: OrgMembershipMilestoneRequestItem;
  orgId: string;
  showBack: boolean;
  onBack: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const kindLabel = milestoneKindLabel(
    row.loaiMoc as "du_an" | "hoc" | "lam_viec" | "thanh_tuu",
  );
  const profileHref = row.studentSlug.trim()
    ? `/${encodeURIComponent(row.studentSlug.trim())}`
    : null;

  return (
    <article className="tdh-milestone-tag-detail tdh-membership-milestone-detail">
      {showBack ? (
        <button
          type="button"
          className="tdh-milestone-tag-detail-back"
          onClick={onBack}
        >
          <ChevronLeft size={18} strokeWidth={2.2} aria-hidden />
          Danh sách
        </button>
      ) : null}

      <header
        className={`tdh-milestone-tag-detail-hdr tdh-milestone-tag-detail-hdr--${row.status}`}
      >
        <StudentAvatar name={row.studentName} avatarUrl={row.studentAvatarUrl} />
        <div className="tdh-milestone-tag-detail-hdr-main">
          <div className="tdh-milestone-tag-card-topline">
            <div className="tdh-milestone-tag-student-wrap">
              {profileHref ? (
                <Link
                  href={profileHref}
                  className="tdh-milestone-tag-student"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {row.studentName}
                </Link>
              ) : (
                <span className="tdh-milestone-tag-student">{row.studentName}</span>
              )}
              {row.studentSlug.trim() ? (
                <span className="tdh-milestone-tag-slug">@{row.studentSlug.trim()}</span>
              ) : null}
            </div>
            <StatusBadge status={row.status} />
          </div>
          <h4 className="tdh-milestone-tag-milestone">{row.title}</h4>
          {row.body ? <p className="tdh-membership-milestone-body">{row.body}</p> : null}
          <ul className="tdh-milestone-tag-meta-list" aria-label="Thông tin yêu cầu">
            <li>{kindLabel}</li>
            {row.contextLabel ? <li>{row.contextLabel}</li> : null}
            <li>
              <time dateTime={row.submittedAt}>{formatTaggedAt(row.submittedAt)}</time>
            </li>
          </ul>
        </div>
      </header>

      <div className="tdh-milestone-tag-detail-scroll">
        <div className="tdh-membership-milestone-slots">
          <p className="tdh-membership-milestone-slots-label">Nội dung cột mốc</p>
          <ul className="tdh-membership-milestone-slots-list">
            {row.slotSummary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        {row.evidence.length > 0 ? (
          <div className="tdh-milestone-tag-evidence-compact">
            <p className="tdh-milestone-tag-evidence-compact-label">Bằng chứng</p>
            <ul className="tdh-milestone-tag-evidence-list">
              {row.evidence.map((ev, i) => (
                <EvidenceItem key={`${row.id}-ev-${i}`} item={ev} />
              ))}
            </ul>
          </div>
        ) : null}

        {row.studentUserId ? (
          <MilestoneTagOrgMessagePanel
            orgId={orgId}
            studentUserId={row.studentUserId}
          />
        ) : null}
      </div>

      {row.status === "pending" ? (
        <div className="tdh-milestone-tag-detail-foot">
          <button type="button" className="tdh-inline-btn primary" onClick={onApprove}>
            Xác thực cột mốc
          </button>
          <button type="button" className="tdh-inline-btn danger" onClick={onReject}>
            Từ chối
          </button>
        </div>
      ) : null}
    </article>
  );
}

function EvidenceItem({ item }: { item: OrgAttachEvidence }) {
  const isImageFile = item.kind === "file" && Boolean(item.href?.trim());

  if (isImageFile && item.href) {
    return (
      <li className="tdh-milestone-tag-evidence-item tdh-milestone-tag-evidence-item--image">
        <span className="tdh-milestone-tag-evidence-label">{item.label}</span>
        <a
          href={item.href}
          className="tdh-milestone-tag-evidence-image-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.href} alt={item.label} />
        </a>
      </li>
    );
  }

  const icon =
    item.kind === "file" ? "📎" : item.kind === "link" ? "🔗" : "ℹ️";

  if (item.href) {
    return (
      <li className="tdh-milestone-tag-evidence-item">
        <span className="tdh-milestone-tag-evidence-icon" aria-hidden>
          {icon}
        </span>
        <a
          href={item.href}
          className="tdh-milestone-tag-evidence-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {item.label}
        </a>
        {item.detail ? (
          <span className="tdh-milestone-tag-evidence-detail">{item.detail}</span>
        ) : null}
      </li>
    );
  }

  return (
    <li className="tdh-milestone-tag-evidence-item">
      <span className="tdh-milestone-tag-evidence-icon" aria-hidden>
        {icon}
      </span>
      <span className="tdh-milestone-tag-evidence-label">{item.label}</span>
      {item.detail ? (
        <span className="tdh-milestone-tag-evidence-detail">{item.detail}</span>
      ) : null}
    </li>
  );
}
