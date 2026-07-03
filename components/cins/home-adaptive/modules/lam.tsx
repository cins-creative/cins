import {
  BadgeCheck,
  Briefcase,
  Building2,
  Eye,
  MapPin,
  Plus,
  Route,
  Users,
} from "lucide-react";
import Link from "next/link";

import { HaOrgSuggestionRow } from "@/components/cins/home-adaptive/HaOrgSuggestionRow";
import { HaUserSuggestionRow } from "@/components/cins/home-adaptive/HaUserSuggestionRow";
import { ModuleCard, ModuleEmpty } from "@/components/cins/home-adaptive/ModuleCard";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { loadCoHoiForHome } from "@/lib/cins/home-adaptive/co-hoi";
import { loadLoiMoiXacNhan } from "@/lib/cins/home-adaptive/fetches";
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

  return (
    <ModuleCard icon={Route} title="Hồ sơ của bạn">
      <div className="ha-nudge">
        <div className="ha-nudge-title">Hồ sơ đã đầy {percent}%</div>
        <div className="ha-prog">
          <i style={{ width: `${percent}%` }} />
        </div>
        {nextStep ? (
          <div className="ha-nudge-hint">{nextStep} để studio dễ tìm thấy bạn</div>
        ) : (
          <div className="ha-nudge-hint">Hồ sơ của bạn đã sẵn sàng để studio tìm thấy.</div>
        )}
        <Link href={`/${ctx.viewerSlug}/journey`} className="ha-btn-full" prefetch={false}>
          <Plus size={15} strokeWidth={2} aria-hidden />
          Cập nhật dự án mới
        </Link>
      </div>
      {ctx.seeking ? (
        <div className="ha-vis-note">
          <Eye size={15} strokeWidth={2} aria-hidden />
          <span>
            <b>Đang mở cơ hội</b> — hồ sơ của bạn được đẩy tới studio đang tuyển.
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
    <ModuleCard icon={Users} title="Người cùng ngành">
      {people.length === 0 ? (
        <ModuleEmpty>Chưa có gợi ý kết nối.</ModuleEmpty>
      ) : (
        people.map((p) => (
          <HaUserSuggestionRow
            key={p.id}
            slug={p.slug}
            name={p.name}
            avatarUrl={p.avatarUrl}
            subtitle={
              p.mutualCount > 0
                ? `${p.mutualCount} bạn chung`
                : giaiDoanLabel(p.giaiDoan)
            }
          />
        ))
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
    <ModuleCard icon={Building2} title="Studio & doanh nghiệp" moreHref="/studio">
      {orgs.map((o) => (
        <HaOrgSuggestionRow key={o.id} org={o} />
      ))}
    </ModuleCard>
  );
}

export async function CoHoiModule({ ctx }: { ctx: HomeModuleCtx }) {
  const jobs = await loadCoHoiForHome(ctx.giaiDoan, 3);
  return (
    <ModuleCard
      icon={Briefcase}
      title={ctx.seeking ? "Cơ hội cho bạn · đang mở" : "Cơ hội cho bạn"}
      className={ctx.seeking ? "ha-card--accent" : undefined}
      moreHref="/tuyen-dung"
      moreLabel="Xem thêm"
    >
      {jobs.length === 0 ? (
        <ModuleEmpty>
          Chưa có tin tuyển dụng phù hợp giai đoạn của bạn. Theo dõi studio để nhận
          thông báo khi có vị trí mới.
        </ModuleEmpty>
      ) : (
        jobs.map((job) => {
          const inner = (
            <>
              <span className="ha-trow-th" aria-hidden>
                {job.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={job.avatarUrl} alt="" loading="lazy" />
                ) : (
                  job.orgTen.slice(0, 2).toUpperCase()
                )}
              </span>
              <div className="ha-trow-meta">
                <div className="ha-trow-name">{job.tieuDe}</div>
                <div className="ha-trow-sub ha-trow-sub-text">{job.orgTen}</div>
                <div className="ha-trow-chips">
                  <span className="ha-trow-chip">{job.loaiHinhLabel}</span>
                  <span className="ha-trow-chip">
                    <MapPin size={11} strokeWidth={2} aria-hidden />
                    {job.place}
                  </span>
                  {job.linhVucTen ? (
                    <span className="ha-trow-chip">{job.linhVucTen}</span>
                  ) : null}
                  {job.salary ? (
                    <span className="ha-trow-chip ha-trow-chip--sal">
                      {job.salary}
                    </span>
                  ) : null}
                </div>
              </div>
            </>
          );
          return job.href ? (
            <Link key={job.id} href={job.href} className="ha-trow ha-trow--link" prefetch={false}>
              {inner}
            </Link>
          ) : (
            <div key={job.id} className="ha-trow">
              {inner}
            </div>
          );
        })
      )}
    </ModuleCard>
  );
}

/**
 * LÀM · Lời mời xác nhận — staff invite + verify chờ phản hồi.
 */
export async function LoiMoiXacNhanModule({ ctx }: { ctx: HomeModuleCtx }) {
  const invites = await loadLoiMoiXacNhan(ctx.viewerId, 4);
  return (
    <ModuleCard icon={BadgeCheck} title="Lời mời xác nhận">
      {invites.length === 0 ? (
        <ModuleEmpty>Không có lời mời xác nhận nào đang chờ.</ModuleEmpty>
      ) : (
        invites.map((inv) => (
          <div key={`${inv.kind}:${inv.id}`} className="ha-row">
            <div className="ha-row-meta">
              <div className="ha-row-name">{inv.orgName}</div>
              <div className="ha-row-sub">{inv.label}</div>
            </div>
            {inv.orgSlug ? (
              <Link
                href={inv.kind === "staff" ? `/co-so/${inv.orgSlug}` : "#"}
                className="ha-btn-full"
                style={{
                  width: "auto",
                  padding: "8px 13px",
                  fontSize: 12,
                  flexShrink: 0,
                }}
                prefetch={false}
              >
                Phản hồi
              </Link>
            ) : null}
          </div>
        ))
      )}
    </ModuleCard>
  );
}