import { boPhanTen } from "@/lib/career/boPhanDisplay";
import type { LinhVucRow, NgheNghiepRow } from "@/lib/career/types";

type Props = {
  nghe: NgheNghiepRow;
  linhVucs: LinhVucRow[];
};

function linhTen(lv: LinhVucRow): string {
  return (
    lv.ten_vi ??
    lv.ten_en ??
    lv.title_vietnam ??
    lv.name ??
    ""
  );
}

export function CareerHero({ nghe, linhVucs }: Props) {
  const titleEn = nghe.title_eng ?? "";
  const titleVi = nghe.title_vietnam ?? "";
  const boPhanLabel = boPhanTen(nghe);

  return (
    <header className="career-hero career-surface">
      {boPhanLabel ? (
        <p className="cins-eyebrow career-hero-eyebrow">{boPhanLabel}</p>
      ) : null}
      <div className="career-hero-row">
        <div className="career-hero-copy">
          {titleEn ? <h1 className="cins-h1 career-hero-h1">{titleEn}</h1> : null}
          {titleVi ? (
            <h2 className="cins-h3 career-hero-h3">{titleVi}</h2>
          ) : null}
          {nghe.short_description ? (
            <p className="cins-body-lg career-hero-desc">{nghe.short_description}</p>
          ) : null}
          {linhVucs.length > 0 ? (
            <ul className="career-hero-tags" aria-label="Lĩnh vực">
              {linhVucs.map((lv) => {
                const label = linhTen(lv);
                if (!label) return null;
                const accent = lv.mau_accent ?? "var(--cins-blue-soft)";
                return (
                  <li key={lv.id}>
                    <span
                      className="career-tag"
                      style={{ background: accent, color: "var(--fg-1)" }}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        <div className="career-hero-art">
          {nghe.thumbnail_mascot ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL storage/CDN đa dạng
            <img
              src={nghe.thumbnail_mascot}
              alt=""
              className="career-hero-mascot"
              width={220}
              height={220}
            />
          ) : (
            <div
              className="career-hero-placeholder"
              aria-hidden
              style={{
                background:
                  "linear-gradient(135deg, var(--cins-blue-soft), var(--cins-mint-soft))",
              }}
            />
          )}
        </div>
      </div>
    </header>
  );
}
