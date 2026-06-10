"use client";

import { Loader2, Search, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

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
  const [memberPending, setMemberPending] = useState(false);
  const [pending, startTransition] = useTransition();

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

  function onAddUser(user: SearchUser) {
    onError(null);
    startTransition(async () => {
      setMemberPending(true);
      try {
        const res = await fetch(`/api/co-so/${encodeURIComponent(orgId)}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, vaiTro: addRole }),
        });
        const json = (await res.json().catch(() => null)) as {
          member?: CoSoMemberAdmin;
          error?: string;
        } | null;
        if (!res.ok || !json?.member) {
          onError(json?.error ?? "Không thêm được thành viên.");
          return;
        }
        upsertMember(json.member);
        setQuery("");
        setResults([]);
      } finally {
        setMemberPending(false);
      }
    });
  }

  async function onRoleChange(member: CoSoMemberAdmin, vaiTro: CoSoStaffVaiTro) {
    if (!canManage || !member.editable || member.vaiTro === vaiTro) return;
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
      upsertMember(json.member);
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

  return (
    <section className="cso-settings-section">
      <p className="cso-settings-hint">
        Người có quyền quản trị trang cơ sở — đăng bài, gallery, cài đặt và
        (tùy vai trò) mời thêm người.
      </p>

      <ul className="cso-settings-member-list">
        {members.map((member) => (
          <li key={member.id} className="cso-settings-member-row">
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
            {canManage && member.editable ? (
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
                aria-label={`Gỡ ${member.tenHienThi}`}
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
              onChange={(e) => setQuery(e.target.value)}
            />
            {searchLoading ? (
              <Loader2 size={15} className="cso-settings-spin" aria-hidden />
            ) : null}
          </div>
          {results.length > 0 ? (
            <ul className="cso-settings-member-results">
              {results.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    className="cso-settings-member-result"
                    disabled={memberPending || pending}
                    onClick={() => onAddUser(user)}
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
          <label className="cso-settings-member-add-role">
            <span>Vai trò khi thêm</span>
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
        </div>
      ) : (
        <p className="cso-settings-field-note">
          Chỉ quản trị viên mới mời hoặc đổi quyền người khác.
        </p>
      )}
    </section>
  );
}
