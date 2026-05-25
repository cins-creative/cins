"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import {
  formatTaggedAt,
  milestoneKindLabel,
  MOCK_MILESTONE_TAG_NOTIFY,
  notifyStatusLabel,
  type MilestoneTagAlbum,
  type MilestoneTagEvidence,
  type MilestoneTagNotifyItem,
  type MilestoneTagNotifyStatus,
} from "@/lib/truong/milestone-tag-notify-mock";

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function AlbumIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

function EvidenceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 12l2 2 4-4" />
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

type FilterKey = "all" | MilestoneTagNotifyStatus;

export function TruongMilestoneTagNotify() {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(MOCK_MILESTONE_TAG_NOTIFY);
  const [filter, setFilter] = useState<FilterKey>("all");

  const pendingCount = useMemo(
    () => items.filter((i) => i.status === "pending").length,
    [items],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  if (!ctx?.canEdit || !ctx.isEditing) return null;

  function setStatus(id: string, status: MilestoneTagNotifyStatus) {
    setItems((list) =>
      list.map((row) => (row.id === id ? { ...row, status } : row)),
    );
    ctx?.showToast(
      status === "approved"
        ? "Đã gắn milestone lên trang trường (mock)"
        : status === "rejected"
          ? "Đã từ chối tag (mock)"
          : "Đã cập nhật",
    );
  }

  return (
    <>
      <button
        type="button"
        className="ss-btn ss-btn-notify"
        onClick={() => setOpen(true)}
        aria-label={
          pendingCount > 0
            ? `Thông báo tag đồ án — ${pendingCount} chờ duyệt`
            : "Thông báo tag đồ án"
        }
        title="Tag milestone / đồ án từ sinh viên"
      >
        <BellIcon />
        <span className="ss-btn-notify-label">Thông báo</span>
        {pendingCount > 0 ? (
          <span className="ss-btn-notify-badge" aria-hidden>
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        ) : null}
      </button>

      <TruongInlineModal
        open={open}
        onClose={() => setOpen(false)}
        className="tdh-inline-modal--wide tdh-milestone-tag-modal"
        labelledBy="tdh-milestone-tag-title"
      >
        <div className="tdh-milestone-tag-hdr">
          <div>
            <h3 id="tdh-milestone-tag-title" className="tdh-inline-modal-title">
              Tag milestone &amp; đồ án
            </h3>
            <p className="tdh-milestone-tag-lead">
              Sinh viên gắn cột mốc vào <strong>{ctx.school.ten}</strong>. Mỗi yêu
              cầu gồm <strong>Album</strong> (trang nội dung trên Journey) và{" "}
              <strong>Bằng chứng</strong> học tại trường. (Mock)
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
                "Đã gắn",
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

        <ul className="tdh-milestone-tag-list">
          {filtered.length === 0 ? (
            <li className="tdh-milestone-tag-empty">
              Không có mục trong bộ lọc này.
            </li>
          ) : (
            filtered.map((row) => (
              <MilestoneTagCard
                key={row.id}
                row={row}
                onApprove={() => setStatus(row.id, "approved")}
                onReject={() => setStatus(row.id, "rejected")}
              />
            ))
          )}
        </ul>
      </TruongInlineModal>
    </>
  );
}

function MilestoneTagCard({
  row,
  onApprove,
  onReject,
}: {
  row: MilestoneTagNotifyItem;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <li
      className={`tdh-milestone-tag-card tdh-milestone-tag-card--${row.status}`}
    >
      <header className="tdh-milestone-tag-card-hdr">
        <div className="tdh-milestone-tag-card-who">
          <span className="tdh-milestone-tag-avatar" aria-hidden>
            {studentInitials(row.studentName)}
          </span>
          <div className="tdh-milestone-tag-card-meta">
            <span className="tdh-milestone-tag-student">{row.studentName}</span>
            <span className="tdh-milestone-tag-milestone">{row.milestoneTitle}</span>
            <span className="tdh-milestone-tag-project">{row.projectTitle}</span>
            <div className="tdh-milestone-tag-chip-row">
              <span className="tdh-milestone-tag-chip">
                {milestoneKindLabel(row.milestoneKind)}
              </span>
              {row.nganhLabel ? (
                <span className="tdh-milestone-tag-chip">{row.nganhLabel}</span>
              ) : null}
              <time className="tdh-milestone-tag-chip tdh-milestone-tag-chip--muted">
                {formatTaggedAt(row.taggedAt)}
              </time>
            </div>
          </div>
        </div>
        <span
          className={`tdh-milestone-tag-status tdh-milestone-tag-status--${row.status}`}
        >
          {notifyStatusLabel(row.status)}
        </span>
      </header>

      <div className="tdh-milestone-tag-card-body">
        <section className="tdh-milestone-tag-panel tdh-milestone-tag-panel--album">
          <div className="tdh-milestone-tag-panel-hdr">
            <AlbumIcon />
            <h4 className="tdh-milestone-tag-panel-title">Album</h4>
            <span className="tdh-milestone-tag-panel-sub">Trang nội dung</span>
          </div>
          <MilestoneTagAlbumPreview album={row.album} />
        </section>

        <section className="tdh-milestone-tag-panel tdh-milestone-tag-panel--evidence">
          <div className="tdh-milestone-tag-panel-hdr">
            <EvidenceIcon />
            <h4 className="tdh-milestone-tag-panel-title">Bằng chứng</h4>
            <span className="tdh-milestone-tag-panel-sub">Học tại trường</span>
          </div>
          <ul className="tdh-milestone-tag-evidence-list">
            {row.evidence.map((ev, i) => (
              <EvidenceItem key={`${row.id}-ev-${i}`} item={ev} />
            ))}
          </ul>
        </section>
      </div>

      {row.status === "pending" ? (
        <div className="tdh-milestone-tag-card-foot">
          <button
            type="button"
            className="tdh-inline-btn primary"
            onClick={onApprove}
          >
            Gắn lên trang trường
          </button>
          <button
            type="button"
            className="tdh-inline-btn danger"
            onClick={onReject}
          >
            Từ chối
          </button>
        </div>
      ) : null}
    </li>
  );
}

function MilestoneTagAlbumPreview({ album }: { album: MilestoneTagAlbum }) {
  const fallbackBg =
    album.coverGradient ??
    "linear-gradient(135deg, #1e3a5f 0%, #5c2bb6 55%, #c2410c 100%)";

  return (
    <Link
      href={album.href}
      className="tdh-milestone-tag-album-preview"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div
        className="tdh-milestone-tag-album-preview-cover"
        style={!album.coverSrc ? { background: fallbackBg } : undefined}
      >
        {album.coverSrc ? (
          <Image
            src={album.coverSrc}
            alt={album.coverAlt ?? album.title}
            fill
            className="tdh-milestone-tag-album-preview-img"
            sizes="(max-width: 560px) 100vw, 360px"
          />
        ) : null}
        <div className="tdh-milestone-tag-album-preview-scrim" aria-hidden />
        {album.photoCount != null && album.photoCount > 0 ? (
          <span className="tdh-milestone-tag-album-preview-badge">
            {album.photoCount} ảnh
          </span>
        ) : null}
      </div>
      <div className="tdh-milestone-tag-album-preview-body">
        <p className="tdh-milestone-tag-album-preview-title">{album.title}</p>
        {album.excerpt ? (
          <p className="tdh-milestone-tag-album-preview-excerpt">{album.excerpt}</p>
        ) : null}
        <span className="tdh-milestone-tag-album-preview-cta">
          Xem trang của sinh viên
          <ExternalIcon />
        </span>
      </div>
    </Link>
  );
}

function EvidenceItem({ item }: { item: MilestoneTagEvidence }) {
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
