"use client";

import {
  Crown,
  Loader2,
  Search,
  Shield,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import type {
  AdminOrgMember,
  AdminOrgMembersPayload,
} from "@/lib/admin/org-members-types";

type SearchUser = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
};

type Props = {
  orgId: string | null;
  open: boolean;
  onClose: () => void;
  onOwnerChanged?: () => void;
};

function MemberAvatar({ name }: { name: string }) {
  return (
    <span className="admin-org-member-ava" aria-hidden>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function AdminToChucMembersModal({
  orgId,
  open,
  onClose,
  onOwnerChanged,
}: Props) {
  const titleId = useId();
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<AdminOrgMembersPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [delegationPassword, setDelegationPassword] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addRole, setAddRole] = useState("admin");
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/to-chuc/${encodeURIComponent(orgId)}/members`,
      );
      const json = (await res.json()) as AdminOrgMembersPayload & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Không tải được phân quyền.");
      }
      setPayload(json);
      if (json.assignableRoles?.length) {
        const preferred =
          json.assignableRoles.find((r) => r.value === "admin") ??
          json.assignableRoles[0];
        setAddRole(preferred.value);
      }
    } catch (e) {
      setPayload(null);
      setError(e instanceof Error ? e.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!open || !orgId) return;
    setDelegationPassword("");
    setQuery("");
    setResults([]);
    setActionError(null);
    void load();
  }, [open, orgId, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  useEffect(() => {
    if (!open || query.trim().length < 1) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      void fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`)
        .then(async (res) => {
          const json = (await res.json()) as { users?: SearchUser[] };
          if (!res.ok) return [];
          return json.users ?? [];
        })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearchLoading(false));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  if (!open || !orgId) return null;

  function requirePassword(): string | null {
    const pwd = delegationPassword.trim();
    if (!pwd) {
      setActionError("Nhập mật khẩu ủy quyền trước khi thao tác.");
      return null;
    }
    return pwd;
  }

  async function handleAdd(user: SearchUser) {
    const pwd = requirePassword();
    if (!pwd || !orgId) return;
    setPending(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/admin/to-chuc/${encodeURIComponent(orgId)}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            vaiTro: addRole,
            delegationPassword: pwd,
          }),
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Không gán được quyền.");
      setQuery("");
      setResults([]);
      if (addRole === "owner") onOwnerChanged?.();
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Lỗi gán quyền.");
    } finally {
      setPending(false);
    }
  }

  async function handleRoleChange(member: AdminOrgMember, vaiTro: string) {
    const pwd = requirePassword();
    if (!pwd || !orgId) return;
    setPending(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/admin/to-chuc/${encodeURIComponent(orgId)}/members/${encodeURIComponent(member.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vaiTro, delegationPassword: pwd }),
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Không đổi được vai trò.");
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Lỗi đổi vai trò.");
    } finally {
      setPending(false);
    }
  }

  async function handleTransferOwner(member: AdminOrgMember) {
    const pwd = requirePassword();
    if (!pwd || !orgId) return;
    if (
      !window.confirm(
        `Bàn giao quyền chủ sở hữu cho ${member.tenHienThi}? Owner cũ sẽ hạ xuống Admin.`,
      )
    ) {
      return;
    }
    setPending(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/admin/to-chuc/${encodeURIComponent(orgId)}/transfer-owner`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            membershipId: member.id,
            delegationPassword: pwd,
          }),
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Không bàn giao được.");
      onOwnerChanged?.();
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Lỗi bàn giao.");
    } finally {
      setPending(false);
    }
  }

  async function handleRemove(member: AdminOrgMember) {
    const pwd = requirePassword();
    if (!pwd || !orgId) return;
    if (!window.confirm(`Gỡ ${member.tenHienThi} khỏi tổ chức?`)) return;
    setPending(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/admin/to-chuc/${encodeURIComponent(orgId)}/members/${encodeURIComponent(member.id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delegationPassword: pwd }),
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Không gỡ được thành viên.");
      if (member.vaiTro === "owner") onOwnerChanged?.();
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Lỗi gỡ thành viên.");
    } finally {
      setPending(false);
    }
  }

  const members = payload?.members ?? [];
  const hasOwner = members.some((m) => m.vaiTro === "owner");
  const roleOptions = payload?.assignableRoles ?? [];

  return (
    <div
      className="admin-confirm-backdrop open"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div
        className="admin-org-members-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="admin-org-members-dialog__header">
          <div>
            <h2 id={titleId} className="admin-org-members-dialog__title">
              Phân quyền tổ chức
            </h2>
            {payload ? (
              <p className="admin-org-members-dialog__sub">
                {payload.orgTen}{" "}
                <span className="admin-to-chuc-muted">@{payload.orgSlug}</span> ·{" "}
                {payload.loaiLabel}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="so-close"
            onClick={onClose}
            disabled={pending}
            aria-label="Đóng"
          >
            <X size={18} strokeWidth={2.2} aria-hidden />
          </button>
        </div>

        <div className="admin-org-members-dialog__body">
          <div className="admin-org-members-pwd">
            <label className="form-label" htmlFor="admin-org-delegation-pwd">
              <Shield size={14} strokeWidth={2.2} aria-hidden /> Mật khẩu ủy
              quyền
            </label>
            <input
              id="admin-org-delegation-pwd"
              className="form-input"
              type="password"
              autoComplete="off"
              placeholder="Bắt buộc cho mọi thao tác gán / đổi / gỡ quyền"
              value={delegationPassword}
              onChange={(e) => setDelegationPassword(e.target.value)}
              disabled={pending}
            />
            <p className="admin-org-members-pwd-hint">
              Chỉ Admin tối cao biết mật khẩu này — đăng nhập super admin không
              thay thế.
            </p>
          </div>

          {loading ? (
            <p className="admin-to-chuc-muted admin-org-members-loading">
              <Loader2
                size={16}
                strokeWidth={2}
                className="admin-to-chuc-spin"
                aria-hidden
              />{" "}
              Đang tải…
            </p>
          ) : error ? (
            <p className="admin-edit-form__msg admin-edit-form__msg--err" role="alert">
              {error}
            </p>
          ) : (
            <>
              <section className="admin-org-members-add">
                <h3 className="admin-org-members-section-title">
                  <UserPlus size={15} strokeWidth={2.2} aria-hidden /> Thêm /
                  gán quyền
                </h3>
                <div className="admin-org-members-add-row">
                  <label className="admin-to-chuc-search admin-org-members-search">
                    <Search size={16} strokeWidth={2} aria-hidden />
                    <input
                      type="search"
                      placeholder="Tìm theo tên hoặc slug CINs…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      disabled={pending}
                    />
                  </label>
                  <select
                    className="form-input admin-org-members-role-select"
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    disabled={pending}
                    aria-label="Vai trò gán"
                  >
                    {roleOptions.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        disabled={opt.value === "owner" && hasOwner}
                      >
                        {opt.label}
                        {opt.value === "owner" && hasOwner ? " (đã có)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {searchLoading ? (
                  <p className="admin-to-chuc-muted">Đang tìm…</p>
                ) : null}
                {results.length > 0 ? (
                  <ul className="admin-org-members-search-results">
                    {results.map((user) => (
                      <li key={user.id}>
                        <button
                          type="button"
                          className="admin-org-members-search-hit"
                          disabled={pending}
                          onClick={() => void handleAdd(user)}
                        >
                          <MemberAvatar
                            name={
                              user.ten_hien_thi?.trim() || user.slug || "?"
                            }
                          />
                          <span>
                            <strong>
                              {user.ten_hien_thi?.trim() || user.slug}
                            </strong>
                            <span className="admin-to-chuc-org-slug">
                              @{user.slug}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              <section className="admin-org-members-list">
                <h3 className="admin-org-members-section-title">
                  Thành viên ({members.length})
                </h3>
                {members.length === 0 ? (
                  <p className="admin-to-chuc-muted">
                    Chưa có ai được gán quyền — tìm user ở trên để thêm owner
                    hoặc ban tuyển sinh.
                  </p>
                ) : (
                  <ul className="admin-org-members-rows">
                    {members.map((member) => (
                      <li key={member.id} className="admin-org-members-row">
                        <MemberAvatar name={member.tenHienThi} />
                        <div className="admin-org-members-row-copy">
                          <strong>{member.tenHienThi}</strong>
                          <span className="admin-to-chuc-org-slug">
                            @{member.slug}
                            {member.vaiTro === "owner" ? (
                              <span className="admin-org-members-owner-badge">
                                <Crown size={12} strokeWidth={2.2} aria-hidden />{" "}
                                Chủ trang
                              </span>
                            ) : null}
                          </span>
                        </div>
                        {member.vaiTro === "owner" ? (
                          <span className="admin-org-members-role-readonly">
                            {member.vaiTroLabel}
                          </span>
                        ) : (
                          <select
                            className="form-input admin-org-members-role-select"
                            value={member.vaiTro}
                            disabled={pending}
                            onChange={(e) =>
                              void handleRoleChange(member, e.target.value)
                            }
                            aria-label={`Vai trò ${member.tenHienThi}`}
                          >
                            {roleOptions
                              .filter((opt) => opt.value !== "owner")
                              .map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                          </select>
                        )}
                        <div className="admin-org-members-row-actions">
                          {member.vaiTro !== "owner" ? (
                            <button
                              type="button"
                              className="admin-to-chuc-act admin-org-members-transfer"
                              title={
                                hasOwner
                                  ? "Bàn giao owner"
                                  : "Đặt làm chủ trang (owner)"
                              }
                              disabled={pending}
                              onClick={() => void handleTransferOwner(member)}
                            >
                              <Crown size={15} strokeWidth={2.2} aria-hidden />
                            </button>
                          ) : null}
                          {member.vaiTro !== "owner" ? (
                            <button
                              type="button"
                              className="admin-to-chuc-act admin-to-chuc-act--delete"
                              title="Gỡ"
                              disabled={pending}
                              onClick={() => void handleRemove(member)}
                            >
                              <Trash2 size={15} strokeWidth={2.2} aria-hidden />
                            </button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}

          {actionError ? (
            <p
              className="admin-edit-form__msg admin-edit-form__msg--err"
              role="alert"
            >
              {actionError}
            </p>
          ) : null}
        </div>

        <div className="admin-org-members-dialog__footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={pending}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
