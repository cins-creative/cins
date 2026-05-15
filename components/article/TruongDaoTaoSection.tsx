import Image from "next/image";

import { getCoverUrl } from "@/lib/articles/cover";
import type { TruongNganhRow } from "@/lib/articles/types";

function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (w.length >= 1 && w[0]!.length >= 2) return w[0]!.slice(0, 2).toUpperCase();
  if (w.length >= 2)
    return `${w[0]!.slice(0, 1)}${w[1]!.slice(0, 1)}`.toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "TR";
}

const GRADS = [
  "linear-gradient(135deg,#E94B3C,#A82E22)",
  "linear-gradient(135deg,#1F74C9,#1656A0)",
  "linear-gradient(135deg,#A0522D,#5C2D11)",
  "linear-gradient(135deg,#F4A52A,#B7700E)",
  "linear-gradient(135deg,#E5484D,#A1262A)",
  "linear-gradient(135deg,#0E1117,#1B1F2A)",
];

function pillForRow(
  he: string | null | undefined,
): { className: string; label: string } | null {
  const h = (he ?? "").toLowerCase();
  if (h.includes("công lập") || h.includes("cong lap"))
    return { className: "pill cl", label: "Công lập" };
  if (
    h.includes("tư thục") ||
    h.includes("tu thuc") ||
    h.includes("private")
  )
    return { className: "pill qt", label: "Tư thục" };
  if (h.includes("quốc tế") || h.includes("quoc te") || h.includes("rmit"))
    return { className: "pill", label: "Quốc tế" };
  return null;
}

export function TruongDaoTaoSection({ rows }: { rows: TruongNganhRow[] }) {
  if (!rows.length) return null;

  return (
    <section aria-labelledby="arv2-truong-heading">
      <div className="section-link">
        <h3 id="arv2-truong-heading">
          Trường đào tạo
          <em>— {rows.length} chương trình</em>
        </h3>
      </div>
      <div className="school-grid">
        {rows.map((r, i) => {
          const org = r.org_to_chuc;
          const name = org?.ten ?? r.ten_chuong_trinh ?? "Chương trình";
          const logo = getCoverUrl(org?.logo_id ?? null);
          const grad = GRADS[i % GRADS.length]!;
          const pill = pillForRow(r.he_dao_tao);
          return (
            <div key={`${name}-${i}`} className="school-card">
              <div
                className="logo"
                style={
                  logo
                    ? undefined
                    : { background: grad }
                }
              >
                {logo ? (
                  <Image src={logo} alt="" width={54} height={54} />
                ) : (
                  initials(name)
                )}
              </div>
              <strong>{name}</strong>
              <span>
                {r.he_dao_tao?.trim() ||
                  (org?.ten && r.ten_chuong_trinh
                    ? r.ten_chuong_trinh
                    : "—")}
              </span>
              {pill ? (
                <div className={pill.className}>{pill.label}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
