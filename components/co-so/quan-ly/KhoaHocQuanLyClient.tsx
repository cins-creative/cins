"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import { ExternalLink, Pause, Pencil, Plus, Trash2 } from "lucide-react";

import { KhoaHocCreateModal } from "@/components/co-so/KhoaHocCreateModal";
import { KhoaHocDeleteConfirm } from "@/components/co-so/KhoaHocDeleteConfirm";
import {
  khoaOptionsFromCards,
  LopHocQuanLyPanel,
} from "@/components/co-so/quan-ly/LopHocQuanLyPanel";
import { coSoKhoaHocDetailPath } from "@/lib/to-chuc/co-so-routes";
import { labelTrangThaiLop } from "@/lib/to-chuc/khoa-hoc-labels";
import type { KhoaHocCardData } from "@/lib/to-chuc/khoa-hoc-types";
import type { LopHocQuanLyRow } from "@/lib/to-chuc/lop-hoc-quan-ly-types";
import { orgQuanLyPath } from "@/lib/to-chuc/org-quan-ly-routes";

type Props = {
  orgId: string;
  orgSlug: string;
};

type TabId = "khoa" | "lop";

type ListModal =
  | { kind: "lop"; khoa: KhoaHocCardData }
  | { kind: "goi"; khoa: KhoaHocCardData; goiTens: string[] };

const TABS: ReadonlyArray<{ id: TabId; label: string; short: string }> = [
  { id: "khoa", label: "Quản lý khóa", short: "Khóa" },
  { id: "lop", label: "Quản lý lớp học", short: "Lớp" },
];

const TRANG_THAI_LABEL: Record<string, string> = {
  sap_khai_giang: "Sắp khai giảng",
  dang_mo_don: "Đang mở đơn",
  dang_hoc: "Đang học",
  da_ket_thuc: "Đã kết thúc",
  tam_dung: "Tạm dừng",
};

function lopLabel(r: LopHocQuanLyRow): string {
  return r.maLop?.trim() || r.lichHoc?.trim() || "Lớp";
}

