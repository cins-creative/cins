"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { useCinsChatContext } from "@/components/cins/CinsChatProvider";
import type { ChatThread } from "@/lib/chat/types";
import type { MutualFriendProfile } from "@/lib/social/types";

type Props = {
  shareUrl: string;
  shareTitle?: string | null;
  onDone: (message: string) => void;
};

type FriendRow = MutualFriendProfile & {
  lastChatAt: number;
};

function sortFriendsByRecentChat(
  friends: MutualFriendProfile[],
  threads: ChatThread[],
): FriendRow[] {
  const lastAtByPeer = new Map<string, number>();
  for (const thread of threads) {
    if (!thread.peerUserId || thread.isGroup) continue;
    const ts = Date.parse(thread.lastAt);
    if (!Number.isFinite(ts)) continue;
    const prev = lastAtByPeer.get(thread.peerUserId) ?? 0;
    if (ts > prev) lastAtByPeer.set(thread.peerUserId, ts);
  }

  return friends
    .map((friend) => ({
      ...friend,
      lastChatAt: lastAtByPeer.get(friend.idNguoiDung) ?? 0,
    }))
    .sort((a, b) => {
      if (a.lastChatAt !== b.lastChatAt) return b.lastChatAt - a.lastChatAt;
      return a.tenHienThi.localeCompare(b.tenHienThi, "vi");
    });
}

