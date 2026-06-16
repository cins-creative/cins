"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { useState } from "react";

import type { MutualFriendsState } from "@/lib/social/use-mutual-friends";

type Props = {
  mutual: MutualFriendsState;
  variant?: "line" | "chip";
};

export function JourneyMutualFriendsTrigger({
  mutual,
  variant = "line",
}: Props) {
  const [open, setOpen] = useState(false);
  const { count, users, loading, visible } = mutual;

  if (!visible) return null;

  const label = loading ? "…" : `${count} bạn chung`;

  return (
    <div
      className={
        variant === "chip" ? "j-mutual-friends j-mutual-friends--chip" : "j-mutual-friends"
      }
    >
      <button
        type="button"
        className={
          variant === "chip"
            ? "j-mutual-friends-chip"
            : "j-mutual-friends-trigger"
        }
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {variant === "chip" ? (
          <>
            <Users size={12} strokeWidth={2} aria-hidden />
            <span>{label}</span>
          </>
        ) : (
          label
        )}
      </button>
      {open ? (
        <ul className="j-mutual-friends-list" role="list">
          {users.map((user) => (
            <li key={user.idNguoiDung}>
              <Link href={`/${user.slug}`} className="j-mutual-friends-item">
                {user.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={user.avatarUrl} alt="" width={28} height={28} />
                ) : (
                  <span className="j-mutual-friends-initial" aria-hidden>
                    {(user.tenHienThi || user.slug).slice(0, 1)}
                  </span>
                )}
                <span>{user.tenHienThi}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
