"use client";

import { ArrowLeft, ClipboardList, Package, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import {
  fetchBanHangClientStatus,
  invalidateBanHangClientCache,
  peekBanHangClientStatus,
  prefetchBanHangClientStatus,
} from "@/lib/shop/client-fetch-cache";
import { shopPublicHref } from "@/lib/shop/cua-hang-href";

type ShopDashTab = "kho" | "don" | "cua-hang";

const TAB_COPY: Record<ShopDashTab, { href: string; label: string }> = {
  kho: {
    href: "/ban-hang/kho",
    label: "Kho hàng",
  },
  don: {
    href: "/ban-hang/don",
    label: "Đơn hàng",
  },
  "cua-hang": {
    href: "/ban-hang/cua-hang",
    label: "Quản lý cửa hàng",
  },
};

const SHOP_VISIBLE_HINT =
  "Hiện tab Shop và sản phẩm trên Journey. Tắt để chuẩn bị kho mà người khác chưa thấy.";

function TabLink({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`shop-dash-tab${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      onMouseEnter={prefetchBanHangClientStatus}
      onFocus={prefetchBanHangClientStatus}
    >
      {icon}
      {label}
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
          <Link href={shopHref} className="shop-dash-back">
            <ArrowLeft size={16} strokeWidth={2.2} aria-hidden />
            Về cửa hàng
          </Link>
        ) : (
          <span className="shop-dash-back is-pending" aria-hidden>
            <ArrowLeft size={16} strokeWidth={2.2} />
            Về cửa hàng
          </span>
        )}
        <nav className="shop-dash-tabs" aria-label="Quản lý bán hàng">
          <TabLink
            href={TAB_COPY.kho.href}
            label={TAB_COPY.kho.label}
            active={active === "kho"}
            icon={<Package size={18} strokeWidth={2} aria-hidden />}
          />
          <TabLink
            href={TAB_COPY.don.href}
            label={TAB_COPY.don.label}
            active={active === "don"}
            icon={<ClipboardList size={18} strokeWidth={2} aria-hidden />}
          />
          <TabLink
            href={TAB_COPY["cua-hang"].href}
            label={TAB_COPY["cua-hang"].label}
            active={active === "cua-hang"}
            icon={<Store size={18} strokeWidth={2} aria-hidden />}
          />
        </nav>
        <div className="shop-dash-head-end">
          <ShopVisibleToggle />
          {actions ? (
            <div className="shop-dash-head-actions">{actions}</div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