async function loadAllFriends(): Promise<MutualFriendProfile[]> {
  const out: MutualFriendProfile[] = [];
  let offset = 0;
  for (let page = 0; page < 8; page += 1) {
    const res = await fetch(`/api/ket-ban/danh-sach?offset=${offset}`, {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as {
      friends?: MutualFriendProfile[];
      nextOffset?: number;
      hasMore?: boolean;
      error?: string;
    } | null;
    if (!res.ok) {
      throw new Error(json?.error ?? "Không tải được danh sách bạn bè.");
    }
    const batch = Array.isArray(json?.friends) ? json.friends : [];
    out.push(...batch);
    if (!json?.hasMore || batch.length === 0) break;
    offset = json.nextOffset ?? offset + batch.length;
  }
  return out;
}

async function loadChatThreads(): Promise<ChatThread[]> {
  const res = await fetch("/api/chat/threads", { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as {
    threads?: ChatThread[];
    error?: string;
  } | null;
  if (!res.ok) return [];
  return Array.isArray(json?.threads) ? json.threads : [];
}

async function sendLinkToFriend(
  friendId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const openRes = await fetch("/api/chat/rooms/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_nguoi: friendId }),
  });
  const openJson = (await openRes.json().catch(() => null)) as {
    thread?: ChatThread;
    error?: string;
  } | null;
  if (!openRes.ok || !openJson?.thread?.roomId) {
    return { ok: false, error: openJson?.error ?? "Không mở được hội thoại." };
  }

  const msgRes = await fetch(
    `/api/chat/rooms/${encodeURIComponent(openJson.thread.roomId)}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noi_dung: body }),
    },
  );
  const msgJson = (await msgRes.json().catch(() => null)) as {
    error?: string;
  } | null;
  if (!msgRes.ok) {
    return { ok: false, error: msgJson?.error ?? "Không gửi được tin nhắn." };
  }
  return { ok: true };
}

/** Chọn bạn bè → gửi link bài qua tin nhắn 1-1 (ưu tiên chat gần nhất). */
export function SharePostToFriendsPanel({
  shareUrl,
  shareTitle,
  onDone,
}: Props) {
  const chat = useCinsChatContext();
  const getCachedThreads = chat?.getCachedThreads;
  const prefetchChatData = chat?.prefetchChatData;
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const cached = getCachedThreads?.()?.threads ?? null;
        let threadsPromise: Promise<ChatThread[]>;
        if (cached && cached.length > 0) {
          threadsPromise = Promise.resolve(cached);
        } else if (prefetchChatData) {
          threadsPromise = prefetchChatData().then(
            (snap) => snap?.threads ?? [],
          );
        } else {
          threadsPromise = loadChatThreads();
        }

        const [friendList, threads] = await Promise.all([
          loadAllFriends(),
          threadsPromise,
        ]);
        if (cancelled) return;
        setFriends(sortFriendsByRecentChat(friendList, threads));
      } catch (err) {
        if (cancelled) return;
        setFriends([]);
        setError(
          err instanceof Error
            ? err.message
            : "Không tải được danh sách bạn bè.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getCachedThreads, prefetchChatData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.tenHienThi.toLowerCase().includes(q) ||
        f.slug.toLowerCase().includes(q),
    );
  }, [friends, query]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      if (filtered.length === 0) return prev;
      const allOn = filtered.every((f) => prev.has(f.idNguoiDung));
      if (allOn) return new Set();
      return new Set(filtered.map((f) => f.idNguoiDung));
    });
  }, [filtered]);

  const send = useCallback(() => {
    if (selected.size === 0 || !shareUrl) return;
    const title = shareTitle?.trim();
    const body = title ? `${title}\n${shareUrl}` : shareUrl;

    startTransition(async () => {
      setError(null);
      let okCount = 0;
      const failures: string[] = [];

      for (const friendId of selected) {
        const result = await sendLinkToFriend(friendId, body);
        if (result.ok) okCount += 1;
        else failures.push(result.error);
      }

      if (okCount === 0) {
        setError(failures[0] ?? "Không gửi được tin nhắn.");
        return;
      }

      onDone(
        okCount === 1
          ? "Đã gửi link qua tin nhắn."
          : `Đã gửi link cho ${okCount} người.`,
      );
    });
  }, [onDone, selected, shareTitle, shareUrl]);

  if (loading) {
    return <p className="j-m-share-friends-empty">Đang tải bạn bè…</p>;
  }

  if (error && friends.length === 0) {
    return <p className="j-m-share-friends-empty">{error}</p>;
  }

  if (friends.length === 0) {
    return (
      <p className="j-m-share-friends-empty">
        Bạn chưa có bạn bè trên CINs để gửi.
      </p>
    );
  }

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((f) => selected.has(f.idNguoiDung));

  return (
    <div className="j-m-share-friends">
      <div className="j-m-share-friends-search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên hoặc @slug"
          aria-label="Tìm bạn bè"
          disabled={pending}
          autoComplete="off"
        />
      </div>

      <div className="j-m-share-friends-toolbar">
        <button
          type="button"
          className="j-m-share-friends-select-all"
          disabled={pending || filtered.length === 0}
          onClick={toggleSelectAll}
        >
          {allFilteredSelected ? "Bỏ chọn" : "Chọn tất cả"}
        </button>
        <span className="j-m-share-friends-meta">
          {selected.size}/{filtered.length}
        </span>
      </div>

      <ul
        className="j-m-share-friends-list"
        role="listbox"
        aria-label="Chọn bạn bè để gửi"
        aria-multiselectable="true"
      >
        {filtered.map((friend) => {
          const checked = selected.has(friend.idNguoiDung);
          return (
            <li key={friend.idNguoiDung}>
              <button
                type="button"
                role="option"
                aria-selected={checked}
                disabled={pending}
                className={
                  "j-m-share-friends-row" + (checked ? " is-selected" : "")
                }
                onClick={() => toggle(friend.idNguoiDung)}
              >
                {friend.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={friend.avatarUrl}
                    alt=""
                    className="j-m-share-friends-avatar"
                    width={32}
                    height={32}
                  />
                ) : (
                  <span
                    className="j-m-share-friends-avatar is-fallback"
                    aria-hidden
                  >
                    {friend.tenHienThi.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="j-m-share-friends-copy">
                  <strong>{friend.tenHienThi}</strong>
                  <span>
                    {friend.lastChatAt > 0 ? "Chat gần đây · " : ""}@{friend.slug}
                  </span>
                </span>
                <span
                  className={
                    "j-m-share-friends-check" + (checked ? " is-on" : "")
                  }
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 ? (
        <p className="j-m-share-friends-empty">Không tìm thấy bạn phù hợp.</p>
      ) : null}

      {error ? <p className="j-m-share-friends-error">{error}</p> : null}

      <button
        type="button"
        className="j-m-share-friends-send"
        disabled={pending || selected.size === 0}
        onClick={send}
      >
        {pending
          ? "Đang gửi…"
          : selected.size > 0
            ? `Gửi tin nhắn (${selected.size})`
            : "Chọn bạn để gửi"}
      </button>
    </div>
  );
}
