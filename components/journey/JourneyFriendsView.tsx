"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { emitNotificationsChanged } from "@/lib/journey/notifications-client";
import type { MutualFriendProfile, PendingFollowRequest } from "@/lib/social/types";

type ScrollLoadConfig = {
  ownerSlug: string;
  hasMore: boolean;
  nextOffset: number;
};

type Props = {
  initialFriends?: ReadonlyArray<MutualFriendProfile>;
  totalCount?: number;
  scrollLoad?: ScrollLoadConfig;
  friends?: ReadonlyArray<MutualFriendProfile>;
  isOwner?: boolean;
};

type FriendsTab = "friends" | "invites";

export function JourneyFriendsView({
  initialFriends,
  totalCount,
  scrollLoad,
  friends: legacyFriends,
  isOwner = false,
}: Props) {
  const [tab, setTab] = useState<FriendsTab>("friends");
  const [inviteCount, setInviteCount] = useState(0);
  const [invites, setInvites] = useState<PendingFollowRequest[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<MutualFriendProfile[]>(() =>
    legacyFriends ? [...legacyFriends] : [...(initialFriends ?? [])],
  );
  const [hasMore, setHasMore] = useState(scrollLoad?.hasMore ?? false);
  const [nextOffset, setNextOffset] = useState(
    scrollLoad?.nextOffset ?? (initialFriends?.length ?? 0),
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadInvites = useCallback(async () => {
    if (!isOwner) return;
    setLoadingInvites(true);
    try {
      const res = await fetch("/api/ket-ban/loi-moi");
      if (!res.ok) return;
      const data = (await res.json()) as {
        invites: PendingFollowRequest[];
        count: number;
      };
      setInvites(data.invites ?? []);
      setInviteCount(data.count ?? 0);
    } finally {
      setLoadingInvites(false);
    }
  }, [isOwner]);

  useEffect(() => {
    if (isOwner) void loadInvites();
  }, [isOwner, loadInvites]);

  const respondInvite = (request: PendingFollowRequest, action: "accept" | "decline") => {
    const recordId = request.ketBanId;
    if (!recordId) return;
    startTransition(async () => {
      const res = await fetch(`/api/ket-ban/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await loadInvites();
        emitNotificationsChanged();
      }
    });
  };

  useEffect(() => {
    if (legacyFriends) return;
    setItems([...(initialFriends ?? [])]);
    setHasMore(scrollLoad?.hasMore ?? false);
    setNextOffset(scrollLoad?.nextOffset ?? (initialFriends?.length ?? 0));
    setLoadError(false);
  }, [initialFriends, scrollLoad?.hasMore, scrollLoad?.nextOffset, legacyFriends]);

  const loadMore = useCallback(async () => {
    if (!scrollLoad || loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const res = await fetch(
        `/api/journey/${encodeURIComponent(scrollLoad.ownerSlug)}/friends?offset=${nextOffset}`,
      );
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as {
        friends: MutualFriendProfile[];
        hasMore: boolean;
        nextOffset: number;
      };
      setItems((prev) => {
        const seen = new Set(prev.map((f) => f.idNguoiDung));
        const extra = data.friends.filter((f) => !seen.has(f.idNguoiDung));
        return [...prev, ...extra];
      });
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch {
      setLoadError(true);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [scrollLoad, hasMore, nextOffset]);

  useEffect(() => {
    if (!scrollLoad || !hasMore || legacyFriends) return;
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { root: null, rootMargin: "480px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [scrollLoad, hasMore, loadMore, items.length, legacyFriends]);

  const count = legacyFriends ? legacyFriends.length : (totalCount ?? items.length);

  if (isOwner && tab === "invites") {
    return (
      <section className="j-main-panel" aria-label="Lời mời kết bạn">
        <div className="j-main-panel-head">
          <span>Lời mời</span>
          <strong>{inviteCount} lời mời</strong>
        </div>
        {isOwner ? (
          <div className="j-friends-tabs" role="tablist" aria-label="Bạn bè và lời mời">
            <button
              type="button"
              role="tab"
              className="j-friends-tab"
              onClick={() => setTab("friends")}
            >
              Bạn bè
            </button>
            <button
              type="button"
              role="tab"
              aria-selected
              className="j-friends-tab is-active"
            >
              Lời mời
              {inviteCount > 0 ? <em>{inviteCount}</em> : null}
            </button>
          </div>
        ) : null}
        {loadingInvites ? (
          <div className="j-main-empty">Đang tải…</div>
        ) : invites.length === 0 ? (
          <div className="j-main-empty">Không có lời mời đang chờ.</div>
        ) : (
          <ul className="j-friends-invite-list">
            {invites.map((invite) => (
              <li key={invite.ketBanId ?? invite.idNguoiDung} className="j-friends-invite-row">
                <Link href={`/${invite.slug}`} className="j-friends-invite-user">
                  {invite.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={invite.avatarUrl} alt="" width={40} height={40} />
                  ) : (
                    <span aria-hidden>{(invite.tenHienThi || invite.slug).slice(0, 1)}</span>
                  )}
                  <span>
                    <strong>{invite.tenHienThi}</strong>
                    <small>@{invite.slug}</small>
                  </span>
                </Link>
                <div className="j-friends-invite-actions">
                  <button
                    type="button"
                    className="j-friend-action is-accept"
                    disabled={pending}
                    onClick={() => respondInvite(invite, "accept")}
                  >
                    <Check size={13} aria-hidden />
                    Chấp nhận
                  </button>
                  <button
                    type="button"
                    className="j-friend-action is-decline"
                    disabled={pending}
                    onClick={() => respondInvite(invite, "decline")}
                  >
                    <X size={13} aria-hidden />
                    Từ chối
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section className="j-main-panel" aria-label="Bạn bè">
      <div className="j-main-panel-head">
        <span>Bạn bè</span>
        <strong>{count} người</strong>
      </div>
      {isOwner ? (
        <div className="j-friends-tabs" role="tablist" aria-label="Bạn bè và lời mời">
          <button
            type="button"
            role="tab"
            aria-selected
            className="j-friends-tab is-active"
          >
            Bạn bè
          </button>
          <button
            type="button"
            role="tab"
            className={`j-friends-tab${tab === "invites" ? " is-active" : ""}`}
            onClick={() => setTab("invites")}
          >
            Lời mời
            {inviteCount > 0 ? <em>{inviteCount}</em> : null}
          </button>
        </div>
      ) : null}
      {items.length === 0 ? (
        <div className="j-main-empty">
          Chưa có bạn bè. Gửi lời mời kết bạn — khi được chấp nhận, hồ sơ sẽ xuất hiện ở đây.
        </div>
      ) : (
        <div className="j-friends-grid">
          {items.map((friend) => (
            <article key={friend.idNguoiDung} className="j-friend-card">
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
                <div className="j-friend-actions">
                  <button type="button" className="j-friend-message" disabled>
                    Nhắn tin
                  </button>
                  <Link href={`/${friend.slug}`} className="j-friend-link">
                    Xem Journey
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {scrollLoad && hasMore && !legacyFriends ? (
        <div ref={sentinelRef} className="j-timeline-scroll-sentinel" aria-hidden />
      ) : null}

      {loadingMore ? (
        <div className="j-skel-friends-grid" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="j-skel j-skel-friend-card" />
          ))}
        </div>
      ) : null}

      {loadError ? (
        <div className="j-timeline-load-retry-wrap">
          <button
            type="button"
            className="j-timeline-load-retry"
            onClick={() => void loadMore()}
          >
            Không tải được thêm bạn bè — thử lại
          </button>
        </div>
      ) : null}
    </section>
  );
}
