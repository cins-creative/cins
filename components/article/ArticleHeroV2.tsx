import Image from "next/image";

import { MetaBoxNganh } from "@/components/article/MetaBoxNganh";
import { MetaBoxPhanMem } from "@/components/article/MetaBoxPhanMem";
import { getCoverUrl } from "@/lib/articles/cover";
import type {
  ArticleBaiViet,
  ArticleMeta,
  MetaNganhDaoTao,
  MetaPhanMem,
  TruongNganhRow,
} from "@/lib/articles/types";

const KICKER_LINE: Record<string, string> = {
  nghe: "Nghề nghiệp",
  nganh_dao_tao: "Ngành đào tạo",
  phan_mem: "Phần mềm",
  keyword: "Keyword",
  mon_hoc: "Môn học",
  linh_vuc: "Lĩnh vực",
  blog: "Blog",
  event: "Sự kiện",
};

function kickerClass(loai: string): string {
  if (loai === "nganh_dao_tao") return "kicker k-nganh";
  if (loai === "phan_mem") return "kicker k-phanmem";
  if (loai === "keyword") return "kicker k-keyword";
  return "kicker k-nghe";
}

function kickerText(loai: string): string {
  return KICKER_LINE[loai] ?? loai;
}

function isMetaPhanMem(m: ArticleMeta): m is MetaPhanMem {
  return (
    !!m &&
    typeof m === "object" &&
    "nha_phat_hanh" in m &&
    "platform" in m &&
    Array.isArray((m as { platform?: unknown }).platform)
  );
}

function isMetaNganh(m: ArticleMeta): m is MetaNganhDaoTao {
  return (
    !!m &&
    typeof m === "object" &&
    "ma_nganh" in m &&
    "khoi_thi" in m &&
    Array.isArray((m as { khoi_thi?: unknown }).khoi_thi)
  );
}

function formatCapNhat(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Phần sau dấu ` | ` (pipe đơn) được in nghiêng như wireframe v2. */
function splitTitleEm(title: string): { main: string; em: string | null } {
  const idx = title.indexOf(" | ");
  if (idx === -1) return { main: title, em: null };
  return {
    main: title.slice(0, idx).trim(),
    em: title.slice(idx + 3).trim() || null,
  };
}

function initials(title: string): string {
  const w = title.trim().split(/\s+/).filter(Boolean);
  if (w.length >= 2)
    return `${w[0]!.slice(0, 1)}${w[1]!.slice(0, 1)}`.toUpperCase();
  return title.trim().slice(0, 2).toUpperCase() || "C";
}

function nganhMetaThird(
  article: ArticleBaiViet,
  truongRows: TruongNganhRow[],
): { lbl: string; val: string } {
  const r0 = truongRows[0];
  const m = r0?.thoi_gian_thang;
  if (typeof m === "number" && m > 0) {
    if (m >= 12 && m % 12 === 0)
      return { lbl: "Thời gian", val: `${m / 12} năm` };
    return { lbl: "Thời gian", val: `${m} tháng` };
  }
  if (r0?.he_dao_tao?.trim())
    return { lbl: "Hệ đào tạo", val: r0.he_dao_tao.trim() };
  return { lbl: "Cập nhật", val: formatCapNhat(article.cap_nhat_luc) };
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    </svg>
  );
}

function IconCal() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

type Props = {
  article: ArticleBaiViet;
  truongRows: TruongNganhRow[];
};

