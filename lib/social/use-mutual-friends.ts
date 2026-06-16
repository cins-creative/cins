"use client";

import { useCallback, useEffect, useState } from "react";

import type { MutualFriendProfile } from "@/lib/social/types";

export type MutualFriendsState = {
  count: number;
  users: MutualFriendProfile[];
  loading: boolean;
  visible: boolean;
};

export function useMutualFriends(
  targetUserId: string,
  viewerProfileId: string | null,
): MutualFriendsState {
  const [count, setCount] = useState(0);
  const [users, setUsers] = useState<MutualFriendProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!viewerProfileId || viewerProfileId === targetUserId) {
      setCount(0);
      setUsers([]);
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
      setUsers(data.users ?? []);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, viewerProfileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = Boolean(
    viewerProfileId && viewerProfileId !== targetUserId && count > 0,
  );

  return { count, users, loading, visible };
}
