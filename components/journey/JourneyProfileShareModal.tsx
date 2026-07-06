"use client";

import {
  ArrowLeft,
  Copy,
  ImageDown,
  Link2,
  Map,
  Palette,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { JourneyShareCardPreview } from "@/components/journey/JourneyShareCardPreview";
import {
  fetchGalleryItemsForShare,
  filterGalleryItemsForShare,
  galleryFilterShareUrl,
  galleryFilterSpecFromSearch,
  galleryThumbsForShareSpec,
  mergeShareGallerySources,
  milestonesToShareGalleryItems,
  PORTFOLIO_ALL_FILTER_SHARE_SPEC,
  type JourneyGalleryFilterShareSpec,
  type ShareGallerySourceItem,
} from "@/lib/journey/gallery-filter-share";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import {
  buildSocialShareItems,
  copyTextToClipboard,
  JOURNEY_SHARE_CARD_VARIANTS,
  journeyShareUrl,
  openFacebookShare,
  resolveShareOrigin,
  type JourneyShareCardKind,
  type JourneyShareCardVariant,
  type JourneyShareMenuStep,
  type JourneyShareProfile,
} from "@/lib/journey/profile-share";
import { isLikelyLocalOrPreviewHost } from "@/lib/auth/auth-origin";
import { copyShareCardImage } from "@/lib/journey/share-card-export";
import {
  readJourneyGalleryPanelCache,
  readJourneyTimelinePanelCache,
} from "@/lib/journey/journey-panel-local-cache";

type Props = {
  open: boolean;
  onClose: () => void;
  profile: JourneyShareProfile;
  viewerProfileId?: string | null;
  /** Mở thẳng bước Gallery với lọc từ dropdown filter (bỏ qua menu chính). */
  galleryFilter?: JourneyGalleryFilterShareSpec | null;
  /** Item gallery đang hiển thị trên grid — ưu tiên hơn cache 8 item. */
  liveGalleryItems?: ReadonlyArray<GalleryMainItem>;
};

function stepTitle(
  step: JourneyShareMenuStep,
  portfolioFilter: JourneyGalleryFilterShareSpec | null | undefined,
): string {
  if (step === "menu") return "Chia sẻ";
  if (step === "journey-card") return "Chia sẻ Journey";
  if (portfolioFilter && portfolioFilter.kind !== "all") {
    return `Chia sẻ Portfolio · ${portfolioFilter.label}`;
  }
  return "Chia sẻ Portfolio";
}

function stepSubtitle(
  step: JourneyShareMenuStep,
  slug: string,
  portfolioFilter: JourneyGalleryFilterShareSpec | null | undefined,
): string {
  if (step === "menu") return `cins.vn/${slug}`;
  if (step === "journey-card") {
    return "Thẻ giới thiệu hồ sơ — toàn bộ Journey (Tất cả)";
  }
  if (portfolioFilter && portfolioFilter.kind !== "all") {
    return `Thẻ tác phẩm — lọc theo "${portfolioFilter.label}"`;
  }
  return "Thẻ Portfolio — toàn bộ tác phẩm (Tất cả)";
}

export function JourneyProfileShareModal({
  open,
  onClose,
  profile,
  viewerProfileId = null,
  galleryFilter = null,
  liveGalleryItems = [],
}: Props) {
  const titleId = useId();
  const cardExportRef = useRef<HTMLElement>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [step, setStep] = useState<JourneyShareMenuStep>("menu");
  const [journeyVariant, setJourneyVariant] =
    useState<JourneyShareCardVariant>("profile");
  const [galleryVariant, setGalleryVariant] =
    useState<JourneyShareCardVariant>("mosaic");
  const [flash, setFlash] = useState<string | null>(null);
  const [galleryThumbs, setGalleryThumbs] = useState<string[]>(
    profile.galleryThumbs ?? [],
  );
  const [shareStats, setShareStats] = useState(profile.stats);
  const [copyingImage, setCopyingImage] = useState(false);
  /** Filter Portfolio đang áp dụng trên bước gallery-card (menu hoặc dropdown). */
  const [portfolioFilter, setPortfolioFilter] =
    useState<JourneyGalleryFilterShareSpec | null>(null);
  const skipMenu = Boolean(galleryFilter);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setStep("menu");
      setPortfolioFilter(null);
      setFlash(null);
      return;
    }
    if (galleryFilter) {
      setStep("gallery-card");
      setPortfolioFilter(galleryFilter);
    }
  }, [open, galleryFilter]);

  useEffect(() => {
    if (!open || step !== "gallery-card") return;

    const filterSpec = portfolioFilter ?? PORTFOLIO_ALL_FILTER_SHARE_SPEC;
    const timeline = readJourneyTimelinePanelCache(profile.slug, viewerProfileId);
    const gallery = readJourneyGalleryPanelCache(profile.slug, viewerProfileId);

    if (filterSpec.kind === "all") {
      const galleryItems = gallery?.items ?? [];
      const fromCache =
        galleryItems
          .map((item) => item.src)
          .filter(Boolean)
          .slice(0, 6) ?? [];
      setGalleryThumbs(
        fromCache.length > 0 ? fromCache : (profile.galleryThumbs ?? []),
      );
      setShareStats({
        cotMoc: timeline?.page.totalCount ?? profile.stats?.cotMoc ?? 0,
        tacPham: gallery?.totalCount ?? profile.stats?.tacPham ?? 0,
      });
      return;
    }

    let cancelled = false;

    const applyFiltered = (
      sources: ReadonlyArray<ReadonlyArray<ShareGallerySourceItem>>,
    ) => {
      const merged = mergeShareGallerySources(...sources);
      const filtered = filterGalleryItemsForShare(merged, filterSpec);
      if (cancelled) return;
      setGalleryThumbs(galleryThumbsForShareSpec(merged, filterSpec));
      setShareStats({
        cotMoc: timeline?.page.totalCount ?? profile.stats?.cotMoc ?? 0,
        tacPham: filtered.length,
      });
    };

    applyFiltered([
      liveGalleryItems,
      gallery?.items ?? [],
      milestonesToShareGalleryItems(timeline?.page.milestones ?? []),
    ]);

    void (async () => {
      const fetched = await fetchGalleryItemsForShare(profile.slug);
      if (cancelled || fetched.length === 0) return;
      applyFiltered([
        liveGalleryItems,
        fetched,
        gallery?.items ?? [],
        milestonesToShareGalleryItems(timeline?.page.milestones ?? []),
      ]);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    step,
    portfolioFilter,
    galleryFilter,
    liveGalleryItems,
    profile.slug,
    profile.galleryThumbs,
    profile.stats,
    viewerProfileId,
  ]);

  const handleClose = useCallback(() => {
    setStep("menu");
    setFlash(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const showFlash = useCallback((message: string) => {
    setFlash(message);
    window.setTimeout(() => setFlash(null), 2200);
  }, []);

  const copyJourneyLink = useCallback(async () => {
    const ok = await copyTextToClipboard(journeyShareUrl(profile.slug));
    showFlash(ok ? "Đã copy link Journey." : "Không copy được link.");
  }, [profile.slug, showFlash]);

  const cardKind: JourneyShareCardKind | null =
    step === "journey-card"
      ? "journey"
      : step === "gallery-card"
        ? "gallery"
        : null;

  const cardVariant =
    cardKind === "journey" ? journeyVariant : galleryVariant;

  const cardTargetUrl =
    cardKind === "gallery"
      ? galleryFilterShareUrl(
          profile.slug,
          portfolioFilter ?? PORTFOLIO_ALL_FILTER_SHARE_SPEC,
        )
      : journeyShareUrl(profile.slug);

  const cardProfile: JourneyShareProfile = {
    ...profile,
    galleryThumbs,
    stats: shareStats,
  };

  const copyCardLink = useCallback(async () => {
    const ok = await copyTextToClipboard(cardTargetUrl);
    showFlash(ok ? "Đã copy link." : "Không copy được link.");
  }, [cardTargetUrl, showFlash]);

  const nativeShare = useCallback(async () => {
    if (!cardTargetUrl || !navigator.share) return;
    try {
      await navigator.share({
        title: profile.displayName,
        url: cardTargetUrl,
      });
    } catch {
      /* user cancelled */
    }
  }, [cardTargetUrl, profile.displayName]);

  const copyCardImage = useCallback(async () => {
    const el = cardExportRef.current;
    if (!el || copyingImage) return;
    setCopyingImage(true);
    try {
      const result = await copyShareCardImage(
        el,
        `cins-${profile.slug}-share.png`,
      );
      if (result === "copied") {
        showFlash("Đã copy ảnh thẻ — dán vào chat hoặc MXH.");
      } else if (result === "downloaded") {
        showFlash("Trình duyệt không copy ảnh — đã tải PNG về máy.");
      } else {
        showFlash("Không xuất được ảnh. Thử lại sau vài giây.");
      }
    } finally {
      setCopyingImage(false);
    }
  }, [copyingImage, profile.slug, showFlash]);

  const socialItems = buildSocialShareItems(
    cardTargetUrl,
    profile.displayName,
    {
      onNativeShare: () => void nativeShare(),
      onCopy: () => void copyCardLink(),
      onFacebookShare: () => {
        void openFacebookShare(cardTargetUrl, profile.displayName).then(() => {
          const onLocal =
            typeof window !== "undefined" &&
            isLikelyLocalOrPreviewHost(window.location.hostname);
          showFlash(
            onLocal
              ? `Đã copy link ${resolveShareOrigin()} — dán vào bài Facebook nếu composer trống.`
              : "Đã copy link — dán vào bài Facebook nếu chưa thấy preview.",
          );
        });
      },
    },
  );

  if (!open || !portalReady) return null;

  return createPortal(
    <div
      className="j-share-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <section className="j-share-sheet">
        <header className="j-share-head">
          <div className="j-share-head-main">
            {step !== "menu" ? (
              <button
                type="button"
                className="j-share-back"
                onClick={() => {
                  if (skipMenu) handleClose();
                  else {
                    setPortfolioFilter(null);
                    setStep("menu");
                  }
                }}
                aria-label={skipMenu ? "Đóng" : "Quay lại"}
              >
                <ArrowLeft size={18} strokeWidth={2} aria-hidden />
              </button>
            ) : null}
            <div>
              <h2 id={titleId} className="j-share-title">
                {stepTitle(step, portfolioFilter)}
              </h2>
              <p className="j-share-sub">
                {stepSubtitle(step, profile.slug, portfolioFilter)}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="j-share-close"
            aria-label="Đóng"
            onClick={handleClose}
          >
            ×
          </button>
        </header>

        {flash ? (
          <p className="j-share-flash" role="status">
            {flash}
          </p>
        ) : null}

        <div className="j-share-body">
          {step === "menu" ? (
            <div className="j-share-menu">
              <button
                type="button"
                className="j-share-menu-item"
                onClick={() => void copyJourneyLink()}
              >
                <span className="j-share-menu-ic j-share-menu-ic--link">
                  <Link2 size={20} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="j-share-menu-copy">
                  <strong>Copy link</strong>
                  <span>Copy URL Journey vào bộ nhớ tạm</span>
                </span>
              </button>

              <button
                type="button"
                className="j-share-menu-item"
                onClick={() => setStep("journey-card")}
              >
                <span className="j-share-menu-ic j-share-menu-ic--journey">
                  <Map size={20} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="j-share-menu-copy">
                  <strong>Chia sẻ Journey</strong>
                  <span>
                    Thẻ giới thiệu hồ sơ — toàn bộ Journey (Tất cả)
                  </span>
                </span>
              </button>

              <button
                type="button"
                className="j-share-menu-item"
                onClick={() => {
                  setPortfolioFilter(
                    typeof window !== "undefined"
                      ? galleryFilterSpecFromSearch(window.location.search)
                      : PORTFOLIO_ALL_FILTER_SHARE_SPEC,
                  );
                  setStep("gallery-card");
                }}
              >
                <span className="j-share-menu-ic j-share-menu-ic--gallery">
                  <Palette size={20} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="j-share-menu-copy">
                  <strong>Chia sẻ Portfolio</strong>
                  <span>
                    Thẻ tác phẩm — toàn bộ Portfolio (Tất cả)
                  </span>
                </span>
              </button>
            </div>
          ) : cardKind ? (
            <>
              {JOURNEY_SHARE_CARD_VARIANTS[cardKind].length > 1 ? (
              <div className="j-share-variant-row" role="tablist" aria-label="Chọn layout thẻ">
                {JOURNEY_SHARE_CARD_VARIANTS[cardKind].map((opt) => {
                  const active =
                    cardKind === "journey"
                      ? journeyVariant === opt.id
                      : galleryVariant === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={"j-share-variant-chip" + (active ? " is-active" : "")}
                      title={opt.hint}
                      onClick={() => {
                        if (cardKind === "journey") {
                          setJourneyVariant(opt.id);
                        } else {
                          setGalleryVariant(opt.id);
                        }
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              ) : null}

              <div className="j-share-preview-wrap">
                <JourneyShareCardPreview
                  kind={cardKind}
                  variant={cardVariant}
                  profile={cardProfile}
                  targetUrl={cardTargetUrl}
                  exportRef={cardExportRef}
                />
              </div>

              <div className="j-share-actions">
                <button
                  type="button"
                  className="j-share-action j-share-action--primary"
                  onClick={() => void copyCardLink()}
                >
                  <Copy size={15} strokeWidth={1.8} aria-hidden />
                  Copy link
                </button>
                <button
                  type="button"
                  className="j-share-action"
                  disabled={copyingImage}
                  title="Copy ảnh PNG thẻ (kèm QR) — dán gửi chat/MXH"
                  onClick={() => void copyCardImage()}
                >
                  <ImageDown size={15} strokeWidth={1.8} aria-hidden />
                  {copyingImage ? "Đang tạo…" : "Copy ảnh"}
                </button>
              </div>

              <div className="j-share-social">
                <p className="j-share-social-label">Chia sẻ qua</p>
                <div className="j-share-social-row">
                  {socialItems.map((item) =>
                    item.href ? (
                      <a
                        key={item.id}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="j-share-soc-btn"
                        title={item.label}
                        aria-label={item.label}
                      >
                        <span className={`j-share-soc-ic ${item.iconClass}`}>
                          {item.iconLabel}
                        </span>
                      </a>
                    ) : (
                      <button
                        key={item.id}
                        type="button"
                        className="j-share-soc-btn"
                        title={item.label}
                        aria-label={item.label}
                        onClick={item.onClick}
                      >
                        <span className={`j-share-soc-ic ${item.iconClass}`}>
                          {item.iconLabel}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>,
    document.body,
  );
}
