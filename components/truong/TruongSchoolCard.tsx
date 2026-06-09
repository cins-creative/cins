import { CoSoListingCard } from "@/components/co-so/CoSoListingCard";
import type { TruongListItem } from "@/lib/truong/types";
import { truongListingHref } from "@/lib/truong/listing-href";
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
  if (school.org_loai === "co_so_dao_tao") {
    return <CoSoListingCard school={school} index={index} />;
  }

  return (
    <TruongUniversityCard
      school={school}
      index={index}
      href={truongListingHref(school)}
      tags={buildTruongUniversityCardTags(school.nganhTags, school.nganhCount)}
      foot={buildTruongUniversityCardFoot(school.nganhCount)}
      dataType={school.loai_truong ?? ""}
    />
  );
}
