"use client";

import { Loader2, Search, Shield } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type {
  AdminUserListResponse,
  AdminUserListRow,
} from "@/lib/admin/nguoi-dung-roles";
import type { SystemRole } from "@/lib/auth/system-role";

const ROLE_OPTIONS: { value: SystemRole; label: string }[] = [
  { value: "super_admin", label: "Admin tối cao" },
  { value: "admin", label: "Admin" },
  { value: "curator", label: "Curator (Biên tập viên)" },
  { value: "thanh_vien", label: "Thành viên" },
];

function userInitial(ten: string): string {
  const word = ten.trim().split(/\s+/).find(Boolean);
  return (word?.charAt(0) ?? "?").toUpperCase();
}

function RoleBadge({ role }: { role: SystemRole }) {
  return (
    <span className={`admin-nguoi-dung-role admin-nguoi-dung-role--${role}`}>
      {role === "super_admin" ? <Shield size={13} strokeWidth={2.2} aria-hidden /> : null}
      {ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role}
    </span>
  );
}

function UserAvatar({ row }: { row: AdminUserListRow }) {
  const hasImg = Boolean(row.avatarUrl);
  return (
    <span
      className={`admin-nguoi-dung-ava${hasImg ? " admin-nguoi-dung-ava--has-img" : ""}`}
      aria-hidden
    >
      {hasImg ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={row.avatarUrl!} alt="" />
      ) : (
        userInitial(row.tenHienThi)
      )}
    </span>
  );
}

function RoleSelect({
  row,
  canGrantAdmin,
  saving,
  onChange,
}: {
  row: AdminUserListRow;
  canGrantAdmin: boolean;
  saving: boolean;
  onChange: (userId: string, role: SystemRole) => void;
}) {
  if (row.isLocked) {
    return (
      <span className="admin-nguoi-dung-locked" title="Không thể thay đổi quyền">
        <RoleBadge role={row.role} />
      </span>
    );
  }

  return (
    <select
      className="admin-nguoi-dung-select"
      value={row.role}
      disabled={saving}
      aria-label={`Vai trò của ${row.tenHienThi}`}
      onChange={(e) => onChange(row.id, e.target.value as SystemRole)}
    >
      {ROLE_OPTIONS.map((opt) => {
        const disabled =
          opt.value === "super_admin" ||
          (opt.value === "admin" && !canGrantAdmin);
        return (
          <option key={opt.value} value={opt.value} disabled={disabled}>
            {opt.label}
          </option>
        );
      })}
    </select>
  );
}

