import type { PhiThongBaoPublic } from "@/lib/billing/phi-chinh-sach";
import type { CinsLocale } from "@/lib/locale/types";
import { intlLocale } from "@/lib/locale/types";

function fmtNgay(iso: string, locale: CinsLocale): string {
  try {
    return new Date(iso).toLocaleDateString(intlLocale(locale), {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function tyLePercent(tyLe: number): number {
  return Math.round(tyLe * 10000) / 100;
}

type PhiThongBaoLogLabels = {
  dateNotice: string;
  dateEffective: string;
  expected: string;
  rateAria: (pct: number) => string;
};

const VI_LABELS: PhiThongBaoLogLabels = {
  dateNotice: "Ngày thông báo",
  dateEffective: "Ngày hiệu lực",
  expected: "dự kiến",
  rateAria: (pct) => `Tỷ lệ dự kiến ${pct}%`,
};

type PhiThongBaoLogProps = {
  items: PhiThongBaoPublic[];
  emptyText?: string;
  locale?: CinsLocale;
  labels?: PhiThongBaoLogLabels;
};

export function PhiThongBaoLog({
  items,
  emptyText = "Chưa có thông báo mới — tỷ lệ nêu trên là bản đang áp dụng.",
  locale = "vi",
  labels = VI_LABELS,
}: PhiThongBaoLogProps) {
  if (items.length === 0) {
    return <p className="cps-empty">{emptyText}</p>;
  }

  return (
    <ol className="cps-log">
      {items.map((t) => (
        <li key={t.id} className="cps-log-card">
          <header className="cps-log-card-head">
            <h3 className="cps-log-card-title">{t.tieuDe}</h3>
            {t.tyLeDuKien != null ? (
              <p
                className="cps-log-card-rate"
                aria-label={labels.rateAria(tyLePercent(t.tyLeDuKien))}
              >
                <span className="cps-log-card-rate-num">{tyLePercent(t.tyLeDuKien)}</span>
                <span className="cps-log-card-rate-pct">%</span>
                <span className="cps-log-card-rate-label">{labels.expected}</span>
              </p>
            ) : null}
          </header>

          <dl className="cps-log-card-dates">
            <div className="cps-log-card-date">
              <dt>{labels.dateNotice}</dt>
              <dd>
                <time dateTime={t.congBoLuc}>{fmtNgay(t.congBoLuc, locale)}</time>
              </dd>
            </div>
            {t.hieuLucDuKien ? (
              <div className="cps-log-card-date cps-log-card-date--eff">
                <dt>{labels.dateEffective}</dt>
                <dd>
                  <time dateTime={t.hieuLucDuKien}>
                    {fmtNgay(t.hieuLucDuKien, locale)}
                  </time>
                </dd>
              </div>
            ) : null}
          </dl>

          <p className="cps-log-card-text">{t.noiDung}</p>
        </li>
      ))}
    </ol>
  );
}
