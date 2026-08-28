"use client";

import { Pencil } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  JourneyEditProfileModal,
  type EditProfileInitial,
} from "@/components/journey/JourneyEditProfileModal";
import { JourneyProfileShareTrigger } from "@/components/journey/JourneyProfileShareTrigger";
import type { JourneyShareProfile } from "@/lib/journey/profile-share";
import {
  EDIT_PROFILE_QUERY,
  EDIT_PROFILE_TAB_CUSTOMIZE,
  OPEN_EDIT_PROFILE_EVENT,
  type EditProfileOpenTab,
} from "@/lib/cins/open-edit-profile";

type Props = {
  ownerSlug: string;
  initial: EditProfileInitial;
  shareProfile: JourneyShareProfile;
  viewerProfileId?: string | null;
};

/**
 * Cụm 2 nút action của owner trên sidebar — "Chỉnh sửa hồ sơ" + "Chia sẻ".
 *
 * Tách riêng client component để JourneySidebar (server component) vẫn render
 * markup tĩnh, modal state nằm trong client-only boundary này.
 */
export function JourneySidebarOwnerActions({
  ownerSlug,
  initial,
  shareProfile,
  viewerProfileId = null,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] =
    useState<EditProfileOpenTab>("thong-tin");

  useEffect(() => {
    function onOpen(ev: Event) {
      const tab = (ev as CustomEvent<{ tab?: EditProfileOpenTab }>).detail
        ?.tab;
      setInitialTab(tab === "customize" ? "customize" : "thong-tin");
      setOpen(true);
    }
    window.addEventListener(OPEN_EDIT_PROFILE_EVENT, onOpen);
    return () => {
      window.removeEventListener(OPEN_EDIT_PROFILE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get(EDIT_PROFILE_QUERY) !== EDIT_PROFILE_TAB_CUSTOMIZE) return;
    setInitialTab("customize");
    setOpen(true);
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return (
    <>
      <div className="j-profile-actions">
        <button
          type="button"
          className="j-btn-msg"
          onClick={() => {
            setInitialTab("thong-tin");
            setOpen(true);
          }}
        >
          <Pencil size={14} strokeWidth={1.8} aria-hidden /> Chỉnh sửa hồ sơ
        </button>
        <JourneyProfileShareTrigger
          shareProfile={shareProfile}
          viewerProfileId={viewerProfileId}
        />
      </div>

      <JourneyEditProfileModal
        open={open}
        onClose={() => setOpen(false)}
        initial={initial}
        ownerSlug={ownerSlug}
        initialTab={initialTab}
      />
    </>
  );
}