export function AdminNguoiDungScreen() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AdminUserListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [actorRole, setActorRole] = useState<SystemRole>("thanh_vien");
  const [canGrantAdminFlag, setCanGrantAdminFlag] = useState(false);
  const [roleStats, setRoleStats] = useState<Record<SystemRole, number>>({
    super_admin: 0,
    admin: 0,
    curator: 0,
    thanh_vien: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (query.trim()) qs.set("q", query.trim());
      const res = await fetch(`/api/admin/nguoi-dung/list?${qs.toString()}`);
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Không tải được danh sách user.");
      }
      const data = (await res.json()) as AdminUserListResponse;
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setActorRole(data.actorRole);
      setCanGrantAdminFlag(data.canGrantAdmin);
      setRoleStats(
        data.roleStats ?? {
          super_admin: 0,
          admin: 0,
          curator: 0,
          thanh_vien: 0,
        },
      );
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(e instanceof Error ? e.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, query.trim() ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  async function handleRoleChange(userId: string, role: SystemRole) {
    const previousRows = rows;
    const roleLabel =
      ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;

    setRows((current) =>
      current.map((row) =>
        row.id === userId ? { ...row, role, roleLabel } : row,
      ),
    );
    setSavingId(userId);
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/admin/nguoi-dung/${encodeURIComponent(userId)}/vai-tro`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Không cập nhật được vai trò.");
      }
      await load();
    } catch (e) {
      setRows(previousRows);
      setSaveError(e instanceof Error ? e.message : "Không cập nhật được vai trò.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="admin-nguoi-dung-page">
      <header className="page-header admin-to-chuc-head">
        <div className="admin-to-chuc-head-copy">
          <h1 className="page-title">Quản lý user</h1>
          <p className="admin-to-chuc-sub">
            Phân quyền cấp hệ thống CINs. Chỉ Admin tối cao (
            <code>info.cins.vn@gmail.com</code>) cấp được quyền Admin.
          </p>
        </div>
      </header>

      <div className="page-body admin-to-chuc-body">
        <div className="admin-to-chuc-stats" aria-label="Tóm tắt vai trò">
          <article className="admin-to-chuc-stat admin-to-chuc-stat--ok">
            <span className="admin-to-chuc-stat-k">Admin tối cao</span>
            <strong className="admin-to-chuc-stat-v">{roleStats.super_admin}</strong>
          </article>
          <article className="admin-to-chuc-stat">
            <span className="admin-to-chuc-stat-k">Admin</span>
            <strong className="admin-to-chuc-stat-v">{roleStats.admin}</strong>
          </article>
          <article className="admin-to-chuc-stat">
            <span className="admin-to-chuc-stat-k">Curator</span>
            <strong className="admin-to-chuc-stat-v">{roleStats.curator}</strong>
          </article>
          <article className="admin-to-chuc-stat">
            <span className="admin-to-chuc-stat-k">Thành viên</span>
            <strong className="admin-to-chuc-stat-v">{roleStats.thanh_vien}</strong>
          </article>
        </div>

        {actorRole === "admin" ? (
          <div className="alert alert-warn admin-nguoi-dung-alert">
            <span>ℹ</span>
            <span>
              Bạn đang đăng nhập với quyền Admin — có thể gán Curator và Thu hồi về
              Thành viên. Chỉ Admin tối cao mới cấp hoặc thu hồi quyền Admin.
            </span>
          </div>
        ) : null}

        <section className="admin-to-chuc-panel">
          <div className="admin-to-chuc-toolbar">
            <label className="admin-to-chuc-search">
              <Search size={16} strokeWidth={2} aria-hidden />
              <input
                type="search"
                placeholder="Tìm theo tên, slug, email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            <p className="admin-to-chuc-result">
              {loading ? (
                <>
                  <Loader2
                    size={14}
                    strokeWidth={2}
                    className="admin-to-chuc-spin"
                    aria-hidden
                  />{" "}
                  Đang tải…
                </>
              ) : (
                <>
                  Hiển thị <strong>{rows.length}</strong> / {total}
                </>
              )}
            </p>
          </div>

          {error ? (
            <p className="admin-to-chuc-error" role="alert">
              {error}
            </p>
          ) : null}

          {saveError ? (
            <p className="admin-to-chuc-error" role="alert">
              {saveError}
            </p>
          ) : null}

          <div className="admin-to-chuc-table-wrap">
            <table className="admin-to-chuc-table admin-nguoi-dung-table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Email</th>
                  <th>Trạng thái</th>
                  <th>Vai trò hệ thống</th>
                  <th className="admin-to-chuc-th-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-table-empty">
                      Không có user phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="admin-nguoi-dung-user">
                          <UserAvatar row={row} />
                          <span className="admin-nguoi-dung-user-copy">
                            <span className="admin-nguoi-dung-user-name">
                              {row.tenHienThi}
                            </span>
                            <Link
                              href={`/${encodeURIComponent(row.slug)}`}
                              className="admin-nguoi-dung-user-slug"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              @{row.slug}
                            </Link>
                          </span>
                        </div>
                      </td>
                      <td className="admin-nguoi-dung-muted">
                        {row.email ?? "—"}
                      </td>
                      <td>
                        <span className="admin-nguoi-dung-status">
                          {row.trangThaiTaiKhoan.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <RoleBadge role={row.role} />
                      </td>
                      <td>
                        <RoleSelect
                          row={row}
                          canGrantAdmin={canGrantAdminFlag}
                          saving={savingId === row.id}
                          onChange={handleRoleChange}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
