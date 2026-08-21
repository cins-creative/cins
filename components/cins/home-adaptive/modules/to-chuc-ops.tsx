import {
  Building2,
  CalendarCheck,
  Inbox,
  UserRoundSearch,
} from "lucide-react";
import Link from "next/link";

import {
  ModuleCard,
  ModuleEmpty,
} from "@/components/cins/home-adaptive/ModuleCard";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { moduleItemLimit } from "@/components/cins/home-adaptive/types";
import {
  loadOrgInboxHome,
  loadSuKienQuanLyTongQuan,
  loadToChucCuaBan,
  loadUngVienMoi,
} from "@/lib/cins/home-adaptive/role-fetches";

function formatSkDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

/** Staff · Hộp thư tổ chức. */
export async function OrgInboxModule({ ctx }: { ctx: HomeModuleCtx }) {
  const items = await loadOrgInboxHome(
    ctx.viewerId,
    moduleItemLimit(ctx, "org_inbox"),
  );
  const unread = items.reduce((s, t) => s + (t.unread || 0), 0);
  if (items.length === 0) {
    return (
      <ModuleCard icon={Inbox} moduleId="org_inbox" title="Hộp thư tổ chức">
        <ModuleEmpty>Chưa có tin nhắn tới tổ chức.</ModuleEmpty>
      </ModuleCard>
    );
  }

  return (
    <ModuleCard
      icon={Inbox}
      moduleId="org_inbox"
      title="Hộp thư tổ chức"
      badge={unread > 0 ? String(unread) : undefined}
    >
      {items.map((t) => {
        const orgLabel = t.orgTen?.trim() || "Tổ chức";
        const inner = (
          <>
            <span className="ha-trow-th ha-trow-th--org" aria-hidden>
              {t.orgAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.orgAvatarUrl} alt="" width={46} height={46} />
              ) : (
                orgLabel.slice(0, 2).toUpperCase()
              )}
            </span>
            <div className="ha-trow-meta">
              <div className="ha-trow-name ha-trow-name--with-av">
                <span className="ha-trow-peer-av" aria-hidden>
                  {t.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.avatarUrl} alt="" width={18} height={18} />
                  ) : (
                    <span className="ha-trow-peer-av-fallback">
                      {t.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="ha-trow-name-text">
                  {t.name}
                  {t.unread > 0 ? ` · ${t.unread}` : ""}
                </span>
              </div>
              <div className="ha-trow-sub">
                {[t.orgTen, t.preview].filter(Boolean).join(" · ")}
              </div>
            </div>
          </>
        );
        return t.href ? (
          <Link
            key={t.roomId}
            href={t.href}
            className="ha-trow ha-trow--link"
            prefetch={false}
          >
            {inner}
          </Link>
        ) : (
          <div key={t.roomId} className="ha-trow">
            {inner}
          </div>
        );
      })}
    </ModuleCard>
  );
}

/** Admin sự kiện · số người + quầy chờ. */
export async function QuanLySuKienModule({ ctx }: { ctx: HomeModuleCtx }) {
  const items = await loadSuKienQuanLyTongQuan(
    ctx.viewerId,
    moduleItemLimit(ctx, "quan_ly_su_kien"),
  );
  if (items.length === 0) {
    return (
      <ModuleCard icon={CalendarCheck} moduleId="quan_ly_su_kien" title="Quản lý sự kiện">
        <ModuleEmpty>Chưa có sự kiện sắp tới để quản lý.</ModuleEmpty>
      </ModuleCard>
    );
  }

  const pendingQuay = items.reduce((s, i) => s + i.soChoDuyetQuay, 0);

  return (
    <ModuleCard
      icon={CalendarCheck}
      moduleId="quan_ly_su_kien"
      title="Quản lý sự kiện"
      badge={pendingQuay > 0 ? String(pendingQuay) : undefined}
      className="ha-card--notify"
    >
      {items.map((sk) => {
        const slot =
          sk.slotToiDa != null
            ? `${sk.soSeThamGia}/${sk.slotToiDa}`
            : String(sk.soSeThamGia);
        return (
          <Link key={sk.id} href={sk.href} className="ha-trow" prefetch={false}>
            <span className="ha-trow-th" aria-hidden>
              {sk.ten.slice(0, 2).toUpperCase()}
            </span>
            <div className="ha-trow-meta">
              <div className="ha-trow-name">{sk.ten}</div>
              <div className="ha-trow-sub">
                {[
                  formatSkDate(sk.batDau),
                  `${slot} sẽ tham gia`,
                  sk.soChoDuyetQuay > 0
                    ? `${sk.soChoDuyetQuay} quầy chờ`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
          </Link>
        );
      })}
    </ModuleCard>
  );
}

/** Studio · Ứng viên mới. */
export async function UngVienMoiModule({ ctx }: { ctx: HomeModuleCtx }) {
  const items = await loadUngVienMoi(
    ctx.viewerId,
    moduleItemLimit(ctx, "ung_vien_moi"),
  );
  if (items.length === 0) {
    return (
      <ModuleCard icon={UserRoundSearch} moduleId="ung_vien_moi" title="Ứng viên mới">
        <ModuleEmpty>Chưa có ứng viên mới.</ModuleEmpty>
      </ModuleCard>
    );
  }

  return (
    <ModuleCard
      icon={UserRoundSearch}
      moduleId="ung_vien_moi"
      title="Ứng viên mới"
      badge={String(items.length)}
    >
      {items.map((a) => {
        const inner = (
          <>
            {a.avatarUrl ? (
              <span className="ha-row-av">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.avatarUrl} alt="" width={40} height={40} />
              </span>
            ) : (
              <span className="ha-row-av">
                <span className="ha-row-av-fallback" aria-hidden>
                  {a.name.slice(0, 2).toUpperCase()}
                </span>
              </span>
            )}
            <div className="ha-row-meta">
              <span className="ha-row-name">{a.name}</span>
              <div className="ha-row-sub">{a.jobTitle}</div>
            </div>
          </>
        );
        return a.href ? (
          <Link key={a.userId + a.taoLuc} href={a.href} className="ha-row" prefetch={false}>
            {inner}
          </Link>
        ) : (
          <div key={a.userId + a.taoLuc} className="ha-row">
            {inner}
          </div>
        );
      })}
    </ModuleCard>
  );
}

/** Thành viên · Tổ chức của bạn. */
export async function ToChucCuaBanModule({ ctx }: { ctx: HomeModuleCtx }) {
  const items = await loadToChucCuaBan(
    ctx.viewerId,
    moduleItemLimit(ctx, "to_chuc_cua_ban"),
  );
  if (items.length === 0) return null;

  return (
    <ModuleCard icon={Building2} moduleId="to_chuc_cua_ban" title="Tổ chức của bạn">
      {items.map((o) => {
        const inner = (
          <>
            {o.avatarUrl ? (
              <span className="ha-row-av">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.avatarUrl} alt="" width={40} height={40} />
              </span>
            ) : (
              <span className="ha-row-av">
                <span className="ha-row-av-fallback" aria-hidden>
                  {o.ten.slice(0, 2).toUpperCase()}
                </span>
              </span>
            )}
            <div className="ha-row-meta">
              <span className="ha-row-name">{o.ten}</span>
              <div className="ha-row-sub">
                {o.loaiLabel} · {o.vaiTroLabel}
              </div>
            </div>
          </>
        );
        return o.href ? (
          <Link key={o.id} href={o.href} className="ha-row" prefetch={false}>
            {inner}
          </Link>
        ) : (
          <div key={o.id} className="ha-row">
            {inner}
          </div>
        );
      })}
    </ModuleCard>
  );
}
