"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";

import { CongDongFilterIcon } from "@/components/cong-dong/CongDongFilterIcon";
import type { CongDongFilter } from "@/lib/cong-dong/types";

const PRESET_COLORS = [
  "#BB89F8",
  "#1F74C9",
  "#FFB85C",
  "#6EFEC0",
  "#E85D4A",
  "#2E9B6A",
];

type Props = {
  orgId: string;
  slug: string;
  orgTen: string;
  initialFilters: CongDongFilter[];
};

export function CongDongFilterSetupTutorial({
  orgId,
  slug,
  orgTen,
  initialFilters,
}: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTen, setEditTen] = useState("");
  const [editMau, setEditMau] = useState(PRESET_COLORS[0]!);
  const [newTen, setNewTen] = useState("");
  const [newMau, setNewMau] = useState(PRESET_COLORS[1]!);
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const communityHref = `/cong-dong/${slug}`;

  function goToCommunity() {
    router.push(communityHref);
    router.refresh();
  }

  function startEdit(filter: CongDongFilter) {
    setEditingId(filter.id);
    setEditTen(filter.ten);
    setEditMau(filter.mau);
    setErr(null);
  }

  function saveEdit(filterId: string) {
    const ten = editTen.trim();
    if (!ten) return;
    startTransition(async () => {
      const res = await fetch(`/api/cong-dong/${orgId}/filters/${filterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten, mau: editMau }),
      });
      const json = (await res.json().catch(() => null)) as {
        filter?: CongDongFilter;
        error?: string;
      } | null;
      if (!res.ok || !json?.filter) {
        setErr(json?.error ?? "Không lưu được nhãn.");
        return;
      }
      setFilters((prev) =>
        prev.map((f) => (f.id === filterId ? json.filter! : f)),
      );
      setEditingId(null);
    });
  }

  function onDelete(filter: CongDongFilter) {
    if (!confirm(`Xóa nhãn "${filter.ten}"?`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/cong-dong/${orgId}/filters/${filter.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setErr(json?.error ?? "Không xóa được nhãn.");
        return;
      }
      setFilters((prev) => prev.filter((f) => f.id !== filter.id));
      if (editingId === filter.id) setEditingId(null);
    });
  }

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const ten = newTen.trim();
    if (!ten) return;
    startTransition(async () => {
      const res = await fetch(`/api/cong-dong/${orgId}/filters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten, mau: newMau, thu_tu: filters.length }),
      });
      const json = (await res.json().catch(() => null)) as {
        filter?: CongDongFilter;
        error?: string;
      } | null;
      if (!res.ok || !json?.filter) {
        setErr(json?.error ?? "Không thêm được nhãn.");
        return;
      }
      setFilters((prev) => [...prev, json.filter!]);
      setNewTen("");
      setShowAdd(false);
    });
  }

  return (
    <div className="cd-create-shell">
      <header className="cd-create-top">
        <span className="cd-create-logo">
          <span className="cd-create-logo-mark">C</span>
          <span>C.INS</span>
        </span>
        <button
          type="button"
          className="cd-create-back cd-filter-setup-skip"
          onClick={goToCommunity}
        >
          Bỏ qua
        </button>
      </header>

      <main className="cd-create-main cd-filter-setup-main">
        <div className="cd-create-intro">
          <p className="cd-create-eyebrow">{orgTen}</p>
          <h1>Nhãn giúp tổ chức nội dung cộng đồng</h1>
          <p className="cd-create-lead">
            Thành viên sẽ chọn nhãn khi đăng bài; người xem lọc theo nhãn trên
            cùng một feed — không tách phòng.
          </p>
        </div>

        <div className="cd-create-card cd-filter-setup-card">
          {err ? (
            <div className="cd-create-alert" role="alert">
              {err}
            </div>
          ) : null}

          <ul className="cd-filter-setup-list">
            {filters.map((filter) => {
              const isEditing = editingId === filter.id;
              return (
                <li key={filter.id} className="cd-filter-setup-item">
                  {isEditing ? (
                    <div className="cd-filter-setup-edit">
                      <input
                        value={editTen}
                        onChange={(e) => setEditTen(e.target.value)}
                        maxLength={40}
                        autoFocus
                      />
                      <div className="cd-filter-admin-colors" role="group" aria-label="Màu nhãn">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`cd-filter-color-swatch${editMau === color ? " is-active" : ""}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setEditMau(color)}
                            aria-label={`Màu ${color}`}
                          />
                        ))}
                      </div>
                      <div className="cd-filter-setup-edit-actions">
                        <button
                          type="button"
                          className="cd-filter-setup-save"
                          onClick={() => saveEdit(filter.id)}
                          disabled={pending || !editTen.trim()}
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          className="cd-filter-setup-cancel"
                          onClick={() => setEditingId(null)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span
                        className="cd-filter-setup-chip"
                        style={{
                          borderColor: filter.mau,
                          color: filter.mau,
                          backgroundColor: `${filter.mau}18`,
                        }}
                      >
                        <CongDongFilterIcon name={filter.icon} size={15} />
                        {filter.ten}
                      </span>
                      <div className="cd-filter-setup-item-actions">
                        <button
                          type="button"
                          onClick={() => startEdit(filter)}
                          disabled={pending}
                          aria-label={`Sửa ${filter.ten}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(filter)}
                          disabled={pending}
                          aria-label={`Xóa ${filter.ten}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>

          {showAdd ? (
            <form className="cd-filter-setup-add-form" onSubmit={onAdd}>
              <input
                value={newTen}
                onChange={(e) => setNewTen(e.target.value)}
                placeholder="Tên nhãn mới"
                maxLength={40}
                required
              />
              <div className="cd-filter-admin-colors" role="group" aria-label="Màu nhãn mới">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`cd-filter-color-swatch${newMau === color ? " is-active" : ""}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewMau(color)}
                    aria-label={`Màu ${color}`}
                  />
                ))}
              </div>
              <div className="cd-filter-setup-add-actions">
                <button type="submit" disabled={pending || !newTen.trim()}>
                  Thêm
                </button>
                <button type="button" onClick={() => setShowAdd(false)}>
                  Huỷ
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="cd-filter-setup-add-btn"
              onClick={() => setShowAdd(true)}
              disabled={pending}
            >
              <Plus size={18} aria-hidden />
              Thêm nhãn
            </button>
          )}

          <footer className="cd-filter-setup-footer">
            <button
              type="button"
              className="cd-create-submit"
              onClick={goToCommunity}
              disabled={pending}
            >
              Xong — vào cộng đồng
            </button>
            <Link href={communityHref} className="cd-create-cancel" prefetch={false}>
              Bỏ qua
            </Link>
          </footer>
        </div>
      </main>
    </div>
  );
}
