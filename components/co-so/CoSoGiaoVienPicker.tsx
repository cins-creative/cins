"use client";

import { Loader2, Search, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getAvatarUrl } from "@/lib/journey/profile";
import type { CoSoMemberAdmin } from "@/lib/to-chuc/co-so-settings-types";

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

const STAFF_ROLES = new Set([
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "quan_ly_tuyen_sinh",
  "giao_vien",
  "nhan_vien",
]);

export function CoSoGiaoVienPicker({
  orgId,
  value,
  onChange,
  manualText = "",
  onManualTextChange,
  disabled = false,
}: Props) {
  const [mode, setMode] = useState<"user" | "manual">("user");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [staffSuggestions, setStaffSuggestions] = useState<CoSoGiaoVienPick[]>(
    [],
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);

  useEffect(() => {
    if (manualText.trim() && !value) {
      setMode("manual");
    }
  }, [manualText, value]);

  useEffect(() => {
    let cancelled = false;
    setStaffLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/co-so/${encodeURIComponent(orgId)}/members`);
        const json = (await res.json().catch(() => null)) as {
          members?: CoSoMemberAdmin[];
        } | null;
        if (cancelled || !res.ok || !json?.members) return;
        const picks = json.members
          .filter(
            (m) =>
              m.trangThai === "active" &&
              STAFF_ROLES.has(m.vaiTro) &&
              m.userId !== value?.userId,
          )
          .map((m) =>
            toPick({
              id: m.userId,
              slug: m.slug,
              tenHienThi: m.tenHienThi,
              avatarId: m.avatarId,
            }),
          );
        setStaffSuggestions(picks);
      } finally {
        if (!cancelled) setStaffLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, value?.userId]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
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
    return () => window.clearTimeout(timer);
  }, [query]);

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

  if (mode === "manual") {
    return (
      <div className="cso-gv-picker">
        <input
          type="text"
          className="cso-kh-input"
          value={manualText}
          onChange={(e) => onManualTextChange?.(e.target.value)}
          placeholder="Tên giảng viên (chưa có tài khoản CINS)"
          disabled={disabled}
        />
        <button
          type="button"
          className="cso-gv-picker-mode-link"
          disabled={disabled}
          onClick={() => {
            setMode("user");
            onManualTextChange?.("");
          }}
        >
          Chọn tài khoản CINS thay thế
        </button>
        <p className="cso-kh-field-hint">
          Dùng khi GV chưa đăng ký. Nên ưu tiên gán user để liên kết hồ sơ sau
          này.
        </p>
      </div>
    );
  }

  return (
    <div className="cso-gv-picker">
      {value ? (
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
      ) : (
        <>
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
            />
            {searchLoading ? (
              <Loader2 size={16} className="cso-gv-picker-spin tdh-spin" aria-hidden />
            ) : null}
          </div>

          {staffSuggestions.length > 0 && !query.trim() ? (
            <div className="cso-gv-picker-section">
              <p className="cso-gv-picker-section-k">Nhân sự cơ sở</p>
              <ul className="cso-gv-picker-list">
                {staffSuggestions.map((pick) => (
                  <li key={pick.userId}>
                    <button
                      type="button"
                      className="cso-gv-picker-option"
                      disabled={disabled}
                      onClick={() => selectUser(pick)}
                    >
                      <UserAvatar avatarId={pick.avatarId} name={pick.tenHienThi} size={32} />
                      <span className="cso-gv-picker-option-meta">
                        <strong>{pick.tenHienThi}</strong>
                        <small>@{pick.slug}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : staffLoading && !query.trim() ? (
            <p className="cso-kh-field-hint">Đang tải nhân sự…</p>
          ) : null}

          {visibleResults.length > 0 ? (
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
                      <UserAvatar avatarId={pick.avatarId} name={pick.tenHienThi} size={32} />
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
          ) : null}

          {!query.trim() && !staffLoading ? (
            <p className="cso-kh-field-hint">
              <UserRound size={13} aria-hidden /> Có thể chọn user chưa có Journey
              — hồ sơ sẽ hiển thị «Chưa có hồ sơ CINS» cho đến khi họ tạo.
            </p>
          ) : null}
        </>
      )}

      {onManualTextChange ? (
        <button
          type="button"
          className="cso-gv-picker-mode-link"
          disabled={disabled}
          onClick={() => {
            clearUser();
            setMode("manual");
          }}
        >
          GV chưa có tài khoản — nhập tên thủ công
        </button>
      ) : null}
    </div>
  );
}
