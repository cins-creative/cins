"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { JourneyComposeOverlay } from "@/components/journey/JourneyComposeOverlay";
import type { CongDongComposeConfig } from "@/lib/cong-dong/types";
import type { JourneyComposeState } from "@/lib/journey/compose-types";

type JourneyComposeContextValue = {
  compose: JourneyComposeState | null;
  openCompose: (state: JourneyComposeState) => void;
  openComposeWithPhotos: (files: File[]) => void;
  openComposeWithVideo: (file: File) => void;
  consumePendingPhotoFiles: () => File[] | undefined;
  consumePendingVideoFile: () => File | undefined;
  closeCompose: () => void;
  canCompose: boolean;
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
};

function syncComposeUrl(state: JourneyComposeState | null, mode: "push" | "replace") {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.delete("compose");
  params.delete("edit");
  if (state) {
    if (state.kind === "edit") params.set("edit", state.postSlug);
    else params.set("compose", state.kind);
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
}: ProviderProps) {
  const router = useRouter();
  const [compose, setCompose] = useState<JourneyComposeState | null>(
    isOwner ? initialCompose : null,
  );
  const pendingPhotoFilesRef = useRef<File[] | null>(null);
  const pendingVideoFileRef = useRef<File | null>(null);

  const openCompose = useCallback(
    (state: JourneyComposeState) => {
      if (!isOwner) return;
      setCompose(state);
      syncComposeUrl(state, "push");
    },
    [isOwner],
  );

  const openComposeWithPhotos = useCallback(
    (files: File[]) => {
      if (!isOwner || files.length === 0) return;
      pendingPhotoFilesRef.current = files;
      openCompose({ kind: "photo" });
    },
    [isOwner, openCompose],
  );

  const openComposeWithVideo = useCallback(
    (file: File) => {
      if (!isOwner) return;
      pendingVideoFileRef.current = file;
      openCompose({ kind: "video" });
    },
    [isOwner, openCompose],
  );

  const consumePendingPhotoFiles = useCallback(() => {
    const files = pendingPhotoFilesRef.current;
    pendingPhotoFilesRef.current = null;
    return files ?? undefined;
  }, []);

  const consumePendingVideoFile = useCallback(() => {
    const file = pendingVideoFileRef.current;
    pendingVideoFileRef.current = null;
    return file ?? undefined;
  }, []);

  const closeCompose = useCallback(() => {
    setCompose(null);
    syncComposeUrl(null, "replace");
  }, []);

  useEffect(() => {
    if (!isOwner) return;
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const edit = params.get("edit")?.trim();
      const kind = params.get("compose")?.trim();
      if (edit) setCompose({ kind: "edit", postSlug: edit });
      else if (kind === "article" || kind === "photo" || kind === "video") {
        setCompose({ kind });
      } else {
        setCompose(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isOwner]);

  const onPublished = useCallback(() => {
    closeCompose();
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cins:journey-timeline-changed", {
          detail: { ownerSlug },
        }),
      );
    }
    onAfterPublished?.();
    router.refresh();
  }, [closeCompose, onAfterPublished, router, ownerSlug]);

  const value = useMemo(
    () => ({
      compose,
      openCompose,
      openComposeWithPhotos,
      openComposeWithVideo,
      consumePendingPhotoFiles,
      consumePendingVideoFile,
      closeCompose,
      canCompose: isOwner,
    }),
    [
      compose,
      openCompose,
      openComposeWithPhotos,
      openComposeWithVideo,
      consumePendingPhotoFiles,
      consumePendingVideoFile,
      closeCompose,
      isOwner,
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
          consumePendingPhotoFiles={consumePendingPhotoFiles}
          consumePendingVideoFile={consumePendingVideoFile}
          congDongCompose={congDongCompose}
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
      consumePendingPhotoFiles: () => undefined,
      consumePendingVideoFile: () => undefined,
      closeCompose: () => {},
      canCompose: false,
    };
  }
  return ctx;
}

