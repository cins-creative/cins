"use client";

import Link from "next/link";
import { Users } from "lucide-react";

import { JourneySocialActorActions } from "@/components/journey/JourneySocialActorActions";
import { getNameInitials } from "@/lib/journey/profile";
import { formatActorRelativeTime } from "@/lib/social/actors-relative-time";
import type {
  SocialActorProfile,
  SocialInteractionKind,
} from "@/lib/social/actors-types";

type Props = {
  actor: SocialActorProfile;
  viewerId: string | null;
  kind: SocialInteractionKind;
  onNavigate: () => void;
};

function interactionVerb(kind: SocialInteractionKind): string {
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
  onNavigate,
}: Props) {
  const subtitle = buildSubtitle(actor);
  const when = formatActorRelativeTime(actor.tuongTacLuc);
  const verb = interactionVerb(kind);

  return (
    <li className="jsa-row">
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
      <JourneySocialActorActions actor={actor} viewerId={viewerId} />
    </li>
  );
}
