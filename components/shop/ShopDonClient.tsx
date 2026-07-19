"use client";

import { ChevronDown, Loader2, Package, PackageCheck, X } from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import {
  SHOP_TRANG_THAI_DON_LABEL,
  type ShopDonHang,
  type ShopLoaiDon,
} from "@/lib/shop/types";

import { ShopDashTabs } from "./ShopDashTabs";
import { ShopDonDetailModal } from "./ShopDonDetailModal";
import "./shop-dashboard.css";

const LOAI_DON_SHORT: Record<ShopLoaiDon, string> = {
  mua_ngay: "Đã thanh toán",
  dat_truoc_nhan_su_kien: "Thanh toán sau",
};

function formatDonTime(iso: string): string {
  try {
    const d = new Date(iso);
    const time = d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const date = d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    return `${time} ${date}`;
  } catch {
    return iso;
  }
}

function tongSoLuong(d: ShopDonHang): number {
  return d.dong.reduce((sum, line) => sum + line.soLuong, 0);
}

const PREP_LOAI_ALL = "__all__";
const PREP_LOAI_KHAC = "Chưa phân loại";

type PrepLine = {
  key: string;
  ten: string;
  nhan: string | null;
  soLuong: number;
  anhUrl: string | null;
  phanLoai: string;
  /** Đơn chứa mẫu này + SL trong từng đơn. */
  dons: Array<{ idDon: string; soLuong: number }>;
};

function prepLineKey(
  line: Pick<ShopDonHang["dong"][number], "idBienThe" | "tenSnapshot" | "nhanSnapshot">,
): string {
  const nhanRaw = line.nhanSnapshot?.trim() || "";
  const nhan = nhanRaw && nhanRaw !== "Mặc định" ? nhanRaw : null;
  return `${line.idBienThe ?? line.tenSnapshot}::${nhan ?? ""}`;
}

