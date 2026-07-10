"use client";

import { ExternalLink, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  adminPromoteDongGop,
  adminRejectDongGop,
  adminRequestDongGopEdit,
} from "@/app/admin/dong-gop/actions";
import { buildContentPreview } from "@/lib/admin/article-preview";
import type { AdminDongGopRow } from "@/lib/article/dong-gop/types";
import {
  TRANG_THAI_DONG_GOP_LABEL,
  TRANG_THAI_DONG_GOP_ORDER,
  type TrangThaiDongGop,
} from "@/lib/article/dong-gop/types";

type Props = { items: AdminDongGopRow[] };

type Filter = TrangThaiDongGop | "tat_ca";

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

function contributorLabel(row: AdminDongGopRow): string {
  if (!row.contributor) return "Người dùng";
  const name = row.contributor.tenHienThi?.trim();
  const slug = row.contributor.slug?.trim();
  if (name && slug) return `${name} (@${slug})`;
  return name || (slug ? `@${slug}` : "Người dùng");
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
    <div
      className="dgop-preview-body nghe-lead-panel entity-lead-panel article-rich-content"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}

export function AdminDongGopScreen({ items }: Props) {
  const [rows, setRows] = useState<AdminDongGopRow[]>(items);
  const [filter, setFilter] = useState<Filter>("cho_duyet");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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

  function patchRow(id: string, patch: Partial<AdminDongGopRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function runAction(
    row: AdminDongGopRow,
    action: () => Promise<{ ok: true } | { ok: false; message: string }>,
    onSuccess: Partial<AdminDongGopRow>,
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
    });
  }

  function promote(row: AdminDongGopRow) {
    if (!window.confirm(`Duyệt bản của ${contributorLabel(row)} làm nội dung chính?`)) {
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

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Đóng góp nội dung</h1>
        <p className="page-subtitle">
          Thẩm định bản thảo cộng đồng cho trang entity — promote thành nội dung
          chính hoặc phản hồi contributor.
        </p>
      </header>

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

      {msg ? <p className="dgop-admin-msg">{msg}</p> : null}

      {visible.length === 0 ? (
        <div className="dgop-admin-empty">
          <FileText size={28} strokeWidth={1.6} aria-hidden />
          <p>Chưa có bản đóng góp nào ở mục này.</p>
        </div>
      ) : (
        <ul className="dgop-admin-list">
          {visible.map((row) => {
            const preview = buildContentPreview({ noi_dung: row.noiDung });
            const isExpanded = expandedId === row.id;
            const isPending = pendingId === row.id;
            const canReview = row.trangThai === "cho_duyet";

            return (
              <li
                key={row.id}
                className={`dgop-admin-card status-${row.trangThai}`}
              >
                <div className="dgop-admin-card-top">
                  <span className={`dgop-status-badge status-${row.trangThai}`}>
                    {TRANG_THAI_DONG_GOP_LABEL[row.trangThai]}
                  </span>
                  <Link href={row.entity.href} className="dgop-entity-link">
                    {row.entity.tieuDe}
                    <ExternalLink size={14} aria-hidden />
                  </Link>
                  <span className="dgop-admin-who">{contributorLabel(row)}</span>
                  <span className="dgop-admin-time">{fmtDate(row.capNhatLuc)}</span>
                </div>

                {preview.preview ? (
                  <p className="dgop-admin-excerpt">{preview.preview}</p>
                ) : null}

                {row.ghiChuDuyet ? (
                  <p className="dgop-admin-feedback">
                    <strong>Phản hồi curator:</strong> {row.ghiChuDuyet}
                  </p>
                ) : null}

                <div className="dgop-admin-actions-row">
                  <button
                    type="button"
                    className="admin-btn ghost"
                    onClick={() => setExpandedId(isExpanded ? null : row.id)}
                  >
                    {isExpanded ? "Thu gọn" : "So sánh nội dung"}
                  </button>
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
                        html={row.noiDung}
                        emptyLabel="Bản thảo trống."
                      />
                    </div>
                  </div>
                ) : null}

                {canReview ? (
                  <div className="dgop-review-box">
                    <label className="dgop-note-label" htmlFor={`note-${row.id}`}>
                      Ghi chú cho contributor (bắt buộc khi từ chối / yêu cầu sửa)
                    </label>
                    <textarea
                      id={`note-${row.id}`}
                      className="dgop-note-input"
                      rows={3}
                      value={notes[row.id] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                      placeholder="Góp ý cụ thể để contributor cải thiện bản viết…"
                    />
                    <div className="dgop-review-actions">
                      <button
                        type="button"
                        className="admin-btn primary"
                        disabled={isPending}
                        onClick={() => promote(row)}
                      >
                        {isPending ? (
                          <Loader2 size={16} className="spin" aria-hidden />
                        ) : null}
                        Duyệt → bài chính
                      </button>
                      <button
                        type="button"
                        className="admin-btn ghost"
                        disabled={isPending}
                        onClick={() => requestEdit(row)}
                      >
                        Yêu cầu sửa
                      </button>
                      <button
                        type="button"
                        className="admin-btn ghost danger"
                        disabled={isPending}
                        onClick={() => reject(row)}
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
