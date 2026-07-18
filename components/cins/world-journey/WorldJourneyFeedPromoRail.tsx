"use client";

import Link from "next/link";

import { JourneyOrgPopoverActions } from "@/components/journey/JourneyOrgPopoverActions";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { JourneyUserPopoverActions } from "@/components/journey/JourneyUserPopoverActions";
import { VerifiedTick } from "@/components/journey/VerifiedTick";
import type { FeedPromoVariant } from "@/lib/cins/worldJourneyFeedPromosTypes";

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

  return (
    <article className="wj-feed-promo-card is-org" role="listitem">
      <Link href={href} className="wj-feed-promo-org-main" prefetch={false}>
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
      </Link>
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

/** Block ngang gợi ý xen kẽ timeline feed (không dùng ở Gallery). */
export function WorldJourneyFeedPromoRail({
  variant,
  slotKey,
  viewerProfileId,
}: Props) {
  if (variant.items.length === 0) return null;

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
      data-promo-count={variant.items.length}
    >
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
                orgLogoUrl={item.orgLogoUrl}
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
                orgLogoUrl={item.orgLogoUrl}
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
              key={item.id}
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
        })}
      </div>
    </aside>
  );
}
