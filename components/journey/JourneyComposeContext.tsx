"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { JourneyPersonalFilterProvider } from "@/components/journey/JourneyPersonalFilterContext";

const JourneyComposeOverlay = dynamic(
  () =>
    import("@/components/journey/JourneyComposeOverlay").then((mod) => ({
      default: mod.JourneyComposeOverlay,
    })),
  { ssr: false },
);
import type { CongDongComposeConfig } from "@/lib/cong-dong/types";
import type { Tier1EmbedPlatformId } from "@/lib/editor/embed-providers";
import {
  buildComposeEditorDraftKey,
  buildComposeEmbedDraftKey,
  clearComposeEditorDraft,
  clearComposeSessionDrafts,
  composeDraftHasLottieFileAsset,
  composeDraftHasRestorableContent,
  composeDraftHasRiveFileAsset,
  readComposeEmbedFileDraft,
} from "@/lib/journey/compose-editor-draft";
import type { JourneyComposeState } from "@/lib/journey/compose-types";
import {
  composeStateToSearchParams,
  parseComposeSearchParams,
} from "@/lib/journey/compose-types";
import type { ComposePublishedDetail } from "@/lib/journey/compose-published-sync";
import { dispatchComposePublished } from "@/lib/journey/compose-published-sync";
import { getAvatarUrl } from "@/lib/journey/profile";
import type { OrgBaiDangComposeConfig } from "@/lib/truong/org-bai-dang-compose";

type JourneyComposeContextValue = {
  compose: JourneyComposeState | null;
  openCompose: (state: JourneyComposeState) => void;
  openComposeWithPhotos: (files: File[]) => void;
  openComposeWithVideo: (file: File) => void;
  openComposeWithEmbed: (platform: Tier1EmbedPlatformId) => void;
  openComposeWithRiveFile: (
    file: File,
    options?: { replaceDraft?: boolean },
  ) => void;
  openComposeWithLottieFile: (
    file: File,
    options?: { replaceDraft?: boolean },
  ) => void;
  /** Mở lại nháp Rive/Lottie file (không cần chọn File mới). */
  openComposeEmbedFileDraft: (platform: "rive" | "lottie") => boolean;
  /** true nếu localStorage còn nháp embed file đáng mở lại. */
  hasComposeEmbedFileDraft: (platform: "rive" | "lottie") => boolean;
  closeCompose: () => void;
  canCompose: boolean;
  /** Admin sửa bài nick seeding — không phải chủ hồ sơ thật. */
  adminSeedingEdit: boolean;
  ownerId: string;
  ownerSlug: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
};

const JourneyComposeContext = createContext<JourneyComposeContextValue | null>(
  null,
);

type ProviderProps = {
  children: ReactNode;
  ownerId: string;
  ownerSlug: string;
  ownerName: string;
  ownerAvatarId?: string | null;
  isOwner: boolean;
  /**
   * Admin (`canManageUsers`) trên nick seeding — compose/sửa bài như chủ,
   * không mở khoá chỉnh hồ sơ / sidebar.
   */
  adminSeedingEdit?: boolean;
  initialCompose?: JourneyComposeState | null;
  /** Hook sau publish (vd. refetch feed cộng đồng). */
  onAfterPublished?: () => void;
  /** Trang cộng đồng — topbar compose dùng chọn nhãn thay visibility. */
  congDongCompose?: CongDongComposeConfig;
  /** Tab bài đăng trường — publish vào `org_bai_dang`. */
  orgBaiDangCompose?: OrgBaiDangComposeConfig;
  /**
   * Đồng bộ `?compose=` lên URL (pushState). Tắt trên trang chủ feed — tránh entry
   * history cũ khiến Back từ trang khác mở lại `/?compose=article`.
   */
  syncComposeUrl?: boolean;
};

function syncComposeUrl(state: JourneyComposeState | null, mode: "push" | "replace") {
  if (typeof window === "undefined") return;
  const params = composeStateToSearchParams(state);
  const qs = params.toString();
  const href = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  if (mode === "push") window.history.pushState(null, "", href);
  else window.history.replaceState(null, "", href);
}

