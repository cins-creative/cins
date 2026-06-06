"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import type { CongDongFilter } from "@/lib/cong-dong/types";

const PRESET_COLORS = [
  "#1F74C9",
  "#E85D4A",
  "#2E9B6A",
  "#F5A623",
  "#7B61FF",
  "#00A3BF",
];

type Props = {
  orgId: string;
  filters: CongDongFilter[];
  onChange: (filters: CongDongFilter[]) => void;
};

export function CongDongFilterAdmin({ orgId, filters, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [ten, setTen] = useState("");
  const [mau, setMau] = useState(PRESET_COLORS[0]!);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const res = await fetch(`/api/cong-dong/${orgId}/filters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten, mau, thu_tu: filters.length }),
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
      setTen("");
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
    <section className="cd-filter-admin">
      <button
        type="button"
        className="cd-filter-admin-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Quản lý nhãn ({filters.length})
      </button>

      {open ? (
        <div className="cd-filter-admin-panel">
          <p className="cd-filter-admin-hint">
            Admin định nghĩa bộ nhãn — thành viên chọn khi đăng, mọi người lọc trên
            cùng một feed.
          </p>

          {filters.length > 0 ? (
            <ul className="cd-filter-admin-list">
              {filters.map((filter) => (
                <li key={filter.id}>
                  <span
                    className="cd-filter-chip cd-filter-chip--static"
                    style={{
                      borderColor: filter.mau,
                      color: filter.mau,
                      backgroundColor: `${filter.mau}18`,
                    }}
                  >
                    {filter.ten}
                  </span>
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

          <form className="cd-filter-admin-form" onSubmit={onCreate}>
            <input
              value={ten}
              onChange={(e) => setTen(e.target.value)}
              placeholder="Tên nhãn (vd: Hỏi đáp)"
              maxLength={40}
              required
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
            <button type="submit" disabled={pending || !ten.trim()}>
              <Plus size={16} aria-hidden />
              Thêm nhãn
            </button>
          </form>
          {err ? <p className="cd-filter-admin-err">{err}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
