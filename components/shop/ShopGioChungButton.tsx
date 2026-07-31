"use client";

import {
  Check,
  History,
  Loader2,
  Minus,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useCinsChatContext } from "@/components/cins/CinsChatProvider";
import { ShopMuaHistory } from "@/components/shop/ShopMuaHistory";

import {
  cloudflareImageTooLargeError,
  MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES,
} from "@/lib/cloudflare/image-upload-limits";
import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
import {
  fetchDiaChiNhanCached,
  peekDiaChiNhan,
  type ShopDiaChiNhanClient,
} from "@/lib/shop/client-fetch-cache";
import {
  shopPublicHref,
  shopSlugFromTen,
} from "@/lib/shop/cua-hang-href";
import {
  labelTinhThanh,
  TINH_THANH_SELECT_OPTIONS,
} from "@/lib/truong/contact";
import { SHOP_BUYER_TRANSFER_DISCLAIMER } from "@/lib/shop/terms";
import type {
  ShopDonHang,
  ShopGioChung,
  ShopGioChungNhom,
  ShopHinhThucGiao,
} from "@/lib/shop/types";
import { buildVietQrImageUrl } from "@/lib/shop/vietqr";

import "./shop-gio-chung.css";

/** Event để các nơi khác báo giỏ chung vừa đổi (badge tự refresh). */
export const GIO_CHUNG_CHANGED_EVENT = "cins:gio-chung-changed";
/** Event để nơi khác mở panel giỏ chung (vd. nút giỏ trên storefront). */
export const GIO_CHUNG_OPEN_EVENT = "cins:gio-chung-open";
/** Event toast «đã thêm vào giỏ» — panel topbar lắng nghe. */
export const GIO_CHUNG_ADDED_EVENT = "cins:gio-chung-added";

const GIO_ADDED_TOAST_MS = 4200;
const GIO_ADDED_TOAST_TEXT =
  "Đã thêm vào giỏ hàng thành công. Vui lòng kiểm tra trong giỏ hàng.";

/** Báo UI đã thêm/tăng hàng trong giỏ (optimistic hoặc sau API). */
export function notifyGioChungAdded() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(GIO_CHUNG_ADDED_EVENT));
}

function money(n: number, tienTe: string): string {
  return `${n.toLocaleString("vi-VN")} ${tienTe}`;
}

/** Debounce PATCH số lượng — khớp kiosk/storefront. */
const QTY_SYNC_MS = 200;

/** Cập nhật giỏ local ngay (không chờ mạng). */
function applyOptimisticGioQty(
  gio: ShopGioChung,
  idBienThe: string,
  soLuong: number,
): ShopGioChung {
  const qty = Math.max(0, Math.trunc(soLuong));
  const nhom: ShopGioChungNhom[] = [];
  for (const g of gio.nhom) {
    const dong = [];
    for (const d of g.dong) {
      if (d.idBienThe !== idBienThe) {
        dong.push(d);
        continue;
      }
      if (qty <= 0) continue;
      dong.push({ ...d, soLuong: qty });
    }
    if (dong.length === 0) continue;
    const tongTien = dong.reduce((s, d) => s + d.giaHienThi * d.soLuong, 0);
    const coVanDe = dong.some((d) => d.ngungBan || d.soLuong > d.soLuongTon);
    nhom.push({ ...g, dong, tongTien, coVanDe });
  }
  return {
    ...gio,
    nhom,
    tongSoDong: nhom.reduce((s, g) => s + g.dong.length, 0),
  };
}

/** Giữ số lượng đang chờ sync khi nhận snapshot server. */
function mergePendingIntoGio(
  gio: ShopGioChung,
  pending: Map<string, number>,
): ShopGioChung {
  if (pending.size === 0) return gio;
  let next = gio;
  for (const [idBienThe, soLuong] of pending) {
    next = applyOptimisticGioQty(next, idBienThe, soLuong);
  }
  return next;
}

type DiaChiNhanItem = ShopDiaChiNhanClient;

type PhuongXaOption = { code: string; name: string };

const SDT_RE = /^[0-9+()\-.\s]{6,20}$/;

