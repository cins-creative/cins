import {
  Bookmark,
  Briefcase,
  CalendarHeart,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

import {
  ModuleCard,
  ModuleEmpty,
} from "@/components/cins/home-adaptive/ModuleCard";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { moduleItemLimit } from "@/components/cins/home-adaptive/types";
import {
  loadDaLuu,
  loadLoiMoiKetBan,
  loadSeThamGia,
  loadUngTuyenCuaToi,
} from "@/lib/cins/home-adaptive/role-fetches";

function formatSkDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

/** Ứng tuyển của tôi. */
export async function UngTuyenCuaToiModule({ ctx }: { ctx: HomeModuleCtx }) {
  const items = await loadUngTuyenCuaToi(
    ctx.viewerId,
    moduleItemLimit(ctx, "ung_tuyen_cua_toi"),
  );
  if (items.length === 0) {
    return (
      <ModuleCard icon={Briefcase} title="Ứng tuyển của tôi">
        <ModuleEmpty>Bạn chưa nộp hồ sơ nào.</ModuleEmpty>
      </ModuleCard>
    );
  }

  return (
    <ModuleCard
      icon={Briefcase}
      title="Ứng tuyển của tôi"
      badge={String(items.length)}
    >
      {items.map((a) => {
        const body = (
          <>
            <span className="ha-trow-th" aria-hidden>
              {a.tieuDe.slice(0, 2).toUpperCase()}
            </span>
            <div className="ha-trow-meta">
              <div className="ha-trow-name">{a.tieuDe}</div>
              <div className="ha-trow-sub">
                {a.orgTen} · {a.trangThaiLabel}
              </div>
            </div>
          </>
        );
        return a.href ? (
          <Link key={a.jobId} href={a.href} className="ha-trow" prefetch={false}>
            {body}
          </Link>
        ) : (
          <div key={a.jobId} className="ha-trow">
            {body}
          </div>
        );
      })}
    </ModuleCard>
  );
}

/** Lời mời kết bạn. */
export async function LoiMoiKetBanModule({ ctx }: { ctx: HomeModuleCtx }) {
  const items = await loadLoiMoiKetBan(
    ctx.viewerId,
    moduleItemLimit(ctx, "loi_moi_ket_ban"),
  );
  if (items.length === 0) return null;

  return (
    <ModuleCard
      icon={UserPlus}
      title="Lời mời kết bạn"
      badge={String(items.length)}
    >
      {items.map((p) => (
        <Link
          key={p.userId}
          href={p.slug ? `/${p.slug}` : "#"}
          className="ha-row"
          prefetch={false}
        >
          {p.avatarUrl ? (
            <span className="ha-row-av">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.avatarUrl} alt="" width={40} height={40} />
            </span>
          ) : (
            <span className="ha-row-av">
              <span className="ha-row-av-fallback" aria-hidden>
                {p.name.slice(0, 2).toUpperCase()}
              </span>
            </span>
          )}
          <div className="ha-row-meta">
            <span className="ha-row-name">{p.name}</span>
            <div className="ha-row-sub">Muốn kết bạn với bạn</div>
          </div>
        </Link>
      ))}
    </ModuleCard>
  );
}

/** Sự kiện sẽ tham gia. */
export async function SeThamGiaModule({ ctx }: { ctx: HomeModuleCtx }) {
  const items = await loadSeThamGia(
    ctx.viewerId,
    moduleItemLimit(ctx, "se_tham_gia"),
  );
  if (items.length === 0) return null;

  return (
    <ModuleCard
      icon={CalendarHeart}
      title="Sẽ tham gia"
      badge={String(items.length)}
    >
      {items.map((sk) => (
        <Link key={sk.suKienId} href={sk.href} className="ha-trow" prefetch={false}>
          <span className="ha-trow-th" aria-hidden>
            {sk.ten.slice(0, 2).toUpperCase()}
          </span>
          <div className="ha-trow-meta">
            <div className="ha-trow-name">{sk.ten}</div>
            <div className="ha-trow-sub">
              {[formatSkDate(sk.batDau), sk.orgTen].filter(Boolean).join(" · ")}
            </div>
          </div>
        </Link>
      ))}
    </ModuleCard>
  );
}

/** Đã lưu. */
export async function DaLuuModule({ ctx }: { ctx: HomeModuleCtx }) {
  const items = await loadDaLuu(
    ctx.viewerId,
    moduleItemLimit(ctx, "da_luu"),
  );
  if (items.length === 0) return null;

  return (
    <ModuleCard icon={Bookmark} title="Đã lưu">
      {items.map((b) => (
        <div key={b.id} className="ha-trow">
          <span className="ha-trow-th" aria-hidden>
            {b.title.slice(0, 2).toUpperCase()}
          </span>
          <div className="ha-trow-meta">
            <div className="ha-trow-name">{b.title}</div>
            <div className="ha-trow-sub">{b.loaiLabel}</div>
          </div>
        </div>
      ))}
    </ModuleCard>
  );
}
