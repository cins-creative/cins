"use client";

import { ChevronDown, ExternalLink, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  formatThoiLuong,
  parseGoiMoTa,
} from "@/lib/co-so/goi-hoc-phi-meta";
import type { GoiHocPhiDraft } from "@/lib/to-chuc/khoa-hoc-goi-phi";

export type OrgGoiPickerItem = {
  id: string;
  ten: string;
  soNgay: number;
  giaVnd: number;
  moTa: string | null;
  dangBan: boolean;
  khoaIds: string[];
};

export type OrgComboPickerItem = {
  id: string;
  ten: string;
  moTa: string | null;
  loaiGiam: "phan_tram" | "so_tien";
  giaTriGiam: number;
  giamToiDaVnd: number | null;
  apDungTu: string | null;
  apDungDen: string | null;
  hienTrangKhoa: boolean;
  dangBan: boolean;
  thuTu: number;
  thanhPhan: Array<{ khoaId: string; goiId: string | null }>;
};

type Props = {
  orgId: string;
  /** Khi sửa khóa — preselect gói/combo đã gắn. */
  khoaId?: string | null;
  selectedGoiIds: string[];
  selectedComboIds: string[];
  disabled?: boolean;
  /** Href tab Học phí QL (tuỳ chọn). */
  manageHref?: string | null;
  onChangeGoi: (ids: string[]) => void;
  onChangeCombo: (ids: string[]) => void;
  /** Catalog tải xong — parent map meta / sync link. */
  onCatalogLoad?: (payload: {
    goi: OrgGoiPickerItem[];
    combo: OrgComboPickerItem[];
  }) => void;
};

function formatVnd(n: number) {
  return `${n.toLocaleString("vi-VN")}đ`;
}

function resolveKhoaIds(g: {
  khoaIds?: string[];
  khoaId?: string | null;
}): string[] {
  if (g.khoaIds?.length) return g.khoaIds;
  return g.khoaId ? [g.khoaId] : [];
}

function durationLabel(g: OrgGoiPickerItem): string {
  const { meta } = parseGoiMoTa(g.moTa, g.soNgay);
  return formatThoiLuong(meta.donVi, meta.soLuong);
}

function badgeGiamCombo(c: OrgComboPickerItem): string {
  if (c.loaiGiam === "phan_tram") return `−${c.giaTriGiam}%`;
  return `−${formatVnd(c.giaTriGiam)}`;
}

/** Map gói org → draft meta JSON khóa (mirror đọc). */
export function goiDraftsFromOrgSelection(
  catalog: ReadonlyArray<OrgGoiPickerItem>,
  selectedIds: ReadonlyArray<string>,
): GoiHocPhiDraft[] {
  const byId = new Map(catalog.map((g) => [g.id, g]));
  const out: GoiHocPhiDraft[] = [];
  for (const id of selectedIds) {
    const g = byId.get(id);
    if (!g) continue;
    out.push({
      id: g.id,
      tenGoi: g.ten,
      hocPhi: String(g.giaVnd),
      soBuoi: "",
      phutMoiBuoi: "",
    });
  }
  return out;
}

/** PATCH từng gói: thêm/bớt `khoaId` trong `khoaIds`. */
export async function syncOrgGoiLinksForKhoa(input: {
  orgId: string;
  khoaId: string;
  selectedIds: ReadonlyArray<string>;
  catalog: ReadonlyArray<OrgGoiPickerItem>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const selected = new Set(input.selectedIds);
  for (const g of input.catalog) {
    const current = resolveKhoaIds(g);
    const had = current.includes(input.khoaId);
    const want = selected.has(g.id);
    if (had === want) continue;
    const nextIds = want
      ? [...new Set([...current, input.khoaId])]
      : current.filter((id) => id !== input.khoaId);
    const res = await fetch(
      `/api/co-so/${encodeURIComponent(input.orgId)}/hoc-phi/goi`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goiId: g.id, khoaIds: nextIds }),
      },
    );
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      return {
        ok: false,
        error:
          typeof data.error === "string"
            ? data.error
            : "Không gắn gói học phí vào khóa.",
      };
    }
  }
  return { ok: true };
}

