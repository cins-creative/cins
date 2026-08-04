"use client";

import {
  Briefcase,
  Building2,
  CalendarDays,
  Compass,
  Eye,
  GraduationCap,
  Loader2,
  MapPin,
  Package,
  Route,
  School,
  Sparkles,
  UserRoundPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import { HangFeaturePanel } from "@/components/cins/home-adaptive/modules/HangFeatureClient";
import { HaOrgSuggestionRow } from "@/components/cins/home-adaptive/HaOrgSuggestionRow";
import { HaOrgUpcomingEventsPanel } from "@/components/cins/home-adaptive/HaOrgUpcomingEventsPanel";
import { HaUpdateProjectButton } from "@/components/cins/home-adaptive/HaUpdateProjectButton";
import { HaUserSuggestionRow } from "@/components/cins/home-adaptive/HaUserSuggestionRow";
import {
  DonCanXuLyPanel,
  DonHangHomeList,
} from "@/components/cins/home-adaptive/modules/DonCanXuLyClient";
import { giaiDoanLabel } from "@/lib/cins/home-adaptive/labels";
import { MODULE_META } from "@/lib/cins/home-adaptive/module-meta";
import type { ModulePreviewPayload } from "@/lib/cins/home-adaptive/module-preview-types";
import type { ModuleId } from "@/lib/cins/home-adaptive/persona";
import { linhVucHubHref } from "@/lib/cins/worldJourneyGuestAside";
import { coSoKhoaHocDetailPath } from "@/lib/to-chuc/co-so-routes";

const TITLE_ICON: Partial<Record<ModuleId, LucideIcon>> = {
  theo_doi_org: CalendarDays,
  goi_y_theo_doi: UserRoundPlus,
  nguoi_cung_nganh: Users,
  goi_y_studio: Building2,
  duong_toi_do: GraduationCap,
  kham_pha_linh_vuc: Compass,
  khoa_hoc_goi_y: GraduationCap,
  lop_hoc_cua_ban: School,
  ho_so_cua_ban: Route,
  co_hoi: Briefcase,
  cho_ban_duyet: Sparkles,
  hoc_vien_cua_ban: Users,
  scout_tai_nang: Sparkles,
  hang_feature: Package,
};

function PreviewShell({
  id,
  className,
  title,
  children,
}: {
  id: ModuleId;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  const meta = MODULE_META[id];
  const Icon = TITLE_ICON[id];
  return (
    <section className={`ha-card${className ? ` ${className}` : ""}`}>
      <div className="ha-card-head">
        {Icon ? <Icon size={16} strokeWidth={2} aria-hidden /> : null}
        <span className="ha-card-title">{title ?? meta.label}</span>
      </div>
      {children}
    </section>
  );
}

export function HomeModuleLivePreview({
  payload,
  viewerProfileId = "",
}: {
  payload: ModulePreviewPayload;
  viewerProfileId?: string;
}) {
  if (payload.empty) {
    return (
      <PreviewShell id={payload.id}>
        <p className="ha-card-empty">Chưa có nội dung để hiển thị.</p>
      </PreviewShell>
    );
  }

  switch (payload.id) {
    case "theo_doi_org":
      return (
        <HaOrgUpcomingEventsPanel
          allItems={payload.allItems}
          myItems={payload.myItems}
          myEventsTotal={payload.myEventsTotal}
          title={MODULE_META.theo_doi_org.label}
        />
      );
    case "goi_y_theo_doi":
    case "nguoi_cung_nganh":
      return (
        <PreviewShell
          id={payload.id}
          className={
            payload.id === "nguoi_cung_nganh" ? "ha-card--people" : undefined
          }
        >
          <div className="ha-people-list">
            {payload.people.map((p) => (
              <HaUserSuggestionRow
                key={p.id}
                variant="person"
                slug={p.slug}
                name={p.name}
                avatarUrl={p.avatarUrl}
                targetUserId={p.id}
                viewerProfileId={viewerProfileId}
                isFriend={p.isFriend}
                subtitle={
                  p.mutualCount > 0
                    ? `${p.mutualCount} bạn chung`
                    : giaiDoanLabel(p.giaiDoan)
                }
              />
            ))}
          </div>
        </PreviewShell>
      );
    case "goi_y_studio":
    case "duong_toi_do":
      return (
        <PreviewShell
          id={payload.id}
          className={payload.id === "goi_y_studio" ? "ha-card--studio" : undefined}
        >
          <div className="ha-studio-list">
            {payload.orgs.map((o) => (
              <HaOrgSuggestionRow key={o.id} org={o} />
            ))}
          </div>
        </PreviewShell>
      );
    case "kham_pha_linh_vuc":
      return (
        <PreviewShell id={payload.id} title="Lĩnh vực">
          {payload.linhVucs.map((lv) => (
            <Link
              key={lv.slug}
              href={linhVucHubHref(lv.slug)}
              className="ha-cat"
              prefetch={false}
            >
              <span
                className="ha-cat-dot"
                style={{ background: lv.accentColor }}
              />
              <span className="ha-cat-name">{lv.label}</span>
            </Link>
          ))}
        </PreviewShell>
      );
    case "khoa_hoc_goi_y":
      return (
        <PreviewShell id={payload.id}>
          {payload.courses.map((c) => (
            <Link
              key={c.id}
              href={coSoKhoaHocDetailPath(c.orgSlug, c.slug)}
              className="ha-trow"
              prefetch={false}
            >
              <span className="ha-trow-th">
                {c.thumbnailUrl || c.orgAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.thumbnailUrl || c.orgAvatarUrl || ""}
                    alt=""
                    width={46}
                    height={46}
                  />
                ) : (
                  c.ten.slice(0, 2).toUpperCase()
                )}
              </span>
              <div className="ha-trow-meta">
                <div className="ha-trow-name">{c.ten}</div>
                <div className="ha-trow-sub">
                  {c.orgTen}
                  {c.sub ? ` · ${c.sub}` : ""}
                </div>
              </div>
            </Link>
          ))}
        </PreviewShell>
      );
    case "ho_so_cua_ban": {
      const nextStep = payload.missing[0];
      return (
        <PreviewShell
          id={payload.id}
          className={
            payload.seeking
              ? "ha-card--profile ha-card--accent"
              : "ha-card--profile"
          }
        >
          <div className="ha-profile-body">
            <div className="ha-profile-meter">
              <div
                className="ha-profile-ring"
                style={{ "--ha-pct": payload.percent } as CSSProperties}
                aria-hidden
              >
                <span className="ha-profile-pct">{payload.percent}%</span>
              </div>
              <div className="ha-profile-copy">
                <p className="ha-profile-status">Đang hoàn thiện hồ sơ</p>
                <p className="ha-profile-hint">
                  {nextStep
                    ? `${nextStep} để studio dễ tìm thấy bạn.`
                    : "Tiếp tục cập nhật để studio dễ tìm thấy bạn."}
                </p>
              </div>
            </div>
            <HaUpdateProjectButton
              viewerSlug={payload.viewerSlug}
              className="ha-profile-cta"
            />
          </div>
          {payload.seeking ? (
            <div className="ha-profile-open">
              <Eye size={15} strokeWidth={2} aria-hidden />
              <span>
                <b>Đang mở cơ hội</b> — hồ sơ được đẩy tới studio đang tuyển.
              </span>
            </div>
          ) : null}
        </PreviewShell>
      );
    }
    case "co_hoi":
      return (
        <PreviewShell id={payload.id} className="ha-card--jobs">
          <div className="ha-job-list">
            {payload.jobs.slice(0, 3).map((job) => {
              const meta = [job.loaiHinhLabel, job.place, job.linhVucTen].filter(
                Boolean,
              );
              const body = (
                <div className="ha-job-inner">
                  <span className="ha-job-av" aria-hidden>
                    {job.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={job.avatarUrl} alt="" loading="lazy" />
                    ) : (
                      <span className="ha-job-av-fallback">
                        {job.orgTen.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <div className="ha-job-body">
                    <div className="ha-job-title">{job.tieuDe}</div>
                    <div className="ha-job-org">{job.orgTen}</div>
                    {meta.length > 0 ? (
                      <div className="ha-job-meta">
                        {meta.map((part, i) => (
                          <span
                            key={`${part}-${i}`}
                            className="ha-job-meta-part"
                          >
                            {part === job.place ? (
                              <>
                                <MapPin
                                  size={10}
                                  strokeWidth={2.2}
                                  aria-hidden
                                />
                                {part}
                              </>
                            ) : (
                              part
                            )}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {job.salary ? (
                      <div className="ha-job-sal">{job.salary}</div>
                    ) : null}
                  </div>
                </div>
              );
              return job.href ? (
                <Link
                  key={job.id}
                  href={job.href}
                  className="ha-job"
                  prefetch={false}
                >
                  {body}
                </Link>
              ) : (
                <div key={job.id} className="ha-job">
                  {body}
                </div>
              );
            })}
          </div>
        </PreviewShell>
      );
    case "cho_ban_duyet":
      return (
        <PreviewShell id={payload.id}>
          {payload.items.map((it) => (
            <div key={it.requestId} className="ha-trow">
              <div className="ha-trow-meta">
                <div className="ha-trow-name">{it.userName}</div>
                <div className="ha-trow-sub">
                  {it.title}
                  {it.orgName ? ` · ${it.orgName}` : ""}
                </div>
              </div>
            </div>
          ))}
        </PreviewShell>
      );
    case "hoc_vien_cua_ban":
    case "scout_tai_nang":
      return (
        <PreviewShell id={payload.id}>
          {payload.items.map((it) => (
            <Link
              key={it.userId}
              href={`/${it.slug}`}
              className="ha-trow"
              prefetch={false}
            >
              <span className="ha-trow-th">
                {it.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.avatarUrl} alt="" width={46} height={46} />
                ) : (
                  it.name.slice(0, 2).toUpperCase()
                )}
              </span>
              <div className="ha-trow-meta">
                <div className="ha-trow-name">{it.name}</div>
                <div className="ha-trow-sub">
                  {"khoaTen" in it ? it.khoaTen : it.sub}
                  {"milestoneHint" in it && it.milestoneHint
                    ? ` · ${it.milestoneHint}`
                    : ""}
                </div>
              </div>
            </Link>
          ))}
        </PreviewShell>
      );
    case "don_can_xu_ly":
      return <DonCanXuLyPanel items={payload.items} limit={3} />;
    case "don_mua_cua_toi":
      return (
        <PreviewShell id={payload.id} className="ha-card--don">
          <DonHangHomeList
            items={payload.items}
            total={payload.items.length}
            mode="buyer"
          />
        </PreviewShell>
      );
    case "quay_cua_toi":
    case "org_inbox":
    case "quan_ly_su_kien":
    case "ung_vien_moi":
    case "to_chuc_cua_ban":
    case "ung_tuyen_cua_toi":
    case "tin_nhan_ban_be":
    case "tin_nhan_to_chuc":
    case "tin_nhan_mua_ban":
    case "loi_moi_ket_ban":
    case "se_tham_gia":
    case "da_luu":
    case "lop_hoc_cua_ban":
      return (
        <PreviewShell
          id={payload.id}
          className={
            payload.id.startsWith("tin_nhan_")
              ? "ha-card--chat"
              : payload.id === "lop_hoc_cua_ban"
                ? "ha-card--lop"
                : undefined
          }
        >
          {payload.rows.map((row) => (
            <div key={row.key} className="ha-trow">
              <span
                className={`ha-trow-th${
                  payload.id === "org_inbox" ? " ha-trow-th--org" : ""
                }`}
                aria-hidden
              >
                {row.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.avatarUrl} alt="" width={46} height={46} />
                ) : (
                  row.title.slice(0, 2).toUpperCase()
                )}
              </span>
              <div className="ha-trow-meta">
                <div
                  className={
                    payload.id === "org_inbox"
                      ? "ha-trow-name ha-trow-name--with-av"
                      : "ha-trow-name"
                  }
                >
                  {payload.id === "org_inbox" ? (
                    <span className="ha-trow-peer-av" aria-hidden>
                      {row.peerAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.peerAvatarUrl}
                          alt=""
                          width={18}
                          height={18}
                        />
                      ) : (
                        <span className="ha-trow-peer-av-fallback">
                          {row.title.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </span>
                  ) : null}
                  <span className="ha-trow-name-text">{row.title}</span>
                </div>
                <div className="ha-trow-sub">{row.sub}</div>
              </div>
            </div>
          ))}
        </PreviewShell>
      );
    case "hang_feature":
      return (
        <HangFeaturePanel
          initialItems={payload.items}
          limit={Math.max(3, payload.items.length)}
        />
      );
    default: {
      const _e: never = payload;
      void _e;
      return null;
    }
  }
}

export function HomeModulePreviewSkeleton({ id }: { id: ModuleId }) {
  const meta = MODULE_META[id];
  return (
    <section className="ha-card ha-card--placeholder">
      <div className="ha-card-head">
        <span className="ha-card-title">{meta.label}</span>
      </div>
      <p className="ha-card-empty ha-card-empty--loading">
        <Loader2 size={14} className="ha-spin" aria-hidden />
        Đang tải nội dung…
      </p>
    </section>
  );
}
