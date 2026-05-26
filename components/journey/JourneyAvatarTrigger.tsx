"use client";

import { Camera } from "lucide-react";
import { useState } from "react";

import { JourneyAvatarEditor } from "@/components/journey/JourneyAvatarEditor";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ JourneyAvatarTrigger                                             ║
   ║                                                                  ║
   ║ Bọc khối `.j-avatar` thành nút bấm để mở editor (chỉ render khi   ║
   ║ `isOwner`). Visitor view → chỉ là `div` tĩnh, không hover.       ║
   ║                                                                  ║
   ║ Sidebar (server component) truyền `avatarUrl` đã resolve và      ║
   ║ `initials` để fallback. Sau khi save, server action revalidate   ║
   ║ path → page tự refetch URL Cloudflare delivery mới.              ║
   ╚══════════════════════════════════════════════════════════════════╝ */

type Props = {
  avatarUrl: string | null;
  initials: string;
  alt: string;
  badge: string;
};

export function JourneyAvatarTrigger({
  avatarUrl,
  initials,
  alt,
  badge,
}: Props) {
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
          <img src={avatarUrl} alt={alt} />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
        <span className="j-avatar-badge" aria-label={`Journey ${badge}`}>
          {badge}
        </span>
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
