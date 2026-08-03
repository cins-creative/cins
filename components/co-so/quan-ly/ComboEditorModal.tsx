"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  tinhGiamCombo,
  type LoaiGiamCombo,
} from "@/lib/co-so/combo-hoc-phi-tinh";

export type ComboThanhPhanDto = {
  id?: string;
  khoaId: string;
  khoaTen?: string | null;
  goiId: string | null;
  goiTen?: string | null;
  goiGiaVnd?: number | null;
};

export type ComboDto = {
  id: string;
  ten: string;
  moTa: string | null;
  loaiGiam: LoaiGiamCombo;
  giaTriGiam: number;
  giamToiDaVnd: number | null;
  apDungTu: string | null;
  apDungDen: string | null;
  hienTrangKhoa: boolean;
  dangBan: boolean;
  thuTu: number;
  thanhPhan: ComboThanhPhanDto[];
};

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

type LineDraft = { khoaId: string; goiId: string };

type Draft = {
  ten: string;
  loaiGiam: LoaiGiamCombo;
  giaTriGiam: number;
  giamToiDaVnd: string;
  apDungTu: string;
  apDungDen: string;
  hienTrangKhoa: boolean;
  dangBan: boolean;
  lines: LineDraft[];
};

type Props = {
  open: boolean;
  orgId: string;
  editing: ComboDto | null;
  goiCatalog: GoiOpt[];
  khoaOpts: KhoaOpt[];
  onClose: () => void;
  onSaved: (combo: ComboDto) => void;
};

const EMPTY: Draft = {
  ten: "",
  loaiGiam: "phan_tram",
  giaTriGiam: 20,
  giamToiDaVnd: "",
  apDungTu: "",
  apDungDen: "",
  hienTrangKhoa: true,
  dangBan: true,
  lines: [
    { khoaId: "", goiId: "" },
    { khoaId: "", goiId: "" },
  ],
};

function formatVnd(n: number) {
  return `${n.toLocaleString("vi-VN")}đ`;
}

function draftFromCombo(c: ComboDto): Draft {
  return {
    ten: c.ten,
    loaiGiam: c.loaiGiam,
    giaTriGiam: c.giaTriGiam,
    giamToiDaVnd: c.giamToiDaVnd != null ? String(c.giamToiDaVnd) : "",
    apDungTu: c.apDungTu ?? "",
    apDungDen: c.apDungDen ?? "",
    hienTrangKhoa: c.hienTrangKhoa,
    dangBan: c.dangBan,
    lines:
      c.thanhPhan.length >= 2
        ? c.thanhPhan.map((t) => ({
            khoaId: t.khoaId,
            goiId: t.goiId ?? "",
          }))
        : [
            ...c.thanhPhan.map((t) => ({
              khoaId: t.khoaId,
              goiId: t.goiId ?? "",
            })),
            { khoaId: "", goiId: "" },
          ],
  };
}

function goiForKhoa(catalog: GoiOpt[], khoaId: string): GoiOpt[] {
  if (!khoaId) return [];
  return catalog.filter((g) => {
    if (g.khoaIds?.includes(khoaId)) return true;
    return g.khoaId === khoaId;
  });
}

