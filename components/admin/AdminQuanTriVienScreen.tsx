"use client";

import { ChevronDown, Loader2, Search, Shield } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { AdminNavTabDto, AdminStaffRow } from "@/lib/admin/quan-tri-vien-types";
import type { SystemRole } from "@/lib/auth/system-role";

const ROLE_FILTERS: { id: "all" | Exclude<SystemRole, "thanh_vien">; label: string }[] =
  [
    { id: "all", label: "Tất cả" },
    { id: "super_admin", label: "Admin tối cao" },
    { id: "admin", label: "Admin" },
    { id: "curator", label: "Curator" },
  ];

function userInitial(ten: string): string {
  const word = ten.trim().split(/\s+/).find(Boolean);
  return (word?.charAt(0) ?? "?").toUpperCase();
}

function RoleBadge({ role, label }: { role: AdminStaffRow["role"]; label: string }) {
  return (
    <span className={`admin-nguoi-dung-role admin-nguoi-dung-role--${role}`}>
      {role === "super_admin" ? (
        <Shield size={13} strokeWidth={2.2} aria-hidden />
      ) : null}
      {label}
    </span>
  );
}

function UserAvatar({ row }: { row: AdminStaffRow }) {
  const hasImg = Boolean(row.avatarUrl);
  return (
    <span
      className={`admin-nguoi-dung-ava${hasImg ? " admin-nguoi-dung-ava--has-img" : ""}`}
      aria-hidden
    >
      {hasImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.avatarUrl!} alt="" />
      ) : (
        userInitial(row.tenHienThi)
      )}
    </span>
  );
}

