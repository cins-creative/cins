"use client";

import {
  CalendarDays,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { SuKienCreateModal } from "@/components/co-so/SuKienCreateModal";
import {
  labelLoaiSuKien,
  type SuKienCardData,
} from "@/lib/to-chuc/su-kien-constants";

type Props = {
  orgId: string;
  orgTen: string;
  orgDiaChi?: string | null;
  canManageSuKien: boolean;
};

function formatRange(batDau: string, ketThuc: string | null): string {
  const start = new Date(batDau);
  if (Number.isNaN(start.getTime())) return "";
  const dateFmt = new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const startStr = `${dateFmt.format(start)} · ${timeFmt.format(start)}`;
  if (!ketThuc) return startStr;
  const end = new Date(ketThuc);
  if (Number.isNaN(end.getTime())) return startStr;
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) return `${startStr} – ${timeFmt.format(end)}`;
  return `${startStr} → ${dateFmt.format(end)} · ${timeFmt.format(end)}`;
}

function isPast(batDau: string, ketThuc: string | null): boolean {
  const ref = ketThuc ?? batDau;
  const d = new Date(ref);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

export function CoSoTabSuKien({
  orgId,
  orgTen,
  orgDiaChi = null,
  canManageSuKien,
}: Props) {
  const [items, setItems] = useState<SuKienCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SuKienCardData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetch(`/api/org/${encodeURIComponent(orgId)}/su-kien`, {
      credentials: "include",
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          suKien?: SuKienCardData[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Không tải được danh sách sự kiện.");
        }
        if (!cancelled) setItems(data.suKien ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Không tải được danh sách sự kiện.",
          );
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  function handleCreated(suKien: SuKienCardData) {
    setItems((prev) =>
      [suKien, ...prev.filter((s) => s.id !== suKien.id)].sort(
        (a, b) => new Date(a.batDau).getTime() - new Date(b.batDau).getTime(),
      ),
    );
  }

  function handleUpdated(suKien: SuKienCardData) {
    setItems((prev) =>
      prev
        .map((s) => (s.id === suKien.id ? suKien : s))
        .sort(
          (a, b) =>
            new Date(a.batDau).getTime() - new Date(b.batDau).getTime(),
        ),
    );
  }

  async function handleDelete(suKien: SuKienCardData) {
    if (!window.confirm(`Xóa sự kiện “${suKien.ten}”?`)) return;
    setDeletingId(suKien.id);
    try {
      const res = await fetch(
        `/api/org/${encodeURIComponent(orgId)}/su-kien/${encodeURIComponent(suKien.id)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (res.ok) {
        setItems((prev) => prev.filter((s) => s.id !== suKien.id));
      }
    } catch {
      /* bỏ qua — giữ danh sách */
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="cso-kh-tab">
        <div className="cso-sk-skeleton" aria-hidden />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="cso-kh-empty">
        <p className="cso-kh-empty-title">Không tải được sự kiện</p>
        <p className="cso-kh-empty-hint">{loadError}</p>
      </div>
    );
  }

  return (
    <>
      <div className="cso-kh-tab">
        <header className="cso-kh-tab-head">
          <div className="cso-kh-toolbar">
            <div className="cso-kh-toolbar-text">
              <h2 className="cso-kh-toolbar-title">Sự kiện</h2>
              <p className="cso-kh-toolbar-sub">
                {items.length > 0
                  ? `${items.length} sự kiện`
                  : `Workshop, open day, talkshow… tại ${orgTen}`}
              </p>
            </div>
            {canManageSuKien ? (
              <button
                type="button"
                className="cso-kh-toolbar-btn"
                onClick={() => {
                  setEditing(null);
                  setCreateOpen(true);
                }}
              >
                <Plus size={16} aria-hidden />
                Thêm sự kiện
              </button>
            ) : null}
          </div>
        </header>

        {items.length === 0 ? (
          <div className="cso-kh-empty">
            <CalendarDays size={36} strokeWidth={1.25} aria-hidden />
            <p className="cso-kh-empty-title">Chưa có sự kiện nào</p>
            <p className="cso-kh-empty-hint">
              Tạo sự kiện đầu tiên — sẽ hiển thị trên bảng thông báo của trang.
            </p>
            {canManageSuKien ? (
              <button
                type="button"
                className="cso-kh-toolbar-btn cso-kh-empty-btn"
                onClick={() => {
                  setEditing(null);
                  setCreateOpen(true);
                }}
              >
                <Plus size={16} aria-hidden />
                Thêm sự kiện
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="cso-sk-list">
            {items.map((sk) => {
              const past = isPast(sk.batDau, sk.ketThuc);
              return (
                <li
                  key={sk.id}
                  className={`cso-sk-card${past ? " cso-sk-card--past" : ""}`}
                >
                  <div className="cso-sk-card-main">
                    <div className="cso-sk-card-top">
                      <span className="cso-sk-kind">
                        {labelLoaiSuKien(sk.loaiSuKien)}
                      </span>
                      {past ? (
                        <span className="cso-sk-badge">Đã diễn ra</span>
                      ) : null}
                    </div>
                    <h3 className="cso-sk-name">{sk.ten}</h3>
                    <div className="cso-sk-meta">
                      <span className="cso-sk-meta-item">
                        <CalendarDays size={14} aria-hidden />
                        {formatRange(sk.batDau, sk.ketThuc)}
                      </span>
                      {sk.diaDiem ? (
                        <span className="cso-sk-meta-item">
                          <MapPin size={14} aria-hidden />
                          {sk.diaDiem}
                        </span>
                      ) : null}
                      {sk.slotToiDa ? (
                        <span className="cso-sk-meta-item">
                          <Users size={14} aria-hidden />
                          {sk.soDangKy}/{sk.slotToiDa}
                        </span>
                      ) : null}
                    </div>
                    {sk.moTa ? (
                      <p className="cso-sk-desc">{sk.moTa}</p>
                    ) : null}
                  </div>

                  {canManageSuKien ? (
                    <div className="cso-sk-card-actions">
                      <button
                        type="button"
                        className="cso-sk-act"
                        aria-label="Sửa sự kiện"
                        onClick={() => {
                          setCreateOpen(false);
                          setEditing(sk);
                        }}
                      >
                        <Pencil size={15} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="cso-sk-act cso-sk-act--danger"
                        aria-label="Xóa sự kiện"
                        disabled={deletingId === sk.id}
                        onClick={() => void handleDelete(sk)}
                      >
                        <Trash2 size={15} aria-hidden />
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canManageSuKien ? (
        <>
          <SuKienCreateModal
            open={createOpen && !editing}
            orgId={orgId}
            orgDiaChi={orgDiaChi}
            onClose={() => setCreateOpen(false)}
            onCreated={handleCreated}
          />
          <SuKienCreateModal
            open={Boolean(editing)}
            orgId={orgId}
            orgDiaChi={orgDiaChi}
            editing={editing}
            onClose={() => setEditing(null)}
            onUpdated={handleUpdated}
          />
        </>
      ) : null}
    </>
  );
}
