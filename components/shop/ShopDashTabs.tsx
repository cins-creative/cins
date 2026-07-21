"use client";

import { ArrowLeft, CalendarClock, ClipboardList, Package, Store, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  fetchBanHangClientStatus,
  fetchShopCuaHangClient,
  invalidateBanHangClientCache,
  invalidateShopClientCaches,
  peekBanHangClientStatus,
  prefetchBanHangClientStatus,
  writeShopCuaHangCache,
} from "@/lib/shop/client-fetch-cache";
import { shopPublicHref } from "@/lib/shop/cua-hang-href";
import {
  datetimeLocalValueToIso,
  isoToDatetimeLocalValue,
  normalizeShopTamDongLyDo,
  SHOP_TAM_DONG_LY_DO_MAX,
} from "@/lib/shop/tam-dong";
import type { ShopCuaHang } from "@/lib/shop/types";

type ShopDashTab = "kho" | "don" | "cua-hang";

const TAB_COPY: Record<
  ShopDashTab,
  { href: string; label: string; shortLabel: string }
> = {
  kho: {
    href: "/ban-hang/kho",
    label: "Kho hàng",
    shortLabel: "Kho",
  },
  don: {
    href: "/ban-hang/don",
    label: "Đơn hàng",
    shortLabel: "Đơn",
  },
  "cua-hang": {
    href: "/ban-hang/cua-hang",
    label: "Quản lý cửa hàng",
    shortLabel: "Cửa hàng",
  },
};

const SHOP_VISIBLE_HINT =
  "Hiện tab Shop và sản phẩm trên Journey. Tắt để chuẩn bị kho mà người khác chưa thấy.";

const SHOP_TAM_DONG_HINT =
  "Tạm khóa catalog công khai trong khoảng thời gian nghỉ. Mặc định tắt.";

function TabLink({
  href,
  label,
  shortLabel,
  active,
  icon,
}: {
  href: string;
  label: string;
  shortLabel: string;
  active: boolean;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`shop-dash-tab${active ? " is-active" : ""}`}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onMouseEnter={prefetchBanHangClientStatus}
      onFocus={prefetchBanHangClientStatus}
    >
      {icon}
      <span className="shop-dash-tab-text">
        <span className="shop-dash-tab-text-full">{label}</span>
        <span className="shop-dash-tab-text-short" aria-hidden>
          {shortLabel}
        </span>
      </span>
    </Link>
  );
}

function ShopVisibleToggle() {
  const router = useRouter();
  const cached = peekBanHangClientStatus();
  const [shopVisible, setShopVisible] = useState(
    () => cached?.shopVisible === true,
  );
  const [ready, setReady] = useState(() => cached != null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchBanHangClientStatus();
        if (cancelled) return;
        setShopVisible(data.shopVisible);
        setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ shopVisible?: boolean }>).detail;
      if (typeof detail?.shopVisible === "boolean") {
        setShopVisible(detail.shopVisible);
      } else {
        invalidateBanHangClientCache();
        void fetchBanHangClientStatus({ force: true })
          .then((data) => setShopVisible(data.shopVisible))
          .catch(() => undefined);
      }
    };
    window.addEventListener("cins:ban-hang-changed", onChanged);
    return () =>
      window.removeEventListener("cins:ban-hang-changed", onChanged);
  }, []);

  async function saveShopVisible(nextVisible: boolean) {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/user/ban-hang", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopVisible: nextVisible }),
      });
      const json = (await res.json().catch(() => null)) as {
        enabled?: boolean;
        shopVisible?: boolean;
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không lưu được.");
        return;
      }
      const next =
        json?.enabled === true && json?.shopVisible === true;
      setShopVisible(next);
      invalidateBanHangClientCache();
      window.dispatchEvent(
        new CustomEvent("cins:ban-hang-changed", {
          detail: {
            enabled: json?.enabled === true,
            shopVisible: next,
          },
        }),
      );
      router.refresh();
    } catch {
      setErr("Không lưu được.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <div className="shop-dash-visible is-pending" aria-hidden>
        <span className="shop-dash-visible-label">Hiển thị shop</span>
        <span className="shop-dash-switch" />
      </div>
    );
  }

  return (
    <div
      className="shop-dash-visible"
      title={err ?? SHOP_VISIBLE_HINT}
    >
      <span className="shop-dash-visible-label">Hiển thị shop</span>
      <button
        type="button"
        className={`shop-dash-switch${shopVisible ? " on" : ""}`}
        role="switch"
        aria-checked={shopVisible}
        aria-label="Hiển thị shop"
        title={err ?? SHOP_VISIBLE_HINT}
        disabled={saving}
        onClick={() => void saveShopVisible(!shopVisible)}
      >
        <span className="shop-dash-switch-knob" aria-hidden />
      </button>
      {err ? (
        <span className="shop-dash-visible-err" role="alert">
          {err}
        </span>
      ) : null}
    </div>
  );
}

