"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { useCinsChatContext } from "@/components/cins/CinsChatProvider";
import {
  CHAT_ORG_KIND_LABEL,
  type ChatThread,
} from "@/lib/chat/types";
import type { MutualFriendProfile } from "@/lib/social/types";

type Props = {
  shareUrl: string;
  shareTitle?: string | null;
  onDone: (message: string) => void;
};

/** Mục tiêu gửi thống nhất — bạn bè (1-1), nhóm chat, hoặc tổ chức. */
type ShareTarget = {
  /** Khoá chọn duy nhất: `friend:<userId>` | `group:<roomId>` | `org:<roomId>`. */
  key: string;
  kind: "friend" | "group" | "org";
  /** userId (bạn bè) hoặc roomId (nhóm/org). */
  id: string;
  name: string;
  /** Dùng để tìm kiếm (bạn bè có @slug; nhóm/org dùng tên). */
  slug: string;
  avatarUrl: string | null;
  initial: string;
  subtitle: string;
  /** Mốc chat gần nhất — sắp xếp giảm dần. */
  lastAt: number;
};

type ShareKindFilter = "all" | "friend" | "group" | "org";

const KIND_FILTER_ORDER: ShareKindFilter[] = ["all", "friend", "group", "org"];

const KIND_FILTER_LABEL: Record<ShareKindFilter, string> = {
  all: "Tất cả",
  friend: "Bạn bè",
  group: "Nhóm",
  org: "Tổ chức",
};

