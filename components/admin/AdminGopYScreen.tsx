"use client";

import { ExternalLink, Loader2, MessageSquare } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { adminUpdateGopYStatus } from "@/app/admin/gop-y/actions";
import {
  GOP_Y_TRANG_THAI_LABEL,
  GOP_Y_TRANG_THAI_ORDER,
  type GopYItem,
  type GopYTrangThai,
} from "@/lib/gop-y/types";

type Props = { items: GopYItem[] };

type Filter = GopYTrangThai | "tat_ca";

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

const NEXT_ACTIONS: Array<{ value: GopYTrangThai; label: string; kind: string }> = [
  { value: "dang_xu_ly", label: "Đang xử lý", kind: "ghost" },
  { value: "da_xu_ly", label: "Đã xử lý", kind: "primary" },
  { value: "bo_qua", label: "Bỏ qua", kind: "ghost" },
  { value: "moi", label: "Mở lại", kind: "ghost" },
];

export function AdminGopYScreen({ items }: Props) {
  const [rows, setRows] = useState<GopYItem[]>(items);
  const [filter, setFilter] = useState<Filter>("tat_ca");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      tat_ca: rows.length,
      moi: 0,
      dang_xu_ly: 0,
      da_xu_ly: 0,
      bo_qua: 0,
    };
    for (const r of rows) c[r.trangThai] += 1;
    return c;
  }, [rows]);

  const visible = useMemo(
    () => (filter === "tat_ca" ? rows : rows.filter((r) => r.trangThai === filter)),
    [rows, filter],
  );

  function updateStatus(item: GopYItem, trangThai: GopYTrangThai) {
    setMsg(null);
    setPendingId(item.id);
    const ghiChu = notes[item.id] ?? item.ghiChu ?? "";
    startTransition(async () => {
      const res = await adminUpdateGopYStatus({ id: item.id, trangThai, ghiChu });
      setPendingId(null);
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === item.id
            ? { ...r, trangThai, ghiChu: ghiChu.trim() || null }
            : r,
        ),
      );
    });
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Góp ý người dùng</h1>
        <p className="page-subtitle">
          Phản hồi gửi từ nút “Góp ý” trên toàn site, kèm trang mà người dùng
          đang xem lúc gửi.
        </p>
      </header>

      <div className="gopy-filters">
        {(["tat_ca", ...GOP_Y_TRANG_THAI_ORDER] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`gopy-filter${filter === f ? " is-active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "tat_ca" ? "Tất cả" : GOP_Y_TRANG_THAI_LABEL[f]}
            <span className="gopy-filter-count">{counts[f]}</span>
          </button>
        ))}
      </div>

      {msg ? <p className="gopy-admin-msg">{msg}</p> : null}

      {visible.length === 0 ? (
        <div className="gopy-admin-empty">
          <MessageSquare size={28} strokeWidth={1.6} aria-hidden />
          <p>Chưa có góp ý nào ở mục này.</p>
        </div>
      ) : (
        <ul className="gopy-admin-list">
          {visible.map((item) => (
            <li key={item.id} className={`gopy-admin-card status-${item.trangThai}`}>
              <div className="gopy-admin-card-top">
                <span className={`gopy-status-badge status-${item.trangThai}`}>
                  {GOP_Y_TRANG_THAI_LABEL[item.trangThai]}
                </span>
                <span className="gopy-admin-who">
                  {item.nguoiGui
                    ? `${item.nguoiGui.tenHienThi} (@${item.nguoiGui.slug})`
                    : item.hoTen || "Khách ẩn danh"}
                  {item.email ? ` · ${item.email}` : ""}
                </span>
                <span className="gopy-admin-time">{fmtDate(item.taoLuc)}</span>
              </div>

              <p className="gopy-admin-noidung">{item.noiDung}</p>

              {item.trangUrl ? (
                <a
                  href={item.trangUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gopy-admin-page-link"
                >
                  <ExternalLink size={13} strokeWidth={2.2} aria-hidden />
                  {item.trangUrl}
                </a>
              ) : null}

              <div className="gopy-admin-manage">
                <input
                  type="text"
                  className="gopy-admin-note"
                  placeholder="Ghi chú xử lý (nội bộ)…"
                  value={notes[item.id] ?? item.ghiChu ?? ""}
                  onChange={(e) =>
                    setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                />
                <div className="gopy-admin-actions">
                  {NEXT_ACTIONS.filter((a) => a.value !== item.trangThai).map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      className={`gopy-admin-btn gopy-admin-btn-${a.kind}`}
                      disabled={pendingId === item.id}
                      onClick={() => updateStatus(item, a.value)}
                    >
                      {pendingId === item.id ? (
                        <Loader2 size={13} className="gopy-spin" aria-hidden />
                      ) : null}
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
