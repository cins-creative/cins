"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { JourneyProfileShareModal } from "@/components/journey/JourneyProfileShareModal";
import {
  dispatchJourneyShareOpen,
  type JourneyGalleryFilterShareSpec,
} from "@/lib/journey/gallery-filter-share";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import type { JourneyShareProfile } from "@/lib/journey/profile-share";

type ContextValue = {
  openGalleryFilterShare: (spec: JourneyGalleryFilterShareSpec) => void;
  /** Gallery grid đang mở — cập nhật để share lấy thumb đúng filter. */
  registerGalleryItems: (items: ReadonlyArray<GalleryMainItem>) => void;
};

const JourneyFilterShareContext = createContext<ContextValue | null>(null);

type ProviderProps = {
  profile: JourneyShareProfile;
  viewerProfileId?: string | null;
  children: ReactNode;
};

/** Provider modal chia sẻ Gallery theo dòng filter dropdown. */
export function JourneyFilterShareProvider({
  profile,
  viewerProfileId = null,
  children,
}: ProviderProps) {
  const liveGalleryItemsRef = useRef<ReadonlyArray<GalleryMainItem>>([]);
  const [open, setOpen] = useState(false);
  const [activeSpec, setActiveSpec] =
    useState<JourneyGalleryFilterShareSpec | null>(null);
  const [liveGalleryItems, setLiveGalleryItems] = useState<
    ReadonlyArray<GalleryMainItem>
  >([]);

  const registerGalleryItems = useCallback(
    (items: ReadonlyArray<GalleryMainItem>) => {
      liveGalleryItemsRef.current = items;
    },
    [],
  );

  const openGalleryFilterShare = useCallback(
    (spec: JourneyGalleryFilterShareSpec) => {
      dispatchJourneyShareOpen();
      setLiveGalleryItems(liveGalleryItemsRef.current);
      setActiveSpec(spec);
      setOpen(true);
    },
    [],
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setActiveSpec(null);
    setLiveGalleryItems([]);
  }, []);

  const value = useMemo(
    () => ({ openGalleryFilterShare, registerGalleryItems }),
    [openGalleryFilterShare, registerGalleryItems],
  );

  return (
    <JourneyFilterShareContext.Provider value={value}>
      {children}
      <JourneyProfileShareModal
        open={open}
        onClose={handleClose}
        profile={profile}
        viewerProfileId={viewerProfileId}
        galleryFilter={activeSpec}
        liveGalleryItems={liveGalleryItems}
      />
    </JourneyFilterShareContext.Provider>
  );
}

export function useJourneyFilterShareOptional(): ContextValue | null {
  return useContext(JourneyFilterShareContext);
}
