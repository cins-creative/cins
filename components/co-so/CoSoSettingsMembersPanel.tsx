"use client";

import {
  AlertTriangle,
  Crown,
  Loader2,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { TransferOwnerModal } from "@/components/to-chuc/TransferOwnerModal";
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
  orgSlug: string;
  orgLabel: string;
  viewerIsOwner: boolean;
  /** Base API tài nguyên thành viên, vd `/api/co-so/<id>` hoặc `/api/studio/<id>`. */
  apiBase?: string;
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
  orgSlug,
  orgLabel,
  viewerIsOwner,
  apiBase,
  members,
  canManage,
  onMembersChange,
  onError,
}: Props) {
  const base = apiBase ?? `/api/co-so/${encodeURIComponent(orgId)}`;
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addRole, setAddRole] = useState<CoSoStaffVaiTro>("nhan_vien");
  const [inviteTarget, setInviteTarget] = useState<SearchUser | null>(null);
  const [memberPending, setMemberPending] = useState(false);
  const [transferTarget, setTransferTarget] = useState<CoSoMemberAdmin | null>(
    null,
  );
  const [transferPending, setTransferPending] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CoSoMemberAdmin | null>(
    null,
  );
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement>(null);

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
        const res = await fetch(`${base}/members`);
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
  }, [base]);

  const memberUserIds = useMemo(
    () => new Set(normalizedMembers.map((member) => member.userId)),
    [normalizedMembers],
  );

  const visibleResults = useMemo(
    () => results.filter((user) => !memberUserIds.has(user.id)),
    [memberUserIds, results],
  );

  useEffect(() => {
    if (!addOpen) return;
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
  }, [addOpen, query]);

  useEffect(() => {
    if (!addOpen) return;
    const t = setTimeout(() => searchInputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [addOpen]);

  useEffect(() => {
    if (!addOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !memberPending && !pending) {
        resetAddModal();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen, memberPending, pending]);

  function resetAddModal() {
    setAddOpen(false);
    setQuery("");
    setResults([]);
    setInviteTarget(null);
    setAddRole("nhan_vien");
  }

  function closeAddModal() {
    if (memberPending || pending) return;
    resetAddModal();
  }

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

  function onConfirmInvite() {
    if (!inviteTarget) return;
    onError(null);
    startTransition(async () => {
      setMemberPending(true);
      try {
        const res = await fetch(`${base}/members`, {
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
        resetAddModal();
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
        `${base}/members/${encodeURIComponent(member.id)}`,
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

  function askRemove(member: CoSoMemberAdmin) {
    if (!canManage || !member.editable || member.isSelf) return;
    onError(null);
    setRemoveError(null);
    setRemoveTarget(member);
  }

  async function confirmRemove() {
    if (!removeTarget || !canManage || !removeTarget.editable) return;
    onError(null);
    setRemoveError(null);
    setMemberPending(true);
    try {
      const res = await fetch(
        `${base}/members/${encodeURIComponent(removeTarget.id)}`,
        { method: "DELETE" },
      );
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setRemoveError(json?.error ?? "Không gỡ được thành viên.");
        return;
      }
      onMembersChange(members.filter((m) => m.id !== removeTarget.id));
      setRemoveTarget(null);
    } finally {
      setMemberPending(false);
    }
  }

  function onConfirmTransfer(confirmSlug: string) {
    if (!transferTarget) return;
    setTransferError(null);
    setTransferPending(true);
    void (async () => {
      try {
        const res = await fetch(`${base}/transfer-owner`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            membershipId: transferTarget.id,
            confirmSlug,
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          members?: CoSoMemberAdmin[];
          error?: string;
        } | null;
        if (!res.ok || !json?.members) {
          setTransferError(json?.error ?? "Không bàn giao được quyền sở hữu.");
          return;
        }
        onMembersChange(json.members.map(normalizeMember));
        setTransferTarget(null);
      } finally {
        setTransferPending(false);
      }
    })();
  }

  const inviteTargetName =
    inviteTarget?.ten_hien_thi?.trim() || inviteTarget?.slug || "";

  const addModal =
    addOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="cso-settings-add-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cso-settings-add-title"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeAddModal();
            }}
          >
            <div className="cso-settings-add-modal">
              <div className="cso-settings-add-head">
                <div>
                  <h3
                    id="cso-settings-add-title"
                    className="cso-settings-add-title"
                  >
                    Thêm vai trò
                  </h3>
                  <p className="cso-settings-add-sub">
                    Tìm người trên CINs và chọn vai trò quản trị cơ sở. Họ cần
                    chấp nhận lời mời trong thông báo.
                  </p>
                </div>
                <button
                  type="button"
                  className="cso-settings-add-close"
                  aria-label="Đóng"
                  disabled={memberPending || pending}
                  onClick={closeAddModal}
                >
                  <X size={18} aria-hidden />
                </button>
              </div>

              <div className="cso-settings-add-body">
                <div className="cso-settings-member-search-wrap">
                  <Search
                    size={15}
                    className="cso-settings-member-search-icon"
                    aria-hidden
                  />
                  <input
                    ref={searchInputRef}
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
                    <Loader2
                      size={15}
                      className="cso-settings-spin cso-settings-add-spin"
                      aria-hidden
                    />
                  ) : null}
                </div>

                <label className="cso-settings-member-add-role cso-settings-add-role">
                  <span>Vai trò gán</span>
                  <select
                    value={addRole}
                    disabled={memberPending || pending}
                    onChange={(e) =>
                      setAddRole(e.target.value as CoSoStaffVaiTro)
                    }
                  >
                    {CO_SO_ASSIGNABLE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {coSoAssignableRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="cso-settings-add-table-wrap">
                  <table className="cso-settings-add-table">
                    <thead>
                      <tr>
                        <th scope="col">Người dùng</th>
                        <th scope="col">Slug</th>
                        <th scope="col">Chọn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {query.trim().length < 1 ? (
                        <tr>
                          <td colSpan={3}>
                            <p className="cso-settings-add-empty">
                              Nhập tên hoặc @slug để tìm người.
                            </p>
                          </td>
                        </tr>
                      ) : searchLoading ? (
                        <tr>
                          <td colSpan={3}>
                            <p className="cso-settings-add-empty">Đang tìm…</p>
                          </td>
                        </tr>
                      ) : visibleResults.length === 0 ? (
                        <tr>
                          <td colSpan={3}>
                            <p className="cso-settings-add-empty">
                              {results.length > 0
                                ? "Mọi người trùng tên đã có trong danh sách."
                                : "Không thấy tài khoản phù hợp."}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        visibleResults.map((user) => {
                          const name = user.ten_hien_thi?.trim() || user.slug;
                          const selected = inviteTarget?.id === user.id;
                          return (
                            <tr
                              key={user.id}
                              className={
                                selected
                                  ? "cso-settings-add-row is-selected"
                                  : "cso-settings-add-row"
                              }
                            >
                              <td>
                                <div className="cso-settings-add-user">
                                  <MemberAvatar
                                    avatarId={user.avatar_id}
                                    name={name}
                                  />
                                  <span className="cso-settings-member-name">
                                    {name}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className="cso-settings-member-slug">
                                  @{user.slug}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className={
                                    selected
                                      ? "cso-settings-add-pick is-on"
                                      : "cso-settings-add-pick"
                                  }
                                  disabled={memberPending || pending}
                                  onClick={() => onSelectInviteTarget(user)}
                                >
                                  {selected ? "Đã chọn" : "Chọn"}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
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
                          Gửi lời mời với vai trò{" "}
                          <strong>{coSoAssignableRoleLabel(addRole)}</strong>.
                          Người này cần chấp nhận trong thông báo CINs.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="cso-settings-add-foot">
                <button
                  type="button"
                  className="cso-kh-foot-btn cso-kh-foot-btn--ghost"
                  disabled={memberPending || pending}
                  onClick={closeAddModal}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="cso-kh-foot-btn cso-kh-foot-btn--primary"
                  disabled={!inviteTarget || memberPending || pending}
                  onClick={() => onConfirmInvite()}
                >
                  {memberPending || pending ? "Đang gửi…" : "Gửi lời mời"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <section className="cso-settings-section">
      <div className="cso-settings-member-head">
        <p className="cso-settings-hint">
          Mời người quản trị trang cơ sở. Họ cần chấp nhận lời mời trong thông
          báo CINs trước khi quyền có hiệu lực.
        </p>
        {canManage ? (
          <button
            type="button"
            className="cso-settings-add-trigger"
            disabled={memberPending || pending}
            onClick={() => {
              onError(null);
              setAddOpen(true);
            }}
          >
            <UserPlus size={15} strokeWidth={2.3} aria-hidden />
            Thêm vai trò
          </button>
        ) : null}
      </div>

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
            <div className="cso-settings-member-side">
              {viewerIsOwner &&
              member.editable &&
              !member.isSelf &&
              member.trangThai === "active" ? (
                <button
                  type="button"
                  className="cso-settings-member-transfer"
                  title={`Bàn giao quyền sở hữu cho ${member.tenHienThi}`}
                  aria-label={`Bàn giao quyền sở hữu cho ${member.tenHienThi}`}
                  disabled={memberPending || pending}
                  onClick={() => {
                    setTransferError(null);
                    setTransferTarget(member);
                  }}
                >
                  <Crown size={14} aria-hidden />
                </button>
              ) : null}
              {canManage && member.editable && !member.isSelf ? (
                <button
                  type="button"
                  className="cso-settings-member-del"
                  aria-label={
                    isPendingMember(member)
                      ? `Hủy lời mời ${member.tenHienThi}`
                      : `Gỡ quyền ${member.tenHienThi}`
                  }
                  title={
                    isPendingMember(member) ? "Hủy lời mời" : "Gỡ quyền"
                  }
                  disabled={memberPending || pending}
                  onClick={() => askRemove(member)}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {!canManage ? (
        <p className="cso-settings-field-note">
          Chỉ quản trị viên mới mời hoặc đổi quyền người khác.
        </p>
      ) : null}

      {addModal}

      {removeTarget && typeof document !== "undefined"
        ? createPortal(
            <div
              className="cso-settings-warn-backdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cso-settings-remove-title"
              onMouseDown={(e) => {
                if (
                  e.target === e.currentTarget &&
                  !memberPending &&
                  !pending
                ) {
                  setRemoveTarget(null);
                  setRemoveError(null);
                }
              }}
            >
              <div className="cso-settings-warn-modal">
                <div className="cso-settings-warn-icon" aria-hidden>
                  <AlertTriangle size={22} strokeWidth={2.2} />
                </div>
                <h3
                  id="cso-settings-remove-title"
                  className="cso-settings-warn-title"
                >
                  {isPendingMember(removeTarget)
                    ? "Hủy lời mời?"
                    : "Gỡ quyền quản trị?"}
                </h3>
                <p className="cso-settings-warn-body">
                  {isPendingMember(removeTarget) ? (
                    <>
                      Hủy lời mời gửi tới{" "}
                      <strong>{removeTarget.tenHienThi}</strong> (
                      {coSoAssignableRoleLabel(removeTarget.vaiTro)}). Họ sẽ
                      không còn thấy lời mời này.
                    </>
                  ) : (
                    <>
                      Gỡ{" "}
                      <strong>
                        {coSoVaiTroLabel(removeTarget.vaiTro)}
                      </strong>{" "}
                      của <strong>{removeTarget.tenHienThi}</strong> khỏi{" "}
                      <strong>{orgLabel}</strong>. Người này mất quyền quản trị
                      cơ sở ngay — gồm dashboard, phòng lớp chat và cài đặt —
                      cho đến khi được mời lại.
                    </>
                  )}
                </p>
                {removeError ? (
                  <p className="cso-settings-warn-error">{removeError}</p>
                ) : null}
                <div className="cso-settings-warn-actions">
                  <button
                    type="button"
                    className="cso-kh-foot-btn cso-kh-foot-btn--ghost"
                    disabled={memberPending || pending}
                    onClick={() => {
                      setRemoveTarget(null);
                      setRemoveError(null);
                    }}
                  >
                    Không
                  </button>
                  <button
                    type="button"
                    className="cso-settings-warn-danger"
                    disabled={memberPending || pending}
                    onClick={() => void confirmRemove()}
                  >
                    {memberPending || pending
                      ? "Đang gỡ…"
                      : isPendingMember(removeTarget)
                        ? "Hủy lời mời"
                        : "Gỡ quyền"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <TransferOwnerModal
        open={Boolean(transferTarget)}
        orgSlug={orgSlug}
        orgLabel={orgLabel}
        targetName={transferTarget?.tenHienThi ?? ""}
        pending={transferPending}
        error={transferError}
        onConfirm={onConfirmTransfer}
        onClose={() => {
          if (!transferPending) {
            setTransferTarget(null);
            setTransferError(null);
          }
        }}
      />
    </section>
  );
}
