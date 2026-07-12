"use client";

import { useCallback, useEffect, useState } from "react";

import type { MutualFriendProfile } from "@/lib/social/types";

export type MutualFriendsState = {
  count: number;
  users: MutualFriendProfile[];
  loading: boolean;
  visible: boolean;
};

const EMPTY_USERS: MutualFriendProfile[] = [];

export function useMutualFriends(
  targetUserId: string,
  viewerProfileId: string | null,
): MutualFriendsState {
  const [count, setCount] = useState(0);
  const [users, setUsers] = useState<MutualFriendProfile[]>(EMPTY_USERS);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!viewerProfileId || !targetUserId || viewerProfileId === targetUserId) {
      setCount((prev) => (prev === 0 ? prev : 0));
      setUsers((prev) => (prev.length === 0 ? prev : EMPTY_USERS));
      setLoading((prev) => (prev ? false : prev));
      return;
    }
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
      setUsers(data.users ?? EMPTY_USERS);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, viewerProfileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = Boolean(
    viewerProfileId &&
      targetUserId &&
      viewerProfileId !== targetUserId &&
      count > 0,
  );

  return { count, users, loading, visible };
}
