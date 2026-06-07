"use client";

import { Loader2, Search, UserCog, UserPlus, X } from "lucide-react";
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

export function CongDongMembersModal({ open, onClose, orgId }: Props) {
  const titleId = useId();
  const [members, setMembers] = useState<CongDongMemberAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addRole, setAddRole] = useState<CongDongVaiTro>("thanh_vien");
  const [pending, startTransition] = useTransition();

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/cong-dong/${orgId}/members`);
      const json = (await res.json().catch(() => null)) as {
        members?: CongDongMemberAdmin[];
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tải được danh sách.");
        setMembers([]);
        return;
      }
      setMembers(json?.members ?? []);
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
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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

  if (!open || typeof document === "undefined") return null;

  const memberUserIds = new Set(members.map((m) => m.userId));

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
        <header className="cd-v4-members-head">
          <div className="cd-v4-members-head-copy">
            <UserCog size={18} strokeWidth={2} aria-hidden />
            <h2 id={titleId}>Thành viên &amp; quyền</h2>
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

        <div className="cd-v4-members-body">
          <section className="cd-v4-members-section">
            <h3>Thêm thành viên</h3>
            <p className="cd-v4-members-hint">
              Gõ tên tài khoản, chọn quyền rồi thêm vào nhóm.
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
              <p className="cd-v4-members-muted">Đang tìm…</p>
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

          <section className="cd-v4-members-section">
            <h3>Danh sách ({members.length})</h3>
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
              <p className="cd-v4-members-muted">Chưa có thành viên.</p>
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
                      <CongDongMemberRolePicker
                        compact
                        value={member.vaiTro}
                        disabled={pending}
                        ariaLabel={`Quyền của ${member.tenHienThi}`}
                        onChange={(vaiTro) => onRoleChange(member, vaiTro)}
                      />
                    ) : (
                      <span className="cd-v4-members-role-badge">
                        Chủ sở hữu
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {err ? (
            <p className="cd-v4-members-err" role="alert">
              {err}
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
