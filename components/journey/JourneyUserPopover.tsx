"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import "./journey-user-popover.css";

import { JourneyUserFeaturedExpand } from "@/components/journey/JourneyUserFeaturedExpand";
import {
  JourneyUserPopoverActions,
  JourneyUserPopoverActionsShell,
} from "@/components/journey/JourneyUserPopoverActions";
import { VerifiedTick } from "@/components/journey/VerifiedTick";
import { useCinsChat } from "@/components/cins/CinsChatProvider";
import {
  fetchUserPreview,
  getCachedUserPreview,
  prefetchUserPreview,
  type UserPreviewProfile,
} from "@/lib/journey/user-preview-cache";
import { useMutualFriends } from "@/lib/social/use-mutual-friends";
import { trackSuKien } from "@/lib/social/track-su-kien";
import type { NguonSuKien } from "@/lib/social/su-kien-constants";

type Props = {
  slug?: string | null;
  fallbackName?: string | null;
  fallbackAvatarUrl?: string | null;
  fallbackCoverUrl?: string | null;
  backdropZIndex?: number;
  /**
   * Đo "click xem hồ sơ" — quy về cột mốc (bối cảnh) phát sinh.
   * Bỏ trống → không đo.
   */
  track?: { idBoiCanh: string; nguon?: NguonSuKien } | null;
  children: React.ReactNode;
};

