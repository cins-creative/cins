import Link from "next/link";
import { Search } from "lucide-react";

import { KhoaHocListingCard } from "@/app/tim-khoa-hoc/_components/KhoaHocListingCard";
import { loadKhoaHocListing } from "@/lib/to-chuc/khoa-hoc-listing";

export async function KhoaHocListingLoader() {
  const { items, total } = await loadKhoaHocListing(24, 0);

  if (items.length === 0) {
    return (
      <p className="tkh-empty">
        Hiện chưa có khóa học nào đang mở đăng ký. Theo dõi cơ sở đào tạo yêu
        thích hoặc thử{" "}
        <Link href="/tim-kiem" prefetch={false}>
          tìm kiếm toàn sàn
        </Link>{" "}
        để khám phá thêm.
      </p>
    );
  }

  return (
    <>
      <p className="tkh-count">
        <strong>{total}</strong> khóa học đang mở
      </p>

      <ul className="tkh-grid">
        {items.map((khoa) => (
          <li key={khoa.id}>
            <KhoaHocListingCard khoa={khoa} />
          </li>
        ))}
      </ul>

      <Link href="/tim-kiem" className="tkh-search-link" prefetch={false}>
        <Search size={14} strokeWidth={2.2} aria-hidden />
        Tìm theo từ khóa trên toàn CINs
      </Link>
    </>
  );
}
