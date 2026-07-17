"use client";

import {
  ArrowLeft,
  Copy,
  ImageDown,
  Link2,
  Map,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

import { CongDongInviteFriendsPanel } from "@/components/cong-dong/CongDongInviteFriendsPanel";
import { JourneyShareCardPreview } from "@/components/journey/JourneyShareCardPreview";
import { JourneyShareThemePicker } from "@/components/journey/JourneyShareThemePicker";
import {
  PORTFOLIO_ALL_FILTER_SHARE_SPEC,
  enrichFeaturedShareSources,
  featuredPinnedToShareSources,
  fetchGalleryItemsForShare,
  filterGalleryItemsForShare,
  galleryFilterShareUrl,
  galleryFilterSpecFromSearch,
  galleryItemsToShareSources,
  galleryThumbsForShareSpec,
  getLiveFeaturedPinnedForShare,
  mergeShareGallerySources,
  milestonesToShareGalleryItems,
  shareFilterVersionToken,
  type JourneyGalleryFilterShareSpec,
  type ShareGallerySourceItem,
} from "@/lib/journey/gallery-filter-share";
import type { GalleryDisplay } from "@/lib/journey/gallery-display-url";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import {
  buildJourneyOgImageAbsoluteUrl,
  buildOgImageVersion,
  type OgShareSearch,
  warmOgImageCache,
} from "@/lib/journey/og-image-url";
import {
  buildSocialShareItems,
  copyTextToClipboard,
  JOURNEY_SHARE_CARD_VARIANTS,
  journeyShareUrl,
  openFacebookShare,
  resolveShareOrigin,
  type JourneyGalleryCardVariant,
  type JourneyJourneyCardVariant,
  type JourneyShareCardKind,
  type JourneyShareMenuStep,
  type JourneyShareProfile,
} from "@/lib/journey/profile-share";
import {
  buildShareOgSnapshotKey,
  defaultShareOgThemeState,
  type ShareOgPresetId,
  type ShareOgThemeState,
} from "@/lib/journey/share-og-theme";
import type { OrgShareContext } from "@/lib/org/org-profile-share";
import { orgBaiDangFilterShareUrl } from "@/lib/org/org-bai-dang-filter-share";
import {
  orgGalleryShareUrl,
  orgPageShareUrl,
  orgShareInviteTitle,
} from "@/lib/org/org-profile-share";
import { isLikelyLocalOrPreviewHost } from "@/lib/auth/auth-origin";
import {
  copyShareCardImage,
  exportShareCardBlob,
} from "@/lib/journey/share-card-export";
import {
  readJourneyAsidePanelCache,
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
  /** Chế độ xem gallery khi chia sẻ — `card` (mặc định) · `grid` (`display=luoi`). */
  galleryDisplay?: GalleryDisplay;
  /** Item gallery đang hiển thị trên grid — ưu tiên hơn cache 8 item. */
  liveGalleryItems?: ReadonlyArray<GalleryMainItem>;
  /** Modal toàn màn hình (mặc định) hoặc popover neo nút trigger. */
  presentation?: "modal" | "popover";
  /** Nút mở popover — bắt buộc khi `presentation="popover"`. */
  anchorRef?: RefObject<HTMLElement | null>;
  /** Trang org (cơ sở / trường / studio) — thay nhãn Journey/Portfolio. */
  orgShare?: OrgShareContext | null;
  /**
   * Deep link tab Bài đăng + `?filter=` (không phải Showcase/Portfolio).
   * Dùng khi mở từ dropdown nhãn org.
   */
  orgBaiDangFilterShare?: boolean;
  /** Gate đăng nhập trước khi mở bước mời bạn (cộng đồng). */
  requireAuth?: (then: () => void) => void;
};

function stepTitle(
  step: JourneyShareMenuStep,
  portfolioFilter: JourneyGalleryFilterShareSpec | null | undefined,
  orgShare?: OrgShareContext | null,
  orgBaiDangFilterShare?: boolean,
): string {
  if (step === "menu") return "Chia sẻ";
  if (step === "invite-friends") return "Mời bạn bè";
  if (step === "journey-card" || step === "gallery-card") {
    if (orgShare?.kind === "cong_dong") return "Chia sẻ cộng đồng";
    if (orgShare?.pageOnly) return "Chia sẻ trang";
    if (
      step === "gallery-card" &&
      portfolioFilter &&
      portfolioFilter.kind !== "all"
    ) {
      const featureLabel = orgBaiDangFilterShare
        ? "Bài đăng"
        : (orgShare?.galleryFeatureLabel ?? "Portfolio");
      return `Chia sẻ Card · ${featureLabel} · ${portfolioFilter.label}`;
    }
    return "Chia sẻ Card";
  }
  return "Chia sẻ";
}

function stepSubtitle(
  step: JourneyShareMenuStep,
  slug: string,
  portfolioFilter: JourneyGalleryFilterShareSpec | null | undefined,
  orgShare?: OrgShareContext | null,
  orgBaiDangFilterShare?: boolean,
): string {
  const pathLine = orgShare ? `cins.vn/${orgShare.pathLabel}` : `cins.vn/${slug}`;
  const featureLabel = orgBaiDangFilterShare
    ? "Bài đăng"
    : (orgShare?.galleryFeatureLabel ?? "Portfolio");
  if (step === "menu") return pathLine;
  if (step === "invite-friends") {
    return "Gửi lời mời — hiện trên thông báo và Journey";
  }
  if (step === "journey-card") {
    if (orgShare?.kind === "cong_dong") {
      return "Thẻ giới thiệu cộng đồng — lời mời tham gia";
    }
    return orgShare ? "Thẻ giới thiệu trang" : "";
  }
  if (step === "gallery-card") {
    if (portfolioFilter && portfolioFilter.kind !== "all") {
      return orgBaiDangFilterShare
        ? `Link timeline — lọc theo "${portfolioFilter.label}"`
        : `Thẻ ${featureLabel} — lọc theo "${portfolioFilter.label}"`;
    }
    return orgShare
      ? `Thẻ ${featureLabel}`
      : "Thẻ Portfolio — toàn bộ tác phẩm";
  }
  return pathLine;
}

export function JourneyProfileShareModal({
  open,
  onClose,
  profile,
  viewerProfileId = null,
  galleryFilter = null,
  galleryDisplay = "card",
  liveGalleryItems = [],
  presentation = "modal",
  anchorRef,
  orgShare = null,
  orgBaiDangFilterShare = false,
  requireAuth,
}: Props) {
  const titleId = useId();
  const cardExportRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<{
    top: number;
    left: number;
    maxWidth: number;
  } | null>(null);
  const [step, setStep] = useState<JourneyShareMenuStep>("menu");
  const [journeyVariant, setJourneyVariant] =
    useState<JourneyJourneyCardVariant>("banner");
  const [galleryVariant, setGalleryVariant] =
    useState<JourneyGalleryCardVariant>("strip");
  const [flash, setFlash] = useState<string | null>(null);
  const [galleryThumbs, setGalleryThumbs] = useState<string[]>(
    profile.galleryThumbs ?? [],
  );
  const [shareStats, setShareStats] = useState(profile.stats);
  const [copyingImage, setCopyingImage] = useState(false);
  const [copyingLink, setCopyingLink] = useState(false);
  const flashTimerRef = useRef<number | null>(null);
  /** Filter Portfolio đang áp dụng trên bước gallery-card (menu hoặc dropdown). */
  const [portfolioFilter, setPortfolioFilter] =
    useState<JourneyGalleryFilterShareSpec | null>(null);
  const [themeState, setThemeState] = useState<ShareOgThemeState>(() =>
    defaultShareOgThemeState(profile.slug),
  );
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeCanEdit, setThemeCanEdit] = useState(false);
  const skipMenu = Boolean(galleryFilter);
  const isPopover = presentation === "popover";
  const orgShareId = orgShare?.orgId;

  const handleClose = useCallback(() => {
    setStep("menu");
    setFlash(null);
    setCopyingLink(false);
    if (flashTimerRef.current != null) {
      window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !isPopover) {
      setPopoverStyle(null);
      return;
    }
    const updatePosition = () => {
      const anchor = anchorRef?.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const left = Math.max(16, rect.left);
      const panelW = step === "menu" ? 300 : 480;
      setPopoverStyle({
        top: rect.bottom + 8,
        left,
        maxWidth: Math.min(panelW, window.innerWidth - left - 16),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, isPopover, anchorRef, step]);

  useEffect(() => {
    if (!open || !isPopover) return;
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef?.current?.contains(target)) return;
      if (sheetRef.current?.contains(target)) return;
      handleClose();
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("click", onDocClick, true);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("click", onDocClick, true);
    };
  }, [open, isPopover, anchorRef, handleClose]);

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

  const showFlash = useCallback((message: string, durationMs = 2800) => {
    setFlash(message);
    if (flashTimerRef.current != null) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => {
      setFlash(null);
      flashTimerRef.current = null;
    }, durationMs);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const qs = orgShareId
      ? `orgId=${encodeURIComponent(orgShareId)}`
      : `slug=${encodeURIComponent(profile.slug)}`;
    void (async () => {
      try {
        const res = await fetch(`/api/share-theme?${qs}`);
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          state?: ShareOgThemeState;
          canEdit?: boolean;
        };
        if (cancelled || !json.state) return;
        setThemeState(json.state);
        setThemeCanEdit(Boolean(json.canEdit));
        setJourneyVariant(json.state.layouts.journey);
        setGalleryVariant(json.state.layouts.gallery);
      } catch {
        if (!cancelled) {
          setThemeState(defaultShareOgThemeState(profile.slug));
          setThemeCanEdit(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, profile.slug, orgShareId]);

  const persistTheme = useCallback(
    async (next: ShareOgThemeState, removeImageId?: string) => {
      // Áp dụng ngay cho preview; sau đó cố gắng lưu.
      setThemeState(next);
      setThemeSaving(true);
      try {
        const res = await fetch("/api/share-theme", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId: orgShareId,
            active: next.active,
            customs: next.customs,
            layouts: next.layouts,
            removeImageId,
          }),
        });
        if (!res.ok) {
          // Khách xem thử: 401/403 im lặng. Chủ hồ sơ thì báo lỗi.
          if (res.status === 401 || res.status === 403) {
            if (themeCanEdit) {
              showFlash("Không lưu được theme — thử đăng nhập lại.");
            }
            return;
          }
          const err = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          showFlash(err?.error ?? "Không lưu được theme.");
          return;
        }
        const json = (await res.json()) as { state?: ShareOgThemeState };
        if (json.state) setThemeState(json.state);
      } catch {
        showFlash("Không lưu được theme.");
      } finally {
        setThemeSaving(false);
      }
    },
    [orgShareId, showFlash, themeCanEdit],
  );

  useEffect(() => {
    if (!open || (step !== "gallery-card" && step !== "journey-card")) return;

    const filterSpec = portfolioFilter ?? PORTFOLIO_ALL_FILTER_SHARE_SPEC;
    const timeline = readJourneyTimelinePanelCache(profile.slug, viewerProfileId);
    const gallery = readJourneyGalleryPanelCache(profile.slug, viewerProfileId);
    const aside = readJourneyAsidePanelCache(profile.slug, viewerProfileId);
    const liveGallerySources = galleryItemsToShareSources(liveGalleryItems);
    const cachedGallerySources = galleryItemsToShareSources(gallery?.items ?? []);
    const timelineSources = milestonesToShareGalleryItems(
      timeline?.page.milestones ?? [],
    );
    /** Live Feature (sau kéo) thắng cache stale; fallback aside cache. */
    const featuredSources = enrichFeaturedShareSources(
      featuredPinnedToShareSources(
        getLiveFeaturedPinnedForShare().length > 0
          ? getLiveFeaturedPinnedForShare()
          : (aside?.pinned ?? []).map((b) => ({
              cotMocId: b.cotMocId,
              src: b.src,
              videoPreviewSrc: b.videoPreviewSrc,
              type: b.type,
              variant: b.variant,
            })),
      ),
      liveGallerySources,
      cachedGallerySources,
      timelineSources,
    );
    let cancelled = false;

    /** Không đếm `items.length` / aside pin (cap 24) — luôn ưu tiên tổng server. */
    const countNoiBatFromSources = (
      sources: ReadonlyArray<ReadonlyArray<ShareGallerySourceItem>>,
    ): number => {
      const merged = mergeShareGallerySources(...sources);
      return merged.filter(
        (item) => item.visibility === "feature" || item.featured === true,
      ).length;
    };

    const resolveNoiBat = (
      sources: ReadonlyArray<ReadonlyArray<ShareGallerySourceItem>>,
      apiFeaturedCount?: number,
    ) =>
      profile.stats?.noiBat ??
      (typeof gallery?.featuredCount === "number"
        ? gallery.featuredCount
        : undefined) ??
      (typeof apiFeaturedCount === "number" ? apiFeaturedCount : undefined) ??
      countNoiBatFromSources(sources);

    const resolveTacPham = (apiTotalCount?: number, filteredLen?: number) => {
      if (typeof filteredLen === "number") return filteredLen;
      return (
        gallery?.totalCount ??
        profile.stats?.tacPham ??
        (typeof apiTotalCount === "number" ? apiTotalCount : 0)
      );
    };

    const applyThumbs = (
      sources: ReadonlyArray<ReadonlyArray<ShareGallerySourceItem>>,
      stats: { noiBat: number; tacPham: number },
    ) => {
      const merged = mergeShareGallerySources(...sources);
      const thumbs = galleryThumbsForShareSpec(merged, filterSpec);
      if (cancelled) return;
      setGalleryThumbs(
        thumbs.length > 0 ? thumbs : (profile.galleryThumbs ?? []),
      );
      setShareStats(stats);
    };

    if (orgShare) {
      applyThumbs([featuredSources, liveGallerySources], {
        noiBat: profile.stats?.noiBat ?? 0,
        tacPham: profile.stats?.tacPham ?? 0,
      });
      void (async () => {
        const fetched = await fetchGalleryItemsForShare(profile.slug);
        if (cancelled || fetched.items.length === 0) return;
        const fetchedSources = galleryItemsToShareSources(fetched.items);
        applyThumbs([featuredSources, liveGallerySources, fetchedSources], {
          noiBat:
            profile.stats?.noiBat ??
            resolveNoiBat(
              [liveGallerySources, fetchedSources],
              fetched.featuredCount,
            ),
          tacPham: profile.stats?.tacPham ?? resolveTacPham(fetched.totalCount),
        });
      })();
      return () => {
        cancelled = true;
      };
    }

    const baseStats = {
      noiBat: resolveNoiBat([
        featuredSources,
        liveGallerySources,
        cachedGallerySources,
      ]),
      tacPham: resolveTacPham(),
    };

    if (step === "journey-card" || filterSpec.kind === "all") {
      applyThumbs(
        [featuredSources, liveGallerySources, cachedGallerySources],
        baseStats,
      );
      void (async () => {
        const fetched = await fetchGalleryItemsForShare(profile.slug);
        if (cancelled || fetched.items.length === 0) return;
        const fetchedSources = galleryItemsToShareSources(fetched.items);
        const featuredWithLabels = enrichFeaturedShareSources(
          featuredSources,
          liveGallerySources,
          fetchedSources,
          cachedGallerySources,
        );
        const sources = [
          featuredWithLabels,
          liveGallerySources,
          fetchedSources,
          cachedGallerySources,
        ];
        applyThumbs(sources, {
          noiBat: resolveNoiBat(sources, fetched.featuredCount),
          tacPham: resolveTacPham(fetched.totalCount),
        });
      })();
      return () => {
        cancelled = true;
      };
    }

    const applyFiltered = (
      sources: ReadonlyArray<ReadonlyArray<ShareGallerySourceItem>>,
      apiFeaturedCount?: number,
    ) => {
      const merged = mergeShareGallerySources(...sources);
      const filtered = filterGalleryItemsForShare(merged, filterSpec);
      if (cancelled) return;
      setGalleryThumbs(galleryThumbsForShareSpec(merged, filterSpec));
      setShareStats({
        noiBat: resolveNoiBat(sources, apiFeaturedCount),
        tacPham: filtered.length,
      });
    };

    applyFiltered([
      featuredSources,
      liveGallerySources,
      cachedGallerySources,
      timelineSources,
    ]);

    void (async () => {
      const fetched = await fetchGalleryItemsForShare(profile.slug);
      if (cancelled || fetched.items.length === 0) return;
      const fetchedSources = galleryItemsToShareSources(fetched.items);
      /** Re-enrich sau fetch — pin Feature nhận đủ nhãn từ trang gallery. */
      const featuredWithLabels = enrichFeaturedShareSources(
        featuredSources,
        liveGallerySources,
        fetchedSources,
        cachedGallerySources,
        timelineSources,
      );
      applyFiltered(
        [
          featuredWithLabels,
          liveGallerySources,
          fetchedSources,
          cachedGallerySources,
          timelineSources,
        ],
        fetched.featuredCount,
      );
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
    orgShare,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const copyJourneyLink = useCallback(async () => {
    const url = orgShare
      ? orgPageShareUrl(orgShare)
      : journeyShareUrl(profile.slug);
    const ok = await copyTextToClipboard(url);
    showFlash(
      ok
        ? orgShare?.kind === "cong_dong"
          ? "Đã copy link cộng đồng."
          : orgShare
            ? "Đã copy link trang."
            : "Đã copy link Journey."
        : "Không copy được link.",
    );
  }, [orgShare, profile.slug, showFlash]);

  const cardKind: JourneyShareCardKind | null =
    step === "journey-card"
      ? "journey"
      : step === "gallery-card"
        ? "gallery"
        : null;

  /** Tab Journey | Portfolio — ẩn khi mở từ filter share hoặc org chỉ có thẻ trang. */
  const showCardKindTabs =
    Boolean(cardKind) && !skipMenu && !orgShare?.pageOnly;

  const openGalleryCardTab = useCallback(() => {
    setPortfolioFilter(
      orgShare
        ? PORTFOLIO_ALL_FILTER_SHARE_SPEC
        : typeof window !== "undefined"
          ? galleryFilterSpecFromSearch(window.location.search)
          : PORTFOLIO_ALL_FILTER_SHARE_SPEC,
    );
    setStep("gallery-card");
  }, [orgShare]);

  const openJourneyCardTab = useCallback(() => {
    setPortfolioFilter(null);
    setStep("journey-card");
  }, []);

  const cardVariant =
    cardKind === "journey" ? journeyVariant : galleryVariant;

  const cardTargetUrl =
    cardKind === "gallery"
      ? orgShare && orgBaiDangFilterShare
        ? orgBaiDangFilterShareUrl(
            orgShare,
            portfolioFilter ?? { kind: "all", label: "Tất cả" },
          )
        : orgShare
          ? orgGalleryShareUrl(orgShare)
          : galleryFilterShareUrl(
              profile.slug,
              portfolioFilter ?? PORTFOLIO_ALL_FILTER_SHARE_SPEC,
              galleryDisplay,
            )
      : orgShare
        ? orgPageShareUrl(orgShare)
        : journeyShareUrl(profile.slug);

  const shareInviteTitle = (() => {
    const base = orgShareInviteTitle(orgShare, profile.displayName);
    if (
      cardKind === "gallery" &&
      portfolioFilter &&
      portfolioFilter.kind !== "all"
    ) {
      return `${base} · ${portfolioFilter.label}`;
    }
    return base;
  })();

  const shareCardDescription = (() => {
    if (profile.bio) return profile.bio;
    if (cardKind === "gallery") {
      if (portfolioFilter && portfolioFilter.kind !== "all") {
        return `Portfolio «${portfolioFilter.label}» của ${profile.displayName} trên CINs.`;
      }
      return `Portfolio của ${profile.displayName} trên CINs.`;
    }
    return `Hành trình sáng tạo của ${profile.displayName} trên CINs.`;
  })();

  /**
   * Preview DOM (`JourneyShareCardPreview`) không hit `/opengraph-image`.
   * Warm URL on-demand cùng key `v=` với metadata — fire-and-forget trước bot scrape.
   */
  const warmOnDemandOgImage = useCallback(() => {
    if (!cardKind || orgShare) return;
    const search: OgShareSearch =
      cardKind === "gallery"
        ? (() => {
            const spec = portfolioFilter ?? PORTFOLIO_ALL_FILTER_SHARE_SPEC;
            if (spec.kind === "group") {
              return { view: "gallery", nhom: spec.group };
            }
            if (spec.kind === "personal-label") {
              return { view: "gallery", filter: spec.slug };
            }
            return { view: "gallery" };
          })()
        : {};
    const filterVersion =
      cardKind === "gallery"
        ? shareFilterVersionToken(portfolioFilter)
        : null;
    const version = buildOgImageVersion(
      themeState.active,
      cardVariant,
      filterVersion,
    );
    const url = buildJourneyOgImageAbsoluteUrl(
      resolveShareOrigin(),
      profile.slug,
      search,
      version,
    );
    warmOgImageCache(url);
  }, [
    cardKind,
    orgShare,
    portfolioFilter,
    themeState.active,
    cardVariant,
    profile.slug,
  ]);

  const cardProfile: JourneyShareProfile = {
    ...profile,
    galleryThumbs,
    stats: shareStats,
  };

  /** Snapshot cụ thể vừa publish — dùng để đóng băng OG cho `/s/[token]`. */
  const publishOgSnapshot = useCallback(async (): Promise<{
    imageId: string;
  } | null> => {
    if (!themeCanEdit) return null;
    if (step !== "journey-card" && step !== "gallery-card") return null;
    if (themeState.active.kind === "custom") {
      return { imageId: themeState.active.imageId };
    }

    const el = cardExportRef.current;
    if (!el) return null;

    const kind: JourneyShareCardKind =
      step === "gallery-card" ? "gallery" : "journey";
    const layout = kind === "gallery" ? galleryVariant : journeyVariant;
    const filterVersion =
      kind === "gallery"
        ? shareFilterVersionToken(portfolioFilter)
        : null;
    const key = buildShareOgSnapshotKey({
      kind,
      filterVersion,
      layout,
      theme: themeState.active,
    });

    const blob = await exportShareCardBlob(el);
    if (!blob) return null;

    const form = new FormData();
    form.append(
      "file",
      new File([blob], "og-card.png", { type: "image/png" }),
    );
    form.append("key", key);
    if (orgShareId) form.append("orgId", orgShareId);

    try {
      const res = await fetch("/api/share-theme/og-card", {
        method: "POST",
        body: form,
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        imageId?: string;
        url?: string;
        state?: ShareOgThemeState;
      };
      if (json.state) setThemeState(json.state);
      return json.imageId && json.url ? { imageId: json.imageId } : null;
    } catch {
      return null;
    }
  }, [
    themeCanEdit,
    step,
    galleryVariant,
    journeyVariant,
    portfolioFilter,
    themeState.active,
    orgShareId,
  ]);

  const fallbackCardShareUrl = useCallback(() => {
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const url = new URL(cardTargetUrl);
    url.searchParams.set("s", token);
    return url.toString();
  }, [cardTargetUrl]);

  /**
   * Tạo URL riêng cho mỗi lần share:
   * - chủ card + snapshot thành công → `/s/[token]` bất biến;
   * - còn lại → URL canonical có `?s=` để Facebook scrape object mới.
   */
  const prepareCardShareUrl = useCallback(async (): Promise<{
    url: string;
    snapshotPublished: boolean;
  }> => {
    warmOnDemandOgImage();
    const snapshot = themeCanEdit ? await publishOgSnapshot() : null;
    if (snapshot) {
      try {
        const res = await fetch("/api/share-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUrl: cardTargetUrl,
            title: `${shareInviteTitle} · CINS`,
            description: shareCardDescription,
            imageId: snapshot.imageId,
            orgId: orgShareId,
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as { shortPath?: string };
          if (json.shortPath?.startsWith("/s/")) {
            return {
              url: `${resolveShareOrigin()}${json.shortPath}`,
              snapshotPublished: true,
            };
          }
        }
      } catch {
        /* fallback `?s=` bên dưới */
      }
    }
    return {
      url: fallbackCardShareUrl(),
      snapshotPublished: Boolean(snapshot),
    };
  }, [
    cardKind,
    cardTargetUrl,
    fallbackCardShareUrl,
    orgShareId,
    profile.displayName,
    publishOgSnapshot,
    shareCardDescription,
    shareInviteTitle,
    themeCanEdit,
    warmOnDemandOgImage,
  ]);

  const copyCardLink = useCallback(async () => {
    if (copyingLink) return;
    setCopyingLink(true);

    const needsPublish =
      themeCanEdit && themeState.active.kind !== "custom";
    if (needsPublish) {
      showFlash("Đang tạo card, bạn đợi xíu nhé…", 60_000);
    }

    try {
      const prepared = await prepareCardShareUrl();
      const ok = await copyTextToClipboard(prepared.url);
      if (!ok) {
        showFlash("Không copy được link. Thử lại giúp mình nhé.");
        return;
      }
      if (themeCanEdit && !prepared.snapshotPublished) {
        showFlash(
          "Đã copy link — ảnh xem trước MXH chưa kịp cập nhật, thử lại giúp mình nhé.",
        );
        return;
      }
      showFlash(
        themeCanEdit
          ? "Sẵn sàng gửi rồi — đã copy link, dán vào MXH hoặc chat nhé."
          : "Đã copy link.",
      );
    } finally {
      setCopyingLink(false);
    }
  }, [
    copyingLink,
    prepareCardShareUrl,
    showFlash,
    themeCanEdit,
    themeState.active.kind,
  ]);

  const nativeShare = useCallback(async () => {
    if (!cardTargetUrl || !navigator.share) return;
    const prepared = await prepareCardShareUrl();
    try {
      await navigator.share({
        title: shareInviteTitle,
        text: shareInviteTitle,
        url: prepared.url,
      });
    } catch {
      /* user cancelled */
    }
  }, [
    cardTargetUrl,
    prepareCardShareUrl,
    shareInviteTitle,
  ]);

  const copyCardImage = useCallback(async () => {
    const el = cardExportRef.current;
    if (!el || copyingImage) return;
    setCopyingImage(true);
    try {
      warmOnDemandOgImage();
      if (themeCanEdit) {
        void publishOgSnapshot();
      }
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
  }, [
    copyingImage,
    profile.slug,
    publishOgSnapshot,
    showFlash,
    themeCanEdit,
    warmOnDemandOgImage,
  ]);

  const socialItems = buildSocialShareItems(
    cardTargetUrl,
    shareInviteTitle,
    {
      onNativeShare: () => void nativeShare(),
      onCopy: () => void copyCardLink(),
      onFacebookShare: () => {
        void (async () => {
          const prepared = await prepareCardShareUrl();
          if (themeCanEdit && !prepared.snapshotPublished) {
            showFlash(
              "Chưa cập nhật được ảnh xem trước — Facebook có thể hiện thẻ cũ.",
            );
          }
          await openFacebookShare(prepared.url, shareInviteTitle);
          const onLocal =
            typeof window !== "undefined" &&
            isLikelyLocalOrPreviewHost(window.location.hostname);
          showFlash(
            onLocal
              ? `Đã copy link ${resolveShareOrigin()} — dán vào bài Facebook nếu composer trống.`
              : "Đã copy link — dán vào bài Facebook nếu chưa thấy preview.",
          );
        })();
      },
    },
  );

  if (!open || !portalReady) return null;
  if (isPopover && !popoverStyle) return null;

  const anchoredStyle = isPopover
    ? {
        top: popoverStyle!.top,
        left: popoverStyle!.left,
        maxWidth: popoverStyle!.maxWidth,
      }
    : undefined;

  const sheetClass =
    "j-share-sheet" +
    (isPopover ? " j-share-sheet--popover" : "") +
    (step !== "menu" ? " is-card-step" : "");

  const shareSubtitle =
    isPopover && step === "menu"
      ? ""
      : stepSubtitle(
          step,
          profile.slug,
          portfolioFilter,
          orgShare,
          orgBaiDangFilterShare,
        );

  const sheet = (
    <section
      ref={sheetRef}
      className={sheetClass}
      role="dialog"
      aria-modal={isPopover ? "false" : "true"}
      aria-labelledby={titleId}
      style={anchoredStyle}
      onClick={(e) => e.stopPropagation()}
    >
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
              {stepTitle(
                step,
                portfolioFilter,
                orgShare,
                orgBaiDangFilterShare,
              )}
            </h2>
            {shareSubtitle ? (
              <p className="j-share-sub">{shareSubtitle}</p>
            ) : null}
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

      {cardKind ? (
        <div className="j-share-card-chrome">
          {showCardKindTabs ? (
            <div
              className="j-share-kind-tabs"
              role="tablist"
              aria-label="Loại thẻ chia sẻ"
            >
              <button
                type="button"
                role="tab"
                aria-selected={cardKind === "journey"}
                className={
                  "j-share-kind-tab" +
                  (cardKind === "journey" ? " is-active" : "")
                }
                onClick={openJourneyCardTab}
              >
                {orgShare?.kind === "cong_dong"
                  ? "Cộng đồng"
                  : orgShare
                    ? "Trang"
                    : "Journey & bài viết"}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={cardKind === "gallery"}
                className={
                  "j-share-kind-tab" +
                  (cardKind === "gallery" ? " is-active" : "")
                }
                onClick={openGalleryCardTab}
              >
                {orgBaiDangFilterShare
                  ? "Bài đăng"
                  : (orgShare?.galleryFeatureLabel ?? "Portfolio")}
              </button>
            </div>
          ) : null}

          {JOURNEY_SHARE_CARD_VARIANTS[cardKind].length > 1 &&
          themeState.active.kind !== "custom" ? (
            <div className="j-share-layout-bar">
              <div className="j-share-layout-label">
                <span>Layout</span>
              </div>
              <div
                className="j-share-variant-row"
                role="tablist"
                aria-label="Chọn layout thẻ"
              >
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
                      className={
                        "j-share-variant-chip" + (active ? " is-active" : "")
                      }
                      title={opt.hint}
                      onClick={() => {
                        if (cardKind === "journey") {
                          const id = opt.id as JourneyJourneyCardVariant;
                          setJourneyVariant(id);
                          void persistTheme({
                            ...themeState,
                            layouts: { ...themeState.layouts, journey: id },
                          });
                        } else {
                          const id = opt.id as JourneyGalleryCardVariant;
                          setGalleryVariant(id);
                          void persistTheme({
                            ...themeState,
                            layouts: { ...themeState.layouts, gallery: id },
                          });
                        }
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
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
                  <span>
                    {orgShare?.kind === "cong_dong"
                      ? "Copy URL cộng đồng vào bộ nhớ tạm"
                      : orgShare
                        ? "Copy URL trang vào bộ nhớ tạm"
                        : "Copy URL Journey vào bộ nhớ tạm"}
                  </span>
                </span>
              </button>

              {orgShare?.kind === "cong_dong" && orgShare.orgId ? (
                <button
                  type="button"
                  className="j-share-menu-item"
                  onClick={() => {
                    const openInvite = () => setStep("invite-friends");
                    if (requireAuth) requireAuth(openInvite);
                    else openInvite();
                  }}
                >
                  <span className="j-share-menu-ic j-share-menu-ic--invite">
                    <Users size={20} strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="j-share-menu-copy">
                    <strong>Mời bạn bè</strong>
                    <span>Thông báo + banner trên Journey của họ</span>
                  </span>
                </button>
              ) : null}

              <button
                type="button"
                className="j-share-menu-item"
                onClick={() => {
                  setPortfolioFilter(null);
                  setStep("journey-card");
                }}
              >
                <span className="j-share-menu-ic j-share-menu-ic--journey">
                  <Map size={20} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="j-share-menu-copy">
                  <strong>
                    {orgShare?.kind === "cong_dong"
                      ? "Chia sẻ cộng đồng"
                      : orgShare?.pageOnly
                        ? "Chia sẻ trang"
                        : "Chia sẻ Card"}
                  </strong>
                  <span>
                    {orgShare?.kind === "cong_dong"
                      ? "Thẻ + MXH — mời người khác tham gia"
                      : orgShare?.pageOnly
                        ? "Thẻ giới thiệu trang"
                        : orgShare
                          ? `Thẻ trang & ${orgShare.galleryFeatureLabel ?? "Portfolio"}`
                          : "Thẻ Journey & bài viết · Portfolio — chọn layout, theme hoặc tải card riêng"}
                  </span>
                </span>
              </button>
            </div>
          ) : step === "invite-friends" && orgShare?.orgId ? (
            <CongDongInviteFriendsPanel
              orgId={orgShare.orgId}
              onDone={(message) => {
                showFlash(message);
                window.setTimeout(() => {
                  setStep("menu");
                }, 1400);
              }}
            />
          ) : cardKind ? (
            <>
              <JourneyShareThemePicker
                state={themeState}
                saving={themeSaving}
                canEdit={themeCanEdit}
                onSelectPreset={(id: ShareOgPresetId) => {
                  void persistTheme({
                    ...themeState,
                    active: { kind: "preset", id },
                  });
                }}
                onSelectCustom={(imageId) => {
                  void persistTheme({
                    ...themeState,
                    active: { kind: "custom", imageId },
                  });
                }}
                onUpload={async (file) => {
                  const form = new FormData();
                  form.set("file", file);
                  if (orgShare?.orgId) form.set("orgId", orgShare.orgId);
                  const res = await fetch("/api/share-theme/upload", {
                    method: "POST",
                    body: form,
                  });
                  if (!res.ok) {
                    const err = (await res.json().catch(() => null)) as {
                      error?: string;
                    } | null;
                    showFlash(err?.error ?? "Upload card thất bại.");
                    return;
                  }
                  const json = (await res.json()) as {
                    imageId?: string;
                    state?: ShareOgThemeState;
                  };
                  if (json.state) {
                    setThemeState(json.state);
                    return;
                  }
                  if (!json.imageId) {
                    showFlash("Upload card thất bại.");
                    return;
                  }
                  await persistTheme({
                    ...themeState,
                    active: { kind: "custom", imageId: json.imageId },
                    customs: [
                      {
                        imageId: json.imageId,
                        createdAt: new Date().toISOString(),
                      },
                      ...themeState.customs.filter(
                        (c) => c.imageId !== json.imageId,
                      ),
                    ].slice(0, 6),
                  });
                }}
                onRemoveCustom={(imageId) => {
                  void persistTheme(
                    {
                      ...themeState,
                      customs: themeState.customs.filter(
                        (c) => c.imageId !== imageId,
                      ),
                      active:
                        themeState.active.kind === "custom" &&
                        themeState.active.imageId === imageId
                          ? { kind: "preset", id: "paper" }
                          : themeState.active,
                    },
                    imageId,
                  );
                }}
              />

              <div className="j-share-preview-wrap">
                <JourneyShareCardPreview
                  kind={cardKind}
                  variant={cardVariant}
                  profile={cardProfile}
                  targetUrl={cardTargetUrl}
                  exportRef={cardExportRef}
                  galleryFeatureLabel={orgShare?.galleryFeatureLabel}
                  theme={themeState.active}
                />
              </div>

              <div className="j-share-actions">
                <button
                  type="button"
                  className={
                    "j-share-action j-share-action--primary" +
                    (copyingLink ? " is-busy" : "")
                  }
                  disabled={copyingLink}
                  aria-busy={copyingLink}
                  onClick={() => void copyCardLink()}
                >
                  {!copyingLink ? (
                    <Copy size={15} strokeWidth={1.8} aria-hidden />
                  ) : null}
                  {copyingLink
                    ? "Đang tạo card, bạn đợi xíu nhé…"
                    : "Copy link"}
                </button>
                <button
                  type="button"
                  className="j-share-action"
                  disabled={copyingImage || copyingLink}
                  title="Copy ảnh PNG thẻ — dán gửi chat/MXH"
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
                          {item.id === "copy" ? (
                            <Copy size={15} strokeWidth={2} aria-hidden />
                          ) : (
                            item.iconLabel
                          )}
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
                          {item.id === "copy" ? (
                            <Copy size={15} strokeWidth={2} aria-hidden />
                          ) : (
                            item.iconLabel
                          )}
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
  );

  if (isPopover) {
    return createPortal(sheet, document.body);
  }

  return createPortal(
    <div
      className="j-share-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {sheet}
    </div>,
    document.body,
  );
}
