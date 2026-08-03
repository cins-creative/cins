"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import type { XoaBlocker, XoaCanhBao } from "@/lib/to-chuc/khoa-lop-xoa-types";

type Props = {
  blockers?: XoaBlocker[];
  canhBao?: XoaCanhBao[];
  /**
   * Gọi trước khi điều hướng / xử lý cùng trang.
   * Dùng để đóng modal — tránh «Xử lý» trỏ đúng URL đang mở mà modal vẫn đè.
   */
  onBeforeXuLy?: () => void;
  /**
   * Xử lý blocker trên cùng trang (vd. chuyển tab Lớp + lọc khóa).
   * Trả `true` = đã xử lý, không `router.push`.
   */
  onXuLyCungTrang?: (blocker: XoaBlocker) => boolean;
};

export function XoaBlockerList({
  blockers = [],
  canhBao = [],
  onBeforeXuLy,
  onXuLyCungTrang,
}: Props) {
  const router = useRouter();

  if (blockers.length === 0 && canhBao.length === 0) return null;

  function handleXuLy(b: XoaBlocker) {
    onBeforeXuLy?.();
    if (onXuLyCungTrang?.(b)) return;
    if (b.duongDan) router.push(b.duongDan);
  }

  return (
    <div className="cso-xoa-lists">
      {blockers.length > 0 ? (
        <div className="cso-xoa-blockers" role="alert">
          <p className="cso-xoa-blockers-title">
            <AlertTriangle size={15} strokeWidth={2.2} aria-hidden />
            Không xóa được — còn dữ liệu ràng buộc
          </p>
          <ul className="cso-xoa-list">
            {blockers.map((b) => (
              <li key={b.loai}>
                <span>{b.nhan}</span>
                {b.duongDan || onXuLyCungTrang ? (
                  onBeforeXuLy || onXuLyCungTrang ? (
                    <button
                      type="button"
                      className="cso-xoa-link"
                      onClick={() => handleXuLy(b)}
                    >
                      Xử lý
                    </button>
                  ) : b.duongDan ? (
                    <Link href={b.duongDan} className="cso-xoa-link">
                      Xử lý
                    </Link>
                  ) : null
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {canhBao.length > 0 ? (
        <div className="cso-xoa-warnings">
          <p className="cso-xoa-warnings-title">Khi xóa sẽ xảy ra:</p>
          <ul className="cso-xoa-list">
            {canhBao.map((c) => (
              <li key={c.loai}>{c.nhan}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
