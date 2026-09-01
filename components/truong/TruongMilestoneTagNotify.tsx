"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  Clock3,
  LayoutList,
  Link2Off,
  Paperclip,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CoSoDoanSanPhamAdmin } from "@/components/co-so/CoSoDoanSanPhamAdmin";
import { JourneyPostBody } from "@/components/journey/JourneyPostBody";
import { MilestoneTagOrgMessagePanel } from "@/components/truong/MilestoneTagOrgMessagePanel";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type { MilestonePostDetail } from "@/lib/journey/milestone-post-types";
import { milestoneCardContentKind } from "@/lib/journey/milestone-card-kind";
import { milestoneCardCaptionForDisplay } from "@/lib/journey/post-media";
import type {
  OrgAttachEvidence,
  OrgMilestoneTagRequestItem,
  OrgMilestoneTagStatus,
} from "@/lib/journey/org-milestone-tag-types";
import {
  formatTaggedAt,
  milestoneKindLabel,
  notifyStatusLabel,
} from "@/lib/truong/milestone-tag-notify-mock";
/* CSS block bài viết + timeline unfold — trang trường không load qua layout parent. */
import "@/app/[slug]/journey/journey.css";
import "@/app/[slug]/p/new/editor.css";
import "@/app/[slug]/p/[postSlug]/post-page.css";

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

function TagStatusBadge({ status }: { status: OrgMilestoneTagStatus }) {
  const Icon =
    status === "approved"
      ? CheckCircle2
      : status === "rejected"
        ? XCircle
        : status === "detached"
          ? Link2Off
          : Clock3;
  return (
    <span className={`tdh-milestone-tag-status tdh-milestone-tag-status--${status}`}>
      <Icon size={13} strokeWidth={2.4} aria-hidden />
      {notifyStatusLabel(status)}
    </span>
  );
}

