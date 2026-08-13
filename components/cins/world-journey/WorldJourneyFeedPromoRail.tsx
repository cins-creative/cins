"use client";

import Link from "next/link";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { JourneyOrgPopover } from "@/components/journey/JourneyOrgPopover";
import { JourneyOrgPopoverActions } from "@/components/journey/JourneyOrgPopoverActions";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { JourneyUserPopoverActions } from "@/components/journey/JourneyUserPopoverActions";
import { VerifiedTick } from "@/components/journey/VerifiedTick";
import type {
  FeedPromoCard,
  FeedPromoVariant,
} from "@/lib/cins/worldJourneyFeedPromosTypes";

/** Tối đa 5 card / rail — khớp FEED_PROMO_VISIBLE_COUNTS.people. */
const PROMO_RAIL_MAX_CARDS = 5;
/** Nhân bản track để kéo ngang vòng vô hạn. */
const PROMO_RAIL_LOOP_COPIES = 3;
const DRAG_CLICK_THRESHOLD_PX = 6;

type Props = {
  variant: FeedPromoVariant;
  slotKey: string;
  viewerProfileId: string;
};

function splitPromoSub(sub: string): { primary: string; secondary: string | null } {
  const sep = sub.indexOf(" · ");
  if (sep === -1) return { primary: sub, secondary: null };
  return {
    primary: sub.slice(0, sep).trim(),
    secondary: sub.slice(sep + 3).trim() || null,
  };
}

function PromoOrgLine({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string | null;
}) {
  return (
    <span className="wj-feed-promo-card-org">
      <span className="wj-feed-promo-card-org-logo" aria-hidden>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" width={18} height={18} loading="lazy" />
        ) : (
          <span className="wj-feed-promo-card-org-logo-fallback">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
      <span className="wj-feed-promo-card-org-name">{name}</span>
    </span>
  );
}

