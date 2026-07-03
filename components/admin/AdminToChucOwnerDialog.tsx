"use client";

import {
  ArrowLeft,
  Check,
  Crown,
  Loader2,
  Search,
  Shield,
  X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";

type SearchUser = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
};

type OwnerDialogOrg = {
  id: string;
  ten: string;
  slug: string;
};

type Props = {
  open: boolean;
  org: OwnerDialogOrg | null;
  currentOwnerName?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

type Step = "select" | "confirm";

function userLabel(user: SearchUser): string {
  return user.ten_hien_thi?.trim() || user.slug;
}

function UserAvatar({ name }: { name: string }) {
  return (
    <span className="admin-org-member-ava" aria-hidden>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function AdminToChucOwnerDialog({
  open,
  org,
  currentOwnerName,
  onClose,
  onSaved,
}: Props) {
  const titleId = useId();
  const [step, setStep] = useState<Step>("select");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selected, setSelected] = useState<SearchUser | null>(null);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset toàn bộ khi mở lại dialog cho tổ chức khác.
  useEffect(() => {
    if (!open) return;
    setStep("select");
    setQuery("");
    setResults([]);
    setSelected(null);
    setPassword("");
    setPending(false);
    setError(null);
  }, [open, org?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  useEffect(() => {
    if (!open || step !== "select" || query.trim().length < 1) {
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
  }, [open, step, query]);

  if (!open || !org) return null;

  function goConfirm() {
    if (!selected) return;
    setError(null);
    setStep("confirm");
  }

  async function handleConfirm() {
    if (!selected || !org) return;
    const pwd = password.trim();
    if (!pwd) {
      setError("Nhập mật khẩu ủy quyền để xác nhận.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/to-chuc/${encodeURIComponent(org.id)}/set-owner`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selected.id,
            delegationPassword: pwd,
          }),
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Không đổi được chủ trang.");
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đổi được chủ trang.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="admin-confirm-backdrop open"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div
        className="admin-org-members-dialog admin-owner-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="admin-org-members-dialog__header">
          <div>
            <h2 id={titleId} className="admin-org-members-dialog__title">
              <Crown size={16} strokeWidth={2.2} aria-hidden /> Đổi chủ trang
            </h2>
            <p className="admin-org-members-dialog__sub">
              {org.ten}{" "}
              <span className="admin-to-chuc-muted">@{org.slug}</span>
            </p>
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
          <p className="admin-owner-dialog__current">
            Chủ trang hiện tại:{" "}
            <strong>{currentOwnerName?.trim() || "Chưa gán"}</strong>
          </p>

          {step === "select" ? (
            <section className="admin-org-members-add">
              <label className="admin-to-chuc-search admin-org-members-search">
                <Search size={16} strokeWidth={2} aria-hidden />
                <input
                  type="search"
                  placeholder="Tìm user theo tên hoặc slug CINs…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={pending}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
              </label>

              {selected ? (
                <div className="admin-owner-dialog__picked">
                  <UserAvatar name={userLabel(selected)} />
                  <span className="admin-owner-dialog__picked-copy">
                    <strong>{userLabel(selected)}</strong>
                    <span className="admin-to-chuc-org-slug">
                      @{selected.slug}
                    </span>
                  </span>
                  <span className="admin-owner-dialog__picked-tag">
                    <Check size={13} strokeWidth={2.4} aria-hidden /> Đã chọn
                  </span>
                </div>
              ) : null}

              {searchLoading ? (
                <p className="admin-to-chuc-muted">Đang tìm…</p>
              ) : null}

              {results.length > 0 ? (
                <ul className="admin-org-members-search-results">
                  {results.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        className={`admin-org-members-search-hit${
                          selected?.id === user.id ? " is-selected" : ""
                        }`}
                        disabled={pending}
                        onClick={() => setSelected(user)}
                      >
                        <UserAvatar name={userLabel(user)} />
                        <span>
                          <strong>{userLabel(user)}</strong>
                          <span className="admin-to-chuc-org-slug">
                            @{user.slug}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : query.trim().length >= 1 && !searchLoading ? (
                <p className="admin-to-chuc-muted">Không tìm thấy user phù hợp.</p>
              ) : null}
            </section>
          ) : (
            <section className="admin-owner-dialog__confirm">
              <div className="admin-owner-dialog__picked admin-owner-dialog__picked--static">
                <UserAvatar name={userLabel(selected!)} />
                <span className="admin-owner-dialog__picked-copy">
                  <strong>{userLabel(selected!)}</strong>
                  <span className="admin-to-chuc-org-slug">
                    @{selected!.slug}
                  </span>
                </span>
                <span className="admin-org-members-owner-badge">
                  <Crown size={12} strokeWidth={2.2} aria-hidden /> Owner mới
                </span>
              </div>
              <p className="admin-owner-dialog__note">
                Owner cũ (nếu có) sẽ được hạ xuống <strong>Admin</strong>. Nhập
                mật khẩu ủy quyền để xác nhận.
              </p>

              <div className="admin-org-members-pwd admin-delete-pwd">
                <label className="form-label" htmlFor="admin-owner-pwd">
                  <Shield size={14} strokeWidth={2.2} aria-hidden /> Mật khẩu ủy
                  quyền
                </label>
                <input
                  id="admin-owner-pwd"
                  className="form-input"
                  type="password"
                  autoComplete="off"
                  placeholder="Nhập CINS_ORG_DELEGATION_PASSWORD"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !pending) void handleConfirm();
                  }}
                  disabled={pending}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
                <p className="admin-org-members-pwd-hint">
                  Chỉ Admin tối cao biết mật khẩu này — đăng nhập admin không
                  thay thế.
                </p>
              </div>
            </section>
          )}

          {error ? (
            <p
              className="admin-edit-form__msg admin-edit-form__msg--err"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="admin-org-members-dialog__footer">
          {step === "confirm" ? (
            <button
              type="button"
              className="btn btn-ghost admin-owner-dialog__back"
              onClick={() => {
                setError(null);
                setStep("select");
              }}
              disabled={pending}
            >
              <ArrowLeft size={15} strokeWidth={2.2} aria-hidden /> Quay lại
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={pending}
            >
              Hủy
            </button>
          )}

          {step === "select" ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={goConfirm}
              disabled={!selected || pending}
            >
              Lưu
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleConfirm()}
              disabled={pending || password.trim().length === 0}
            >
              {pending ? (
                <>
                  <Loader2
                    size={15}
                    strokeWidth={2.2}
                    className="admin-to-chuc-spin"
                    aria-hidden
                  />{" "}
                  Đang đổi…
                </>
              ) : (
                "Xác nhận đổi chủ trang"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
