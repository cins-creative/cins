"use client";

import {
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquareWarning,
  PencilLine,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  adminPromoteDongGop,
  adminRejectDongGop,
  adminRequestDongGopEdit,
} from "@/app/admin/bai-viet/dong-gop-actions";
import { ArticleDongGopLeadMirror } from "@/components/article/draft/ArticleDongGopLeadMirror";
import type { AdminDongGopRow } from "@/lib/article/dong-gop/types";
import {
  TRANG_THAI_DONG_GOP_LABEL,
  TRANG_THAI_DONG_GOP_ORDER,
  type TrangThaiDongGop,
} from "@/lib/article/dong-gop/types";
import { getNameInitials } from "@/lib/journey/profile";

type Props = {
  items: AdminDongGopRow[];
  /** Chỉ hiện đóng góp của 1 bài (panel từ bảng bài viết). */
  focusBaiVietId?: string;
  /** Render trong slide-over — bỏ padding page-body thừa. */
  embedded?: boolean;
};

type Filter = TrangThaiDongGop | "tat_ca";

type BaiGroup = {
  idBaiViet: string;
  tieuDe: string;
  href: string;
  loai: string;
  items: AdminDongGopRow[];
};

const LOAI_LABEL: Record<string, string> = {
  keyword: "Khái niệm",
  nghe: "Nghề",
  nganh: "Ngành",
  nganh_dao_tao: "Ngành",
  mon_hoc: "Môn học",
  phan_mem: "Phần mềm",
  blog: "Blog",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function contributorName(row: AdminDongGopRow): string {
  if (!row.contributor) return "Người dùng";
  return (
    row.contributor.tenHienThi?.trim() ||
    (row.contributor.slug ? `@${row.contributor.slug}` : "Người dùng")
  );
}

function loaiLabel(loai: string): string {
  return LOAI_LABEL[loai] ?? loai;
}

function ContentPreview({
  html,
  emptyLabel,
}: {
  html: string | null;
  emptyLabel: string;
}) {
  const body = (html ?? "").trim();
  if (!body) {
    return <p className="dgop-preview-empty">{emptyLabel}</p>;
  }

  return (
    <div className="dgop-preview-scroll">
      <ArticleDongGopLeadMirror className="dgop-preview-lead-mirror">
        <div
          className="nghe-lead-rich article-rich-content article-content-html"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </ArticleDongGopLeadMirror>
    </div>
  );
}

export function AdminDongGopScreen({
  items,
  focusBaiVietId,
  embedded = false,
}: Props) {
  const router = useRouter();
  const scopedItems = useMemo(
    () =>
      focusBaiVietId
        ? items.filter((r) => r.idBaiViet === focusBaiVietId)
        : items,
    [items, focusBaiVietId],
  );
  const [rows, setRows] = useState<AdminDongGopRow[]>(scopedItems);
  const [filter, setFilter] = useState<Filter>("cho_duyet");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setRows(scopedItems);
  }, [scopedItems]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      tat_ca: rows.length,
      nhap: 0,
      cho_duyet: 0,
      duoc_duyet: 0,
      tu_choi: 0,
      can_sua: 0,
    };
    for (const r of rows) c[r.trangThai] += 1;
    return c;
  }, [rows]);

  const visible = useMemo(
    () => (filter === "tat_ca" ? rows : rows.filter((r) => r.trangThai === filter)),
    [rows, filter],
  );

  const groups = useMemo(() => {
    if (focusBaiVietId) {
      return null;
    }
    const map = new Map<string, BaiGroup>();
    for (const row of visible) {
      const existing = map.get(row.idBaiViet);
      if (existing) {
        existing.items.push(row);
        continue;
      }
      map.set(row.idBaiViet, {
        idBaiViet: row.idBaiViet,
        tieuDe: row.entity.tieuDe,
        href: row.entity.href,
        loai: row.entity.loaiBaiViet,
        items: [row],
      });
    }
    return [...map.values()];
  }, [visible, focusBaiVietId]);

  function patchRow(id: string, patch: Partial<AdminDongGopRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function runAction(
    row: AdminDongGopRow,
    action: () => Promise<{ ok: true } | { ok: false; message: string }>,
    onSuccess: Partial<AdminDongGopRow>,
    options?: { refresh?: boolean; successMessage?: string },
  ) {
    setMsg(null);
    setPendingId(row.id);
    startTransition(async () => {
      const res = await action();
      setPendingId(null);
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      patchRow(row.id, onSuccess);
      if (options?.refresh) {
        router.refresh();
      }
      if (options?.successMessage) {
        setMsg(options.successMessage);
      }
    });
  }

  function promote(row: AdminDongGopRow) {
    if (
      !window.confirm(
        `Duyệt bản của ${contributorName(row)} làm nội dung chính cho «${row.entity.tieuDe}»?`,
      )
    ) {
      return;
    }
    runAction(
      row,
      () => adminPromoteDongGop({ id: row.id }),
      {
        trangThai: "duoc_duyet",
        entity: {
          ...row.entity,
          noiDungChinh: row.noiDung,
        },
      },
      {
        refresh: true,
        successMessage:
          "Đã promote bản lên nội dung chính. Xem tab Nội dung tại trang entity.",
      },
    );
  }

  function reject(row: AdminDongGopRow) {
    const ghiChu = (notes[row.id] ?? "").trim();
    if (!ghiChu) {
      setMsg("Cần ghi chú khi từ chối.");
      return;
    }
    runAction(
      row,
      () => adminRejectDongGop({ id: row.id, ghiChu }),
      { trangThai: "tu_choi", ghiChuDuyet: ghiChu },
    );
  }

  function requestEdit(row: AdminDongGopRow) {
    const ghiChu = (notes[row.id] ?? "").trim();
    if (!ghiChu) {
      setMsg("Cần ghi chú phản hồi.");
      return;
    }
    runAction(
      row,
      () => adminRequestDongGopEdit({ id: row.id, ghiChu }),
      { trangThai: "can_sua", ghiChuDuyet: ghiChu },
    );
  }

  function renderDongGopCard(row: AdminDongGopRow) {
    const isExpanded = expandedId === row.id;
    const isPending = pendingId === row.id;
    const canReview = row.trangThai === "cho_duyet";
    const name = contributorName(row);
    const initials = getNameInitials(
      row.contributor?.tenHienThi,
      row.contributor?.slug ?? "",
    );

    return (
      <li
        key={row.id}
        className={`dgop-admin-card status-${row.trangThai}${isExpanded ? " is-expanded" : ""}`}
      >
                <div className="dgop-admin-card-main">
                  <div
                    className={`dgop-admin-thumb${row.thumbnailUrl ? "" : " is-empty"}`}
                  >
                    {row.thumbnailUrl ? (
                      <Image
                        src={row.thumbnailUrl}
                        alt=""
                        fill
                        sizes="160px"
                        unoptimized
                      />
                    ) : (
                      <span className="dgop-admin-thumb-fallback" aria-hidden>
                        {loaiLabel(row.entity.loaiBaiViet).charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="dgop-admin-card-body">
                    <div className="dgop-admin-card-head">
                      <div className="dgop-admin-card-titles">
                        <p className="dgop-admin-topic-title">
                          {row.heroTitle || row.entity.tieuDe}
                        </p>
                        <p className="dgop-admin-meta">
                          <Link href={row.entity.href} className="dgop-entity-link">
                            {row.entity.tieuDe}
                            <ExternalLink size={12} aria-hidden />
                          </Link>
                          <span className="dgop-loai-chip">
                            {loaiLabel(row.entity.loaiBaiViet)}
                          </span>
                          <span className="dgop-admin-who">
                            {row.contributor?.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={row.contributor.avatarUrl}
                                alt=""
                                className="dgop-admin-avatar"
                              />
                            ) : (
                              <span className="dgop-admin-avatar is-fallback">
                                {initials}
                              </span>
                            )}
                            {row.contributor?.slug ? (
                              <Link
                                href={`/${row.contributor.slug}`}
                                className="dgop-admin-who-link"
                              >
                                {name}
                              </Link>
                            ) : (
                              <span>{name}</span>
                            )}
                          </span>
                          <span className="dgop-admin-time">
                            {fmtDate(row.capNhatLuc)}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`dgop-status-badge status-${row.trangThai}`}
                      >
                        {TRANG_THAI_DONG_GOP_LABEL[row.trangThai]}
                      </span>
                    </div>

                    {row.excerpt ? (
                      <p className="dgop-admin-excerpt">{row.excerpt}</p>
                    ) : (
                      <p className="dgop-admin-excerpt is-muted">
                        Chưa có tóm tắt / nội dung xem trước.
                      </p>
                    )}

                    {row.ghiChuDuyet ? (
                      <p className="dgop-admin-feedback">
                        <MessageSquareWarning size={14} aria-hidden />
                        <span>
                          <strong>Phản hồi:</strong> {row.ghiChuDuyet}
                        </span>
                      </p>
                    ) : null}

                    <div className="dgop-admin-toolbar">
                      <button
                        type="button"
                        className={`dgop-tool-btn${isExpanded ? " is-active" : ""}`}
                        onClick={() =>
                          setExpandedId(isExpanded ? null : row.id)
                        }
                        aria-expanded={isExpanded}
                      >
                        <ChevronDown
                          size={15}
                          className="dgop-tool-chevron"
                          aria-hidden
                        />
                        {isExpanded ? "Thu gọn so sánh" : "So sánh nội dung"}
                      </button>

                      {canReview ? (
                        <div className="dgop-admin-toolbar-actions">
                          <button
                            type="button"
                            className="dgop-tool-btn dgop-tool-btn--approve"
                            disabled={isPending}
                            onClick={() => promote(row)}
                          >
                            {isPending ? (
                              <Loader2
                                size={15}
                                className="dgop-spin"
                                aria-hidden
                              />
                            ) : (
                              <Check size={15} aria-hidden />
                            )}
                            Duyệt
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="dgop-compare-grid">
                    <div className="dgop-compare-col">
                      <h3>Bài chính hiện tại</h3>
                      <ContentPreview
                        html={row.entity.noiDungChinh}
                        emptyLabel="Chưa có nội dung chính."
                      />
                    </div>
                    <div className="dgop-compare-col">
                      <h3>Bản đề xuất</h3>
                      <ContentPreview
                        html={row.bodyHtml}
                        emptyLabel="Bản thảo trống hoặc chỉ còn khung gợi ý."
                      />
                    </div>
                  </div>
                ) : null}

                {canReview ? (
                  <div className="dgop-review-box">
                    <label
                      className="dgop-note-label"
                      htmlFor={`note-${row.id}`}
                    >
                      Ghi chú cho contributor
                      <span> — bắt buộc khi gửi yêu cầu sửa / từ chối</span>
                    </label>
                    <div className="dgop-review-compose">
                      <textarea
                        id={`note-${row.id}`}
                        className="dgop-note-input"
                        rows={2}
                        value={notes[row.id] ?? ""}
                        onChange={(e) =>
                          setNotes((prev) => ({
                            ...prev,
                            [row.id]: e.target.value,
                          }))
                        }
                        placeholder="Góp ý cụ thể để contributor cải thiện bản viết…"
                      />
                      <div className="dgop-review-send-actions">
                        <button
                          type="button"
                          className="dgop-tool-btn dgop-tool-btn--send"
                          disabled={isPending || !(notes[row.id] ?? "").trim()}
                          onClick={() => requestEdit(row)}
                        >
                          {isPending ? (
                            <Loader2
                              size={15}
                              className="dgop-spin"
                              aria-hidden
                            />
                          ) : (
                            <PencilLine size={15} aria-hidden />
                          )}
                          Gửi yêu cầu sửa
                        </button>
                        <button
                          type="button"
                          className="dgop-tool-btn dgop-tool-btn--reject"
                          disabled={isPending || !(notes[row.id] ?? "").trim()}
                          onClick={() => reject(row)}
                        >
                          <X size={15} aria-hidden />
                          Từ chối
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </li>
            );
  }

  return (
    <div
      className={`admin-bai-viet-dong-gop${embedded ? " is-embedded" : " page-body"}`}
    >
      <div className="dgop-filters">
        {(["tat_ca", ...TRANG_THAI_DONG_GOP_ORDER] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`dgop-filter${filter === f ? " is-active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "tat_ca" ? "Tất cả" : TRANG_THAI_DONG_GOP_LABEL[f]}
            <span className="dgop-filter-count">{counts[f]}</span>
          </button>
        ))}
      </div>

      {msg ? (
        <p
          className={`dgop-admin-msg${msg.includes("Đã promote") ? " is-success" : ""}`}
        >
          {msg}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="dgop-admin-empty">
          <FileText size={28} strokeWidth={1.6} aria-hidden />
          <p>Chưa có bản đóng góp nào ở mục này.</p>
        </div>
      ) : groups ? (
        <div className="dgop-admin-groups">
          {groups.map((group) => (
            <section key={group.idBaiViet} className="dgop-admin-group">
              <header className="dgop-admin-group-head">
                <div>
                  <h3 className="dgop-admin-group-title">{group.tieuDe}</h3>
                  <p className="dgop-admin-group-meta">
                    <span className="dgop-loai-chip">{loaiLabel(group.loai)}</span>
                    <Link href={group.href} className="dgop-entity-link">
                      Xem trang
                      <ExternalLink size={12} aria-hidden />
                    </Link>
                  </p>
                </div>
                <span className="dgop-admin-group-count">
                  {group.items.length} bản
                </span>
              </header>
              <ul className="dgop-admin-list">
                {group.items.map((row) => renderDongGopCard(row))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="dgop-admin-list">
          {visible.map((row) => renderDongGopCard(row))}
        </ul>
      )}
    </div>
  );
}
