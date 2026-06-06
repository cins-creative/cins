"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { MutualFriendProfile } from "@/lib/social/types";

type Props = {
  targetUserId: string;
  viewerProfileId: string | null;
};

export function JourneyMutualFriendsLine({
  targetUserId,
  viewerProfileId,
}: Props) {
  const [count, setCount] = useState(0);
  const [users, setUsers] = useState<MutualFriendProfile[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!viewerProfileId || viewerProfileId === targetUserId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ id_nguoi: targetUserId });
      const res = await fetch(`/api/ket-ban/chung?${qs.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        count: number;
        users: MutualFriendProfile[];
      };
      setCount(data.count ?? 0);
      setUsers(data.users ?? []);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, viewerProfileId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!viewerProfileId || viewerProfileId === targetUserId || count === 0) {
    return null;
  }

  return (
    <div className="j-mutual-friends">
      <button
        type="button"
        className="j-mutual-friends-trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {loading ? "…" : `${count} bạn chung`}
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
