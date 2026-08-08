import type { PhiThongBaoPublic } from "@/lib/billing/phi-chinh-sach";

function fmtNgayVn(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
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

type PhiThongBaoLogProps = {
  items: PhiThongBaoPublic[];
  emptyText?: string;
};

export function PhiThongBaoLog({
  items,
  emptyText = "Chưa có thông báo mới — tỷ lệ nêu trên là bản đang áp dụng.",
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
              <p className="cps-log-card-rate" aria-label={`Tỷ lệ dự kiến ${tyLePercent(t.tyLeDuKien)}%`}>
                <span className="cps-log-card-rate-num">{tyLePercent(t.tyLeDuKien)}</span>
                <span className="cps-log-card-rate-pct">%</span>
                <span className="cps-log-card-rate-label">dự kiến</span>
              </p>
            ) : null}
          </header>

          <dl className="cps-log-card-dates">
            <div className="cps-log-card-date">
              <dt>Ngày thông báo</dt>
              <dd>
                <time dateTime={t.congBoLuc}>{fmtNgayVn(t.congBoLuc)}</time>
              </dd>
            </div>
            {t.hieuLucDuKien ? (
              <div className="cps-log-card-date cps-log-card-date--eff">
                <dt>Ngày hiệu lực</dt>
                <dd>
                  <time dateTime={t.hieuLucDuKien}>
                    {fmtNgayVn(t.hieuLucDuKien)}
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