function PromoCourseCard({
  href,
  title,
  sub,
  imageUrl,
  orgLogoUrl,
  className = "is-course",
}: {
  href: string;
  title: string;
  sub: string;
  imageUrl: string | null;
  orgLogoUrl?: string | null;
  className?: string;
}) {
  const { primary } = splitPromoSub(sub);

  return (
    <Link
      href={href}
      className={`wj-feed-promo-card ${className}`}
      role="listitem"
      prefetch={false}
    >
      <span className="wj-feed-promo-card-cover" aria-hidden>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="wj-feed-promo-card-cover-fallback">
            {title.slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>
      <span className="wj-feed-promo-card-body">
        <span className="wj-feed-promo-card-name">{title}</span>
        <span className="wj-feed-promo-card-meta">
          {className === "is-career" ? (
            sub ? <span className="wj-feed-promo-card-sub">{sub}</span> : null
          ) : (
            <PromoOrgLine name={primary} logoUrl={orgLogoUrl} />
          )}
        </span>
      </span>
    </Link>
  );
}

function PromoEventCard({
  href,
  title,
  sub,
  imageUrl,
  orgLogoUrl,
  dateBadge,
}: {
  href: string;
  title: string;
  sub: string;
  imageUrl: string | null;
  orgLogoUrl?: string | null;
  dateBadge?: { month: string; day: string };
}) {
  const { primary, secondary } = splitPromoSub(sub);

  return (
    <Link
      href={href}
      className="wj-feed-promo-card is-event"
      role="listitem"
      prefetch={false}
    >
      <span className="wj-feed-promo-card-cover" aria-hidden>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="wj-feed-promo-card-cover-fallback">
            {title.slice(0, 2).toUpperCase()}
          </span>
        )}
        {dateBadge?.month && dateBadge.day ? (
          <span className="wj-feed-promo-event-date">
            <span className="wj-feed-promo-event-date-month">{dateBadge.month}</span>
            <span className="wj-feed-promo-event-date-day">{dateBadge.day}</span>
          </span>
        ) : null}
      </span>
      <span className="wj-feed-promo-card-body">
        <span className="wj-feed-promo-card-name">{title}</span>
        <span className="wj-feed-promo-card-meta">
          <PromoOrgLine name={primary} logoUrl={orgLogoUrl} />
          {secondary ? (
            <span className="wj-feed-promo-card-tag">{secondary}</span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}

function isMutualFriendsSub(sub: string): boolean {
  return /^\d+\s+bạn chung$/i.test(sub.trim());
}

function PromoPersonCard({
  href,
  title,
  sub,
  imageUrl,
  coverUrl,
  bio,
  userId,
  giaiDoan,
  viewerProfileId,
}: {
  href: string;
  title: string;
  sub: string;
  imageUrl: string | null;
  coverUrl?: string | null;
  bio?: string | null;
  userId: string;
  giaiDoan?: string | null;
  viewerProfileId: string;
}) {
  const mutual = isMutualFriendsSub(sub);
  const slug = href.replace(/^\//, "");
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase() || title.slice(0, 1).toUpperCase();
  const description =
    bio?.trim() || "Khám phá hành trình trên CINs";

  return (
    <article className="wj-feed-promo-card is-person" role="listitem">
      <JourneyUserPopover
        slug={slug}
        fallbackName={title}
        fallbackAvatarUrl={imageUrl}
        fallbackCoverUrl={coverUrl ?? null}
      >
        <span className="wj-feed-promo-person-main">
          <span
            className={`wj-feed-promo-person-cover${coverUrl ? " has-img" : ""}`}
            aria-hidden
          >
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" loading="lazy" />
            ) : null}
          </span>
          <span className="wj-feed-promo-person-av" aria-hidden>
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" loading="lazy" />
            ) : (
              <span className="wj-feed-promo-person-av-fallback">{initials}</span>
            )}
          </span>
          <span className="wj-feed-promo-card-body">
            <span className="wj-feed-promo-card-name">
              <span className="wj-feed-promo-card-name-text">{title}</span>
              <VerifiedTick slug={slug} />
            </span>
            {sub ? (
              <span
                className={`wj-feed-promo-person-sub${mutual ? " is-mutual" : ""}`}
              >
                {mutual ? (
                  <svg
                    className="wj-feed-promo-person-sub-icon"
                    width={13}
                    height={13}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ) : null}
                <span>{sub}</span>
              </span>
            ) : null}
            <span className="wj-feed-promo-person-bio">{description}</span>
          </span>
        </span>
      </JourneyUserPopover>
      <div className="wj-feed-promo-person-actions">
        <JourneyUserPopoverActions
          viewerProfileId={viewerProfileId}
          showMessage={false}
          showShare={false}
          user={{
            idNguoiDung: userId,
            slug,
            tenHienThi: title,
            avatarUrl: imageUrl,
            giaiDoan: giaiDoan ?? null,
          }}
        />
      </div>
    </article>
  );
}

function PromoOrgCard({
  id,
  href,
  title,
  sub,
  imageUrl,
  coverUrl,
  bio,
  typeLabel,
  location,
  orgActionKind,
}: {
  id: string;
  href: string;
  title: string;
  sub: string;
  imageUrl: string | null;
  coverUrl?: string | null;
  bio?: string | null;
  typeLabel?: string | null;
  location?: string | null;
  orgActionKind?: "studio" | "truong" | "co_so_dao_tao";
}) {
  const initials =
    title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0))
      .join("")
      .toUpperCase() || title.slice(0, 2).toUpperCase();

  const actionKind = orgActionKind ?? "studio";
  const primaryLabel =
    actionKind === "co_so_dao_tao"
      ? "Xem cơ sở"
      : actionKind === "truong"
        ? "Xem trường"
        : "Xem studio";
  const slug = orgSlugFromPromoHref(href);

  return (
    <article className="wj-feed-promo-card is-org" role="listitem">
      <JourneyOrgPopover
        slug={slug}
        orgKind={actionKind}
        href={href}
        fallbackName={title}
        fallbackAvatarUrl={imageUrl}
        fallbackCoverUrl={coverUrl ?? null}
      >
        <span className="wj-feed-promo-org-main">
          <span
            className={`wj-feed-promo-org-cover${coverUrl ? " has-img" : ""}`}
            aria-hidden
          >
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" loading="lazy" />
            ) : null}
          </span>
          <span className="wj-feed-promo-org-av" aria-hidden>
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" loading="lazy" />
            ) : (
              <span className="wj-feed-promo-org-av-fallback">{initials}</span>
            )}
          </span>
          <span className="wj-feed-promo-card-body">
            {typeLabel ? (
              <span className="wj-feed-promo-org-type">{typeLabel}</span>
            ) : null}
            <span className="wj-feed-promo-card-name">{title}</span>
            {location ? (
              <span className="wj-feed-promo-org-loc">{location}</span>
            ) : null}
            {sub ? (
              <span className="wj-feed-promo-card-sub">{sub}</span>
            ) : null}
            {bio ? (
              <span className="wj-feed-promo-org-bio">{bio}</span>
            ) : null}
          </span>
        </span>
      </JourneyOrgPopover>
      <div className="wj-feed-promo-org-actions">
        <JourneyOrgPopoverActions
          orgId={id}
          orgKind={actionKind}
          orgName={title}
          avatarUrl={imageUrl}
          href={href}
          primaryLabel={primaryLabel}
        />
      </div>
    </article>
  );
}

