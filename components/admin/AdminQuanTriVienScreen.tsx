"use client";

import { ChevronDown, Loader2, Search, Shield } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { AdminNavTabDto, AdminStaffRow } from "@/lib/admin/quan-tri-vien-types";
import type { SystemRole } from "@/lib/auth/system-role";

function nextTabSelection(
  prev: string[],
  key: string,
  index: number,
  orderedKeys: readonly string[],
  shiftKey: boolean,
  ctrlKey: boolean,
  lastIndex: number | null,
): string[] {
  if (shiftKey && lastIndex != null) {
    const a = Math.min(lastIndex, index);
    const b = Math.max(lastIndex, index);
    const next = new Set(prev);
    for (let i = a; i <= b; i++) {
      const item = orderedKeys[i];
      if (item) next.add(item);
    }
    return [...next];
  }
  if (ctrlKey) {
    return prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key];
  }
  if (prev.length === 1 && prev[0] === key) return [];
  return [key];
}

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
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const lastSelectIndexRef = useRef<number | null>(null);
  const sweepingRef = useRef(false);

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

  const orderedKeys = useMemo(() => tabs.map((tab) => tab.key), [tabs]);
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const tabIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    orderedKeys.forEach((key, index) => map.set(key, index));
    return map;
  }, [orderedKeys]);

  useEffect(() => {
    setSelectedKeys([]);
    lastSelectIndexRef.current = null;
    sweepingRef.current = false;
  }, [openId]);

  useEffect(() => {
    function endSweep() {
      sweepingRef.current = false;
    }
    window.addEventListener("pointerup", endSweep);
    window.addEventListener("pointercancel", endSweep);
    return () => {
      window.removeEventListener("pointerup", endSweep);
      window.removeEventListener("pointercancel", endSweep);
    };
  }, []);

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

  function applySelect(key: string, index: number, shiftKey: boolean, ctrlKey: boolean) {
    setSelectedKeys((prev) =>
      nextTabSelection(
        prev,
        key,
        index,
        orderedKeys,
        shiftKey,
        ctrlKey,
        lastSelectIndexRef.current,
      ),
    );
    if (!shiftKey) lastSelectIndexRef.current = index;
  }

  function handleRowPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
    key: string,
    index: number,
    canEdit: boolean,
  ) {
    if (!canEdit || event.button !== 0) return;
    if ((event.target as HTMLElement).closest(".admin-qtv-switch-hit")) return;
    event.preventDefault();
    sweepingRef.current = true;
    applySelect(key, index, event.shiftKey, event.ctrlKey || event.metaKey);
  }

  function handleRowPointerEnter(key: string, index: number, canEdit: boolean) {
    if (!canEdit || !sweepingRef.current) return;
    const anchor = lastSelectIndexRef.current ?? index;
    setSelectedKeys((prev) =>
      nextTabSelection(prev, key, index, orderedKeys, true, false, anchor),
    );
  }

  function toggleSectionSelect(sectionKeys: string[]) {
    setSelectedKeys((prev) => {
      const allOn = sectionKeys.every((key) => prev.includes(key));
      if (allOn) return prev.filter((key) => !sectionKeys.includes(key));
      return [...new Set([...prev, ...sectionKeys])];
    });
    const lastKey = sectionKeys[sectionKeys.length - 1];
    lastSelectIndexRef.current =
      lastKey != null ? (tabIndexByKey.get(lastKey) ?? null) : null;
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
                          <>
                            <p className="admin-qtv-hint">
                              {selectedKeys.length > 0
                                ? `${selectedKeys.length} tab đã chọn`
                                : "Shift chọn dải · Ctrl chọn thêm · kéo để quét"}
                            </p>
                            <div className="admin-qtv-bulk">
                              {selectedKeys.length > 0 ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={savingId === row.id}
                                    onClick={() =>
                                      handleSetSection(row, selectedKeys, true)
                                    }
                                  >
                                    Hiện đã chọn
                                  </button>
                                  <button
                                    type="button"
                                    disabled={savingId === row.id}
                                    onClick={() =>
                                      handleSetSection(row, selectedKeys, false)
                                    }
                                  >
                                    Ẩn đã chọn
                                  </button>
                                  <button
                                    type="button"
                                    disabled={savingId === row.id}
                                    onClick={() => {
                                      setSelectedKeys([]);
                                      lastSelectIndexRef.current = null;
                                    }}
                                  >
                                    Bỏ chọn
                                  </button>
                                </>
                              ) : null}
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
                          </>
                        )}
                      </div>
                      <div className="admin-qtv-grid">
                        {tabsBySection.map((group) => {
                          const sectionKeys = group.tabs.map((tab) => tab.key);
                          const sectionAll =
                            sectionKeys.length > 0 &&
                            sectionKeys.every((key) => selectedSet.has(key));
                          const sectionSome =
                            sectionKeys.some((key) => selectedSet.has(key)) &&
                            !sectionAll;
                          return (
                            <section key={group.section} className="admin-qtv-panel">
                              <header className="admin-qtv-panel-head">
                                <h3>{group.section}</h3>
                                {row.canEditTabs ? (
                                  <label className="admin-qtv-panel-all">
                                    <input
                                      type="checkbox"
                                      checked={sectionAll}
                                      disabled={savingId === row.id}
                                      ref={(el) => {
                                        if (el) el.indeterminate = sectionSome;
                                      }}
                                      onChange={() => toggleSectionSelect(sectionKeys)}
                                    />
                                    Chọn tất cả
                                  </label>
                                ) : null}
                              </header>
                              <ul className="admin-qtv-rows">
                                {group.tabs.map((tab) => {
                                  const visible = !row.tabAn.includes(tab.key);
                                  const picked = selectedSet.has(tab.key);
                                  const index = tabIndexByKey.get(tab.key) ?? 0;
                                  return (
                                    <li key={tab.key}>
                                      <div
                                        className={`admin-qtv-row${visible ? " is-on" : ""}${
                                          picked ? " is-picked" : ""
                                        }${row.canEditTabs ? "" : " is-locked"}`}
                                        onPointerEnter={() =>
                                          handleRowPointerEnter(
                                            tab.key,
                                            index,
                                            row.canEditTabs && savingId !== row.id,
                                          )
                                        }
                                      >
                                        <div
                                          className="admin-qtv-pick-hit"
                                          role="checkbox"
                                          aria-checked={picked}
                                          aria-label={`Chọn ${tab.label}`}
                                          tabIndex={row.canEditTabs ? 0 : -1}
                                          onPointerDown={(event) =>
                                            handleRowPointerDown(
                                              event,
                                              tab.key,
                                              index,
                                              row.canEditTabs && savingId !== row.id,
                                            )
                                          }
                                          onKeyDown={(event) => {
                                            if (
                                              !row.canEditTabs ||
                                              savingId === row.id
                                            ) {
                                              return;
                                            }
                                            if (
                                              event.key !== " " &&
                                              event.key !== "Enter"
                                            ) {
                                              return;
                                            }
                                            event.preventDefault();
                                            applySelect(
                                              tab.key,
                                              index,
                                              event.shiftKey,
                                              event.ctrlKey || event.metaKey,
                                            );
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            className="admin-qtv-pick"
                                            checked={picked}
                                            disabled={
                                              !row.canEditTabs || savingId === row.id
                                            }
                                            tabIndex={-1}
                                            aria-hidden
                                            readOnly
                                          />
                                          <span className="admin-qtv-row-label">
                                            {tab.label}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          className="admin-qtv-switch-hit"
                                          role="switch"
                                          aria-checked={visible}
                                          aria-label={`${visible ? "Ẩn" : "Hiện"} ${tab.label}`}
                                          disabled={
                                            !row.canEditTabs || savingId === row.id
                                          }
                                          onClick={() =>
                                            handleToggle(row, tab.key, !visible)
                                          }
                                        >
                                          <span className="admin-qtv-switch" aria-hidden />
                                        </button>
                                      </div>
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
