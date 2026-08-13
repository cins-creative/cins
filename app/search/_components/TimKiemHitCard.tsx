import type { SearchHit } from "@/lib/search/types";

import { TimKiemArticleCard } from "./cards/TimKiemArticleCard";
import { TimKiemCourseCard } from "./cards/TimKiemCourseCard";
import { TimKiemJobCard } from "./cards/TimKiemJobCard";
import { TimKiemOrgCard } from "./cards/TimKiemOrgCard";
import { TimKiemPostCard } from "./cards/TimKiemPostCard";
import { TimKiemUserCard } from "./cards/TimKiemUserCard";

export function TimKiemHitCard({ hit }: { hit: SearchHit }) {
  switch (hit.kind) {
    case "article":
      return <TimKiemArticleCard hit={hit} />;
    case "khoa_hoc":
      return <TimKiemCourseCard hit={hit} />;
    case "org_tuyen_dung":
      return <TimKiemJobCard hit={hit} />;
    case "org":
      return <TimKiemOrgCard hit={hit} />;
    case "user":
      return <TimKiemUserCard hit={hit} />;
    case "user_post":
      return <TimKiemPostCard hit={hit} variant="journey" />;
    case "org_post":
      return <TimKiemPostCard hit={hit} variant="org" />;
    default:
      return null;
  }
}