function aggregatePrepLines(dons: ShopDonHang[]): PrepLine[] {
  const map = new Map<string, PrepLine>();
  for (const d of dons) {
    for (const line of d.dong) {
      const nhanRaw = line.nhanSnapshot?.trim() || "";
      const nhan =
        nhanRaw && nhanRaw !== "Mặc định" ? nhanRaw : null;
      const phanLoai = line.phanLoai?.trim() || PREP_LOAI_KHAC;
      const key = prepLineKey(line);
      const prev = map.get(key);
      if (prev) {
        prev.soLuong += line.soLuong;
        if (!prev.anhUrl && line.anhUrl) prev.anhUrl = line.anhUrl;
        const hit = prev.dons.find((x) => x.idDon === d.id);
        if (hit) hit.soLuong += line.soLuong;
        else prev.dons.push({ idDon: d.id, soLuong: line.soLuong });
      } else {
        map.set(key, {
          key,
          ten: line.tenSnapshot,
          nhan,
          soLuong: line.soLuong,
          anhUrl: line.anhUrl ?? null,
          phanLoai,
          dons: [{ idDon: d.id, soLuong: line.soLuong }],
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => {
    const byLoai = a.phanLoai.localeCompare(b.phanLoai, "vi");
    if (byLoai !== 0) return byLoai;
    const byName = a.ten.localeCompare(b.ten, "vi");
    if (byName !== 0) return byName;
    return (a.nhan ?? "").localeCompare(b.nhan ?? "", "vi");
  });
}

function groupPrepByLoai(lines: PrepLine[]): Array<{
  loai: string;
  lines: PrepLine[];
  tong: number;
}> {
  const map = new Map<string, PrepLine[]>();
  for (const line of lines) {
    const list = map.get(line.phanLoai) ?? [];
    list.push(line);
    map.set(line.phanLoai, list);
  }
  return [...map.entries()]
    .map(([loai, groupLines]) => ({
      loai,
      lines: groupLines,
      tong: groupLines.reduce((s, l) => s + l.soLuong, 0),
    }))
    .sort((a, b) => a.loai.localeCompare(b.loai, "vi"));
}

function formatTimeRange(dons: ShopDonHang[]): string {
  if (dons.length === 0) return "—";
  const times = dons
    .map((d) => new Date(d.taoLuc).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);
  if (times.length === 0) return "—";
  const from = formatDonTime(new Date(times[0]!).toISOString());
  const to = formatDonTime(new Date(times[times.length - 1]!).toISOString());
  return from === to ? from : `${from} → ${to}`;
}

export function ShopDonClient() {
  const { openChat } = useCinsChat();
  const [items, setItems] = useState<ShopDonHang[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [prepOpen, setPrepOpen] = useState(false);
  const [prepLoaiFilter, setPrepLoaiFilter] = useState(PREP_LOAI_ALL);
  const [prepExpandedKey, setPrepExpandedKey] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const lastSelectIndexRef = useRef<number | null>(null);
  const shiftHeldRef = useRef(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/don?role=seller", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        items?: ShopDonHang[];
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tải đơn.");
        return;
      }
      setItems(json?.items ?? []);
    } catch {
      setErr("Không tải đơn.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedDons = useMemo(
    () => items.filter((d) => selectedIdSet.has(d.id)),
    [items, selectedIdSet],
  );

  const prepLines = useMemo(
    () => aggregatePrepLines(selectedDons),
    [selectedDons],
  );

  const prepLoaiOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const line of prepLines) {
      counts.set(line.phanLoai, (counts.get(line.phanLoai) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([loai, count]) => ({ loai, count }))
      .sort((a, b) => a.loai.localeCompare(b.loai, "vi"));
  }, [prepLines]);

  const prepGroups = useMemo(() => {
    const filtered =
      prepLoaiFilter === PREP_LOAI_ALL
        ? prepLines
        : prepLines.filter((l) => l.phanLoai === prepLoaiFilter);
    return groupPrepByLoai(filtered);
  }, [prepLines, prepLoaiFilter]);

  const prepTongSp = useMemo(
    () => prepGroups.reduce((sum, g) => sum + g.tong, 0),
    [prepGroups],
  );

  const prepLoaiCount = useMemo(
    () => prepGroups.reduce((sum, g) => sum + g.lines.length, 0),
    [prepGroups],
  );

  const selectedDonById = useMemo(
    () => new Map(selectedDons.map((d) => [d.id, d])),
    [selectedDons],
  );

  useEffect(() => {
    if (!prepExpandedKey) return;
    if (!prepLines.some((l) => l.key === prepExpandedKey)) {
      setPrepExpandedKey(null);
    }
  }, [prepExpandedKey, prepLines]);

  const closePrep = useCallback(() => {
    setPrepOpen(false);
    setPrepExpandedKey(null);
    setPrepLoaiFilter(PREP_LOAI_ALL);
  }, []);

  const togglePrepExpand = useCallback((key: string) => {
    setPrepExpandedKey((prev) => (prev === key ? null : key));
  }, []);

  const resolvePrepDons = useCallback(
    (line: PrepLine) =>
      line.dons
        .map((hit) => {
          const don = selectedDonById.get(hit.idDon);
          if (!don) return null;
          return { don, soLuong: hit.soLuong };
        })
        .filter((x): x is { don: ShopDonHang; soLuong: number } => x != null)
        .sort(
          (a, b) =>
            new Date(a.don.taoLuc).getTime() - new Date(b.don.taoLuc).getTime(),
        ),
    [selectedDonById],
  );

  const allSelected =
    items.length > 0 && items.every((d) => selectedIdSet.has(d.id));

  const applySelect = useCallback(
    (id: string, index: number, shiftKey: boolean, checked: boolean) => {
      setSelectedIds((prev) => {
        if (shiftKey && lastSelectIndexRef.current != null) {
          const a = Math.min(lastSelectIndexRef.current, index);
          const b = Math.max(lastSelectIndexRef.current, index);
          const next = new Set(prev);
          for (let i = a; i <= b; i++) {
            const row = items[i];
            if (row) next.add(row.id);
          }
          return [...next];
        }
        if (checked) {
          return prev.includes(id) ? prev : [...prev, id];
        }
        return prev.filter((x) => x !== id);
      });
      if (!shiftKey) lastSelectIndexRef.current = index;
    },
    [items],
  );

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (items.length > 0 && items.every((d) => prev.includes(d.id))) {
        lastSelectIndexRef.current = null;
        return [];
      }
      return items.map((d) => d.id);
    });
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    lastSelectIndexRef.current = null;
    closePrep();
  }, [closePrep]);

  useEffect(() => {
    if (!prepOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (detailId != null) return;
      closePrep();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [prepOpen, closePrep, detailId]);

  if (loading) {
    return (
      <div className="shop-dash">
        <ShopDashTabs active="don" />
        <div className="shop-dash-loading" aria-busy="true">
          <Loader2 className="shop-spin" size={20} aria-hidden />
          Đang tải…
        </div>
      </div>
    );
  }

  const selectionActions =
    selectedIds.length > 0 ? (
      <div className="shop-don-bulk" role="toolbar" aria-label="Thao tác đơn đã chọn">
        <span className="shop-don-bulk-count">
          Đã chọn <strong>{selectedIds.length}</strong>
        </span>
        <button
          type="button"
          className="shop-don-bulk-btn is-primary"
          onClick={() => {
            setPrepLoaiFilter(PREP_LOAI_ALL);
            setPrepExpandedKey(null);
            setPrepOpen(true);
          }}
        >
          <PackageCheck size={15} strokeWidth={2.2} aria-hidden />
          Danh sách chuẩn bị
        </button>
        <button
          type="button"
          className="shop-don-bulk-btn"
          onClick={clearSelection}
        >
          Bỏ chọn
        </button>
      </div>
    ) : null;

  const prepPortal =
    portalReady && prepOpen
      ? createPortal(
          <div
            className="shop-don-prep"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closePrep();
            }}
          >
            <div
              className="shop-don-prep-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shop-don-prep-title"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <header className="shop-don-prep-hdr">
                <div>
                  <p className="shop-don-prep-kicker">
                    {selectedDons.length} đơn · {formatTimeRange(selectedDons)}
                  </p>
                  <h3 id="shop-don-prep-title">Danh sách chuẩn bị</h3>
                </div>
                <button
                  type="button"
                  className="shop-don-prep-close"
                  aria-label="Đóng"
                  onClick={closePrep}
                >
                  <X size={18} strokeWidth={2} aria-hidden />
                </button>
              </header>

              {prepLines.length === 0 ? (
                <p className="shop-dash-hint">Không có mặt hàng trong các đơn đã chọn.</p>
              ) : (
                <>
                  {prepLoaiOptions.length > 1 ? (
                    <div
                      className="shop-don-prep-filters"
                      role="tablist"
                      aria-label="Lọc theo loại hàng"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={prepLoaiFilter === PREP_LOAI_ALL}
                        className={`shop-don-prep-filter${prepLoaiFilter === PREP_LOAI_ALL ? " is-active" : ""}`}
                        onClick={() => setPrepLoaiFilter(PREP_LOAI_ALL)}
                      >
                        Tất cả
                        <span>{prepLines.length}</span>
                      </button>
                      {prepLoaiOptions.map(({ loai, count }) => (
                        <button
                          key={loai}
                          type="button"
                          role="tab"
                          aria-selected={prepLoaiFilter === loai}
                          className={`shop-don-prep-filter${prepLoaiFilter === loai ? " is-active" : ""}`}
                          onClick={() => setPrepLoaiFilter(loai)}
                        >
                          {loai}
                          <span>{count}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="shop-don-prep-table-wrap">
                    {prepGroups.map((group) => (
                      <section
                        key={group.loai}
                        className="shop-don-prep-group"
                      >
                        <header className="shop-don-prep-group-hdr">
                          <h4>{group.loai}</h4>
                          <span>×{group.tong}</span>
                        </header>
                        <table className="shop-don-prep-table">
                          <thead>
                            <tr>
                              <th scope="col">Hàng</th>
                              <th scope="col" className="shop-don-prep-col-qty">
                                Tổng SL
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.lines.map((line) => {
                              const expanded = prepExpandedKey === line.key;
                              const dons = expanded
                                ? resolvePrepDons(line)
                                : [];
                              return (
                                <Fragment key={line.key}>
                                  <tr
                                    className={
                                      expanded
                                        ? "shop-don-prep-row is-open"
                                        : "shop-don-prep-row"
                                    }
                                  >
                                    <td
                                      colSpan={2}
                                      className="shop-don-prep-row-cell"
                                    >
                                      <button
                                        type="button"
                                        className="shop-don-prep-row-btn"
                                        aria-expanded={expanded}
                                        onClick={() =>
                                          togglePrepExpand(line.key)
                                        }
                                      >
                                        <span className="shop-don-prep-item">
                                          <span
                                            className={`shop-don-prep-thumb${line.anhUrl ? "" : " is-empty"}`}
                                            aria-hidden
                                          >
                                            {line.anhUrl ? (
                                              // eslint-disable-next-line @next/next/no-img-element
                                              <img
                                                src={line.anhUrl}
                                                alt=""
                                                loading="lazy"
                                              />
                                            ) : (
                                              <Package
                                                size={16}
                                                strokeWidth={1.8}
                                              />
                                            )}
                                          </span>
                                          <span className="shop-don-prep-item-copy">
                                            <span className="shop-don-prep-name">
                                              {line.ten}
                                            </span>
                                            {line.nhan ? (
                                              <span className="shop-don-prep-var">
                                                {line.nhan}
                                              </span>
                                            ) : null}
                                            <span className="shop-don-prep-hint">
                                              {line.dons.length} đơn
                                            </span>
                                          </span>
                                        </span>
                                        <span className="shop-don-prep-row-end">
                                          <span className="shop-don-prep-col-qty">
                                            ×{line.soLuong}
                                          </span>
                                          <ChevronDown
                                            className={`shop-don-prep-chevron${expanded ? " is-open" : ""}`}
                                            size={16}
                                            strokeWidth={2.2}
                                            aria-hidden
                                          />
                                        </span>
                                      </button>
                                    </td>
                                  </tr>
                                  {expanded ? (
                                    <tr className="shop-don-prep-expand-row">
                                      <td
                                        colSpan={2}
                                        className="shop-don-prep-expand-cell"
                                      >
                                        {dons.length === 0 ? (
                                          <p className="shop-don-prep-expand-empty">
                                            Không còn đơn nào cho mẫu này.
                                          </p>
                                        ) : (
                                          <ul className="shop-don-prep-don-list">
                                            {dons.map(({ don, soLuong }) => (
                                              <li key={don.id}>
                                                <button
                                                  type="button"
                                                  className="shop-don-prep-don-btn"
                                                  onClick={() =>
                                                    setDetailId(don.id)
                                                  }
                                                >
                                                  <span className="shop-don-prep-don-main">
                                                    <span className="shop-don-prep-don-ma">
                                                      {don.maDon ??
                                                        don.id.slice(0, 8)}
                                                    </span>
                                                    <span className="shop-don-prep-don-meta">
                                                      {don.muaTen?.trim() ||
                                                        "—"}
                                                      {" · "}
                                                      {formatDonTime(
                                                        don.taoLuc,
                                                      )}
                                                    </span>
                                                  </span>
                                                  <span className="shop-don-prep-don-side">
                                                    <span
                                                      className={`shop-status shop-status--${don.trangThai}`}
                                                    >
                                                      {
                                                        SHOP_TRANG_THAI_DON_LABEL[
                                                          don.trangThai
                                                        ]
                                                      }
                                                    </span>
                                                    <span className="shop-don-prep-col-qty">
                                                      ×{soLuong}
                                                    </span>
                                                  </span>
                                                </button>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </td>
                                    </tr>
                                  ) : null}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </section>
                    ))}
                  </div>
                  <div className="shop-don-prep-foot">
                    <span>
                      {prepLoaiCount} mặt hàng
                      {prepGroups.length > 1
                        ? ` · ${prepGroups.length} loại`
                        : ""}
                      {" · tổng "}
                      <strong>×{prepTongSp}</strong>
                      {" · bấm hàng để xổ đơn"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="shop-dash">
      <ShopDashTabs active="don" actions={selectionActions} />

      {err ? <p className="shop-dash-err">{err}</p> : null}

      {items.length === 0 ? (
        <p className="shop-dash-hint">Chưa có đơn nào.</p>
      ) : (
        <div className="shop-grid-wrap">
          <table className="shop-grid shop-don-sheet">
            <thead>
              <tr>
                <th scope="col" className="shop-don-col-check">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    aria-label="Chọn tất cả đơn"
                    onChange={toggleSelectAll}
                  />
                </th>
                <th scope="col" className="shop-don-col-time">
                  Thời gian
                </th>
                <th scope="col" className="shop-don-col-ma">
                  Mã đơn
                </th>
                <th scope="col" className="shop-don-col-tt">
                  Tình trạng
                </th>
                <th scope="col" className="shop-don-col-mua">
                  Người mua
                </th>
                <th scope="col" className="shop-don-col-loai">
                  Loại
                </th>
                <th scope="col" className="shop-don-col-sp">
                  SP
                </th>
                <th scope="col" className="shop-don-col-tong">
                  Tổng
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((d, index) => {
                const isSelected = selectedIdSet.has(d.id);
                return (
                  <tr
                    key={d.id}
                    className={`shop-grid-row shop-don-sheet-row${
                      d.loaiDon === "mua_ngay" ? " is-paid" : ""
                    }${isSelected ? " is-selected" : ""}`}
                    tabIndex={0}
                    onClick={() => setDetailId(d.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetailId(d.id);
                      }
                    }}
                  >
                    <td
                      className="shop-don-col-check"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        aria-label={`Chọn đơn ${d.maDon ?? d.id.slice(0, 8)}`}
                        onMouseDown={(e) => {
                          shiftHeldRef.current = e.shiftKey;
                        }}
                        onChange={(e) => {
                          e.stopPropagation();
                          applySelect(
                            d.id,
                            index,
                            shiftHeldRef.current,
                            e.target.checked,
                          );
                          shiftHeldRef.current = false;
                        }}
                      />
                    </td>
                    <td className="shop-don-col-time">
                      {formatDonTime(d.taoLuc)}
                    </td>
                    <td className="shop-don-col-ma">
                      <span className="shop-dash-ma">{d.maDon ?? "—"}</span>
                    </td>
                    <td className="shop-don-col-tt">
                      <span className={`shop-status shop-status--${d.trangThai}`}>
                        {SHOP_TRANG_THAI_DON_LABEL[d.trangThai]}
                      </span>
                    </td>
                    <td className="shop-don-col-mua">
                      {d.muaTen?.trim() || "—"}
                    </td>
                    <td className="shop-don-col-loai">
                      {LOAI_DON_SHORT[d.loaiDon]}
                    </td>
                    <td className="shop-don-col-sp">{tongSoLuong(d)}</td>
                    <td className="shop-don-col-tong">
                      {d.tongTien.toLocaleString("vi-VN")} {d.tienTe}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="shop-don-select-hint">
            Giữ <kbd>Shift</kbd> khi chọn ô để chọn hàng loạt.
          </p>
        </div>
      )}

      <ShopDonDetailModal
        donId={detailId}
        open={detailId != null}
        onClose={() => setDetailId(null)}
        viewerRole="seller"
        onDonChange={(don) => {
          setItems((prev) =>
            prev.map((it) => (it.id === don.id ? { ...it, ...don } : it)),
          );
        }}
        onOpenChat={(userId) => {
          void openChat({ targetUserId: userId });
        }}
      />

      {prepPortal}
    </div>
  );
}
