"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { TagAggSort } from "@/lib/tag/aggregation-types";

const OPTIONS: { value: TagAggSort; label: string }[] = [
  { value: "moi_nhat", label: "Mới nhất" },
  { value: "nhieu_tuong_tac", label: "Nhiều tương tác" },
  { value: "a_z", label: "A → Z" },
];

export function TagAggSortSelect({ current }: { current: TagAggSort }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="tag-agg-sort">
      <span className="sr-only">Sắp xếp tác phẩm</span>
      <select
        value={current}
        onChange={(e) => {
          const next = new URLSearchParams(searchParams.toString());
          const sort = e.target.value;
          if (sort === "moi_nhat") next.delete("sort");
          else next.set("sort", sort);
          const qs = next.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
