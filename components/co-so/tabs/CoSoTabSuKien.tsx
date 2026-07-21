"use client";

import {
  CalendarDays,
  ImageIcon,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { SuKienCreateModal } from "@/components/co-so/SuKienCreateModal";
import { SuKienDetailView } from "@/components/co-so/SuKienDetailView";
import {
  labelLoaiSuKien,
  labelSuKienVe,
  type SuKienCardData,
} from "@/lib/to-chuc/su-kien-constants";
import { coSoSuKienPath, coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import { studioSuKienPath, studioTabPath } from "@/lib/to-chuc/studio-routes";
import { formatSuKienDiaDiemDisplay } from "@/lib/truong/contact";

type Props = {
  orgId: string;
  orgSlug: string;
  orgTen: string;
  orgDiaChi?: string | null;
  orgTinhThanh?: string | null;
  canManageSuKien: boolean;
  activeSuKienId?: string | null;
  detailPathMode: "co-so" | "studio";
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
  orgSlug,
  orgTen,
  orgDiaChi = null,
  orgTinhThanh = null,
  canManageSuKien,
  activeSuKienId = null,
  detailPathMode,
}: Props) {
  const router = useRouter();
  const [openManageFromQuery, setOpenManageFromQuery] = useState(false);
  const [items, setItems] = useState<SuKienCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SuKienCardData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    setOpenManageFromQuery(q.get("manage") === "1");
  }, [activeSuKienId]);

  const listHref =
    detailPathMode === "co-so"
      ? coSoTabPath(orgSlug, "su-kien")
      : studioTabPath(orgSlug, "su-kien");

  function detailHref(suKienId: string) {
    return detailPathMode === "co-so"
      ? coSoSuKienPath(orgSlug, suKienId)
      : studioSuKienPath(orgSlug, suKienId);
  }

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

  const activeSuKien = useMemo(
    () =>
      activeSuKienId
        ? items.find((s) => s.id === activeSuKienId) ?? null
        : null,
    [activeSuKienId, items],
  );

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

  function handleSoDangKyChange(suKienId: string, soDangKy: number) {
    setItems((prev) =>
      prev.map((s) => (s.id === suKienId ? { ...s, soDangKy } : s)),
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
        if (activeSuKienId === suKien.id) {
          router.push(listHref, { scroll: false });
        }
      }
    } catch {
      /* bỏ qua — giữ danh sách */
    } finally {
      setDeletingId(null);
    }
  }

  function openDetail(suKien: SuKienCardData) {
    router.push(detailHref(suKien.id), { scroll: false });
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

  if (activeSuKienId) {
    if (!activeSuKien) {
      return (
        <div className="cso-kh-tab">
          <div className="cso-kh-empty">
            <p className="cso-kh-empty-title">Không tìm thấy sự kiện</p>
            <p className="cso-kh-empty-hint">
              Sự kiện có thể đã bị xóa hoặc không thuộc tổ chức này.
            </p>
            <button
              type="button"
              className="cso-kh-toolbar-btn cso-kh-empty-btn"
              onClick={() => router.push(listHref, { scroll: false })}
            >
              Quay lại danh sách
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="cso-kh-tab">
        <SuKienDetailView
          orgId={orgId}
          suKien={activeSuKien}
          canManage={canManageSuKien}
          variant="panel"
          initialPanelTab={
            canManageSuKien && openManageFromQuery ? "manage" : "detail"
          }
          onBack={() => {
            router.push(listHref, { scroll: false });
          }}
          onSoDangKyChange={handleSoDangKyChange}
        />
        {canManageSuKien ? (
          <>
            <SuKienCreateModal
              open={createOpen && !editing}
              orgId={orgId}
              orgDiaChi={orgDiaChi}
              orgTinhThanh={orgTinhThanh}
              onClose={() => setCreateOpen(false)}
              onCreated={handleCreated}
            />
            <SuKienCreateModal
              open={Boolean(editing)}
              orgId={orgId}
              orgDiaChi={orgDiaChi}
              orgTinhThanh={orgTinhThanh}
              editing={editing}
              onClose={() => setEditing(null)}
              onUpdated={handleUpdated}
            />
          </>
        ) : null}
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
              const diaDiemLabel = formatSuKienDiaDiemDisplay(
                sk.tinhThanh,
                sk.diaDiem,
              );
              return (
                <li
                  key={sk.id}
                  className={`cso-sk-card${past ? " cso-sk-card--past" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(sk)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openDetail(sk);
                    }
                  }}
                >
                  <div className="cso-sk-cover">
                    {sk.coverSrc ? (
                      <Image
                        src={sk.coverSrc}
                        alt=""
                        fill
                        className="cso-sk-cover-img"
                        sizes="(max-width: 720px) 100vw, 320px"
                      />
                    ) : (
                      <span className="cso-sk-cover-ph" aria-hidden>
                        <ImageIcon size={32} strokeWidth={1.25} />
                      </span>
                    )}
                    <div className="cso-sk-cover-badges">
                      <span className="cso-sk-kind">
                        {labelLoaiSuKien(sk.loaiSuKien)}
                      </span>
                      {past ? (
                        <span className="cso-sk-badge">Đã diễn ra</span>
                      ) : null}
                    </div>
                    {canManageSuKien ? (
                      <div className="cso-sk-card-actions">
                        <button
                          type="button"
                          className="cso-sk-act"
                          aria-label="Sửa sự kiện"
                          onClick={(e) => {
                            e.stopPropagation();
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
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(sk);
                          }}
                        >
                          <Trash2 size={15} aria-hidden />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="cso-sk-card-body">
                    <h3 className="cso-sk-name">{sk.ten}</h3>
                    <div className="cso-sk-meta">
                      <span className="cso-sk-meta-item">
                        <CalendarDays size={14} aria-hidden />
                        {formatRange(sk.batDau, sk.ketThuc)}
                      </span>
                      <span className="cso-sk-meta-item cso-sk-meta-item--tag">
                        {labelSuKienVe(sk.mienPhi, sk.giaVe, sk.loaiVe?.length)}
                      </span>
                    </div>
                    {diaDiemLabel ? (
                      <p className="cso-sk-loc">
                        <MapPin size={13} aria-hidden />
                        {diaDiemLabel}
                      </p>
                    ) : null}
                    {sk.slotToiDa ? (
                      <p className="cso-sk-slots">
                        <Users size={13} aria-hidden />
                        {sk.soDangKy}/{sk.slotToiDa} chỗ
                      </p>
                    ) : null}
                    {sk.moTa ? (
                      <p className="cso-sk-desc">{sk.moTa}</p>
                    ) : null}
                  </div>
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
            orgTinhThanh={orgTinhThanh}
            onClose={() => setCreateOpen(false)}
            onCreated={handleCreated}
          />
          <SuKienCreateModal
            open={Boolean(editing)}
            orgId={orgId}
            orgDiaChi={orgDiaChi}
            orgTinhThanh={orgTinhThanh}
            editing={editing}
            onClose={() => setEditing(null)}
            onUpdated={handleUpdated}
          />
        </>
      ) : null}
    </>
  );
}
