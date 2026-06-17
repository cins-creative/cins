"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";

import type { PendingFollowRequest } from "@/lib/social/types";

type Props = {
  invite: PendingFollowRequest;
  disabled?: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function JourneyFriendInviteCard({
  invite,
  disabled = false,
  onAccept,
  onDecline,
}: Props) {
  return (
    <article className="j-friend-invite-card">
      <div className="j-friend-invite-avatar" aria-hidden>
        <div className="j-friend-avatar">
          {invite.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={invite.avatarUrl} alt="" loading="lazy" />
          ) : (
            <span>{(invite.tenHienThi || invite.slug).slice(0, 1)}</span>
          )}
        </div>
      </div>
      <div className="j-friend-invite-content">
        <div className="j-friend-invite-copy">
          <h3>{invite.tenHienThi}</h3>
          <p className="j-friend-slug">@{invite.slug}</p>
          {invite.bio ? <p className="j-friend-bio">{invite.bio}</p> : null}
          <div className="j-friend-stats" aria-label="Thống kê hồ sơ">
            <span>
              <strong>{invite.stats.cotMoc}</strong>
              Journey
            </span>
            <span>
              <strong>{invite.stats.tacPham}</strong>
              Gallery
            </span>
            <span>
              <strong>{invite.stats.banBe}</strong>
              Bạn bè
            </span>
          </div>
          <div className="j-friend-meta">
            {invite.giaiDoan ? <span>{invite.giaiDoan}</span> : null}
            {invite.tinhThanh ? <span>{invite.tinhThanh}</span> : null}
          </div>
        </div>
        <div className="j-friend-invite-actions">
          <button
            type="button"
            className="j-friend-action is-accept"
            disabled={disabled}
            onClick={onAccept}
          >
            <Check size={13} aria-hidden />
            Chấp nhận
          </button>
          <button
            type="button"
            className="j-friend-action is-decline"
            disabled={disabled}
            onClick={onDecline}
          >
            <X size={13} aria-hidden />
            Từ chối
          </button>
          <Link href={`/${invite.slug}`} className="j-friend-link j-friend-invite-journey">
            Xem Journey
          </Link>
        </div>
      </div>
    </article>
  );
}
