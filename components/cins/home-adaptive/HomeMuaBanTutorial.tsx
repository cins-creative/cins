"use client";

import { Store } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { openAccountSettings } from "@/lib/cins/open-account-settings";
import {
  tutorialPresetIdFromIntents,
  type HomeLayoutTutorial,
  type OnboardingIntent,
  type PresetId,
} from "@/lib/cins/home-adaptive/presets";

const PHONE_MQ = "(max-width: 991.98px)";
const OVERLAY_HINT_KEY = "cins-home-tutorial-overlay-opened";
const BAN_HANG_ON_KEY = "cins-ban-hang-enabled";

function useShopOpened(hasShop: boolean): boolean {
  const [opened, setOpened] = useState(hasShop);

  useEffect(() => {
    setOpened(hasShop);
  }, [hasShop]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(BAN_HANG_ON_KEY) === "1") setOpened(true);
    } catch {
      /* ignore */
    }
    function onChange(ev: Event) {
      if ((ev as CustomEvent<{ enabled?: boolean }>).detail?.enabled !== true) {
        return;
      }
      try {
        sessionStorage.setItem(BAN_HANG_ON_KEY, "1");
      } catch {
        /* ignore */
      }
      setOpened(true);
    }
    window.addEventListener("cins:ban-hang-changed", onChange);
    return () => window.removeEventListener("cins:ban-hang-changed", onChange);
  }, []);

  return opened;
}

function isPhoneViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(PHONE_MQ).matches;
}

export function HomeTutorialCtaCard({ onPick }: { onPick: () => void }) {
  return (
    <div className="ha-tutorial-cta">
      <p className="ha-tutorial-cta-title">Chọn bộ khối mua sắm / bán hàng</p>
      <p className="ha-tutorial-cta-hint">
        Chọn chức năng theo nhu cầu riêng của bạn — một cú bấm ra layout dùng
        được ngay.
      </p>
      <button type="button" className="ha-tutorial-cta-btn" onClick={onPick}>
        Chọn bộ khối
      </button>
    </div>
  );
}

export function HomeOpenShopNotice({ hasShop }: { hasShop: boolean }) {
  const opened = useShopOpened(hasShop);
  if (opened) return null;
  return (
    <div className="ha-open-shop-notice">
      <Store size={18} strokeWidth={2} aria-hidden />
      <div className="ha-open-shop-notice-copy">
        <p className="ha-open-shop-notice-title">Bạn chưa hề mở shop</p>
        <p className="ha-open-shop-notice-hint">
          Bật bán hàng để nhận đơn, kho và tin nhắn mua bán trên trang chủ.
        </p>
      </div>
      <button
        type="button"
        className="ha-tutorial-cta-btn"
        onClick={() => openAccountSettings("ban-hang")}
      >
        Mở shop
      </button>
    </div>
  );
}

/** Banner trên feed — CSS chỉ hiện khi &lt;992px. */
export function HomeOpenShopFeedBanner({
  show,
  hasShop,
}: {
  show: boolean;
  hasShop: boolean;
}) {
  const opened = useShopOpened(hasShop);
  if (!show || opened) return null;
  return (
    <div className="ha-open-shop-feed-banner" role="status">
      <Store size={18} strokeWidth={2} aria-hidden />
      <p>
        Bạn chưa hề mở shop. Bật bán hàng để nhận đơn trên trang chủ.
      </p>
      <button
        type="button"
        className="ha-tutorial-cta-btn"
        onClick={() => openAccountSettings("ban-hang")}
      >
        Mở shop
      </button>
    </div>
  );
}

type ControllerProps = {
  tutorial: HomeLayoutTutorial | undefined;
  intentHint: readonly OnboardingIntent[];
  addAt: { side: "left" | "right"; index: number } | null;
  completeTutorial: (
    presetId: PresetId,
    status: "done" | "skipped",
  ) => Promise<void>;
  openAddAt: (side: "left" | "right", index: number) => void;
};

/** Phone: auto-apply. Desktop: mở overlay một lần trong tab. */
export function HomeMuaBanTutorialController({
  tutorial,
  intentHint,
  addAt,
  completeTutorial,
  openAddAt,
}: ControllerProps) {
  const ran = useRef(false);
  const [phone, setPhone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(PHONE_MQ);
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (tutorial !== "pending") return;
    if (ran.current) return;

    if (isPhoneViewport()) {
      ran.current = true;
      const presetId = tutorialPresetIdFromIntents(intentHint);
      void completeTutorial(presetId, "done");
      return;
    }

    try {
      if (sessionStorage.getItem(OVERLAY_HINT_KEY) === "1") return;
      sessionStorage.setItem(OVERLAY_HINT_KEY, "1");
    } catch {
      /* quota / private */
    }
    ran.current = true;
    openAddAt("left", 0);
  }, [tutorial, intentHint, completeTutorial, openAddAt]);

  useEffect(() => {
    if (tutorial !== "pending") return;
    if (phone) return;
    if (addAt) return;
    if (ran.current) return;
    try {
      if (sessionStorage.getItem(OVERLAY_HINT_KEY) === "1") return;
      sessionStorage.setItem(OVERLAY_HINT_KEY, "1");
    } catch {
      /* ignore */
    }
    ran.current = true;
    openAddAt("left", 0);
  }, [phone, tutorial, addAt, openAddAt]);

  return null;
}