/** Thêm/bớt khóa trong thành phần combo (≥ 2 khóa khác nhau). */
export async function syncOrgComboLinksForKhoa(input: {
  orgId: string;
  khoaId: string;
  selectedIds: ReadonlyArray<string>;
  catalog: ReadonlyArray<OrgComboPickerItem>;
  preferredGoiId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const selected = new Set(input.selectedIds);
  const preferred =
    typeof input.preferredGoiId === "string" && input.preferredGoiId.trim()
      ? input.preferredGoiId.trim()
      : null;

  for (const c of input.catalog) {
    const had = c.thanhPhan.some((t) => t.khoaId === input.khoaId);
    const want = selected.has(c.id);
    if (had === want) continue;

    let nextTp = c.thanhPhan.map((t) => ({
      khoaId: t.khoaId,
      goiId: t.goiId,
    }));
    if (want) {
      nextTp = [...nextTp, { khoaId: input.khoaId, goiId: preferred }];
    } else {
      nextTp = nextTp.filter((t) => t.khoaId !== input.khoaId);
    }

    const khoaSet = new Set(nextTp.map((t) => t.khoaId).filter(Boolean));
    if (khoaSet.size < 2) {
      return {
        ok: false,
        error: want
          ? `Combo «${c.ten}» cần ≥ 2 khóa — thêm khóa khác trong tab Combo trước.`
          : `Bỏ khóa này sẽ làm combo «${c.ten}» còn < 2 khóa. Sửa combo trong tab Combo & Discount.`,
      };
    }

    const res = await fetch(
      `/api/co-so/${encodeURIComponent(input.orgId)}/hoc-phi/combo/${encodeURIComponent(c.id)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ten: c.ten,
          moTa: c.moTa,
          loaiGiam: c.loaiGiam,
          giaTriGiam: c.giaTriGiam,
          giamToiDaVnd: c.giamToiDaVnd,
          apDungTu: c.apDungTu,
          apDungDen: c.apDungDen,
          hienTrangKhoa: c.hienTrangKhoa,
          dangBan: c.dangBan,
          thuTu: c.thuTu,
          thanhPhan: nextTp,
        }),
      },
    );
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      return {
        ok: false,
        error:
          typeof data.error === "string"
            ? data.error
            : "Không gắn combo vào khóa.",
      };
    }
  }
  return { ok: true };
}

export function KhoaHocGoiPhiEditor({
  orgId,
  khoaId = null,
  selectedGoiIds,
  selectedComboIds,
  disabled = false,
  manageHref = null,
  onChangeGoi,
  onChangeCombo,
  onCatalogLoad,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [panelRect, setPanelRect] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const [goiCatalog, setGoiCatalog] = useState<OrgGoiPickerItem[]>([]);
  const [comboCatalog, setComboCatalog] = useState<OrgComboPickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const syncPanelRect = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 6;
    const preferredMax = 280;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      120,
      Math.min(preferredMax, openUp ? spaceAbove : spaceBelow),
    );
    setPanelRect(
      openUp
        ? {
            bottom: window.innerHeight - rect.top + gap,
            left: rect.left,
            width: rect.width,
            maxHeight,
          }
        : {
            top: rect.bottom + gap,
            left: rect.left,
            width: rect.width,
            maxHeight,
          },
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [goiRes, comboRes] = await Promise.all([
        fetch(`/api/co-so/${encodeURIComponent(orgId)}/hoc-phi/goi`, {
          credentials: "include",
        }),
        fetch(`/api/co-so/${encodeURIComponent(orgId)}/hoc-phi/combo`, {
          credentials: "include",
        }),
      ]);

      const goiData = (await goiRes.json()) as {
        goi?: Array<{
          id: string;
          ten: string;
          soNgay: number;
          giaVnd: number;
          moTa: string | null;
          dangBan: boolean;
          khoaId?: string | null;
          khoaIds?: string[];
        }>;
        error?: string;
      };
      if (!goiRes.ok) {
        throw new Error(
          typeof goiData.error === "string"
            ? goiData.error
            : "Không tải gói học phí.",
        );
      }

      const comboData = (await comboRes.json()) as {
        combo?: Array<{
          id: string;
          ten: string;
          moTa: string | null;
          loaiGiam: "phan_tram" | "so_tien";
          giaTriGiam: number;
          giamToiDaVnd: number | null;
          apDungTu: string | null;
          apDungDen: string | null;
          hienTrangKhoa: boolean;
          dangBan: boolean;
          thuTu: number;
          thanhPhan: Array<{
            khoaId: string;
            goiId: string | null;
          }>;
        }>;
        error?: string;
      };
      if (!comboRes.ok) {
        throw new Error(
          typeof comboData.error === "string"
            ? comboData.error
            : "Không tải combo.",
        );
      }

      const mappedGoi: OrgGoiPickerItem[] = (goiData.goi ?? []).map((g) => ({
        id: g.id,
        ten: g.ten,
        soNgay: g.soNgay,
        giaVnd: g.giaVnd,
        moTa: g.moTa,
        dangBan: g.dangBan,
        khoaIds: resolveKhoaIds(g),
      }));
      const mappedCombo: OrgComboPickerItem[] = (comboData.combo ?? []).map(
        (c) => ({
          id: c.id,
          ten: c.ten,
          moTa: c.moTa,
          loaiGiam: c.loaiGiam === "so_tien" ? "so_tien" : "phan_tram",
          giaTriGiam: Number(c.giaTriGiam) || 0,
          giamToiDaVnd:
            c.giamToiDaVnd == null ? null : Number(c.giamToiDaVnd),
          apDungTu: c.apDungTu,
          apDungDen: c.apDungDen,
          hienTrangKhoa: Boolean(c.hienTrangKhoa),
          dangBan: Boolean(c.dangBan),
          thuTu: Number(c.thuTu) || 0,
          thanhPhan: (c.thanhPhan ?? []).map((t) => ({
            khoaId: t.khoaId,
            goiId: t.goiId,
          })),
        }),
      );

      setGoiCatalog(mappedGoi);
      setComboCatalog(mappedCombo);
      onCatalogLoad?.({ goi: mappedGoi, combo: mappedCombo });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Lỗi tải học phí.");
      setGoiCatalog([]);
      setComboCatalog([]);
      onCatalogLoad?.({ goi: [], combo: [] });
    } finally {
      setLoading(false);
    }
  }, [orgId, onCatalogLoad]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) {
      setPanelRect(null);
      return;
    }
    syncPanelRect();
    function onReposition() {
      syncPanelRect();
    }
    function onPointerDown(e: PointerEvent) {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (rootRef.current?.contains(t)) return;
      const menu = document.getElementById(listId);
      if (menu?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, listId, syncPanelRect]);

  const linkedGoiIds = useMemo(() => {
    if (!khoaId) return [] as string[];
    return goiCatalog
      .filter((g) => g.khoaIds.includes(khoaId))
      .map((g) => g.id);
  }, [goiCatalog, khoaId]);

  const linkedComboIds = useMemo(() => {
    if (!khoaId) return [] as string[];
    return comboCatalog
      .filter((c) => c.thanhPhan.some((t) => t.khoaId === khoaId))
      .map((c) => c.id);
  }, [comboCatalog, khoaId]);

  useEffect(() => {
    if (!khoaId || loading) return;
    if (selectedGoiIds.length === 0 && linkedGoiIds.length > 0) {
      onChangeGoi(linkedGoiIds);
    }
  }, [
    khoaId,
    loading,
    linkedGoiIds,
    selectedGoiIds.length,
    onChangeGoi,
  ]);

  useEffect(() => {
    if (!khoaId || loading) return;
    if (selectedComboIds.length === 0 && linkedComboIds.length > 0) {
      onChangeCombo(linkedComboIds);
    }
  }, [
    khoaId,
    loading,
    linkedComboIds,
    selectedComboIds.length,
    onChangeCombo,
  ]);

  const goiSet = useMemo(() => new Set(selectedGoiIds), [selectedGoiIds]);
  const comboSet = useMemo(
    () => new Set(selectedComboIds),
    [selectedComboIds],
  );

  function toggleGoi(id: string) {
    if (disabled) return;
    onChangeGoi(
      goiSet.has(id)
        ? selectedGoiIds.filter((x) => x !== id)
        : [...selectedGoiIds, id],
    );
  }

  function toggleCombo(id: string) {
    if (disabled) return;
    onChangeCombo(
      comboSet.has(id)
        ? selectedComboIds.filter((x) => x !== id)
        : [...selectedComboIds, id],
    );
  }

  const summary = useMemo(() => {
    const n = selectedGoiIds.length + selectedComboIds.length;
    if (n === 0) return "Chọn gói / combo…";
    return `Chọn thêm · đã gắn ${n} mục`;
  }, [selectedGoiIds.length, selectedComboIds.length]);

  const selectedGoi = useMemo(
    () => goiCatalog.filter((g) => goiSet.has(g.id)),
    [goiCatalog, goiSet],
  );
  const selectedCombo = useMemo(
    () => comboCatalog.filter((c) => comboSet.has(c.id)),
    [comboCatalog, comboSet],
  );

  const emptyCatalog = goiCatalog.length === 0 && comboCatalog.length === 0;
  const showPanel = open && !disabled && panelRect != null;

  const panel =
    showPanel && panelRect
      ? createPortal(
          <div
            id={listId}
            className="cso-kh-goi-phi-ms-panel cso-kh-goi-phi-ms-panel--portal"
            role="listbox"
            aria-multiselectable
            aria-label="Gói học phí và combo"
            style={{
              top: panelRect.top,
              bottom: panelRect.bottom,
              left: panelRect.left,
              width: panelRect.width,
              maxHeight: panelRect.maxHeight,
            }}
          >
          {goiCatalog.length > 0 ? (
            <div className="cso-kh-goi-phi-ms-group">
              <div className="cso-kh-goi-phi-ms-group-label">Gói học phí</div>
              {goiCatalog.map((g) => {
                const checked = goiSet.has(g.id);
                return (
                  <label
                    key={g.id}
                    className={`cso-kh-goi-phi-ms-option${checked ? " on" : ""}${
                      g.dangBan ? "" : " is-hidden"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleGoi(g.id)}
                    />
                    <span className="cso-kh-goi-phi-ms-option-body">
                      <span className="cso-kh-goi-phi-ms-option-name">
                        {g.ten}
                      </span>
                      <span className="cso-kh-goi-phi-ms-option-meta">
                        {durationLabel(g)}
                        <span aria-hidden> · </span>
                        {formatVnd(g.giaVnd)}
                        {!g.dangBan ? (
                          <>
                            <span aria-hidden> · </span>
                            <span className="cso-kh-goi-phi-pick-badge">Ẩn</span>
                          </>
                        ) : null}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : null}

          {comboCatalog.length > 0 ? (
            <div className="cso-kh-goi-phi-ms-group">
              <div className="cso-kh-goi-phi-ms-group-label">Combo</div>
              {comboCatalog.map((c) => {
                const checked = comboSet.has(c.id);
                return (
                  <label
                    key={c.id}
                    className={`cso-kh-goi-phi-ms-option${checked ? " on" : ""}${
                      c.dangBan ? "" : " is-hidden"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleCombo(c.id)}
                    />
                    <span className="cso-kh-goi-phi-ms-option-body">
                      <span className="cso-kh-goi-phi-ms-option-name">
                        {c.ten}
                      </span>
                      <span className="cso-kh-goi-phi-ms-option-meta">
                        {badgeGiamCombo(c)}
                        <span aria-hidden> · </span>
                        {c.thanhPhan.length} khóa
                        {!c.dangBan ? (
                          <>
                            <span aria-hidden> · </span>
                            <span className="cso-kh-goi-phi-pick-badge">Ẩn</span>
                          </>
                        ) : null}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>,
        document.body,
      )
    : null;

  return (
    <fieldset className="cso-kh-field cso-kh-goi-phi">
      <legend className="cso-kh-label">Gói học phí &amp; combo</legend>
      <p className="cso-kh-field-hint cso-kh-goi-phi-hint">
        Chọn gói hoặc combo đã tạo ở mục Học phí. Một gói có thể gắn nhiều khóa.
      </p>

      {loading ? (
        <p className="cso-kh-field-hint">Đang tải học phí…</p>
      ) : loadError ? (
        <p className="cso-kh-err">{loadError}</p>
      ) : emptyCatalog ? (
        <div className="cso-kh-goi-phi-ms-row">
          <p className="cso-kh-field-hint cso-kh-goi-phi-empty">
            Chưa có gói / combo. Tạo trong tab Học phí rồi quay lại chọn.
          </p>
          {manageHref ? (
            <a
              href={manageHref}
              className="cso-kh-goi-phi-manage-icon"
              target="_blank"
              rel="noreferrer"
              aria-label="Quản lý gói và combo"
              title="Quản lý gói & combo"
            >
              <ExternalLink size={16} strokeWidth={2.2} aria-hidden />
            </a>
          ) : null}
        </div>
      ) : (
        <div className="cso-kh-goi-phi-ms" ref={rootRef}>
          <div className="cso-kh-goi-phi-ms-row">
            <button
              ref={triggerRef}
              type="button"
              className={`cso-kh-goi-phi-ms-trigger${open ? " is-open" : ""}`}
              aria-haspopup="listbox"
              aria-expanded={showPanel}
              aria-controls={listId}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                setOpen((v) => {
                  const next = !v;
                  if (next) syncPanelRect();
                  return next;
                });
              }}
            >
              <span className="cso-kh-goi-phi-ms-value">{summary}</span>
              <ChevronDown size={16} strokeWidth={2.2} aria-hidden />
            </button>
            {manageHref ? (
              <a
                href={manageHref}
                className="cso-kh-goi-phi-manage-icon"
                target="_blank"
                rel="noreferrer"
                aria-label="Quản lý gói và combo"
                title="Quản lý gói & combo"
              >
                <ExternalLink size={16} strokeWidth={2.2} aria-hidden />
              </a>
            ) : null}
          </div>

          {selectedGoi.length > 0 || selectedCombo.length > 0 ? (
            <ul className="cso-kh-goi-phi-selected" aria-label="Gói đã chọn">
              {selectedGoi.map((g) => (
                <li key={`goi-${g.id}`} className="cso-kh-goi-phi-selected-item">
                  <span className="cso-kh-goi-phi-selected-kind">Gói</span>
                  <span className="cso-kh-goi-phi-selected-body">
                    <span className="cso-kh-goi-phi-selected-name">{g.ten}</span>
                    <span className="cso-kh-goi-phi-selected-meta">
                      {durationLabel(g)}
                      <span aria-hidden> · </span>
                      <span className="cso-kh-goi-phi-selected-price">
                        {formatVnd(g.giaVnd)}
                      </span>
                    </span>
                  </span>
                  <button
                    type="button"
                    className="cso-kh-goi-phi-selected-remove"
                    aria-label={`Bỏ gói ${g.ten}`}
                    disabled={disabled}
                    onClick={() => toggleGoi(g.id)}
                  >
                    <X size={14} strokeWidth={2.2} aria-hidden />
                  </button>
                </li>
              ))}
              {selectedCombo.map((c) => (
                <li
                  key={`combo-${c.id}`}
                  className="cso-kh-goi-phi-selected-item"
                >
                  <span className="cso-kh-goi-phi-selected-kind is-combo">
                    Combo
                  </span>
                  <span className="cso-kh-goi-phi-selected-body">
                    <span className="cso-kh-goi-phi-selected-name">{c.ten}</span>
                    <span className="cso-kh-goi-phi-selected-meta">
                      {badgeGiamCombo(c)}
                      <span aria-hidden> · </span>
                      {c.thanhPhan.length} khóa
                    </span>
                  </span>
                  <button
                    type="button"
                    className="cso-kh-goi-phi-selected-remove"
                    aria-label={`Bỏ combo ${c.ten}`}
                    disabled={disabled}
                    onClick={() => toggleCombo(c.id)}
                  >
                    <X size={14} strokeWidth={2.2} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {panel}
        </div>
      )}
    </fieldset>
  );
}
