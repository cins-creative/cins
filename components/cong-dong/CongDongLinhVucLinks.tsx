"use client";

import type { CongDongLinhVuc } from "@/lib/cong-dong/types";

export function CongDongLinhVucLinks({
  linhVucs,
}: {
  linhVucs: CongDongLinhVuc[];
}) {
  if (!linhVucs.length) return null;

  return (
    <section className="cd-v4-categories-block" aria-label="Lĩnh vực">
      <div className="cd-v4-divider cd-v4-divider--tight" />
      <h2 className="cd-v4-sec-title cd-v4-sec-title--tight">Lĩnh vực</h2>
      <ul className="cd-v4-linh-vuc-list">
        {linhVucs.map((item) => (
          <li key={item.id}>
            <span className="cd-v4-linh-vuc-pill">
              {item.mauAccent ? (
                <span
                  className="cd-v4-linh-vuc-dot"
                  style={{ background: item.mauAccent }}
                  aria-hidden
                />
              ) : null}
              {item.ten}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
