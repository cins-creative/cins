"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Users } from "lucide-react";

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
  kind: SocialInteractionKind;
  /** Emoji reaction khi danh sách từ bình luận. */
  reactionEmoji?: string;
  onNavigate: () => void;
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
  onNavigate,
}: Props) {
  const subtitle = buildSubtitle(actor);
  const when = formatActorRelativeTime(actor.tuongTacLuc);
  const verb = interactionVerb(kind, reactionEmoji);
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

  const showFeaturedBtn = featuredReady && featuredCount > 0;
  const isSelf = !viewerId || viewerId === actor.idNguoiDung;
  const showConnectActions = !isSelf && actor.quanHe !== "blocked";
  const showActions = showFeaturedBtn || showConnectActions;

  return (
    <li className={`jsa-row${featuredOpen ? " is-featured-open" : ""}`}>
      <div className="jsa-row-main">
        <Link href={`/${actor.slug}`} className="jsa-item" onClick={onNavigate}>
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
                  {verb} {when}
                </span>
              ) : null}
            </span>
          </span>
        </Link>
        {showActions ? (
          <div className="jsa-actions" onClick={(e) => e.stopPropagation()}>
            {showFeaturedBtn ? (
              <button
                type="button"
                className={`jsa-act is-featured${featuredOpen ? " is-open" : ""}`}
                title={
                  featuredOpen
                    ? "Thu gọn nội dung nổi bật"
                    : `Xem ${featuredCount} nội dung nổi bật`
                }
                aria-label={
                  featuredOpen
                    ? "Thu gọn nội dung nổi bật"
                    : `Xem ${featuredCount} nội dung nổi bật`
                }
                aria-expanded={featuredOpen}
                aria-controls={`j-user-featured-panel-${actor.slug}`}
                onClick={() => setFeaturedOpen((v) => !v)}
              >
                <span className="jsa-featured-count" aria-hidden>
                  {featuredCount}
                </span>
              </button>
            ) : null}
            <JourneySocialActorActions actor={actor} viewerId={viewerId} bare />
          </div>
        ) : null}
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
