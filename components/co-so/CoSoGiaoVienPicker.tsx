"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getAvatarUrl } from "@/lib/journey/profile";

export type CoSoGiaoVienPick = {
  userId: string;
  tenHienThi: string;
  slug: string;
  avatarId: string | null;
};

type SearchUser = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
};

type Props = {
  orgId: string;
  value: CoSoGiaoVienPick | null;
  onChange: (value: CoSoGiaoVienPick | null) => void;
  manualText?: string;
  onManualTextChange?: (text: string) => void;
  disabled?: boolean;
};

function toPick(user: {
  id: string;
  slug: string;
  ten_hien_thi?: string | null;
  tenHienThi?: string;
  avatar_id?: string | null;
  avatarId?: string | null;
}): CoSoGiaoVienPick {
  return {
    userId: user.id,
    slug: user.slug,
    tenHienThi:
      user.tenHienThi?.trim() ||
      user.ten_hien_thi?.trim() ||
      user.slug,
    avatarId: user.avatarId ?? user.avatar_id ?? null,
  };
}

function UserAvatar({
  avatarId,
  name,
  size = 36,
}: {
  avatarId: string | null;
  name: string;
  size?: number;
}) {
  const src = avatarId ? getAvatarUrl(avatarId) : null;
  return (
    <span
      className="cso-gv-picker-ava"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt="" />
      ) : (
        <span>{name.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}

export function CoSoGiaoVienPicker({
  orgId,
  value,
  onChange,
  manualText = "",
  onManualTextChange,
  disabled = false,
}: Props) {
  const canManual = Boolean(onManualTextChange);
  const [mode, setMode] = useState<"user" | "manual">("user");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (manualText.trim() && !value) {
      setMode("manual");
    }
  }, [manualText, value]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1 || mode !== "user") {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const params = new URLSearchParams({ q });
        if (orgId.trim()) params.set("org_id", orgId.trim());
        const res = await fetch(`/api/users/search?${params.toString()}`);
        const json = (await res.json().catch(() => null)) as {
          users?: SearchUser[];
        } | null;
        setResults(res.ok ? (json?.users ?? []) : []);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, mode, orgId]);

  const visibleResults = useMemo(
    () =>
      results
        .filter((user) => user.id !== value?.userId)
        .map((user) => toPick(user)),
    [results, value?.userId],
  );

  function selectUser(pick: CoSoGiaoVienPick) {
    onChange(pick);
    onManualTextChange?.("");
    setMode("user");
    setQuery("");
    setResults([]);
  }

  function clearUser() {
    onChange(null);
  }

  function switchMode(next: "user" | "manual") {
    if (next === mode || disabled) return;
    setMode(next);
    if (next === "manual") {
      clearUser();
      setQuery("");
      setResults([]);
    } else {
      onManualTextChange?.("");
    }
  }

  if (value) {
    return (
      <div className="cso-gv-picker">
        <div className="cso-gv-picker-selected">
          <UserAvatar avatarId={value.avatarId} name={value.tenHienThi} />
          <div className="cso-gv-picker-selected-meta">
            <strong>{value.tenHienThi}</strong>
            <span>@{value.slug}</span>
          </div>
          <button
            type="button"
            className="cso-gv-picker-clear"
            aria-label="Bỏ chọn giảng viên"
            disabled={disabled}
            onClick={clearUser}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cso-gv-picker">
      <div className={`cso-gv-picker-entry${canManual ? " has-switch" : ""}`}>
        {canManual ? (
          <div
            className="cso-gv-picker-switch"
            role="tablist"
            aria-label="Cách chọn giảng viên"
          >
            <button
              type="button"
              role="tab"
              className={`cso-gv-picker-switch-btn${mode === "user" ? " on" : ""}`}
              aria-selected={mode === "user"}
              disabled={disabled}
              onClick={() => switchMode("user")}
            >
              Tài khoản
            </button>
            <button
              type="button"
              role="tab"
              className={`cso-gv-picker-switch-btn${mode === "manual" ? " on" : ""}`}
              aria-selected={mode === "manual"}
              disabled={disabled}
              onClick={() => switchMode("manual")}
            >
              Tên thủ công
            </button>
          </div>
        ) : null}

        {mode === "user" ? (
          <div className="cso-gv-picker-search-wrap">
            <Search size={16} className="cso-gv-picker-search-icon" aria-hidden />
            <input
              type="search"
              className="cso-gv-picker-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc @slug…"
              disabled={disabled}
              autoComplete="off"
              aria-label="Tìm tài khoản CINS"
            />
            {searchLoading ? (
              <Loader2
                size={16}
                className="cso-gv-picker-spin tdh-spin"
                aria-hidden
              />
            ) : null}
          </div>
        ) : (
          <div className="cso-gv-picker-search-wrap">
            <input
              type="text"
              className="cso-gv-picker-search cso-gv-picker-search--manual"
              value={manualText}
              onChange={(e) => onManualTextChange?.(e.target.value)}
              placeholder="Tên giảng viên…"
              disabled={disabled}
              autoComplete="off"
              aria-label="Nhập tên giảng viên thủ công"
            />
          </div>
        )}
      </div>

      {mode === "user" ? (
        visibleResults.length > 0 ? (
          <div className="cso-gv-picker-section">
            <p className="cso-gv-picker-section-k">Kết quả tìm kiếm</p>
            <ul className="cso-gv-picker-list">
              {visibleResults.map((pick) => (
                <li key={pick.userId}>
                  <button
                    type="button"
                    className="cso-gv-picker-option"
                    disabled={disabled}
                    onClick={() => selectUser(pick)}
                  >
                    <UserAvatar
                      avatarId={pick.avatarId}
                      name={pick.tenHienThi}
                      size={32}
                    />
                    <span className="cso-gv-picker-option-meta">
                      <strong>{pick.tenHienThi}</strong>
                      <small>@{pick.slug}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : query.trim() && !searchLoading ? (
          <p className="cso-kh-field-hint">Không tìm thấy user phù hợp.</p>
        ) : null
      ) : (
        <p className="cso-kh-field-hint">
          Dùng khi GV chưa có tài khoản CINS.
        </p>
      )}
    </div>
  );
}
