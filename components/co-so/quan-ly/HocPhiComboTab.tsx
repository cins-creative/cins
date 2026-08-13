"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
  ComboEditorModal,
  type ComboDto,
} from "@/components/co-so/quan-ly/ComboEditorModal";
import { tinhGiamCombo } from "@/lib/co-so/combo-hoc-phi-tinh";

type GoiOpt = {
  id: string;
  ten: string;
  giaVnd: number;
  soNgay: number;
  khoaId: string | null;
  khoaTen: string | null;
  khoaIds?: string[];
  khoaTens?: string[];
};

type KhoaOpt = { id: string; ten: string };

type Props = { orgId: string };

function formatVnd(n: number) {
  return `${n.toLocaleString("vi-VN")}đ`;
}

function badgeGiam(c: ComboDto): string {
  if (c.loaiGiam === "phan_tram") return `−${c.giaTriGiam}%`;
  return `−${formatVnd(c.giaTriGiam)}`;
}

function linesThanhPhan(c: ComboDto): Array<{ khoa: string; goi: string }> {
  return c.thanhPhan.map((t) => ({
    khoa: t.khoaTen?.trim() || "Khóa",
    goi: t.goiTen?.trim() || "Mọi gói",
  }));
}

/** Giá gốc / sau giảm khi mọi thành phần có gói cụ thể; không thì null. */
function giaComboPreview(
  c: ComboDto,
  goiCatalog: GoiOpt[],
): { giaGoc: number; sauGiam: number } | null {
  if (c.thanhPhan.length < 2) return null;
  let goc = 0;
  for (const t of c.thanhPhan) {
    if (!t.goiId) return null;
    const fromRow =
      t.goiGiaVnd != null && Number.isFinite(Number(t.goiGiaVnd))
        ? Number(t.goiGiaVnd)
        : null;
    const fromCat = goiCatalog.find((g) => g.id === t.goiId)?.giaVnd;
    const gia = fromRow ?? fromCat;
    if (gia == null || !Number.isFinite(gia)) return null;
    goc += gia;
  }
  const tinh = tinhGiamCombo(goc, {
    loaiGiam: c.loaiGiam,
    giaTriGiam: c.giaTriGiam,
    giamToiDaVnd: c.giamToiDaVnd,
  });
  return { giaGoc: tinh.giaGocVnd, sauGiam: tinh.tongVnd };
}

