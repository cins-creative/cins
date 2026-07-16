"use client";

import {
  Ban,
  Building2,
  Check,
  Clock3,
  Globe,
  LayoutGrid,
  Loader2,
  Monitor,
  Moon,
  Rows3,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sun,
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

import { LayoutThumbIcon } from "@/components/editor/LayoutThumbIcon";
import type { MutualFriendProfile } from "@/lib/social/types";

import {
  HOME_FEED_LAYOUT_OPTIONS,
  readHomeFeedLayout,
  setHomeFeedLayout,
  type HomeFeedLayout,
} from "@/lib/home/home-feed-layout";
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
import {
  THEME_MODE_OPTIONS,
  readThemeMode,
  setThemeMode as persistThemeMode,
  watchSystemTheme,
  type ThemeMode,
} from "@/lib/theme/theme-mode";

import "./user-account-settings-modal.css";

type SettingsSection =
  | "journey-display"
  | "appearance"
  | "user-management"
  | "security-2fa";

const NAV: ReadonlyArray<{ id: SettingsSection; label: string }> = [
  { id: "journey-display", label: "Cài đặt bố cục" },
  { id: "appearance", label: "Giao diện" },
  { id: "user-management", label: "Quản lý người dùng" },
  { id: "security-2fa", label: "Bảo mật 2 lớp" },
];

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

const THEME_ICON: Record<ThemeMode, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function UserAccountSettingsModal({ open, onClose }: Props) {
  const titleId = useId();
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
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

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
        setErr(json?.error ?? "Không tải được cài đặt.");
        return;
      }
      const view = normalizeJourneyDefaultView(json.view);
      const apply = json.applyToMe === true;
      setSelected(view);
      setInitial(view);
      setApplyToMe(apply);
      setInitialApplyToMe(apply);
    } catch {
      setErr("Không tải được cài đặt.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSection("journey-display");
    setLayoutTab("profile");
    setSavedTick(false);
    setThemeMode(readThemeMode());
    setHomeLayout(readHomeFeedLayout());
    setFeedSource(readFeedSourceDefault());
    void loadSettings();
  }, [open, loadSettings]);

  const chooseTheme = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    persistThemeMode(mode);
  }, []);

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
    return watchSystemTheme(themeMode, () => persistThemeMode(themeMode));
  }, [open, themeMode]);

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
        setErr(json?.error ?? "Không lưu được lựa chọn.");
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
      setErr("Không lưu được lựa chọn.");
    } finally {
      setSaving(false);
    }
  }, [saving, dirty, selected, applyToMe]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="uas-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="uas-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="uas-head">
          <div className="uas-head-copy">
            <Settings2 size={18} strokeWidth={2} aria-hidden />
            <h2 id={titleId} className="uas-title">
              Cài đặt
            </h2>
          </div>
          <button
            type="button"
            className="uas-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="uas-layout">
          <nav className="uas-nav" aria-label="Mục cài đặt">
            {NAV.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`uas-nav-btn${section === id ? " on" : ""}`}
                aria-current={section === id ? "true" : undefined}
                onClick={() => setSection(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="uas-body">
            {section === "journey-display" ? (
              <section className="uas-section" aria-labelledby={`${titleId}-jd`}>
                <div className="uas-section-head">
                  <h3 id={`${titleId}-jd`} className="uas-section-title">
                    Cài đặt bố cục
                  </h3>
                  <p className="uas-section-hint">
                    Tuỳ chỉnh cách hiển thị trang cá nhân của bạn và bố cục
                    trang chủ. Bạn vẫn có thể chuyển qua lại bất cứ lúc nào.
                  </p>
                </div>

                <div
                  className="uas-tabs"
                  role="tablist"
                  aria-label="Nhóm bố cục"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={layoutTab === "profile"}
                    className={`uas-tab${layoutTab === "profile" ? " on" : ""}`}
                    onClick={() => setLayoutTab("profile")}
                  >
                    <Clock3 size={15} strokeWidth={2} aria-hidden />
                    Trang cá nhân
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={layoutTab === "home"}
                    className={`uas-tab${layoutTab === "home" ? " on" : ""}`}
                    onClick={() => setLayoutTab("home")}
                  >
                    <LayoutGrid size={15} strokeWidth={2} aria-hidden />
                    Trang chủ
                  </button>
                </div>

                {layoutTab === "profile" ? (
                  <>
                    <p className="uas-section-hint uas-tab-hint">
                      Chọn chế độ hiện khi vào trang từ bên ngoài. Đang xem
                      Journey hay Gallery thì refresh và tương tác sẽ giữ nguyên
                      chế độ đó.
                    </p>

                    {loading ? (
                      <div className="uas-loading">
                        <Loader2 size={18} className="uas-spin" aria-hidden />
                        <span>Đang tải…</span>
                      </div>
                    ) : (
                      <div
                        className="uas-options"
                        role="radiogroup"
                        aria-label="Chế độ hiển thị mặc định"
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
                                  {opt.label}
                                </span>
                                <span className="uas-option-desc">
                                  {opt.desc}
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

                    {!loading ? (
                      <div className="uas-toggle-row">
                        <span className="uas-toggle-text">
                          <span className="uas-toggle-label">
                            Áp dụng cho tôi
                          </span>
                          <span className="uas-toggle-desc">
                            Bật để chính bạn cũng thấy chế độ này khi mở trang
                            mình; tắt thì chỉ áp cho người khác.
                          </span>
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={applyToMe}
                          aria-label="Áp dụng cho tôi"
                          className={`uas-switch${applyToMe ? " on" : ""}`}
                          onClick={() => setApplyToMe((v) => !v)}
                        >
                          <span className="uas-switch-knob" aria-hidden />
                        </button>
                      </div>
                    ) : null}

                    {err ? (
                      <p className="uas-err" role="alert">
                        {err}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="uas-section-hint uas-tab-hint">
                      Chọn cách trang chủ hiện lần đầu bạn mở. Lựa chọn được lưu
                      trên máy này và áp dụng ngay.
                    </p>

                    <div
                      className="uas-options"
                      role="radiogroup"
                      aria-label="Bố cục trang chủ"
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
                            className={`uas-option${active ? " on" : ""}`}
                            onClick={() => chooseHomeLayout(opt.value)}
                          >
                            <span className="uas-option-ico" aria-hidden>
                              <Icon size={20} strokeWidth={1.8} />
                            </span>
                            <span className="uas-option-text">
                              <span className="uas-option-label">
                                {opt.label}
                              </span>
                              <span className="uas-option-desc">
                                {opt.desc}
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

                    <p className="uas-section-hint uas-tab-hint">
                      Nguồn nội dung mặc định trên trang chủ. Bạn vẫn đổi nhanh
                      được ngay trên thanh lọc của feed.
                    </p>

                    <div
                      className="uas-options"
                      role="radiogroup"
                      aria-label="Nguồn nội dung mặc định"
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
                            className={`uas-option${active ? " on" : ""}`}
                            onClick={() => chooseFeedSource(opt.value)}
                          >
                            <span className="uas-option-ico" aria-hidden>
                              <Icon size={20} strokeWidth={1.8} />
                            </span>
                            <span className="uas-option-text">
                              <span className="uas-option-label">
                                {opt.label}
                              </span>
                              <span className="uas-option-desc">
                                {opt.desc}
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
                  </>
                )}
              </section>
            ) : null}

            {section === "appearance" ? (
              <section className="uas-section" aria-labelledby={`${titleId}-th`}>
                <div className="uas-section-head">
                  <h3 id={`${titleId}-th`} className="uas-section-title">
                    Giao diện
                  </h3>
                  <p className="uas-section-hint">
                    Chọn nền sáng, tối hoặc để giao diện tự đổi theo cài đặt của
                    thiết bị. Lựa chọn được lưu trên máy này và áp dụng ngay.
                  </p>
                </div>

                <div
                  className="uas-options"
                  role="radiogroup"
                  aria-label="Chế độ giao diện"
                >
                  {THEME_MODE_OPTIONS.map((opt) => {
                    const Icon = THEME_ICON[opt.value];
                    const active = themeMode === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`uas-option${active ? " on" : ""}`}
                        onClick={() => chooseTheme(opt.value)}
                      >
                        <span className="uas-option-ico" aria-hidden>
                          <Icon size={20} strokeWidth={1.8} />
                        </span>
                        <span className="uas-option-text">
                          <span className="uas-option-label">{opt.label}</span>
                          <span className="uas-option-desc">{opt.desc}</span>
                        </span>
                        <span className="uas-option-check" aria-hidden>
                          {active ? <Check size={16} strokeWidth={2.4} /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
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
          {savedTick ? (
            <span className="uas-saved" aria-live="polite">
              <Check size={15} strokeWidth={2.4} aria-hidden />
              Đã lưu
            </span>
          ) : (
            <span />
          )}
          <div className="uas-foot-actions">
            <button type="button" className="uas-btn ghost" onClick={onClose}>
              {dirty ? "Huỷ" : "Đóng"}
            </button>
            <button
              type="button"
              className="uas-btn primary"
              disabled={!dirty || saving || loading}
              onClick={() => void save()}
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="uas-spin" aria-hidden />
                  Đang lưu…
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

type UmTab = "friends" | "pending" | "blocked";

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
          ? `/api/ket-ban/danh-sach?offset=${offset}`
          : which === "pending"
            ? `/api/ket-ban/loi-moi`
            : `/api/ket-ban/chan?offset=${offset}`;
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
        throw new Error(json?.error ?? "Không tải được danh sách.");
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
    [],
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
        setErr(e instanceof Error ? e.message : "Không tải được danh sách.");
      } finally {
        setLoading(false);
      }
    },
    [fetchPage],
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
      setErr(e instanceof Error ? e.message : "Không tải thêm được.");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, fetchPage, tab, nextOffset]);

  const unblock = useCallback(
    async (userId: string) => {
      if (unblockingId) return;
      setUnblockingId(userId);
      setErr(null);
      try {
        const res = await fetch(`/api/ket-ban/${userId}/block`, {
          method: "DELETE",
        });
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          setErr(json?.error ?? "Không bỏ chặn được.");
          return;
        }
        setBlocked((prev) => prev.filter((u) => u.idNguoiDung !== userId));
      } catch {
        setErr("Không bỏ chặn được.");
      } finally {
        setUnblockingId(null);
      }
    },
    [unblockingId],
  );

  const unfriend = useCallback(
    async (friend: MutualFriendProfile) => {
      if (friendActionId) return;
      if (!friend.ketBanId) {
        setErr("Không tìm thấy quan hệ bạn bè để hủy.");
        return;
      }
      if (
        !window.confirm(
          `Hủy kết bạn với ${friend.tenHienThi}? Hai bạn sẽ không còn là bạn bè.`,
        )
      ) {
        return;
      }
      setFriendActionId(friend.idNguoiDung);
      setErr(null);
      try {
        const res = await fetch(`/api/ket-ban/${friend.ketBanId}`, {
          method: "DELETE",
        });
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          setErr(json?.error ?? "Không hủy kết bạn được.");
          return;
        }
        setFriends((prev) =>
          prev.filter((f) => f.idNguoiDung !== friend.idNguoiDung),
        );
      } catch {
        setErr("Không hủy kết bạn được.");
      } finally {
        setFriendActionId(null);
      }
    },
    [friendActionId],
  );

  const blockFriend = useCallback(
    async (friend: MutualFriendProfile) => {
      if (friendActionId) return;
      if (
        !window.confirm(
          `Chặn ${friend.tenHienThi}? Hai bạn sẽ không còn là bạn bè và không nhắn tin cho nhau được.`,
        )
      ) {
        return;
      }
      setFriendActionId(friend.idNguoiDung);
      setErr(null);
      try {
        const res = await fetch(`/api/ket-ban/${friend.idNguoiDung}/block`, {
          method: "POST",
        });
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          setErr(json?.error ?? "Không chặn được người dùng.");
          return;
        }
        setFriends((prev) =>
          prev.filter((f) => f.idNguoiDung !== friend.idNguoiDung),
        );
        // Buộc tab «Đã chặn» tải lại để thấy người vừa chặn.
        setLoaded((prev) => ({ ...prev, blocked: false }));
      } catch {
        setErr("Không chặn được người dùng.");
      } finally {
        setFriendActionId(null);
      }
    },
    [friendActionId],
  );

  const respondInvite = useCallback(
    async (friend: MutualFriendProfile, action: "accept" | "decline") => {
      if (inviteActionId) return;
      if (!friend.ketBanId) {
        setErr("Không tìm thấy lời mời để xử lý.");
        return;
      }
      setInviteActionId(friend.idNguoiDung);
      setErr(null);
      try {
        const res = await fetch(`/api/ket-ban/${friend.ketBanId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          setErr(json?.error ?? "Không xử lý được lời mời.");
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
        setErr("Không xử lý được lời mời.");
      } finally {
        setInviteActionId(null);
      }
    },
    [inviteActionId],
  );

  const list =
    tab === "friends" ? friends : tab === "pending" ? pending : blocked;
  const emptyText =
    tab === "friends"
      ? "Bạn chưa có người bạn nào."
      : tab === "pending"
        ? "Không có lời mời kết bạn nào đang chờ xác nhận."
        : "Bạn chưa chặn ai. Người bị chặn sẽ không nhắn tin cho bạn được.";

  return (
    <section className="uas-section" aria-labelledby={titleId}>
      <div className="uas-section-head">
        <h3 id={titleId} className="uas-section-title">
          Quản lý người dùng
        </h3>
        <p className="uas-section-hint">
          Quản lý bạn bè, lời mời kết bạn đang chờ, và những người bạn đã chặn.
          Bạn có thể chấp nhận / từ chối lời mời, hủy kết bạn, chặn một người,
          hoặc bỏ chặn để nhắn tin lại bất cứ lúc nào.
        </p>
      </div>

      <div className="uas-tabs" role="tablist" aria-label="Nhóm người dùng">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "friends"}
          className={`uas-tab${tab === "friends" ? " on" : ""}`}
          onClick={() => setTab("friends")}
        >
          <Users size={15} strokeWidth={2} aria-hidden />
          Bạn bè
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pending"}
          className={`uas-tab${tab === "pending" ? " on" : ""}`}
          onClick={() => setTab("pending")}
        >
          <Clock3 size={15} strokeWidth={2} aria-hidden />
          Chờ xác nhận
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
          Đã chặn
        </button>
      </div>

      {loading ? (
        <div className="uas-loading">
          <Loader2 size={18} className="uas-spin" aria-hidden />
          <span>Đang tải…</span>
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
                        Đang bỏ…
                      </>
                    ) : (
                      "Bỏ chặn"
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
                          Chấp nhận
                        </button>
                        <button
                          type="button"
                          className="uas-user-icon-btn"
                          title="Từ chối lời mời"
                          aria-label={`Từ chối lời mời từ ${u.tenHienThi}`}
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
                          title="Hủy kết bạn"
                          aria-label={`Hủy kết bạn với ${u.tenHienThi}`}
                          onClick={() => void unfriend(u)}
                        >
                          <UserMinus size={16} strokeWidth={2} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="uas-user-icon-btn is-danger"
                          title="Chặn người này"
                          aria-label={`Chặn ${u.tenHienThi}`}
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
              Đang tải…
            </>
          ) : (
            "Xem thêm"
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
      const res = await fetch("/api/user/bao-mat-2-lop", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as
        | (TwoFactorStatus & { error?: string })
        | null;
      if (!res.ok || !json) {
        setErr(json?.error ?? "Không tải được trạng thái.");
        return;
      }
      setStatus({ enabled: json.enabled === true, phoneMasked: json.phoneMasked ?? null });
    } catch {
      setErr("Không tải được trạng thái.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const sendCode = useCallback(async () => {
    if (sending || cooldown > 0) return;
    setSending(true);
    setErr(null);
    setNotice(null);
    try {
      const res = await fetch("/api/user/bao-mat-2-lop/gui-ma", {
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
        setErr(json?.error ?? "Tính năng đang phát triển, bạn đợi thêm nhé");
        if (typeof json?.cooldownSec === "number") startCooldown(json.cooldownSec);
        return;
      }
      setStep("sent");
      setCode("");
      startCooldown(json.cooldownSec ?? 60);
      // devCode chỉ có ở môi trường dev (stub SMS) — giúp thử luồng.
      setNotice(
        json.devCode
          ? `Mã (chỉ hiện khi dev): ${json.devCode}`
          : "Đã gửi mã xác minh tới số điện thoại của bạn.",
      );
    } catch {
      setErr("Tính năng đang phát triển, bạn đợi thêm nhé");
    } finally {
      setSending(false);
    }
  }, [sending, cooldown, phone, startCooldown]);

  const verify = useCallback(async () => {
    if (verifying) return;
    setVerifying(true);
    setErr(null);
    try {
      const res = await fetch("/api/user/bao-mat-2-lop/xac-minh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const json = (await res.json().catch(() => null)) as
        | (TwoFactorStatus & { error?: string })
        | null;
      if (!res.ok || !json?.enabled) {
        setErr(json?.error ?? "Mã không đúng.");
        return;
      }
      setStatus({ enabled: true, phoneMasked: json.phoneMasked ?? null });
      setStep("idle");
      setPhone("");
      setCode("");
      setNotice(null);
    } catch {
      setErr("Không xác minh được mã.");
    } finally {
      setVerifying(false);
    }
  }, [verifying, phone, code]);

  const disable2fa = useCallback(async () => {
    if (disabling) return;
    setDisabling(true);
    setErr(null);
    try {
      const res = await fetch("/api/user/bao-mat-2-lop", { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as
        | (TwoFactorStatus & { error?: string })
        | null;
      if (!res.ok || json?.enabled !== false) {
        setErr(json?.error ?? "Không tắt được bảo mật 2 lớp.");
        return;
      }
      setStatus({ enabled: false, phoneMasked: null });
      setStep("idle");
      setPhone("");
      setCode("");
      setNotice(null);
    } catch {
      setErr("Không tắt được bảo mật 2 lớp.");
    } finally {
      setDisabling(false);
    }
  }, [disabling]);

  return (
    <section className="uas-section" aria-labelledby={titleId}>
      <div className="uas-section-head">
        <h3 id={titleId} className="uas-section-title">
          Bảo mật 2 lớp
        </h3>
        <p className="uas-section-hint">
          Thêm một lớp bảo vệ cho tài khoản bằng mã gửi qua số điện thoại. Bạn
          cần xác minh số điện thoại trước khi bật.
        </p>
      </div>

      {loading ? (
        <div className="uas-loading">
          <Loader2 size={18} className="uas-spin" aria-hidden />
          <span>Đang tải…</span>
        </div>
      ) : status.enabled ? (
        <div className="uas-2fa-status on">
          <span className="uas-2fa-status-ico" aria-hidden>
            <ShieldCheck size={22} strokeWidth={1.8} />
          </span>
          <span className="uas-2fa-status-text">
            <span className="uas-2fa-status-label">Đang bật</span>
            <span className="uas-2fa-status-desc">
              Số điện thoại: {status.phoneMasked ?? "đã xác minh"}
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
                Đang tắt…
              </>
            ) : (
              "Tắt"
            )}
          </button>
        </div>
      ) : (
        <div className="uas-2fa-enroll">
          <label className="uas-field">
            <span className="uas-field-label">Số điện thoại</span>
            <div className="uas-field-row">
              <span className="uas-field-ico" aria-hidden>
                <Smartphone size={18} strokeWidth={1.8} />
              </span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="uas-input"
                placeholder="Ví dụ: 0901234567"
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
                    Đang gửi…
                  </>
                ) : cooldown > 0 ? (
                  `Gửi lại (${cooldown}s)`
                ) : step === "sent" ? (
                  "Gửi lại"
                ) : (
                  "Gửi mã"
                )}
              </button>
            </div>
          </label>

          {step === "sent" ? (
            <label className="uas-field">
              <span className="uas-field-label">Mã xác minh (6 số)</span>
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
                      Đang xác minh…
                    </>
                  ) : (
                    "Xác minh & bật"
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
