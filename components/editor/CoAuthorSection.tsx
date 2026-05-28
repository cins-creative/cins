"use client";

import { Search, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { loadAllArticlesForTagPicker } from "@/lib/editor/search-articles-action";
import { getAvatarUrl } from "@/lib/journey/profile";
import type { CoAuthorDraft } from "@/lib/social/types";

type SearchUser = {
  id: string;
  slug: string;
  ten_hien_thi: string;
  avatar_id: string | null;
};

type Props = {
  ownerId: string;
  collaborators: CoAuthorDraft[];
  ownerVaiTro: string;
  onCollaboratorsChange: (next: CoAuthorDraft[]) => void;
  onOwnerVaiTroChange: (v: string) => void;
};

export function CoAuthorSection({
  ownerId,
  collaborators,
  onCollaboratorsChange,
}: Props) {
  const roleListId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [hasMutual, setHasMutual] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        q,
        mutual_only: "true",
      });
      const res = await fetch(`/api/users/search?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        setResults([]);
        return;
      }
      const users = (json.users ?? []) as SearchUser[];
      const filtered = users.filter((u) => u.id !== ownerId);
      setResults(filtered);
      if (!q) setHasMutual(filtered.length > 0);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    const t = setTimeout(() => {
      void search(query.trim());
    }, 250);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    let cancelled = false;
    void loadAllArticlesForTagPicker()
      .then((rows) => {
        if (cancelled) return;
        const suggestions = rows
          .filter((row) => row.loai_bai_viet === "nghe")
          .map((row) => row.tieu_de)
          .filter(Boolean)
          .slice(0, 80);
        setRoleSuggestions([...new Set(suggestions)]);
      })
      .catch(() => {
        if (!cancelled) setRoleSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addSelectedUsers = () => {
    const selectedUsers = results.filter(
      (u) =>
        selectedIds.includes(u.id) &&
        !collaborators.some((c) => c.idNguoiDung === u.id),
    );
    if (selectedUsers.length === 0) return;
    onCollaboratorsChange([
      ...collaborators,
      ...selectedUsers.map((u) => ({
        idNguoiDung: u.id,
        slug: u.slug,
        tenHienThi: u.ten_hien_thi,
        avatarId: u.avatar_id,
        vaiTro: "",
      })),
    ]);
    setQuery("");
    setResults([]);
    setSelectedIds([]);
    setPickerOpen(false);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const removeUser = (id: string) => {
    onCollaboratorsChange(collaborators.filter((c) => c.idNguoiDung !== id));
  };

  const updateRole = (id: string, vaiTro: string) => {
    onCollaboratorsChange(
      collaborators.map((c) =>
        c.idNguoiDung === id ? { ...c, vaiTro } : c,
      ),
    );
  };

  return (
    <section className="ed-coauthor" aria-label="Người cùng làm">
      {collaborators.length > 0 ? (
        <ul className="ed-coauthor-chips">
          {collaborators.map((c) => (
            <li key={c.idNguoiDung} className="ed-coauthor-chip">
              <span className="ed-coauthor-chip-name">
                <CoAuthorAvatar
                  avatarId={c.avatarId ?? null}
                  name={c.tenHienThi || c.slug}
                />
                <span>
                  {c.tenHienThi || c.slug}
                  <small>@{c.slug}</small>
                </span>
              </span>
              <input
                type="text"
                className="ed-coauthor-chip-role"
                value={c.vaiTro}
                onChange={(e) => updateRole(c.idNguoiDung, e.target.value)}
                placeholder="Tìm vị trí công việc"
                aria-label={`Vị trí công việc của ${c.tenHienThi || c.slug}`}
                list={roleListId}
              />
              <button
                type="button"
                className="ed-coauthor-chip-remove"
                aria-label={`Bỏ ${c.tenHienThi || c.slug}`}
                onClick={() => removeUser(c.idNguoiDung)}
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        className="ed-coauthor-add"
        onClick={() => setPickerOpen((open) => !open)}
        aria-expanded={pickerOpen}
      >
        <UserPlus size={15} strokeWidth={2} aria-hidden />
        Thêm người
      </button>

      {pickerOpen ? (
        <div className="ed-coauthor-picker">
          {hasMutual === false ? (
            <p className="ed-coauthor-empty">
              Follow người dùng khác để tag họ vào bài.
            </p>
          ) : (
            <>
              <div className="ed-coauthor-search">
                <Search size={16} strokeWidth={1.8} aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm bạn cộng sự"
                  aria-label="Tìm người cùng làm"
                />
              </div>
              {loading ? (
                <p className="ed-coauthor-loading">Đang tìm…</p>
              ) : null}
              {results.length > 0 ? (
                <ul className="ed-coauthor-results" role="listbox">
                  {results.map((u) => {
                    const alreadyAdded = collaborators.some(
                      (c) => c.idNguoiDung === u.id,
                    );
                    const selected = selectedIds.includes(u.id);
                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected ? "true" : "false"}
                          disabled={alreadyAdded}
                          className={[
                            alreadyAdded && "is-selected",
                            selected && "is-pending",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => toggleSelected(u.id)}
                        >
                          <span
                            className="ed-coauthor-check"
                            aria-hidden
                          >
                            {alreadyAdded || selected ? "✓" : ""}
                          </span>
                          <CoAuthorAvatar
                            avatarId={u.avatar_id}
                            name={u.ten_hien_thi || u.slug}
                          />
                          <span className="ed-coauthor-result-copy">
                            <strong>{u.ten_hien_thi || u.slug}</strong>
                            <small>@{u.slug}</small>
                          </span>
                          {alreadyAdded ? (
                            <span className="ed-coauthor-selected">Đã thêm</span>
                          ) : selected ? (
                            <span className="ed-coauthor-selected is-pending">
                              Đang chọn
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              <div className="ed-coauthor-picker-actions">
                <span>{selectedIds.length} đã chọn</span>
                <button
                  type="button"
                  disabled={selectedIds.length === 0}
                  onClick={addSelectedUsers}
                >
                  Thêm đã chọn
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
      <datalist id={roleListId}>
        {roleSuggestions.map((role) => (
          <option key={role} value={role} />
        ))}
      </datalist>
    </section>
  );
}

function CoAuthorAvatar({
  avatarId,
  name,
}: {
  avatarId: string | null | undefined;
  name: string;
}) {
  const src = getAvatarUrl(avatarId);
  const initial = (name || "?").slice(0, 1).toUpperCase();
  return (
    <span className="ed-coauthor-avatar" aria-hidden>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : (
        <span>{initial}</span>
      )}
    </span>
  );
}