/** `/studio/:slug/...` · `/academy/:slug/...` · `/truong/:slug/...` */
function orgSlugFromPromoHref(href: string): string {
  const parts = href.replace(/^\//, "").split("/").filter(Boolean);
  if (parts.length < 2) return "";
  try {
    return decodeURIComponent(parts[1]!);
  } catch {
    return parts[1]!;
  }
}

function renderPromoCard(
  variant: FeedPromoVariant,
  item: FeedPromoCard,
  viewerProfileId: string,
  reactKey: string,
) {
  if (variant.kind === "courses") {
    return (
      <PromoCourseCard
        key={reactKey}
        href={item.href}
        title={item.title}
        sub={item.sub}
        imageUrl={item.imageUrl}
        orgLogoUrl={item.orgLogoUrl}
      />
    );
  }
  if (variant.kind === "careers") {
    return (
      <PromoCourseCard
        key={reactKey}
        href={item.href}
        title={item.title}
        sub={item.sub}
        imageUrl={item.imageUrl}
        className="is-career"
      />
    );
  }
  if (variant.kind === "events") {
    return (
      <PromoEventCard
        key={reactKey}
        href={item.href}
        title={item.title}
        sub={item.sub}
        imageUrl={item.imageUrl}
        orgLogoUrl={item.orgLogoUrl}
        dateBadge={item.dateBadge}
      />
    );
  }
  if (variant.kind === "people") {
    return (
      <PromoPersonCard
        key={reactKey}
        href={item.href}
        title={item.title}
        sub={item.sub}
        imageUrl={item.imageUrl}
        coverUrl={item.coverUrl}
        bio={item.bio}
        userId={item.id}
        giaiDoan={item.giaiDoan}
        viewerProfileId={viewerProfileId}
      />
    );
  }
  return (
    <PromoOrgCard
      key={reactKey}
      id={item.id}
      href={item.href}
      title={item.title}
      sub={item.sub}
      imageUrl={item.imageUrl}
      coverUrl={item.coverUrl}
      bio={item.bio}
      typeLabel={item.typeLabel}
      location={item.location}
      orgActionKind={item.orgActionKind}
    />
  );
}

/** Block ngang gợi ý xen kẽ timeline feed (không dùng ở Gallery). */
export function WorldJourneyFeedPromoRail({
  variant,
  slotKey,
  viewerProfileId,
}: Props) {
  const items = useMemo(
    () => variant.items.slice(0, PROMO_RAIL_MAX_CARDS),
    [variant.items],
  );
  const canLoop = items.length >= 2;
  const loopedItems = useMemo(() => {
    if (!canLoop) {
      return items.map((item, i) => ({ item, key: `${item.id}-${i}` }));
    }
    const out: { item: FeedPromoCard; key: string }[] = [];
    for (let copy = 0; copy < PROMO_RAIL_LOOP_COPIES; copy += 1) {
      for (const item of items) {
        out.push({ item, key: `${item.id}-c${copy}` });
      }
    }
    return out;
  }, [canLoop, items]);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScroll: number;
    moved: boolean;
    axis: "undecided" | "x" | "y";
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  const wrapInfiniteScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el || !canLoop) return;
    const setWidth = el.scrollWidth / PROMO_RAIL_LOOP_COPIES;
    if (setWidth <= 0) return;
    if (el.scrollLeft < setWidth * 0.25) {
      el.scrollLeft += setWidth;
    } else if (el.scrollLeft > setWidth * 1.75) {
      el.scrollLeft -= setWidth;
    }
  }, [canLoop]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || !canLoop) return;
    /* Đặt giữa bộ nhân bản — chỉ khi mount / đổi tập card, không reset khi resize giữa lúc kéo. */
    const id = window.requestAnimationFrame(() => {
      const setWidth = el.scrollWidth / PROMO_RAIL_LOOP_COPIES;
      if (setWidth > 0) el.scrollLeft = setWidth;
    });
    return () => window.cancelAnimationFrame(id);
  }, [canLoop, loopedItems.length, slotKey]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = trackRef.current;
    if (!el) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startScroll: el.scrollLeft,
      moved: false,
      axis: "undecided",
    };
    /* Chuột: capture ngay. Touch: chưa capture — vuốt dọc phải trả về trang. */
    if (e.pointerType === "mouse") {
      el.setPointerCapture(e.pointerId);
    }
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const el = trackRef.current;
      if (!drag || !el || drag.pointerId !== e.pointerId) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (drag.axis === "undecided") {
        if (
          Math.abs(dx) < DRAG_CLICK_THRESHOLD_PX &&
          Math.abs(dy) < DRAG_CLICK_THRESHOLD_PX
        ) {
          return;
        }
        if (e.pointerType !== "mouse" && Math.abs(dy) >= Math.abs(dx)) {
          dragRef.current = null;
          return;
        }
        if (Math.abs(dx) < DRAG_CLICK_THRESHOLD_PX) return;
        drag.axis = "x";
        drag.moved = true;
        setDragging(true);
        if (e.pointerType !== "mouse" && !el.hasPointerCapture(e.pointerId)) {
          try {
            el.setPointerCapture(e.pointerId);
          } catch {
            /* iOS đôi khi từ chối capture giữa gesture */
          }
        }
      }
      if (drag.axis !== "x") return;
      el.scrollLeft = drag.startScroll - dx;
      wrapInfiniteScroll();
    },
    [wrapInfiniteScroll],
  );

  const endDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const el = trackRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      if (el?.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      if (drag.moved) {
        wrapInfiniteScroll();
        setDragging(false);
      }
      dragRef.current = null;
    },
    [wrapInfiniteScroll],
  );

  /*
   * React onPointerMove thường passive trên touch → preventDefault không ăn.
   * Khi đã khóa trục ngang, chặn scroll trang để rail bám tay.
   */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onTouchMove = (event: TouchEvent) => {
      if (dragRef.current?.axis !== "x") return;
      if (event.cancelable) event.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, {
      passive: false,
      capture: true,
    });
    return () => {
      el.removeEventListener("touchmove", onTouchMove, true);
    };
  }, []);

  if (items.length === 0) return null;

  const density = variant.density ?? "normal";
  const railClass =
    density === "dense"
      ? "wj-feed-promo-rail is-dense"
      : "wj-feed-promo-rail";

  return (
    <aside
      className={railClass}
      aria-label={variant.title}
      data-promo-kind={variant.kind}
      data-promo-density={density}
      data-promo-slot={slotKey}
      data-promo-count={items.length}
    >
      <div
        ref={trackRef}
        className={`wj-feed-promo-rail-track${dragging ? " is-dragging" : ""}`}
        role="list"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onScroll={canLoop ? wrapInfiniteScroll : undefined}
      >
        {loopedItems.map(({ item, key }) =>
          renderPromoCard(variant, item, viewerProfileId, key),
        )}
      </div>
    </aside>
  );
}
