"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  Heart,
  ImageIcon,
  MapPin,
  Pencil,
  Share2,
  Ticket,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  useTransition,
} from "react";

import { ArticleRichBody } from "@/components/article/ArticleRichBody";
import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { ShopQuaySuKienPanel } from "@/components/shop/ShopQuaySuKienPanel";
import { SuKienManagePanel } from "@/components/co-so/SuKienManagePanel";
import { ShareLinkMenu } from "@/components/social/ShareLinkMenu";
import { orgLoaiLabel } from "@/lib/cins/home-adaptive/suggestions-display";
import type { LoaiPhanHoiSuKien } from "@/lib/to-chuc/su-kien-dang-ky";
import {
  formatGiaVnd,
  labelLoaiSuKien,
  labelSuKienVe,
  type SuKienCardData,
  type SuKienLoaiVe,
} from "@/lib/to-chuc/su-kien-constants";
import {
  SU_KIEN_LISTING_PATH,
  suKienDetailPath,
} from "@/lib/to-chuc/su-kien-routes";
import { formatSuKienDiaDiemDisplay } from "@/lib/truong/contact";
import {
  hasTruongGioiThieuContent,
} from "@/lib/truong/gioi-thieu";

function SuKienLoaiVeList({
  items,
  cachMuaVe,
}: {
  items: SuKienLoaiVe[];
  cachMuaVe?: string | null;
}) {
  if (items.length === 0 && !cachMuaVe?.trim()) {
    return (
      <p className="sk-detail-empty-copy">
        Chưa có thông tin loại vé. Theo dõi tổ chức để nhận cập nhật.
      </p>
    );
  }
  return (
    <section className="sk-detail-ve-list" aria-label="Các loại vé">
      {items.length > 0 ? (
        <ul className="sk-detail-ve-ul">
          {items.map((ve) => (
            <li key={ve.id} className="sk-detail-ve-li">
              {ve.coverSrc ? (
                <div className="sk-detail-ve-thumb">
                  <Image
                    src={ve.coverSrc}
                    alt=""
                    width={740}
                    height={185}
                    unoptimized
                  />
                </div>
              ) : (
                <span className="sk-detail-ve-thumb sk-detail-ve-thumb--ph" aria-hidden>
                  <Ticket size={22} />
                </span>
              )}
              <div className="sk-detail-ve-body">
                <div className="sk-detail-ve-top">
                  <strong>{ve.ten}</strong>
                  <span>{formatGiaVnd(ve.gia)}</span>
                </div>
                {ve.moTa && hasTruongGioiThieuContent(ve.moTa) ? (
                  <ArticleRichBody
                    source={ve.moTa}
                    className="sk-detail-ve-mota article-rich-content"
                    emptyMessage=""
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {cachMuaVe?.trim() ? (
        <div className="sk-detail-cach-mua">
          <h3 className="sk-detail-cach-mua-title">Cách mua vé</h3>
          <p className="sk-detail-cach-mua-body">{cachMuaVe.trim()}</p>
        </div>
      ) : null}
    </section>
  );
}

type SuKienDetailMainTabId = "quay" | "thong_tin" | "ve";

/** Tab nội dung chính: Quầy (nếu có tag) · Thông tin · Vé (nếu tính phí). */
function SuKienDetailMainTabs({
  suKien,
  hasDetail,
  classPrefix = "sk-detail",
}: {
  suKien: SuKienCardData;
  hasDetail: boolean;
  /** `sk-detail` (trang) hoặc `cso-sk-detail` (panel). */
  classPrefix?: "sk-detail" | "cso-sk-detail";
}) {
  const uid = useId().replace(/:/g, "");
  const [hasQuay, setHasQuay] = useState(false);
  const [active, setActive] = useState<SuKienDetailMainTabId | null>(null);
  const showVe = !suKien.mienPhi;

  useEffect(() => {
    let cancelled = false;
    setHasQuay(false);
    setActive(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/su-kien/${encodeURIComponent(suKien.id)}/quay`,
          { cache: "no-store" },
        );
        const json = (await res.json().catch(() => null)) as {
          items?: unknown[];
        } | null;
        if (!cancelled) {
          setHasQuay(Array.isArray(json?.items) && json.items.length > 0);
        }
      } catch {
        if (!cancelled) setHasQuay(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [suKien.id]);

  const tabs = useMemo(() => {
    const next: Array<{ id: SuKienDetailMainTabId; label: string }> = [];
    if (hasQuay) next.push({ id: "quay", label: "Quầy sự kiện" });
    next.push({ id: "thong_tin", label: "Thông tin sự kiện" });
    if (showVe) next.push({ id: "ve", label: "Vé sự kiện" });
    return next;
  }, [hasQuay, showVe]);

  const activeId =
    (active && tabs.some((t) => t.id === active) ? active : null) ??
    tabs[0]?.id ??
    "thong_tin";

  const showTablist = tabs.length > 1;
  const richClass =
    classPrefix === "sk-detail"
      ? "sk-detail-rich article-rich-content article-content-html"
      : "cso-sk-detail-rich article-rich-content article-content-html";

  return (
    <div className={`${classPrefix}-main-tabs`}>
      {showTablist ? (
        <div
          className="sk-detail-tabs"
          role="tablist"
          aria-label="Nội dung sự kiện"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${uid}-tab-${tab.id}`}
              aria-selected={activeId === tab.id}
              aria-controls={`${uid}-panel-${tab.id}`}
              tabIndex={activeId === tab.id ? 0 : -1}
              className={`sk-detail-tab${activeId === tab.id ? " is-active" : ""}`}
              onClick={() => setActive(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {hasQuay ? (
        <div
          id={`${uid}-panel-quay`}
          role="tabpanel"
          aria-labelledby={`${uid}-tab-quay`}
          hidden={activeId !== "quay"}
          className="sk-detail-tab-panel"
        >
          {activeId === "quay" ? (
            <ShopQuaySuKienPanel suKienId={suKien.id} canManage={false} />
          ) : null}
        </div>
      ) : null}

      <div
        id={`${uid}-panel-thong_tin`}
        role="tabpanel"
        aria-labelledby={
          showTablist ? `${uid}-tab-thong_tin` : undefined
        }
        hidden={activeId !== "thong_tin"}
        className="sk-detail-tab-panel"
      >
        {hasDetail ? (
          <section className="sk-detail-section" aria-label="Chi tiết">
            <ArticleRichBody source={suKien.noiDung!} className={richClass} />
          </section>
        ) : suKien.moTa ? null : (
          <p className="sk-detail-empty-copy">
            Chưa có nội dung chi tiết. Theo dõi tổ chức để nhận cập nhật.
          </p>
        )}
      </div>

      {showVe ? (
        <div
          id={`${uid}-panel-ve`}
          role="tabpanel"
          aria-labelledby={`${uid}-tab-ve`}
          hidden={activeId !== "ve"}
          className="sk-detail-tab-panel"
        >
          <SuKienLoaiVeList
            items={suKien.loaiVe}
            cachMuaVe={suKien.cachMuaVe}
          />
        </div>
      ) : null}
    </div>
  );
}

export type SuKienDetailViewProps = {
  orgId: string;
  suKien: SuKienCardData;
  canManage?: boolean;
  variant: "page" | "panel";
  backHref?: string;
  onBack?: () => void;
  /** Mở form sửa metadata (panel + canManage). */
  onEdit?: () => void;
  onSoDangKyChange?: (suKienId: string, soDangKy: number) => void;
  orgTen?: string | null;
  orgHref?: string | null;
  /** `org_to_chuc.loai_to_chuc` — dùng nhãn «Cộng đồng …» vs org khác. */
  orgLoai?: string | null;
  orgAvatarUrl?: string | null;
  /** Mở sẵn tab quản lý (panel + canManage). */
  initialPanelTab?: "detail" | "manage";
};

function formatRange(batDau: string, ketThuc: string | null): string {
  const start = new Date(batDau);
  if (Number.isNaN(start.getTime())) return "";
  const dateFmt = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const startStr = `${dateFmt.format(start)} · ${timeFmt.format(start)}`;
  if (!ketThuc) return startStr;
  const end = new Date(ketThuc);
  if (Number.isNaN(end.getTime())) return startStr;
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) return `${startStr} – ${timeFmt.format(end)}`;
  return `${startStr} → ${dateFmt.format(end)} · ${timeFmt.format(end)}`;
}

function formatTimeOnly(batDau: string, ketThuc: string | null): string {
  const start = new Date(batDau);
  if (Number.isNaN(start.getTime())) return "";
  const timeFmt = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!ketThuc) return timeFmt.format(start);
  const end = new Date(ketThuc);
  if (Number.isNaN(end.getTime())) return timeFmt.format(start);
  return `${timeFmt.format(start)} – ${timeFmt.format(end)}`;
}

function calendarParts(iso: string): { day: string; month: string; weekday: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: "", month: "", weekday: "" };
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: new Intl.DateTimeFormat("vi-VN", { month: "short" }).format(d),
    weekday: new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(d),
  };
}

const AUTH_MESSAGE = "Đăng nhập để quan tâm hoặc đăng ký tham gia sự kiện.";

type RsvpProps = {
  loaded: boolean;
  pending: boolean;
  loai: LoaiPhanHoiSuKien | null;
  slotFull: boolean;
  actionError: string | null;
  onPhanHoi: (loai: LoaiPhanHoiSuKien) => void;
  sharePath: string;
  shareTitle: string;
  viewerLoggedIn: boolean;
  className?: string;
  /** Panel chi tiết — nút nhỏ, ngang hàng meta. */
  compact?: boolean;
};

function SuKienRsvpActions({
  loaded,
  pending,
  loai,
  slotFull,
  actionError,
  onPhanHoi,
  sharePath,
  shareTitle,
  viewerLoggedIn,
  className,
  compact = false,
}: RsvpProps) {
  const registered = loai === "se_tham_gia";
  const iconSize = compact ? 13 : 16;

  return (
    <div
      className={
        className ??
        (compact ? "cso-sk-detail-rsvp-inline" : undefined)
      }
    >
      {actionError ? (
        <p className="cso-sk-detail-foot-err sk-detail-rsvp-err">{actionError}</p>
      ) : null}
      <div
        className={
          "cso-sk-detail-actions sk-detail-rsvp-actions" +
          (compact ? " sk-detail-rsvp-actions--compact" : "")
        }
      >
        {registered ? (
          <ShareLinkMenu
            sharePath={sharePath}
            shareTitle={shareTitle}
            viewerLoggedIn={viewerLoggedIn}
            triggerClassName="cso-sk-detail-btn cso-sk-detail-btn--share"
            triggerLabel="Chia sẻ"
            triggerIcon={
              <>
                <Share2 size={iconSize} aria-hidden />
                Chia sẻ
              </>
            }
            placement={compact ? "down" : "up"}
            className="sk-detail-share-menu"
          />
        ) : (
          <button
            type="button"
            className={`cso-sk-detail-btn cso-sk-detail-btn--interest${loai === "quan_tam" ? " is-active" : ""}`}
            aria-pressed={loai === "quan_tam"}
            disabled={!loaded || pending}
            onClick={() => onPhanHoi("quan_tam")}
          >
            <Heart size={iconSize} aria-hidden />
            {loai === "quan_tam" ? "Đang quan tâm" : "Quan tâm"}
          </button>
        )}
        <button
          type="button"
          className={`cso-sk-detail-btn cso-sk-detail-btn--join${registered ? " is-active" : ""}`}
          aria-pressed={registered}
          disabled={!loaded || pending || slotFull}
          onClick={() => onPhanHoi("se_tham_gia")}
        >
          {registered ? (
            <Check size={iconSize} aria-hidden />
          ) : (
            <Users size={iconSize} aria-hidden />
          )}
          {registered ? "Đã đăng ký" : "Sẽ tham gia"}
        </button>
      </div>
    </div>
  );
}

function BackControl({
  onBack,
  href,
  className,
}: {
  onBack?: () => void;
  href: string;
  className: string;
}) {
  if (onBack) {
    return (
      <button type="button" className={className} onClick={onBack}>
        <ArrowLeft size={16} aria-hidden />
        Quay lại
      </button>
    );
  }
  return (
    <Link href={href} className={className}>
      <ArrowLeft size={16} aria-hidden />
      Quay lại
    </Link>
  );
}

function orgTopbarLabel(loai: string | null | undefined, ten: string): string {
  const type = orgLoaiLabel(loai ?? "");
  const trimmed = ten.trim();
  if (!trimmed) return type;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith(type.toLowerCase() + " ") || lower === type.toLowerCase()) {
    return trimmed;
  }
  return `${type} ${trimmed}`;
}

export function SuKienDetailView({
  orgId,
  suKien,
  canManage = false,
  variant,
  backHref,
  onBack,
  onEdit,
  onSoDangKyChange,
  orgTen = null,
  orgHref = null,
  orgLoai = null,
  orgAvatarUrl = null,
  initialPanelTab = "detail",
}: SuKienDetailViewProps) {
  const titleId = useId();
  const { isAuthenticated, openAuthModal } = useAuthGate();
  const [loai, setLoai] = useState<LoaiPhanHoiSuKien | null>(null);
  const [soDangKy, setSoDangKy] = useState(suKien.soDangKy);
  const [loaded, setLoaded] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [panelTab, setPanelTab] = useState<"detail" | "manage">(
    canManage && initialPanelTab === "manage" ? "manage" : "detail",
  );
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  useEffect(() => {
    setPanelTab(
      canManage && initialPanelTab === "manage" ? "manage" : "detail",
    );
  }, [suKien.id, canManage, initialPanelTab]);

  useEffect(() => {
    if (!canManage) {
      setPendingReviewCount(0);
      return;
    }
    let cancelled = false;
    void fetch(
      `/api/org/${encodeURIComponent(orgId)}/su-kien/${encodeURIComponent(suKien.id)}/quan-ly`,
      { credentials: "include", cache: "no-store" },
    )
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const json = (await res.json().catch(() => null)) as {
          stats?: { soChoDuyetNoiDung?: number };
        } | null;
        if (cancelled) return;
        setPendingReviewCount(
          typeof json?.stats?.soChoDuyetNoiDung === "number"
            ? json.stats.soChoDuyetNoiDung
            : 0,
        );
      })
      .catch(() => {
        /* giữ số cũ */
      });
    return () => {
      cancelled = true;
    };
  }, [canManage, orgId, suKien.id]);

  const refresh = useCallback(() => {
    setLoaded(false);
    setActionError(null);
    void fetch(
      `/api/org/${encodeURIComponent(orgId)}/su-kien/${encodeURIComponent(suKien.id)}/dang-ky`,
      { credentials: "include" },
    )
      .then(async (res) => {
        const data = (await res.json()) as {
          loai?: LoaiPhanHoiSuKien | null;
          soDangKy?: number;
        };
        if (res.ok) {
          setLoai(data.loai ?? null);
          setSoDangKy(
            typeof data.soDangKy === "number" ? data.soDangKy : suKien.soDangKy,
          );
        }
      })
      .finally(() => setLoaded(true));
  }, [orgId, suKien.id, suKien.soDangKy]);

  useEffect(() => {
    setSoDangKy(suKien.soDangKy);
    refresh();
  }, [suKien.id, suKien.soDangKy, refresh]);

  function handlePhanHoi(nextLoai: LoaiPhanHoiSuKien) {
    if (!isAuthenticated) {
      openAuthModal(AUTH_MESSAGE);
      return;
    }

    startTransition(async () => {
      setActionError(null);
      const res = await fetch(
        `/api/org/${encodeURIComponent(orgId)}/su-kien/${encodeURIComponent(suKien.id)}/dang-ky`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ loai: nextLoai }),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        loai?: LoaiPhanHoiSuKien | null;
        soDangKy?: number;
        error?: string;
      } | null;
      if (!res.ok) {
        setActionError(data?.error ?? "Không lưu được phản hồi.");
        return;
      }
      const newLoai = data?.loai ?? null;
      const newCount =
        typeof data?.soDangKy === "number" ? data.soDangKy : soDangKy;
      setLoai(newLoai);
      setSoDangKy(newCount);
      onSoDangKyChange?.(suKien.id, newCount);
    });
  }

  const diaDiemLabel = formatSuKienDiaDiemDisplay(
    suKien.tinhThanh,
    suKien.diaDiem,
  );
  const slotFull =
    suKien.slotToiDa != null &&
    soDangKy >= suKien.slotToiDa &&
    loai !== "se_tham_gia";
  const hasDetail = hasTruongGioiThieuContent(suKien.noiDung);
  const resolvedBack = backHref ?? SU_KIEN_LISTING_PATH;
  const rangeLabel = formatRange(suKien.batDau, suKien.ketThuc);
  const timeLabel = formatTimeOnly(suKien.batDau, suKien.ketThuc);
  const cal = calendarParts(suKien.batDau);
  const veLabel = labelSuKienVe(
    suKien.mienPhi,
    suKien.giaVe,
    suKien.loaiVe?.length,
  );
  const loaiLabel = labelLoaiSuKien(suKien.loaiSuKien);

  const rsvp = (
    <SuKienRsvpActions
      loaded={loaded}
      pending={pending}
      loai={loai}
      slotFull={slotFull}
      actionError={actionError}
      onPhanHoi={handlePhanHoi}
      sharePath={suKienDetailPath(suKien.id)}
      shareTitle={suKien.ten}
      viewerLoggedIn={isAuthenticated}
    />
  );

  if (variant === "page") {
    return (
      <article className="sk-detail" aria-labelledby={titleId}>
        <div className="sk-detail-topbar">
          <BackControl
            onBack={onBack}
            href={resolvedBack}
            className="sk-detail-back"
          />
          {orgTen && orgHref ? (
            <Link href={orgHref} className="sk-detail-org">
              <span className="sk-detail-org-logo" aria-hidden>
                {orgAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={orgAvatarUrl} alt="" />
                ) : (
                  <span className="sk-detail-org-logo-fallback">
                    {orgTen.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                )}
              </span>
              <span className="sk-detail-org-name">
                {orgTopbarLabel(orgLoai, orgTen)}
              </span>
            </Link>
          ) : null}
        </div>

        <header className="sk-detail-hero">
          <div className="sk-detail-hero-media">
            {suKien.coverSrc ? (
              <Image
                src={suKien.coverSrc}
                alt=""
                fill
                className="sk-detail-hero-img"
                sizes="100vw"
                priority
              />
            ) : (
              <span className="sk-detail-hero-ph" aria-hidden>
                <ImageIcon size={48} strokeWidth={1.2} />
              </span>
            )}
          </div>
        </header>

        <div className="sk-detail-intro">
          <p className="sk-detail-kicker">
            {loaiLabel}
            <span aria-hidden> · </span>
            {veLabel}
          </p>
          <h1 id={titleId} className="sk-detail-title">
            {suKien.ten}
          </h1>
          {suKien.moTa ? <p className="sk-detail-dek">{suKien.moTa}</p> : null}
          <div className="sk-detail-intro-cta">{rsvp}</div>
        </div>

        <div className="sk-detail-body">
          <aside className="sk-detail-aside" aria-label="Thông tin sự kiện">
            <div className="sk-detail-dateblock">
              <span className="sk-detail-date-day">{cal.day}</span>
              <span className="sk-detail-date-meta">
                <span className="sk-detail-date-month">{cal.month}</span>
                <span className="sk-detail-date-weekday">{cal.weekday}</span>
              </span>
            </div>
            <ul className="sk-detail-facts">
              <li>
                <CalendarDays size={16} aria-hidden />
                <span>
                  <strong>Thời gian</strong>
                  {timeLabel || rangeLabel}
                </span>
              </li>
              {diaDiemLabel ? (
                <li>
                  <MapPin size={16} aria-hidden />
                  <span>
                    <strong>Địa điểm</strong>
                    {diaDiemLabel}
                  </span>
                </li>
              ) : null}
              <li>
                <Ticket size={16} aria-hidden />
                <span>
                  <strong>Vé</strong>
                  {veLabel}
                </span>
              </li>
              {suKien.slotToiDa ? (
                <li>
                  <Users size={16} aria-hidden />
                  <span>
                    <strong>Chỗ</strong>
                    {soDangKy}/{suKien.slotToiDa}
                    {slotFull ? " · Hết chỗ" : ""}
                  </span>
                </li>
              ) : null}
            </ul>
            <div className="sk-detail-aside-rsvp">{rsvp}</div>
          </aside>

          <div className="sk-detail-main">
            <SuKienDetailMainTabs
              suKien={suKien}
              hasDetail={hasDetail}
              classPrefix="sk-detail"
            />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className="cso-sk-detail cso-sk-detail--panel"
      aria-labelledby={titleId}
    >
      <div className="cso-sk-detail-toolbar">
        <BackControl
          onBack={onBack}
          href={resolvedBack}
          className="cso-sk-detail-back"
        />
        <div className="cso-sk-detail-toolbar-end">
          {canManage && onEdit ? (
            <button
              type="button"
              className="cso-sk-detail-edit"
              onClick={onEdit}
            >
              <Pencil size={14} strokeWidth={2.25} aria-hidden />
              Sửa
            </button>
          ) : null}
          {canManage ? (
            <div
              className="cso-sk-detail-tabs"
              role="tablist"
              aria-label="Chế độ xem sự kiện"
            >
              <button
                type="button"
                role="tab"
                id="cso-sk-tab-detail"
                aria-selected={panelTab === "detail"}
                aria-controls="cso-sk-panel-detail"
                className={`cso-sk-detail-tab${panelTab === "detail" ? " is-active" : ""}`}
                onClick={() => setPanelTab("detail")}
              >
                Sự kiện
              </button>
              <button
                type="button"
                role="tab"
                id="cso-sk-tab-manage"
                aria-selected={panelTab === "manage"}
                aria-controls="cso-sk-panel-manage"
                className={`cso-sk-detail-tab${panelTab === "manage" ? " is-active" : ""}`}
                onClick={() => setPanelTab("manage")}
              >
                Quản lý
                {pendingReviewCount > 0 ? (
                  <span
                    className="cso-sk-detail-tab-count"
                    aria-label={`${pendingReviewCount} nội dung chờ duyệt`}
                  >
                    {pendingReviewCount > 99 ? "99+" : pendingReviewCount}
                  </span>
                ) : null}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {panelTab === "manage" && canManage ? (
        <div
          id="cso-sk-panel-manage"
          role="tabpanel"
          aria-labelledby="cso-sk-tab-manage"
          className="cso-sk-detail-manage-wrap"
        >
          <h2 id={titleId} className="cso-sk-detail-manage-title">
            Quản lý · {suKien.ten}
          </h2>
          <SuKienManagePanel
            orgId={orgId}
            suKienId={suKien.id}
            active={panelTab === "manage"}
            onPendingReviewCountChange={setPendingReviewCount}
          />
        </div>
      ) : (
        <div
          id="cso-sk-panel-detail"
          role={canManage ? "tabpanel" : undefined}
          aria-labelledby={canManage ? "cso-sk-tab-detail" : undefined}
        >
          <div className="cso-sk-detail-cover">
            {suKien.coverSrc ? (
              <Image
                src={suKien.coverSrc}
                alt=""
                fill
                className="cso-sk-detail-cover-img"
                sizes="(max-width: 640px) 100vw, 560px"
                priority
              />
            ) : (
              <span className="cso-sk-detail-cover-ph" aria-hidden>
                <ImageIcon size={40} strokeWidth={1.25} />
              </span>
            )}
          </div>

          <div className="cso-sk-detail-body">
            <h2 id={titleId} className="cso-sk-detail-title">
              {suKien.ten}
            </h2>

            <div className="cso-sk-detail-meta">
              <p className="cso-sk-detail-meta-row">
                <CalendarDays size={15} aria-hidden />
                {rangeLabel}
              </p>
              <div className="cso-sk-detail-meta-row cso-sk-detail-meta-row--rsvp">
                <span className="cso-sk-meta-item--tag">{veLabel}</span>
                <SuKienRsvpActions
                  loaded={loaded}
                  pending={pending}
                  loai={loai}
                  slotFull={slotFull}
                  actionError={actionError}
                  onPhanHoi={handlePhanHoi}
                  sharePath={suKienDetailPath(suKien.id)}
                  shareTitle={suKien.ten}
                  viewerLoggedIn={isAuthenticated}
                  compact
                />
              </div>
              {diaDiemLabel ? (
                <p className="cso-sk-detail-meta-row">
                  <MapPin size={15} aria-hidden />
                  {diaDiemLabel}
                </p>
              ) : null}
              {suKien.slotToiDa ? (
                <p className="cso-sk-detail-meta-row">
                  <Users size={15} aria-hidden />
                  {soDangKy}/{suKien.slotToiDa} chỗ
                  {slotFull ? " · Hết chỗ" : ""}
                </p>
              ) : null}
            </div>

            {suKien.moTa ? (
              <p className="cso-sk-detail-lead">{suKien.moTa}</p>
            ) : null}

            <SuKienDetailMainTabs
              suKien={suKien}
              hasDetail={hasDetail}
              classPrefix="cso-sk-detail"
            />
          </div>
        </div>
      )}
    </article>
  );
}
