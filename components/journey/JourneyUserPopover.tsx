"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type UserPreview = {
  slug: string;
  tenHienThi: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  aiSummaryJourney: string | null;
  giaiDoan: string | null;
  tinhThanh: string | null;
  stats: {
    cotMoc: number;
    tacPham: number;
    banBe: number;
  };
};

type Props = {
  slug?: string | null;
  fallbackName?: string | null;
  fallbackAvatarUrl?: string | null;
  children: React.ReactNode;
};

export function JourneyUserPopover({
  slug,
  fallbackName,
  fallbackAvatarUrl,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<UserPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

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
    };
  }, [open]);

  const toggle = () => {
    if (!slug) return;
    setOpen((value) => !value);
    if (profile || loading) return;
    setLoading(true);
    void fetch(`/api/users/preview?slug=${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        setProfile(json?.profile ?? null);
      })
      .finally(() => setLoading(false));
  };

  if (!slug) return <>{children}</>;

  const visibleProfile =
    profile ??
    (fallbackName
      ? {
          slug,
          tenHienThi: fallbackName,
          avatarUrl: fallbackAvatarUrl ?? null,
          coverUrl: null,
          bio: null,
          aiSummaryJourney: null,
          giaiDoan: null,
          tinhThanh: null,
          stats: { cotMoc: 0, tacPham: 0, banBe: 0 },
        }
      : null);

  return (
    <span className="j-user-pop-wrap" ref={wrapRef}>
      <button
        type="button"
        className="j-user-pop-trigger"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          toggle();
        }}
      >
        {children}
      </button>
      {mounted && open ? createPortal(
        <div
          className="j-user-popover-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="j-user-popover"
            role="dialog"
            aria-modal="true"
            aria-label="Thông tin người dùng"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="j-user-pop-close"
              aria-label="Đóng"
              onClick={() => setOpen(false)}
            >
              <X size={16} aria-hidden />
            </button>
          {visibleProfile ? (
            <article className="j-friend-card j-user-pop-card">
              <div
                className={`j-friend-cover${visibleProfile.coverUrl ? " has-img" : ""}`}
                aria-hidden
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {visibleProfile.coverUrl ? <img src={visibleProfile.coverUrl} alt="" /> : null}
              </div>
              <div className="j-friend-avatar">
                {visibleProfile.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={visibleProfile.avatarUrl} alt="" />
                ) : (
                  <span>{(visibleProfile.tenHienThi || visibleProfile.slug).slice(0, 1)}</span>
                )}
              </div>
              <div className="j-friend-body">
                <h3>{visibleProfile.tenHienThi}</h3>
                <p className="j-friend-slug">@{visibleProfile.slug}</p>
                {visibleProfile.bio ? <p className="j-friend-bio">{visibleProfile.bio}</p> : null}
                {visibleProfile.aiSummaryJourney ? (
                  <p className="j-user-pop-ai">
                    <strong>AI tóm tắt</strong>
                    {visibleProfile.aiSummaryJourney}
                  </p>
                ) : loading ? (
                  <p className="j-user-pop-ai is-loading">Đang tải AI tóm tắt...</p>
                ) : null}
                <div className="j-friend-stats" aria-label="Thống kê hồ sơ">
                  <span>
                    <strong>{visibleProfile.stats.cotMoc}</strong>
                    Journey
                  </span>
                  <span>
                    <strong>{visibleProfile.stats.tacPham}</strong>
                    Gallery
                  </span>
                  <span>
                    <strong>{visibleProfile.stats.banBe}</strong>
                    Bạn bè
                  </span>
                </div>
                <div className="j-friend-meta">
                  {visibleProfile.giaiDoan ? <span>{visibleProfile.giaiDoan}</span> : null}
                  {visibleProfile.tinhThanh ? <span>{visibleProfile.tinhThanh}</span> : null}
                </div>
                <div className="j-friend-actions">
                  <button type="button" className="j-friend-message" disabled>
                    Nhắn tin
                  </button>
                  <Link href={`/${visibleProfile.slug}`} className="j-friend-link">
                    Xem Journey
                  </Link>
                </div>
              </div>
            </article>
          ) : loading ? (
            <span className="j-user-pop-loading">Đang tải...</span>
          ) : (
            <span className="j-user-pop-loading">Không tải được hồ sơ.</span>
          )}
          </div>
        </div>,
        document.body,
      ) : null}
    </span>
  );
}
