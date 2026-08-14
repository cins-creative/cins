"use client";

import { Loader2, MessageSquarePlus, Search, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { avatarBg, avatarInitialFromName } from "@/lib/chat/avatar";
import { getAvatarUrl } from "@/lib/journey/profile";
import type { ChatThread } from "@/lib/chat/types";

type UserRow = {
  id: string;
  slug: string;
  ten_hien_thi: string;
  avatar_id: string | null;
  avatarUrl?: string | null;
};

export type ChatCreateGroupPresetMember = {
  id: string;
  slug: string;
  ten_hien_thi: string;
  avatar_id?: string | null;
  avatarUrl?: string | null;
};

type ModalTab = "chat" | "nhom";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (thread: ChatThread) => void;
  /** Mở thẳng tab tạo nhóm (vd. từ menu hội thoại). */
  initialTab?: ModalTab;
  /** Gắn sẵn thành viên khi mở tab nhóm. */
  presetMembers?: ChatCreateGroupPresetMember[];
};

function toUserRow(member: ChatCreateGroupPresetMember): UserRow {
  return {
    id: member.id,
    slug: member.slug,
    ten_hien_thi: member.ten_hien_thi,
    avatar_id: member.avatar_id ?? null,
    avatarUrl: member.avatarUrl ?? null,
  };
}

function FriendAvatar({
  name,
  avatarId,
  avatarUrl,
}: {
  name: string;
  avatarId: string | null;
  avatarUrl?: string | null;
}) {
  const url = avatarUrl?.trim() || getAvatarUrl(avatarId);
  const initial = avatarInitialFromName(name);

  return (
    <span
      className={`cins-chat-group-pick-avatar${url ? " has-image" : ""}`}
      style={{ background: url ? "transparent" : avatarBg(name.length * 17) }}
      aria-hidden
    >
      {url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={url} alt="" />
      ) : (
        initial
      )}
    </span>
  );
}

