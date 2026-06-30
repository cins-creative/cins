import {
  BadgeCheck,
  Briefcase,
  Eye,
  Plus,
  Route,
  Users,
} from "lucide-react";
import Link from "next/link";

import { ModuleCard, ModuleEmpty } from "@/components/cins/home-adaptive/ModuleCard";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { JourneyUserFollowButton } from "@/components/journey/JourneyUserFollowButton";
import { loadCoHoiForHome } from "@/lib/cins/home-adaptive/co-hoi";
import { loadLoiMoiXacNhan } from "@/lib/cins/home-adaptive/fetches";
import { loadFollowSuggestions } from "@/lib/cins/home-adaptive/suggestions";
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
          <div key={p.id} className="ha-row">
            <Link href={`/${p.slug}`} className="ha-row-av" prefetch={false}>
              {p.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.avatarUrl} alt="" width={40} height={40} />
              ) : (
                <span className="ha-row-av-fallback" aria-hidden>
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </Link>
            <div className="ha-row-meta">
              <Link href={`/${p.slug}`} className="ha-row-name" prefetch={false}>
                {p.name}
                <BadgeCheck size={12} strokeWidth={2} aria-hidden />
              </Link>
              <div className="ha-row-sub">
                {p.mutualCount > 0
                  ? `${p.mutualCount} bạn chung`
                  : giaiDoanLabel(p.giaiDoan)}
              </div>
            </div>
            <JourneyUserFollowButton
              targetUserId={p.id}
              viewerProfileId={ctx.viewerId}
              compact
            />
          </div>
        ))
      )}
    </ModuleCard>
  );
}

/**
 * LÀM · Cơ hội (tuyển dụng) — CHƯA CÓ SCHEMA job posting (brief §8).
 * Render placeholder lịch sự; nối data thật sau khi chốt bảng `org_tuyen_dung`.
 */
export async function CoHoiModule({ ctx }: { ctx: HomeModuleCtx }) {
  const jobs = await loadCoHoiForHome(4);
  return (
    <ModuleCard
      icon={Briefcase}
      title={ctx.seeking ? "Cơ hội cho bạn · đang mở" : "Cơ hội cho bạn"}
      className={ctx.seeking ? "ha-card--accent" : undefined}
    >
      {jobs.length === 0 ? (
        <ModuleEmpty>
          Tin tuyển dụng từ studio sẽ xuất hiện ở đây khi tính năng tuyển dụng mở.
        </ModuleEmpty>
      ) : (
        jobs.map((job) => (
          <div key={job.id} className="ha-trow">
            <span className="ha-trow-th" aria-hidden>
              {job.orgTen.slice(0, 2).toUpperCase()}
            </span>
            <div className="ha-trow-meta">
              <div className="ha-trow-name">{job.tieuDe}</div>
              <div className="ha-trow-sub">{job.sub}</div>
            </div>
          </div>
        ))
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

/** Banner open-to-work (§7) — chỉ hiện khi seeking, đầu cột phải cụm LÀM. */
export function OpenToWorkBanner() {
  return (
    <div className="ha-otw">
      <div className="ha-otw-top">
        <span className="ha-otw-dot" aria-hidden />
        Đang mở cơ hội việc làm
      </div>
      <p>
        Hồ sơ của bạn đang được đẩy tới studio đang tuyển. Feed của bạn không đổi —
        chỉ cách người khác thấy bạn đổi.
      </p>
    </div>
  );
}
