"use client";

import { Camera } from "lucide-react";
import { useState } from "react";

import { JourneyAvatarEditor } from "@/components/journey/JourneyAvatarEditor";
import { AVATAR_DISPLAY_PX } from "@/lib/cloudflare/cf-image-variants";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ JourneyAvatarTrigger                                             ║
   ║                                                                  ║
   ║ Bọc khối `.j-avatar` thành nút bấm để mở editor (chỉ render khi   ║
   ║ `isOwner`). Visitor → `JourneyVisitorAvatar` (click xem phóng to). ║
   ║                                                                  ║
   ║ Sidebar (server component) truyền `avatarUrl` đã resolve và      ║
   ║ `initials` để fallback. Sau khi save, server action revalidate   ║
   ║ path → page tự refetch URL Cloudflare delivery mới.              ║
   ╚══════════════════════════════════════════════════════════════════╝ */

type Props = {
  avatarUrl: string | null;
  initials: string;
  alt: string;
};

export function JourneyAvatarTrigger({ avatarUrl, initials, alt }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="j-avatar j-avatar-editable"
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
