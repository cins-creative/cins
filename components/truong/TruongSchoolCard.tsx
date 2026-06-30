import { CoSoListingCard } from "@/components/co-so/CoSoListingCard";
import type { TruongListItem } from "@/lib/truong/types";
import { truongListingHref } from "@/lib/truong/listing-href";
import {
  buildTruongUniversityCardFoot,
  type TruongUniversityCardTag,
} from "@/lib/truong/university-card";

import { TruongUniversityCard } from "@/components/truong/TruongUniversityCard";

type Props = {
  school: TruongListItem;
  index: number;
};

export function TruongSchoolCard({ school, index }: Props) {
  if (school.org_loai === "co_so_dao_tao") {
    return <CoSoListingCard school={school} index={index} />;
  }

  // Trang listing trường: chỉ hiển thị tổng số ngành đào tạo thay vì liệt kê tag.
  const tags: TruongUniversityCardTag[] = [
    school.nganhCount > 0
      ? { label: `${school.nganhCount} ngành đào tạo`, muted: true }
      : { label: "Đang cập nhật", muted: true },
  ];

  return (
    <TruongUniversityCard
      school={school}
      index={index}
      href={truongListingHref(school)}
      tags={tags}
      foot={buildTruongUniversityCardFoot(school.nganhCount)}
      dataType={school.loai_truong ?? ""}
      variant="listing"
    />
  );
}