export function AdminQuanTriVienScreen() {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]["id"]>(
    "all",
  );
  const [rows, setRows] = useState<AdminStaffRow[]>([]);
  const [tabs, setTabs] = useState<AdminNavTabDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (roleFilter !== "all") params.set("role", roleFilter);
      const res = await fetch(`/api/admin/quan-tri-vien?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        error?: string;
        rows?: AdminStaffRow[];
        total?: number;
        tabs?: AdminNavTabDto[];
      };
      if (!res.ok) throw new Error(data.error ?? "Không tải được danh sách.");
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setTabs(data.tabs ?? []);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(e instanceof Error ? e.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }, [query, roleFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, query.trim() ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  const tabsBySection = useMemo(() => {
    const groups: { section: string; tabs: AdminNavTabDto[] }[] = [];
    for (const tab of tabs) {
      const last = groups[groups.length - 1];
      if (!last || last.section !== tab.section) {
        groups.push({ section: tab.section, tabs: [tab] });
      } else {
        last.tabs.push(tab);
      }
    }
    return groups;
  }, [tabs]);

  async function saveTabAn(row: AdminStaffRow, nextTabAn: string[]) {
    if (!row.canEditTabs) return;
    const previous = rows;
    setRows((current) =>
      current.map((item) =>
        item.id === row.id ? { ...item, tabAn: nextTabAn } : item,
      ),
    );
    setSavingId(row.id);
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/admin/quan-tri-vien/${encodeURIComponent(row.id)}/tabs`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tabAn: nextTabAn }),
        },
      );
      const json = (await res.json()) as { error?: string; tabAn?: string[] };
      if (!res.ok) throw new Error(json.error ?? "Không lưu được.");
      if (json.tabAn) {
        setRows((current) =>
          current.map((item) =>
            item.id === row.id ? { ...item, tabAn: json.tabAn ?? item.tabAn } : item,
          ),
        );
      }
    } catch (e) {
      setRows(previous);
      setSaveError(e instanceof Error ? e.message : "Không lưu được phân quyền tab.");
    } finally {
      setSavingId(null);
    }
  }

  function handleToggle(row: AdminStaffRow, key: string, visible: boolean) {
    const nextTabAn = visible
      ? row.tabAn.filter((k) => k !== key)
      : [...new Set([...row.tabAn, key])];
    void saveTabAn(row, nextTabAn);
  }

  function handleSetSection(row: AdminStaffRow, keys: string[], visible: boolean) {
    const hide = new Set(row.tabAn);
    for (const key of keys) {
      if (visible) hide.delete(key);
      else hide.add(key);
    }
    void saveTabAn(row, [...hide]);
  }

  function handleSetAll(row: AdminStaffRow, visible: boolean) {
    void saveTabAn(row, visible ? [] : tabs.map((tab) => tab.key));
  }

  return (
    <div className="admin-qtv-page">
      <header className="page-header admin-to-chuc-head">
        <div className="admin-to-chuc-head-copy">
          <h1 className="page-title">Quản trị viên</h1>
          <p className="admin-to-chuc-sub">
            User có vai trò hệ thống CINs. Bật/tắt tab họ nhìn thấy trên sidebar
            — không phân quyền thao tác chi tiết.
          </p>
        </div>
      </header>

      <div className="page-body admin-to-chuc-body">
        <div className="admin-qtv-toolbar">
          <label className="admin-qtv-search">
            <Search size={16} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên, slug, email…"
            />
          </label>
          <div className="admin-qtv-filters" role="tablist" aria-label="Lọc vai trò">
            {ROLE_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={roleFilter === item.id}
                className={roleFilter === item.id ? "is-active" : ""}
                onClick={() => setRoleFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {error ? <div className="alert-warn admin-nguoi-dung-alert">{error}</div> : null}
        {saveError ? (
          <div className="alert-warn admin-nguoi-dung-alert">{saveError}</div>
        ) : null}

        {loading ? (
          <div className="admin-qtv-loading">
            <Loader2 size={18} className="admin-qtv-spin" aria-hidden />
            Đang tải…
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">Không có quản trị viên</div>
            <div className="empty-desc">
              {query.trim() || roleFilter !== "all"
                ? "Không khớp bộ lọc. Thử xóa tìm kiếm hoặc đổi vai trò."
                : "Chưa có user nào trong user_quyen_he_thong."}
            </div>
          </div>
        ) : (
          <div className="admin-qtv-list">
            <p className="admin-qtv-count">{total} người</p>
            {rows.map((row) => {
              const open = openId === row.id;
              const visibleCount = tabs.length - row.tabAn.length;
              return (
                <article key={row.id} className="admin-qtv-card">
                  <div className="admin-qtv-card-head">
                    <span className="admin-nguoi-dung-user">
                      <UserAvatar row={row} />
                      <span className="admin-nguoi-dung-user-copy">
                        <span className="admin-nguoi-dung-user-name">
                          {row.tenHienThi}
                        </span>
                        <Link
                          href={`/${row.slug}`}
                          className="admin-nguoi-dung-user-slug"
                        >
                          @{row.slug}
                        </Link>
                      </span>
                    </span>
                    <RoleBadge role={row.role} label={row.roleLabel} />
                    <button
                      type="button"
                      className="admin-qtv-card-toggle"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : row.id)}
                    >
                      <span className="admin-qtv-count-chip">
                        {visibleCount}/{tabs.length} tab
                      </span>
                      {savingId === row.id ? (
                        <Loader2 size={14} className="admin-qtv-spin" aria-hidden />
                      ) : null}
                      <ChevronDown
                        size={16}
                        className={`admin-qtv-chevron${open ? " is-open" : ""}`}
                        aria-hidden
                      />
                    </button>
                  </div>

                  {open ? (
                    <div className="admin-qtv-matrix">
                      <div className="admin-qtv-matrix-bar">
                        {!row.canEditTabs ? (
                          <p className="admin-qtv-locked-note">
                            {row.role === "super_admin"
                              ? "Admin tối cao luôn thấy mọi tab."
                              : "Chỉ Admin tối cao được sửa tab của Admin."}
                          </p>
                        ) : (
                          <div className="admin-qtv-bulk">
                            <button
                              type="button"
                              disabled={savingId === row.id}
                              onClick={() => handleSetAll(row, true)}
                            >
                              Hiện tất cả
                            </button>
                            <button
                              type="button"
                              disabled={savingId === row.id}
                              onClick={() => handleSetAll(row, false)}
                            >
                              Ẩn tất cả
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="admin-qtv-grid">
                        {tabsBySection.map((group) => {
                          const sectionOn = group.tabs.every(
                            (tab) => !row.tabAn.includes(tab.key),
                          );
                          return (
                            <section key={group.section} className="admin-qtv-panel">
                              <header className="admin-qtv-panel-head">
                                <h3>{group.section}</h3>
                                {row.canEditTabs ? (
                                  <button
                                    type="button"
                                    className="admin-qtv-panel-all"
                                    disabled={savingId === row.id}
                                    onClick={() =>
                                      handleSetSection(
                                        row,
                                        group.tabs.map((tab) => tab.key),
                                        !sectionOn,
                                      )
                                    }
                                  >
                                    {sectionOn ? "Ẩn nhóm" : "Hiện nhóm"}
                                  </button>
                                ) : null}
                              </header>
                              <ul className="admin-qtv-rows">
                                {group.tabs.map((tab) => {
                                  const visible = !row.tabAn.includes(tab.key);
                                  return (
                                    <li key={tab.key}>
                                      <label
                                        className={`admin-qtv-row${visible ? " is-on" : ""}${
                                          row.canEditTabs ? "" : " is-locked"
                                        }`}
                                      >
                                        <span className="admin-qtv-row-label">
                                          {tab.label}
                                        </span>
                                        <input
                                          type="checkbox"
                                          checked={visible}
                                          disabled={
                                            !row.canEditTabs || savingId === row.id
                                          }
                                          onChange={(e) =>
                                            handleToggle(row, tab.key, e.target.checked)
                                          }
                                        />
                                        <span className="admin-qtv-switch" aria-hidden />
                                      </label>
                                    </li>
                                  );
                                })}
                              </ul>
                            </section>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
