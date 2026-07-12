"use client";

import { CongDongCategoryRowLink } from "@/components/cong-dong/CongDongCategoryRowLink";
import type { CongDongCategory } from "@/lib/cong-dong/types";

export function CongDongCategoryLinks({
  categories,
}: {
  categories: CongDongCategory[];
}) {
  if (!categories.length) return null;

  return (
    <section className="cd-v4-categories-block" aria-label="Ngành liên quan">
      <div className="cd-v4-divider cd-v4-divider--tight" />
      <h2 className="cd-v4-sec-title cd-v4-sec-title--tight">Ngành liên quan</h2>
      <ul className="cd-v4-categories">
        {categories.map((item) => (
          <li key={item.id}>
            <CongDongCategoryRowLink item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
