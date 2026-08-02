"use client";

import { useCallback, useEffect, useState } from "react";

import { getAvatarUrl } from "@/lib/journey/profile";
import {
  CO_SO_MODULE_LABELS,
  type CoSoModuleKey,
  type CoSoMucQuyen,
} from "@/lib/to-chuc/co-so-quan-ly-modules";
import { coSoAssignableRoleLabel, type CoSoStaffVaiTro } from "@/lib/to-chuc/co-so-vai-tro";

type Stk = {
  nganHang: string;
  soTaiKhoan: string;
  tenChuTk: string;
};

type StaffQuyenRow = {
  userId: string;
  slug: string;
  tenHienThi: string;
  avatarId: string | null;
  vaiTro: CoSoStaffVaiTro;
  quyen: Record<CoSoModuleKey, CoSoMucQuyen>;
};

type Props = { orgId: string };

const MUC_QUYEN_OPTIONS: { value: CoSoMucQuyen; label: string }[] = [
  { value: "an", label: "Ẩn" },
  { value: "xem", label: "Xem" },
  { value: "sua", label: "Sửa" },
];

function StaffAvatar({
  avatarId,
  name,
}: {
  avatarId: string | null;
  name: string;
}) {
  const src = avatarId ? getAvatarUrl(avatarId) : null;
  return (
    <span className="cso-hv-ava" aria-hidden>
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt="" />
      ) : (
        <span>{name.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}

export function CoSoCaiDatToiCaoClient({ orgId }: Props) {
  const [tab, setTab] = useState<"cai-dat" | "ket-noi-api">("cai-dat");
  const [stk, setStk] = useState<Stk>({
    nganHang: "",
    soTaiKhoan: "",
    tenChuTk: "",
  });
  const [stkLoading, setStkLoading] = useState(true);
  const [stkBusy, setStkBusy] = useState(false);
  const [stkFlash, setStkFlash] = useState<string | null>(null);

  const [modules, setModules] = useState<CoSoModuleKey[]>([]);
  const [staff, setStaff] = useState<StaffQuyenRow[]>([]);
  const [quyenLoading, setQuyenLoading] = useState(true);
  const [quyenBusyKey, setQuyenBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStk = useCallback(async () => {
    setStkLoading(true);
    try {
      const res = await fetch(`/api/co-so/${orgId}/hoc-phi/thanh-toan`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải STK.");
      setStk({
        nganHang: data.nganHang ?? "",
        soTaiKhoan: data.soTaiKhoan ?? "",
        tenChuTk: data.tenChuTk ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải STK.");
    } finally {
      setStkLoading(false);
    }
  }, [orgId]);

  const loadQuyen = useCallback(async () => {
    setQuyenLoading(true);
    try {
      const res = await fetch(`/api/co-so/${orgId}/cai-dat/quyen`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải phân quyền.");
      setModules(data.modules ?? []);
      setStaff(data.staff ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải phân quyền.");
    } finally {
      setQuyenLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadStk();
    void loadQuyen();
  }, [loadStk, loadQuyen]);

  async function saveStk() {
    setStkBusy(true);
    setStkFlash(null);
    try {
      const res = await fetch(`/api/co-so/${orgId}/hoc-phi/thanh-toan`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stk),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không lưu STK.");
      setStkFlash("Đã lưu tài khoản nhận học phí.");
      setStk({
        nganHang: data.nganHang ?? "",
        soTaiKhoan: data.soTaiKhoan ?? "",
        tenChuTk: data.tenChuTk ?? "",
      });
    } catch (e) {
      setStkFlash(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setStkBusy(false);
    }
  }

  async function setQuyen(
    userId: string,
    module: CoSoModuleKey,
    mucQuyen: CoSoMucQuyen,
  ) {
    const key = `${userId}:${module}`;
    setQuyenBusyKey(key);
    setError(null);
    try {
      const res = await fetch(`/api/co-so/${orgId}/cai-dat/quyen`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, module, mucQuyen }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không cập nhật quyền.");
      setStaff((prev) =>
        prev.map((row) =>
          row.userId === userId
            ? { ...row, quyen: { ...row.quyen, [module]: mucQuyen } }
            : row,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setQuyenBusyKey(null);
    }
  }

  return (
    <div className="cso-dt-stack">
      <nav className="cso-settings-nav" aria-label="Cài đặt tối cao">
        <button
          type="button"
          className={`cso-settings-nav-btn${tab === "cai-dat" ? " on" : ""}`}
          aria-current={tab === "cai-dat" ? "true" : undefined}
          onClick={() => setTab("cai-dat")}
        >
          Cài đặt
        </button>
        <button
          type="button"
          className={`cso-settings-nav-btn${tab === "ket-noi-api" ? " on" : ""}`}
          aria-current={tab === "ket-noi-api" ? "true" : undefined}
          onClick={() => setTab("ket-noi-api")}
        >
          Kết nối API
        </button>
      </nav>

      {tab === "ket-noi-api" ? (
        <section className="cso-dt-panel">
          <div className="cso-dt-panel-head">
            <h2 className="cso-dt-panel-title">Kết nối API</h2>
            <p className="cso-dt-panel-sub">Tính năng đang phát triển</p>
          </div>
        </section>
      ) : (
        <>
          {error ? <p className="cso-ql-error">{error}</p> : null}

          <section className="cso-dt-panel">
            <div className="cso-dt-panel-head">
              <h2 className="cso-dt-panel-title">Tài khoản nhận học phí</h2>
              <p className="cso-dt-panel-sub">
                Chỉ founder (owner/admin) thấy và sửa mục này. Hiện trên card đơn
                CK trong chat.
              </p>
            </div>
            {stkLoading ? (
              <div className="cso-dt-panel-body">
                <div className="cso-hv-loading">Đang tải…</div>
              </div>
            ) : (
              <div className="cso-dt-panel-body">
                {stkFlash ? <p className="cso-ql-flash">{stkFlash}</p> : null}
                <div className="cso-dt-form-grid">
                  <label className="cso-ql-field">
                    <span className="cso-ql-label">Ngân hàng</span>
                    <input
                      className="cso-ql-input"
                      value={stk.nganHang}
                      onChange={(e) =>
                        setStk((s) => ({ ...s, nganHang: e.target.value }))
                      }
                    />
                  </label>
                  <label className="cso-ql-field">
                    <span className="cso-ql-label">Số tài khoản</span>
                    <input
                      className="cso-ql-input"
                      value={stk.soTaiKhoan}
                      onChange={(e) =>
                        setStk((s) => ({ ...s, soTaiKhoan: e.target.value }))
                      }
                    />
                  </label>
                  <label className="cso-ql-field">
                    <span className="cso-ql-label">Chủ tài khoản</span>
                    <input
                      className="cso-ql-input"
                      value={stk.tenChuTk}
                      onChange={(e) =>
                        setStk((s) => ({ ...s, tenChuTk: e.target.value }))
                      }
                    />
                  </label>
                </div>
                <div className="cso-dt-actions">
                  <button
                    type="button"
                    disabled={stkBusy}
                    className="cso-ql-btn cso-ql-btn--primary"
                    onClick={() => void saveStk()}
                  >
                    Lưu STK
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="cso-dt-panel">
            <div className="cso-dt-panel-head">
              <h2 className="cso-dt-panel-title">Phân quyền quản trị</h2>
              <p className="cso-dt-panel-sub">
                Đặt quyền xem/sửa theo module cho từng nhân sự. Owner/Admin luôn
                toàn quyền, không hiện ở đây.
              </p>
            </div>
            <div className="cso-dt-panel-body cso-dt-panel-body--flush">
              {quyenLoading ? (
                <div className="cso-hv-loading">Đang tải…</div>
              ) : staff.length === 0 ? (
                <div className="cso-hv-empty">
                  <strong>Chưa có nhân sự dưới cấp founder</strong>
                  Mời thành viên ở tab «Cơ sở» trước khi phân quyền.
                </div>
              ) : (
                <div className="cso-hv-table-wrap">
                  <table className="cso-cd-matrix">
                    <thead>
                      <tr>
                        <th scope="col">Nhân sự</th>
                        {modules.map((m) => (
                          <th scope="col" key={m}>
                            {CO_SO_MODULE_LABELS[m]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((row) => (
                        <tr key={row.userId}>
                          <td>
                            <div className="cso-cd-staff">
                              <StaffAvatar
                                avatarId={row.avatarId}
                                name={row.tenHienThi}
                              />
                              <div>
                                <p className="cso-hv-name">{row.tenHienThi}</p>
                                <p className="cso-hv-lop">
                                  {coSoAssignableRoleLabel(row.vaiTro)}
                                </p>
                              </div>
                            </div>
                          </td>
                          {modules.map((m) => {
                            const key = `${row.userId}:${m}`;
                            return (
                              <td key={m}>
                                <select
                                  className="cso-ql-select cso-cd-select"
                                  value={row.quyen[m] ?? "an"}
                                  disabled={quyenBusyKey === key}
                                  onChange={(e) =>
                                    void setQuyen(
                                      row.userId,
                                      m,
                                      e.target.value as CoSoMucQuyen,
                                    )
                                  }
                                >
                                  {MUC_QUYEN_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
