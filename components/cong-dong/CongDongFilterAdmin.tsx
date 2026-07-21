"use client";

import { Plus, Tags, Trash2, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { CongDongFilterChip } from "@/components/cong-dong/CongDongFilterChip";
import {
  CongDongFilterIconGlyph,
  CONG_DONG_FILTER_ICON_IDS,
  type CongDongFilterIconId,
} from "@/components/cong-dong/CongDongFilterIcon";
import type { CongDongFilter } from "@/lib/cong-dong/types";

const PRESET_COLORS = [
  "#1F74C9",
  "#E85D4A",
  "#2E9B6A",
  "#F5A623",
  "#7B61FF",
  "#00A3BF",
];

type PanelProps = {
  orgId: string;
  filters: CongDongFilter[];
  onChange: (filters: CongDongFilter[]) => void;
};

export function CongDongFilterAdminPanel({ orgId, filters, onChange }: PanelProps) {
  const [creating, setCreating] = useState(false);
  const [ten, setTen] = useState("");
  const [mau, setMau] = useState(PRESET_COLORS[0]!);
  const [icon, setIcon] = useState<CongDongFilterIconId>("tag");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetCreateForm() {
    setTen("");
    setMau(PRESET_COLORS[0]!);
    setIcon("tag");
    setErr(null);
  }

  function openCreate() {
    resetCreateForm();
    setCreating(true);
  }

  function cancelCreate() {
    if (pending) return;
    resetCreateForm();
    setCreating(false);
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const res = await fetch(`/api/cong-dong/${orgId}/filters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ten,
          mau,
          icon,
          thu_tu: filters.length,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        filter?: CongDongFilter;
        error?: string;
      } | null;
      if (!res.ok || !json?.filter) {
        setErr(json?.error ?? "Không tạo được nhãn.");
        return;
      }
      onChange([...filters, json.filter].sort((a, b) => a.thuTu - b.thuTu));
      resetCreateForm();
      setCreating(false);
    });
  }

  function onDelete(filter: CongDongFilter) {
    if (!confirm(`Xóa nhãn "${filter.ten}"?`)) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/cong-dong/${orgId}/filters/${filter.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setErr(json?.error ?? "Không xóa được nhãn.");
        return;
      }
      onChange(filters.filter((f) => f.id !== filter.id));
    });
  }

  return (
    <div className="cd-filter-admin-panel">
      <p className="cd-filter-admin-hint">
        Admin định nghĩa bộ nhãn — thành viên chọn khi đăng, mọi người lọc trên
        cùng một feed.
      </p>

      {filters.length > 0 ? (
        <ul className="cd-filter-admin-list">
          {filters.map((filter) => (
            <li key={filter.id}>
              <CongDongFilterChip filter={filter} size="sm" plain />
              <span className="cd-filter-admin-slug">/{filter.slug}</span>
              <button
                type="button"
                className="cd-filter-admin-delete"
                onClick={() => onDelete(filter)}
                disabled={pending}
                aria-label={`Xóa nhãn ${filter.ten}`}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cd-filter-admin-empty">Chưa có nhãn nào.</p>
      )}

      {creating ? (
        <form className="cd-filter-admin-form is-open" onSubmit={onCreate}>
          <input
            value={ten}
            onChange={(e) => setTen(e.target.value)}
            placeholder="Tên nhãn (vd: Hỏi đáp)"
            maxLength={40}
            required
            autoFocus
          />
          <div className="cd-filter-admin-colors" role="group" aria-label="Màu nhãn">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`cd-filter-color-swatch${mau === color ? " is-active" : ""}`}
                style={{ backgroundColor: color }}
                onClick={() => setMau(color)}
                aria-label={`Màu ${color}`}
                aria-pressed={mau === color}
              />
            ))}
          </div>
          <div
            className="cd-filter-admin-icons"
            role="group"
            aria-label="Icon nhãn"
          >
            {CONG_DONG_FILTER_ICON_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={`cd-filter-icon-swatch${icon === id ? " is-active" : ""}`}
                onClick={() => setIcon(id)}
                aria-label={`Icon ${id}`}
                aria-pressed={icon === id}
                title={id}
              >
                <CongDongFilterIconGlyph name={id} size={16} />
              </button>
            ))}
          </div>
          <div className="cd-filter-admin-form-actions">
            <button
              type="button"
              className="cd-filter-admin-cancel"
              onClick={cancelCreate}
              disabled={pending}
            >
              Huỷ
            </button>
            <button type="submit" disabled={pending || !ten.trim()}>
              <Plus size={16} aria-hidden />
              {pending ? "Đang lưu…" : "Lưu nhãn"}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="cd-filter-admin-add"
          onClick={openCreate}
          disabled={pending}
        >
          <Plus size={16} aria-hidden />
          Thêm nhãn
        </button>
      )}
      {err ? <p className="cd-filter-admin-err">{err}</p> : null}
    </div>
  );
}

type ModalProps = PanelProps & {
  open: boolean;
  onClose: () => void;
};

export function CongDongFilterAdminModal({
  open,
  onClose,
  orgId,
  filters,
  onChange,
}: ModalProps) {
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

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="cd-filter-admin-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="cd-filter-admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cd-filter-admin-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cd-filter-admin-modal-head">
          <div className="cd-filter-admin-modal-title-wrap">
            <Tags size={18} strokeWidth={2} aria-hidden />
            <h2 id="cd-filter-admin-title" className="cd-filter-admin-modal-title">
              Quản lý nhãn ({filters.length})
            </h2>
          </div>
          <button
            type="button"
            className="cd-filter-admin-modal-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>
        <CongDongFilterAdminPanel
          orgId={orgId}
          filters={filters}
          onChange={onChange}
        />
      </div>
    </div>,
    document.body,
  );
}
