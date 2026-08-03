"use client";

import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Ticket,
  Users,
  X,
} from "lucide-react";

import { CinsArrowIos } from "@/components/icons/CinsArrowIos";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { HaOrgUpCountdown } from "@/components/cins/home-adaptive/HaOrgUpCountdown";
import { SuKienPhanHoiActions } from "@/components/to-chuc/SuKienPhanHoiActions";
import { haOrgProfileHref } from "@/lib/cins/home-adaptive/org-popover-kind";
import type { HaOrgUpPopoverItem } from "@/lib/cins/home-adaptive/sidebar-event-popover";
import type { LoaiPhanHoiSuKien } from "@/lib/to-chuc/su-kien-phan-hoi-types";

import "@/components/journey/journey-user-popover.css";
import "./ha-org-up-popover.css";

type SuKienPreview = {
  loaiLabel: string;
  diaDiem: string | null;
  veLabel: string;
  soDangKy: number;
  slotToiDa: number | null;
  moTa: string | null;
  coverSrc: string | null;
};

type Props = {
  item: HaOrgUpPopoverItem;
  /** Class card gốc (`ha-org-up-list-row`, `ha-org-up ha-org-up--banner`). */
  cardClassName: string;
  children: ReactNode;
};

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
});

function formatRange(batDauIso: string, ketThucIso: string | null): string {
  const start = new Date(batDauIso);
  if (Number.isNaN(start.getTime())) return "";
  const startStr = `${dateFmt.format(start)} · ${timeFmt.format(start)}`;
  if (!ketThucIso) return startStr;
  const end = new Date(ketThucIso);
  if (Number.isNaN(end.getTime())) return startStr;
  if (start.toDateString() === end.toDateString()) {
    return `${startStr} – ${timeFmt.format(end)}`;
  }
  return `${startStr} → ${dateFmt.format(end)} · ${timeFmt.format(end)}`;
}

function coverBadge(batDauIso: string): { month: string; day: string } | null {
  const d = new Date(batDauIso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    month: `Th${d.getMonth() + 1}`,
    day: String(d.getDate()).padStart(2, "0"),
  };
}

function statusBadges(
  item: HaOrgUpPopoverItem,
  phanHoi: LoaiPhanHoiSuKien | null,
): { text: string; className: string }[] {
  const out: { text: string; className: string }[] = [];
  // "Đang diễn ra" luôn hiện khi live — không để badge phản hồi che mất.
  if (item.status === "active") {
    out.push({ text: "Đang diễn ra", className: "is-live" });
  }
  if (phanHoi === "se_tham_gia") {
    out.push({ text: "Sẽ tham gia", className: "is-rsvp" });
  } else if (phanHoi === "quan_tam") {
    out.push({ text: "Quan tâm", className: "is-interest" });
  }
  return out;
}

/**
 * Card sự kiện / mốc trong sidebar: bấm mở popup thông tin trước,
 * người dùng chủ động bấm «Xem sự kiện» mới điều hướng.
 */
