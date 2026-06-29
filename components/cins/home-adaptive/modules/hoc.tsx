import { BookOpen, Compass, Map } from "lucide-react";
import Link from "next/link";

import { ModuleCard, ModuleEmpty } from "@/components/cins/home-adaptive/ModuleCard";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { loadKhoaHocGoiY } from "@/lib/cins/home-adaptive/fetches";
import { listLinhVucForHub } from "@/lib/career/queries";
import {
  linhVucHubHref,
  mapLinhVucForGuestAside,
} from "@/lib/cins/worldJourneyGuestAside";
import { NGHE_NGHIEP_HUB_PATH } from "@/lib/cins/hubPaths";
import { listCoSoDaoTaoForListing } from "@/lib/to-chuc/listing-queries";

/** HỌC · Khám phá theo lĩnh vực. */
export async function KhamPhaLinhVucModule(_props: { ctx: HomeModuleCtx }) {
  const linhVucs = mapLinhVucForGuestAside(await listLinhVucForHub()).slice(0, 6);

  return (
    <ModuleCard
      icon={Compass}
      title="Khám phá theo lĩnh vực"
      moreHref={NGHE_NGHIEP_HUB_PATH}
    >
      {linhVucs.length === 0 ? (
        <ModuleEmpty>Chưa có lĩnh vực — sẽ cập nhật sớm.</ModuleEmpty>
      ) : (
        linhVucs.map((lv) => (
          <Link
            key={lv.slug}
            href={linhVucHubHref(lv.slug)}
            className="ha-cat"
            prefetch={false}
          >
            <span className="ha-cat-dot" style={{ background: lv.accentColor }} />
            <span className="ha-cat-name">{lv.label}</span>
          </Link>
        ))
      )}
    </ModuleCard>
  );
}

/** HỌC · Đường tới đó — trường / cơ sở đào tạo. */
export async function DuongToiDoModule(_props: { ctx: HomeModuleCtx }) {
  const schools = (await listCoSoDaoTaoForListing()).slice(0, 3);

  return (
    <ModuleCard icon={Map} title="Đường tới đó" moreHref="/co-so-dao-tao">
      {schools.length === 0 ? (
        <ModuleEmpty>Chưa có trường — sẽ cập nhật sớm.</ModuleEmpty>
      ) : (
        schools.map((s) => (
          <Link
            key={s.id}
            href={`/co-so-dao-tao/${s.slug}`}
            className="ha-trow"
            prefetch={false}
          >
            <span className="ha-trow-th">
              {s.avatar_src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.avatar_src} alt="" width={46} height={46} />
              ) : (
                s.ten.slice(0, 2).toUpperCase()
              )}
            </span>
            <div className="ha-trow-meta">
              <div className="ha-trow-name">{s.ten}</div>
              <div className="ha-trow-sub">
                {[s.loai_truong, s.tinh_thanh].filter(Boolean).join(" · ") ||
                  "Cơ sở đào tạo"}
              </div>
            </div>
          </Link>
        ))
      )}
    </ModuleCard>
  );
}

/** HỌC · Khóa học gợi ý — khóa đang mở từ cơ sở đào tạo. */
export async function KhoaHocGoiYModule(_props: { ctx: HomeModuleCtx }) {
  const courses = await loadKhoaHocGoiY(4);
  return (
    <ModuleCard icon={BookOpen} title="Khóa học hợp với bạn" moreHref="/co-so-dao-tao">
      {courses.length === 0 ? (
        <ModuleEmpty>Chưa có khóa học đang mở — sẽ cập nhật sớm.</ModuleEmpty>
      ) : (
        courses.map((k) => (
          <Link
            key={k.id}
            href={`/co-so/${k.orgSlug}/khoa-hoc/${k.slug}`}
            className="ha-trow ha-trow--course"
            prefetch={false}
          >
            <span className="ha-trow-th ha-trow-th--course" aria-hidden>
              {k.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={k.thumbnailUrl} alt="" width={64} height={48} loading="lazy" />
              ) : (
                k.ten.slice(0, 2).toUpperCase()
              )}
            </span>
            <div className="ha-trow-meta">
              <div className="ha-trow-name">{k.ten}</div>
              <div className="ha-trow-sub">{k.sub}</div>
            </div>
          </Link>
        ))
      )}
    </ModuleCard>
  );
}