export function ShopGioChungButton() {
  /* Topbar nằm trong CinsChatShellBridge — vẫn dùng bản nullable cho chắc. */
  const chat = useCinsChatContext();
  const [open, setOpen] = useState(false);
  const [gio, setGio] = useState<ShopGioChung | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  /** Đơn đã gửi trong phiên này — hiển thị card xanh phía trên. */
  const [sentDons, setSentDons] = useState<ShopDonHang[]>([]);
  /** Shop đang mở form thanh toán ở cột phải. */
  const [payingSellerId, setPayingSellerId] = useState<string | null>(null);
  const [payMount, setPayMount] = useState<HTMLElement | null>(null);
  const [addedToast, setAddedToast] = useState(false);
  const addedToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gioRef = useRef<ShopGioChung | null>(null);
  const pendingQtyRef = useRef(new Map<string, number>());
  const qtyEpochRef = useRef(new Map<string, number>());
  const syncTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  /** Bỏ qua 1 lần load từ event do chính panel vừa sync (tránh GET thừa). */
  const skipChangedLoadRef = useRef(false);

  useEffect(() => {
    gioRef.current = gio;
  }, [gio]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/gio-chung", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        gio?: ShopGioChung;
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tải giỏ.");
        return;
      }
      const raw = json?.gio ?? { id: null, nhom: [], tongSoDong: 0 };
      const merged = mergePendingIntoGio(raw, pendingQtyRef.current);
      gioRef.current = merged;
      setGio(merged);
    } catch {
      setErr("Không tải giỏ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPortalReady(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  /* Dọn timer debounce khi unmount. */
  useEffect(() => {
    const timers = syncTimersRef.current;
    const pending = pendingQtyRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
      pending.clear();
    };
  }, []);

  /* Refresh badge khi nơi khác thêm hàng vào giỏ chung; mở panel theo event. */
  useEffect(() => {
    const onChanged = () => {
      if (skipChangedLoadRef.current) {
        skipChangedLoadRef.current = false;
        return;
      }
      void load();
    };
    const onOpen = () => setOpen(true);
    const onAdded = () => {
      setAddedToast(true);
      if (addedToastTimerRef.current) clearTimeout(addedToastTimerRef.current);
      addedToastTimerRef.current = setTimeout(() => {
        addedToastTimerRef.current = null;
        setAddedToast(false);
      }, GIO_ADDED_TOAST_MS);
    };
    window.addEventListener(GIO_CHUNG_CHANGED_EVENT, onChanged);
    window.addEventListener(GIO_CHUNG_OPEN_EVENT, onOpen);
    window.addEventListener(GIO_CHUNG_ADDED_EVENT, onAdded);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(GIO_CHUNG_CHANGED_EVENT, onChanged);
      window.removeEventListener(GIO_CHUNG_OPEN_EVENT, onOpen);
      window.removeEventListener(GIO_CHUNG_ADDED_EVENT, onAdded);
      document.removeEventListener("visibilitychange", onVisible);
      if (addedToastTimerRef.current) clearTimeout(addedToastTimerRef.current);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** Gửi PATCH số lượng cuối cùng (đã debounce) — chạy nền. */
  const flushQtySync = useCallback(async (idBienThe: string) => {
    const soLuong = pendingQtyRef.current.get(idBienThe);
    if (soLuong === undefined) return;
    pendingQtyRef.current.delete(idBienThe);
    const epoch = qtyEpochRef.current.get(idBienThe) ?? 0;
    try {
      const res = await fetch("/api/shop/gio-chung", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idBienThe, soLuong }),
      });
      const json = (await res.json().catch(() => null)) as {
        gio?: ShopGioChung;
        error?: string;
      } | null;
      /* Có lần bấm mới hơn — bỏ response cũ. */
      if ((qtyEpochRef.current.get(idBienThe) ?? 0) !== epoch) return;
      if (!res.ok || !json?.gio) {
        setErr(json?.error ?? "Không cập nhật giỏ.");
        await load();
        return;
      }
      const merged = mergePendingIntoGio(json.gio, pendingQtyRef.current);
      gioRef.current = merged;
      setGio(merged);
      skipChangedLoadRef.current = true;
      window.dispatchEvent(new Event(GIO_CHUNG_CHANGED_EVENT));
    } catch {
      if ((qtyEpochRef.current.get(idBienThe) ?? 0) !== epoch) return;
      setErr("Không cập nhật giỏ.");
      await load();
    }
  }, [load]);

  /** Phản hồi UI ngay — PATCH debounce chạy nền. */
  const patchQty = useCallback(
    (idBienThe: string, soLuongRaw: number) => {
      const prev = gioRef.current;
      if (!prev) return;
      let line: { soLuongTon: number } | null = null;
      for (const g of prev.nhom) {
        const d = g.dong.find((x) => x.idBienThe === idBienThe);
        if (d) {
          line = d;
          break;
        }
      }
      if (!line) return;
      const qty =
        soLuongRaw <= 0
          ? 0
          : Math.min(
              Math.max(0, Math.trunc(soLuongRaw)),
              Math.max(0, line.soLuongTon),
            );
      if (soLuongRaw > qty && line.soLuongTon > 0) {
        setErr(`Chỉ còn ${line.soLuongTon} trong kho.`);
      } else {
        setErr(null);
      }

      qtyEpochRef.current.set(
        idBienThe,
        (qtyEpochRef.current.get(idBienThe) ?? 0) + 1,
      );
      pendingQtyRef.current.set(idBienThe, qty);
      const next = applyOptimisticGioQty(prev, idBienThe, qty);
      gioRef.current = next;
      setGio(next);

      const prevTimer = syncTimersRef.current.get(idBienThe);
      if (prevTimer) clearTimeout(prevTimer);
      syncTimersRef.current.set(
        idBienThe,
        setTimeout(() => {
          syncTimersRef.current.delete(idBienThe);
          void flushQtySync(idBienThe);
        }, QTY_SYNC_MS),
      );
    },
    [flushQtySync],
  );

  /* Gửi đơn xong → mở luôn bubble chat với người bán (card đơn đã ở inbox). */
  const onSent = useCallback(
    (don: ShopDonHang) => {
      setSentDons((prev) => [don, ...prev.filter((d) => d.id !== don.id)]);
      setPayingSellerId((id) => (id === don.idNguoiBan ? null : id));
      void load();
      void chat?.openBubbleChatWithUser(don.idNguoiBan);
    },
    [chat, load],
  );

  const count = gio?.tongSoDong ?? 0;
  const groups = gio?.nhom ?? [];
  const sentSellerIds = new Set(sentDons.map((d) => d.idNguoiBan));
  /* Ẩn nhóm đã gửi khỏi list chờ (đã có card xanh). */
  const pendingGroups = groups.filter((g) => !sentSellerIds.has(g.idNguoiBan));
  const isSplitLayout = pendingGroups.length > 0;

  /* Shop đang thanh toán bị gỡ khỏi giỏ → bỏ chọn cột phải. */
  useEffect(() => {
    if (!payingSellerId) return;
    if (!pendingGroups.some((g) => g.idNguoiBan === payingSellerId)) {
      setPayingSellerId(null);
    }
  }, [pendingGroups, payingSellerId]);

  const panel =
    open && portalReady
      ? createPortal(
          <div
            className="gio-chung-overlay"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <aside
              className={`gio-chung-panel${isSplitLayout ? " is-split" : ""}`}
              role="dialog"
              aria-modal="true"
              aria-label="Giỏ chờ mua"
            >
              <header className="gio-chung-hdr">
                <div>
                  <p className="gio-chung-kicker">Giỏ chờ mua</p>
                  <h2>Hàng của bạn</h2>
                </div>
                <div className="gio-chung-hdr-actions">
                  <button
                    type="button"
                    className="gio-chung-history-btn"
                    aria-label="Lịch sử mua hàng"
                    title="Lịch sử mua hàng"
                    onClick={() => setHistoryOpen(true)}
                  >
                    <History size={17} strokeWidth={2} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="gio-chung-close"
                    aria-label="Đóng"
                    onClick={() => setOpen(false)}
                  >
                    <X size={18} strokeWidth={2} aria-hidden />
                  </button>
                </div>
              </header>

              {err ? (
                <p className="gio-chung-err" role="alert">
                  {err}
                </p>
              ) : null}

              <div
                className={`gio-chung-body${isSplitLayout ? " is-split" : ""}`}
              >
                {loading && groups.length === 0 && sentDons.length === 0 ? (
                  <p className="gio-chung-muted">
                    <Loader2 size={16} className="gio-chung-spin" aria-hidden />{" "}
                    Đang tải…
                  </p>
                ) : pendingGroups.length === 0 && sentDons.length === 0 ? (
                  <div className="gio-chung-empty">
                    <ShoppingBag size={26} strokeWidth={2} aria-hidden />
                    <p>Giỏ chờ mua còn trống</p>
                    <span>Thêm hàng từ các cửa hàng để gom vào đây.</span>
                  </div>
                ) : isSplitLayout ? (
                  <>
                    <div className="gio-chung-col gio-chung-col--cart">
                      {sentDons.map((don) => (
                        <SentCard key={don.id} don={don} />
                      ))}
                      {pendingGroups.map((group) => (
                        <ShopGioChungGroup
                          key={group.idNguoiBan}
                          group={group}
                          onQty={patchQty}
                          onSent={onSent}
                          checkoutOpen={payingSellerId === group.idNguoiBan}
                          onCheckoutOpenChange={(openPay) =>
                            setPayingSellerId(
                              openPay ? group.idNguoiBan : null,
                            )
                          }
                          payMount={payMount}
                        />
                      ))}
                    </div>
                    <div
                      className="gio-chung-col gio-chung-col--pay"
                      ref={setPayMount}
                    >
                      {!payingSellerId ? (
                        <div className="gio-chung-pay-empty">
                          <p>Thông tin thanh toán</p>
                          <span>
                            Chọn cửa hàng bên trái rồi bấm Thanh toán.
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  sentDons.map((don) => <SentCard key={don.id} don={don} />)
                )}
              </div>
            </aside>
          </div>,
          document.body,
        )
      : null;

  /* Giỏ trống + panel đóng → ẩn hẳn nút khỏi topbar. */
  const showTrigger = count > 0 || open;

  const toast =
    addedToast && portalReady
      ? createPortal(
          <button
            type="button"
            className="gio-chung-toast"
            role="status"
            aria-live="polite"
            onClick={() => {
              setAddedToast(false);
              if (addedToastTimerRef.current) {
                clearTimeout(addedToastTimerRef.current);
                addedToastTimerRef.current = null;
              }
              setOpen(true);
            }}
          >
            <ShoppingBag size={16} strokeWidth={2.2} aria-hidden />
            <span>{GIO_ADDED_TOAST_TEXT}</span>
          </button>,
          document.body,
        )
      : null;

  return (
    <>
      {showTrigger ? (
        <div className="gio-chung">
          <button
            type="button"
            className={`gio-chung-trigger${count > 0 ? " has-items" : ""}${open ? " is-open" : ""}`}
            aria-label={
              count > 0 ? `Giỏ chờ mua, ${count} món` : "Giỏ chờ mua"
            }
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((v) => !v)}
          >
            <ShoppingBag size={18} strokeWidth={2} aria-hidden />
            {count > 0 ? (
              <span className="gio-chung-count" aria-hidden>
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}
      {panel}
      {toast}
      <ShopMuaHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}

/* ── Card đơn đã gửi (xanh) ────────────────────────────────────── */
function SentCard({ don }: { don: ShopDonHang }) {
  const snap = don.thanhToanSnapshot;
  const maCk = snap?.noiDungCk?.trim() || don.maDon?.trim() || null;
  const qrUrl =
    snap?.qrAnhUrl ??
    (snap
      ? buildVietQrImageUrl({
          nganHang: snap.nganHang,
          soTaiKhoan: snap.soTaiKhoan,
          amountVnd: snap.tongTien,
          addInfo: maCk,
        })
      : null);
  return (
    <section className="gio-chung-group is-sent">
      <div className="gio-chung-group-hdr">
        <span className="gio-chung-shop">
          <Check size={15} strokeWidth={2.6} aria-hidden />
          {don.banTen ?? "Cửa hàng"}
        </span>
        <span className="gio-chung-sent-badge">Đã gửi đơn</span>
      </div>
      <p className="gio-chung-sent-ma">
        Mã đơn <strong>{don.maDon ?? don.id.slice(0, 8)}</strong> ·{" "}
        {money(
          (don.thanhToanSnapshot?.tongTien ??
            don.tongTien),
          don.tienTe,
        )}
      </p>
      {snap ? (
        <div className="gio-chung-pay">
          <div className="gio-chung-pay-info">
            <p>
              <strong>{snap.nganHang}</strong>
            </p>
            <p>
              STK: <strong>{snap.soTaiKhoan}</strong>
            </p>
            <p>Chủ TK: {snap.tenChuTaiKhoan}</p>
            <p>
              Số tiền:{" "}
              <strong>{money(snap.tongTien, snap.tienTe)}</strong>
            </p>
            {maCk ? (
              <p>
                Nội dung CK: <strong>{maCk}</strong>
              </p>
            ) : null}
          </div>
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt="QR chuyển khoản" className="gio-chung-qr" />
          ) : null}
        </div>
      ) : null}
      {don.bienLaiAnhUrl ? (
        <div className="gio-chung-sent-bill">
          <span className="gio-chung-sent-bill-label">Biên lai đã gửi</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={don.bienLaiAnhUrl} alt="Biên lai chuyển khoản" />
        </div>
      ) : null}
      <p className="gio-chung-sent-note">
        Chuyển khoản trực tiếp cho người bán — CINs không trung gian tiền.
      </p>
    </section>
  );
}

/* ── Một nhóm cửa hàng ─────────────────────────────────────────── */
type GroupProps = {
  group: ShopGioChungNhom;
  onQty: (idBienThe: string, soLuong: number) => void;
  onSent: (don: ShopDonHang) => void;
  checkoutOpen: boolean;
  onCheckoutOpenChange: (open: boolean) => void;
  /** Cột phải — form thanh toán portal vào đây. */
  payMount: HTMLElement | null;
};

function ShopGioChungGroup({
  group,
  onQty,
  onSent,
  checkoutOpen,
  onCheckoutOpenChange,
  payMount,
}: GroupProps) {
  const [accepted, setAccepted] = useState(false);
  const [ghiChu, setGhiChu] = useState("");
  const [hinhThucGiao, setHinhThucGiao] =
    useState<ShopHinhThucGiao>("truc_tiep");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pay, setPay] = useState<{
    nganHang: string;
    soTaiKhoan: string;
    tenChuTaiKhoan: string;
    chinhSach: string | null;
  } | null>(null);
  /** Mã đơn gắn vào QR (addInfo) — gửi lại khi tạo đơn để khớp nội dung CK. */
  const [maDon, setMaDon] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payErr, setPayErr] = useState<string | null>(null);
  const payFetched = useRef(false);

  /* Sổ địa chỉ nhận hàng — chọn 1 hồ sơ (bắt buộc) để gửi đơn. */
  const [dcList, setDcList] = useState<DiaChiNhanItem[]>(
    () => peekDiaChiNhan() ?? [],
  );
  const [dcSelectedId, setDcSelectedId] = useState<string | null>(() => {
    const items = peekDiaChiNhan() ?? [];
    return (items.find((x) => x.laMacDinh) ?? items[0])?.id ?? null;
  });
  const [dcLoading, setDcLoading] = useState(false);

  /* Form thêm / sửa hồ sơ nhận hàng. */
  const [dcFormOpen, setDcFormOpen] = useState(false);
  const [dcEditId, setDcEditId] = useState<string | null>(null);
  const [fNhan, setFNhan] = useState("");
  const [fHoTen, setFHoTen] = useState("");
  const [fSdt, setFSdt] = useState("");
  const [fTinh, setFTinh] = useState("");
  const [fPhuongXa, setFPhuongXa] = useState("");
  const [fDiaChi, setFDiaChi] = useState("");
  const [dcSaving, setDcSaving] = useState(false);
  const [dcErr, setDcErr] = useState<string | null>(null);

  /* Phường/xã theo tỉnh đang chọn (nạp động từ dataset 2025). */
  const [pxOptions, setPxOptions] = useState<PhuongXaOption[]>([]);
  const [pxLoading, setPxLoading] = useState(false);

  const applyDiaChiList = useCallback(
    (items: DiaChiNhanItem[], selectId?: string) => {
      setDcList(items);
      setDcSelectedId((prev) => {
        if (selectId && items.some((x) => x.id === selectId)) return selectId;
        if (prev && items.some((x) => x.id === prev)) return prev;
        return (items.find((x) => x.laMacDinh) ?? items[0])?.id ?? null;
      });
      if (items.length === 0) setDcFormOpen(true);
    },
    [],
  );

  const loadDiaChi = useCallback(async () => {
    const cached = peekDiaChiNhan();
    if (cached) {
      applyDiaChiList(cached);
      return;
    }
    setDcLoading(true);
    try {
      const items = await fetchDiaChiNhanCached();
      applyDiaChiList(items);
    } catch {
      /* Lỗi tải không chặn — người mua có thể thêm mới. */
    } finally {
      setDcLoading(false);
    }
  }, [applyDiaChiList]);

  const refetchDiaChi = useCallback(
    async (selectId?: string) => {
      try {
        const items = await fetchDiaChiNhanCached({ force: true });
        applyDiaChiList(items, selectId);
      } catch {
        /* bỏ qua */
      }
    },
    [applyDiaChiList],
  );

  const resetForm = useCallback(() => {
    setDcEditId(null);
    setFNhan("");
    setFHoTen("");
    setFSdt("");
    setFTinh("");
    setFPhuongXa("");
    setFDiaChi("");
    setDcErr(null);
  }, []);

  /* Nạp phường/xã khi đổi tỉnh (chỉ khi form đang mở). */
  useEffect(() => {
    if (!dcFormOpen) return;
    const tinh = fTinh.trim();
    if (!tinh) {
      setPxOptions([]);
      return;
    }
    let alive = true;
    setPxLoading(true);
    fetch(`/api/vn/phuong-xa?tinh=${encodeURIComponent(tinh)}`, {
      cache: "force-cache",
    })
      .then((r) => r.json())
      .then((j: { items?: PhuongXaOption[] }) => {
        if (!alive) return;
        const items = j.items ?? [];
        setPxOptions(items);
        setFPhuongXa((prev) =>
          items.some((w) => w.name === prev) ? prev : "",
        );
      })
      .catch(() => {
        if (alive) setPxOptions([]);
      })
      .finally(() => {
        if (alive) setPxLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [fTinh, dcFormOpen]);

  const openAddForm = useCallback(() => {
    resetForm();
    setDcFormOpen(true);
  }, [resetForm]);

  const openEditForm = useCallback((dc: DiaChiNhanItem) => {
    setDcEditId(dc.id);
    setFNhan(dc.nhan ?? "");
    setFHoTen(dc.hoTen);
    setFSdt(dc.soDienThoai);
    setFTinh(dc.tinhThanh);
    setFPhuongXa(dc.phuongXa);
    setFDiaChi(dc.diaChi);
    setDcErr(null);
    setDcFormOpen(true);
  }, []);

  const formValid =
    fHoTen.trim().length >= 2 &&
    SDT_RE.test(fSdt.trim()) &&
    fDiaChi.trim().length >= 4 &&
    fTinh.trim().length > 0 &&
    fPhuongXa.trim().length > 0 &&
    pxOptions.some((w) => w.name === fPhuongXa);

  const saveDiaChi = useCallback(async () => {
    if (!formValid || dcSaving) return;
    setDcSaving(true);
    setDcErr(null);
    try {
      const payload = {
        nhan: fNhan.trim() || null,
        hoTen: fHoTen.trim(),
        soDienThoai: fSdt.trim(),
        diaChi: fDiaChi.trim(),
        phuongXa: fPhuongXa.trim(),
        tinhThanh: fTinh.trim(),
      };
      const res = await fetch(
        dcEditId
          ? `/api/shop/dia-chi-nhan/${dcEditId}`
          : "/api/shop/dia-chi-nhan",
        {
          method: dcEditId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        item?: DiaChiNhanItem;
        error?: string;
      } | null;
      if (!res.ok || !json?.item) {
        setDcErr(json?.error ?? "Không lưu được hồ sơ.");
        return;
      }
      await refetchDiaChi(json.item.id);
      setDcFormOpen(false);
      resetForm();
    } catch {
      setDcErr("Không lưu được hồ sơ.");
    } finally {
      setDcSaving(false);
    }
  }, [
    formValid,
    dcSaving,
    dcEditId,
    fNhan,
    fHoTen,
    fSdt,
    fDiaChi,
    fTinh,
    fPhuongXa,
    refetchDiaChi,
    resetForm,
  ]);

  const deleteDiaChi = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/shop/dia-chi-nhan/${id}`, {
          method: "DELETE",
        });
        if (res.ok) await refetchDiaChi();
      } catch {
        /* bỏ qua */
      }
    },
    [refetchDiaChi],
  );

  const nguoiNhanOk = dcSelectedId != null;

  const [billUrl, setBillUrl] = useState<string | null>(null);
  const [billId, setBillId] = useState<string | null>(null);
  const [billUploading, setBillUploading] = useState(false);
  const [billErr, setBillErr] = useState<string | null>(null);
  const billFileRef = useRef<HTMLInputElement>(null);
  const billLocalUrlRef = useRef<string | null>(null);

  const clearBillLocalUrl = useCallback(() => {
    if (billLocalUrlRef.current) {
      URL.revokeObjectURL(billLocalUrlRef.current);
      billLocalUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => clearBillLocalUrl(), [clearBillLocalUrl]);

  const uploadBill = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!isAllowedUploadImageFile(file)) {
        setBillErr("Chỉ chấp nhận JPEG, PNG, WebP hoặc GIF.");
        return;
      }
      if (file.size > MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES) {
        setBillErr(cloudflareImageTooLargeError());
        return;
      }
      clearBillLocalUrl();
      const localUrl = URL.createObjectURL(file);
      billLocalUrlRef.current = localUrl;
      setBillUrl(localUrl);
      setBillId(null);
      setBillUploading(true);
      setBillErr(null);
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 45_000);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/post-image/upload", {
          method: "POST",
          body: fd,
          signal: ctrl.signal,
        });
        const json = (await res.json().catch(() => null)) as {
          url?: string;
          imageId?: string;
          error?: string;
        } | null;
        if (!res.ok || !json?.url) {
          clearBillLocalUrl();
          setBillUrl(null);
          setBillId(null);
          setBillErr(json?.error ?? "Tải ảnh thất bại. Thử lại.");
          return;
        }
        clearBillLocalUrl();
        setBillUrl(json.url);
        setBillId(json.imageId?.trim() || null);
      } catch {
        clearBillLocalUrl();
        setBillUrl(null);
        setBillId(null);
        setBillErr("Tải ảnh thất bại. Thử lại.");
      } finally {
        window.clearTimeout(timer);
        setBillUploading(false);
      }
    },
    [clearBillLocalUrl],
  );

  const removeBill = useCallback(() => {
    clearBillLocalUrl();
    setBillUrl(null);
    setBillId(null);
    setBillErr(null);
  }, [clearBillLocalUrl]);

  /** Biên lai đã upload xong (không phải blob tạm). */
  const billOk =
    Boolean(billUrl) && !billUploading && !billUrl?.startsWith("blob:");

  const loadPay = useCallback(async () => {
    if (payFetched.current) return;
    payFetched.current = true;
    setPayLoading(true);
    setPayErr(null);
    try {
      const res = await fetch(
        `/api/shop/cua-hang/thanh-toan?sellerId=${encodeURIComponent(group.idNguoiBan)}`,
        { cache: "no-store" },
      );
      const json = (await res.json().catch(() => null)) as {
        payment?: {
          nganHang?: string;
          soTaiKhoan?: string;
          tenChuTaiKhoan?: string;
        } | null;
        shop?: { chinhSach?: string | null } | null;
        maDon?: string | null;
        error?: string;
      } | null;
      if (!res.ok || !json?.payment) {
        setPayErr(json?.error ?? "Người bán chưa thêm tài khoản nhận tiền.");
        return;
      }
      setPay({
        nganHang: json.payment.nganHang ?? "",
        soTaiKhoan: json.payment.soTaiKhoan ?? "",
        tenChuTaiKhoan: json.payment.tenChuTaiKhoan ?? "",
        chinhSach: json.shop?.chinhSach ?? null,
      });
      const suggested = json.maDon?.trim() || null;
      if (suggested) setMaDon(suggested);
    } catch {
      setPayErr("Không tải được thông tin nhận tiền.");
    } finally {
      setPayLoading(false);
    }
  }, [group.idNguoiBan]);

  useEffect(() => {
    if (!checkoutOpen) return;
    void loadPay();
    void loadDiaChi();
  }, [checkoutOpen, loadPay, loadDiaChi]);

  const tongCk = group.tongTien;

  const submit = useCallback(async () => {
    setSending(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/gio-chung/don", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: group.idNguoiBan,
          ghiChu: ghiChu.trim() || null,
          maDon,
          nguoiMuaChapNhanRuiRo: true,
          bienLaiAnhUrl: billUrl,
          bienLaiAnhId: billId,
          diaChiNhanId: dcSelectedId,
          hinhThucGiao,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        don?: ShopDonHang;
        error?: string;
      } | null;
      if (!res.ok || !json?.don) {
        setErr(json?.error ?? "Không gửi được đơn.");
        return;
      }
      onSent(json.don);
    } catch {
      setErr("Không gửi được đơn.");
    } finally {
      setSending(false);
    }
  }, [
    group.idNguoiBan,
    ghiChu,
    maDon,
    billUrl,
    billId,
    onSent,
    dcSelectedId,
    hinhThucGiao,
  ]);

  const qrUrl = pay
    ? buildVietQrImageUrl({
        nganHang: pay.nganHang,
        soTaiKhoan: pay.soTaiKhoan,
        amountVnd: tongCk,
        addInfo: maDon,
      })
    : null;

  const canSend =
    !sending &&
    accepted &&
    billOk &&
    nguoiNhanOk &&
    !group.coVanDe &&
    group.coThanhToan &&
    Boolean(pay);

  const checkoutPanel = checkoutOpen ? (
        <div className="gio-chung-checkout">
          <div className="gio-chung-checkout-shop">
            <span className="gio-chung-checkout-shop-label">Thanh toán</span>
            <strong>{group.tenCuaHang}</strong>
            <span className="gio-chung-checkout-shop-total">
              {money(group.tongTien, group.tienTe)}
            </span>
          </div>
          <div className="gio-chung-nhan">
            <div className="gio-chung-nhan-hdr">
              <h4 className="gio-chung-checkout-title">Thông tin nhận hàng</h4>
              {dcList.length > 0 && !dcFormOpen ? (
                <button
                  type="button"
                  className="gio-chung-nhan-add"
                  onClick={openAddForm}
                >
                  <Plus size={13} strokeWidth={2.4} aria-hidden /> Thêm địa chỉ
                </button>
              ) : null}
            </div>

            {dcLoading ? (
              <p className="gio-chung-muted">
                <Loader2 size={14} className="gio-chung-spin" aria-hidden /> Đang
                tải địa chỉ…
              </p>
            ) : null}

            {!dcFormOpen && dcList.length > 0 ? (
              <ul className="gio-chung-nhan-list">
                {dcList.map((dc) => {
                  const tinhLabel = labelTinhThanh(dc.tinhThanh);
                  return (
                    <li key={dc.id}>
                      <label
                        className={`gio-chung-nhan-card${dcSelectedId === dc.id ? " is-active" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`dc-${group.idNguoiBan}`}
                          checked={dcSelectedId === dc.id}
                          onChange={() => setDcSelectedId(dc.id)}
                        />
                        <span className="gio-chung-nhan-card-body">
                          <span className="gio-chung-nhan-card-top">
                            <strong>{dc.hoTen}</strong>
                            <span className="gio-chung-nhan-phone">
                              {dc.soDienThoai}
                            </span>
                            {dc.laMacDinh ? (
                              <span className="gio-chung-nhan-badge">
                                Mặc định
                              </span>
                            ) : null}
                            {dc.nhan ? (
                              <span className="gio-chung-nhan-tag">
                                {dc.nhan}
                              </span>
                            ) : null}
                          </span>
                          <span className="gio-chung-nhan-addr">
                            {[dc.diaChi, dc.phuongXa, tinhLabel]
                              .filter((s) => s && s.trim())
                              .join(", ")}
                          </span>
                        </span>
                        <span className="gio-chung-nhan-card-actions">
                          <button
                            type="button"
                            aria-label="Sửa địa chỉ"
                            title="Sửa"
                            onClick={(e) => {
                              e.preventDefault();
                              openEditForm(dc);
                            }}
                          >
                            <Pencil size={14} strokeWidth={2.2} aria-hidden />
                          </button>
                          {dcList.length > 1 ? (
                            <button
                              type="button"
                              className="is-danger"
                              aria-label="Xóa địa chỉ"
                              title="Xóa"
                              onClick={(e) => {
                                e.preventDefault();
                                void deleteDiaChi(dc.id);
                              }}
                            >
                              <Trash2 size={14} strokeWidth={2.2} aria-hidden />
                            </button>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {dcFormOpen ? (
              <div className="gio-chung-nhan-form">
                <div className="gio-chung-nhan-grid">
                  <label className="gio-chung-nhan-field">
                    <span>
                      Họ tên người nhận <b aria-hidden>*</b>
                    </span>
                    <input
                      type="text"
                      value={fHoTen}
                      onChange={(e) => setFHoTen(e.target.value)}
                      maxLength={80}
                      placeholder="Nguyễn Văn A"
                      autoComplete="name"
                    />
                  </label>
                  <label className="gio-chung-nhan-field">
                    <span>
                      Số điện thoại <b aria-hidden>*</b>
                    </span>
                    <input
                      type="tel"
                      value={fSdt}
                      onChange={(e) => setFSdt(e.target.value)}
                      maxLength={20}
                      placeholder="0912 345 678"
                      autoComplete="tel"
                    />
                  </label>
                  <label className="gio-chung-nhan-field">
                    <span>
                      Tỉnh / Thành phố <b aria-hidden>*</b>
                    </span>
                    <select
                      value={fTinh}
                      onChange={(e) => setFTinh(e.target.value)}
                    >
                      <option value="">— Chọn tỉnh / thành —</option>
                      {TINH_THANH_SELECT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="gio-chung-nhan-field">
                    <span>
                      Phường / Xã <b aria-hidden>*</b>
                    </span>
                    <select
                      value={fPhuongXa}
                      onChange={(e) => setFPhuongXa(e.target.value)}
                      disabled={!fTinh || pxLoading}
                    >
                      <option value="">
                        {!fTinh
                          ? "— Chọn tỉnh trước —"
                          : pxLoading
                            ? "Đang tải…"
                            : "— Chọn phường / xã —"}
                      </option>
                      {pxOptions.map((w) => (
                        <option key={w.code} value={w.name}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="gio-chung-nhan-field gio-chung-nhan-field--full">
                    <span>
                      Địa chỉ chi tiết <b aria-hidden>*</b>
                    </span>
                    <textarea
                      rows={2}
                      value={fDiaChi}
                      onChange={(e) => setFDiaChi(e.target.value)}
                      maxLength={280}
                      placeholder="Số nhà, tên đường, tòa nhà…"
                    />
                  </label>
                  <label className="gio-chung-nhan-field gio-chung-nhan-field--full">
                    <span>Nhãn (tùy chọn)</span>
                    <input
                      type="text"
                      value={fNhan}
                      onChange={(e) => setFNhan(e.target.value)}
                      maxLength={40}
                      placeholder="Vd: Nhà riêng, Công ty…"
                    />
                  </label>
                </div>
                {dcErr ? (
                  <p className="gio-chung-err" role="alert">
                    {dcErr}
                  </p>
                ) : null}
                <div className="gio-chung-nhan-form-actions">
                  <button
                    type="button"
                    className="gio-chung-nhan-save"
                    disabled={!formValid || dcSaving}
                    onClick={() => void saveDiaChi()}
                  >
                    {dcSaving ? (
                      <Loader2
                        size={14}
                        className="gio-chung-spin"
                        aria-hidden
                      />
                    ) : dcEditId ? (
                      "Lưu thay đổi"
                    ) : (
                      "Lưu địa chỉ"
                    )}
                  </button>
                  {dcList.length > 0 ? (
                    <button
                      type="button"
                      className="gio-chung-nhan-cancel"
                      disabled={dcSaving}
                      onClick={() => {
                        setDcFormOpen(false);
                        resetForm();
                      }}
                    >
                      Hủy
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <p className="gio-chung-nhan-note">
              Địa chỉ được lưu vào sổ để dùng lại (riêng tư — chỉ người bán thấy
              khi bạn đặt đơn).
            </p>
          </div>

          <div className="gio-chung-hinh-thuc">
            <h4 className="gio-chung-checkout-title">Hình thức nhận</h4>
            <div
              className="gio-chung-hinh-thuc-opts"
              role="radiogroup"
              aria-label="Hình thức nhận"
            >
              <label
                className={`gio-chung-hinh-thuc-opt${hinhThucGiao === "truc_tiep" ? " is-active" : ""}`}
              >
                <input
                  type="radio"
                  name={`hinh-thuc-${group.idNguoiBan}`}
                  checked={hinhThucGiao === "truc_tiep"}
                  onChange={() => setHinhThucGiao("truc_tiep")}
                />
                <span>Gặp trực tiếp</span>
              </label>
              <label
                className={`gio-chung-hinh-thuc-opt${hinhThucGiao === "online" ? " is-active" : ""}`}
              >
                <input
                  type="radio"
                  name={`hinh-thuc-${group.idNguoiBan}`}
                  checked={hinhThucGiao === "online"}
                  onChange={() => setHinhThucGiao("online")}
                />
                <span>Qua đơn vị vận chuyển</span>
              </label>
            </div>
            {hinhThucGiao === "online" ? (
              <p className="gio-chung-hinh-thuc-hint">
                Người mua tự trả phí ship. Shop tạo vận đơn trên web ĐVVC (CINs
                không liên kết carrier).
              </p>
            ) : null}
          </div>

          <h4 className="gio-chung-checkout-title">Chuyển khoản tới</h4>
          {payLoading ? (
            <p className="gio-chung-muted">
              <Loader2 size={14} className="gio-chung-spin" aria-hidden /> Đang
              tải thông tin nhận tiền…
            </p>
          ) : pay ? (
            <div className="gio-chung-pay">
              <div className="gio-chung-pay-info">
                <p>
                  <strong>{pay.nganHang}</strong>
                </p>
                <p>
                  STK: <strong>{pay.soTaiKhoan}</strong>
                </p>
                <p>Chủ TK: {pay.tenChuTaiKhoan}</p>
                <p>
                  Tiền hàng:{" "}
                  <strong>{money(group.tongTien, group.tienTe)}</strong>
                </p>
                <p>
                  Số tiền CK:{" "}
                  <strong>{money(tongCk, group.tienTe)}</strong>
                </p>
                {maDon ? (
                  <p>
                    Nội dung CK: <strong>{maDon}</strong>
                  </p>
                ) : null}
                {pay.chinhSach ? (
                  <p className="gio-chung-pay-policy">{pay.chinhSach}</p>
                ) : null}
              </div>
              {qrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrUrl}
                  alt="QR chuyển khoản"
                  className="gio-chung-qr"
                />
              ) : null}
            </div>
          ) : (
            <p className="gio-chung-err" role="alert">
              {payErr ?? "Người bán chưa thêm tài khoản nhận tiền."}
            </p>
          )}

          <div className="gio-chung-bill">
            <span className="gio-chung-bill-label">
              Ảnh biên lai chuyển khoản <b aria-hidden>*</b>
            </span>
            <input
              ref={billFileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void uploadBill(e.target.files?.[0] ?? null);
                if (billFileRef.current) billFileRef.current.value = "";
              }}
            />
            {billUrl ? (
              <div className="gio-chung-bill-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={billUrl} alt="Biên lai chuyển khoản" />
                {billUploading ? (
                  <span className="gio-chung-bill-busy">
                    <Loader2
                      size={16}
                      className="gio-chung-spin"
                      aria-hidden
                    />
                    Đang tải…
                  </span>
                ) : null}
                <button
                  type="button"
                  className="gio-chung-bill-remove"
                  aria-label="Gỡ ảnh biên lai"
                  disabled={billUploading}
                  onClick={removeBill}
                >
                  <X size={14} strokeWidth={2.2} aria-hidden />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="gio-chung-bill-btn"
                disabled={billUploading}
                onClick={() => billFileRef.current?.click()}
              >
                <Upload size={15} strokeWidth={2} aria-hidden />
                Đính kèm biên lai
              </button>
            )}
            {billErr ? (
              <p className="gio-chung-err" role="alert">
                {billErr}
              </p>
            ) : null}
          </div>

          <label className="gio-chung-note">
            <span>Ghi chú cho người bán</span>
            <textarea
              rows={2}
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
            />
          </label>

          <label className="gio-chung-accept">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>{SHOP_BUYER_TRANSFER_DISCLAIMER}</span>
          </label>

          {err ? (
            <p className="gio-chung-err" role="alert">
              {err}
            </p>
          ) : null}

          {pay && !canSend && !sending ? (
            <p className="gio-chung-send-hint">
              {!nguoiNhanOk
                ? "Nhập đủ họ tên, SĐT, tỉnh/thành và địa chỉ nhận hàng."
                : !billOk
                  ? "Đính kèm ảnh biên lai chuyển khoản để gửi đơn."
                  : !accepted
                    ? "Tích xác nhận để gửi đơn."
                    : null}
            </p>
          ) : null}

          <div className="gio-chung-checkout-actions">
            <button
              type="button"
              className="gio-chung-submit"
              disabled={!canSend}
              onClick={() => void submit()}
            >
              {sending ? (
                <Loader2 size={15} className="gio-chung-spin" aria-hidden />
              ) : (
                "Gửi đơn cho người bán"
              )}
            </button>
            <button
              type="button"
              className="gio-chung-cancel"
              disabled={sending}
              onClick={() => onCheckoutOpenChange(false)}
            >
              Quay lại
            </button>
          </div>
        </div>
  ) : null;

  return (
    <>
      <section
        className={`gio-chung-group${checkoutOpen ? " is-paying" : ""}`}
      >
        <div className="gio-chung-group-hdr">
          <span className="gio-chung-shop">
            {group.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={group.avatarUrl}
                alt=""
                className="gio-chung-shop-avatar"
              />
            ) : (
              <Store size={15} strokeWidth={1.9} aria-hidden />
            )}
            {group.sellerSlug ? (
              <Link
                href={shopPublicHref(
                  group.sellerSlug,
                  shopSlugFromTen(group.tenCuaHang, group.sellerSlug),
                )}
                className="gio-chung-shop-link"
              >
                {group.tenCuaHang}
              </Link>
            ) : (
              group.tenCuaHang
            )}
          </span>
          <strong className="gio-chung-group-total">
            {money(group.tongTien, group.tienTe)}
          </strong>
        </div>

        <ul className="gio-chung-lines">
          {group.dong.map((d) => {
            const canInc = d.soLuong < d.soLuongTon && !d.ngungBan;
            return (
              <li
                key={d.idBienThe}
                className={`gio-chung-line${d.ngungBan ? " is-off" : ""}`}
              >
                <span className="gio-chung-thumb" aria-hidden>
                  {d.anhUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.anhUrl} alt="" loading="lazy" />
                  ) : (
                    <Package size={16} strokeWidth={1.7} />
                  )}
                </span>
                <span className="gio-chung-line-body">
                  <span className="gio-chung-line-name">
                    {d.tenSanPham}
                    {d.nhanBienThe !== "Mặc định" ? (
                      <span className="gio-chung-line-var">
                        {" "}
                        · {d.nhanBienThe}
                      </span>
                    ) : null}
                  </span>
                  {d.ngungBan ? (
                    <span className="gio-chung-line-warn">Đã ngừng bán</span>
                  ) : d.soLuong > d.soLuongTon ? (
                    <span className="gio-chung-line-warn">
                      Chỉ còn {d.soLuongTon}
                    </span>
                  ) : (
                    <span className="gio-chung-line-price">
                      {money(d.giaHienThi, d.tienTe)}
                    </span>
                  )}
                </span>
                <div className="gio-chung-qty">
                  <button
                    type="button"
                    aria-label="Bớt"
                    onClick={() => onQty(d.idBienThe, d.soLuong - 1)}
                  >
                    {d.soLuong <= 1 ? (
                      <Trash2 size={13} strokeWidth={2} />
                    ) : (
                      <Minus size={13} strokeWidth={2} />
                    )}
                  </button>
                  <span>{d.soLuong}</span>
                  <button
                    type="button"
                    aria-label="Thêm"
                    disabled={!canInc}
                    onClick={() => onQty(d.idBienThe, d.soLuong + 1)}
                  >
                    <Plus size={13} strokeWidth={2} />
                  </button>
                </div>
                <button
                  type="button"
                  className="gio-chung-line-remove"
                  aria-label={`Xóa ${d.tenSanPham} khỏi giỏ`}
                  title="Xóa khỏi giỏ"
                  onClick={() => onQty(d.idBienThe, 0)}
                >
                  <X size={14} strokeWidth={2.2} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>

        {group.coVanDe ? (
          <p className="gio-chung-group-warn" role="alert">
            <TriangleAlert size={14} strokeWidth={2.2} aria-hidden />
            Có món hết hàng / ngừng bán — hãy gỡ trước khi gửi đơn.
          </p>
        ) : !group.coThanhToan ? (
          <p className="gio-chung-group-warn" role="alert">
            <TriangleAlert size={14} strokeWidth={2.2} aria-hidden />
            Người bán chưa mở nhận tiền — chưa gửi đơn được.
          </p>
        ) : null}

        <button
          type="button"
          className={`gio-chung-pay-btn${checkoutOpen ? " is-active" : ""}`}
          disabled={group.coVanDe || !group.coThanhToan}
          onClick={() => onCheckoutOpenChange(!checkoutOpen)}
        >
          {checkoutOpen
            ? "Đang thanh toán"
            : `Thanh toán · ${money(group.tongTien, group.tienTe)}`}
        </button>
      </section>
      {checkoutPanel && payMount
        ? createPortal(checkoutPanel, payMount)
        : null}
    </>
  );
}
