"use client";

import { JourneyFriendCardActions } from "@/components/journey/JourneyFriendCardActions";
import type { MutualFriendProfile } from "@/lib/social/types";

type Props = {
  friend: MutualFriendProfile;
  viewerProfileId: string | null;
  friendsAreMutual?: boolean;
};

export function JourneyFriendCard({
  friend,
  viewerProfileId,
  friendsAreMutual = false,
}: Props) {
  return (
    <article className="j-friend-card">
      <div
        className={`j-friend-cover${friend.coverUrl ? " has-img" : ""}`}
        aria-hidden
      >
        {friend.coverUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={friend.coverUrl} alt="" loading="lazy" />
        ) : null}
      </div>
      <div className="j-friend-avatar">
        {friend.avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={friend.avatarUrl} alt="" loading="lazy" />
        ) : (
          <span>{(friend.tenHienThi || friend.slug).slice(0, 1)}</span>
        )}
      </div>
      <div className="j-friend-body">
        <h3>{friend.tenHienThi}</h3>
        <p className="j-friend-slug">@{friend.slug}</p>
        {friend.bio ? <p className="j-friend-bio">{friend.bio}</p> : null}
        <div className="j-friend-stats" aria-label="Thống kê hồ sơ bạn bè">
          <span>
            <strong>{friend.stats.cotMoc}</strong>
            Journey
          </span>
          <span>
            <strong>{friend.stats.tacPham}</strong>
            Gallery
          </span>
          <span>
            <strong>{friend.stats.banBe}</strong>
            Bạn bè
          </span>
        </div>
        <div className="j-friend-meta">
          {friend.giaiDoan ? <span>{friend.giaiDoan}</span> : null}
          {friend.tinhThanh ? <span>{friend.tinhThanh}</span> : null}
        </div>
        <JourneyFriendCardActions
          friend={friend}
          viewerProfileId={viewerProfileId}
          friendsAreMutual={friendsAreMutual}
        />
      </div>
    </article>
  );
}
