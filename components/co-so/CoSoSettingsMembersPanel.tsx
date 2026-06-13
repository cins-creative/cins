"use client";

import { Loader2, Search, Trash2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { getAvatarUrl } from "@/lib/journey/profile";
import {
  CO_SO_ASSIGNABLE_ROLES,
  coSoAssignableRoleLabel,
  coSoVaiTroLabel,
  type CoSoStaffVaiTro,
} from "@/lib/to-chuc/co-so-vai-tro";
import type { CoSoMemberAdmin } from "@/lib/to-chuc/co-so-settings-types";

type SearchUser = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
};

type Props = {
  orgId: string;
  members: CoSoMemberAdmin[];
  canManage: boolean;
  onMembersChange: (members: CoSoMemberAdmin[]) => void;
  onError: (message: string | null) => void;
};

function MemberAvatar({
  avatarId,
  name,
}: {
  avatarId: string | null;
  name: string;
}) {
  const src = avatarId ? getAvatarUrl(avatarId) : null;
  return (
    <span className="cso-settings-member-ava" aria-hidden>
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt="" />
      ) : (
        <span>{name.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}

function normalizeMember(member: CoSoMemberAdmin): CoSoMemberAdmin {
  return {
    ...member,
    trangThai: member.trangThai === "pending" ? "pending" : "active",
  };
}

function isPendingMember(member: CoSoMemberAdmin): boolean {
  return normalizeMember(member).trangThai === "pending";
}

export function CoSoSettingsMembersPanel({
  orgId,
  members,
  canManage,
  onMembersChange,
  onError,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addRole, setAddRole] = useState<CoSoStaffVaiTro>("nhan_vien");
  const [inviteTarget, setInviteTarget] = useState<SearchUser | null>(null);
  const [memberPending, setMemberPending] = useState(false);
  const [pending, startTransition] = useTransition();

  const normalizedMembers = useMemo(
    () => members.map(normalizeMember),
    [members],
  );

  const onMembersChangeRef = useRef(onMembersChange);
  onMembersChangeRef.current = onMembersChange;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/co-so/${encodeURIComponent(orgId)}/members`);
        const json = (await res.json().catch(() => null)) as {
          members?: CoSoMemberAdmin[];
        } | null;
        if (cancelled || !res.ok || !json?.members) return;
        onMembersChangeRef.current(json.members.map(normalizeMember));
      } catch {
        /* giữ danh sách hiện có */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const memberUserIds = useMemo(
    () => new Set(normalizedMembers.map((member) => member.userId)),
    [normalizedMembers],
  );

  const visibleResults = useMemo(
    () => results.filter((user) => !memberUserIds.has(user.id)),
    [memberUserIds, results],
  );

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `/api/users/search?${new URLSearchParams({ q }).toString()}`,
        );
        const json = (await res.json().catch(() => null)) as {
          users?: SearchUser[];
        } | null;
        setResults(res.ok ? (json?.users ?? []) : []);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function upsertMember(next: CoSoMemberAdmin) {
    onMembersChange(
      (() => {
        const idx = members.findIndex((m) => m.userId === next.userId);
        if (idx === -1) {
          return [...members, next].sort((a, b) =>
            a.tenHienThi.localeCompare(b.tenHienThi, "vi"),
          );
        }
        const copy = [...members];
        copy[idx] = next;
        return copy;
      })(),
    );
  }

  function onSelectInviteTarget(user: SearchUser) {
    onError(null);
    setInviteTarget(user);
  }

  function onCancelInvite() {
    setInviteTarget(null);
  }

  function onConfirmInvite() {
    if (!inviteTarget) return;
    onError(null);
    startTransition(async () => {
      setMemberPending(true);
      try {
        const res = await fetch(`/api/co-so/${encodeURIComponent(orgId)}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: inviteTarget.id, vaiTro: addRole }),
        });
        const json = (await res.json().catch(() => null)) as {
          member?: CoSoMemberAdmin;
          error?: string;
        } | null;
        if (!res.ok || !json?.member) {
          onError(json?.error ?? "Không gửi được lời mời.");
          return;
        }
        upsertMember(normalizeMember(json.member));
        setInviteTarget(null);
        setQuery("");
        setResults([]);
      } finally {
        setMemberPending(false);
      }
    });
  }

  async function onRoleChange(member: CoSoMemberAdmin, vaiTro: CoSoStaffVaiTro) {
    if (
      !canManage ||
      !member.editable ||
      member.vaiTro === vaiTro ||
      member.trangThai !== "active"
    ) {
      return;
    }
    onError(null);
    setMemberPending(true);
    try {
      const res = await fetch(
        `/api/co-so/${encodeURIComponent(orgId)}/members/${encodeURIComponent(member.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vaiTro }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        member?: CoSoMemberAdmin;
        error?: string;
      } | null;
      if (!res.ok || !json?.member) {
        onError(json?.error ?? "Không cập nhật được vai trò.");
        return;
      }
      upsertMember(normalizeMember(json.member));
    } finally {
      setMemberPending(false);
    }
  }

  async function onRemove(member: CoSoMemberAdmin) {
    if (!canManage || !member.editable) return;
    onError(null);
    setMemberPending(true);
    try {
      const res = await fetch(
        `/api/co-so/${encodeURIComponent(orgId)}/members/${encodeURIComponent(member.id)}`,
        { method: "DELETE" },
      );
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        onError(json?.error ?? "Không gỡ được thành viên.");
        return;
      }
      onMembersChange(members.filter((m) => m.id !== member.id));
    } finally {
      setMemberPending(false);
    }
  }

  const inviteTargetName =
    inviteTarget?.ten_hien_thi?.trim() || inviteTarget?.slug || "";

  return (
    <section className="cso-settings-section">
      <p className="cso-settings-hint">
        Mời người quản trị trang cơ sở. Họ cần chấp nhận lời mời trong thông
        báo CINs trước khi quyền có hiệu lực.
      </p>

      <ul className="cso-settings-member-list">
        {normalizedMembers.map((member) => (
          <li
            key={member.id}
            className={`cso-settings-member-row${
              isPendingMember(member) ? " is-pending" : ""
            }`}
          >
            <MemberAvatar avatarId={member.avatarId} name={member.tenHienThi} />
            <div className="cso-settings-member-meta">
              <span className="cso-settings-member-name">
                {member.tenHienThi}
                {member.isSelf ? (
                  <span className="cso-settings-member-you"> (bạn)</span>
                ) : null}
              </span>
              <span className="cso-settings-member-slug">@{member.slug}</span>
            </div>
            {isPendingMember(member) ? (
              <div className="cso-settings-member-pending">
                <span className="cso-settings-member-pending-badge">
                  Chờ xác nhận
                </span>
                <span className="cso-settings-member-pending-role">
                  {coSoAssignableRoleLabel(member.vaiTro)}
                </span>
              </div>
            ) : canManage && member.editable ? (
              <select
                className="cso-settings-member-role"
                value={member.vaiTro}
                disabled={memberPending || pending}
                aria-label={`Vai trò ${member.tenHienThi}`}
                onChange={(e) =>
                  void onRoleChange(member, e.target.value as CoSoStaffVaiTro)
                }
              >
                {CO_SO_ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {coSoAssignableRoleLabel(role)}
                  </option>
                ))}
              </select>
            ) : (
              <span className="cso-settings-member-role-read">
                {coSoVaiTroLabel(member.vaiTro)}
              </span>
            )}
            {canManage && member.editable && !member.isSelf ? (
              <button
                type="button"
                className="cso-settings-member-del"
                aria-label={
                  isPendingMember(member)
                    ? `Hủy lời mời ${member.tenHienThi}`
                    : `Gỡ ${member.tenHienThi}`
                }
                disabled={memberPending || pending}
                onClick={() => void onRemove(member)}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {canManage ? (
        <div className="cso-settings-member-add">
          <div className="cso-settings-member-search-wrap">
            <Search size={15} className="cso-settings-member-search-icon" aria-hidden />
            <input
              type="search"
              className="cso-settings-member-search"
              placeholder="Tìm theo tên hoặc @slug…"
              value={query}
              disabled={memberPending || pending}
              onChange={(e) => {
                setQuery(e.target.value);
                if (inviteTarget) setInviteTarget(null);
              }}
            />
            {searchLoading ? (
              <Loader2 size={15} className="cso-settings-spin" aria-hidden />
            ) : null}
          </div>

          {inviteTarget ? (
            <div className="cso-settings-member-confirm">
              <div className="cso-settings-member-confirm-copy">
                <MemberAvatar
                  avatarId={inviteTarget.avatar_id}
                  name={inviteTargetName}
                />
                <div>
                  <strong>{inviteTargetName}</strong>
                  <span className="cso-settings-member-slug">
                    {" "}
                    @{inviteTarget.slug}
                  </span>
                  <p className="cso-settings-member-confirm-note">
                    Gửi lời mời tham gia quản trị cơ sở. Người này cần chấp nhận
                    trong thông báo CINs.
                  </p>
                </div>
              </div>
              <label className="cso-settings-member-add-role">
                <span>Vai trò</span>
                <select
                  value={addRole}
                  disabled={memberPending || pending}
                  onChange={(e) => setAddRole(e.target.value as CoSoStaffVaiTro)}
                >
                  {CO_SO_ASSIGNABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {coSoAssignableRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="cso-settings-member-confirm-actions">
                <button
                  type="button"
                  className="cso-kh-foot-btn cso-kh-foot-btn--ghost"
                  disabled={memberPending || pending}
                  onClick={onCancelInvite}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="cso-kh-foot-btn cso-kh-foot-btn--primary"
                  disabled={memberPending || pending}
                  onClick={() => onConfirmInvite()}
                >
                  {memberPending || pending ? "Đang gửi…" : "Gửi lời mời"}
                </button>
              </div>
            </div>
          ) : null}

          {!inviteTarget && visibleResults.length > 0 ? (
            <ul className="cso-settings-member-results">
              {visibleResults.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    className="cso-settings-member-result"
                    disabled={memberPending || pending}
                    onClick={() => onSelectInviteTarget(user)}
                  >
                    <MemberAvatar
                      avatarId={user.avatar_id}
                      name={user.ten_hien_thi?.trim() || user.slug}
                    />
                    <span>
                      {user.ten_hien_thi?.trim() || user.slug}
                      <span className="cso-settings-member-slug"> @{user.slug}</span>
                    </span>
                    <UserPlus size={15} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {!inviteTarget &&
          query.trim().length >= 1 &&
          !searchLoading &&
          visibleResults.length === 0 ? (
            <p className="cso-settings-field-note">
              {results.length > 0
                ? "Mọi người trùng tên đã có trong danh sách."
                : "Không thấy tài khoản phù hợp."}
            </p>
          ) : null}

          {!inviteTarget ? (
            <label className="cso-settings-member-add-role">
              <span>Vai trò khi mời</span>
              <select
                value={addRole}
                disabled={memberPending || pending}
                onChange={(e) => setAddRole(e.target.value as CoSoStaffVaiTro)}
              >
                {CO_SO_ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {coSoAssignableRoleLabel(role)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : (
        <p className="cso-settings-field-note">
          Chỉ quản trị viên mới mời hoặc đổi quyền người khác.
        </p>
      )}
    </section>
  );
}
