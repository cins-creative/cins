"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type {
  OrgMilestoneTagRequestItem,
  OrgMilestoneTagStatus,
} from "@/lib/journey/org-milestone-tag-types";
import {
  formatTaggedAt,
  milestoneKindLabel,
  notifyStatusLabel,
  type MilestoneTagAlbum,
  type MilestoneTagEvidence,
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

function StudentAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  return (
    <span className="tdh-milestone-tag-avatar" aria-hidden>
      {avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={avatarUrl} alt="" />
      ) : (
        studentInitials(name)
      )}
    </span>
  );
}

function TagStatusBadge({ status }: { status: OrgMilestoneTagStatus }) {
  const Icon =
    status === "approved" ? CheckCircle2 : status === "rejected" ? XCircle : Clock3;
  return (
    <span className={`tdh-milestone-tag-status tdh-milestone-tag-status--${status}`}>
      <Icon size={13} strokeWidth={2.4} aria-hidden />
      {notifyStatusLabel(status)}
    </span>
  );
}

type FilterKey = "all" | OrgMilestoneTagStatus;

export function TruongMilestoneTagNotify() {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OrgMilestoneTagRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const loadItems = useCallback(async () => {
    if (!ctx?.orgId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/org/${ctx.orgId}/milestone-tag-requests`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        items?: OrgMilestoneTagRequestItem[];
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
    if (open) void loadItems();
  }, [open, loadItems]);

  const pendingCount = useMemo(
    () => items.filter((i) => i.status === "pending").length,
    [items],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  if (!ctx?.canEdit || !ctx.isEditing) return null;

  async function setStatus(id: string, status: OrgMilestoneTagStatus) {
    if (!ctx?.orgId) return;
    const action = status === "approved" ? "approve" : "reject";
    try {
      const res = await fetch(
        `/api/org/${ctx.orgId}/milestone-tag-requests/${id}`,
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
      setItems((list) =>
        list.map((row) => (row.id === id ? { ...row, status } : row)),
      );
      ctx.showToast(
        status === "approved"
          ? "Đã gắn milestone lên trang tổ chức"
          : status === "rejected"
            ? "Đã từ chối tag"
            : "Đã cập nhật",
      );
    } catch {
      ctx.showToast("Lỗi mạng.");
    }
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
              <strong>Bằng chứng</strong> học tại tổ chức.
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
              <MilestoneTagCard
                key={row.id}
                row={row}
                onApprove={() => void setStatus(row.id, "approved")}
                onReject={() => void setStatus(row.id, "rejected")}
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
  row: OrgMilestoneTagRequestItem;
  onApprove: () => void;
  onReject: () => void;
}) {
  const nganhOrKhoa = row.nganhLabel ?? row.khoaHocTen;
  const kindLabel = milestoneKindLabel(
    row.milestoneKind as "du_an" | "hoc" | "lam_viec" | "thanh_tuu",
  );
  const milestoneTitle = row.milestoneTitle.trim() || "Cột mốc";
  const projectTitle = row.projectTitle.trim();
  const showProjectSubtitle =
    projectTitle.length > 0 &&
    projectTitle.toLowerCase() !== milestoneTitle.toLowerCase();
  const profileHref = row.studentSlug.trim()
    ? `/${encodeURIComponent(row.studentSlug.trim())}`
    : null;

  return (
    <li
      className={`tdh-milestone-tag-card tdh-milestone-tag-card--${row.status}`}
    >
      <header
        className={`tdh-milestone-tag-card-hdr tdh-milestone-tag-card-hdr--${row.status}`}
      >
        <div className="tdh-milestone-tag-card-hdr-main">
          <StudentAvatar name={row.studentName} avatarUrl={row.studentAvatarUrl} />
          <div className="tdh-milestone-tag-card-identity">
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
              <TagStatusBadge status={row.status} />
            </div>
            <h4 className="tdh-milestone-tag-milestone">{milestoneTitle}</h4>
            {showProjectSubtitle ? (
              <p className="tdh-milestone-tag-project">{projectTitle}</p>
            ) : null}
            <ul className="tdh-milestone-tag-meta-list" aria-label="Thông tin yêu cầu">
              <li>{kindLabel}</li>
              {nganhOrKhoa ? <li>{nganhOrKhoa}</li> : null}
              <li>{row.nam}</li>
              <li>
                <time dateTime={row.taggedAt}>{formatTaggedAt(row.taggedAt)}</time>
              </li>
            </ul>
          </div>
        </div>
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
  const isImageFile =
    item.kind === "file" && Boolean(item.href?.trim());

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