function buildTargets(
  friends: MutualFriendProfile[],
  threads: ChatThread[],
): ShareTarget[] {
  const lastAtByPeer = new Map<string, number>();
  const groups: ShareTarget[] = [];
  const orgs: ShareTarget[] = [];

  for (const thread of threads) {
    if (thread.kind === "org") {
      // Bỏ optimistic placeholder (`org:<uuid>`) — chưa có phòng thật để gửi.
      if (!thread.roomId || thread.roomId.startsWith("org:")) continue;
      if (thread.roomTrangThai === "an") continue;
      const ts = Date.parse(thread.lastAt);
      const name = thread.name?.trim() || "Tổ chức";
      const orgLabel =
        (thread.orgKind && CHAT_ORG_KIND_LABEL[thread.orgKind]) || "Tổ chức";
      orgs.push({
        key: `org:${thread.roomId}`,
        kind: "org",
        id: thread.roomId,
        name,
        slug: name.toLowerCase(),
        avatarUrl: thread.avatarUrl ?? null,
        initial: thread.avatarInitial || name.charAt(0).toUpperCase(),
        subtitle: orgLabel,
        lastAt: Number.isFinite(ts) ? ts : 0,
      });
      continue;
    }

    if (thread.isGroup) {
      if (!thread.roomId || thread.roomTrangThai === "an") continue;
      const ts = Date.parse(thread.lastAt);
      const count = thread.memberCount ?? thread.memberIds?.length ?? 0;
      const name = thread.name?.trim() || "Nhóm chat";
      groups.push({
        key: `group:${thread.roomId}`,
        kind: "group",
        id: thread.roomId,
        name,
        slug: name.toLowerCase(),
        avatarUrl: thread.avatarUrl ?? null,
        initial: name.charAt(0).toUpperCase(),
        subtitle: count > 0 ? `Nhóm · ${count} thành viên` : "Nhóm chat",
        lastAt: Number.isFinite(ts) ? ts : 0,
      });
      continue;
    }

    if (!thread.peerUserId) continue;
    const ts = Date.parse(thread.lastAt);
    if (!Number.isFinite(ts)) continue;
    const prev = lastAtByPeer.get(thread.peerUserId) ?? 0;
    if (ts > prev) lastAtByPeer.set(thread.peerUserId, ts);
  }

  const friendTargets: ShareTarget[] = friends.map((friend) => {
    const lastAt = lastAtByPeer.get(friend.idNguoiDung) ?? 0;
    return {
      key: `friend:${friend.idNguoiDung}`,
      kind: "friend" as const,
      id: friend.idNguoiDung,
      name: friend.tenHienThi,
      slug: friend.slug,
      avatarUrl: friend.avatarUrl ?? null,
      initial: friend.tenHienThi.charAt(0).toUpperCase(),
      subtitle: `${lastAt > 0 ? "Chat gần đây · " : ""}@${friend.slug}`,
      lastAt,
    };
  });

  return [...orgs, ...groups, ...friendTargets].sort((a, b) => {
    if (a.lastAt !== b.lastAt) return b.lastAt - a.lastAt;
    return a.name.localeCompare(b.name, "vi");
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

async function postMessage(
  roomId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const msgRes = await fetch(
    `/api/chat/rooms/${encodeURIComponent(roomId)}/messages`,
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

async function sendLinkToTarget(
  target: ShareTarget,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (target.kind === "group" || target.kind === "org") {
    return postMessage(target.id, body);
  }

  const openRes = await fetch("/api/chat/rooms/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_nguoi: target.id }),
  });
  const openJson = (await openRes.json().catch(() => null)) as {
    thread?: ChatThread;
    error?: string;
  } | null;
  if (!openRes.ok || !openJson?.thread?.roomId) {
    return { ok: false, error: openJson?.error ?? "Không mở được hội thoại." };
  }
  return postMessage(openJson.thread.roomId, body);
}

/** Chọn bạn bè / nhóm / tổ chức → gửi link bài qua tin nhắn (ưu tiên chat gần nhất). */
export function SharePostToFriendsPanel({
  shareUrl,
  shareTitle,
  onDone,
}: Props) {
  const chat = useCinsChatContext();
  const getCachedThreads = chat?.getCachedThreads;
  const prefetchChatData = chat?.prefetchChatData;
  const [targets, setTargets] = useState<ShareTarget[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<ShareKindFilter>("all");
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
        setTargets(buildTargets(friendList, threads));
      } catch (err) {
        if (cancelled) return;
        setTargets([]);
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

  const kindCounts = useMemo(() => {
    const counts: Record<ShareKindFilter, number> = {
      all: targets.length,
      friend: 0,
      group: 0,
      org: 0,
    };
    for (const t of targets) counts[t.kind] += 1;
    return counts;
  }, [targets]);

  const visibleFilters = useMemo(
    () => KIND_FILTER_ORDER.filter((f) => f === "all" || kindCounts[f] > 0),
    [kindCounts],
  );

  const filtered = useMemo(() => {
    const byKind =
      kindFilter === "all"
        ? targets
        : targets.filter((t) => t.kind === kindFilter);
    const q = query.trim().toLowerCase();
    if (!q) return byKind;
    return byKind.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
    );
  }, [targets, query, kindFilter]);

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      if (filtered.length === 0) return prev;
      const allOn = filtered.every((t) => prev.has(t.key));
      if (allOn) {
        const next = new Set(prev);
        for (const t of filtered) next.delete(t.key);
        return next;
      }
      const next = new Set(prev);
      for (const t of filtered) next.add(t.key);
      return next;
    });
  }, [filtered]);

  const send = useCallback(() => {
    if (selected.size === 0 || !shareUrl) return;
    const title = shareTitle?.trim();
    const body = title ? `${title}\n${shareUrl}` : shareUrl;
    const chosen = targets.filter((t) => selected.has(t.key));

    startTransition(async () => {
      setError(null);
      let okCount = 0;
      const failures: string[] = [];

      for (const target of chosen) {
        const result = await sendLinkToTarget(target, body);
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
          : `Đã gửi link cho ${okCount} cuộc trò chuyện.`,
      );
    });
  }, [onDone, selected, shareTitle, shareUrl, targets]);

  if (loading) {
    return (
      <p className="j-m-share-friends-empty">Đang tải bạn bè, nhóm, tổ chức…</p>
    );
  }

  if (error && targets.length === 0) {
    return <p className="j-m-share-friends-empty">{error}</p>;
  }

  if (targets.length === 0) {
    return (
      <p className="j-m-share-friends-empty">
        Bạn chưa có bạn bè, nhóm chat hoặc tổ chức để gửi.
      </p>
    );
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((t) => selected.has(t.key));

  const searchPlaceholder =
    kindFilter === "friend"
      ? "Tìm bạn bè"
      : kindFilter === "group"
        ? "Tìm nhóm chat"
        : kindFilter === "org"
          ? "Tìm tổ chức"
          : "Tìm bạn bè, nhóm hoặc tổ chức";

  return (
    <div className="j-m-share-friends">
      {visibleFilters.length > 1 ? (
        <div
          className="j-m-share-friends-filters"
          role="tablist"
          aria-label="Lọc theo loại"
        >
          {visibleFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={kindFilter === filter}
              className={
                "j-m-share-friends-filter" +
                (kindFilter === filter ? " is-active" : "")
              }
              disabled={pending}
              onClick={() => setKindFilter(filter)}
            >
              {KIND_FILTER_LABEL[filter]}
              {kindCounts[filter] > 0 ? (
                <span className="j-m-share-friends-filter-count">
                  {kindCounts[filter]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="j-m-share-friends-search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
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
        aria-label="Chọn bạn bè, nhóm hoặc tổ chức để gửi"
        aria-multiselectable="true"
      >
        {filtered.map((target) => {
          const checked = selected.has(target.key);
          const avatarMod =
            target.kind === "group"
              ? " is-group"
              : target.kind === "org"
                ? " is-org"
                : "";
          return (
            <li key={target.key}>
              <button
                type="button"
                role="option"
                aria-selected={checked}
                disabled={pending}
                className={
                  "j-m-share-friends-row" + (checked ? " is-selected" : "")
                }
                onClick={() => toggle(target.key)}
              >
                {target.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={target.avatarUrl}
                    alt=""
                    className={"j-m-share-friends-avatar" + avatarMod}
                    width={32}
                    height={32}
                  />
                ) : (
                  <span
                    className={
                      "j-m-share-friends-avatar is-fallback" + avatarMod
                    }
                    aria-hidden
                  >
                    {target.initial}
                  </span>
                )}
                <span className="j-m-share-friends-copy">
                  <strong>{target.name}</strong>
                  <span>{target.subtitle}</span>
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
        <p className="j-m-share-friends-empty">
          Không tìm thấy kết quả phù hợp.
        </p>
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
            : "Chọn để gửi"}
      </button>
    </div>
  );
}