export function JourneyUserPopover({
  slug,
  fallbackName,
  fallbackAvatarUrl,
  fallbackCoverUrl,
  backdropZIndex = 9500,
  track,
  children,
}: Props) {
  const { viewerProfileId } = useCinsChat();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<UserPreviewProfile | null>(() =>
    slug ? getCachedUserPreview(slug) : null,
  );
  const [loading, setLoading] = useState(false);
  const [featuredOpen, setFeaturedOpen] = useState(true);
  const [featuredCount, setFeaturedCount] = useState(0);
  const [featuredReady, setFeaturedReady] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const mutual = useMutualFriends(profile?.idNguoiDung ?? "", viewerProfileId);

  const onFeaturedAvailability = useCallback(
    (info: { ready: boolean; count: number }) => {
      setFeaturedReady(info.ready);
      setFeaturedCount(info.count);
      if (!info.ready) return;
      setFeaturedOpen(info.count > 0);
    },
    [],
  );

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

  useEffect(() => {
    setProfile(slug ? getCachedUserPreview(slug) : null);
    setFeaturedOpen(true);
    setFeaturedCount(0);
    setFeaturedReady(false);
  }, [slug]);

  useEffect(() => {
    if (!open || !slug) return;
    const cached = getCachedUserPreview(slug);
    if (cached) {
      setProfile(cached);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchUserPreview(slug).then((next) => {
      if (cancelled) return;
      setProfile(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, slug]);

  const toggle = () => {
    if (!slug) return;
    setOpen((value) => {
      const next = !value;
      if (next && track?.idBoiCanh) {
        trackSuKien({
          loai_su_kien: "mo_popover_nguoi",
          loai_doi_tuong: "cot_moc",
          id_doi_tuong: track.idBoiCanh,
          nguon: track.nguon ?? null,
          ngu_canh: slug ? { target_slug: slug } : null,
        });
      }
      setFeaturedOpen(next);
      return next;
    });
  };

  if (!slug) return <>{children}</>;

  const visibleProfile =
    profile ??
    (fallbackName
      ? {
          idNguoiDung: "",
          slug,
          tenHienThi: fallbackName,
          avatarUrl: fallbackAvatarUrl ?? null,
          coverUrl: fallbackCoverUrl ?? null,
          bio: null,
          giaiDoan: null,
          tinhThanh: null,
          stats: { cotMoc: 0, tacPham: 0, banBe: 0 },
        }
      : null);

  const canExpandFeatured =
    featuredCount > 0 || (!featuredReady && (visibleProfile?.stats.tacPham ?? 0) > 0);
  /** Nổi bật = bài gắn feature; ưu tiên count từ gallery-aside khi đã sẵn. */
  const noiBatCount = featuredReady
    ? featuredCount
    : (visibleProfile?.stats.tacPham ?? 0);

  return (
    <span className="j-user-pop-wrap" ref={wrapRef}>
      <button
        type="button"
        className="j-user-pop-trigger"
        aria-expanded={open}
        onPointerEnter={() => prefetchUserPreview(slug)}
        onFocus={() => prefetchUserPreview(slug)}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          toggle();
        }}
      >
        {children}
      </button>
      {mounted && open ? createPortal(
        <div
          className="j-user-popover-backdrop"
          role="presentation"
          style={{ zIndex: backdropZIndex }}
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
              <X size={12} strokeWidth={3} absoluteStrokeWidth aria-hidden />
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
              <div className="j-friend-body">
                <div className="j-friend-avatar">
                  {visibleProfile.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={visibleProfile.avatarUrl} alt="" />
                  ) : (
                    <span>{(visibleProfile.tenHienThi || visibleProfile.slug).slice(0, 1)}</span>
                  )}
                </div>
                <h3>
                  {visibleProfile.tenHienThi}
                  <VerifiedTick
                    slug={visibleProfile.slug}
                    verified={visibleProfile.daXacMinh}
                    size={16}
                  />
                </h3>
                {visibleProfile.giaiDoan || visibleProfile.tinhThanh ? (
                  <p className="j-friend-meta">
                    {[visibleProfile.giaiDoan, visibleProfile.tinhThanh]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : null}
                {mutual.visible ? (
                  <div className="j-friend-mutual" title={`${mutual.count} bạn chung`}>
                    {mutual.users.length > 0 ? (
                      <span className="j-friend-mutual-faces" aria-hidden>
                        {mutual.users.slice(0, 3).map((u) => (
                          <span key={u.idNguoiDung} className="j-friend-mutual-face">
                            {u.avatarUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={u.avatarUrl} alt="" />
                            ) : (
                              <span className="j-friend-mutual-ini">
                                {(u.tenHienThi || u.slug).slice(0, 1)}
                              </span>
                            )}
                          </span>
                        ))}
                      </span>
                    ) : null}
                    <span className="j-friend-mutual-text">
                      <strong>{mutual.count}</strong> bạn chung
                    </span>
                  </div>
                ) : null}
                {visibleProfile.bio ? <p className="j-friend-bio">{visibleProfile.bio}</p> : null}
                <div className="j-friend-stats" aria-label="Thống kê hồ sơ">
                  {canExpandFeatured ? (
                    <button
                      type="button"
                      className={`j-friend-stat-btn${featuredOpen ? " is-open" : ""}`}
                      aria-expanded={featuredOpen}
                      aria-controls={`j-user-featured-panel-${visibleProfile.slug}`}
                      title={
                        featuredOpen
                          ? "Thu gọn Feature"
                          : "Xem Feature"
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        setFeaturedOpen((value) => !value);
                      }}
                    >
                      <strong>{noiBatCount}</strong>
                      Feature
                    </button>
                  ) : noiBatCount > 0 ? (
                    <Link
                      href={`/${visibleProfile.slug}`}
                      className="j-friend-stat-btn"
                      title="Xem Journey — Feature"
                      onClick={() => setOpen(false)}
                    >
                      <strong>{noiBatCount}</strong>
                      Feature
                    </Link>
                  ) : (
                    <span>
                      <strong>{noiBatCount}</strong>
                      Feature
                    </span>
                  )}
                  <span>
                    <strong>{visibleProfile.stats.cotMoc}</strong>
                    Gallery
                  </span>
                  <span>
                    <strong>{visibleProfile.stats.banBe}</strong>
                    Bạn bè
                  </span>
                </div>
                {visibleProfile.idNguoiDung ? (
                  <JourneyUserPopoverActions
                    user={{
                      idNguoiDung: visibleProfile.idNguoiDung,
                      slug: visibleProfile.slug,
                      tenHienThi: visibleProfile.tenHienThi,
                      avatarUrl: visibleProfile.avatarUrl,
                      giaiDoan: visibleProfile.giaiDoan,
                    }}
                    viewerProfileId={viewerProfileId}
                    onClose={() => setOpen(false)}
                  />
                ) : (
                  <JourneyUserPopoverActionsShell />
                )}
              </div>
              <JourneyUserFeaturedExpand
                slug={visibleProfile.slug}
                eager
                open={featuredOpen}
                onOpenChange={setFeaturedOpen}
                onAvailabilityChange={onFeaturedAvailability}
              />
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
