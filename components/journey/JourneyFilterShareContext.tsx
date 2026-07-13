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
import type { GalleryDisplay } from "@/lib/journey/gallery-display-url";
import {
  dispatchJourneyShareOpen,
  setLiveGalleryItemsForShare,
  type JourneyGalleryFilterShareSpec,
} from "@/lib/journey/gallery-filter-share";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import type { JourneyShareProfile } from "@/lib/journey/profile-share";

type ContextValue = {
  openGalleryFilterShare: (spec: JourneyGalleryFilterShareSpec) => void;
  /** Gallery grid đang mở — cập nhật để share lấy thumb đúng filter. */
  registerGalleryItems: (items: ReadonlyArray<GalleryMainItem>) => void;
  /** Snapshot items đang hiện trên grid (sidebar share / Portfolio card). */
  getLiveGalleryItems: () => ReadonlyArray<GalleryMainItem>;
  /** Chế độ xem gallery (card / lưới gọn) — gắn vào URL chia sẻ. */
  registerGalleryDisplay: (display: GalleryDisplay) => void;
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
  const galleryDisplayRef = useRef<GalleryDisplay>("card");
  const [open, setOpen] = useState(false);
  const [activeSpec, setActiveSpec] =
    useState<JourneyGalleryFilterShareSpec | null>(null);
  const [galleryDisplay, setGalleryDisplay] = useState<GalleryDisplay>("card");
  const [liveGalleryItems, setLiveGalleryItems] = useState<
    ReadonlyArray<GalleryMainItem>
  >([]);

  const registerGalleryItems = useCallback(
    (items: ReadonlyArray<GalleryMainItem>) => {
      liveGalleryItemsRef.current = items;
      setLiveGalleryItemsForShare(items);
    },
    [],
  );

  const getLiveGalleryItems = useCallback(
    () => liveGalleryItemsRef.current,
    [],
  );

  const registerGalleryDisplay = useCallback((display: GalleryDisplay) => {
    galleryDisplayRef.current = display;
  }, []);

  const openGalleryFilterShare = useCallback(
    (spec: JourneyGalleryFilterShareSpec) => {
      dispatchJourneyShareOpen();
      setLiveGalleryItems(liveGalleryItemsRef.current);
      setGalleryDisplay(galleryDisplayRef.current);
      setActiveSpec(spec);
      setOpen(true);
    },
    [],
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setActiveSpec(null);
    setLiveGalleryItems([]);
    setGalleryDisplay("card");
  }, []);

  const value = useMemo(
    () => ({
      openGalleryFilterShare,
      registerGalleryItems,
      getLiveGalleryItems,
      registerGalleryDisplay,
    }),
    [
      openGalleryFilterShare,
      registerGalleryItems,
      getLiveGalleryItems,
      registerGalleryDisplay,
    ],
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
        galleryDisplay={galleryDisplay}
        liveGalleryItems={liveGalleryItems}
      />
    </JourneyFilterShareContext.Provider>
  );
}

export function useJourneyFilterShareOptional(): ContextValue | null {
  return useContext(JourneyFilterShareContext);
}
