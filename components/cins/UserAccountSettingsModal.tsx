"use client";

import {
  Ban,
  Building2,
  Check,
  ChevronRight,
  Clock3,
  Columns2,
  Globe,
  LayoutGrid,
  Loader2,
  PanelsTopLeft,
  Rows3,
  Settings2,
  ShieldCheck,
  Smartphone,
  User,
  UserMinus,
  UserRoundX,
  Users,
  Waypoints,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { LayoutThumbIcon } from "@/components/editor/LayoutThumbIcon";
import { ShopDonDetailModal } from "@/components/shop/ShopDonDetailModal";
import { formatCurrency, formatDate, formatMoney } from "@/lib/format";
import { useLocale } from "@/lib/locale/context";
import { invalidateShopClientCaches } from "@/lib/shop/client-fetch-cache";
import { shopTermsForLocale } from "@/lib/shop/terms";
import {
  shopTrangThaiDonLabel,
  type ShopDonHang,
} from "@/lib/shop/types";
import type { MutualFriendProfile } from "@/lib/social/types";

import {
  HOME_FEED_LAYOUT_OPTIONS,
  readHomeFeedLayout,
  setHomeFeedLayout,
  type HomeFeedLayout,
} from "@/lib/home/home-feed-layout";
import { requestHomeLayoutEdit } from "@/lib/home/home-layout-edit";
import {
  FEED_SOURCE_DEFAULT,
  FEED_SOURCE_OPTIONS,
  readFeedSourceDefault,
  setFeedSourceDefault,
  type FeedSourceFilter,
} from "@/lib/cins/worldJourneyFeedSource";
import {
  JOURNEY_DEFAULT_VIEW_OPTIONS,
  normalizeJourneyDefaultView,
  type JourneyDefaultView,
} from "@/lib/journey/journey-default-view";
import type { MessageKey } from "@/lib/i18n/messages";
import { useT } from "@/lib/i18n/use-t";
import { manageSellerHref, webHref } from "@/lib/cins/manage-site";

import "./user-account-settings-modal.css";

type SettingsSection =
  | "journey-display"
  | "lich-su-mua"
  | "ban-hang"
  | "thanh-toan"
  | "user-management"
  | "security-2fa";

const NAV: ReadonlyArray<{
  id: SettingsSection;
  labelKey: MessageKey;
}> = [
  { id: "journey-display", labelKey: "account.settings.nav.display" },
  { id: "lich-su-mua", labelKey: "account.settings.nav.orders" },
  { id: "ban-hang", labelKey: "account.settings.nav.selling" },
  { id: "thanh-toan", labelKey: "account.settings.nav.billing" },
  { id: "user-management", labelKey: "account.settings.nav.users" },
  { id: "security-2fa", labelKey: "account.settings.nav.security" },
];

const VIEW_COPY: Record<
  JourneyDefaultView,
  { label: MessageKey; desc: MessageKey }
> = {
  timeline: {
    label: "account.settings.display.view.timeline",
    desc: "account.settings.display.view.timelineDesc",
  },
  gallery: {
    label: "account.settings.display.view.gallery",
    desc: "account.settings.display.view.galleryDesc",
  },
  gallery_luoi: {
    label: "account.settings.display.view.masonry",
    desc: "account.settings.display.view.masonryDesc",
  },
};

const HOME_LAYOUT_LABEL: Record<HomeFeedLayout, MessageKey> = {
  timeline: "account.settings.home.layout.timeline",
  masonry: "account.settings.home.layout.masonry",
};

const FEED_SOURCE_LABEL: Record<FeedSourceFilter, MessageKey> = {
  all: "account.settings.home.source.all",
  following: "account.settings.home.source.following",
  "user-only": "account.settings.home.source.users",
  "org-only": "account.settings.home.source.orgs",
};

type LayoutTab = "profile" | "home";

const OPTION_ICON: Record<JourneyDefaultView, LucideIcon> = {
  timeline: Clock3,
  gallery: LayoutGrid,
  gallery_luoi: Rows3,
};

const HOME_LAYOUT_ICON: Record<HomeFeedLayout, LucideIcon> = {
  timeline: Waypoints,
  masonry: LayoutGrid,
};

const FEED_SOURCE_ICON: Record<FeedSourceFilter, LucideIcon> = {
  all: Globe,
  following: Users,
  "user-only": User,
  "org-only": Building2,
};

type Props = {
  open: boolean;
  onClose: () => void;
  initialSection?: SettingsSection;
};

export function UserAccountSettingsModal({
  open,
  onClose,
  initialSection = "journey-display",
}: Props) {
  const t = useT();
  const titleId = useId();
  const router = useRouter();
  const [section, setSection] = useState<SettingsSection>("journey-display");
  const [layoutTab, setLayoutTab] = useState<LayoutTab>("profile");
  const [homeLayout, setHomeLayout] = useState<HomeFeedLayout>("timeline");
  const [feedSource, setFeedSource] =
    useState<FeedSourceFilter>(FEED_SOURCE_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(false);
  const [selected, setSelected] = useState<JourneyDefaultView>("timeline");
  const [initial, setInitial] = useState<JourneyDefaultView>("timeline");
  const [applyToMe, setApplyToMe] = useState(false);
  const [initialApplyToMe, setInitialApplyToMe] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/user/journey-default-view", {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        view?: string;
        applyToMe?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !json) {
        setErr(json?.error ?? t("account.settings.display.loadError"));
        return;
      }
      const view = normalizeJourneyDefaultView(json.view);
      const apply = json.applyToMe === true;
      setSelected(view);
      setInitial(view);
      setApplyToMe(apply);
      setInitialApplyToMe(apply);
    } catch {
      setErr(t("account.settings.display.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!open) return;
    setSection(initialSection);
    setLayoutTab("profile");
    setSavedTick(false);
    setHomeLayout(readHomeFeedLayout());
    setFeedSource(readFeedSourceDefault());
    void loadSettings();
  }, [open, initialSection, loadSettings]);

  const navItems = NAV;

  const chooseHomeLayout = useCallback((layout: HomeFeedLayout) => {
    setHomeLayout(layout);
    setHomeFeedLayout(layout);
  }, []);

  const chooseFeedSource = useCallback((value: FeedSourceFilter) => {
    setFeedSource(value);
    setFeedSourceDefault(value);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const dirty = selected !== initial || applyToMe !== initialApplyToMe;

  const save = useCallback(async () => {
    if (saving || !dirty) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/user/journey-default-view", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ view: selected, applyToMe }),
      });
      const json = (await res.json().catch(() => null)) as {
        view?: string;
        applyToMe?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !json?.view) {
        setErr(json?.error ?? t("account.settings.display.saveError"));
        return;
      }
      const view = normalizeJourneyDefaultView(json.view);
      const apply = json.applyToMe === true;
      setInitial(view);
      setSelected(view);
      setInitialApplyToMe(apply);
      setApplyToMe(apply);
      setSavedTick(true);
      window.setTimeout(() => setSavedTick(false), 2200);
    } catch {
      setErr(t("account.settings.display.saveError"));
    } finally {
      setSaving(false);
    }
  }, [saving, dirty, selected, applyToMe, t]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="uas-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="uas-modal uas-account-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="uas-head">
          <div className="uas-head-copy">
            <Settings2 size={18} strokeWidth={2} aria-hidden />
            <h2 id={titleId} className="uas-title">
              {t("account.settings")}
            </h2>
          </div>
          <button
            type="button"
            className="uas-close"
            aria-label={t("account.settings.close")}
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="uas-layout">
          <nav className="uas-nav" aria-label={t("account.settings.navAria")}>
            {navItems.map(({ id, labelKey }) => (
              <button
                key={id}
                type="button"
                className={`uas-nav-btn${section === id ? " on" : ""}`}
                aria-current={section === id ? "true" : undefined}
                onClick={() => setSection(id)}
              >
                {t(labelKey)}
              </button>
            ))}
          </nav>

          <div className="uas-body">
            {section === "journey-display" ? (
              <section className="uas-section" aria-labelledby={`${titleId}-jd`}>
                <div className="uas-section-head">
                  <h3 id={`${titleId}-jd`} className="uas-section-title">
                    {t("account.settings.nav.display")}
                  </h3>
                </div>

                <div
                  className="uas-tabs"
                  role="tablist"
                  aria-label={t("account.settings.display.pageAria")}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={layoutTab === "profile"}
                    className={`uas-tab${layoutTab === "profile" ? " on" : ""}`}
                    onClick={() => setLayoutTab("profile")}
                  >
                    <User size={15} strokeWidth={2} aria-hidden />
                    {t("account.profile")}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={layoutTab === "home"}
                    className={`uas-tab${layoutTab === "home" ? " on" : ""}`}
                    onClick={() => setLayoutTab("home")}
                  >
                    <PanelsTopLeft size={15} strokeWidth={2} aria-hidden />
                    {t("nav.home")}
                  </button>
                </div>

                {layoutTab === "profile" ? (
                  <div className="uas-layout-stack">
                    <div className="uas-layout-block">
                      <div className="uas-layout-block-head">
                        <h4 className="uas-layout-block-title">
                          {t("account.settings.display.defaultMode")}
                        </h4>
                        <p className="uas-layout-block-hint">
                          {t("account.settings.display.defaultHint")}
                        </p>
                      </div>

                      {loading ? (
                        <div className="uas-loading">
                          <Loader2 size={18} className="uas-spin" aria-hidden />
                          <span>{t("account.settings.loading")}</span>
                        </div>
                      ) : (
                        <div
                          className="uas-options"
                          role="radiogroup"
                          aria-label={t("account.settings.display.modeAria")}
                        >
                          {JOURNEY_DEFAULT_VIEW_OPTIONS.map((opt) => {
                            const Icon = OPTION_ICON[opt.value];
                            const active = selected === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                className={`uas-option${active ? " on" : ""}`}
                                onClick={() => setSelected(opt.value)}
                              >
                                <span className="uas-option-ico" aria-hidden>
                                  {opt.value === "gallery_luoi" ? (
                                    <LayoutThumbIcon
                                      layout="masonry"
                                      masonryColumns={2}
                                      size={20}
                                    />
                                  ) : (
                                    <Icon size={20} strokeWidth={1.8} />
                                  )}
                                </span>
                                <span className="uas-option-text">
                                  <span className="uas-option-label">
                                    {t(VIEW_COPY[opt.value].label)}
                                  </span>
                                  <span className="uas-option-desc">
                                    {t(VIEW_COPY[opt.value].desc)}
                                  </span>
                                </span>
                                <span className="uas-option-check" aria-hidden>
                                  {active ? (
                                    <Check size={16} strokeWidth={2.4} />
                                  ) : null}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {!loading ? (
                      <div className="uas-layout-block uas-layout-block--flush">
                        <div className="uas-toggle-row">
                          <span className="uas-toggle-text">
                            <span className="uas-toggle-label">
                              {t("account.settings.display.applyToMe")}
                            </span>
                            <span className="uas-toggle-desc">
                              {t("account.settings.display.applyToMeDesc")}
                            </span>
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={applyToMe}
                            aria-label={t("account.settings.display.applyToMe")}
                            className={`uas-switch${applyToMe ? " on" : ""}`}
                            onClick={() => setApplyToMe((v) => !v)}
                          >
                            <span className="uas-switch-knob" aria-hidden />
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {err ? (
                      <p className="uas-err" role="alert">
                        {err}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="uas-layout-stack">
                    {homeLayout === "timeline" ? (
                      <div className="uas-layout-block">
                        <div className="uas-layout-block-head">
                          <h4 className="uas-layout-block-title">
                            {t("account.settings.home.sideBlocks")}
                          </h4>
                          <p className="uas-layout-block-hint">
                            {t("account.settings.home.sideHint")}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="uas-layout-cta"
                          onClick={() => {
                            onClose();
                            // Đang ở `/` → bật edit client-side (không SSR lại trang chủ).
                            if (!requestHomeLayoutEdit()) {
                              router.push("/?tuy-chinh=1");
                            }
                          }}
                          onMouseEnter={() => {
                            if (
                              typeof window !== "undefined" &&
                              window.location.pathname !== "/"
                            ) {
                              router.prefetch("/?tuy-chinh=1");
                            }
                          }}
                        >
                          <span className="uas-layout-cta-ico" aria-hidden>
                            <Columns2 size={20} strokeWidth={1.8} />
                          </span>
                          <span className="uas-layout-cta-text">
                            <span className="uas-layout-cta-label">
                              {t("account.settings.home.editHome")}
                            </span>
                            <span className="uas-layout-cta-desc">
                              {t("account.settings.home.editHomeDesc")}
                            </span>
                          </span>
                          <ChevronRight
                            className="uas-layout-cta-chevron"
                            size={18}
                            strokeWidth={2}
                            aria-hidden
                          />
                        </button>
                      </div>
                    ) : null}

                    <div className="uas-layout-block">
                      <div className="uas-layout-block-head">
                        <h4 className="uas-layout-block-title">
                          {t("account.settings.home.feedStyle")}
                        </h4>
                        <p className="uas-layout-block-hint">
                          {t("account.settings.home.feedHint")}
                        </p>
                      </div>
                      <div
                        className="uas-pick-grid"
                        role="radiogroup"
                        aria-label={t("account.settings.home.feedAria")}
                      >
                        {HOME_FEED_LAYOUT_OPTIONS.map((opt) => {
                          const Icon = HOME_LAYOUT_ICON[opt.value];
                          const active = homeLayout === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              className={`uas-pick${active ? " on" : ""}`}
                              onClick={() => chooseHomeLayout(opt.value)}
                            >
                              <span className="uas-pick-ico" aria-hidden>
                                <Icon size={22} strokeWidth={1.8} />
                              </span>
                              <span className="uas-pick-label">
                                {t(HOME_LAYOUT_LABEL[opt.value])}
                              </span>
                              {active ? (
                                <Check
                                  className="uas-pick-check"
                                  size={14}
                                  strokeWidth={2.4}
                                  aria-hidden
                                />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="uas-layout-block">
                      <div className="uas-layout-block-head">
                        <h4 className="uas-layout-block-title">
                          {t("account.settings.home.source")}
                        </h4>
                        <p className="uas-layout-block-hint">
                          {t("account.settings.home.sourceHint")}
                        </p>
                      </div>
                      <div
                        className="uas-chip-list"
                        role="radiogroup"
                        aria-label={t("account.settings.home.sourceAria")}
                      >
                        {FEED_SOURCE_OPTIONS.map((opt) => {
                          const Icon = FEED_SOURCE_ICON[opt.value];
                          const active = feedSource === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              className={`uas-chip${active ? " on" : ""}`}
                              title={opt.desc}
                              onClick={() => chooseFeedSource(opt.value)}
                            >
                              <Icon size={15} strokeWidth={2} aria-hidden />
                              <span>{t(FEED_SOURCE_LABEL[opt.value])}</span>
                              {active ? (
                                <Check size={13} strokeWidth={2.4} aria-hidden />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            ) : null}

            {section === "lich-su-mua" ? (
              <LichSuMuaHangSection titleId={`${titleId}-lsm`} />
            ) : null}

            {section === "ban-hang" ? (
              <BanHangSettingsSection titleId={`${titleId}-bh`} />
            ) : null}

            {section === "thanh-toan" ? (
              <ThanhToanSettingsSection
                titleId={`${titleId}-tt`}
                onClose={onClose}
              />
            ) : null}

            {section === "user-management" ? (
              <UserManagementSection titleId={`${titleId}-um`} />
            ) : null}

            {section === "security-2fa" ? (
              <TwoFactorSection titleId={`${titleId}-2fa`} />
            ) : null}
          </div>
        </div>

        <footer className="uas-foot">
          {section === "journey-display" && layoutTab === "home" ? (
            <span className="uas-foot-note">
              {t("account.settings.home.applyNow")}
            </span>
          ) : savedTick ? (
            <span className="uas-saved" aria-live="polite">
              <Check size={15} strokeWidth={2.4} aria-hidden />
              {t("account.settings.saved")}
            </span>
          ) : (
            <span />
          )}
          <div className="uas-foot-actions">
            <button type="button" className="uas-btn ghost" onClick={onClose}>
              {dirty && layoutTab === "profile" && section === "journey-display"
                ? t("account.settings.cancel")
                : t("account.settings.close")}
            </button>
            {!(section === "journey-display" && layoutTab === "home") ? (
              <button
                type="button"
                className="uas-btn primary"
                disabled={!dirty || saving || loading}
                onClick={() => void save()}
              >
                {saving ? (
                  <>
                    <Loader2 size={15} className="uas-spin" aria-hidden />
                    {t("account.settings.saving")}
                  </>
                ) : (
                  t("account.settings.save")
                )}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

type UmTab = "friends" | "pending" | "blocked";

function LichSuMuaHangSection({ titleId }: { titleId: string }) {
  const t = useT();
  const locale = useLocale();
  const [items, setItems] = useState<ShopDonHang[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/shop/orders?role=buyer", {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as {
          items?: ShopDonHang[];
          error?: string;
        } | null;
        if (cancelled) return;
        if (!res.ok) {
          setErr(json?.error ?? t("shop.history.loadFail"));
          setItems([]);
          return;
        }
        setItems(Array.isArray(json?.items) ? json.items : []);
      } catch {
        if (!cancelled) {
          setErr(t("shop.history.loadFail"));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <section className="uas-section" aria-labelledby={titleId}>
      <div className="uas-section-head">
        <h3 id={titleId} className="uas-section-title">
          {t("account.settings.nav.orders")}
        </h3>
        <p className="uas-section-hint">{t("account.settings.orders.hint")}</p>
      </div>

      {loading ? (
        <div className="uas-loading">
          <Loader2 size={18} className="uas-spin" aria-hidden />
          <span>{t("account.settings.loading")}</span>
        </div>
      ) : err ? (
        <p className="uas-section-hint" style={{ color: "#b42318" }} role="alert">
          {err}
        </p>
      ) : items.length === 0 ? (
        <p className="uas-section-hint">{t("shop.history.empty")}</p>
      ) : (
        <ul className="uas-mua-list">
          {items.map((don) => {
            const ma = don.maDon?.trim() || don.id.slice(0, 8);
            const first = don.dong[0];
            const more = Math.max(0, don.dong.length - 1);
            const summary = first
              ? `${first.tenSnapshot}${more > 0 ? ` +${more}` : ""}`
              : "—";
            return (
              <li key={don.id}>
                <button
                  type="button"
                  className="uas-mua-row"
                  onClick={() => setDetailId(don.id)}
                >
                  <span className="uas-mua-row-main">
                    <span className="uas-mua-ma">{ma}</span>
                    <span className="uas-mua-meta">
                      {don.banTen?.trim() || t("shop.order.seller")} · {summary}
                    </span>
                    <span className="uas-mua-time">
                      {formatDate(don.taoLuc, locale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  <span className="uas-mua-row-side">
                    <span
                      className={`uas-mua-status uas-mua-status--${don.trangThai}`}
                    >
                      {shopTrangThaiDonLabel(don.trangThai, locale)}
                    </span>
                    <strong className="uas-mua-tong">
                      {formatMoney(don.tongTien, locale, don.tienTe)}
                    </strong>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ShopDonDetailModal
        donId={detailId}
        open={detailId != null}
        onClose={() => setDetailId(null)}
        viewerRole="buyer"
        onDonChange={(don) => {
          setItems((prev) =>
            prev.map((item) => (item.id === don.id ? don : item)),
          );
        }}
      />
    </section>
  );
}

function ThanhToanSettingsSection({
  titleId,
  onClose,
}: {
  titleId: string;
  onClose: () => void;
}) {
  const t = useT();
  const router = useRouter();
  return (
    <section className="uas-section" aria-labelledby={titleId}>
      <h2 id={titleId} className="uas-section-title">
        {t("account.settings.nav.billing")}
      </h2>
      <p className="uas-section-desc">{t("account.settings.billing.desc")}</p>
      <div className="uas-row" style={{ marginTop: "0.75rem" }}>
        <button
          type="button"
          className="uas-btn primary"
          onClick={() => {
            onClose();
            router.push("/account/billing");
          }}
        >
          {t("account.settings.billing.open")}
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </section>
  );
}

/**
 * Render body điều khoản (chuỗi có mục "N. Tiêu đề") thành cấu trúc phân cấp:
 * đoạn intro, các điều khoản đánh số với heading rõ + dòng nội dung, câu kết.
 */
function TermsBody({ body }: { body: string }) {
  const lines = body.split("\n");
  type Block =
    | { kind: "intro" | "outro"; text: string }
    | { kind: "clause"; num: string; title: string; lines: string[] };
  const blocks: Block[] = [];
  let current: Extract<Block, { kind: "clause" }> | null = null;
  let seenClause = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^(\d+)\.\s*(.+)$/.exec(line);
    if (m) {
      current = { kind: "clause", num: m[1], title: m[2], lines: [] };
      blocks.push(current);
      seenClause = true;
      continue;
    }
    if (current) {
      current.lines.push(line);
    } else {
      blocks.push({ kind: seenClause ? "outro" : "intro", text: line });
    }
  }

  return (
    <div className="uas-terms">
      {blocks.map((b, i) =>
        b.kind === "clause" ? (
          <div key={i} className="uas-terms-clause">
            <p className="uas-terms-clause-title">
              <span className="uas-terms-clause-num">{b.num}.</span>
              {b.title}
            </p>
            {b.lines.map((l, j) => (
              <p key={j}>{l}</p>
            ))}
          </div>
        ) : b.kind === "outro" ? (
          <p key={i} className="uas-terms-outro">
            {b.text}
          </p>
        ) : (
          <p key={i} className="uas-terms-intro">
            {b.text}
          </p>
        ),
      )}
    </div>
  );
}

type PhiSanDangApDung = {
  tyLePercent?: number;
  nguongVnd?: number;
  toiThieuXuatKyVnd?: number;
  soNgayHanTra?: number;
  camKetCongBoTruocNgay?: number;
};

type PhiSanThongBao = {
  id: string;
  tieuDe: string;
  noiDung: string;
  tyLeDuKien: number | null;
  hieuLucDuKien: string | null;
  congBoLuc: string;
};

type PhiSanPanelProps = {
  dangApDung: PhiSanDangApDung;
  thongBao?: PhiSanThongBao[];
  chinhSachHref?: string;
};

function tyLePercentFromDecimal(tyLe: number): number {
  return Math.round(tyLe * 10000) / 100;
}

type PhiTimelineMilestone = {
  id: string;
  status: "active" | "upcoming";
  dateLabel: string;
  tyLePercent: number;
  badge: string;
  title?: string;
  note?: string;
};

function buildPhiTimeline(
  dangApDung: PhiSanDangApDung,
  thongBao: PhiSanThongBao[] | undefined,
  copy: {
    now: string;
    active: string;
    note: string;
    planned: string;
    upcoming: string;
    formatDay: (raw: string) => string;
  },
): PhiTimelineMilestone[] {
  const items: PhiTimelineMilestone[] = [
    {
      id: "current",
      status: "active",
      dateLabel: copy.now,
      tyLePercent: dangApDung.tyLePercent ?? 0,
      badge: copy.active,
      note: copy.note,
    },
  ];

  const upcoming = [...(thongBao ?? [])]
    .filter((t) => t.tyLeDuKien != null || t.hieuLucDuKien)
    .sort((a, b) => {
      const da = a.hieuLucDuKien
        ? new Date(a.hieuLucDuKien).getTime()
        : Number.POSITIVE_INFINITY;
      const db = b.hieuLucDuKien
        ? new Date(b.hieuLucDuKien).getTime()
        : Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return new Date(b.congBoLuc).getTime() - new Date(a.congBoLuc).getTime();
    });

  for (const row of upcoming) {
    items.push({
      id: row.id,
      status: "upcoming",
      dateLabel: row.hieuLucDuKien
        ? copy.formatDay(row.hieuLucDuKien)
        : copy.planned,
      tyLePercent:
        row.tyLeDuKien != null ? tyLePercentFromDecimal(row.tyLeDuKien) : 0,
      badge: copy.upcoming,
      title: row.tieuDe,
      note: row.noiDung,
    });
  }

  return items;
}

function PhiSanPanel({ dangApDung, thongBao, chinhSachHref }: PhiSanPanelProps) {
  const t = useT();
  const locale = useLocale();
  if (!dangApDung) return null;

  const timeline = buildPhiTimeline(dangApDung, thongBao, {
    now: t("account.settings.fee.now"),
    active: t("account.settings.fee.active"),
    note: t("account.settings.fee.note"),
    planned: t("account.settings.fee.planned"),
    upcoming: t("account.settings.fee.upcoming"),
    formatDay: (raw) => {
      const trimmed = raw.trim();
      if (!trimmed) return raw;
      const d = new Date(trimmed);
      return Number.isNaN(d.getTime())
        ? trimmed
        : formatDate(d, locale, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
    },
  });

  const stats = [
    {
      k: t("account.settings.fee.period"),
      v: t("account.settings.fee.periodVal"),
      note: t("account.settings.fee.periodNote"),
    },
    {
      k: t("account.settings.fee.minPayout"),
      v: formatCurrency(dangApDung.toiThieuXuatKyVnd ?? 0, locale),
      note: t("account.settings.fee.minNote"),
    },
    {
      k: t("account.settings.fee.due"),
      v: t("account.settings.fee.dueVal", { n: dangApDung.soNgayHanTra ?? 7 }),
      note: t("account.settings.fee.dueNote"),
    },
    {
      k: t("account.settings.fee.rateChange"),
      v: t("account.settings.fee.rateVal", {
        n: dangApDung.camKetCongBoTruocNgay ?? 30,
      }),
      note: t("account.settings.fee.rateNote"),
    },
  ];

  return (
    <aside className="uas-phi-panel" aria-labelledby="uas-phi-panel-title">
      <div className="uas-phi-panel-head">
        <h4 id="uas-phi-panel-title" className="uas-phi-panel-title">
          {t("account.settings.fee.title")}
        </h4>
      </div>

      <p className="uas-phi-panel-lede">{t("account.settings.fee.lede")}</p>

      <ol
        className="uas-phi-timeline"
        aria-label={t("account.settings.fee.timelineAria")}
      >
        {timeline.map((m, i) => (
          <li
            key={m.id}
            className={`uas-phi-timeline-item uas-phi-timeline-item--${m.status}`}
          >
            <span className="uas-phi-timeline-marker" aria-hidden>
              <span className="uas-phi-timeline-dot" />
              {i < timeline.length - 1 ? (
                <span className="uas-phi-timeline-line" />
              ) : null}
            </span>
            <div className="uas-phi-timeline-body">
              <div className="uas-phi-timeline-meta">
                <time className="uas-phi-timeline-date">{m.dateLabel}</time>
                <span className="uas-phi-timeline-badge">{m.badge}</span>
              </div>
              <p
                className="uas-phi-timeline-rate"
                aria-label={t("account.settings.fee.rateAria", {
                  n: m.tyLePercent,
                })}
              >
                <span className="uas-phi-timeline-rate-num">{m.tyLePercent}</span>
                <span className="uas-phi-timeline-rate-pct">%</span>
              </p>
              {m.title ? (
                <p className="uas-phi-timeline-title">{m.title}</p>
              ) : null}
              {m.note ? (
                <p className="uas-phi-timeline-note">{m.note}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <dl className="uas-phi-panel-stats">
        {stats.map((s) => (
          <div key={s.k} className="uas-phi-stat">
            <dt className="uas-phi-stat-k">{s.k}</dt>
            <dd className="uas-phi-stat-v">{s.v}</dd>
            <dd className="uas-phi-stat-note">{s.note}</dd>
          </div>
        ))}
      </dl>

      <Link
        href={webHref(chinhSachHref || "/policies/marketplace-fee")}
        className="uas-phi-panel-link"
      >
        {t("account.settings.fee.policyLink")}
        <ChevronRight size={14} aria-hidden />
      </Link>
    </aside>
  );
}

function BanHangSettingsSection({ titleId }: { titleId: string }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const termsDisplay = shopTermsForLocale(locale);

  type BanHangJson = {
    enabled?: boolean;
    shopVisible?: boolean;
    shopReady?: boolean;
    shopSetupHref?: string | null;
            phiSan?: {
      dangApDung?: {
        tyLePercent?: number;
        nguongVnd?: number;
        toiThieuXuatKyVnd?: number;
        soNgayHanTra?: number;
        camKetCongBoTruocNgay?: number;
      };
      thongBao?: Array<{
        id: string;
        tieuDe: string;
        noiDung: string;
        tyLeDuKien: number | null;
        hieuLucDuKien: string | null;
        congBoLuc: string;
      }>;
      chinhSachHref?: string;
    };
    error?: string;
  };

  const [enabled, setEnabled] = useState(false);
  const [shopVisible, setShopVisible] = useState(false);
  const [shopReady, setShopReady] = useState(false);
  const [shopSetupHref, setShopSetupHref] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [phiSan, setPhiSan] = useState<BanHangJson["phiSan"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function applyBanHangJson(json: BanHangJson | null) {
    const next = json?.enabled === true;
    setEnabled(next);
    setShopVisible(next && json?.shopVisible === true);
    setShopReady(json?.shopReady === true);
    setShopSetupHref(
      typeof json?.shopSetupHref === "string" ? json.shopSetupHref : null,
    );
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/user/seller", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as BanHangJson | null;
        if (cancelled) return;
        if (!res.ok) {
          setErr(json?.error ?? t("account.settings.selling.loadError"));
          return;
        }
        applyBanHangJson(json);
        setAcceptTerms(json?.enabled === true);
        if (json?.phiSan) setPhiSan(json.phiSan);
      } catch {
        if (!cancelled) setErr(t("account.settings.selling.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function patchBanHang(body: Record<string, unknown>) {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/user/seller", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as BanHangJson | null;
      if (!res.ok) {
        setErr(json?.error ?? t("account.settings.selling.saveError"));
        return;
      }
      applyBanHangJson(json);
      const next = json?.enabled === true;
      invalidateShopClientCaches();
      window.dispatchEvent(
        new CustomEvent("cins:ban-hang-changed", {
          detail: {
            enabled: next,
            shopVisible: next && json?.shopVisible === true,
          },
        }),
      );
      // Topbar (ShopTopbarButton) + Journey shop tab lấy cờ từ server.
      router.refresh();
    } catch {
      setErr(t("account.settings.selling.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function saveEnabled(nextEnabled: boolean) {
    if (nextEnabled && !acceptTerms) {
      setErr(t("account.settings.selling.needTerms"));
      return;
    }
    await patchBanHang({
      enabled: nextEnabled,
      acceptTerms: nextEnabled ? true : false,
    });
  }

  async function saveShopVisible(nextVisible: boolean) {
    await patchBanHang({ shopVisible: nextVisible });
  }

  return (
    <section className="uas-section" aria-labelledby={titleId}>
      <div className="uas-section-head">
        <h3 id={titleId} className="uas-section-title">
          {t("account.settings.nav.selling")}
        </h3>
      </div>

      {loading ? (
        <p className="uas-section-hint">
          <Loader2 size={14} className="shop-spin" /> {t("account.settings.loading")}
        </p>
      ) : (
        <>
          {err ? (
            <p className="uas-section-hint" style={{ color: "#b42318" }}>
              {err}
            </p>
          ) : null}

          <div className="uas-toggle-row" style={{ marginBottom: 12 }}>
            <span className="uas-toggle-text">
              <span className="uas-toggle-label">
                {t("account.settings.selling.enable")}
              </span>
              <span className="uas-toggle-desc">
                {t("account.settings.selling.enableDesc")}
              </span>
            </span>
            <button
              type="button"
              className={`uas-switch${enabled ? " on" : ""}`}
              role="switch"
              aria-checked={enabled}
              aria-label={t("account.settings.selling.enable")}
              disabled={saving}
              onClick={() => void saveEnabled(!enabled)}
            >
              <span className="uas-switch-knob" aria-hidden />
            </button>
          </div>

          {enabled ? (
            <div className="uas-toggle-row" style={{ marginBottom: 12 }}>
              <span className="uas-toggle-text">
                <span className="uas-toggle-label">
                  {t("account.settings.selling.showShop")}
                </span>
                <span className="uas-toggle-desc">
                  {t("account.settings.selling.showShopDesc")}
                </span>
              </span>
              <button
                type="button"
                className={`uas-switch${shopVisible ? " on" : ""}`}
                role="switch"
                aria-checked={shopVisible}
                aria-label={t("account.settings.selling.showShop")}
                disabled={saving}
                onClick={() => void saveShopVisible(!shopVisible)}
              >
                <span className="uas-switch-knob" aria-hidden />
              </button>
            </div>
          ) : null}

          {!enabled ? (
            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <span>
                {t("account.settings.selling.acceptTerms")}
              </span>
            </label>
          ) : null}

          <details open style={{ marginBottom: 16 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
              {termsDisplay.title}
            </summary>
            <TermsBody body={termsDisplay.body} />
          </details>

          {phiSan?.dangApDung ? (
            <PhiSanPanel
              dangApDung={phiSan.dangApDung}
              thongBao={phiSan.thongBao}
              chinhSachHref={phiSan.chinhSachHref}
            />
          ) : null}

          {enabled ? (
            <div>
              {shopReady ? (
                <Link href={manageSellerHref("/seller/inventory")} className="uas-btn primary">
                  {t("account.settings.selling.manage")}
                </Link>
              ) : shopSetupHref ? (
                <>
                  <Link href={shopSetupHref} className="uas-btn primary">
                    {t("account.settings.selling.setupShop")}
                  </Link>
                  <p className="uas-section-hint" style={{ marginTop: 8 }}>
                    {t("account.settings.selling.setupHint")}
                  </p>
                </>
              ) : (
                <p className="uas-section-hint">
                  {t("account.settings.selling.noHref")}
                </p>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

type UmPage = {
  items: MutualFriendProfile[];
  hasMore: boolean;
  nextOffset: number;
};

/**
 * Mục "Quản lý người dùng" — ba tab: bạn bè, lời mời chờ xác nhận, và người đã
 * chặn. Mỗi tab tải theo trang. Tab «Bạn bè»: hủy kết bạn (DELETE
 * /api/ket-ban/:ketBanId) hoặc chặn (POST /api/ket-ban/:userId/block). Tab
 * «Chờ xác nhận»: chấp nhận / từ chối lời mời (PATCH /api/ket-ban/:ketBanId).
 * Tab «Đã chặn»: bỏ chặn (DELETE /api/ket-ban/:userId/block).
 */
function UserManagementSection({ titleId }: { titleId: string }) {
  const t = useT();
  const [tab, setTab] = useState<UmTab>("friends");
  const [friends, setFriends] = useState<MutualFriendProfile[]>([]);
  const [pending, setPending] = useState<MutualFriendProfile[]>([]);
  const [blocked, setBlocked] = useState<MutualFriendProfile[]>([]);
  const [loaded, setLoaded] = useState<Record<UmTab, boolean>>({
    friends: false,
    pending: false,
    blocked: false,
  });
  const [hasMore, setHasMore] = useState<Record<UmTab, boolean>>({
    friends: false,
    pending: false,
    blocked: false,
  });
  const [nextOffset, setNextOffset] = useState<Record<UmTab, number>>({
    friends: 0,
    pending: 0,
    blocked: 0,
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [friendActionId, setFriendActionId] = useState<string | null>(null);
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (which: UmTab, offset: number): Promise<UmPage> => {
      const url =
        which === "friends"
          ? `/api/friends/list?offset=${offset}`
          : which === "pending"
            ? `/api/friends/requests`
            : `/api/friends/blocked?offset=${offset}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as
        | {
            friends?: MutualFriendProfile[];
            users?: MutualFriendProfile[];
            invites?: MutualFriendProfile[];
            hasMore?: boolean;
            nextOffset?: number;
            error?: string;
          }
        | null;
      if (!res.ok || !json) {
        throw new Error(json?.error ?? t("account.settings.users.listFail"));
      }
      const items =
        (which === "friends"
          ? json.friends
          : which === "pending"
            ? json.invites
            : json.users) ?? [];
      return {
        items,
        hasMore: json.hasMore === true,
        nextOffset: Number(json.nextOffset ?? offset),
      };
    },
    [t],
  );

  const loadInitial = useCallback(
    async (which: UmTab) => {
      setLoading(true);
      setErr(null);
      try {
        const page = await fetchPage(which, 0);
        if (which === "friends") setFriends(page.items);
        else if (which === "pending") setPending(page.items);
        else setBlocked(page.items);
        setHasMore((prev) => ({ ...prev, [which]: page.hasMore }));
        setNextOffset((prev) => ({ ...prev, [which]: page.nextOffset }));
        setLoaded((prev) => ({ ...prev, [which]: true }));
      } catch (e) {
        setErr(e instanceof Error ? e.message : t("account.settings.users.listFail"));
      } finally {
        setLoading(false);
      }
    },
    [fetchPage, t],
  );

  useEffect(() => {
    if (!loaded[tab]) void loadInitial(tab);
  }, [tab, loaded, loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    setErr(null);
    try {
      const page = await fetchPage(tab, nextOffset[tab]);
      if (tab === "friends") {
        setFriends((prev) => [...prev, ...page.items]);
      } else if (tab === "pending") {
        setPending((prev) => [...prev, ...page.items]);
      } else {
        setBlocked((prev) => [...prev, ...page.items]);
      }
      setHasMore((prev) => ({ ...prev, [tab]: page.hasMore }));
      setNextOffset((prev) => ({ ...prev, [tab]: page.nextOffset }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("account.settings.users.loadMoreFail"));
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, fetchPage, tab, nextOffset, t]);

  const unblock = useCallback(
    async (userId: string) => {
      if (unblockingId) return;
      setUnblockingId(userId);
      setErr(null);
      try {
        const res = await fetch(`/api/friends/${userId}/block`, {
          method: "DELETE",
        });
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          setErr(json?.error ?? t("account.settings.users.unblockFail"));
          return;
        }
        setBlocked((prev) => prev.filter((u) => u.idNguoiDung !== userId));
      } catch {
        setErr(t("account.settings.users.unblockFail"));
      } finally {
        setUnblockingId(null);
      }
    },
    [unblockingId, t],
  );

  const unfriend = useCallback(
    async (friend: MutualFriendProfile) => {
      if (friendActionId) return;
      if (!friend.ketBanId) {
        setErr(t("account.settings.users.noFriendship"));
        return;
      }
      if (
        !window.confirm(
          t("account.settings.users.unfriendConfirm", {
            name: friend.tenHienThi,
          }),
        )
      ) {
        return;
      }
      setFriendActionId(friend.idNguoiDung);
      setErr(null);
      try {
        const res = await fetch(`/api/friends/${friend.ketBanId}`, {
          method: "DELETE",
        });
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          setErr(json?.error ?? t("account.settings.users.unfriendFail"));
          return;
        }
        setFriends((prev) =>
          prev.filter((f) => f.idNguoiDung !== friend.idNguoiDung),
        );
      } catch {
        setErr(t("account.settings.users.unfriendFail"));
      } finally {
        setFriendActionId(null);
      }
    },
    [friendActionId, t],
  );

  const blockFriend = useCallback(
    async (friend: MutualFriendProfile) => {
      if (friendActionId) return;
      if (
        !window.confirm(
          t("account.settings.users.blockConfirm", {
            name: friend.tenHienThi,
          }),
        )
      ) {
        return;
      }
      setFriendActionId(friend.idNguoiDung);
      setErr(null);
      try {
        const res = await fetch(`/api/friends/${friend.idNguoiDung}/block`, {
          method: "POST",
        });
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          setErr(json?.error ?? t("account.settings.users.blockFail"));
          return;
        }
        setFriends((prev) =>
          prev.filter((f) => f.idNguoiDung !== friend.idNguoiDung),
        );
        // Buộc tab «Đã chặn» tải lại để thấy người vừa chặn.
        setLoaded((prev) => ({ ...prev, blocked: false }));
      } catch {
        setErr(t("account.settings.users.blockFail"));
      } finally {
        setFriendActionId(null);
      }
    },
    [friendActionId, t],
  );

  const respondInvite = useCallback(
    async (friend: MutualFriendProfile, action: "accept" | "decline") => {
      if (inviteActionId) return;
      if (!friend.ketBanId) {
        setErr(t("account.settings.users.noInvite"));
        return;
      }
      setInviteActionId(friend.idNguoiDung);
      setErr(null);
      try {
        const res = await fetch(`/api/friends/${friend.ketBanId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          setErr(json?.error ?? t("account.settings.users.inviteFail"));
          return;
        }
        setPending((prev) =>
          prev.filter((f) => f.idNguoiDung !== friend.idNguoiDung),
        );
        window.dispatchEvent(new Event("cins:notifications-changed"));
        // Chấp nhận → thêm bạn mới; buộc tab «Bạn bè» tải lại.
        if (action === "accept") {
          setLoaded((prev) => ({ ...prev, friends: false }));
        }
      } catch {
        setErr(t("account.settings.users.inviteFail"));
      } finally {
        setInviteActionId(null);
      }
    },
    [inviteActionId, t],
  );

  const list =
    tab === "friends" ? friends : tab === "pending" ? pending : blocked;
  const emptyText =
    tab === "friends"
      ? t("account.settings.users.emptyFriends")
      : tab === "pending"
        ? t("account.settings.users.emptyPending")
        : t("account.settings.users.emptyBlocked");

  return (
    <section className="uas-section" aria-labelledby={titleId}>
      <div className="uas-section-head">
        <h3 id={titleId} className="uas-section-title">
          {t("account.settings.nav.users")}
        </h3>
        <p className="uas-section-hint">{t("account.settings.users.hint")}</p>
      </div>

      <div
        className="uas-tabs"
        role="tablist"
        aria-label={t("account.settings.users.tabsAria")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "friends"}
          className={`uas-tab${tab === "friends" ? " on" : ""}`}
          onClick={() => setTab("friends")}
        >
          <Users size={15} strokeWidth={2} aria-hidden />
          {t("account.settings.users.friends")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pending"}
          className={`uas-tab${tab === "pending" ? " on" : ""}`}
          onClick={() => setTab("pending")}
        >
          <Clock3 size={15} strokeWidth={2} aria-hidden />
          {t("account.settings.users.pending")}
          {pending.length > 0 ? (
            <span className="uas-tab-count">{pending.length}</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "blocked"}
          className={`uas-tab${tab === "blocked" ? " on" : ""}`}
          onClick={() => setTab("blocked")}
        >
          <Ban size={15} strokeWidth={2} aria-hidden />
          {t("account.settings.users.blocked")}
        </button>
      </div>

      {loading ? (
        <div className="uas-loading">
          <Loader2 size={18} className="uas-spin" aria-hidden />
          <span>{t("account.settings.loading")}</span>
        </div>
      ) : list.length === 0 ? (
        <div className="uas-empty">
          <UserRoundX size={26} strokeWidth={1.6} aria-hidden />
          <span>{emptyText}</span>
        </div>
      ) : (
        <ul className="uas-user-list" role="list">
          {list.map((u) => {
            const sub = u.tinhThanh?.trim() || (u.slug ? `@${u.slug}` : "");
            return (
              <li key={u.idNguoiDung} className="uas-user-row">
                <a
                  className="uas-user-main"
                  href={u.slug ? `/${u.slug}` : undefined}
                >
                  <span className="uas-user-avatar" aria-hidden>
                    {u.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatarUrl} alt="" />
                    ) : (
                      <span className="uas-user-avatar-fallback">
                        {(u.tenHienThi ?? "?").trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="uas-user-meta">
                    <span className="uas-user-name">{u.tenHienThi}</span>
                    {sub ? <span className="uas-user-sub">{sub}</span> : null}
                  </span>
                </a>
                {tab === "blocked" ? (
                  <button
                    type="button"
                    className="uas-btn ghost uas-user-action"
                    disabled={unblockingId === u.idNguoiDung}
                    onClick={() => void unblock(u.idNguoiDung)}
                  >
                    {unblockingId === u.idNguoiDung ? (
                      <>
                        <Loader2 size={14} className="uas-spin" aria-hidden />
                        {t("account.settings.users.unblocking")}
                      </>
                    ) : (
                      t("account.settings.users.unblock")
                    )}
                  </button>
                ) : tab === "pending" ? (
                  <div className="uas-user-actions">
                    {inviteActionId === u.idNguoiDung ? (
                      <span className="uas-user-icon-btn is-busy" aria-hidden>
                        <Loader2 size={16} className="uas-spin" />
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="uas-btn primary uas-user-action"
                          onClick={() => void respondInvite(u, "accept")}
                        >
                          <Check size={15} strokeWidth={2.4} aria-hidden />
                          {t("account.settings.users.accept")}
                        </button>
                        <button
                          type="button"
                          className="uas-user-icon-btn"
                          title={t("account.settings.users.decline")}
                          aria-label={t("account.settings.users.declineFrom", {
                            name: u.tenHienThi,
                          })}
                          onClick={() => void respondInvite(u, "decline")}
                        >
                          <X size={16} strokeWidth={2.2} aria-hidden />
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="uas-user-actions">
                    {friendActionId === u.idNguoiDung ? (
                      <span className="uas-user-icon-btn is-busy" aria-hidden>
                        <Loader2 size={16} className="uas-spin" />
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="uas-user-icon-btn"
                          title={t("account.settings.users.unfriend")}
                          aria-label={t("account.settings.users.unfriendWith", {
                            name: u.tenHienThi,
                          })}
                          onClick={() => void unfriend(u)}
                        >
                          <UserMinus size={16} strokeWidth={2} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="uas-user-icon-btn is-danger"
                          title={t("account.settings.users.block")}
                          aria-label={t("account.settings.users.blockName", {
                            name: u.tenHienThi,
                          })}
                          onClick={() => void blockFriend(u)}
                        >
                          <Ban size={16} strokeWidth={2} aria-hidden />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!loading && hasMore[tab] ? (
        <button
          type="button"
          className="uas-more"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? (
            <>
              <Loader2 size={15} className="uas-spin" aria-hidden />
              {t("account.settings.loading")}
            </>
          ) : (
            t("account.settings.users.more")
          )}
        </button>
      ) : null}

      {err ? (
        <p className="uas-err" role="alert">
          {err}
        </p>
      ) : null}
    </section>
  );
}

type TwoFactorStatus = { enabled: boolean; phoneMasked: string | null };

/**
 * Mục "Bảo mật 2 lớp" — quản state riêng, hành động inline (không dùng footer
 * "Lưu thay đổi" của Journey). Luồng: chưa bật → nhập SĐT → gửi mã → xác minh.
 */
function TwoFactorSection({ titleId }: { titleId: string }) {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<TwoFactorStatus>({
    enabled: false,
    phoneMasked: null,
  });
  const [step, setStep] = useState<"idle" | "sent">("idle");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<number | null>(null);

  const startCooldown = useCallback((sec: number) => {
    setCooldown(sec);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCooldown((v) => {
        if (v <= 1 && timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return v - 1 > 0 ? v - 1 : 0;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/user/two-factor", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as
        | (TwoFactorStatus & { error?: string })
        | null;
      if (!res.ok || !json) {
        setErr(json?.error ?? t("account.settings.security.statusFail"));
        return;
      }
      setStatus({ enabled: json.enabled === true, phoneMasked: json.phoneMasked ?? null });
    } catch {
      setErr(t("account.settings.security.statusFail"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const sendCode = useCallback(async () => {
    if (sending || cooldown > 0) return;
    setSending(true);
    setErr(null);
    setNotice(null);
    try {
      const res = await fetch("/api/user/two-factor/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        cooldownSec?: number;
        devCode?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        setErr(json?.error ?? t("account.settings.security.soon"));
        if (typeof json?.cooldownSec === "number") startCooldown(json.cooldownSec);
        return;
      }
      setStep("sent");
      setCode("");
      startCooldown(json.cooldownSec ?? 60);
      // devCode chỉ có ở môi trường dev (stub SMS) — giúp thử luồng.
      setNotice(
        json.devCode
          ? t("account.settings.security.devCode", { code: json.devCode })
          : t("account.settings.security.sent"),
      );
    } catch {
      setErr(t("account.settings.security.soon"));
    } finally {
      setSending(false);
    }
  }, [sending, cooldown, phone, startCooldown, t]);

  const verify = useCallback(async () => {
    if (verifying) return;
    setVerifying(true);
    setErr(null);
    try {
      const res = await fetch("/api/user/two-factor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const json = (await res.json().catch(() => null)) as
        | (TwoFactorStatus & { error?: string })
        | null;
      if (!res.ok || !json?.enabled) {
        setErr(json?.error ?? t("account.settings.security.badCode"));
        return;
      }
      setStatus({ enabled: true, phoneMasked: json.phoneMasked ?? null });
      setStep("idle");
      setPhone("");
      setCode("");
      setNotice(null);
    } catch {
      setErr(t("account.settings.security.verifyFail"));
    } finally {
      setVerifying(false);
    }
  }, [verifying, phone, code, t]);

  const disable2fa = useCallback(async () => {
    if (disabling) return;
    setDisabling(true);
    setErr(null);
    try {
      const res = await fetch("/api/user/two-factor", { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as
        | (TwoFactorStatus & { error?: string })
        | null;
      if (!res.ok || json?.enabled !== false) {
        setErr(json?.error ?? t("account.settings.security.disableFail"));
        return;
      }
      setStatus({ enabled: false, phoneMasked: null });
      setStep("idle");
      setPhone("");
      setCode("");
      setNotice(null);
    } catch {
      setErr(t("account.settings.security.disableFail"));
    } finally {
      setDisabling(false);
    }
  }, [disabling, t]);

  return (
    <section className="uas-section" aria-labelledby={titleId}>
      <div className="uas-section-head">
        <h3 id={titleId} className="uas-section-title">
          {t("account.settings.nav.security")}
        </h3>
        <p className="uas-section-hint">{t("account.settings.security.hint")}</p>
      </div>

      {loading ? (
        <div className="uas-loading">
          <Loader2 size={18} className="uas-spin" aria-hidden />
          <span>{t("account.settings.loading")}</span>
        </div>
      ) : status.enabled ? (
        <div className="uas-2fa-status on">
          <span className="uas-2fa-status-ico" aria-hidden>
            <ShieldCheck size={22} strokeWidth={1.8} />
          </span>
          <span className="uas-2fa-status-text">
            <span className="uas-2fa-status-label">
              {t("account.settings.security.on")}
            </span>
            <span className="uas-2fa-status-desc">
              {t("account.settings.security.phone", {
                phone: status.phoneMasked ?? t("account.settings.security.verified"),
              })}
            </span>
          </span>
          <button
            type="button"
            className="uas-btn ghost"
            disabled={disabling}
            onClick={() => void disable2fa()}
          >
            {disabling ? (
              <>
                <Loader2 size={15} className="uas-spin" aria-hidden />
                {t("account.settings.security.disabling")}
              </>
            ) : (
              t("account.settings.security.off")
            )}
          </button>
        </div>
      ) : (
        <div className="uas-2fa-enroll">
          <label className="uas-field">
            <span className="uas-field-label">
              {t("account.settings.security.phoneLabel")}
            </span>
            <div className="uas-field-row">
              <span className="uas-field-ico" aria-hidden>
                <Smartphone size={18} strokeWidth={1.8} />
              </span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="uas-input"
                placeholder={t("account.settings.security.phonePh")}
                value={phone}
                disabled={step === "sent"}
                onChange={(e) => setPhone(e.target.value)}
              />
              <button
                type="button"
                className="uas-btn primary"
                disabled={sending || cooldown > 0 || phone.trim().length < 9}
                onClick={() => void sendCode()}
              >
                {sending ? (
                  <>
                    <Loader2 size={15} className="uas-spin" aria-hidden />
                    {t("account.settings.security.sending")}
                  </>
                ) : cooldown > 0 ? (
                  t("account.settings.security.resendIn", { s: cooldown })
                ) : step === "sent" ? (
                  t("account.settings.security.resend")
                ) : (
                  t("account.settings.security.send")
                )}
              </button>
            </div>
          </label>

          {step === "sent" ? (
            <label className="uas-field">
              <span className="uas-field-label">
                {t("account.settings.security.codeLabel")}
              </span>
              <div className="uas-field-row">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="uas-input uas-input-otp"
                  placeholder="______"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                <button
                  type="button"
                  className="uas-btn primary"
                  disabled={verifying || code.length !== 6}
                  onClick={() => void verify()}
                >
                  {verifying ? (
                    <>
                      <Loader2 size={15} className="uas-spin" aria-hidden />
                      {t("account.settings.security.verifying")}
                    </>
                  ) : (
                    t("account.settings.security.verifyOn")
                  )}
                </button>
              </div>
            </label>
          ) : null}

          {notice ? <p className="uas-2fa-notice">{notice}</p> : null}
        </div>
      )}

      {err ? (
        <p className="uas-err" role="alert">
          {err}
        </p>
      ) : null}
    </section>
  );
}