export function ArticleHeroV2({ article, truongRows }: Props) {
  const loai = article.loai_bai_viet;
  const cover = getCoverUrl(article.cover_id);
  const meta = article.meta;
  const { main: titleMain, em: titleEm } = splitTitleEm(article.tieu_de);

  if (loai === "keyword") {
    const sum = article.tom_tat?.trim() ?? "";
    const heroLine =
      article.tieu_de_eng?.trim() ||
      (sum.length > 160 ? `${sum.slice(0, 140).trim()}…` : sum);
    return (
      <>
        <span className={kickerClass(loai)}>{kickerText(loai)}</span>
        <div className="l4-hero">
          <div className="content">
            <div className="pill">Keyword · Technique</div>
            <h1>
              {titleMain}
              {titleEm ? (
                <>
                  {" "}
                  <em>{titleEm}</em>
                </>
              ) : null}
            </h1>
            {heroLine ? <p>{heroLine}</p> : null}
          </div>
        </div>
        {sum ? (
          <div className="l4-intro">
            <div className="l4-intro-grid l4-intro-grid--single">
              <p className="desc">{sum}</p>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  if (loai === "phan_mem" && isMetaPhanMem(meta)) {
    return (
      <>
        <span className={kickerClass(loai)}>{kickerText(loai)}</span>
        <div className="l3-hero">
          <div className="l3-icon icon-ae">
            {cover ? (
              <Image src={cover} alt="" width={110} height={110} priority />
            ) : (
              <span style={{ position: "relative", zIndex: 2 }}>
                {initials(article.tieu_de)}
              </span>
            )}
          </div>
          <div className="head">
            <h1>
              {article.tieu_de}{" "}
              <span className="ver">v{meta.version}</span>
            </h1>
            <div className="pub">
              Phát triển bởi <strong>{meta.nha_phat_hanh}</strong>
            </div>
            {article.tom_tat?.trim() ? (
              <p className="desc">{article.tom_tat.trim()}</p>
            ) : null}
          </div>
        </div>
        <MetaBoxPhanMem meta={meta} />
        <div className="showreel" aria-hidden>
          <div className="badge">▶ Showreel</div>
          <div className="meta">
            <div className="h">{article.tieu_de}</div>
            <div className="s">Video giới thiệu · {meta.nha_phat_hanh}</div>
          </div>
        </div>
      </>
    );
  }

  if (loai === "nganh_dao_tao" && isMetaNganh(meta)) {
    const third = nganhMetaThird(article, truongRows);
    return (
      <>
        <span className={kickerClass(loai)}>{kickerText(loai)}</span>
        <div className="l2-hero">
          <div className="content">
            <div className="code">Mã ngành · {meta.ma_nganh}</div>
            <h1>
              {titleMain}
              {titleEm ? (
                <>
                  {" "}
                  <em>{titleEm}</em>
                </>
              ) : null}
            </h1>
            {article.tieu_de_eng?.trim() ? (
              <div className="eng">{article.tieu_de_eng.trim()}</div>
            ) : null}
            {article.tom_tat?.trim() ? <p>{article.tom_tat.trim()}</p> : null}
          </div>
        </div>
        <MetaBoxNganh meta={meta} thirdCell={third} />
      </>
    );
  }

  /* Default: nghe + linh_vuc + mon_hoc + blog + event (+ nganh/phan_mem không đủ meta) */
  return (
    <>
      <span className={kickerClass(loai)}>{kickerText(loai)}</span>
      <div className="l1-hero">
        <div>
          <h1 className="h-disp">
            {titleMain}
            {titleEm ? (
              <>
                <br />
                <em>{titleEm}</em>
              </>
            ) : null}
          </h1>
          {article.tieu_de_eng?.trim() ? (
            <div className="h-eng">{article.tieu_de_eng.trim()}</div>
          ) : null}
          {article.tom_tat?.trim() ? (
            <p className="h-summary">{article.tom_tat.trim()}</p>
          ) : null}
          <div className="h-meta">
            <span>
              <IconEye />
              {article.luot_xem.toLocaleString("vi-VN")} lượt xem
            </span>
            <span>
              <IconCal />
              Cập nhật {formatCapNhat(article.cap_nhat_luc)}
            </span>
          </div>
        </div>
        <div className="mascot">
          {cover ? (
            <Image
              src={cover}
              alt=""
              width={280}
              height={280}
              className="arv2-mascot-img"
              priority
            />
          ) : (
            <span className="mascot-ph" aria-hidden>
              {initials(article.tieu_de)}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
