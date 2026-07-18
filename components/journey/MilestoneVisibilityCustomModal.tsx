"use client";

import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type {
  MilestoneVisibilityCustom,
  MilestoneVisibilityCustomPerson,
} from "@/components/journey/milestone-types";
import { avatarBg, avatarInitialFromName } from "@/lib/chat/avatar";
import { getAvatarUrl } from "@/lib/journey/profile";
import type { VisibilityNgoaiLeLoai } from "@/lib/journey/milestone-visibility-custom.shared";

type UserQuanHe = "ban_be" | "theo_doi" | "nguoi_la";

type UserRow = {
  id: string;
  slug: string;
  ten_hien_thi: string;
  avatar_id: string | null;
  quan_he?: UserQuanHe;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (payload: {
    mode: VisibilityNgoaiLeLoai;
    people: MilestoneVisibilityCustomPerson[];
  }) => void | Promise<void>;
  initial?: MilestoneVisibilityCustom | null;
  pending?: boolean;
  error?: string | null;
  /** UUID chủ bài — không cho tự chọn. */
  excludeUserId?: string | null;
};

const QUAN_HE_LABEL: Record<UserQuanHe, string> = {
  ban_be: "Bạn bè",
  theo_doi: "Đang theo dõi",
  nguoi_la: "Người lạ",
};

function personFromRow(u: UserRow): MilestoneVisibilityCustomPerson {
  return {
    id: u.id,
    name: (u.ten_hien_thi || "").trim() || u.slug,
    slug: u.slug,
    avatarUrl: getAvatarUrl(u.avatar_id),
  };
}

function PersonAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  const initial = avatarInitialFromName(name);
  return (
    <span
      className={`j-vis-custom-avatar${avatarUrl ? " has-image" : ""}`}
      style={{
        background: avatarUrl ? "transparent" : avatarBg(name.length * 17),
      }}
      aria-hidden
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" />
      ) : (
        initial
      )}
    </span>
  );
}