function ShopTamDongToggle() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [shop, setShop] = useState<ShopCuaHang | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tuLocal, setTuLocal] = useState("");
  const [denLocal, setDenLocal] = useState("");
  const [lyDo, setLyDo] = useState("");
  /** Optimistic UI khi bật trước khi có lịch lưu. */
  const [draftOn, setDraftOn] = useState(false);
  /** Hiện form «Ngày bán lại» (hoặc đã có sẵn tamDongDen). */
  const [showDen, setShowDen] = useState(false);
  /** Panel lịch — tách khỏi cờ tạm đóng (có thể đóng/mở lại). */
  const [panelOpen, setPanelOpen] = useState(false);

  const tamDong = shop?.tamDong === true || draftOn;

  function syncFromShop(next: ShopCuaHang | null | undefined) {
    setShop(next ?? null);
    setTuLocal(isoToDatetimeLocalValue(next?.tamDongTu));
    setDenLocal(isoToDatetimeLocalValue(next?.tamDongDen));
    setLyDo(next?.tamDongLyDo?.trim() || "");
    setShowDen(Boolean(next?.tamDongDen));
    setDraftOn(false);
  }

  function closePanel() {
    setPanelOpen(false);
    setErr(null);
    if (draftOn && shop?.tamDong !== true) {
      setDraftOn(false);
      setShowDen(Boolean(shop?.tamDongDen));
      setTuLocal(isoToDatetimeLocalValue(shop?.tamDongTu));
      setDenLocal(isoToDatetimeLocalValue(shop?.tamDongDen));
      setLyDo(shop?.tamDongLyDo?.trim() || "");
    }
  }

  function openPanel() {
    setPanelOpen(true);
    setErr(null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchShopCuaHangClient({ force: true });
        if (cancelled) return;
        syncFromShop(data.shop);
        setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onShop = (event: Event) => {
      const detail = (
        event as CustomEvent<{ shop?: ShopCuaHang | null }>
      ).detail;
      if (detail?.shop === undefined) return;
      syncFromShop(detail.shop);
    };
    window.addEventListener("cins:shop-profile-changed", onShop);
    return () =>
      window.removeEventListener("cins:shop-profile-changed", onShop);
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    const onPointer = (event: MouseEvent | PointerEvent) => {
      const el = rootRef.current;
      if (!el || el.contains(event.target as Node)) return;
      closePanel();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [panelOpen, draftOn, shop]);

  async function saveTamDong(patch: {
    tamDong: boolean;
    tamDongTu?: string | null;
    tamDongDen?: string | null;
    tamDongLyDo?: string | null;
  }) {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/cua-hang", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await res.json().catch(() => null)) as {
        shop?: ShopCuaHang;
        error?: string;
      } | null;
      if (!res.ok || !json?.shop) {
        setErr(json?.error ?? "Không lưu được.");
        return false;
      }
      syncFromShop(json.shop);
      setPanelOpen(false);
      invalidateShopClientCaches();
      writeShopCuaHangCache(json.shop, { isOwner: true });
      window.dispatchEvent(
        new CustomEvent("cins:shop-profile-changed", {
          detail: { ownerId: json.shop.idNguoiDung, shop: json.shop },
        }),
      );
      router.refresh();
      return true;
    } catch {
      setErr("Không lưu được.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function onToggle() {
    if (tamDong && shop?.tamDong === true) {
      await saveTamDong({
        tamDong: false,
        tamDongTu: null,
        tamDongDen: null,
        tamDongLyDo: null,
      });
      setShowDen(false);
      setLyDo("");
      setPanelOpen(false);
      return;
    }
    if (tamDong && draftOn) {
      closePanel();
      return;
    }
    /* Bật → mở panel để chọn lịch (chưa lưu cờ cho đến khi Lưu). */
    setDraftOn(true);
    setPanelOpen(true);
    setErr(null);
    if (!tuLocal) {
      setTuLocal(isoToDatetimeLocalValue(new Date().toISOString()));
    }
  }

  async function onSaveRange() {
    const tuIso = datetimeLocalValueToIso(tuLocal);
    if (!tuIso) {
      setErr("Cần chọn thời gian nghỉ từ.");
      return;
    }
    const denIso = showDen ? datetimeLocalValueToIso(denLocal) : null;
    if (showDen && !denIso) {
      setErr("Cần chọn ngày bán lại, hoặc bỏ ô ngày bán lại.");
      return;
    }
    if (denIso && Date.parse(denIso) <= Date.parse(tuIso)) {
      setErr("Thời gian mở lại phải sau thời gian bắt đầu nghỉ.");
      return;
    }
    await saveTamDong({
      tamDong: true,
      tamDongTu: tuIso,
      tamDongDen: denIso,
      tamDongLyDo: normalizeShopTamDongLyDo(lyDo),
    });
  }

  function onRevealDen() {
    setShowDen(true);
    setErr(null);
  }

  function onHideDen() {
    setShowDen(false);
    setDenLocal("");
    setErr(null);
  }

  if (!ready) {
    return (
      <div className="shop-dash-visible is-pending" aria-hidden>
        <span className="shop-dash-visible-label">Shop tạm đóng</span>
        <span className="shop-dash-switch" />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`shop-dash-tam-dong${panelOpen ? " is-open" : ""}${tamDong ? " is-on" : ""}`}
      title={err ?? SHOP_TAM_DONG_HINT}
    >
      <div className="shop-dash-visible">
        <span className="shop-dash-visible-label">Shop tạm đóng</span>
        <button
          type="button"
          className={`shop-dash-switch${tamDong ? " on" : ""}`}
          role="switch"
          aria-checked={tamDong}
          aria-label="Shop tạm đóng"
          title={err ?? SHOP_TAM_DONG_HINT}
          disabled={saving}
          onClick={() => void onToggle()}
        >
          <span className="shop-dash-switch-knob" aria-hidden />
        </button>
        {tamDong && !panelOpen ? (
          <button
            type="button"
            className="shop-dash-tam-dong-edit"
            aria-label="Sửa lịch nghỉ"
            title="Sửa lịch nghỉ"
            disabled={saving}
            onClick={openPanel}
          >
            <CalendarClock size={16} strokeWidth={2.2} aria-hidden />
          </button>
        ) : null}
      </div>
      {panelOpen ? (
        <div
          className="shop-dash-tam-dong-panel"
          role="dialog"
          aria-label="Lịch nghỉ shop"
        >
          <div className="shop-dash-tam-dong-panel-head">
            <span className="shop-dash-tam-dong-panel-title">Lịch nghỉ</span>
            <button
              type="button"
              className="shop-dash-tam-dong-close"
              aria-label="Đóng"
              disabled={saving}
              onClick={closePanel}
            >
              <X size={16} strokeWidth={2.2} aria-hidden />
            </button>
          </div>
          <label className="shop-dash-tam-dong-field">
            <span>Nghỉ từ</span>
            <input
              type="datetime-local"
              value={tuLocal}
              disabled={saving}
              onChange={(e) => setTuLocal(e.target.value)}
            />
          </label>
          {showDen ? (
            <label className="shop-dash-tam-dong-field">
              <span className="shop-dash-tam-dong-field-row">
                Ngày bán lại
                <button
                  type="button"
                  className="shop-dash-tam-dong-link"
                  disabled={saving}
                  onClick={onHideDen}
                >
                  Bỏ
                </button>
              </span>
              <input
                type="datetime-local"
                value={denLocal}
                disabled={saving}
                onChange={(e) => setDenLocal(e.target.value)}
              />
            </label>
          ) : (
            <button
              type="button"
              className="shop-dash-tam-dong-link shop-dash-tam-dong-add-den"
              disabled={saving}
              onClick={onRevealDen}
            >
              Ngày bán lại
            </button>
          )}
          <label className="shop-dash-tam-dong-field">
            <span className="shop-dash-tam-dong-field-row">
              Lý do nghỉ
              <span className="shop-dash-tam-dong-optional">Tuỳ chọn</span>
            </span>
            <textarea
              className="shop-dash-tam-dong-ly-do"
              value={lyDo}
              disabled={saving}
              maxLength={SHOP_TAM_DONG_LY_DO_MAX}
              rows={2}
              placeholder="Ví dụ: nghỉ lễ, hết hàng tạm thời…"
              onChange={(e) => setLyDo(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="shop-dash-tam-dong-save"
            disabled={saving}
            onClick={() => void onSaveRange()}
          >
            {saving ? "Đang lưu…" : "Lưu lịch nghỉ"}
          </button>
          {err ? (
            <span className="shop-dash-tam-dong-err" role="alert">
              {err}
            </span>
          ) : null}
        </div>
      ) : err && !tamDong ? (
        <span className="shop-dash-visible-err" role="alert">
          {err}
        </span>
      ) : null}
    </div>
  );
}

export function ShopDashTabs({
  active,
  actions,
}: {
  active: ShopDashTab;
  actions?: ReactNode;
}) {
  const [shopHref, setShopHref] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/session-profile", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json().catch(() => null)) as {
          profile?: { slug?: string | null } | null;
        } | null;
        const slug = json?.profile?.slug?.trim();
        if (!cancelled && slug) setShopHref(shopPublicHref(slug));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="shop-dash-head">
      <div className="shop-dash-head-row">
        {shopHref ? (
          <Link
            href={shopHref}
            className="shop-dash-back"
            aria-label="Về cửa hàng"
          >
            <ArrowLeft size={16} strokeWidth={2.2} aria-hidden />
            <span className="shop-dash-back-text">Về cửa hàng</span>
          </Link>
        ) : (
          <span className="shop-dash-back is-pending" aria-hidden>
            <ArrowLeft size={16} strokeWidth={2.2} />
            <span className="shop-dash-back-text">Về cửa hàng</span>
          </span>
        )}
        <nav className="shop-dash-tabs" aria-label="Quản lý bán hàng">
          <TabLink
            href={TAB_COPY.kho.href}
            label={TAB_COPY.kho.label}
            shortLabel={TAB_COPY.kho.shortLabel}
            active={active === "kho"}
            icon={<Package size={18} strokeWidth={2} aria-hidden />}
          />
          <TabLink
            href={TAB_COPY.don.href}
            label={TAB_COPY.don.label}
            shortLabel={TAB_COPY.don.shortLabel}
            active={active === "don"}
            icon={<ClipboardList size={18} strokeWidth={2} aria-hidden />}
          />
          <TabLink
            href={TAB_COPY["cua-hang"].href}
            label={TAB_COPY["cua-hang"].label}
            shortLabel={TAB_COPY["cua-hang"].shortLabel}
            active={active === "cua-hang"}
            icon={<Store size={18} strokeWidth={2} aria-hidden />}
          />
        </nav>
        <div className="shop-dash-head-end">
          <ShopVisibleToggle />
          <ShopTamDongToggle />
          {actions ? (
            <div className="shop-dash-head-actions">{actions}</div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