function parsePostHref(
  href: string,
): { ownerSlug: string; postSlug: string } | null {
  const trimmed = href.trim();
  if (!trimmed) return null;
  try {
    const path = trimmed.startsWith("http")
      ? new URL(trimmed).pathname
      : trimmed.split("?")[0]!;
    const parts = path.split("/").filter(Boolean);
    const pIdx = parts.indexOf("p");
    if (pIdx >= 0 && parts[pIdx + 1]) {
      const ownerSlug = parts[pIdx - 1] ?? parts[0];
      const postSlug = parts[pIdx + 1];
      if (ownerSlug && postSlug) {
        return { ownerSlug, postSlug };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

type FilterKey = "all" | OrgMilestoneTagStatus;

type TruongMilestoneTagNotifyProps = {
  orgId?: string;
  variant?: "sidebar" | "nav";
  alwaysAvailable?: boolean;
  /**
   * Filter «Đã duyệt» = bảng quản hiển thị tường (CSĐT / trường ĐH).
   * Studio chỉ list tag đã duyệt — không quản tường.
   */
  showWallAdmin?: boolean;
};

export function TruongMilestoneTagNotify({
  orgId: orgIdProp,
  variant = "sidebar",
  alwaysAvailable = false,
  showWallAdmin = false,
}: TruongMilestoneTagNotifyProps = {}) {
  const ctx = useTruongInlineEdit();
  const orgId = orgIdProp ?? ctx?.orgId ?? null;
  const canUse = alwaysAvailable
    ? Boolean(orgId)
    : Boolean(ctx?.canEdit && ctx.isEditing && orgId);

  const toast = useCallback(
    (message: string) => {
      ctx?.showToast?.(message);
    },
    [ctx],
  );

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OrgMilestoneTagRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const loadItems = useCallback(async (options?: { silent?: boolean }) => {
    if (!orgId) return;
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const res = await fetch(`/api/org/${orgId}/milestone-tag-requests`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        items?: OrgMilestoneTagRequestItem[];
        error?: string;
      };
      if (!res.ok) {
        if (!silent) {
          setLoadError(json.error ?? "Không tải được yêu cầu.");
          setItems([]);
        }
        return;
      }
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch {
      if (!silent) {
        setLoadError("Lỗi mạng.");
        setItems([]);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [orgId]);

  useEffect(() => {
    if (open) {
      setFilter("pending");
      void loadItems();
    } else {
      setSelectedId(null);
      setMobileShowDetail(false);
    }
  }, [open, loadItems]);

  /* Badge «chờ duyệt» trên nút — fetch ngay khi mount, không đợi mở modal. */
  useEffect(() => {
    if (!canUse || !orgId) return;
    void loadItems({ silent: true });
    const refresh = () => void loadItems({ silent: true });
    const intervalId = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
    };
  }, [canUse, orgId, loadItems]);

  const tagPendingCount = useMemo(
    () => items.filter((i) => i.status === "pending").length,
    [items],
  );

  const approvedCount = useMemo(
    () => items.filter((i) => i.status === "approved").length,
    [items],
  );

  /* Không pending → mở thẳng bảng hiển thị tường (Đã duyệt). */
  useEffect(() => {
    if (!open || loading || !showWallAdmin) return;
    if (filter !== "pending") return;
    if (tagPendingCount > 0 || approvedCount === 0) return;
    setFilter("approved");
  }, [open, loading, showWallAdmin, filter, tagPendingCount, approvedCount]);

  const rejectedCount = useMemo(
    () =>
      items.filter(
        (i) => i.status === "rejected" || i.status === "detached",
      ).length,
    [items],
  );

  const showWallPane = showWallAdmin && filter === "approved";

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "rejected") {
      return items.filter(
        (i) => i.status === "rejected" || i.status === "detached",
      );
    }
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  useEffect(() => {
    if (showWallPane) return;
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((r) => r.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId, showWallPane]);

  const selectedRow =
    filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  if (!canUse || !orgId) return null;

  async function respondRequest(
    id: string,
    action: "approve" | "reject" | "detach",
  ) {
    if (!orgId) return;
    if (
      action === "detach" &&
      !window.confirm(
        "Gỡ milestone này khỏi trang trường? Đồ án sẽ không còn hiển thị trên trang tổ chức.",
      )
    ) {
      return;
    }
    try {
      const res = await fetch(
        `/api/org/${orgId}/milestone-tag-requests/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast(json.error ?? "Không cập nhật được.");
        return;
      }
      const nextStatus: OrgMilestoneTagStatus =
        action === "approve"
          ? "approved"
          : action === "detach"
            ? "detached"
            : "rejected";
      setItems((list) =>
        list.map((row) => (row.id === id ? { ...row, status: nextStatus } : row)),
      );
      toast(
        action === "approve"
          ? "Đã gắn milestone lên trang tổ chức"
          : action === "detach"
            ? "Đã gỡ khỏi trang trường"
            : "Đã từ chối tag",
      );
      if (action === "approve" && showWallAdmin) {
        setFilter("approved");
      }
    } catch {
      toast("Lỗi mạng.");
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
        className={
          variant === "nav"
            ? "cso-ql-nav-tool ss-btn-notify"
            : "ss-btn ss-btn-notify"
        }
        onClick={() => setOpen(true)}
        aria-label={
          tagPendingCount > 0
            ? `Quản lý bài học viên — ${tagPendingCount} tag chờ duyệt`
            : "Quản lý bài học viên"
        }
        title="Duyệt tag ORG và quản lý bài học viên trên tường"
      >
        <LayoutList size={18} strokeWidth={2} aria-hidden />
        <span className="ss-btn-notify-label">Quản lý bài học viên</span>
        {tagPendingCount > 0 ? (
          <span className="ss-btn-notify-badge" aria-hidden>
            {tagPendingCount > 9 ? "9+" : tagPendingCount}
          </span>
        ) : null}
      </button>

      <TruongInlineModal
        open={open}
        onClose={() => setOpen(false)}
        className={`tdh-inline-modal--wide tdh-milestone-tag-modal${
          variant === "nav" ? " tdh-milestone-tag-modal--shell" : ""
        }`}
        labelledBy="tdh-org-notify-title"
        showClose={false}
        portalSelector={variant === "nav" ? ".cso-ql-body" : undefined}
        fillHost={variant === "nav"}
      >
        <div className="tdh-milestone-tag-hdr">
          <div>
            <h3 id="tdh-org-notify-title" className="tdh-inline-modal-title">
              Quản lý bài học viên
            </h3>
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
          aria-label="Lọc trạng thái tag đồ án"
        >
          {(
            [
              ["all", "Tất cả", items.length],
              ["pending", "Chờ duyệt", tagPendingCount],
              ["approved", "Đã duyệt", approvedCount],
              ["rejected", "Từ chối", rejectedCount],
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

        {showWallPane ? (
          <div className="tdh-milestone-tag-wall-pane">
            <CoSoDoanSanPhamAdmin
              orgId={orgId}
              onDetached={(requestId) => {
                setItems((list) =>
                  list.map((row) =>
                    row.id === requestId
                      ? { ...row, status: "detached" as const }
                      : row,
                  ),
                );
              }}
            />
          </div>
        ) : (
          <div
            className={`tdh-milestone-tag-split${mobileShowDetail ? " tdh-milestone-tag-split--detail" : ""}`}
          >
            <aside
              className="tdh-milestone-tag-list-pane"
              aria-label="Danh sách yêu cầu"
            >
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
                    <MilestoneTagListRow
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
                <MilestoneTagDetail
                  row={selectedRow}
                  orgId={orgId}
                  showBack={mobileShowDetail}
                  onBack={() => setMobileShowDetail(false)}
                  onApprove={() =>
                    void respondRequest(selectedRow.id, "approve")
                  }
                  onReject={() =>
                    void respondRequest(selectedRow.id, "reject")
                  }
                  onDetach={() =>
                    void respondRequest(selectedRow.id, "detach")
                  }
                />
              ) : (
                <p className="tdh-milestone-tag-detail-empty">
                  Chọn một yêu cầu để xem chi tiết.
                </p>
              )}
            </div>
          </div>
        )}
      </TruongInlineModal>
    </>
  );
}

function MilestoneTagListRow({
  row,
  selected,
  onSelect,
}: {
  row: OrgMilestoneTagRequestItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const milestoneTitle = row.milestoneTitle.trim() || "Cột mốc";
  const kindLabel = milestoneKindLabel(
    row.milestoneKind as "du_an" | "hoc" | "lam_viec" | "thanh_tuu",
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
            <TagStatusBadge status={row.status} />
          </span>
          <span className="tdh-milestone-tag-row-milestone">{milestoneTitle}</span>
          <span className="tdh-milestone-tag-row-sub">
            {kindLabel}
            <span className="tdh-milestone-tag-row-dot" aria-hidden>
              ·
            </span>
            <time dateTime={row.taggedAt}>{formatTaggedAt(row.taggedAt)}</time>
          </span>
        </span>
      </button>
    </li>
  );
}

function MilestoneTagDetail({
  row,
  orgId,
  showBack,
  onBack,
  onApprove,
  onReject,
  onDetach,
}: {
  row: OrgMilestoneTagRequestItem;
  orgId: string;
  showBack: boolean;
  onBack: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDetach: () => void;
}) {
  const nganhOrKhoa = [row.nganhLabel ?? row.khoaHocTen, row.monHocLabel]
    .filter(Boolean)
    .join(" · ");
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
  const postPath = parsePostHref(row.album.href);
  const hasEvidence = row.evidence.length > 0;
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  useEffect(() => {
    setEvidenceOpen(false);
  }, [row.id]);

  return (
    <article className="tdh-milestone-tag-detail">
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
        {hasEvidence ? (
          <button
            type="button"
            className={`tdh-milestone-tag-evidence-btn${evidenceOpen ? " is-open" : ""}`}
            aria-expanded={evidenceOpen}
            aria-controls={`tdh-milestone-tag-evidence-${row.id}`}
            onClick={() => setEvidenceOpen((open) => !open)}
          >
            <Paperclip size={15} strokeWidth={2.4} aria-hidden />
            <span>Xem bằng chứng</span>
            <span className="tdh-milestone-tag-evidence-btn-count" aria-hidden>
              {row.evidence.length}
            </span>
          </button>
        ) : null}
      </header>

      {hasEvidence && evidenceOpen ? (
        <EvidencePanel items={row.evidence} rowId={row.id} />
      ) : null}

      <div className="tdh-milestone-tag-detail-scroll">
        {postPath ? (
          <MilestoneTagPostPreview
            key={`${postPath.ownerSlug}/${postPath.postSlug}`}
            ownerSlug={postPath.ownerSlug}
            postSlug={postPath.postSlug}
          />
        ) : (
          <p className="tdh-milestone-tag-post-err">
            Không đọc được liên kết bài viết.
          </p>
        )}

        {row.studentUserId ? (
          <MilestoneTagOrgMessagePanel
            orgId={orgId}
            studentUserId={row.studentUserId}
          />
        ) : null}
      </div>

      {row.status === "pending" ? (
        <div className="tdh-milestone-tag-detail-foot">
          <button
            type="button"
            className="tdh-inline-btn primary"
            onClick={onApprove}
          >
            Xác nhận
          </button>
          <button
            type="button"
            className="tdh-inline-btn danger"
            onClick={onReject}
          >
            Từ chối
          </button>
        </div>
      ) : row.status === "approved" ? (
        <div className="tdh-milestone-tag-detail-foot">
          <button
            type="button"
            className="tdh-inline-btn danger"
            onClick={onDetach}
          >
            Gỡ khỏi trang trường
          </button>
        </div>
      ) : null}
    </article>
  );
}

function MilestoneTagPostPreview({
  ownerSlug,
  postSlug,
}: {
  ownerSlug: string;
  postSlug: string;
}) {
  const [detail, setDetail] = useState<MilestonePostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);

    const url = `/api/journey/${encodeURIComponent(ownerSlug)}/p/${encodeURIComponent(postSlug)}`;
    void fetch(url, { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as MilestonePostDetail & { error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? "Không tải được bài viết.");
        }
        return json;
      })
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Lỗi tải bài viết.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ownerSlug, postSlug]);

  if (loading) {
    return <p className="tdh-milestone-tag-post-loading">Đang tải bài viết…</p>;
  }
  if (error) {
    return <p className="tdh-milestone-tag-post-err">{error}</p>;
  }
  if (!detail) return null;

  const mainPost = detail.posts[0];
  const milestone = detail.milestone;
  const heroTitle =
    milestone.tieuDe || mainPost?.tieuDe || "Cột mốc không tiêu đề";
  const heroSub = milestone.moTa || mainPost?.moTa || null;
  const blocks = mainPost?.noiDungBlocks ?? null;
  const contentKind = milestoneCardContentKind(blocks, false, heroSub);
  const cardCaption = milestoneCardCaptionForDisplay(heroTitle, heroSub, blocks);
  const hasCaption = Boolean(cardCaption?.trim());

  return (
    <div
      className="tdh-milestone-tag-post-view"
      data-post-content-kind={contentKind}
    >
      <div
        className={`j-m-card jcard jcard--${contentKind} has-unfold is-expanded`}
      >
        {hasCaption ? (
          <div className="jcard-body is-content-open">
            <div className="jcard-content">
              <div className="jcard-text">
                <div className="jcard-lead">
                  <p className="jcard-desc">{cardCaption}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className="j-m-card-unfold" data-open="true" aria-hidden={false}>
          <div className="j-m-card-unfold-inner">
            <JourneyPostBody
              initialDetail={detail}
              postSlug={postSlug}
              isOwner={detail.viewerIsOwner}
              hideOpenLink
              variant="inline"
              inlineSkip={{ byline: true, tags: true, contributors: true }}
              inlineParts={{ blocks: true, comments: false }}
              commentsSlot={<></>}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidencePanel({
  items,
  rowId,
}: {
  items: OrgAttachEvidence[];
  rowId: string;
}) {
  return (
    <section
      id={`tdh-milestone-tag-evidence-${rowId}`}
      className="tdh-milestone-tag-evidence-panel"
      aria-label="Bằng chứng đính kèm"
    >
      <p className="tdh-milestone-tag-evidence-panel-lead">
        Học viên đã gửi {items.length.toLocaleString("vi-VN")} mục bằng chứng — xem
        trước khi duyệt tag.
      </p>
      <ul className="tdh-milestone-tag-evidence-list">
        {items.map((ev, i) => (
          <EvidenceItem key={`${rowId}-ev-${i}`} item={ev} />
        ))}
      </ul>
    </section>
  );
}

function EvidenceItem({ item }: { item: OrgAttachEvidence }) {
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