async function searchUsers(params: {
  q?: string;
  friendsOnly?: boolean;
  mutualOnly?: boolean;
  rankRelation?: boolean;
}): Promise<UserRow[]> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.friendsOnly) sp.set("friends_only", "true");
  if (params.mutualOnly) sp.set("mutual_only", "true");
  if (params.rankRelation) sp.set("rank_relation", "true");
  const res = await fetch(`/api/users/search?${sp.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Không tải được danh sách người dùng.");
  const json = (await res.json()) as { users?: UserRow[] };
  return json.users ?? [];
}

export function MilestoneVisibilityCustomModal({
  open,
  onClose,
  onSave,
  initial = null,
  pending = false,
  error = null,
  excludeUserId = null,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<VisibilityNgoaiLeLoai>("chan");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<UserRow[]>([]);
  const [selected, setSelected] = useState<MilestoneVisibilityCustomPerson[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    setMode(initial?.mode ?? "chan");
    setSelected(initial?.people ?? []);
    setQuery("");
    setDebouncedQuery("");
    setResults([]);
    setLocalError(null);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key !== "Escape" || pending) return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
    document.addEventListener("keydown", onEsc, true);
    return () => document.removeEventListener("keydown", onEsc, true);
  }, [open, pending, onClose]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLocalError(null);

    void (async () => {
      try {
        const next =
          debouncedQuery.length >= 1
            ? await searchUsers({ q: debouncedQuery, rankRelation: true })
            : await searchUsers({ friendsOnly: true, rankRelation: true });
        if (!cancelled) setResults(next);
      } catch (e) {
        if (!cancelled) {
          setLocalError(
            e instanceof Error ? e.message : "Không tải được danh sách.",
          );
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, debouncedQuery]);

  const selectedIds = useMemo(
    () => new Set(selected.map((p) => p.id)),
    [selected],
  );

  const listUsers = useMemo(() => {
    const exclude = excludeUserId?.trim() || null;
    return results.filter((u) => {
      if (exclude && u.id === exclude) return false;
      return true;
    });
  }, [results, excludeUserId]);

  const togglePerson = useCallback((row: UserRow) => {
    setSelected((prev) => {
      if (prev.some((p) => p.id === row.id)) {
        return prev.filter((p) => p.id !== row.id);
      }
      return [...prev, personFromRow(row)];
    });
  }, []);

  const removePerson = useCallback((id: string) => {
    setSelected((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleSave = async () => {
    if (pending) return;
    if (selected.length === 0) {
      setLocalError(
        mode === "chan"
          ? "Chọn ít nhất một người để chặn."
          : "Chọn ít nhất một người được xem.",
      );
      return;
    }
    setLocalError(null);
    await onSave({ mode, people: selected });
  };

  if (!mounted || !open) return null;

  const displayError = error || localError;

  const modal = (
    <div className="j-vis-custom-root" role="presentation">
      <button
        type="button"
        className="j-vis-custom-backdrop"
        aria-label="Đóng"
        disabled={pending}
        onClick={() => {
          if (!pending) onClose();
        }}
      />
      <section
        className="j-vis-custom-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="j-vis-custom-title"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="j-vis-custom-head">
          <span className="j-vis-custom-icon" aria-hidden>
            <SlidersHorizontal size={18} strokeWidth={2} />
          </span>
          <div>
            <h3 id="j-vis-custom-title">Tùy chỉnh hiển thị</h3>
            <p>
              {mode === "chan"
                ? "Nền Bạn bè — ẩn với người bạn chọn."
                : "Chỉ mình bạn và những người được chọn mới xem được."}
            </p>
          </div>
          <button
            type="button"
            className="j-vis-custom-close"
            aria-label="Đóng"
            disabled={pending}
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="j-vis-custom-body">
          <div className="j-vis-custom-modes" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "chan"}
              className={`j-vis-custom-mode${mode === "chan" ? " is-active" : ""}`}
              disabled={pending}
              onClick={() => setMode("chan")}
            >
              Chặn người
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "cho_phep"}
              className={`j-vis-custom-mode${mode === "cho_phep" ? " is-active" : ""}`}
              disabled={pending}
              onClick={() => setMode("cho_phep")}
            >
              Chỉ một số người
            </button>
          </div>

          {selected.length > 0 ? (
            <div className="j-vis-custom-selected">
              <div className="j-vis-custom-section-label">
                Đã chọn · {selected.length}
              </div>
              <div className="j-vis-custom-chips">
                {selected.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="j-vis-custom-chip"
                    disabled={pending}
                    onClick={() => removePerson(p.id)}
                    title="Bỏ chọn"
                  >
                    <PersonAvatar name={p.name} avatarUrl={p.avatarUrl} />
                    <span>{p.name}</span>
                    <X size={12} strokeWidth={2.2} aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="j-vis-custom-picker">
            <div className="j-vis-custom-section-label">
              {debouncedQuery ? "Kết quả tìm kiếm" : "Bạn bè"}
            </div>
            <label className="j-vis-custom-search">
              <Search size={15} strokeWidth={2} aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên hoặc slug…"
                disabled={pending}
                autoComplete="off"
              />
            </label>

            <div className="j-vis-custom-list" role="listbox">
              {loading ? (
                <div className="j-vis-custom-empty">
                  <Loader2 size={16} className="j-vis-custom-spin" aria-hidden />
                  Đang tải…
                </div>
              ) : listUsers.length === 0 ? (
                <div className="j-vis-custom-empty">
                  {debouncedQuery
                    ? "Không tìm thấy người phù hợp."
                    : "Chưa có bạn bè để chọn. Hãy tìm theo tên."}
                </div>
              ) : (
                listUsers.map((u) => {
                  const active = selectedIds.has(u.id);
                  const name = (u.ten_hien_thi || "").trim() || u.slug;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`j-vis-custom-row${active ? " is-active" : ""}`}
                      disabled={pending}
                      onClick={() => togglePerson(u)}
                    >
                      <PersonAvatar
                        name={name}
                        avatarUrl={getAvatarUrl(u.avatar_id)}
                      />
                      <span className="j-vis-custom-row-meta">
                        <strong>{name}</strong>
                        <span>
                          @{u.slug}
                          {u.quan_he ? ` · ${QUAN_HE_LABEL[u.quan_he]}` : ""}
                        </span>
                      </span>
                      <span className="j-vis-custom-check" aria-hidden>
                        {active ? "✓" : ""}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {displayError ? (
            <p className="j-vis-custom-error" role="alert">
              {displayError}
            </p>
          ) : null}
        </div>

        <footer className="j-vis-custom-foot">
          <button
            type="button"
            className="j-vis-custom-btn ghost"
            disabled={pending}
            onClick={onClose}
          >
            Huỷ
          </button>
          <button
            type="button"
            className="j-vis-custom-btn primary"
            disabled={pending || selected.length === 0}
            onClick={() => void handleSave()}
          >
            {pending ? (
              <>
                <Loader2 size={14} className="j-vis-custom-spin" aria-hidden />
                Đang lưu
              </>
            ) : (
              "Lưu"
            )}
          </button>
        </footer>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
