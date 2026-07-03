"use client";

import { Users, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { FeedFriendAttendee } from "@/components/journey/milestone-types";

/** Số avatar tối đa hiển thị chồng trên chip trước khi gộp "+N". */
const MAX_AVATARS = 3;

type Props = {
  friends: FeedFriendAttendee[];
  eventTitle?: string;
};

type PopCoords = { top: number; left: number; width: number };

function FriendAvatar({ friend }: { friend: FeedFriendAttendee }) {
  if (friend.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={friend.avatarUrl} alt="" loading="lazy" />
    );
  }
  return (
    <span className="j-osk-friend-av-txt" aria-hidden>
      {(friend.initial ?? friend.name.slice(0, 1)).toUpperCase()}
    </span>
  );
}

/**
 * Chip avatar "N bạn bè sẽ tham gia" trên card sự kiện feed. Bấm vào mở popup
 * (portal, tránh bị card cắt) liệt kê danh sách bạn bè, mỗi người link sang
 * trang cá nhân.
 */
export function OrgSuKienFriendsChips({ friends, eventTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<PopCoords | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(320, Math.max(240, r.width));
    const maxLeft = window.innerWidth - width - 12;
    const left = Math.max(12, Math.min(r.left, maxLeft));
    setCoords({ top: r.bottom + 8, left, width });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    // Đóng khi cuộn/resize để popup không "trôi" khỏi chip.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, place]);

  if (friends.length === 0) return null;

  const count = friends.length;
  const shown = friends.slice(0, MAX_AVATARS);
  const extra = count - shown.length;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="j-osk-friends"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Xem bạn bè sẽ tham gia"
      >
        <span className="j-osk-friends-avatars" aria-hidden>
          {shown.map((f) => (
            <span key={f.id} className="j-osk-friend-av">
              <FriendAvatar friend={f} />
            </span>
          ))}
          {extra > 0 ? (
            <span className="j-osk-friend-av j-osk-friend-more">+{extra}</span>
          ) : null}
        </span>
        <span className="j-osk-friends-label">{count} bạn bè sẽ tham gia</span>
      </button>

      {mounted && open && coords
        ? createPortal(
            <div
              ref={panelRef}
              className="j-osk-friends-pop"
              style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
              }}
              role="dialog"
              aria-label="Bạn bè sẽ tham gia"
            >
              <div className="j-osk-friends-pop-head">
                <Users size={15} strokeWidth={2.1} aria-hidden />
                <span className="j-osk-friends-pop-title">
                  {count} bạn bè sẽ tham gia
                  {eventTitle ? (
                    <span className="j-osk-friends-pop-sub">{eventTitle}</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="j-osk-friends-pop-close"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng"
                >
                  <X size={15} strokeWidth={2.2} aria-hidden />
                </button>
              </div>
              <ul className="j-osk-friends-pop-list">
                {friends.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/${f.slug}`}
                      prefetch={false}
                      className="j-osk-friends-pop-item"
                      onClick={() => setOpen(false)}
                    >
                      <span className="j-osk-friend-av j-osk-friend-av--lg">
                        <FriendAvatar friend={f} />
                      </span>
                      <span className="j-osk-friends-pop-name">{f.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
