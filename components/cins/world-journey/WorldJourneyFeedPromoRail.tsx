import Link from "next/link";

import type { FeedPromoVariant } from "@/lib/cins/worldJourneyFeedPromosTypes";

type Props = {
  variant: FeedPromoVariant;
  slotKey: string;
};

function splitPromoSub(sub: string): { primary: string; secondary: string | null } {
  const sep = sub.indexOf(" · ");
  if (sep === -1) return { primary: sub, secondary: null };
  return {
    primary: sub.slice(0, sep).trim(),
    secondary: sub.slice(sep + 3).trim() || null,
  };
}

function PromoCourseCard({
  href,
  title,
  sub,
  imageUrl,
  className = "is-course",
}: {
  href: string;
  title: string;
  sub: string;
  imageUrl: string | null;
  className?: string;
}) {
  const { primary, secondary } = splitPromoSub(sub);
  const showTag = className === "is-course" && secondary;

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
            <>
              <span className="wj-feed-promo-card-org">{primary}</span>
              {showTag ? (
                <span className="wj-feed-promo-card-tag">{secondary}</span>
              ) : null}
            </>
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
  dateBadge,
}: {
  href: string;
  title: string;
  sub: string;
  imageUrl: string | null;
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
          <span className="wj-feed-promo-card-org">{primary}</span>
          {secondary ? (
            <span className="wj-feed-promo-card-tag">{secondary}</span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}

function PromoPersonCard({
  href,
  title,
  sub,
  imageUrl,
}: {
  href: string;
  title: string;
  sub: string;
  imageUrl: string | null;
}) {
  return (
    <Link
      href={href}
      className="wj-feed-promo-card is-person"
      role="listitem"
      prefetch={false}
    >
      <span className="wj-feed-promo-person-hero" aria-hidden>
        <span className="wj-feed-promo-person-av">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" loading="lazy" />
          ) : (
            <span className="wj-feed-promo-person-av-fallback">
              {title.slice(0, 2).toUpperCase()}
            </span>
          )}
        </span>
      </span>
      <span className="wj-feed-promo-card-body">
        <span className="wj-feed-promo-card-name">{title}</span>
        <span className="wj-feed-promo-card-tag">{sub}</span>
      </span>
    </Link>
  );
}

function PromoOrgCard({
  href,
  title,
  sub,
  imageUrl,
}: {
  href: string;
  title: string;
  sub: string;
  imageUrl: string | null;
}) {
  return (
    <Link
      href={href}
      className="wj-feed-promo-card is-org"
      role="listitem"
      prefetch={false}
    >
      <span className="wj-feed-promo-org-hero" aria-hidden>
        <span className="wj-feed-promo-org-av">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" loading="lazy" />
          ) : (
            <span className="wj-feed-promo-org-av-fallback">
              {title.slice(0, 2).toUpperCase()}
            </span>
          )}
        </span>
      </span>
      <span className="wj-feed-promo-card-body">
        <span className="wj-feed-promo-card-name">{title}</span>
        <span className="wj-feed-promo-card-sub">{sub}</span>
      </span>
    </Link>
  );
}

/** Block ngang gợi ý xen kẽ timeline feed (không dùng ở Gallery). */
export function WorldJourneyFeedPromoRail({ variant, slotKey }: Props) {
  if (variant.items.length === 0) return null;

  return (
    <aside
      className="wj-feed-promo-rail"
      aria-label={variant.title}
      data-promo-kind={variant.kind}
      data-promo-slot={slotKey}
    >
      <div className="wj-feed-promo-rail-head">
        <div className="wj-feed-promo-rail-head-copy">
          <span className="wj-feed-promo-rail-kicker">Gợi ý</span>
          <h3 className="wj-feed-promo-rail-title">{variant.title}</h3>
        </div>
        <Link
          href={variant.moreHref}
          className="wj-feed-promo-rail-more"
          prefetch={false}
        >
          {variant.moreLabel ?? "Xem tất cả"}
        </Link>
      </div>
      <div className="wj-feed-promo-rail-track" role="list">
        {variant.items.map((item) => {
          if (variant.kind === "courses") {
            return (
              <PromoCourseCard
                key={item.id}
                href={item.href}
                title={item.title}
                sub={item.sub}
                imageUrl={item.imageUrl}
              />
            );
          }
          if (variant.kind === "careers") {
            return (
              <PromoCourseCard
                key={item.id}
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
                key={item.id}
                href={item.href}
                title={item.title}
                sub={item.sub}
                imageUrl={item.imageUrl}
                dateBadge={item.dateBadge}
              />
            );
          }
          if (variant.kind === "people") {
            return (
              <PromoPersonCard
                key={item.id}
                href={item.href}
                title={item.title}
                sub={item.sub}
                imageUrl={item.imageUrl}
              />
            );
          }
          return (
            <PromoOrgCard
              key={item.id}
              href={item.href}
              title={item.title}
              sub={item.sub}
              imageUrl={item.imageUrl}
            />
          );
        })}
      </div>
    </aside>
  );
}
