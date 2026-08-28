"use client";

import { Camera } from "lucide-react";
import { useEffect, useState } from "react";

import { JourneyAvatarEditor } from "@/components/journey/JourneyAvatarEditor";
import {
  AVATAR_FRAME_PREVIEW_EVENT,
  avatarFrameClass,
  avatarFrameStyle,
  resolveAvatarFrameDto,
  type AvatarFrameDto,
  type AvatarFramePreviewDetail,
} from "@/lib/journey/avatar-frame";
import { AVATAR_DISPLAY_PX } from "@/lib/cloudflare/cf-image-variants";

import "./journey-avatar-frame.css";

type Props = {
  avatarUrl: string | null;
  initials: string;
  alt: string;
  frame?: AvatarFrameDto | null;
};

function AvatarOverlay({ dto }: { dto: AvatarFrameDto | null }) {
  if (!dto?.overlayImageUrl) return null;
  return <span className="j-avf-overlay" aria-hidden />;
}

export function JourneyAvatarTrigger({
  avatarUrl,
  initials,
  alt,
  frame = null,
}: Props) {
  const [open, setOpen] = useState(false);
  const [liveFrame, setLiveFrame] = useState<AvatarFrameDto | null>(frame);

  useEffect(() => {
    setLiveFrame(frame);
  }, [frame]);

  useEffect(() => {
    function onPreview(e: Event) {
      const detail = (e as CustomEvent<AvatarFramePreviewDetail>).detail;
      if (!detail) return;
      setLiveFrame(resolveAvatarFrameDto(detail.frame));
    }
    window.addEventListener(AVATAR_FRAME_PREVIEW_EVENT, onPreview);
    return () => {
      window.removeEventListener(AVATAR_FRAME_PREVIEW_EVENT, onPreview);
    };
  }, []);

  const frameCls = avatarFrameClass(liveFrame);
  const frameVars = avatarFrameStyle(liveFrame);

  return (
    <>
      <button
        type="button"
        className={
          "j-avatar j-avatar-editable" + (frameCls ? ` ${frameCls}` : "")
        }
        style={frameVars}
        onClick={() => setOpen(true)}
        aria-label={avatarUrl ? "Đổi ảnh đại diện" : "Thêm ảnh đại diện"}
      >
        {avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={avatarUrl}
            alt={alt}
            width={AVATAR_DISPLAY_PX}
            height={AVATAR_DISPLAY_PX}
            decoding="async"
          />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
        <AvatarOverlay dto={liveFrame} />
        <span className="j-avatar-edit-ico" aria-hidden>
          <Camera size={18} strokeWidth={1.8} />
        </span>
      </button>

      <JourneyAvatarEditor
        open={open}
        onClose={() => setOpen(false)}
        currentAvatarUrl={avatarUrl}
        hasAvatar={!!avatarUrl}
      />
    </>
  );
}
