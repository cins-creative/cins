import {
  Briefcase,
  Building2,
  Eye,
  MapPin,
  Route,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import { HaOrgSuggestionRow } from "@/components/cins/home-adaptive/HaOrgSuggestionRow";
import { HaUpdateProjectButton } from "@/components/cins/home-adaptive/HaUpdateProjectButton";
import { HaUserSuggestionRow } from "@/components/cins/home-adaptive/HaUserSuggestionRow";
import { ModuleCard, ModuleEmpty } from "@/components/cins/home-adaptive/ModuleCard";
import { WorldJourneyJobsFab } from "@/components/cins/home-adaptive/WorldJourneyJobsFab";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { loadCoHoiForHome, type CoHoiItem } from "@/lib/cins/home-adaptive/co-hoi";
import {
  loadFollowSuggestions,
  loadOrgFollowSuggestions,
} from "@/lib/cins/home-adaptive/suggestions";
import { loadProfileCompleteness } from "@/lib/cins/home-adaptive/profile-completeness";
import { giaiDoanLabel } from "@/lib/cins/home-adaptive/labels";

/** LÀM · Hồ sơ của bạn (completeness) — nudge studio dễ tìm thấy bạn. */
export async function HoSoCuaBanModule({ ctx }: { ctx: HomeModuleCtx }) {
  const { percent, missing } = await loadProfileCompleteness(ctx.viewerId);
  const nextStep = missing[0];
  const ready = percent >= 100;

  return (
    <ModuleCard
      icon={Route}
      title="Hồ sơ của bạn"
      badge={ready ? "Sẵn sàng" : `${percent}%`}
      className={
        ctx.seeking ? "ha-card--profile ha-card--accent" : "ha-card--profile"
      }
    >
      <div className="ha-profile-body">
        <div className="ha-profile-meter">
          <div
            className="ha-profile-ring"
            style={{ "--ha-pct": percent } as CSSProperties}
            aria-hidden
          >
            <span className="ha-profile-pct">{percent}%</span>
          </div>
          <div className="ha-profile-copy">
            <p className="ha-profile-status">
              {ready ? "Hồ sơ đã hoàn thiện" : "Đang hoàn thiện hồ sơ"}
            </p>
            <p className="ha-profile-hint">
              {nextStep
                ? `${nextStep} để studio dễ tìm thấy bạn.`
                : "Hồ sơ của bạn đã sẵn sàng để studio tìm thấy."}
            </p>
          </div>
        </div>
        <HaUpdateProjectButton viewerSlug={ctx.viewerSlug} className="ha-profile-cta" />
      </div>
      {ctx.seeking ? (
        <div className="ha-profile-open">
          <Eye size={15} strokeWidth={2} aria-hidden />
          <span>
            <b>Đang mở cơ hội</b> — hồ sơ được đẩy tới studio đang tuyển.
          </span>
        </div>
      ) : null}
    </ModuleCard>
  );
}

/** LÀM · Người cùng ngành — gợi ý kết nối. */
export async function NguoiCungNganhModule({ ctx }: { ctx: HomeModuleCtx }) {
  const people = await loadFollowSuggestions(ctx.viewerId, 4);

  return (
    <ModuleCard icon={Users} title="Người cùng ngành" className="ha-card--people">
      {people.length === 0 ? (
        <ModuleEmpty>Chưa có gợi ý kết nối.</ModuleEmpty>
      ) : (
        <div className="ha-people-list">
          {people.map((p) => (
            <HaUserSuggestionRow
              key={p.id}
              variant="person"
              slug={p.slug}
              name={p.name}
              avatarUrl={p.avatarUrl}
              targetUserId={p.id}
              viewerProfileId={ctx.viewerId}
              isFriend={p.isFriend}
              subtitle={
                p.mutualCount > 0
                  ? `${p.mutualCount} bạn chung`
                  : giaiDoanLabel(p.giaiDoan)
              }
            />
          ))}
        </div>
      )}
    </ModuleCard>
  );
}

/** LÀM · Studio & doanh nghiệp gợi ý theo dõi — tách khỏi gợi ý người. */
export async function GoiYStudioModule({ ctx }: { ctx: HomeModuleCtx }) {
  const orgs = await loadOrgFollowSuggestions(ctx.viewerId, 3, {
    loaiToChuc: ["studio", "doanh_nghiep"],
  });

  if (orgs.length === 0) return null;

  return (
    <ModuleCard
      icon={Building2}
      title="Studio & doanh nghiệp"
      moreHref="/studio"
      className="ha-card--studio"
    >
      <div className="ha-studio-list">
        {orgs.map((o) => (
          <HaOrgSuggestionRow key={o.id} org={o} />
        ))}
      </div>
    </ModuleCard>
  );
}

function CoHoiJobRow({ job }: { job: CoHoiItem }) {
  const meta = [job.loaiHinhLabel, job.place, job.linhVucTen].filter(Boolean);

  const body = (
    <div className="ha-job-inner">
      <span className="ha-job-av" aria-hidden>
        {job.avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={job.avatarUrl} alt="" loading="lazy" />
        ) : (
          <span className="ha-job-av-fallback">{job.orgTen.slice(0, 2).toUpperCase()}</span>
        )}
      </span>
      <div className="ha-job-body">
        <div className="ha-job-title">{job.tieuDe}</div>
        <div className="ha-job-org">{job.orgTen}</div>
        {meta.length > 0 ? (
          <div className="ha-job-meta">
            {meta.map((part, i) => (
              <span key={`${part}-${i}`} className="ha-job-meta-part">
                {part === job.place ? (
                  <>
                    <MapPin size={10} strokeWidth={2.2} aria-hidden />
                    {part}
                  </>
                ) : (
                  part
                )}
              </span>
            ))}
          </div>
        ) : null}
        {job.salary ? <div className="ha-job-sal">{job.salary}</div> : null}
      </div>
    </div>
  );

  if (job.href) {
    return (
      <Link href={job.href} className="ha-job" prefetch={false}>
        {body}
      </Link>
    );
  }

  return <div className="ha-job">{body}</div>;
}

export async function CoHoiModule({ ctx }: { ctx: HomeModuleCtx }) {
  const jobs = await loadCoHoiForHome(ctx.giaiDoan, 3);
  return (
    <WorldJourneyJobsFab count={jobs.length}>
      <ModuleCard
        icon={Briefcase}
        title="Cơ hội cho bạn"
        className="ha-card--jobs"
        moreHref="/tuyen-dung"
        moreLabel="Xem thêm"
      >
        {jobs.length === 0 ? (
          <ModuleEmpty>
            Chưa có tin tuyển dụng phù hợp giai đoạn của bạn. Theo dõi studio để
            nhận thông báo khi có vị trí mới.
          </ModuleEmpty>
        ) : (
          <div className="ha-job-list">
            {jobs.map((job) => (
              <CoHoiJobRow key={job.id} job={job} />
            ))}
          </div>
        )}
      </ModuleCard>
    </WorldJourneyJobsFab>
  );
}