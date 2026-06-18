"use client";

import Link from "next/link";
import { CheckCircle2, ChevronLeft, Clock3, Link2Off, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { JourneyPostBody } from "@/components/journey/JourneyPostBody";
import { MembershipMilestoneNotifyPanel } from "@/components/truong/MembershipMilestoneNotifyPanel";
import { MilestoneTagOrgMessagePanel } from "@/components/truong/MilestoneTagOrgMessagePanel";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type { MilestonePostDetail } from "@/lib/journey/milestone-post-types";
import { milestoneContentKind } from "@/lib/journey/post-media";
import type { OrgMembershipMilestoneRequestItem } from "@/lib/journey/membership-milestone-types";
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
/* CSS block bài viết — trang trường không load qua layout parent. */
import "@/app/[slug]/p/new/editor.css";
import "@/app/[slug]/p/[postSlug]/post-page.css";

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
type NotifySection = "verify" | "tag";

export function TruongMilestoneTagNotify() {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<NotifySection>("verify");
  const [verifyPendingCount, setVerifyPendingCount] = useState(0);
  const [items, setItems] = useState<OrgMilestoneTagRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const loadItems = useCallback(async (options?: { silent?: boolean }) => {
    if (!ctx?.orgId) return;
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const res = await fetch(`/api/org/${ctx.orgId}/milestone-tag-requests`, {
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

  const syncVerifyPendingCount = useCallback(async () => {
    if (!ctx?.orgId) return;
    try {
      const res = await fetch(
        `/api/org/${ctx.orgId}/membership-milestone-requests`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as {
        items?: OrgMembershipMilestoneRequestItem[];
      };
      if (res.ok && Array.isArray(json.items)) {
        setVerifyPendingCount(
          json.items.filter((item) => item.status === "pending").length,
        );
      }
    } catch {
      /* badge — bỏ qua lỗi mạng */
    }
  }, [ctx?.orgId]);

  useEffect(() => {
    if (!ctx?.canEdit || !ctx.isEditing || !ctx.orgId) return;
    void syncVerifyPendingCount();
    const refresh = () => {
      void loadItems({ silent: true });
      void syncVerifyPendingCount();
    };
    const intervalId = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
    };
  }, [ctx?.canEdit, ctx?.isEditing, ctx?.orgId, loadItems, syncVerifyPendingCount]);

  const tagPendingCount = useMemo(
    () => items.filter((i) => i.status === "pending").length,
    [items],
  );

  const totalPendingCount = verifyPendingCount + tagPendingCount;

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

  async function respondRequest(
    id: string,
    action: "approve" | "reject" | "detach",
  ) {
    if (!ctx?.orgId) return;
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
      const nextStatus: OrgMilestoneTagStatus =
        action === "approve"
          ? "approved"
          : action === "detach"
            ? "detached"
            : "rejected";
      setItems((list) =>
        list.map((row) => (row.id === id ? { ...row, status: nextStatus } : row)),
      );
      ctx.showToast(
        action === "approve"
          ? "Đã gắn milestone lên trang tổ chức"
          : action === "detach"
            ? "Đã gỡ khỏi trang trường"
            : "Đã từ chối tag",
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
        className="ss-btn ss-btn-notify"
        onClick={() => {
          setSection(
            verifyPendingCount > 0
              ? "verify"
              : tagPendingCount > 0
                ? "tag"
                : "verify",
          );
          setOpen(true);
        }}
        aria-label={
          totalPendingCount > 0
            ? `Thông báo — ${totalPendingCount} chờ duyệt`
            : "Thông báo"
        }
        title="Xác thực cột mốc và tag đồ án từ học viên"
      >
        <BellIcon />
        <span className="ss-btn-notify-label">Thông báo</span>
        {totalPendingCount > 0 ? (
          <span className="ss-btn-notify-badge" aria-hidden>
            {totalPendingCount > 9 ? "9+" : totalPendingCount}
          </span>
        ) : null}
      </button>

      <TruongInlineModal
        open={open}
        onClose={() => setOpen(false)}
        className="tdh-inline-modal--wide tdh-milestone-tag-modal tdh-org-notify-modal"
        labelledBy="tdh-org-notify-title"
      >
        <div className="tdh-milestone-tag-hdr">
          <div>
            <h3 id="tdh-org-notify-title" className="tdh-inline-modal-title">
              Thông báo
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
          className="tdh-org-notify-sections"
          role="tablist"
          aria-label="Loại thông báo"
        >
          <button
            type="button"
            role="tab"
            aria-selected={section === "verify"}
            className={`tdh-org-notify-section${section === "verify" ? " on" : ""}`}
            onClick={() => setSection("verify")}
          >
            Xác thực
            {verifyPendingCount > 0 ? (
              <span className="tdh-org-notify-section-count">{verifyPendingCount}</span>
            ) : null}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={section === "tag"}
            className={`tdh-org-notify-section${section === "tag" ? " on" : ""}`}
            onClick={() => setSection("tag")}
          >
            Tag đồ án
            {tagPendingCount > 0 ? (
              <span className="tdh-org-notify-section-count">{tagPendingCount}</span>
            ) : null}
          </button>
        </div>

        {section === "verify" ? (
          <MembershipMilestoneNotifyPanel
            orgId={ctx.orgId}
            active={open && section === "verify"}
            onPendingCountChange={setVerifyPendingCount}
            onToast={(message) => ctx.showToast(message)}
          />
        ) : (
          <>
        <div
          className="tdh-milestone-tag-filters"
          role="tablist"
          aria-label="Lọc trạng thái tag đồ án"
        >
          {(
            [
              ["all", "Tất cả", items.length],
              ["pending", "Chờ duyệt", tagPendingCount],
              [
                "approved",
                "Đã gắn",
                items.filter((i) => i.status === "approved").length,
              ],
              [
                "rejected",
                "Từ chối",
                items.filter(
                  (i) => i.status === "rejected" || i.status === "detached",
                ).length,
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
                orgId={ctx.orgId}
                showBack={mobileShowDetail}
                onBack={() => setMobileShowDetail(false)}
                onApprove={() => void respondRequest(selectedRow.id, "approve")}
                onReject={() => void respondRequest(selectedRow.id, "reject")}
                onDetach={() => void respondRequest(selectedRow.id, "detach")}
              />
            ) : (
              <p className="tdh-milestone-tag-detail-empty">
                Chọn một yêu cầu để xem chi tiết.
              </p>
            )}
          </div>
        </div>
          </>
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
  const postPath = parsePostHref(row.album.href);

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
      </header>

      <div className="tdh-milestone-tag-detail-scroll">
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

  const contentKind = milestoneContentKind(detail.posts[0]?.noiDungBlocks ?? null);

  return (
    <div
      className="tdh-milestone-tag-post-view j-post-page"
      data-post-content-kind={contentKind}
    >
      <div className="j-post-page-inner">
        <div className="j-post-page-body">
          <JourneyPostBody
            initialDetail={detail}
            postSlug={postSlug}
            isOwner={detail.viewerIsOwner}
            hideOpenLink
            layout="split"
            splitSkip={{ kicker: true }}
            commentsSlot={<></>}
          />
        </div>
      </div>
    </div>
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
