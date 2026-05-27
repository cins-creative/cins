"use client";

import { Search, UserPlus, Users, X } from "lucide-react";
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
  collaborators: CoAuthorDraft[];
  ownerVaiTro: string;
  onCollaboratorsChange: (next: CoAuthorDraft[]) => void;
  onOwnerVaiTroChange: (v: string) => void;
};

export function CoAuthorSection({
  collaborators,
  ownerVaiTro,
  onCollaboratorsChange,
  onOwnerVaiTroChange,
}: Props) {
  const roleListId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [hasMutual, setHasMutual] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);

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
      setResults(users);
      if (!q) setHasMutual(users.length > 0);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const addUser = (u: SearchUser) => {
    if (collaborators.some((c) => c.idNguoiDung === u.id)) return;
    onCollaboratorsChange([
      ...collaborators,
      {
        idNguoiDung: u.id,
        slug: u.slug,
        tenHienThi: u.ten_hien_thi,
        avatarId: u.avatar_id,
        vaiTro: "",
      },
    ]);
    setQuery("");
    setResults([]);
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
    <section className="ed-coauthor" aria-labelledby="ed-coauthor-heading">
      <div className="ed-coauthor-head">
        <span className="ed-coauthor-icon" aria-hidden>
          <Users size={17} strokeWidth={1.9} />
        </span>
        <div>
          <h2 id="ed-coauthor-heading" className="ed-coauthor-title">
            Người cùng làm
          </h2>
          <p className="ed-coauthor-hint">
            Tag mutual follow. Họ cần chấp nhận trước khi bài hiện trên Journey.
          </p>
        </div>
        <span className="ed-coauthor-count">
          {collaborators.length + 1} người
        </span>
      </div>

      <div className="ed-coauthor-grid">
        <label className="ed-coauthor-owner-label">
          <span>Vai trò của tôi</span>
          <input
            type="text"
            className="ed-coauthor-input"
            value={ownerVaiTro}
            onChange={(e) => onOwnerVaiTroChange(e.target.value)}
            placeholder="Tìm nghề / vai trò…"
            list={roleListId}
          />
        </label>

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
                  {results.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected="false"
                        onClick={() => addUser(u)}
                      >
                        <UserPlus size={14} aria-hidden />
                        <CoAuthorAvatar
                          avatarId={u.avatar_id}
                          name={u.ten_hien_thi || u.slug}
                        />
                        <span>{u.ten_hien_thi || u.slug}</span>
                        <span className="ed-coauthor-slug">@{u.slug}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
      </div>

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
                placeholder="Tìm nghề / vai trò"
                aria-label={`Vai trò của ${c.tenHienThi || c.slug}`}
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