export function HocPhiComboTab({ orgId }: Props) {
  const [combo, setCombo] = useState<ComboDto[]>([]);
  const [goiCatalog, setGoiCatalog] = useState<GoiOpt[]>([]);
  const [khoaOpts, setKhoaOpts] = useState<KhoaOpt[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ComboDto | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [comboRes, goiRes, khoaRes] = await Promise.all([
        fetch(`/api/academy/${orgId}/tuition/combos`, { credentials: "include" }),
        fetch(`/api/academy/${orgId}/tuition/packages`, { credentials: "include" }),
        fetch(`/api/academy/${orgId}/courses`, { credentials: "include" }),
      ]);
      const comboData = await comboRes.json();
      if (!comboRes.ok) {
        throw new Error(
          typeof comboData.error === "string"
            ? comboData.error
            : comboData.error?.message || "Không tải combo.",
        );
      }
      setCombo(comboData.combo ?? []);
      setCanEdit(Boolean(comboData.canEdit));

      if (goiRes.ok) {
        const goiData = await goiRes.json();
        setGoiCatalog(goiData.goi ?? []);
      }
      if (khoaRes.ok) {
        const khoaData = await khoaRes.json();
        const list = (khoaData.khoaHoc ?? []) as Array<{
          id: string;
          tenKhoaHoc: string;
        }>;
        setKhoaOpts(
          list.map((k) => ({ id: k.id, ten: k.tenKhoaHoc })).filter((k) => k.ten),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleFlag(
    c: ComboDto,
    patch: { dangBan?: boolean; hienTrangKhoa?: boolean },
  ) {
    if (!canEdit) return;
    setBusyId(c.id);
    setFlash(null);
    try {
      const nextDang =
        patch.dangBan !== undefined ? patch.dangBan : c.dangBan;
      const body = {
        flagsOnly: true,
        dangBan: nextDang,
        // Một công tắc: hoạt động = bán + hiện trang khóa
        hienTrangKhoa:
          patch.hienTrangKhoa !== undefined
            ? patch.hienTrangKhoa
            : nextDang,
      };
      const res = await fetch(`/api/academy/${orgId}/tuition/combos/${c.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không cập nhật.");
      setCombo((list) =>
        list.map((x) => (x.id === c.id ? (data.combo as ComboDto) : x)),
      );
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeCombo(c: ComboDto) {
    if (!canEdit) return;
    if (!window.confirm(`Ẩn / xóa combo «${c.ten}»?`)) return;
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/academy/${orgId}/tuition/combos/${c.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không xóa được.");
      setCombo((list) => list.filter((x) => x.id !== c.id));
      setFlash(`Đã xóa «${c.ten}».`);
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="cso-dt-panel">
      <div className="cso-dt-panel-head cso-hp-panel-head">
        <div>
          <h2 className="cso-dt-panel-title">Combo &amp; Discount</h2>
          <p className="cso-dt-panel-sub">
            Giảm giá khi học ≥ 2 khóa — VD: Guitar + Piano −20% hoặc −200.000đ.
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            className="cso-ql-btn cso-ql-btn--primary"
            disabled={khoaOpts.length < 2}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={15} strokeWidth={2.4} aria-hidden />
            Tạo combo
          </button>
        ) : null}
      </div>

      <div className="cso-dt-panel-body">
        {flash ? <p className="cso-ql-flash">{flash}</p> : null}
        {error ? <p className="cso-ql-error">{error}</p> : null}

        {khoaOpts.length < 2 && !loading ? (
          <div className="cso-hv-empty">
            Cần ≥ 2 khóa học để tạo combo. Thêm khóa ở mục Khóa &amp; lớp.
          </div>
        ) : (
          <div className="cso-hv-ledger cso-hp-combo-sheet">
            <div className="cso-hv-table-wrap">
              <table className="cso-hv-table cso-hp-combo-table">
                <thead>
                  <tr>
                    <th scope="col">Tên</th>
                    <th scope="col">Khóa học</th>
                    <th scope="col">Gói</th>
                    <th scope="col">Giảm</th>
                    <th scope="col">Giá gốc</th>
                    <th scope="col">Sau giảm</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="cso-hv-loading">Đang tải…</div>
                      </td>
                    </tr>
                  ) : combo.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="cso-hv-empty">
                          <strong>Chưa có combo</strong>
                          {canEdit
                            ? " Bấm «Tạo combo» để bắt đầu."
                            : null}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    combo.flatMap((c) => {
                      const gia = giaComboPreview(c, goiCatalog);
                      const lines = linesThanhPhan(c);
                      const pairs =
                        lines.length > 0
                          ? lines
                          : [{ khoa: "—", goi: "—" }];
                      const span = pairs.length;
                      const offClass = !c.dangBan ? "is-off" : undefined;

                      return pairs.map((line, i) => (
                        <tr
                          key={`${c.id}-${i}`}
                          className={[
                            offClass,
                            i > 0 ? "cso-hp-combo-row-cont" : null,
                            i === span - 1 ? "cso-hp-combo-row-end" : null,
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined}
                        >
                          {i === 0 ? (
                            <td rowSpan={span}>
                              <p className="cso-hv-name">{c.ten}</p>
                            </td>
                          ) : null}
                          <td className="cso-hp-combo-tp-cell">{line.khoa}</td>
                          <td className="cso-hp-combo-tp-cell">{line.goi}</td>
                          {i === 0 ? (
                            <>
                              <td rowSpan={span}>
                                <span className="cso-hp-combo-badge">
                                  {badgeGiam(c)}
                                </span>
                              </td>
                              <td rowSpan={span} className="cso-hp-combo-gia">
                                {gia ? (
                                  <span className="cso-hp-combo-gia-goc">
                                    {formatVnd(gia.giaGoc)}
                                  </span>
                                ) : (
                                  <span
                                    className="cso-hp-combo-gia-na"
                                    title="Cần gói cụ thể từng khóa"
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                              <td rowSpan={span} className="cso-hp-combo-gia">
                                {gia ? (
                                  <strong className="cso-hp-combo-gia-sau">
                                    {formatVnd(gia.sauGiam)}
                                  </strong>
                                ) : (
                                  <span
                                    className="cso-hp-combo-gia-na"
                                    title="Cần gói cụ thể từng khóa"
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                              <td rowSpan={span}>
                                {canEdit ? (
                                  <label className="cso-hp-combo-status-select-wrap">
                                    <span className="sr-only">
                                      Trạng thái {c.ten}
                                    </span>
                                    <select
                                      className="cso-ql-select cso-hp-combo-status-select"
                                      value={c.dangBan ? "on" : "off"}
                                      disabled={busyId === c.id}
                                      onChange={(e) => {
                                        const on = e.target.value === "on";
                                        void toggleFlag(c, {
                                          dangBan: on,
                                          hienTrangKhoa: on,
                                        });
                                      }}
                                    >
                                      <option value="on">Hoạt động</option>
                                      <option value="off">Ngừng hoạt động</option>
                                    </select>
                                  </label>
                                ) : (
                                  <span
                                    className={`cso-hv-chip cso-hv-chip--state${c.dangBan ? "" : " is-muted"}`}
                                  >
                                    {c.dangBan ? "Hoạt động" : "Ngừng"}
                                  </span>
                                )}
                              </td>
                              <td rowSpan={span}>
                                {canEdit ? (
                                  <div className="cso-hp-combo-card-actions">
                                    <button
                                      type="button"
                                      className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                                      disabled={busyId === c.id}
                                      aria-label="Sửa"
                                      onClick={() => {
                                        setEditing(c);
                                        setModalOpen(true);
                                      }}
                                    >
                                      <Pencil
                                        size={14}
                                        strokeWidth={2.2}
                                        aria-hidden
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                                      disabled={busyId === c.id}
                                      aria-label="Xóa"
                                      onClick={() => void removeCombo(c)}
                                    >
                                      <Trash2
                                        size={14}
                                        strokeWidth={2.2}
                                        aria-hidden
                                      />
                                    </button>
                                  </div>
                                ) : null}
                              </td>
                            </>
                          ) : null}
                        </tr>
                      ));
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ComboEditorModal
        open={modalOpen}
        orgId={orgId}
        editing={editing}
        goiCatalog={goiCatalog}
        khoaOpts={khoaOpts}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={(saved) => {
          setCombo((list) => {
            const idx = list.findIndex((x) => x.id === saved.id);
            if (idx >= 0) {
              const next = [...list];
              next[idx] = saved;
              return next;
            }
            return [saved, ...list];
          });
          setFlash(`Đã lưu «${saved.ten}».`);
        }}
      />
    </section>
  );
}
