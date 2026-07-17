"use client";

import {
  BadgeCheck,
  Check,
  ExternalLink,
  Loader2,
  Paperclip,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { PendingContentVerifyItem } from "@/lib/admin/pending-content-verify-types";

type Props = {
  items: PendingContentVerifyItem[];
  total: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onResolved: (requestId: string) => void;
};

function fmtDate(iso: string): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "Không rõ thời gian";
  return value.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function milestoneKindLabel(kind: string): string {
  if (kind === "du_an") return "Dự án";
  if (kind === "hoc") return "Học tập";
  if (kind === "lam_viec") return "Công việc";
  if (kind === "thanh_tuu") return "Thành tựu";
  return "Cột mốc";
}

export function AdminPendingContentVerifyQueue({
  items,
  total,
  loading,
  error,
  onRetry,
  onResolved,
}: Props) {
  const [query, setQuery] = useState("");
  const [orgId, setOrgId] = useState("all");
  const [respondingIds, setRespondingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const orgOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const item of items) byId.set(item.orgId, item.orgTen);
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1], "vi"));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return items.filter((item) => {
      if (orgId !== "all" && item.orgId !== orgId) return false;
      if (!normalized) return true;
      return [
        item.projectTitle,
        item.milestoneTitle,
        item.studentName,
        item.studentSlug,
        item.orgTen,
        item.nganhLabel,
        item.monHocLabel,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase("vi").includes(normalized),
        );
    });
  }, [items, orgId, query]);

  async function respond(
    item: PendingContentVerifyItem,
    action: "approve" | "reject",
  ) {
    if (respondingIds.has(item.requestId)) return;
    if (
      action === "reject" &&
      !window.confirm(
        `Từ chối yêu cầu của ${item.studentName} cho ${item.orgTen}?`,
      )
    ) {
      return;
    }

    setMessage(null);
    setRespondingIds((current) => new Set(current).add(item.requestId));
    try {
      const response = await fetch(
        `/api/admin/content-verifications/${encodeURIComponent(item.requestId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, orgId: item.orgId }),
        },
      );
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Không xử lý được yêu cầu.");
      }

      onResolved(item.requestId);
      setMessage({
        tone: "success",
        text:
          action === "approve"
            ? `Đã xác thực “${item.projectTitle}”.`
            : `Đã từ chối “${item.projectTitle}”.`,
      });
    } catch (cause) {
      setMessage({
        tone: "error",
        text:
          cause instanceof Error
            ? cause.message
            : "Không xử lý được yêu cầu.",
      });
    } finally {
      setRespondingIds((current) => {
        const next = new Set(current);
        next.delete(item.requestId);
        return next;
      });
    }
  }

  return (
    <section className="ndd-review" aria-labelledby="ndd-review-title">
      <div className="ndd-review-overview">
        <div className="ndd-review-overview-icon" aria-hidden>
          <BadgeCheck size={22} />
        </div>
        <div className="ndd-review-overview-copy">
          <h2 id="ndd-review-title">Hàng đợi xác thực nội dung</h2>
          <p>
            Kiểm tra bài đăng, tổ chức và bằng chứng trước khi xác thực quan hệ.
          </p>
        </div>
        <div className="ndd-review-count" aria-label={`${total} yêu cầu chờ xử lý`}>
          <strong>{total}</strong>
          <span>Chờ xử lý</span>
        </div>
        <button
          type="button"
          className="ndd-review-refresh"
          onClick={onRetry}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? "bc-spin" : undefined}
            aria-hidden
          />
          Làm mới
        </button>
      </div>

      <div className="ndd-review-toolbar">
        <label className="ndd-review-search">
          <Search size={17} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm nội dung, người gửi hoặc tổ chức…"
          />
        </label>
        <label className="ndd-review-org-filter">
          <span>Tổ chức</span>
          <select value={orgId} onChange={(event) => setOrgId(event.target.value)}>
            <option value="all">Tất cả tổ chức</option>
            {orgOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {!loading && items.length > 0 ? (
          <span className="ndd-review-filter-count">
            Hiển thị {filteredItems.length}/{items.length}
          </span>
        ) : null}
      </div>

      {message ? (
        <p
          className={`ndd-review-message is-${message.tone}`}
          role={message.tone === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}
      {error ? (
        <div className="ndd-review-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>
            Thử lại
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="ndd-review-loading">
          <Loader2 className="bc-spin" size={20} />
          Đang tải hàng đợi…
        </div>
      ) : items.length === 0 ? (
        <div className="ndd-review-empty">
          <BadgeCheck size={30} aria-hidden />
          <strong>Đã xử lý hết yêu cầu</strong>
          <span>Hiện không có nội dung nào chờ xác thực.</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="ndd-review-empty is-filtered">
          <Search size={26} aria-hidden />
          <strong>Không tìm thấy yêu cầu phù hợp</strong>
          <span>Thử đổi từ khóa hoặc chọn tổ chức khác.</span>
        </div>
      ) : (
        <div className="ndd-review-list">
          {filteredItems.map((item) => {
            const responding = respondingIds.has(item.requestId);
            const details = [
              milestoneKindLabel(item.milestoneKind),
              item.nam ? `Năm ${item.nam}` : null,
              item.nganhLabel,
              item.monHocLabel,
            ].filter(Boolean);

            return (
              <article className="ndd-review-card" key={item.requestId}>
                <div className="ndd-review-card-media">
                  {item.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbUrl} alt="" loading="lazy" />
                  ) : (
                    <span aria-hidden>
                      {item.projectTitle.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="ndd-review-card-main">
                  <div className="ndd-review-card-top">
                    <div>
                      <h3>{item.projectTitle}</h3>
                      {item.milestoneTitle !== item.projectTitle ? (
                        <p>{item.milestoneTitle}</p>
                      ) : null}
                    </div>
                    <time dateTime={item.submittedAt}>
                      {fmtDate(item.submittedAt)}
                    </time>
                  </div>

                  <div className="ndd-review-people">
                    <span className="ndd-review-person">
                      <span className="ndd-review-avatar" aria-hidden>
                        {item.studentAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.studentAvatarUrl} alt="" />
                        ) : (
                          item.studentName.slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <span>
                        <small>Người gửi</small>
                        {item.studentSlug ? (
                          <Link
                            href={`/${encodeURIComponent(item.studentSlug)}`}
                            target="_blank"
                          >
                            {item.studentName || item.studentSlug}
                          </Link>
                        ) : (
                          <strong>{item.studentName}</strong>
                        )}
                      </span>
                    </span>
                    <span className="ndd-review-arrow" aria-hidden>
                      →
                    </span>
                    <span className="ndd-review-person">
                      <span className="ndd-review-org-mark" aria-hidden>
                        {item.orgTen.slice(0, 1).toUpperCase()}
                      </span>
                      <span>
                        <small>Tổ chức xác thực</small>
                        {item.orgUrl ? (
                          <Link href={item.orgUrl} target="_blank">
                            {item.orgTen}
                          </Link>
                        ) : (
                          <strong>{item.orgTen}</strong>
                        )}
                      </span>
                    </span>
                  </div>

                  <ul className="ndd-review-meta" aria-label="Thông tin cột mốc">
                    {details.map((detail) => (
                      <li key={String(detail)}>{detail}</li>
                    ))}
                  </ul>

                  <div className="ndd-review-evidence">
                    <span className="ndd-review-evidence-label">
                      <Paperclip size={14} aria-hidden />
                      {item.evidence.length} bằng chứng
                    </span>
                    {item.evidence.slice(0, 2).map((evidence, index) =>
                      evidence.href ? (
                        <a
                          key={`${item.requestId}-evidence-${index}`}
                          href={evidence.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {evidence.label}
                          <ExternalLink size={11} aria-hidden />
                        </a>
                      ) : (
                        <span key={`${item.requestId}-evidence-${index}`}>
                          {evidence.label}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                <div className="ndd-review-card-actions">
                  <div className="ndd-review-open-links">
                    {item.postUrl ? (
                      <Link href={item.postUrl} target="_blank">
                        Xem bài
                        <ExternalLink size={13} aria-hidden />
                      </Link>
                    ) : null}
                    {item.orgUrl ? (
                      <Link href={item.orgUrl} target="_blank">
                        Xem tổ chức
                        <ExternalLink size={13} aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                  <div className="ndd-review-decisions">
                    <button
                      type="button"
                      className="is-reject"
                      disabled={responding}
                      onClick={() => void respond(item, "reject")}
                    >
                      <X size={16} aria-hidden />
                      Từ chối
                    </button>
                    <button
                      type="button"
                      className="is-approve"
                      disabled={responding}
                      onClick={() => void respond(item, "approve")}
                    >
                      {responding ? (
                        <Loader2 size={16} className="bc-spin" aria-hidden />
                      ) : (
                        <Check size={16} aria-hidden />
                      )}
                      {responding ? "Đang xử lý…" : "Xác thực"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
