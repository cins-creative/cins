"use client";

import { Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [hasMutual, setHasMutual] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

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
      <h2 id="ed-coauthor-heading" className="ed-coauthor-title">
        Người cùng làm
      </h2>
      <p className="ed-coauthor-hint">
        Chỉ tag được người bạn theo dõi lẫn nhau. Họ sẽ nhận lời mời chấp nhận
        trước khi bài hiện trên Journey của họ.
      </p>

      <label className="ed-coauthor-owner-label">
        Vai trò của tôi trong bài này
        <input
          type="text"
          className="ed-coauthor-input"
          value={ownerVaiTro}
          onChange={(e) => onOwnerVaiTroChange(e.target.value)}
          placeholder="VD: Director, Writer…"
        />
      </label>

      {hasMutual === false ? (
        <p className="ed-coauthor-empty">
          Follow người dùng khác để tag họ vào bài — cần theo dõi lẫn nhau.
        </p>
      ) : (
        <>
          <div className="ed-coauthor-search">
            <Search size={16} strokeWidth={1.8} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc @slug…"
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
                    {u.ten_hien_thi || u.slug}
                    <span className="ed-coauthor-slug">@{u.slug}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}

      {collaborators.length > 0 ? (
        <ul className="ed-coauthor-chips">
          {collaborators.map((c) => (
            <li key={c.idNguoiDung} className="ed-coauthor-chip">
              <span className="ed-coauthor-chip-name">
                {c.tenHienThi || c.slug}
              </span>
              <input
                type="text"
                className="ed-coauthor-chip-role"
                value={c.vaiTro}
                onChange={(e) => updateRole(c.idNguoiDung, e.target.value)}
                placeholder="Vai trò (VD: Colorist)"
                aria-label={`Vai trò của ${c.tenHienThi || c.slug}`}
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
    </section>
  );
}
