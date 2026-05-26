"use client";

import { Camera } from "lucide-react";
import { useState } from "react";

import { JourneyCoverEditor } from "@/components/journey/JourneyCoverEditor";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ JourneyCoverTrigger                                              ║
   ║                                                                  ║
   ║ Bọc khối `.j-profile-cover` thành nút bấm để mở editor (chỉ      ║
   ║ render khi `isOwner`). Visitor view ở Sidebar render `div` tĩnh. ║
   ║                                                                  ║
   ║ Khi `coverUrl` có giá trị → hiển thị ảnh full bleed, blob vàng   ║
   ║ ẩn đi. Khi chưa có cover → giữ gradient + blob mặc định, nút     ║
   ║ hover hiện "Thêm ảnh bìa".                                       ║
   ╚══════════════════════════════════════════════════════════════════╝ */

type Props = {
  coverUrl: string | null;
  alt: string;
};

export function JourneyCoverTrigger({ coverUrl, alt }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`j-profile-cover j-profile-cover-editable${coverUrl ? " has-img" : ""}`}
        onClick={() => setOpen(true)}
        aria-label={coverUrl ? "Đổi ảnh bìa" : "Thêm ảnh bìa"}
      >
        {coverUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={coverUrl} alt={alt} className="j-profile-cover-img" />
        ) : (
          <span className="j-profile-cover-blob" aria-hidden />
        )}
        <span className="j-profile-cover-edit-ico" aria-hidden>
          <Camera size={16} strokeWidth={1.8} />
          <span className="j-profile-cover-edit-label">
            {coverUrl ? "Đổi ảnh bìa" : "Thêm ảnh bìa"}
          </span>
        </span>
      </button>

      <JourneyCoverEditor
        open={open}
        onClose={() => setOpen(false)}
        currentCoverUrl={coverUrl}
        hasCover={!!coverUrl}
      />
    </>
  );
}
