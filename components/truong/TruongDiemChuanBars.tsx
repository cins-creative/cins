import {
  diemChuanBarPercent,
  diemChuanRows,
  formatDiemChuan,
} from "@/lib/truong/diem-chuan";
import type { TruongNganhProgram } from "@/lib/truong/types";

type Props = {
  prog: TruongNganhProgram;
  highlightYear?: number;
};

export function TruongDiemChuanBars({ prog, highlightYear }: Props) {
  const rows = diemChuanRows(prog);
  if (rows.length === 0) return null;

  const maxDiem = Math.max(...rows.map((r) => r.diem), 1);

  return (
    <div className="score-bars-wrap" aria-label="Điểm chuẩn các năm">
      <div className="score-bars-title">Điểm chuẩn các năm</div>
      {rows.map(({ year, diem }) => (
        <div
          key={year}
          className={`score-bar-row${highlightYear === year ? " is-highlight" : ""}`}
        >
          <span className="yr">{year}</span>
          <div className="score-bar-track">
            <div
              className="score-bar-fill"
              style={{ width: `${diemChuanBarPercent(diem, maxDiem)}%` }}
            />
          </div>
          <span className="score-bar-val">{formatDiemChuan(diem)}</span>
        </div>
      ))}
    </div>
  );
}
