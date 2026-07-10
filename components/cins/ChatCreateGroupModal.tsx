"use client";

import { Loader2, Search, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { avatarBg, avatarInitialFromName } from "@/lib/chat/avatar";
import { getAvatarUrl } from "@/lib/journey/profile";
import type { ChatThread } from "@/lib/chat/types";

type FriendRow = {
  id: string;
  slug: string;
  ten_hien_thi: string;
  avatar_id: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (thread: ChatThread) => void;
};

function FriendAvatar({ name, avatarId }: { name: string; avatarId: string | null }) {
  const url = getAvatarUrl(avatarId);
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

export function ChatCreateGroupModal({ open, onClose, onCreated }: Props) {
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setQuery("");
    setName("");
    setSelected([]);
    setError(null);
    setLoadingFriends(true);

    void (async () => {
      try {
        const res = await fetch("/api/users/search?friends_only=true", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Không tải được danh sách bạn bè.");
        const json = (await res.json()) as { users?: FriendRow[] };
        setFriends(json.users ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không tải được danh sách bạn bè.");
        setFriends([]);
      } finally {
        setLoadingFriends(false);
      }
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.ten_hien_thi.toLowerCase().includes(q) ||
        f.slug.toLowerCase().includes(q),
    );
  }, [friends, query]);

  const toggleMember = useCallback((id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const canSubmit = selected.length >= 2 && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
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
  }, [canSubmit, name, onClose, onCreated, selected]);

  if (!open) return null;

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
            <Users size={18} strokeWidth={1.8} />
          </span>
          <div>
            <h3 id="cins-chat-group-modal-title">Tạo nhóm chat</h3>
            <p>Chọn ít nhất 2 bạn bè</p>
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

        <label className="cins-chat-search cins-chat-group-search">
          <Search size={16} strokeWidth={1.8} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm bạn bè"
          />
        </label>

        {selected.length > 0 ? (
          <div className="cins-chat-group-selected" aria-live="polite">
            {selected.map((id) => {
              const friend = friends.find((f) => f.id === id);
              if (!friend) return null;
              const label = friend.ten_hien_thi?.trim() || friend.slug;
              return (
                <button
                  key={id}
                  type="button"
                  className="cins-chat-group-chip"
                  onClick={() => toggleMember(id)}
                >
                  {label}
                  <X size={12} strokeWidth={2.2} aria-hidden />
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="cins-chat-group-list">
          {loadingFriends ? (
            <p className="cins-chat-group-list-empty">
              <Loader2 size={16} className="cins-chat-spin" aria-hidden />
              Đang tải bạn bè…
            </p>
          ) : filtered.length === 0 ? (
            <p className="cins-chat-group-list-empty">
              {friends.length === 0
                ? "Bạn chưa có bạn bè để thêm vào nhóm."
                : "Không tìm thấy bạn bè phù hợp."}
            </p>
          ) : (
            <ul role="list">
              {filtered.map((friend) => {
                const label = friend.ten_hien_thi?.trim() || friend.slug;
                const isSelected = selected.includes(friend.id);
                return (
                  <li key={friend.id}>
                    <button
                      type="button"
                      className={`cins-chat-group-pick${isSelected ? " is-selected" : ""}`}
                      aria-pressed={isSelected}
                      onClick={() => toggleMember(friend.id)}
                    >
                      <FriendAvatar name={label} avatarId={friend.avatar_id} />
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

        <footer className="cins-chat-group-modal-foot">
          <button type="button" className="cins-chat-group-cancel" onClick={onClose}>
            Huỷ
          </button>
          <button
            type="button"
            className="cins-chat-group-submit"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
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
      </div>
    </div>
  );
}