export function JourneyComposeProvider({
  children,
  ownerId,
  ownerSlug,
  ownerName,
  ownerAvatarId,
  isOwner,
  adminSeedingEdit = false,
  initialCompose = null,
  onAfterPublished,
  congDongCompose,
  orgBaiDangCompose,
  syncComposeUrl: syncComposeUrlEnabled = true,
}: ProviderProps) {
  const router = useRouter();
  const canCompose = isOwner || adminSeedingEdit;
  const [compose, setCompose] = useState<JourneyComposeState | null>(
    canCompose ? initialCompose : null,
  );

  useEffect(() => {
    if (!canCompose) return;
    void import("@/components/journey/JourneyComposeOverlay");
  }, [canCompose]);
  const openCompose = useCallback(
    (state: JourneyComposeState) => {
      if (!canCompose) return;
      setCompose(state);
      if (syncComposeUrlEnabled) syncComposeUrl(state, "push");
    },
    [canCompose, syncComposeUrlEnabled],
  );

  const openComposeWithPhotos = useCallback(
    (files: File[]) => {
      if (!canCompose || files.length === 0) return;
      openCompose({ kind: "photo", pendingFiles: files });
    },
    [canCompose, openCompose],
  );

  const openComposeWithVideo = useCallback(
    (file: File) => {
      if (!canCompose) return;
      openCompose({ kind: "video", pendingFile: file });
    },
    [canCompose, openCompose],
  );

  const openComposeWithEmbed = useCallback(
    (platform: Tier1EmbedPlatformId) => {
      if (!canCompose) return;
      openCompose({ kind: "embed", platform, fileSource: "url" });
    },
    [canCompose, openCompose],
  );

  const hasComposeEmbedFileDraft = useCallback(
    (platform: "rive" | "lottie") => {
      if (!canCompose) return false;
      return composeDraftHasRestorableContent(
        readComposeEmbedFileDraft({
          ownerSlug,
          platform,
          congDongCompose,
          orgBaiDangCompose,
        }),
      );
    },
    [canCompose, ownerSlug, congDongCompose, orgBaiDangCompose],
  );

  const openComposeEmbedFileDraft = useCallback(
    (platform: "rive" | "lottie") => {
      if (!canCompose) return false;
      if (!hasComposeEmbedFileDraft(platform)) return false;
      openCompose({ kind: "embed", platform, fileSource: "file" });
      return true;
    },
    [canCompose, hasComposeEmbedFileDraft, openCompose],
  );

  const clearComposeEmbedFileDraft = useCallback(
    (platform: "rive" | "lottie") => {
      clearComposeEditorDraft(
        buildComposeEmbedDraftKey({
          ownerSlug,
          platform,
          source: "file",
          congDongCompose,
          orgBaiDangCompose,
        }),
      );
      /* Key legacy chưa gắn :file|:url */
      clearComposeEditorDraft(
        `${buildComposeEditorDraftKey({
          ownerSlug,
          composeIntent: "embed",
          congDongCompose,
          orgBaiDangCompose,
        })}:${platform}`,
      );
    },
    [ownerSlug, congDongCompose, orgBaiDangCompose],
  );

  const openComposeWithRiveFile = useCallback(
    (file: File, options?: { replaceDraft?: boolean }) => {
      if (!canCompose) return;
      if (options?.replaceDraft) {
        clearComposeEmbedFileDraft("rive");
      } else {
        const draft = readComposeEmbedFileDraft({
          ownerSlug,
          platform: "rive",
          congDongCompose,
          orgBaiDangCompose,
        });
        /* Nháp đã có .riv trên CINs → mở lại không kèm File (tránh ghi đè). */
        if (composeDraftHasRiveFileAsset(draft)) {
          openCompose({ kind: "embed", platform: "rive", fileSource: "file" });
          return;
        }
      }
      openCompose({
        kind: "embed",
        platform: "rive",
        fileSource: "file",
        pendingEmbedFile: file,
      });
    },
    [
      canCompose,
      ownerSlug,
      congDongCompose,
      orgBaiDangCompose,
      openCompose,
      clearComposeEmbedFileDraft,
    ],
  );

  const openComposeWithLottieFile = useCallback(
    (file: File, options?: { replaceDraft?: boolean }) => {
      if (!canCompose) return;
      if (options?.replaceDraft) {
        clearComposeEmbedFileDraft("lottie");
      } else {
        const draft = readComposeEmbedFileDraft({
          ownerSlug,
          platform: "lottie",
          congDongCompose,
          orgBaiDangCompose,
        });
        if (composeDraftHasLottieFileAsset(draft)) {
          openCompose({ kind: "embed", platform: "lottie", fileSource: "file" });
          return;
        }
      }
      openCompose({
        kind: "embed",
        platform: "lottie",
        fileSource: "file",
        pendingEmbedFile: file,
      });
    },
    [
      canCompose,
      ownerSlug,
      congDongCompose,
      orgBaiDangCompose,
      openCompose,
      clearComposeEmbedFileDraft,
    ],
  );

  const closeCompose = useCallback(() => {
    setCompose(null);
    if (syncComposeUrlEnabled) syncComposeUrl(null, "replace");
  }, [syncComposeUrlEnabled]);

  useEffect(() => {
    if (syncComposeUrlEnabled || !canCompose) return;
    const params = new URLSearchParams(window.location.search);
    if (
      !params.has("compose") &&
      !params.has("edit") &&
      !params.has("editMoc") &&
      !params.has("cotMoc")
    ) {
      return;
    }
    params.delete("compose");
    params.delete("edit");
    params.delete("editMoc");
    params.delete("cotMoc");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, [canCompose, syncComposeUrlEnabled]);

  useEffect(() => {
    if (!canCompose || !syncComposeUrlEnabled) return;
    const onPop = () => {
      setCompose(
        parseComposeSearchParams(new URLSearchParams(window.location.search)),
      );
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [canCompose, syncComposeUrlEnabled]);

  const onPublished = useCallback(
    (detail?: ComposePublishedDetail) => {
      /* Xóa nháp trước khi đóng sheet — tránh mở lại còn bài vừa đăng. */
      const scopes =
        compose?.kind === "photo" && compose.draftScope
          ? [compose.draftScope]
          : undefined;
      clearComposeSessionDrafts({
        ownerSlug,
        congDongCompose,
        orgBaiDangCompose,
        scopes,
      });
      closeCompose();
      if (
        typeof window !== "undefined" &&
        !congDongCompose &&
        !orgBaiDangCompose
      ) {
        if (detail?.ownerSlug) {
          dispatchComposePublished({
            ...detail,
            ownerProfileId: detail.ownerProfileId ?? ownerId,
          });
        } else {
          window.dispatchEvent(
            new CustomEvent("cins:journey-timeline-changed", {
              detail: { ownerSlug },
            }),
          );
        }
      }
      onAfterPublished?.();
      if (!orgBaiDangCompose) {
        router.refresh();
      }
    },
    [
      closeCompose,
      compose,
      congDongCompose,
      orgBaiDangCompose,
      onAfterPublished,
      ownerId,
      router,
      ownerSlug,
    ],
  );

  const ownerAvatarUrl = useMemo(
    () => getAvatarUrl(ownerAvatarId ?? null),
    [ownerAvatarId],
  );

  const value = useMemo(
    () => ({
      compose,
      openCompose,
      openComposeWithPhotos,
      openComposeWithVideo,
      openComposeWithEmbed,
      openComposeWithRiveFile,
      openComposeWithLottieFile,
      openComposeEmbedFileDraft,
      hasComposeEmbedFileDraft,
      closeCompose,
      canCompose,
      adminSeedingEdit,
      ownerId,
      ownerSlug,
      ownerName,
      ownerAvatarUrl,
    }),
    [
      compose,
      openCompose,
      openComposeWithPhotos,
      openComposeWithVideo,
      openComposeWithEmbed,
      openComposeWithRiveFile,
      openComposeWithLottieFile,
      openComposeEmbedFileDraft,
      hasComposeEmbedFileDraft,
      closeCompose,
      canCompose,
      adminSeedingEdit,
      ownerId,
      ownerSlug,
      ownerName,
      ownerAvatarUrl,
    ],
  );

  return (
    <JourneyComposeContext.Provider value={value}>
      <JourneyPersonalFilterProvider ownerId={ownerId} isOwner={isOwner}>
        {children}
        {canCompose && compose ? (
          <JourneyComposeOverlay
            compose={compose}
            ownerId={ownerId}
            ownerSlug={ownerSlug}
            ownerName={ownerName}
            ownerAvatarId={ownerAvatarId}
            congDongCompose={congDongCompose}
            orgBaiDangCompose={orgBaiDangCompose}
            onClose={closeCompose}
            onPublished={onPublished}
          />
        ) : null}
      </JourneyPersonalFilterProvider>
    </JourneyComposeContext.Provider>
  );
}

export function useJourneyCompose(): JourneyComposeContextValue {
  const ctx = useContext(JourneyComposeContext);
  if (!ctx) {
    return {
      compose: null,
      openCompose: () => {},
      openComposeWithPhotos: () => {},
      openComposeWithVideo: () => {},
      openComposeWithEmbed: () => {},
      openComposeWithRiveFile: () => {},
      openComposeWithLottieFile: () => {},
      openComposeEmbedFileDraft: () => false,
      hasComposeEmbedFileDraft: () => false,
      closeCompose: () => {},
      canCompose: false,
      adminSeedingEdit: false,
      ownerId: "",
      ownerSlug: "",
      ownerName: "",
      ownerAvatarUrl: null,
    };
  }
  return ctx;
}

