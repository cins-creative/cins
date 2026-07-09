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
import { useRouter } from "next/navigation";

import { JourneyComposeOverlay } from "@/components/journey/JourneyComposeOverlay";
import type { CongDongComposeConfig } from "@/lib/cong-dong/types";
import type { Tier1EmbedPlatformId } from "@/lib/editor/embed-providers";
import type { JourneyComposeState } from "@/lib/journey/compose-types";
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
  closeCompose: () => void;
  canCompose: boolean;
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
  const params = new URLSearchParams(window.location.search);
  params.delete("compose");
  params.delete("edit");
  params.delete("cotMoc");
  if (state) {
    if (state.kind === "edit") params.set("edit", state.postSlug);
    else if (state.kind === "milestone-edit") {
      params.set("compose", "milestone-edit");
      params.set("cotMoc", state.cotMocId);
    } else if (state.kind === "embed") {
      params.set("compose", "embed");
      params.set("platform", state.platform);
    } else params.set("compose", state.kind);
  }
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
  initialCompose = null,
  onAfterPublished,
  congDongCompose,
  orgBaiDangCompose,
  syncComposeUrl: syncComposeUrlEnabled = true,
}: ProviderProps) {
  const router = useRouter();
  const [compose, setCompose] = useState<JourneyComposeState | null>(
    isOwner ? initialCompose : null,
  );
  const openCompose = useCallback(
    (state: JourneyComposeState) => {
      if (!isOwner) return;
      setCompose(state);
      if (syncComposeUrlEnabled) syncComposeUrl(state, "push");
    },
    [isOwner, syncComposeUrlEnabled],
  );

  const openComposeWithPhotos = useCallback(
    (files: File[]) => {
      if (!isOwner || files.length === 0) return;
      openCompose({ kind: "photo", pendingFiles: files });
    },
    [isOwner, openCompose],
  );

  const openComposeWithVideo = useCallback(
    (file: File) => {
      if (!isOwner) return;
      openCompose({ kind: "video", pendingFile: file });
    },
    [isOwner, openCompose],
  );

  const openComposeWithEmbed = useCallback(
    (platform: Tier1EmbedPlatformId) => {
      if (!isOwner) return;
      openCompose({ kind: "embed", platform });
    },
    [isOwner, openCompose],
  );

  const closeCompose = useCallback(() => {
    setCompose(null);
    if (syncComposeUrlEnabled) syncComposeUrl(null, "replace");
  }, [syncComposeUrlEnabled]);

  useEffect(() => {
    if (syncComposeUrlEnabled || !isOwner) return;
    const params = new URLSearchParams(window.location.search);
    if (
      !params.has("compose") &&
      !params.has("edit") &&
      !params.has("cotMoc")
    ) {
      return;
    }
    params.delete("compose");
    params.delete("edit");
    params.delete("cotMoc");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, [isOwner, syncComposeUrlEnabled]);

  useEffect(() => {
    if (!isOwner || !syncComposeUrlEnabled) return;
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const edit = params.get("edit")?.trim();
      const kind = params.get("compose")?.trim();
      const cotMoc = params.get("cotMoc")?.trim();
      if (edit) setCompose({ kind: "edit", postSlug: edit });
      else if (kind === "milestone-edit" && cotMoc) {
        setCompose({ kind: "milestone-edit", cotMocId: cotMoc });
      } else if (
        kind === "article" ||
        kind === "photo" ||
        kind === "video" ||
        kind === "embed" ||
        kind === "milestone"
      ) {
        if (kind === "embed") {
          const platform = params.get("platform")?.trim();
          if (
            platform === "youtube" ||
            platform === "vimeo" ||
            platform === "figma" ||
            platform === "framer" ||
            platform === "sketchfab" ||
            platform === "rive"
          ) {
            setCompose({ kind: "embed", platform });
          } else {
            setCompose(null);
          }
        } else {
          setCompose({ kind });
        }
      } else {
        setCompose(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isOwner, syncComposeUrlEnabled]);

  const onPublished = useCallback(
    (detail?: ComposePublishedDetail) => {
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
      congDongCompose,
      orgBaiDangCompose,
      onAfterPublished,
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
      closeCompose,
      canCompose: isOwner,
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
      closeCompose,
      isOwner,
      ownerSlug,
      ownerName,
      ownerAvatarUrl,
    ],
  );

  return (
    <JourneyComposeContext.Provider value={value}>
      {children}
      {isOwner && compose ? (
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
      closeCompose: () => {},
      canCompose: false,
      ownerSlug: "",
      ownerName: "",
      ownerAvatarUrl: null,
    };
  }
  return ctx;
}