export function HaOrgUpEventPopover({ item, cardClassName, children }: Props) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<SuKienPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [phanHoi, setPhanHoi] = useState<LoaiPhanHoiSuKien | null>(
    item.phanHoi,
  );
  const [soDangKy, setSoDangKy] = useState<number | null>(null);
  const router = useRouter();
  /** Phản hồi đổi trong popup → làm mới sidebar khi đóng (badge + thứ tự card). */
  const phanHoiDirty = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      if (phanHoiDirty.current) {
        phanHoiDirty.current = false;
        router.refresh();
      }
    };
  }, [open, router]);

  const openPopup = () => {
    setOpen(true);
    const key = item.suKienKey;
    if (!key || preview || loading) return;
    setLoading(true);
    void fetch(`/api/su-kien/preview?key=${encodeURIComponent(key)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setPreview(json?.suKien ?? null))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  const badge = coverBadge(item.batDauIso);
  const statuses = statusBadges(item, phanHoi);
  const coverSrc = preview?.coverSrc ?? item.coverSrc;
  const kicker = preview?.loaiLabel ?? item.subLabel ?? "Sự kiện";
  const timeLine =
    item.kind === "su_kien"
      ? formatRange(item.batDauIso, item.ketThucIso)
      : item.dateLabel;
  const orgHref = haOrgProfileHref(item.orgLoai, item.orgSlug);
  const soThamGia = soDangKy ?? preview?.soDangKy ?? 0;
  const slotLine =
    soThamGia > 0
      ? preview?.slotToiDa
        ? `${soThamGia}/${preview.slotToiDa} người sẽ tham gia`
        : `${soThamGia} người sẽ tham gia`
      : null;

  return (
    <>
      <div className={`${cardClassName} ha-org-up-pop-card`}>
        <button
          type="button"
          className="ha-org-up-pop-hit"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={openPopup}
        >
          <span className="ha-org-up-pop-hit-label">
            Xem thông tin: {item.label}
          </span>
        </button>
        {children}
      </div>
      {open
        ? createPortal(
            <div
              className="j-user-popover-backdrop sk-pop-backdrop"
              role="presentation"
              onClick={() => setOpen(false)}
            >
              <div
                className="j-user-popover sk-pop"
                role="dialog"
                aria-modal="true"
                aria-label={
                  item.kind === "su_kien"
                    ? "Thông tin sự kiện"
                    : "Thông tin mốc thông báo"
                }
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="j-user-pop-close"
                  aria-label="Đóng"
                  onClick={() => setOpen(false)}
                >
                  <X size={12} strokeWidth={3} absoluteStrokeWidth aria-hidden />
                </button>
                <article className="sk-pop-card">
                  <div className={`sk-pop-cover${coverSrc ? " has-img" : ""}`}>
                    {coverSrc ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={coverSrc} alt="" loading="lazy" />
                    ) : (
                      <span className="sk-pop-cover-fallback" aria-hidden>
                        {item.label.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    {badge ? (
                      <span className="sk-pop-date" aria-hidden>
                        <span className="sk-pop-date-month">{badge.month}</span>
                        <span className="sk-pop-date-day">{badge.day}</span>
                      </span>
                    ) : null}
                    {statuses.length > 0 ? (
                      <span className="sk-pop-status-wrap">
                        {statuses.map((status) => (
                          <span
                            key={status.className}
                            className={`sk-pop-status ${status.className}`}
                          >
                            {status.text}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                  <div className="sk-pop-body">
                    <p className="sk-pop-kicker">{kicker}</p>
                    <h3 className="sk-pop-title">{item.label}</h3>
                    <Link
                      href={orgHref}
                      className="sk-pop-org"
                      onClick={() => setOpen(false)}
                    >
                      <span className="sk-pop-org-logo" aria-hidden>
                        {item.orgAvatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.orgAvatarUrl}
                            alt=""
                            width={22}
                            height={22}
                            loading="lazy"
                          />
                        ) : (
                          <span className="sk-pop-org-logo-fallback">
                            {item.orgName.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span className="sk-pop-org-name">{item.orgName}</span>
                    </Link>
                    <ul className="sk-pop-meta">
                      {timeLine ? (
                        <li>
                          <CalendarDays size={14} aria-hidden />
                          <span>{timeLine}</span>
                        </li>
                      ) : null}
                      {preview?.diaDiem ? (
                        <li>
                          <MapPin size={14} aria-hidden />
                          <span>{preview.diaDiem}</span>
                        </li>
                      ) : null}
                      {preview?.veLabel ? (
                        <li>
                          <Ticket size={14} aria-hidden />
                          <span>{preview.veLabel}</span>
                        </li>
                      ) : null}
                      {slotLine ? (
                        <li>
                          <Users size={14} aria-hidden />
                          <span>{slotLine}</span>
                        </li>
                      ) : null}
                      {loading ? (
                        <li className="sk-pop-meta-skeleton" aria-hidden>
                          <span />
                          <span />
                        </li>
                      ) : null}
                    </ul>
                    <HaOrgUpCountdown
                      batDauIso={item.batDauIso}
                      ketThucIso={item.ketThucIso}
                      status={item.status}
                    />
                    {preview?.moTa ? (
                      <p className="sk-pop-desc">{preview.moTa}</p>
                    ) : null}
                    <div className="sk-pop-actions">
                      {item.suKienId ? (
                        <SuKienPhanHoiActions
                          orgId={item.orgId}
                          suKienId={item.suKienId}
                          slotToiDa={preview?.slotToiDa ?? null}
                          initialLoai={item.phanHoi}
                          className="sk-pop-rsvp"
                          onLoaiChange={(loai) => {
                            phanHoiDirty.current = loai !== item.phanHoi;
                            setPhanHoi(loai);
                          }}
                          onSoDangKyChange={setSoDangKy}
                        />
                      ) : null}
                      <Link
                        href={item.href}
                        className="sk-pop-primary"
                        onClick={() => setOpen(false)}
                      >
                        {item.kind === "su_kien" ? "Xem sự kiện" : "Xem chi tiết"}
                        <CinsArrowIos size={15} aria-hidden />
                      </Link>
                    </div>
                  </div>
                </article>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
