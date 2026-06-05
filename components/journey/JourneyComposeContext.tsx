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
import type { JourneyComposeState } from "@/lib/journey/compose-types";

type JourneyComposeContextValue = {
  compose: JourneyComposeState | null;
  openCompose: (state: JourneyComposeState) => void;
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
}: ProviderProps) {
  const router = useRouter();
  const [compose, setCompose] = useState<JourneyComposeState | null>(
    isOwner ? initialCompose : null,
  );

  const openCompose = useCallback(
    (state: JourneyComposeState) => {
      if (!isOwner) return;
      setCompose(state);
      syncComposeUrl(state, "push");
    },
    [isOwner],
  );

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
    router.refresh();
  }, [closeCompose, router]);

  const value = useMemo(
    () => ({
      compose,
      openCompose,
      closeCompose,
      canCompose: isOwner,
    }),
    [compose, openCompose, closeCompose, isOwner],
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
      closeCompose: () => {},
      canCompose: false,
    };
  }
  return ctx;
}

