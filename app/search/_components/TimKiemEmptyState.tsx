import Link from "next/link";
import { Compass, SearchX } from "lucide-react";

import {
  NGANH_HOC_HUB_PATH,
  NGHE_NGHIEP_HUB_PATH,
  TO_CHUC_HUB_PATH,
} from "@/lib/cins/hubPaths";

export function TimKiemEmptyState({ hasQuery }: { hasQuery: boolean }) {
  if (hasQuery) {
    return (
      <div className="tk-empty tk-empty--query">
        <span className="tk-empty-icon" aria-hidden>
          <SearchX size={28} strokeWidth={1.6} />
        </span>
        <p className="tk-empty-title">Không có kết quả phù hợp</p>
        <p className="tk-empty-desc">
          Thử từ khóa ngắn hơn, bỏ dấu tiếng Việt, hoặc chọn tab khác. Hệ thống vẫn
          gợi ý kết quả gần giống — khớp chính xác luôn được ưu tiên trên cùng.
        </p>
      </div>
    );
  }

  return (
    <div className="tk-empty tk-empty--intro">
      <span className="tk-empty-icon" aria-hidden>
        <Compass size={28} strokeWidth={1.6} />
      </span>
      <p className="tk-empty-title">Khám phá toàn bộ CINs</p>
      <p className="tk-empty-desc">
        Gõ từ khóa ở trên hoặc bắt đầu từ các hub chính — mỗi loại nội dung có layout
        riêng khi có kết quả.
      </p>
      <ul className="tk-empty-links">
        <li>
          <Link href={NGHE_NGHIEP_HUB_PATH}>Khám phá nghề</Link>
        </li>
        <li>
          <Link href={NGANH_HOC_HUB_PATH}>Ngành học</Link>
        </li>
        <li>
          <Link href={TO_CHUC_HUB_PATH}>Tổ chức</Link>
        </li>
        <li>
          <Link href="/community">Cộng đồng</Link>
        </li>
      </ul>
    </div>
  );
}
