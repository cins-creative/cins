"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { MutualFriendProfile } from "@/lib/social/types";

type ScrollLoadConfig = {
  ownerSlug: string;
  hasMore: boolean;
  nextOffset: number;
};

type Props = {
  initialFriends?: ReadonlyArray<MutualFriendProfile>;
  totalCount?: number;
  scrollLoad?: ScrollLoadConfig;
  /** Legacy prop — danh sách đầy đủ không scroll. */
  friends?: ReadonlyArray<MutualFriendProfile>;
};

export function JourneyFriendsView({
  initialFriends,
  totalCount,
  scrollLoad,
  friends: legacyFriends,
}: Props) {
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

  return (
    <section className="j-main-panel" aria-label="Bạn bè">
      <div className="j-main-panel-head">
        <span>Bạn bè</span>
        <strong>{count} người</strong>
      </div>
      {items.length === 0 ? (
        <div className="j-main-empty">
          Chưa có bạn bè. Khi hai người theo dõi lẫn nhau, hồ sơ sẽ xuất hiện ở đây.
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
