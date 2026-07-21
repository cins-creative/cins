"use client";

import { ArrowLeft, CalendarDays, ClipboardList, Loader2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { SuKienManagePanel } from "@/components/co-so/SuKienManagePanel";
import { TIMELINE_LIVE_LABEL } from "@/lib/truong/timeline";
import type { SuKienQuanLyOrgItem } from "@/lib/to-chuc/su-kien-quan-ly-types";

type Props = {
  orgId: string;
  active?: boolean;
  onTongChoDuyetChange?: (count: number) => void;
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

function sumPending(items: SuKienQuanLyOrgItem[]): number {
  return items.reduce((n, sk) => n + sk.soChoDuyetNoiDung, 0);
}

/** Listing sự kiện đang/sắp diễn ra → drill-down bảng quản lý (duyệt tham gia). */
export function CongDongManageSuKienPanel({
  orgId,
  active = true,
  onTongChoDuyetChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<SuKienQuanLyOrgItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId
    ? (items.find((sk) => sk.id === selectedId) ?? null)
    : null;

  const refresh = useCallback(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void fetch(
      `/api/org/${encodeURIComponent(orgId)}/su-kien/quan-ly`,
      { credentials: "include", cache: "no-store" },
    )
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as {
          suKien?: SuKienQuanLyOrgItem[];
          tongChoDuyet?: number;
          error?: string;
        } | null;
        if (!res.ok) {
          throw new Error(json?.error ?? "Không tải được danh sách sự kiện.");
        }
        if (cancelled) return;
        const next = json?.suKien ?? [];
        setItems(next);
        onTongChoDuyetChange?.(
          typeof json?.tongChoDuyet === "number"
            ? json.tongChoDuyet
            : sumPending(next),
        );
        setSelectedId((prev) =>
          prev && next.some((sk) => sk.id === prev) ? prev : null,
        );
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setErr(
            e instanceof Error ? e.message : "Không tải được danh sách sự kiện.",
          );
          setItems([]);
          onTongChoDuyetChange?.(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, orgId, onTongChoDuyetChange]);

  useEffect(() => {
    if (!active) return;
    return refresh();
  }, [active, refresh]);

  useEffect(() => {
    if (!active) setSelectedId(null);
  }, [active]);

  function handlePendingForSelected(count: number) {
    setItems((prev) => {
      const next = prev.map((sk) =>
        sk.id === selectedId ? { ...sk, soChoDuyetNoiDung: count } : sk,
      );
      onTongChoDuyetChange?.(sumPending(next));
      return next;
    });
  }

  if (selected) {
    return (
      <div className="cd-manage-sk">
        <button
          type="button"
          className="cd-manage-sk-back"
          onClick={() => setSelectedId(null)}
        >
          <ArrowLeft size={14} strokeWidth={2.25} aria-hidden />
          Tất cả sự kiện
        </button>
        <h4 className="cd-manage-sk-detail-title">{selected.ten}</h4>
        <SuKienManagePanel
          orgId={orgId}
          suKienId={selected.id}
          active={active}
          onPendingReviewCountChange={handlePendingForSelected}
        />
      </div>
    );
  }

  return (
    <div className="cd-manage-sk">
      {loading ? (
        <p className="cd-manage-sk-status">
          <Loader2 className="cd-manage-sk-spin" size={16} aria-hidden /> Đang tải…
        </p>
      ) : err ? (
        <p className="cd-manage-sk-status cd-manage-sk-status--err" role="alert">
          {err}
        </p>
      ) : items.length === 0 ? (
        <p className="cd-manage-sk-status">
          Chưa có sự kiện đang hoặc sắp diễn ra.
        </p>
      ) : (
        <ul className="cd-manage-sk-list">
          {items.map((sk) => (
            <li key={sk.id}>
              <button
                type="button"
                className="cd-manage-sk-card"
                onClick={() => setSelectedId(sk.id)}
              >
                <span
                  className={`cd-manage-sk-cover${sk.coverSrc ? " has-img" : ""}`}
                  aria-hidden
                >
                  {sk.coverSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sk.coverSrc} alt="" />
                  ) : (
                    <CalendarDays size={18} strokeWidth={1.75} />
                  )}
                </span>
                <span className="cd-manage-sk-copy">
                  <span className="cd-manage-sk-name-row">
                    <span className="cd-manage-sk-name">{sk.ten}</span>
                    {sk.soChoDuyetNoiDung > 0 ? (
                      <span
                        className="cd-manage-sk-badge"
                        aria-label={`${sk.soChoDuyetNoiDung} nội dung chờ duyệt`}
                      >
                        {sk.soChoDuyetNoiDung > 99
                          ? "99+"
                          : sk.soChoDuyetNoiDung}
                      </span>
                    ) : null}
                  </span>
                  <span className="cd-manage-sk-meta">
                    <span
                      className={`cd-manage-sk-chip${sk.status === "active" ? " is-live" : ""}`}
                    >
                      {sk.status === "active"
                        ? TIMELINE_LIVE_LABEL
                        : "Sắp diễn ra"}
                    </span>
                    <span>{formatRange(sk.batDau, sk.ketThuc)}</span>
                  </span>
                  <span className="cd-manage-sk-stats">
                    <span>
                      <Users size={12} strokeWidth={2.25} aria-hidden />
                      {sk.soSeThamGia} sẽ tham gia
                    </span>
                    {sk.soChoDuyetNoiDung > 0 ? (
                      <span>
                        <ClipboardList size={12} strokeWidth={2.25} aria-hidden />
                        {sk.soChoDuyetNoiDung} chờ duyệt
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
