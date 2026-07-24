"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Maximize2, Users } from "lucide-react";

import { JourneySocialActorActions } from "@/components/journey/JourneySocialActorActions";
import { JourneyUserFeaturedExpand } from "@/components/journey/JourneyUserFeaturedExpand";
import { getNameInitials } from "@/lib/journey/profile";
import { formatActorRelativeTime } from "@/lib/social/actors-relative-time";
import type {
  SocialActorProfile,
  SocialInteractionKind,
} from "@/lib/social/actors-types";
import { commentReactionLabel } from "@/lib/social/comments/types";

type Props = {
  actor: SocialActorProfile;
  viewerId: string | null;
  /** Khi có — hiện dòng «Thích / Bình luận …» theo thời điểm tương tác. */
  kind?: SocialInteractionKind;
  /** Emoji reaction khi danh sách từ bình luận. */
  reactionEmoji?: string;
  /** Ghi đè subtitle (vd. vai trò nghề) — null/undefined = giai đoạn · tỉnh thành. */
  subtitleOverride?: string | null;
};

function interactionVerb(
  kind: SocialInteractionKind,
  reactionEmoji?: string,
): string {
  if (reactionEmoji) return commentReactionLabel(reactionEmoji);
  if (kind === "like") return "Thích";
  if (kind === "comment") return "Bình luận";
  return "Đã lưu";
}

function buildSubtitle(actor: SocialActorProfile): string | null {
  const parts = [actor.giaiDoan, actor.tinhThanh].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function JourneySocialActorRow({
  actor,
  viewerId,
  kind,
  reactionEmoji,
  subtitleOverride,
}: Props) {
  const subtitle =
    subtitleOverride?.trim() || buildSubtitle(actor);
  const when = kind
    ? formatActorRelativeTime(actor.tuongTacLuc)
    : null;
  const verb = kind ? interactionVerb(kind, reactionEmoji) : "";
  const [featuredOpen, setFeaturedOpen] = useState(false);
  const [featuredCount, setFeaturedCount] = useState(0);
  const [featuredReady, setFeaturedReady] = useState(false);

  const onFeaturedAvailability = useCallback(
    (info: { ready: boolean; count: number }) => {
      setFeaturedReady(info.ready);
      setFeaturedCount(info.count);
      if (info.ready && info.count <= 0) setFeaturedOpen(false);
    },
    [],
  );

  const canExpandFeatured = !featuredReady || featuredCount > 0;

  /** Click hàng xổ Feature; nút Maximize2 → trang Journey (giống friend card / popover). */
  const onCardClick = () => {
    if (featuredReady && featuredCount <= 0) return;
    setFeaturedOpen((v) => !v);
  };

  return (
    <li className={`jsa-row${featuredOpen ? " is-featured-open" : ""}`}>
      <div
        className={`jsa-item${featuredOpen ? " is-expanded" : ""}${canExpandFeatured ? " is-expandable" : ""}`}
      >
        <button
          type="button"
          className="jsa-item-hit"
          aria-expanded={canExpandFeatured ? featuredOpen : undefined}
          aria-controls={
            canExpandFeatured
              ? `j-user-featured-panel-${actor.slug}`
              : undefined
          }
          aria-label={
            canExpandFeatured
              ? featuredOpen
                ? `Thu gọn nội dung nổi bật của ${actor.tenHienThi}`
                : `Xem nội dung nổi bật của ${actor.tenHienThi}`
              : undefined
          }
          onClick={onCardClick}
        >
          {actor.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={actor.avatarUrl}
              alt=""
              width={44}
              height={44}
              className="jsa-avatar"
            />
          ) : (
            <span className="jsa-avatar jsa-avatar--initial" aria-hidden>
              {getNameInitials(actor.tenHienThi, actor.slug)}
            </span>
          )}
          <span className="jsa-item-body">
            <span className="jsa-name">{actor.tenHienThi}</span>
            {subtitle ? <span className="jsa-sub">{subtitle}</span> : null}
            <span className="jsa-meta">
              {actor.mutualFriendCount > 0 ? (
                <span className="jsa-mutual">
                  <Users size={11} strokeWidth={2.2} aria-hidden />
                  {actor.mutualFriendCount} bạn chung
                </span>
              ) : null}
              {when ? (
                <span className="jsa-when">
                  {verb ? (
                    <span
                      className={
                        reactionEmoji
                          ? "jsa-when-verb jsa-when-verb--emoji"
                          : "jsa-when-verb"
                      }
                    >
                      {verb}
                    </span>
                  ) : null}{" "}
                  {when}
                </span>
              ) : null}
            </span>
          </span>
        </button>
        <div className="jsa-actions" onClick={(e) => e.stopPropagation()}>
          <JourneySocialActorActions actor={actor} viewerId={viewerId} bare />
          <Link
            href={`/${actor.slug}`}
            className="jsa-act is-journey"
            title="Xem Journey"
            aria-label={`Xem Journey của ${actor.tenHienThi}`}
            prefetch={false}
          >
            <Maximize2 size={17} strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </div>
      <JourneyUserFeaturedExpand
        slug={actor.slug}
        open={featuredOpen}
        onOpenChange={setFeaturedOpen}
        hideToggle
        onAvailabilityChange={onFeaturedAvailability}
      />
    </li>
  );
}
