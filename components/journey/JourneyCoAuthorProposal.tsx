"use client";

import { Search, UserPlus, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { getAvatarUrl } from "@/lib/journey/profile";

type SearchUser = {
  id: string;
  slug: string;
  ten_hien_thi: string;
  avatar_id: string | null;
};

type Props = {
  tacPhamId: string;
  mode: "owner" | "proposal";
};

type SelectedUser = {
  user: SearchUser;
  vaiTro: string;
};

export function JourneyCoAuthorProposal({ tacPhamId, mode }: Props) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [selected, setSelected] = useState<SelectedUser[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isOwnerMode = mode === "owner";
  const title = isOwnerMode ? "Quản lý cộng sự" : "Đề xuất cộng sự";
  const helperText = isOwnerMode
    ? "Người được thêm sẽ nhận lời mời cộng sự cho bài viết này."
    : "Đề xuất sẽ được gửi cho chủ bài viết duyệt trước khi mời cộng sự.";

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      const qs = new URLSearchParams({ q: query.trim(), mutual_only: "true" });
      const res = await fetch(`/api/users/search?${qs.toString()}`);
      const json = await res.json().catch(() => ({}));
      setResults(res.ok && Array.isArray(json.users) ? json.users : []);
    }, 250);
    return () => clearTimeout(timer);
  }, [open, query]);

  const toggleUser = (user: SearchUser) => {
    setSelected((current) => {
      if (current.some((item) => item.user.id === user.id)) {
        return current.filter((item) => item.user.id !== user.id);
      }
      return [...current, { user, vaiTro: "" }];
    });
  };

  const updateRole = (userId: string, vaiTro: string) => {
    setSelected((current) =>
      current.map((item) =>
        item.user.id === userId ? { ...item, vaiTro } : item,
      ),
    );
  };

  const submit = () => {
    if (selected.length === 0) return;
    setMessage(null);
    startTransition(async () => {
      for (const item of selected) {
        const res = await fetch(`/api/tac-pham/${tacPhamId}/tac-gia`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_nguoi_dung: item.user.id,
            vai_tro: item.vaiTro.trim(),
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessage(
            typeof json.error === "string"
              ? json.error
              : "Không gửi được yêu cầu cộng sự.",
          );
          return;
        }
      }
      setMessage(
        isOwnerMode
          ? "Đã gửi lời mời cộng sự."
          : "Đã gửi đề xuất cho chủ bài viết duyệt.",
      );
      setSelected([]);
      setQuery("");
      setResults([]);
    });
  };

  const modal = open ? (
    <div
      className="j-coauthor-propose-backdrop"
      role="presentation"
      onClick={() => setOpen(false)}
    >
      <div
        className="j-coauthor-propose-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="j-coauthor-propose-head">
          <div>
            <strong>{title}</strong>
            <p>{helperText}</p>
          </div>
          <button type="button" aria-label="Đóng" onClick={() => setOpen(false)}>
            <X size={16} aria-hidden />
          </button>
        </div>

        {selected.length > 0 ? (
          <ul className="j-coauthor-propose-selected-list">
            {selected.map((item) => (
              <li key={item.user.id} className="j-coauthor-propose-selected">
                <UserAvatar user={item.user} />
                <span>
                  <strong>{item.user.ten_hien_thi || item.user.slug}</strong>
                  <small>@{item.user.slug}</small>
                </span>
                <input
                  type="text"
                  value={item.vaiTro}
                  onChange={(e) => updateRole(item.user.id, e.target.value)}
                  placeholder="Tìm vị trí công việc"
                />
                <button
                  type="button"
                  aria-label={`Bỏ ${item.user.ten_hien_thi || item.user.slug}`}
                  onClick={() => toggleUser(item.user)}
                >
                  <X size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="j-coauthor-propose-picker">
          <label className="j-coauthor-propose-search">
            <Search size={15} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm bạn cộng sự"
            />
          </label>
          {results.length > 0 ? (
            <ul className="j-coauthor-propose-results">
              {results.map((user) => {
                const isSelected = selected.some((item) => item.user.id === user.id);
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      className={isSelected ? "is-selected" : ""}
                      onClick={() => toggleUser(user)}
                    >
                      <UserAvatar user={user} />
                      <span>
                        <strong>{user.ten_hien_thi || user.slug}</strong>
                        <small>@{user.slug}</small>
                      </span>
                      {isSelected ? <b>Đang chọn</b> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <div className="j-coauthor-propose-actions">
          <span>{selected.length} đã chọn</span>
          <button
            type="button"
            className="j-coauthor-propose-submit"
            disabled={selected.length === 0 || pending}
            onClick={submit}
          >
            {isOwnerMode ? "Gửi lời mời" : "Gửi đề xuất"}
          </button>
        </div>
        {message ? <p className="j-coauthor-propose-note">{message}</p> : null}
      </div>
    </div>
  ) : null;

  return (
    <div className="j-coauthor-propose" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="j-coauthor-propose-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={title}
        title={title}
      >
        <UserPlus size={15} strokeWidth={2} aria-hidden />
      </button>

      {mounted && modal ? createPortal(modal, document.body) : null}
    </div>
  );
}

function UserAvatar({ user }: { user: SearchUser }) {
  const src = getAvatarUrl(user.avatar_id);
  const initial = (user.ten_hien_thi || user.slug || "?").slice(0, 1).toUpperCase();
  return (
    <span className="j-coauthor-propose-avatar" aria-hidden>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : (
        <span>{initial}</span>
      )}
    </span>
  );
}