export function ComboEditorModal({
  open,
  orgId,
  editing,
  goiCatalog,
  khoaOpts,
  onClose,
  onSaved,
}: Props) {
  const titleId = useId();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setDraft(editing ? draftFromCombo(editing) : EMPTY);
  }, [open, editing]);

  const preview = useMemo(() => {
    const lines = draft.lines.filter((l) => l.khoaId && l.goiId);
    let goc = 0;
    for (const l of lines) {
      const g = goiCatalog.find((x) => x.id === l.goiId);
      goc += g?.giaVnd ?? 0;
    }
    const tinh = tinhGiamCombo(goc, {
      loaiGiam: draft.loaiGiam,
      giaTriGiam: draft.giaTriGiam,
      giamToiDaVnd: draft.giamToiDaVnd.trim()
        ? Number(draft.giamToiDaVnd)
        : null,
    });
    return { lines, ...tinh };
  }, [draft, goiCatalog]);

  const setLine = useCallback((idx: number, patch: Partial<LineDraft>) => {
    setDraft((d) => ({
      ...d,
      lines: d.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    }));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const ten = draft.ten.trim();
    if (!ten) {
      setFormError("Nhập tên combo.");
      return;
    }
    const thanhPhan = draft.lines
      .filter((l) => l.khoaId)
      .map((l) => ({
        khoaId: l.khoaId,
        goiId: l.goiId || null,
      }));
    const khoaSet = new Set(thanhPhan.map((t) => t.khoaId));
    if (thanhPhan.length < 2 || khoaSet.size < 2) {
      setFormError("Chọn ≥ 2 khóa khác nhau (kèm gói nếu muốn).");
      return;
    }

    setBusy(true);
    try {
      const url = editing
        ? `/api/co-so/${orgId}/hoc-phi/combo/${editing.id}`
        : `/api/co-so/${orgId}/hoc-phi/combo`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ten,
          loaiGiam: draft.loaiGiam,
          giaTriGiam: Number(draft.giaTriGiam),
          giamToiDaVnd: draft.giamToiDaVnd.trim()
            ? Number(draft.giamToiDaVnd)
            : null,
          apDungTu: draft.apDungTu || null,
          apDungDen: draft.apDungDen || null,
          hienTrangKhoa: draft.hienTrangKhoa,
          dangBan: draft.dangBan,
          thanhPhan,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : data.error?.message || "Không lưu được.",
        );
      }
      onSaved(data.combo as ComboDto);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Lỗi lưu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <TruongInlineModal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      className="cso-hp-goi-modal cso-hp-combo-modal"
      closeLabel="Đóng"
    >
      <form className="cso-hp-goi-modal-form" onSubmit={(e) => void submit(e)}>
        <header className="cso-hp-goi-modal-head">
          <h2 id={titleId} className="cso-hp-goi-modal-title">
            {editing ? "Sửa combo" : "Tạo combo & discount"}
          </h2>
        </header>

        <div className="cso-hp-goi-modal-body cso-hp-combo-body">
          <section className="cso-hp-combo-section" aria-labelledby="combo-sec-info">
            <h3 id="combo-sec-info" className="cso-hp-combo-section-title">
              Thông tin
            </h3>
            <div className="cso-hp-combo-section-body">
              <label className="cso-ql-field">
                <span className="cso-ql-label">Tên combo</span>
                <input
                  className="cso-ql-input"
                  value={draft.ten}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, ten: e.target.value }))
                  }
                  placeholder="VD: Hình họa + Bố cục Online"
                  required
                />
              </label>
            </div>
          </section>

          <section className="cso-hp-combo-section" aria-labelledby="combo-sec-giam">
            <h3 id="combo-sec-giam" className="cso-hp-combo-section-title">
              Giảm giá
            </h3>
            <div className="cso-hp-combo-section-body">
              <div className="cso-ql-fieldset-row">
                <label className="cso-ql-field">
                  <span className="cso-ql-label">Kiểu giảm</span>
                  <select
                    className="cso-ql-select"
                    value={draft.loaiGiam}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        loaiGiam: e.target.value as LoaiGiamCombo,
                      }))
                    }
                  >
                    <option value="phan_tram">Phần trăm (%)</option>
                    <option value="so_tien">Số tiền (VND)</option>
                  </select>
                </label>
                <label className="cso-ql-field">
                  <span className="cso-ql-label">
                    {draft.loaiGiam === "phan_tram" ? "Giảm (%)" : "Giảm (đ)"}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={draft.loaiGiam === "phan_tram" ? 100 : undefined}
                    className="cso-ql-input"
                    value={draft.giaTriGiam}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        giaTriGiam: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </label>
              </div>

              {draft.loaiGiam === "phan_tram" ? (
                <label className="cso-ql-field">
                  <span className="cso-ql-label">Trần giảm (đ, tùy chọn)</span>
                  <input
                    type="number"
                    min={0}
                    className="cso-ql-input"
                    value={draft.giamToiDaVnd}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, giamToiDaVnd: e.target.value }))
                    }
                    placeholder="Không giới hạn"
                  />
                </label>
              ) : null}
            </div>
          </section>

          <section className="cso-hp-combo-section" aria-labelledby="combo-sec-tp">
            <h3 id="combo-sec-tp" className="cso-hp-combo-section-title">
              Thành phần
            </h3>
            <div className="cso-hp-combo-section-body">
              <p className="cso-hp-combo-section-note">≥ 2 khóa khác nhau</p>
              <fieldset className="cso-hp-combo-lines">
                <legend className="sr-only">Thành phần khóa và gói</legend>
                {draft.lines.map((line, idx) => {
                  const goiOpts = goiForKhoa(goiCatalog, line.khoaId);
                  return (
                    <div key={idx} className="cso-hp-combo-line">
                      <label className="cso-ql-field">
                        <span className="sr-only">Khóa {idx + 1}</span>
                        <select
                          className="cso-ql-select"
                          value={line.khoaId}
                          onChange={(e) =>
                            setLine(idx, { khoaId: e.target.value, goiId: "" })
                          }
                        >
                          <option value="">Chọn khóa…</option>
                          {khoaOpts.map((k) => (
                            <option key={k.id} value={k.id}>
                              {k.ten}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="cso-ql-field">
                        <span className="sr-only">Gói {idx + 1}</span>
                        <select
                          className="cso-ql-select"
                          value={line.goiId}
                          disabled={!line.khoaId}
                          onChange={(e) =>
                            setLine(idx, { goiId: e.target.value })
                          }
                        >
                          <option value="">Mọi gói khóa</option>
                          {goiOpts.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.ten} — {formatVnd(g.giaVnd)}
                            </option>
                          ))}
                        </select>
                      </label>
                      {draft.lines.length > 2 ? (
                        <button
                          type="button"
                          className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                          aria-label="Xóa dòng"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              lines: d.lines.filter((_, i) => i !== idx),
                            }))
                          }
                        >
                          <Trash2 size={14} strokeWidth={2.2} aria-hidden />
                        </button>
                      ) : (
                        <span className="cso-hp-combo-line-spacer" />
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      lines: [...d.lines, { khoaId: "", goiId: "" }],
                    }))
                  }
                >
                  <Plus size={14} strokeWidth={2.4} aria-hidden />
                  Thêm thành phần
                </button>
              </fieldset>
            </div>
          </section>

          <section className="cso-hp-combo-section" aria-labelledby="combo-sec-preview">
            <h3 id="combo-sec-preview" className="cso-hp-combo-section-title">
              Xem trước
            </h3>
            <div className="cso-hp-combo-section-body">
              <div
                className={`cso-hp-combo-preview${preview.lines.length < 2 ? " is-empty" : ""}`}
                aria-live="polite"
              >
                {preview.lines.length < 2 ? (
                  <p className="cso-hp-combo-preview-empty">
                    Chọn gói cụ thể cho ≥ 2 khóa để xem thành tiền.
                  </p>
                ) : (
                  <dl className="cso-hp-combo-preview-dl">
                    <div className="cso-hp-combo-preview-line">
                      <dt>Học phí gốc</dt>
                      <dd>{formatVnd(preview.giaGocVnd)}</dd>
                    </div>
                    <div className="cso-hp-combo-preview-line is-giam">
                      <dt>Giảm combo</dt>
                      <dd>
                        {preview.giamVnd > 0
                          ? `−${formatVnd(preview.giamVnd)}`
                          : "0đ"}
                      </dd>
                    </div>
                    <div className="cso-hp-combo-preview-line is-total">
                      <dt>Phải trả</dt>
                      <dd>{formatVnd(preview.tongVnd)}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>
          </section>

          <section className="cso-hp-combo-section" aria-labelledby="combo-sec-status">
            <h3 id="combo-sec-status" className="cso-hp-combo-section-title">
              Trạng thái
            </h3>
            <div className="cso-hp-combo-section-body">
              <div
                className="cso-hp-combo-status"
                role="group"
                aria-label="Trạng thái combo"
              >
                <button
                  type="button"
                  className={`cso-hp-combo-status-btn${draft.dangBan ? " on" : ""}`}
                  aria-pressed={draft.dangBan}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      dangBan: true,
                      hienTrangKhoa: true,
                    }))
                  }
                >
                  Hoạt động
                </button>
                <button
                  type="button"
                  className={`cso-hp-combo-status-btn${!draft.dangBan ? " on" : ""}`}
                  aria-pressed={!draft.dangBan}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      dangBan: false,
                      hienTrangKhoa: false,
                    }))
                  }
                >
                  Ngừng hoạt động
                </button>
              </div>
            </div>
          </section>

          {formError ? <p className="cso-ql-error">{formError}</p> : null}
        </div>

        <div className="cso-hp-goi-modal-foot">
          <button
            type="button"
            className="cso-ql-btn cso-ql-btn--ghost"
            disabled={busy}
            onClick={onClose}
          >
            Huỷ
          </button>
          <button
            type="submit"
            className="cso-ql-btn cso-ql-btn--primary"
            disabled={busy}
          >
            {busy ? "Đang lưu…" : editing ? "Lưu" : "Tạo combo"}
          </button>
        </div>
      </form>
    </TruongInlineModal>
  );
}
