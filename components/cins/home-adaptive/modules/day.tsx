import { ClipboardCheck, GraduationCap, Search } from "lucide-react";
import Link from "next/link";

import { ModuleCard, ModuleEmpty } from "@/components/cins/home-adaptive/ModuleCard";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import {
  loadChoBanDuyet,
  loadHocVienCuaBan,
  loadScoutTaiNang,
} from "@/lib/cins/home-adaptive/fetches";

/** DẠY · Chờ bạn duyệt — verify_yeu_cau chờ org admin. */
export async function ChoBanDuyetModule({ ctx }: { ctx: HomeModuleCtx }) {
  const pending = await loadChoBanDuyet(ctx.viewerId, 5);
  return (
    <ModuleCard
      icon={ClipboardCheck}
      title="Chờ bạn duyệt"
      moreHref={pending.length > 0 ? "/admin" : undefined}
      moreLabel={pending.length > 0 ? String(pending.length) : undefined}
    >
      {pending.length === 0 ? (
        <ModuleEmpty>Không có tác phẩm nào đang chờ bạn xác nhận.</ModuleEmpty>
      ) : (
        pending.map((item) => (
          <div key={item.requestId} className="ha-trow">
            <span className="ha-trow-th" aria-hidden>
              {item.userName.slice(0, 2).toUpperCase()}
            </span>
            <div className="ha-trow-meta">
              <div className="ha-trow-name">
                {item.userSlug ? (
                  <Link href={`/${item.userSlug}`} prefetch={false}>
                    {item.userName}
                  </Link>
                ) : (
                  item.userName
                )}
                {" · "}
                {item.title}
              </div>
              <div className="ha-trow-sub">{item.orgName}</div>
            </div>
          </div>
        ))
      )}
    </ModuleCard>
  );
}

/** DẠY · Học viên trong khóa org viewer quản lý. */
export async function HocVienCuaBanModule({ ctx }: { ctx: HomeModuleCtx }) {
  const students = await loadHocVienCuaBan(ctx.viewerId, 5);
  return (
    <ModuleCard icon={GraduationCap} title="Học viên của bạn" moreHref="/co-so-dao-tao">
      {students.length === 0 ? (
        <ModuleEmpty>Học viên trong lớp bạn dạy sẽ hiện ở đây.</ModuleEmpty>
      ) : (
        students.map((s) => (
          <Link key={s.userId} href={`/${s.slug}`} className="ha-row" prefetch={false}>
            {s.avatarUrl ? (
              <span className="ha-row-av">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.avatarUrl} alt="" width={40} height={40} />
              </span>
            ) : (
              <span className="ha-row-av">
                <span className="ha-row-av-fallback" aria-hidden>
                  {s.name.slice(0, 2).toUpperCase()}
                </span>
              </span>
            )}
            <div className="ha-row-meta">
              <span className="ha-row-name">{s.name}</span>
              <div className="ha-row-sub">
                {s.khoaTen} · {s.milestoneHint}
              </div>
            </div>
          </Link>
        ))
      )}
    </ModuleCard>
  );
}

/** DẠY · Scout tài năng — học viên nổi bật theo số cột mốc. */
export async function ScoutTaiNangModule({ ctx }: { ctx: HomeModuleCtx }) {
  const talents = await loadScoutTaiNang(ctx.viewerId, 4);
  return (
    <ModuleCard icon={Search} title="Scout tài năng">
      {talents.length === 0 ? (
        <ModuleEmpty>
          Học viên nổi bật trong khóa bạn quản lý sẽ hiện ở đây.
        </ModuleEmpty>
      ) : (
        talents.map((t) => (
          <Link key={t.userId} href={`/${t.slug}`} className="ha-row" prefetch={false}>
            {t.avatarUrl ? (
              <span className="ha-row-av">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.avatarUrl} alt="" width={40} height={40} />
              </span>
            ) : (
              <span className="ha-row-av">
                <span className="ha-row-av-fallback" aria-hidden>
                  {t.name.slice(0, 2).toUpperCase()}
                </span>
              </span>
            )}
            <div className="ha-row-meta">
              <span className="ha-row-name">{t.name}</span>
              <div className="ha-row-sub">{t.sub}</div>
            </div>
          </Link>
        ))
      )}
    </ModuleCard>
  );
}
