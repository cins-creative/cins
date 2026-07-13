"use client";

import { JourneyFriendCardActions } from "@/components/journey/JourneyFriendCardActions";
import { useMutualFriends } from "@/lib/social/use-mutual-friends";
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
  const mutual = useMutualFriends(friend.idNguoiDung, viewerProfileId);
  const metaLine = [friend.giaiDoan, friend.tinhThanh].filter(Boolean).join(", ");

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
      <div className="j-friend-body">
        <div className="j-friend-avatar">
          {friend.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={friend.avatarUrl} alt="" loading="lazy" />
          ) : (
            <span>{(friend.tenHienThi || friend.slug).slice(0, 1)}</span>
          )}
        </div>
        <h3>{friend.tenHienThi}</h3>
        {metaLine ? <p className="j-friend-meta">{metaLine}</p> : null}
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
        <JourneyFriendCardActions
          friend={friend}
          viewerProfileId={viewerProfileId}
          friendsAreMutual={friendsAreMutual}
        />
      </div>
    </article>
  );
}
