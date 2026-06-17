"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { JourneyFriendCard } from "@/components/journey/JourneyFriendCard";
import { JourneyFriendInviteCard } from "@/components/journey/JourneyFriendInviteCard";
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
  viewerProfileId?: string | null;
};

export function JourneyFriendsView({
  initialFriends,
  totalCount,
  scrollLoad,
  friends: legacyFriends,
  isOwner = false,
  viewerProfileId = null,
}: Props) {
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

  const respondInvite = (
    request: PendingFollowRequest,
    action: "accept" | "decline",
  ) => {
    const recordId = request.ketBanId;
    if (!recordId) return;
    startTransition(async () => {
      const res = await fetch(`/api/ket-ban/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) return;

      setInvites((prev) =>
        prev.filter((invite) => invite.ketBanId !== recordId),
      );
      setInviteCount((prev) => Math.max(0, prev - 1));

      if (action === "accept") {
        setItems((prev) => {
          if (prev.some((friend) => friend.idNguoiDung === request.idNguoiDung)) {
            return prev;
          }
          return [request, ...prev];
        });
      }

      await loadInvites();
      emitNotificationsChanged();
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

  const count = legacyFriends
    ? legacyFriends.length
    : Math.max(totalCount ?? 0, items.length);
  const showEmpty =
    !loadingInvites && invites.length === 0 && items.length === 0;

  return (
    <section className="j-main-panel" aria-label="Bạn bè">
      <div className="j-main-panel-head">
        <span>Bạn bè</span>
        <strong className="j-friends-head-count">
          {count} người
          {isOwner && inviteCount > 0 ? (
            <em className="j-friends-invite-pill">{inviteCount} lời mời</em>
          ) : null}
        </strong>
      </div>

      {showEmpty ? (
        <div className="j-main-empty">
          Chưa có bạn bè. Gửi lời mời kết bạn — khi được chấp nhận, hồ sơ sẽ xuất hiện ở đây.
        </div>
      ) : (
        <>
          {isOwner && (loadingInvites || invites.length > 0) ? (
            <div className="j-friends-invites" aria-label="Lời mời kết bạn">
              {loadingInvites && invites.length === 0 ? (
                <div className="j-main-empty j-friends-invites-status">
                  Đang tải lời mời…
                </div>
              ) : null}
              {invites.map((invite) => (
                <JourneyFriendInviteCard
                  key={invite.ketBanId ?? invite.idNguoiDung}
                  invite={invite}
                  disabled={pending}
                  onAccept={() => respondInvite(invite, "accept")}
                  onDecline={() => respondInvite(invite, "decline")}
                />
              ))}
            </div>
          ) : null}
          {items.length > 0 ? (
            <div className="j-friends-grid">
              {items.map((friend) => (
                <JourneyFriendCard
                  key={friend.idNguoiDung}
                  friend={friend}
                  viewerProfileId={viewerProfileId}
                  friendsAreMutual={isOwner}
                />
              ))}
            </div>
          ) : null}
        </>
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
