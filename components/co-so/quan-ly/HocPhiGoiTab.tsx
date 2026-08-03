"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  DON_VI_THOI_LUONG_OPTIONS,
  encodeGoiMoTa,
  formatThoiLuong,
  parseGoiMoTa,
  resolveSoNgayHieuLuc,
  type DonViThoiLuong,
} from "@/lib/co-so/goi-hoc-phi-meta";

type Goi = {
  id: string;
  ten: string;
  soNgay: number;
  giaVnd: number;
  moTa: string | null;
  dangBan: boolean;
  thuTu: number;
  khoaId: string | null;
  khoaTen: string | null;
  khoaIds?: string[];
  khoaTens?: string[];
};

type KhoaOpt = { id: string; ten: string };

type Draft = {
  ten: string;
  soLuong: number;
  donVi: DonViThoiLuong;
  soNgayHieuLuc: number;
  giaVnd: number;
  khoaIds: string[];
  /** Note cũ trong mo_ta — không hiện UI, giữ khi lưu. */
  preservedNote: string | null;
};

type Props = { orgId: string };

const EMPTY_DRAFT: Draft = {
  ten: "",
  soLuong: 30,
  donVi: "ngay",
  soNgayHieuLuc: 30,
  giaVnd: 0,
  khoaIds: [],
  preservedNote: null,
};

function formatVnd(n: number) {
  return `${n.toLocaleString("vi-VN")}đ`;
}

function resolveKhoaIds(g: Goi): string[] {
  if (g.khoaIds?.length) return g.khoaIds;
  return g.khoaId ? [g.khoaId] : [];
}

function resolveKhoaTens(g: Goi): string[] {
  if (g.khoaTens?.length) return g.khoaTens;
  return g.khoaTen?.trim() ? [g.khoaTen.trim()] : [];
}

function draftFromGoi(g: Goi): Draft {
  const { meta, note } = parseGoiMoTa(g.moTa, g.soNgay);
  return {
    ten: g.ten,
    soLuong: meta.soLuong,
    donVi: meta.donVi,
    soNgayHieuLuc: g.soNgay,
    giaVnd: g.giaVnd,
    khoaIds: resolveKhoaIds(g),
    preservedNote: note,
  };
}

function buildPayload(draft: Draft) {
  const soNgay = resolveSoNgayHieuLuc({
    donVi: draft.donVi,
    soLuong: draft.soLuong,
    soNgayHieuLuc: draft.soNgayHieuLuc,
  });
  const moTa = encodeGoiMoTa(
    { donVi: draft.donVi, soLuong: draft.soLuong },
    draft.preservedNote,
  );
  return {
    ten: draft.ten.trim(),
    soNgay,
    giaVnd: draft.giaVnd,
    khoaIds: draft.khoaIds,
    moTa,
  };
}

