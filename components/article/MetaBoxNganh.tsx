import type { MetaNganhDaoTao } from "@/lib/articles/types";

type Third = { lbl: string; val: string };

export function MetaBoxNganh({
  meta,
  thirdCell,
}: {
  meta: MetaNganhDaoTao;
  thirdCell: Third;
}) {
  const longVal = thirdCell.val.length > 28;

  return (
    <div className="meta-strip" aria-label="Thông tin ngành đào tạo">
      <div className="meta-cell">
        <div className="lbl">Mã ngành</div>
        <div className="val">{meta.ma_nganh}</div>
      </div>
      <div className="meta-cell">
        <div className="lbl">Khối thi</div>
        <div className="blocks">
          {meta.khoi_thi.map((k) => (
            <span key={k}>{k}</span>
          ))}
        </div>
      </div>
      <div className="meta-cell">
        <div className="lbl">{thirdCell.lbl}</div>
        <div className={longVal ? "val val--body" : "val"}>{thirdCell.val}</div>
      </div>
    </div>
  );
}
