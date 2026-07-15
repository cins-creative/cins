"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { JourneyProfileShareModal } from "@/components/journey/JourneyProfileShareModal";
import {
  dispatchJourneyShareOpen,
  type JourneyGalleryFilterShareSpec,
} from "@/lib/journey/gallery-filter-share";
import type { JourneyShareProfile } from "@/lib/journey/profile-share";
import type { OrgShareContext } from "@/lib/org/org-profile-share";

type ContextValue = {
  openBaiDangFilterShare: (spec: JourneyGalleryFilterShareSpec) => void;
};

const OrgBaiDangFilterShareContext = createContext<ContextValue | null>(null);

type ProviderProps = {
  profile: JourneyShareProfile;
  orgShare: OrgShareContext;
  viewerProfileId?: string | null;
  children: ReactNode;
};

/** Modal chia sẻ deep link tab Bài đăng theo nhãn / bộ lọc (`?filter=`). */
export function OrgBaiDangFilterShareProvider({
  profile,
  orgShare,
  viewerProfileId = null,
  children,
}: ProviderProps) {
  const [open, setOpen] = useState(false);
  const [activeSpec, setActiveSpec] =
    useState<JourneyGalleryFilterShareSpec | null>(null);

  const openBaiDangFilterShare = useCallback(
    (spec: JourneyGalleryFilterShareSpec) => {
      dispatchJourneyShareOpen();
      setActiveSpec(spec);
      setOpen(true);
    },
    [],
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setActiveSpec(null);
  }, []);

  const value = useMemo(
    () => ({ openBaiDangFilterShare }),
    [openBaiDangFilterShare],
  );

  return (
    <OrgBaiDangFilterShareContext.Provider value={value}>
      {children}
      <JourneyProfileShareModal
        open={open}
        onClose={handleClose}
        profile={profile}
        viewerProfileId={viewerProfileId}
        orgShare={orgShare}
        galleryFilter={activeSpec}
        presentation="modal"
        orgBaiDangFilterShare
      />
    </OrgBaiDangFilterShareContext.Provider>
  );
}

export function useOrgBaiDangFilterShareOptional(): ContextValue | null {
  return useContext(OrgBaiDangFilterShareContext);
}
