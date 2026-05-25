import { truongDetailHref } from "@/lib/nganh/truong-shared";
import type { TruongListItem } from "@/lib/truong/types";
import {
  buildTruongUniversityCardFoot,
  buildTruongUniversityCardTags,
} from "@/lib/truong/university-card";

import { TruongUniversityCard } from "@/components/truong/TruongUniversityCard";

type Props = {
  school: TruongListItem;
  index: number;
};

export function TruongSchoolCard({ school, index }: Props) {
  return (
    <TruongUniversityCard
      school={school}
      index={index}
      href={truongDetailHref(school.slug)}
      tags={buildTruongUniversityCardTags(school.nganhTags, school.nganhCount)}
      foot={buildTruongUniversityCardFoot(school.nganhCount)}
      dataType={school.loai_truong ?? ""}
    />
  );
}
