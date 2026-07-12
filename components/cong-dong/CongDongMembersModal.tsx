"use client";

import { Crown, Loader2, Search, UserCog, UserPlus, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import { CongDongAuthorMetaLine } from "@/components/cong-dong/CongDongAuthorMetaLine";
import { CongDongMemberRolePicker } from "@/components/cong-dong/CongDongMemberRolePicker";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { TransferOwnerModal } from "@/components/to-chuc/TransferOwnerModal";
import {
  type CongDongVaiTro,
} from "@/lib/cong-dong/vai-tro";
import type { CongDongMemberAdmin } from "@/lib/cong-dong/types";
import { getAvatarUrl } from "@/lib/journey/profile";

type SearchUser = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
};

const MEMBERS_POPOVER_Z = 10600;

type Props = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  orgSlug: string;
  orgLabel: string;
  viewerIsOwner: boolean;
  /** Nhúng trong bảng quản lý — không portal / không khóa scroll body. */
  embedded?: boolean;
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
    <span className="cd-v4-members-avatar" aria-hidden>
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt="" />
      ) : (
        <span>{name.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}

export function CongDongMembersModal({
  open,
  onClose,
  orgId,
  orgSlug,
  orgLabel,
  viewerIsOwner,
  embedded = false,
}: Props) {
  const titleId = useId();
  const [members, setMembers] = useState<CongDongMemberAdmin[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CongDongMemberAdmin[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addRole, setAddRole] = useState<CongDongVaiTro>("thanh_vien");
  const [transferTarget, setTransferTarget] =
    useState<CongDongMemberAdmin | null>(null);
  const [transferPending, setTransferPending] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/cong-dong/${orgId}/members`);
      const json = (await res.json().catch(() => null)) as {
        members?: CongDongMemberAdmin[];
        pending?: CongDongMemberAdmin[];
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tải được danh sách.");
        setMembers([]);
        setPendingRequests([]);
        return;
      }
      setMembers(json?.members ?? []);
      setPendingRequests(json?.pending ?? []);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!open) return;
    void loadMembers();
    setQuery("");
    setResults([]);
    setAddRole("thanh_vien");
    setErr(null);
  }, [open, loadMembers]);

  useEffect(() => {
    if (!open || embedded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, embedded]);

  useEffect(() => {
    if (!open || embedded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, embedded]);

  useEffect(() => {
    if (!open) return;
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
        if (!res.ok) {
          setResults([]);
          return;
        }
        setResults(json?.users ?? []);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [open, query]);

  function upsertMember(next: CongDongMemberAdmin) {
    setMembers((prev) => {
      const idx = prev.findIndex((m) => m.userId === next.userId);
      if (idx === -1) {
        return [...prev, next].sort((a, b) =>
          a.tenHienThi.localeCompare(b.tenHienThi, "vi"),
        );
      }
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  }

  function onAddUser(user: SearchUser) {
    setErr(null);
    startTransition(async () => {
      const res = await fetch(`/api/cong-dong/${orgId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, vaiTro: addRole }),
      });
      const json = (await res.json().catch(() => null)) as {
        member?: CongDongMemberAdmin;
        error?: string;
      } | null;
      if (!res.ok || !json?.member) {
        setErr(json?.error ?? "Không thêm được thành viên.");
        return;
      }
      upsertMember(json.member);
      setQuery("");
      setResults([]);
    });
  }

  function onRoleChange(member: CongDongMemberAdmin, vaiTro: CongDongVaiTro) {
    if (!member.editable || member.vaiTro === vaiTro) return;
    setErr(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/cong-dong/${orgId}/members/${member.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vaiTro }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        member?: CongDongMemberAdmin;
        error?: string;
      } | null;
      if (!res.ok || !json?.member) {
        setErr(json?.error ?? "Không cập nhật được quyền.");
        return;
      }
      upsertMember(json.member);
    });
  }

  function onApproveRequest(member: CongDongMemberAdmin) {
    setErr(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/cong-dong/${orgId}/members/${member.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        member?: CongDongMemberAdmin;
        error?: string;
      } | null;
      if (!res.ok || !json?.member) {
        setErr(json?.error ?? "Không duyệt được yêu cầu.");
        return;
      }
      setPendingRequests((prev) => prev.filter((m) => m.id !== member.id));
      upsertMember(json.member);
    });
  }

  function onRejectRequest(member: CongDongMemberAdmin) {
    setErr(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/cong-dong/${orgId}/members/${member.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reject" }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không từ chối được yêu cầu.");
        return;
      }
      setPendingRequests((prev) => prev.filter((m) => m.id !== member.id));
    });
  }

  function onConfirmTransfer(confirmSlug: string) {
    if (!transferTarget) return;
    setTransferError(null);
    setTransferPending(true);
    void (async () => {
      try {
        const res = await fetch(`/api/cong-dong/${orgId}/transfer-owner`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            membershipId: transferTarget.id,
            confirmSlug,
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          members?: CongDongMemberAdmin[];
          error?: string;
        } | null;
        if (!res.ok || !json?.members) {
          setTransferError(json?.error ?? "Không bàn giao được quyền sở hữu.");
          return;
        }
        setMembers(json.members);
        setTransferTarget(null);
      } finally {
        setTransferPending(false);
      }
    })();
  }

  if (!open || typeof document === "undefined") return null;

  const memberUserIds = new Set(members.map((m) => m.userId));

  const body = (
    <>
      {!embedded ? (
        <header className="cd-v4-members-head">
          <div className="cd-v4-members-head-copy">
            <span className="cd-v4-members-head-icon" aria-hidden>
              <UserCog size={18} strokeWidth={2} />
            </span>
            <div className="cd-v4-members-head-text">
              <h2 id={titleId}>Thành viên &amp; quyền</h2>
              <p className="cd-v4-members-head-sub">
                Thêm người vào nhóm, gán quyền đăng bài hoặc quản trị.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="cd-v4-members-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>
      ) : null}

        <div className="cd-v4-members-body">
          {err ? (
            <p className="cd-v4-members-err" role="alert">
              {err}
            </p>
          ) : null}

          <section className="cd-v4-members-panel cd-v4-members-panel--add">
            <div className="cd-v4-members-panel-head">
              <div className="cd-v4-members-panel-title">
                <UserPlus size={15} strokeWidth={2} aria-hidden />
                <h3>Thêm thành viên</h3>
              </div>
            </div>
            <p className="cd-v4-members-hint">
              Tìm theo tên tài khoản, chọn quyền rồi thêm vào nhóm.
            </p>
            <div className="cd-v4-members-add-row">
              <label className="cd-v4-members-search">
                <Search size={15} strokeWidth={2} aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm theo tên…"
                  autoComplete="off"
                  aria-label="Tìm thành viên theo tên"
                />
              </label>
              <CongDongMemberRolePicker
                value={addRole}
                onChange={setAddRole}
                disabled={pending}
                ariaLabel="Quyền khi thêm"
              />
            </div>

            {searchLoading ? (
              <p className="cd-v4-members-muted">
                <Loader2
                  size={14}
                  strokeWidth={2}
                  className="cd-v4-members-spin"
                  aria-hidden
                />
                Đang tìm…
              </p>
            ) : null}

            {results.length > 0 ? (
              <ul className="cd-v4-members-search-list">
                {results.map((user) => {
                  const name = user.ten_hien_thi?.trim() || user.slug;
                  const already = memberUserIds.has(user.id);
                  return (
                    <li key={user.id}>
                      <div className="cd-v4-members-search-copy">
                        <MemberAvatar
                          avatarId={user.avatar_id}
                          name={name}
                        />
                        <div>
                          <strong>{name}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="cd-v4-members-add-btn"
                        disabled={pending || already}
                        onClick={() => onAddUser(user)}
                      >
                        <UserPlus size={14} strokeWidth={2} aria-hidden />
                        {already ? "Đã có" : "Thêm"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : query.trim().length >= 1 && !searchLoading ? (
              <p className="cd-v4-members-muted">Không thấy ai trùng tên.</p>
            ) : null}
          </section>

          {pendingRequests.length > 0 ? (
            <section className="cd-v4-members-panel cd-v4-members-panel--list">
              <div className="cd-v4-members-panel-head">
                <div className="cd-v4-members-panel-title">
                  <h3>Yêu cầu tham gia</h3>
                </div>
                <span className="cd-v4-members-count">
                  {pendingRequests.length}
                </span>
              </div>
              <div className="cd-v4-members-list-scroll">
                <ul className="cd-v4-members-list">
                  {pendingRequests.map((member) => (
                    <li key={member.id}>
                      <div className="cd-v4-members-row-copy">
                        <JourneyUserPopover
                          slug={member.slug}
                          fallbackName={member.tenHienThi}
                          fallbackAvatarUrl={
                            member.avatarId
                              ? getAvatarUrl(member.avatarId)
                              : null
                          }
                          backdropZIndex={MEMBERS_POPOVER_Z}
                        >
                          <span className="cd-v4-members-row-trigger">
                            <MemberAvatar
                              avatarId={member.avatarId}
                              name={member.tenHienThi}
                            />
                            <div className="cd-v4-members-row-text">
                              <strong>{member.tenHienThi}</strong>
                              <span className="cd-v4-members-muted">
                                Đang chờ duyệt
                              </span>
                            </div>
                          </span>
                        </JourneyUserPopover>
                      </div>
                      <span className="cd-v4-members-row-actions">
                        <button
                          type="button"
                          className="cd-v4-members-add-btn"
                          disabled={pending}
                          onClick={() => onApproveRequest(member)}
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          className="cd-v4-members-transfer"
                          disabled={pending}
                          onClick={() => onRejectRequest(member)}
                        >
                          Từ chối
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          <section className="cd-v4-members-panel cd-v4-members-panel--list">
            <div className="cd-v4-members-panel-head">
              <div className="cd-v4-members-panel-title">
                <h3>Danh sách thành viên</h3>
              </div>
              <span className="cd-v4-members-count">{members.length}</span>
            </div>

            <div className="cd-v4-members-list-scroll">
              {loading ? (
                <p className="cd-v4-members-muted">
                  <Loader2
                    size={14}
                    strokeWidth={2}
                    className="cd-v4-members-spin"
                    aria-hidden
                  />
                  Đang tải…
                </p>
              ) : members.length === 0 ? (
                <p className="cd-v4-members-empty">Chưa có thành viên.</p>
              ) : (
                <ul className="cd-v4-members-list">
                  {members.map((member) => (
                    <li key={member.id}>
                      <div className="cd-v4-members-row-copy">
                        <JourneyUserPopover
                          slug={member.slug}
                          fallbackName={member.tenHienThi}
                          fallbackAvatarUrl={
                            member.avatarId
                              ? getAvatarUrl(member.avatarId)
                              : null
                          }
                          backdropZIndex={MEMBERS_POPOVER_Z}
                        >
                          <span className="cd-v4-members-row-trigger">
                            <MemberAvatar
                              avatarId={member.avatarId}
                              name={member.tenHienThi}
                            />
                            <div className="cd-v4-members-row-text">
                              <strong>{member.tenHienThi}</strong>
                              <CongDongAuthorMetaLine
                                soBaiVietTrongNhom={member.soBaiVietTrongNhom}
                                activityAt={member.baiVietGanNhatLuc}
                              />
                            </div>
                          </span>
                        </JourneyUserPopover>
                      </div>
                      {member.editable ? (
                        <span className="cd-v4-members-row-actions">
                          {viewerIsOwner ? (
                            <button
                              type="button"
                              className="cd-v4-members-transfer"
                              title={`Bàn giao quyền sở hữu cho ${member.tenHienThi}`}
                              aria-label={`Bàn giao quyền sở hữu cho ${member.tenHienThi}`}
                              disabled={pending || transferPending}
                              onClick={() => {
                                setTransferError(null);
                                setTransferTarget(member);
                              }}
                            >
                              <Crown size={15} strokeWidth={2} aria-hidden />
                            </button>
                          ) : null}
                          <CongDongMemberRolePicker
                            compact
                            value={member.vaiTro}
                            disabled={pending}
                            ariaLabel={`Quyền của ${member.tenHienThi}`}
                            onChange={(vaiTro) => onRoleChange(member, vaiTro)}
                          />
                        </span>
                      ) : (
                        <span className="cd-v4-members-role-badge">
                          Chủ sở hữu
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

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
    </>
  );

  if (embedded) {
    return <div className="cd-v4-members-embed">{body}</div>;
  }

  return createPortal(
    <div
      className="cd-v4-members-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="cd-v4-members-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {body}
      </div>
    </div>,
    document.body,
  );
}