async function searchUsers(params: {
  q?: string;
  friendsOnly?: boolean;
  mutualOnly?: boolean;
  rankRelation?: boolean;
}): Promise<UserRow[]> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.friendsOnly) sp.set("friends_only", "true");
  if (params.mutualOnly) sp.set("mutual_only", "true");
  if (params.rankRelation) sp.set("rank_relation", "true");
  const res = await fetch(`/api/users/search?${sp.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Không tải được danh sách người dùng.");
  const json = (await res.json()) as { users?: UserRow[] };
  return json.users ?? [];
}

export function ChatCreateGroupModal({
  open,
  onClose,
  onCreated,
  initialTab = "chat",
  presetMembers,
}: Props) {
  const [tab, setTab] = useState<ModalTab>("chat");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [name, setName] = useState("");
  const [chatUsers, setChatUsers] = useState<UserRow[]>([]);
  const [friends, setFriends] = useState<UserRow[]>([]);
  const [userCache, setUserCache] = useState<Map<string, UserRow>>(
    () => new Map(),
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const seeds = (presetMembers ?? []).map(toUserRow);
    setTab(initialTab);
    setQuery("");
    setDebouncedQuery("");
    setName("");
    setSelected(seeds.map((u) => u.id));
    setError(null);
    setChatUsers([]);
    setFriends([]);
    setUserCache(new Map(seeds.map((u) => [u.id, u])));
    setOpeningUserId(null);
  }, [open, initialTab, presetMembers]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [open, query]);

  // Tab tạo chat: gợi ý bạn bè + theo dõi; khi gõ → tìm mọi người (rank quan hệ).
  useEffect(() => {
    if (!open || tab !== "chat") return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const next =
          debouncedQuery.length >= 1
            ? await searchUsers({ q: debouncedQuery, rankRelation: true })
            : await searchUsers({ mutualOnly: true, rankRelation: true });
        if (!cancelled) setChatUsers(next);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Không tải được danh sách.",
          );
          setChatUsers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, tab, debouncedQuery]);

  // Tab nhóm: tìm trên server (không lọc 20 bạn đã tải).
  useEffect(() => {
    if (!open || tab !== "nhom") return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const next = await searchUsers({
          q: debouncedQuery || undefined,
          friendsOnly: true,
          rankRelation: true,
        });
        if (!cancelled) setFriends(next);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Không tải được danh sách bạn bè.",
          );
          setFriends([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, tab, debouncedQuery]);

  useEffect(() => {
    if (chatUsers.length === 0 && friends.length === 0) return;
    setUserCache((prev) => {
      const next = new Map(prev);
      for (const u of chatUsers) next.set(u.id, u);
      for (const u of friends) next.set(u.id, u);
      return next;
    });
  }, [chatUsers, friends]);

  const presetRows = useMemo(
    () => (presetMembers ?? []).map(toUserRow),
    [presetMembers],
  );

  const listUsers = useMemo(() => {
    const base = tab === "chat" ? chatUsers : friends;
    if (tab !== "nhom" || presetRows.length === 0 || debouncedQuery) {
      return base;
    }
    const seen = new Set(base.map((u) => u.id));
    const extra = presetRows.filter((u) => !seen.has(u.id));
    return extra.length > 0 ? [...extra, ...base] : base;
  }, [tab, chatUsers, friends, presetRows, debouncedQuery]);

  const selectedUsers = useMemo(() => {
    return selected
      .map((id) => userCache.get(id))
      .filter((u): u is UserRow => Boolean(u));
  }, [selected, userCache]);

  const toggleMember = useCallback((id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const canSubmitGroup = selected.length >= 2 && !submitting;

  const handleOpenDm = useCallback(
    async (userId: string) => {
      if (submitting || openingUserId) return;
      setOpeningUserId(userId);
      setError(null);
      try {
        const res = await fetch("/api/chat/rooms/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_nguoi: userId }),
        });
        const json = (await res.json()) as {
          thread?: ChatThread;
          error?: string;
        };
        if (!res.ok || !json.thread) {
          throw new Error(json.error ?? "Không mở được hội thoại.");
        }
        onCreated(json.thread);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không mở được hội thoại.");
      } finally {
        setOpeningUserId(null);
      }
    },
    [onClose, onCreated, openingUserId, submitting],
  );

  const handleSubmitGroup = useCallback(async () => {
    if (!canSubmitGroup) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/chat/rooms/create-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_thanh_vien: selected,
          ten_phong: name.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { thread?: ChatThread; error?: string };
      if (!res.ok || !json.thread) {
        throw new Error(json.error ?? "Không tạo được nhóm.");
      }
      onCreated(json.thread);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tạo được nhóm.");
    } finally {
      setSubmitting(false);
    }
  }, [canSubmitGroup, name, onClose, onCreated, selected]);

  if (!open) return null;

  const isChat = tab === "chat";
  const title = isChat ? "Tin nhắn mới" : "Tạo nhóm chat";
  const subtitle = isChat
    ? "Tìm bạn bè hoặc mọi người trên CINs"
    : "Chọn ít nhất 2 bạn bè";
  const searchPlaceholder = isChat
    ? "Tìm theo tên hoặc @slug"
    : "Tìm bạn bè";

  let emptyHint: string;
  if (isChat) {
    emptyHint = debouncedQuery
      ? "Không tìm thấy người phù hợp."
      : "Chưa có bạn bè hay người đang theo dõi. Hãy tìm theo tên.";
  } else if (friends.length === 0) {
    emptyHint = "Bạn chưa có bạn bè để thêm vào nhóm.";
  } else {
    emptyHint = "Không tìm thấy bạn bè phù hợp.";
  }

  return (
    <div className="cins-chat-group-modal-root" role="presentation">
      <button
        type="button"
        className="cins-chat-group-modal-backdrop"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        className="cins-chat-group-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cins-chat-group-modal-title"
      >
        <header className="cins-chat-group-modal-head">
          <span className="cins-chat-group-modal-icon" aria-hidden>
            {isChat ? (
              <MessageSquarePlus size={18} strokeWidth={1.8} />
            ) : (
              <Users size={18} strokeWidth={1.8} />
            )}
          </span>
          <div className="cins-chat-group-modal-head-text">
            <h3 id="cins-chat-group-modal-title">{title}</h3>
            <p>{subtitle}</p>
          </div>
          <button
            type="button"
            className="cins-chat-icon-btn"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={1.8} aria-hidden />
          </button>
        </header>

        <div
          className="cins-chat-create-tabs"
          role="tablist"
          aria-label="Loại hội thoại"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isChat}
            className={`cins-chat-create-tab${isChat ? " is-active" : ""}`}
            onClick={() => {
              setTab("chat");
              setError(null);
              setQuery("");
              setDebouncedQuery("");
            }}
          >
            Tạo chat
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isChat}
            className={`cins-chat-create-tab${!isChat ? " is-active" : ""}`}
            onClick={() => {
              setTab("nhom");
              setError(null);
              setQuery("");
              setDebouncedQuery("");
            }}
          >
            Tạo nhóm
          </button>
        </div>

        {!isChat ? (
          <label className="cins-chat-group-name">
            <span>Tên nhóm (tuỳ chọn)</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Team dự án cuối kỳ"
              maxLength={80}
            />
          </label>
        ) : null}

        <label className="cins-chat-search cins-chat-group-search">
          <Search size={16} strokeWidth={1.8} aria-hidden />
          <input
            type="text"
            inputMode="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            autoFocus
          />
        </label>

        {!isChat && selectedUsers.length > 0 ? (
          <div className="cins-chat-group-selected" aria-live="polite">
            {selectedUsers.map((user) => {
              const label = user.ten_hien_thi?.trim() || user.slug;
              return (
                <button
                  key={user.id}
                  type="button"
                  className="cins-chat-group-chip"
                  onClick={() => toggleMember(user.id)}
                >
                  {label}
                  <X size={12} strokeWidth={2.2} aria-hidden />
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="cins-chat-group-list">
          {loading ? (
            <p className="cins-chat-group-list-empty">
              <Loader2 size={16} className="cins-chat-spin" aria-hidden />
              Đang tìm…
            </p>
          ) : listUsers.length === 0 ? (
            <p className="cins-chat-group-list-empty">{emptyHint}</p>
          ) : (
            <ul role="list">
              {listUsers.map((user) => {
                const label = user.ten_hien_thi?.trim() || user.slug;
                if (isChat) {
                  const busy = openingUserId === user.id;
                  return (
                    <li key={user.id}>
                      <button
                        type="button"
                        className="cins-chat-group-pick"
                        disabled={Boolean(openingUserId)}
                        onClick={() => void handleOpenDm(user.id)}
                      >
                        <FriendAvatar
                          name={label}
                          avatarId={user.avatar_id}
                          avatarUrl={user.avatarUrl}
                        />
                        <span className="cins-chat-group-pick-label">
                          {label}
                        </span>
                        {busy ? (
                          <Loader2
                            size={16}
                            className="cins-chat-spin"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                }

                const isSelected = selected.includes(user.id);
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      className={`cins-chat-group-pick${isSelected ? " is-selected" : ""}`}
                      aria-pressed={isSelected}
                      onClick={() => toggleMember(user.id)}
                    >
                      <FriendAvatar
                        name={label}
                        avatarId={user.avatar_id}
                        avatarUrl={user.avatarUrl}
                      />
                      <span className="cins-chat-group-pick-label">{label}</span>
                      <span className="cins-chat-group-pick-check" aria-hidden>
                        {isSelected ? "✓" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error ? <p className="cins-chat-group-error">{error}</p> : null}

        {!isChat ? (
          <footer className="cins-chat-group-modal-foot">
            <button
              type="button"
              className="cins-chat-group-cancel"
              onClick={onClose}
            >
              Huỷ
            </button>
            <button
              type="button"
              className="cins-chat-group-submit"
              disabled={!canSubmitGroup}
              onClick={() => void handleSubmitGroup()}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="cins-chat-spin" aria-hidden />
                  Đang tạo…
                </>
              ) : (
                `Tạo nhóm (${selected.length})`
              )}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