export function KhoaHocQuanLyClient({ orgId, orgSlug }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("khoa");
  const [rows, setRows] = useState<KhoaHocCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<KhoaHocCardData | null>(null);

  const [lopRows, setLopRows] = useState<LopHocQuanLyRow[]>([]);
  const [lopLoading, setLopLoading] = useState(true);
  const [lopCanEdit, setLopCanEdit] = useState(false);
  /** khoaId → tên gói đã gắn (N–N org_goi_hoc_phi_khoa). */
  const [goiTensByKhoaId, setGoiTensByKhoaId] = useState<
    Map<string, string[]>
  >(() => new Map());

  const [lopFilterKhoaId, setLopFilterKhoaId] = useState<string | null>(null);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [deletingKhoa, setDeletingKhoa] = useState<KhoaHocCardData | null>(null);
  const [listModal, setListModal] = useState<ListModal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/co-so/${orgId}/khoa-hoc`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải khóa.");
      setRows(data.khoaHoc ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const loadLop = useCallback(async () => {
    setLopLoading(true);
    try {
      const res = await fetch(`/api/co-so/${encodeURIComponent(orgId)}/lop-hoc`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải lớp.");
      setLopRows((data.lopHoc ?? []) as LopHocQuanLyRow[]);
      setLopCanEdit(Boolean(data.canEdit));
    } catch {
      setLopRows([]);
      setLopCanEdit(false);
    } finally {
      setLopLoading(false);
    }
  }, [orgId]);

  const loadGoiLinks = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/co-so/${encodeURIComponent(orgId)}/hoc-phi/goi`,
        { credentials: "include" },
      );
      const data = (await res.json()) as {
        goi?: Array<{
          ten?: string;
          khoaId?: string | null;
          khoaIds?: string[];
        }>;
      };
      if (!res.ok) {
        setGoiTensByKhoaId(new Map());
        return;
      }
      const map = new Map<string, string[]>();
      for (const g of data.goi ?? []) {
        const ten = typeof g.ten === "string" ? g.ten.trim() : "";
        if (!ten) continue;
        const ids =
          g.khoaIds?.length
            ? g.khoaIds
            : g.khoaId
              ? [g.khoaId]
              : [];
        for (const kid of ids) {
          if (!kid) continue;
          const bag = map.get(kid) ?? [];
          if (!bag.includes(ten)) bag.push(ten);
          map.set(kid, bag);
        }
      }
      setGoiTensByKhoaId(map);
    } catch {
      setGoiTensByKhoaId(new Map());
    }
  }, [orgId]);

  useEffect(() => {
    void load();
    void loadLop();
    void loadGoiLinks();
  }, [load, loadLop, loadGoiLinks]);

  function openLopList(khoa: KhoaHocCardData, e: React.MouseEvent) {
    e.stopPropagation();
    setListModal({ kind: "lop", khoa });
  }

  function openGoiList(
    khoa: KhoaHocCardData,
    goiTens: string[],
    e: React.MouseEvent,
  ) {
    e.stopPropagation();
    setListModal({ kind: "goi", khoa, goiTens });
  }

  function openHocVienKhoa(khoa: KhoaHocCardData, e: React.MouseEvent) {
    e.stopPropagation();
    const params = new URLSearchParams({
      khoaId: khoa.id,
      trangThai: "dang_hoc",
    });
    router.push(
      `${orgQuanLyPath("co_so_dao_tao", orgSlug, "hoc-vien")}?${params.toString()}`,
    );
  }

  function openLopCuaKhoa(khoa: KhoaHocCardData) {
    startTransition(() => {
      setLopFilterKhoaId(khoa.id);
      setTab("lop");
    });
  }

  function switchTab(id: TabId) {
    startTransition(() => {
      setTab(id);
    });
  }

  async function pauseKhoa(khoa: KhoaHocCardData) {
    if (pausingId) return;
    const ok = window.confirm(
      `Tạm dừng khóa «${khoa.tenKhoaHoc}»?\n\nKhóa chuyển sang «Tạm dừng», vẫn còn trong danh sách. Có thể khôi phục bằng cách sửa trạng thái.`,
    );
    if (!ok) return;
    setPausingId(khoa.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc/${encodeURIComponent(khoa.id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenKhoaHoc: khoa.tenKhoaHoc,
            maKhoaHoc: khoa.maKhoaHoc,
            slug: khoa.slug,
            loaiMoHinh: khoa.loaiMoHinh,
            moTa: khoa.moTa,
            thoiLuongBuoi: khoa.thoiLuongBuoi,
            thoiLuongPhutMoiBuoi: khoa.thoiLuongPhutMoiBuoi,
            hocPhi: khoa.hocPhi,
            goiHocPhi: khoa.goiHocPhi,
            trinhDoDauVao: khoa.trinhDoDauVao,
            coverId: khoa.coverId,
            thumbnailId: khoa.thumbnailId,
            trangThaiKhoaHoc: "tam_dung",
            yeuCauChuanBi: khoa.yeuCauChuanBi,
            cheDoHienThi: khoa.cheDoHienThi,
          }),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (data as { error?: string } | null)?.error ||
            "Không tạm dừng được khóa.",
        );
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === khoa.id
            ? { ...row, trangThaiKhoaHoc: "tam_dung" as const }
            : row,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tạm dừng khóa.");
    } finally {
      setPausingId(null);
    }
  }

  const khoaOptions = useMemo(() => khoaOptionsFromCards(rows), [rows]);

  const lopByKhoaId = useMemo(() => {
    const map = new Map<string, LopHocQuanLyRow[]>();
    for (const lop of lopRows) {
      const list = map.get(lop.khoaId);
      if (list) list.push(lop);
      else map.set(lop.khoaId, [lop]);
    }
    return map;
  }, [lopRows]);

  const lopFilterTenKhoa = useMemo(() => {
    if (!lopFilterKhoaId) return null;
    return rows.find((k) => k.id === lopFilterKhoaId)?.tenKhoaHoc ?? null;
  }, [lopFilterKhoaId, rows]);

  const listModalLops = useMemo(() => {
    if (!listModal || listModal.kind !== "lop") return [];
    return lopByKhoaId.get(listModal.khoa.id) ?? [];
  }, [listModal, lopByKhoaId]);

  return (
    <div className="cso-lh-page cso-dt-stack">
      <nav className="cso-lh-tabs" aria-label="Khóa và lớp">
        <div className="cso-lh-trail" role="tablist">
          {TABS.map(({ id, label, short }, index) => {
            const isOn = tab === id;
            const isFirst = index === 0;
            const isLast = index === TABS.length - 1;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isOn}
                className={[
                  "cso-lh-tab",
                  isFirst ? "is-first" : "",
                  isLast ? "is-last" : "",
                  isOn ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => switchTab(id)}
              >
                <span className="cso-lh-tab-label">
                  <span className="cso-lh-tab-label-full">{label}</span>
                  <span className="cso-lh-tab-label-short">{short}</span>
                </span>
              </button>
            );
          })}
        </div>
        {tab === "lop" && lopFilterTenKhoa ? (
          <p className="cso-lh-trail-hint">
            Lớp thuộc khóa <strong>{lopFilterTenKhoa}</strong>
          </p>
        ) : (
          <p className="cso-lh-trail-hint">Trong khóa có lớp</p>
        )}
      </nav>

      <div
        className="cso-lh-tab-pane"
        hidden={tab !== "khoa"}
        aria-hidden={tab !== "khoa"}
      >
          <section className="cso-dt-panel">
            <div className="cso-dt-panel-head">
              <div className="cso-lh-head-row">
                <div>
                  <h2 className="cso-dt-panel-title">Catalog khóa</h2>
                </div>
                <button
                  type="button"
                  className="cso-ql-btn cso-ql-btn--priv"
                  onClick={() => {
                    setEditing(null);
                    setCreateOpen(true);
                  }}
                >
                  <Plus size={15} strokeWidth={2.4} aria-hidden />
                  Tạo khóa
                </button>
              </div>
            </div>

            {error ? (
              <div className="cso-dt-panel-body">
                <p className="cso-ql-error cso-lh-inline-error">{error}</p>
              </div>
            ) : null}

            <div className="cso-dt-panel-body cso-dt-panel-body--flush">
              <div className="cso-hv-table-wrap">
                <table className="cso-hv-table">
                  <thead>
                    <tr>
                      <th scope="col">Khóa học</th>
                      <th scope="col">Lớp</th>
                      <th scope="col">Gói học phí</th>
                      <th scope="col">Học viên đang học</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col">Hiển thị</th>
                      <th scope="col">
                        <span className="sr-only">Thao tác</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="cso-hv-loading">Đang tải…</div>
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="cso-hv-empty">
                            <strong>Chưa có khóa</strong>
                            Tạo khóa để hiện trên trang công khai và mở lớp học.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((k) => {
                        const goiTens = goiTensByKhoaId.get(k.id) ?? [];
                        return (
                          <tr key={k.id} className="cso-lh-khoa-row">
                            <td>
                              <button
                                type="button"
                                className="cso-lh-khoa cso-lh-khoa-open"
                                title={`Xem lớp của khóa ${k.tenKhoaHoc}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openLopCuaKhoa(k);
                                }}
                              >
                                {k.thumbnailUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    className="cso-lh-thumb"
                                    src={k.thumbnailUrl}
                                    alt=""
                                  />
                                ) : (
                                  <span
                                    className="cso-lh-thumb cso-lh-thumb--ph"
                                    aria-hidden
                                  />
                                )}
                                <span className="cso-lh-khoa-meta">
                                  <span className="cso-hv-name">
                                    {k.tenKhoaHoc}
                                  </span>
                                  <span className="cso-hv-slug">/{k.slug}</span>
                                  {(lopByKhoaId.get(k.id)?.length ??
                                    k.soLopMo) === 0 ? (
                                    <span className="cso-hv-lop">
                                      Chưa mở lớp — khóa chưa hiện công khai
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                            </td>
                            <td>
                              {(() => {
                                const lopCount =
                                  lopByKhoaId.get(k.id)?.length ?? k.soLopMo;
                                return (
                                  <button
                                    type="button"
                                    className="cso-lh-khoa-stat-btn"
                                    title={`Xem ${lopCount} lớp của khóa`}
                                    onClick={(e) => openLopList(k, e)}
                                  >
                                    {lopCount} lớp
                                  </button>
                                );
                              })()}
                            </td>
                            <td>
                              {goiTens.length === 0 ? (
                                <span className="cso-hp-khoa-empty">Chưa gắn</span>
                              ) : (
                                <button
                                  type="button"
                                  className="cso-lh-khoa-stat-btn"
                                  title={goiTens.join(" · ")}
                                  onClick={(e) => openGoiList(k, goiTens, e)}
                                >
                                  {goiTens.length} gói
                                </button>
                              )}
                            </td>
                            <td>
                              {(() => {
                                const hvCount =
                                  lopByKhoaId
                                    .get(k.id)
                                    ?.reduce((n, l) => n + l.soHocVien, 0) ??
                                  k.soHocVien;
                                return (
                                  <button
                                    type="button"
                                    className="cso-lh-khoa-stat-btn"
                                    title={`Xem ${hvCount} học viên đang học`}
                                    onClick={(e) => openHocVienKhoa(k, e)}
                                  >
                                    {hvCount} học viên
                                  </button>
                                );
                              })()}
                            </td>
                            <td>
                              <span className="cso-hv-chip cso-hv-chip--state">
                                {TRANG_THAI_LABEL[k.trangThaiKhoaHoc] ??
                                  k.trangThaiKhoaHoc}
                              </span>
                            </td>
                            <td>
                              {k.cheDoHienThi === "an" ? (
                                <span className="cso-hv-chip cso-hv-chip--state">
                                  Ẩn
                                </span>
                              ) : (
                                <span className="cso-hv-chip cso-hv-chip--ok">
                                  Công khai
                                </span>
                              )}
                            </td>
                            <td>
                              <div
                                className="cso-hv-actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link
                                  href={coSoKhoaHocDetailPath(orgSlug, k.slug)}
                                  className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--icon"
                                  title="Mở trang khóa"
                                  aria-label={`Mở khóa ${k.tenKhoaHoc}`}
                                >
                                  <ExternalLink size={15} strokeWidth={2.2} aria-hidden />
                                </Link>
                                <button
                                  type="button"
                                  className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--icon"
                                  title="Sửa khóa"
                                  aria-label={`Sửa khóa ${k.tenKhoaHoc}`}
                                  onClick={() => {
                                    setCreateOpen(false);
                                    setEditing(k);
                                  }}
                                >
                                  <Pencil size={15} strokeWidth={2.2} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--icon"
                                  title="Tạm dừng khóa"
                                  aria-label={`Tạm dừng khóa ${k.tenKhoaHoc}`}
                                  disabled={
                                    pausingId === k.id ||
                                    k.trangThaiKhoaHoc === "tam_dung"
                                  }
                                  onClick={() => void pauseKhoa(k)}
                                >
                                  <Pause size={15} strokeWidth={2.2} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--icon cso-ql-btn--danger-icon"
                                  title="Xóa khóa vĩnh viễn"
                                  aria-label={`Xóa khóa ${k.tenKhoaHoc}`}
                                  onClick={() => setDeletingKhoa(k)}
                                >
                                  <Trash2 size={15} strokeWidth={2.2} aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {listModal ? (
            <div
              className="cso-lh-khoa-pick"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cso-lh-khoa-list-title"
            >
              <button
                type="button"
                className="cso-lh-khoa-pick-backdrop"
                aria-label="Đóng"
                onClick={() => setListModal(null)}
              />
              <div className="cso-lh-khoa-pick-card cso-lh-khoa-pick-card--list">
                <h3 id="cso-lh-khoa-list-title" className="cso-lh-khoa-pick-title">
                  {listModal.kind === "lop"
                    ? `Lớp · ${listModal.khoa.tenKhoaHoc}`
                    : `Gói học phí · ${listModal.khoa.tenKhoaHoc}`}
                </h3>
                {listModal.kind === "lop" ? (
                  listModalLops.length === 0 ? (
                    <p className="cso-lh-khoa-pick-empty">Chưa có lớp nào.</p>
                  ) : (
                    <ul className="cso-lh-khoa-pick-list">
                      {listModalLops.map((lop) => (
                        <li key={lop.id} className="cso-lh-khoa-pick-item">
                          <span className="cso-lh-khoa-pick-item-name">
                            {lopLabel(lop)}
                          </span>
                          <span className="cso-lh-khoa-pick-item-meta">
                            {lop.giaoVienTen?.trim() || "Chưa gán GV"}
                            <span aria-hidden> · </span>
                            {lop.soHocVien} HV
                            <span aria-hidden> · </span>
                            {labelTrangThaiLop(lop.trangThaiLop)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )
                ) : listModal.goiTens.length === 0 ? (
                  <p className="cso-lh-khoa-pick-empty">Chưa gắn gói nào.</p>
                ) : (
                  <ul className="cso-lh-khoa-pick-list">
                    {listModal.goiTens.map((ten) => (
                      <li key={ten} className="cso-lh-khoa-pick-item">
                        <span className="cso-lh-khoa-pick-item-name">{ten}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="cso-lh-khoa-pick-actions">
                  {listModal.kind === "lop" ? (
                    <button
                      type="button"
                      className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                      onClick={() => {
                        const khoa = listModal.khoa;
                        setListModal(null);
                        openLopCuaKhoa(khoa);
                      }}
                    >
                      Quản lý lớp
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="cso-ql-btn cso-ql-btn--ghost"
                    onClick={() => setListModal(null)}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <KhoaHocCreateModal
            open={createOpen && !editing}
            orgId={orgId}
            orgSlug={orgSlug}
            onClose={() => setCreateOpen(false)}
            onCreated={() => {
              void load();
              void loadLop();
              void loadGoiLinks();
            }}
            onCreatedNeedLop={(khoaId) => {
              setCreateOpen(false);
              setLopFilterKhoaId(khoaId);
              setTab("lop");
            }}
          />
          <KhoaHocCreateModal
            open={Boolean(editing)}
            orgId={orgId}
            orgSlug={orgSlug}
            editing={editing}
            onClose={() => setEditing(null)}
            onUpdated={(khoa) => {
              setEditing(null);
              setRows((prev) =>
                prev.map((row) =>
                  row.id === khoa.id ? { ...row, ...khoa } : row,
                ),
              );
              void loadLop();
              void loadGoiLinks();
            }}
          />
          <KhoaHocDeleteConfirm
            open={Boolean(deletingKhoa)}
            orgId={orgId}
            khoa={deletingKhoa}
            onClose={() => setDeletingKhoa(null)}
            onXuLyCungTrang={(blocker, khoaId) => {
              if (blocker.loai === "lop") {
                setLopFilterKhoaId(khoaId);
                setTab("lop");
                return true;
              }
              return false;
            }}
            onDeleted={(khoaId) => {
              setRows((prev) => prev.filter((row) => row.id !== khoaId));
              setLopRows((prev) => prev.filter((row) => row.khoaId !== khoaId));
              void loadGoiLinks();
            }}
          />
      </div>

      <div
        className="cso-lh-tab-pane"
        hidden={tab !== "lop"}
        aria-hidden={tab !== "lop"}
      >
        <LopHocQuanLyPanel
          orgId={orgId}
          orgSlug={orgSlug}
          khoaOptions={khoaOptions}
          khoaFilterId={lopFilterKhoaId}
          onKhoaFilterChange={setLopFilterKhoaId}
          seedRows={lopRows}
          seedCanEdit={lopCanEdit}
          seedReady={!lopLoading}
          onRowsChange={setLopRows}
        />
      </div>
    </div>
  );
}