export function HocPhiGoiTab({ orgId }: Props) {
  const titleId = useId();
  const [goi, setGoi] = useState<Goi[]>([]);
  const [khoaOpts, setKhoaOpts] = useState<KhoaOpt[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [goiRes, khoaRes] = await Promise.all([
        fetch(`/api/co-so/${orgId}/hoc-phi/goi`, { credentials: "include" }),
        fetch(`/api/co-so/${orgId}/khoa-hoc`, { credentials: "include" }),
      ]);
      const goiData = await goiRes.json();
      if (!goiRes.ok) {
        throw new Error(
          typeof goiData.error === "string"
            ? goiData.error
            : goiData.error?.message || "Không tải gói.",
        );
      }
      setGoi(goiData.goi ?? []);
      setCanEdit(Boolean(goiData.canEdit));

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

  function openCreate() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(g: Goi) {
    setEditingId(g.id);
    setDraft(draftFromGoi(g));
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (busy) return;
    setModalOpen(false);
    setEditingId(null);
    setFormError(null);
  }

  function toggleKhoa(khoaId: string) {
    setDraft((d) => {
      const has = d.khoaIds.includes(khoaId);
      return {
        ...d,
        khoaIds: has
          ? d.khoaIds.filter((id) => id !== khoaId)
          : [...d.khoaIds, khoaId],
      };
    });
  }

  async function submitModal(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    if (!draft.ten.trim()) {
      setFormError("Nhập tên gói.");
      return;
    }
    if (draft.soLuong < 1) {
      setFormError("Thời lượng phải ≥ 1.");
      return;
    }
    if (draft.donVi !== "ngay" && draft.soNgayHieuLuc < 1) {
      setFormError("Ngày hiệu lực phải ≥ 1.");
      return;
    }

    setBusy(true);
    setFlash(null);
    setFormError(null);
    const body = buildPayload(draft);
    try {
      const res = await fetch(`/api/co-so/${orgId}/hoc-phi/goi`, {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId ? { goiId: editingId, ...body } : body,
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không lưu gói.");
      setModalOpen(false);
      setEditingId(null);
      setFlash(editingId ? "Đã lưu gói." : "Đã thêm gói.");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Lỗi.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBan(g: Goi) {
    if (!canEdit) return;
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch(`/api/co-so/${orgId}/hoc-phi/goi`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goiId: g.id, dangBan: !g.dangBan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không cập nhật.");
      await load();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setBusy(false);
    }
  }

  const showNgayHieuLuc = draft.donVi !== "ngay";

  return (
    <div className="cso-dt-stack">
      {flash ? <p className="cso-ql-flash">{flash}</p> : null}
      {error ? <p className="cso-ql-error">{error}</p> : null}

      <section className="cso-dt-panel">
        <div className="cso-dt-panel-head cso-hp-panel-head">
          <div>
            <h2 className="cso-dt-panel-title">Gói học phí</h2>
            <p className="cso-dt-panel-sub">
              Một gói có thể gắn nhiều khóa — VD: «1 tháng Online» cho Hình họa
              + Bố cục + Trang trí.
            </p>
          </div>
          {canEdit ? (
            <button
              type="button"
              className="cso-ql-btn cso-ql-btn--priv"
              onClick={openCreate}
            >
              <Plus size={15} strokeWidth={2.4} aria-hidden />
              Thêm gói
            </button>
          ) : null}
        </div>
        <div className="cso-dt-panel-body">
          <div className="cso-hv-ledger cso-dt-goi-wrap">
            <div className="cso-hv-table-wrap">
              <table className="cso-hv-table">
                <thead>
                  <tr>
                    <th scope="col">Tên</th>
                    <th scope="col">Khóa học</th>
                    <th scope="col">Thời lượng</th>
                    <th scope="col">Giá</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="cso-hv-loading">Đang tải…</div>
                      </td>
                    </tr>
                  ) : goi.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="cso-hv-empty">
                          <strong>Chưa có gói</strong>
                          Bấm «Thêm gói» rồi chọn một hoặc nhiều khóa học.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    goi.map((g) => {
                      const { meta } = parseGoiMoTa(g.moTa, g.soNgay);
                      const thoiLuong = formatThoiLuong(
                        meta.donVi,
                        meta.soLuong,
                      );
                      const showHieuLuc =
                        meta.donVi !== "ngay" && g.soNgay > 0;
                      const tens = resolveKhoaTens(g);
                      return (
                        <tr key={g.id}>
                          <td>
                            <p className="cso-hv-name">{g.ten}</p>
                          </td>
                          <td>
                            {tens.length === 0 ? (
                              <span className="cso-hp-khoa-empty">
                                Chưa gắn
                              </span>
                            ) : (
                              <div className="cso-hp-khoa-chips">
                                {tens.map((ten) => (
                                  <span key={ten} className="cso-hp-khoa-chip">
                                    {ten}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="cso-hv-days-n cso-dt-days-sm">
                              {thoiLuong}
                            </span>
                            {showHieuLuc ? (
                              <span className="cso-hp-hieu-luc">
                                Hiệu lực {g.soNgay} ngày
                              </span>
                            ) : null}
                          </td>
                          <td>
                            <span className="cso-dt-money">
                              {formatVnd(g.giaVnd)}
                            </span>
                          </td>
                          <td>
                            {g.dangBan ? (
                              <span className="cso-hv-chip cso-hv-chip--ok">
                                Đang bán
                              </span>
                            ) : (
                              <span className="cso-hv-chip cso-hv-chip--state">
                                Ẩn
                              </span>
                            )}
                          </td>
                          <td>
                            {canEdit ? (
                              <div className="cso-hv-actions">
                                <button
                                  type="button"
                                  disabled={busy}
                                  className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                                  aria-label={`Sửa ${g.ten}`}
                                  onClick={() => openEdit(g)}
                                >
                                  <Pencil size={14} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                                  onClick={() => void toggleBan(g)}
                                >
                                  {g.dangBan ? "Ẩn" : "Hiện"}
                                </button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <TruongInlineModal
        open={modalOpen}
        onClose={closeModal}
        labelledBy={titleId}
        className="cso-hp-goi-modal"
        closeLabel="Đóng"
      >
        <form
          className="cso-hp-goi-modal-form"
          onSubmit={(e) => void submitModal(e)}
        >
          <header className="cso-hp-goi-modal-head">
            <h3 id={titleId} className="cso-hp-goi-modal-title">
              {editingId ? "Sửa gói học phí" : "Thêm gói học phí"}
            </h3>
            <p className="cso-hp-goi-modal-sub">
              Chọn nhiều khóa nếu cùng một mức giá / thời lượng.
            </p>
          </header>

          <div className="cso-hp-goi-modal-body">
            {formError ? (
              <p className="cso-ql-error" role="alert">
                {formError}
              </p>
            ) : null}

            <label className="cso-ql-field">
              <span className="cso-ql-label">Tên gói</span>
              <input
                className="cso-ql-input"
                value={draft.ten}
                disabled={busy}
                placeholder="VD: Gói 1 tháng Online"
                autoFocus
                onChange={(e) =>
                  setDraft((d) => ({ ...d, ten: e.target.value }))
                }
              />
            </label>

            <div className="cso-hp-thoi-luong">
              <span className="cso-ql-label" id={`${titleId}-tl`}>
                Thời lượng
              </span>
              <div
                className="cso-hp-thoi-luong-row"
                role="group"
                aria-labelledby={`${titleId}-tl`}
              >
                <input
                  type="number"
                  min={1}
                  className="cso-ql-input cso-hp-thoi-luong-n"
                  value={draft.soLuong}
                  disabled={busy}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      soLuong: Number(e.target.value) || 1,
                    }))
                  }
                />
                <select
                  className="cso-ql-input cso-hp-thoi-luong-unit"
                  value={draft.donVi}
                  disabled={busy}
                  aria-label="Đơn vị thời lượng"
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      donVi: e.target.value as DonViThoiLuong,
                    }))
                  }
                >
                  {DON_VI_THOI_LUONG_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {showNgayHieuLuc ? (
              <label className="cso-ql-field">
                <span className="cso-ql-label">Ngày hiệu lực</span>
                <input
                  type="number"
                  min={1}
                  className="cso-ql-input"
                  value={draft.soNgayHieuLuc}
                  disabled={busy}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      soNgayHieuLuc: Number(e.target.value) || 1,
                    }))
                  }
                />
                <span className="cso-hp-field-hint">
                  Số ngày học viên được dùng sau khi đóng gói (mặc định 30).
                </span>
              </label>
            ) : null}

            <label className="cso-ql-field">
              <span className="cso-ql-label">Giá (VND)</span>
              <input
                type="number"
                min={0}
                className="cso-ql-input"
                value={draft.giaVnd}
                disabled={busy}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    giaVnd: Number(e.target.value) || 0,
                  }))
                }
              />
            </label>

            <fieldset className="cso-hp-khoa-fieldset">
              <legend className="cso-ql-label">
                Khóa học
                {draft.khoaIds.length > 0
                  ? ` · đã chọn ${draft.khoaIds.length}`
                  : ""}
              </legend>
              {khoaOpts.length === 0 ? (
                <p className="cso-hp-field-hint">
                  Chưa có khóa học trong cơ sở.
                </p>
              ) : (
                <div
                  className="cso-hp-khoa-checklist"
                  role="group"
                  aria-label="Chọn khóa học"
                >
                  {khoaOpts.map((k) => {
                    const checked = draft.khoaIds.includes(k.id);
                    return (
                      <label
                        key={k.id}
                        className={`cso-hp-khoa-check${checked ? " on" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={busy}
                          onChange={() => toggleKhoa(k.id)}
                        />
                        <span>{k.ten}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              <span className="cso-hp-field-hint">
                Có thể để trống — gắn khóa sau khi tạo.
              </span>
            </fieldset>
          </div>

          <div className="cso-hp-goi-modal-foot">
            <button
              type="button"
              className="cso-ql-btn cso-ql-btn--ghost"
              disabled={busy}
              onClick={closeModal}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="cso-ql-btn cso-ql-btn--priv"
              disabled={busy || !draft.ten.trim()}
            >
              {busy ? "Đang lưu…" : editingId ? "Lưu" : "Thêm gói"}
            </button>
          </div>
        </form>
      </TruongInlineModal>
    </div>
  );
}
