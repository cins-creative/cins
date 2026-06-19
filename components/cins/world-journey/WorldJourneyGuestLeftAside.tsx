import {
  ArrowRight,
  Box,
  Briefcase,
  Building2,
  Map,
} from "lucide-react";
import Link from "next/link";

import {
  type WjLinhVucAsideItem,
} from "@/lib/cins/worldJourneyGuestAside";
import { NGHE_NGHIEP_HUB_PATH } from "@/lib/cins/hubPaths";

const SCHOOLS = [
  {
    initials: "MT",
    name: "ĐH Mỹ thuật TP.HCM",
    meta: "Công lập · điểm chuẩn 22.5",
    color: "var(--cins-blue)",
  },
  {
    initials: "RM",
    name: "RMIT Việt Nam",
    meta: "Quốc tế · 4 ngành design",
    color: "var(--cins-orange)",
  },
  {
    initials: "SA",
    name: "Sine Art",
    meta: "Trung tâm · luyện vẽ",
    color: "var(--cins-violet)",
  },
] as const;

type Props = {
  linhVucs: ReadonlyArray<WjLinhVucAsideItem>;
  activeLinhVucSlug: string | null;
  onLinhVucFilter: (slug: string | null) => void;
};

/** Cột trái — lĩnh vực (filter feed) + trường. */
export function WorldJourneyGuestLeftAside({
  linhVucs,
  activeLinhVucSlug,
  onLinhVucFilter,
}: Props) {
  return (
    <aside className="wj-guest-aside wj-guest-aside--left" aria-label="Khám phá lĩnh vực">
      <section className="wj-guest-panel">
        <div className="wj-guest-sec-head">
          <span className="wj-guest-sec-num">02</span>
          <div>
            <h2 className="wj-guest-sec-title">Khám phá theo lĩnh vực</h2>
          </div>
        </div>
        <div className="wj-guest-jobs">
          {linhVucs.length > 0 ? (
            linhVucs.map((lv) => (
              <button
                key={lv.slug}
                type="button"
                className={`wj-guest-job${activeLinhVucSlug === lv.slug ? " active" : ""}`}
                aria-pressed={activeLinhVucSlug === lv.slug}
                onClick={() =>
                  onLinhVucFilter(
                    activeLinhVucSlug === lv.slug ? null : lv.slug,
                  )
                }
              >
                <span
                  className="wj-guest-job-dot"
                  style={{ background: lv.accentColor }}
                />
                {lv.label}
              </button>
            ))
          ) : (
            <p className="wj-guest-lv-empty">Chưa có lĩnh vực — sẽ cập nhật sớm.</p>
          )}
        </div>
        <Link href={NGHE_NGHIEP_HUB_PATH} className="wj-guest-sec-more" prefetch={false}>
          Tất cả lĩnh vực
          <ArrowRight size={15} strokeWidth={2} aria-hidden />
        </Link>
      </section>

      <section className="wj-guest-path">
        <div className="wj-guest-path-top">
          <span className="wj-guest-path-icon">
            <Map size={21} strokeWidth={2} aria-hidden />
          </span>
          <div>
            <h3>Đường tới đó: chọn nơi bắt đầu</h3>
            <p>So sánh 38 trường &amp; trung tâm đào tạo — một chặng, không phải đích.</p>
          </div>
        </div>
        <div className="wj-guest-schools">
          {SCHOOLS.map((s) => (
            <div key={s.initials} className="wj-guest-school">
              <span className="wj-guest-school-lg" style={{ background: s.color }}>
                {s.initials}
              </span>
              <div>
                <div className="wj-guest-school-nm">{s.name}</div>
                <div className="wj-guest-school-me">{s.meta}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="wj-guest-cat-links">
          <Link href="/co-so-dao-tao" className="wj-guest-cat-link" prefetch={false}>
            <Building2 size={17} strokeWidth={2} aria-hidden />
            Trường đào tạo
            <ArrowRight size={15} strokeWidth={2} className="wj-guest-cat-arr" aria-hidden />
          </Link>
          <Link href={NGHE_NGHIEP_HUB_PATH} className="wj-guest-cat-link" prefetch={false}>
            <Briefcase size={17} strokeWidth={2} aria-hidden />
            Nghề nghiệp
            <ArrowRight size={15} strokeWidth={2} className="wj-guest-cat-arr" aria-hidden />
          </Link>
          <Link href={NGHE_NGHIEP_HUB_PATH} className="wj-guest-cat-link" prefetch={false}>
            <Box size={17} strokeWidth={2} aria-hidden />
            Phần mềm
            <ArrowRight size={15} strokeWidth={2} className="wj-guest-cat-arr" aria-hidden />
          </Link>
        </div>
      </section>
    </aside>
  );
}
