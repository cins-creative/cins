"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import type { CongDongInviteCandidate } from "@/lib/cong-dong/invite";

type Props = {
  orgId: string;
  onDone: (message: string) => void;
};

export function CongDongInviteFriendsPanel({ orgId, onDone }: Props) {
  const [friends, setFriends] = useState<CongDongInviteCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      const res = await fetch(`/api/cong-dong/${encodeURIComponent(orgId)}/invite`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        friends?: CongDongInviteCandidate[];
        error?: string;
      } | null;
      if (cancelled) return;
      if (!res.ok) {
        setError(json?.error ?? "Không tải được danh sách bạn bè.");
        setFriends([]);
        setLoading(false);
        return;
      }
      setFriends(Array.isArray(json?.friends) ? json.friends : []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const toggle = useCallback((id: string, disabled: boolean) => {
    if (disabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const inviteable = friends.filter((f) => !f.alreadyMember);
  const allInviteableSelected =
    inviteable.length > 0 && inviteable.every((f) => selected.has(f.id));

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      const inviteableIds = friends
        .filter((f) => !f.alreadyMember)
        .map((f) => f.id);
      if (inviteableIds.length === 0) return prev;
      const allOn = inviteableIds.every((id) => prev.has(id));
      if (allOn) return new Set();
      return new Set(inviteableIds);
    });
  }, [friends]);

  const send = useCallback(() => {
    if (selected.size === 0) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/cong-dong/${encodeURIComponent(orgId)}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [...selected] }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        invited?: number;
        error?: string;
      } | null;
      if (!res.ok) {
        setError(json?.error ?? "Không gửi được lời mời.");
        return;
      }
      const n = json?.invited ?? 0;
      onDone(
        n > 0
          ? `Đã gửi ${n} lời mời. Bạn bè sẽ thấy trong thông báo và Journey.`
          : "Không có lời mời nào được gửi.",
      );
    });
  }, [orgId, onDone, selected]);

  if (loading) {
    return <p className="j-share-invite-empty">Đang tải bạn bè…</p>;
  }

  if (error && friends.length === 0) {
    return <p className="j-share-invite-empty">{error}</p>;
  }

  if (friends.length === 0) {
    return (
      <p className="j-share-invite-empty">
        Bạn chưa có bạn bè trên CINs để mời.
      </p>
    );
  }

  if (inviteable.length === 0) {
    return (
      <p className="j-share-invite-empty">
        Tất cả bạn bè của bạn đã ở trong cộng đồng này.
      </p>
    );
  }

  return (
    <div className="j-share-invite">
      <div className="j-share-invite-toolbar">
        <button
          type="button"
          className="j-share-invite-select-all"
          disabled={pending}
          onClick={toggleSelectAll}
        >
          {allInviteableSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
        </button>
        <span className="j-share-invite-toolbar-meta">
          {selected.size}/{inviteable.length} người
        </span>
      </div>

      <ul
        className="j-share-invite-list"
        role="listbox"
        aria-label="Chọn bạn bè"
        aria-multiselectable="true"
      >
        {friends.map((friend) => {
          const disabled = friend.alreadyMember;
          const checked = selected.has(friend.id);
          return (
            <li key={friend.id}>
              <button
                type="button"
                role="option"
                aria-selected={checked}
                disabled={disabled || pending}
                className={
                  "j-share-invite-row" +
                  (checked ? " is-selected" : "") +
                  (disabled ? " is-disabled" : "")
                }
                onClick={() => toggle(friend.id, disabled)}
              >
                {friend.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={friend.avatarUrl}
                    alt=""
                    className="j-share-invite-avatar"
                    width={32}
                    height={32}
                  />
                ) : (
                  <span className="j-share-invite-avatar is-fallback" aria-hidden>
                    {friend.tenHienThi.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="j-share-invite-meta">
                  <strong>{friend.tenHienThi}</strong>
                  {disabled ? (
                    <span>Đã là thành viên</span>
                  ) : (
                    <span>@{friend.slug}</span>
                  )}
                </span>
                {!disabled ? (
                  <span
                    className={"j-share-invite-check" + (checked ? " is-on" : "")}
                    aria-hidden
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {error ? <p className="j-share-invite-error">{error}</p> : null}

      <button
        type="button"
        className="j-share-action j-share-action--primary j-share-invite-send"
        disabled={pending || selected.size === 0}
        onClick={send}
      >
        {pending
          ? "Đang gửi…"
          : selected.size > 0
            ? `Gửi lời mời (${selected.size})`
            : "Chọn bạn để mời"}
      </button>
    </div>
  );
}
