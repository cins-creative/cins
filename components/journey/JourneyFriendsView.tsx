import Link from "next/link";

import type { MutualFriendProfile } from "@/lib/social/types";

type Props = {
  friends: ReadonlyArray<MutualFriendProfile>;
};

export function JourneyFriendsView({ friends }: Props) {
  return (
    <section className="j-main-panel" aria-label="Bạn bè">
      <div className="j-main-panel-head">
        <span>Bạn bè</span>
        <strong>{friends.length} người</strong>
      </div>
      {friends.length === 0 ? (
        <div className="j-main-empty">
          Chưa có bạn bè. Khi hai người theo dõi lẫn nhau, hồ sơ sẽ xuất hiện ở đây.
        </div>
      ) : (
        <div className="j-friends-grid">
          {friends.map((friend) => (
            <article key={friend.idNguoiDung} className="j-friend-card">
              <div
                className={`j-friend-cover${friend.coverUrl ? " has-img" : ""}`}
                aria-hidden
              >
                {friend.coverUrl ? <img src={friend.coverUrl} alt="" /> : null}
              </div>
              <div className="j-friend-avatar">
                {friend.avatarUrl ? (
                  <img src={friend.avatarUrl} alt="" />
                ) : (
                  <span>{(friend.tenHienThi || friend.slug).slice(0, 1)}</span>
                )}
              </div>
              <div className="j-friend-body">
                <h3>{friend.tenHienThi}</h3>
                <p className="j-friend-slug">@{friend.slug}</p>
                {friend.bio ? <p className="j-friend-bio">{friend.bio}</p> : null}
                <div className="j-friend-meta">
                  {friend.giaiDoan ? <span>{friend.giaiDoan}</span> : null}
                  {friend.tinhThanh ? <span>{friend.tinhThanh}</span> : null}
                </div>
                <Link href={`/${friend.slug}/journey`} className="j-friend-link">
                  Xem Journey
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
