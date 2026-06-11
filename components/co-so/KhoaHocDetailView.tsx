"use client";

import {
  ArrowUpRight,
  BadgeCheck,
  Bookmark,
  CalendarClock,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  GraduationCap,
  Image as ImageIcon,
  Info,
  ListOrdered,
  Lock,
  MapPin,
  Play,
  PlayCircle,
  Rocket,
  Sparkles,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type {
  GiaoTrinhBaiData,
  GiaoVienKhoaData,
  KhoaHocCardData,
  KhoaHocDetailPayload,
  LopHocDetailData,
} from "@/lib/to-chuc/khoa-hoc-types";
import {
  buildKhoaHocDetailMock,
  isKhoaHocDetailMockSlug,
} from "@/lib/to-chuc/khoa-hoc-detail-mock";
import {
  formatKhaiGiangCard,
  formatKhoaHocPhi,
  formatThoiLuongKhoa,
  labelHinhThucLopChiTiet,
  labelLoaiMoHinhKhoa,
  labelTrinhDoDauVao,
} from "@/lib/to-chuc/khoa-hoc-labels";

type Props = {
  orgId: string;
  orgTen: string;
  khoa: KhoaHocCardData;
  orgVerified?: boolean;
  /** Bỏ qua API, render mockup demo đầy đủ. */
  useMockup?: boolean;
};

function lessonBullets(moTa: string | null): string[] {
  if (!moTa?.trim()) return [];
  return moTa
    .split(/\n|·|;/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function GiaoVienAvatar({
  gv,
  size = "md",
}: {
  gv: GiaoVienKhoaData;
  size?: "sm" | "md";
}) {
  const cls =
    size === "sm" ? "cso-khd-gv-av cso-khd-gv-av--sm" : "cso-khd-gv-av";
  const muted = gv.pendingProfile || !gv.verified;
  return (
    <div className={`${cls}${muted ? " txt" : ""}`} aria-hidden>
      {gv.initials}
    </div>
  );
}

function GiaoVienName({ gv }: { gv: GiaoVienKhoaData }) {
  return (
    <span className="cso-khd-gv-nm">
      {gv.ten}
      {gv.verified ? <BadgeCheck size={12} aria-hidden /> : null}
    </span>
  );
}

function GiaoTrinhRow({
  bai,
  index,
  initiallyOpen = false,
}: {
  bai: GiaoTrinhBaiData;
  index: number;
  initiallyOpen?: boolean;
}) {
  const locked = bai.visibility === "chi_hoc_vien";
  const [open, setOpen] = useState(initiallyOpen);
  const bullets = lessonBullets(bai.moTaNgan);

  return (
    <div
      className={[
        "cso-khd-les",
        locked ? "locked" : "",
        open ? "open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="cso-khd-les-head"
        role={locked ? undefined : "button"}
        tabIndex={locked ? undefined : 0}
        aria-expanded={locked ? undefined : open}
        onClick={() => {
          if (!locked) setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (locked) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <span className="cso-khd-les-num">{index + 1}</span>
        <div className="cso-khd-les-info">
          <div className="cso-khd-les-t">
            {bai.tieuDe}
            {bai.soBuoi != null && bai.soBuoi > 0 ? (
              <span className="cso-khd-buoi">{bai.soBuoi} buổi</span>
            ) : null}
            {bai.hasVideo ? (
              <span className="cso-khd-les-media">
                <PlayCircle size={11} aria-hidden />
                video
              </span>
            ) : null}
          </div>
        </div>
        <div className="cso-khd-les-state">
          {locked ? (
            <span className="cso-khd-les-lock">
              <Lock size={13} aria-hidden />
              Đăng ký để mở
            </span>
          ) : (
            <>
              <span className="cso-khd-les-try">Xem thử</span>
              <ChevronDown size={18} className="cso-khd-les-chev" aria-hidden />
            </>
          )}
        </div>
      </div>
      {!locked && open ? (
        <div className="cso-khd-les-expand">
          {bullets.length > 0 ? (
            <ul>
              {bullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          {bai.hasVideo ? (
            <div className="cso-khd-les-vid" aria-hidden>
              <Play size={38} strokeWidth={1.5} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function KhungLopCard({
  lop,
  highlighted,
  loaiMoHinh,
}: {
  lop: LopHocDetailData;
  highlighted: boolean;
  loaiMoHinh: KhoaHocCardData["loaiMoHinh"];
}) {
  const lichLabel =
    lop.lichHoc ??
    (loaiMoHinh === "lien_tuc_theo_thang"
      ? "Khai giảng hàng tuần"
      : lop.ngayKhaiGiang);

  return (
    <div className={`cso-khd-khung${highlighted ? " hl" : ""}`}>
      <div className="cso-khd-khung-top">
        <span className="cso-khd-khung-name">{lop.tenLop}</span>
        {lop.conCho ? (
          <span className="cso-khd-khung-st">Còn chỗ</span>
        ) : null}
      </div>
      <div className="cso-khd-khung-meta">
        <span className="cso-khd-km">
          <Clock size={14} aria-hidden />
          <b>{lichLabel}</b>
        </span>
        <span className="cso-khd-km">
          <MapPin size={14} aria-hidden />
          <b>{labelHinhThucLopChiTiet(lop.hinhThuc)}</b>
          {lop.diaChiHoc ? <> · {lop.diaChiHoc}</> : null}
        </span>
      </div>
      <div className="cso-khd-khung-foot">
        <div className="cso-khd-gv-mini">
          <GiaoVienAvatar gv={lop.giaoVien} size="sm" />
          <div>
            <GiaoVienName gv={lop.giaoVien} />
            <div className="cso-khd-gv-role">
              {lop.giaoVien.vaiTro ??
                (lop.giaoVien.verified
                  ? "GV có hồ sơ CINS"
                  : lop.giaoVien.pendingProfile
                    ? "GV chưa có hồ sơ CINS"
                    : "Giảng viên")}
            </div>
          </div>
        </div>
        <button
          type="button"
          className={`cso-khd-btn cso-khd-btn--sm${highlighted ? "" : " cso-khd-btn--ghost"}`}
        >
          <UserPlus size={13} aria-hidden />
          Đăng ký khung này
        </button>
      </div>
    </div>
  );
}

function GiaoVienRow({ gv }: { gv: GiaoVienKhoaData }) {
  return (
    <div className="cso-khd-tea">
      <GiaoVienAvatar gv={gv} />
      <div className="cso-khd-tea-body">
        <div className="cso-khd-tea-nm">
          <GiaoVienName gv={gv} />
        </div>
        <div className="cso-khd-tea-rl">
          {gv.vaiTro ?? (gv.pendingProfile ? "Giảng viên" : "Giảng viên khóa")}
        </div>
      </div>
      {gv.slug && gv.verified ? (
        <Link href={`/${gv.slug}`} className="cso-khd-tea-lk">
          <ArrowUpRight size={13} aria-hidden />
          Xem hồ sơ
        </Link>
      ) : gv.pendingProfile ? (
        <span className="cso-khd-tea-pend">Chưa có hồ sơ CINS</span>
      ) : null}
    </div>
  );
}

function DetailContent({
  detail,
  orgVerified = false,
  isMockup = false,
}: {
  detail: KhoaHocDetailPayload;
  orgVerified?: boolean;
  isMockup?: boolean;
}) {
  const { khoa, orgTen, giaoTrinh, lopHoc, giaoVien } = detail;
  const hasCover = Boolean(khoa.coverUrl);
  const covClass = [
    "cso-khd-cover",
    hasCover ? `c${(khoa.coverVariant % 3) + 1}` : "cso-khd-cover--placeholder",
  ]
    .filter(Boolean)
    .join(" ");

  const tryCount = giaoTrinh.filter((b) => b.visibility === "public").length;
  const firstPublicIdx = giaoTrinh.findIndex((b) => b.visibility === "public");

  const giaoTrinhSummary = useMemo(() => {
    if (!giaoTrinh.length) return null;
    const totalBuoi = giaoTrinh.reduce((s, b) => s + (b.soBuoi ?? 0), 0);
    const parts: string[] = [];
    if (totalBuoi > 0) parts.push(`${totalBuoi} buổi`);
    parts.push(`${giaoTrinh.length} bài`);
    if (tryCount > 0) parts.push(`${tryCount} xem thử`);
    return parts.join(" · ");
  }, [giaoTrinh, tryCount]);

  const ctaNote = useMemo(() => {
    const big = formatKhaiGiangCard(khoa.loaiMoHinh, khoa.ngayKhaiGiangGanNhat);
    const sub =
      khoa.loaiMoHinh === "lien_tuc_theo_thang"
        ? "vào học bất cứ lúc nào"
        : khoa.ngayKhaiGiangGanNhat
          ? "cohort có ngày khai giảng cố định"
          : "liên hệ cơ sở để biết lịch";
    return `${big} · ${sub}`;
  }, [khoa.loaiMoHinh, khoa.ngayKhaiGiangGanNhat]);

  const hocPhiLabel = formatKhoaHocPhi(khoa.hocPhi, khoa.loaiMoHinh);
  const finalCtaTitle = isMockup ? "SẴN SÀNG CẦM CHÌ?" : "Sẵn sàng bắt đầu?";

  return (
    <div className="cso-khd cso-khd--landing">
      {isMockup ? (
        <p className="cso-khd-mock-banner" role="status">
          Mockup thiết kế · dữ liệu demo
        </p>
      ) : null}
      <article className="cso-khd-sheet">
        <nav className="cso-khd-crumb" aria-label="Breadcrumb">
          <span>{orgTen || "Cơ sở"}</span>
          <ChevronRight size={13} aria-hidden />
          <span>Khóa học</span>
          <ChevronRight size={13} aria-hidden />
          <span>{khoa.tenKhoaHoc}</span>
        </nav>

        <div className={covClass}>
          {khoa.coverUrl ? (
            <Image
              src={khoa.coverUrl}
              alt=""
              fill
              className="cso-khd-cover-img"
              sizes="(max-width: 720px) 100vw, 552px"
            />
          ) : (
            <ImageIcon size={46} strokeWidth={1.25} aria-hidden />
          )}
          <button
            type="button"
            className="cso-khd-cover-save"
            aria-label="Lưu khóa học"
          >
            <Bookmark size={16} aria-hidden />
          </button>
        </div>

        <header className="cso-khd-head">
          <p className="cso-khd-h-org">
            <GraduationCap size={14} aria-hidden />
            {orgTen}
            {orgVerified || isMockup ? (
              <BadgeCheck size={14} className="cso-khd-h-org-v" aria-hidden />
            ) : null}
          </p>
          <h1 className="cso-khd-h-title">{khoa.tenKhoaHoc}</h1>
          <div className="cso-khd-facts">
            <div className="cso-khd-fact">
              <div className="v">{labelLoaiMoHinhKhoa(khoa.loaiMoHinh)}</div>
              <div className="k">Mô hình</div>
            </div>
            <div className="cso-khd-fact">
              <div className="v">
                {formatThoiLuongKhoa(
                  khoa.thoiLuongBuoi,
                  khoa.thoiLuongPhutMoiBuoi,
                )}
              </div>
              <div className="k">Thời lượng</div>
            </div>
            <div className="cso-khd-fact">
              <div className="v">{hocPhiLabel}</div>
              <div className="k">Học phí</div>
            </div>
            <div className="cso-khd-fact">
              <div className="v">{labelTrinhDoDauVao(khoa.trinhDoDauVao)}</div>
              <div className="k">Đầu vào</div>
            </div>
          </div>
          <div className="cso-khd-hero-cta">
            <button type="button" className="cso-khd-btn">
              <UserPlus size={15} aria-hidden />
              Chọn khung &amp; đăng ký
            </button>
            <span className="cso-khd-cta-note">
              <Rocket size={14} aria-hidden />
              {ctaNote}
            </span>
          </div>
        </header>

        <div className="cso-khd-body">
          {(khoa.moTa || khoa.yeuCauChuanBi) && (
            <>
              <div className="cso-khd-rule" aria-hidden />
              <div className="cso-khd-s-label">
                <Info size={15} aria-hidden />
                Giới thiệu
              </div>
              {khoa.moTa ? <p className="cso-khd-lead">{khoa.moTa}</p> : null}
              {khoa.yeuCauChuanBi ? (
                <p className="cso-khd-req">
                  <CheckCircle size={16} aria-hidden />
                  Cần chuẩn bị: {khoa.yeuCauChuanBi}
                </p>
              ) : null}
            </>
          )}

          {giaoTrinh.length > 0 ? (
            <>
              <div className="cso-khd-rule" aria-hidden />
              <div className="cso-khd-s-label">
                <ListOrdered size={15} aria-hidden />
                Lộ trình bài
                {giaoTrinhSummary ? (
                  <span className="cso-khd-s-sum">{giaoTrinhSummary}</span>
                ) : null}
              </div>
              <div className="cso-khd-les-list">
                {giaoTrinh.map((bai, i) => (
                  <GiaoTrinhRow
                    key={bai.id}
                    bai={bai}
                    index={i}
                    initiallyOpen={i === firstPublicIdx}
                  />
                ))}
              </div>
              <div className="cso-khd-proj">
                <Sparkles size={16} aria-hidden />
                <span>
                  <b>Bài cuối ra tác phẩm:</b> học viên nộp bài thi thử →{" "}
                  {orgTen || "cơ sở"} xác nhận → tác phẩm lên thẳng hồ sơ nghề
                  và hiện ở mục Sản phẩm học viên bên dưới.
                </span>
              </div>
            </>
          ) : null}

          {lopHoc.length > 0 ? (
            <>
              <div className="cso-khd-rule" aria-hidden />
              <div className="cso-khd-s-label">
                <CalendarClock size={15} aria-hidden />
                Khung lớp &amp; lịch học
              </div>
              <p className="cso-khd-s-sub">
                {khoa.loaiMoHinh === "lien_tuc_theo_thang"
                  ? "Khai giảng hàng tuần — vào học bất cứ lúc nào. Cùng giáo trình; giáo viên có thể khác giữa các khung."
                  : "Chọn khung lớp phù hợp với lịch và giáo viên."}
              </p>
              {lopHoc.map((lop, i) => (
                <KhungLopCard
                  key={lop.id}
                  lop={lop}
                  highlighted={i === 0}
                  loaiMoHinh={khoa.loaiMoHinh}
                />
              ))}
            </>
          ) : null}

          {giaoVien.length > 0 ? (
            <>
              <div className="cso-khd-rule" aria-hidden />
              <div className="cso-khd-s-label">
                <UsersRound size={15} aria-hidden />
                Giảng viên
              </div>
              <div className="cso-khd-tea-list">
                {giaoVien.map((gv) => (
                  <GiaoVienRow key={gv.key} gv={gv} />
                ))}
              </div>
            </>
          ) : null}

          <div className="cso-khd-rule" aria-hidden />
          <div className="cso-khd-s-label">
            <ImageIcon size={15} aria-hidden />
            Sản phẩm học viên từ khóa
          </div>
          <div className="cso-khd-works-note">
            <BadgeCheck size={16} aria-hidden />
            <span>
              <b>Học viên tự đăng</b> rồi gắn &quot;làm khi học khóa này&quot;,{" "}
              {orgTen || "cơ sở"} bấm xác nhận. Mỗi tác phẩm gắn thẳng hồ sơ nghề
              thật của học viên.
            </span>
          </div>
          <p className="cso-khd-works-empty">
            Chưa có tác phẩm được xác nhận cho khóa này.
          </p>
        </div>

        <footer className="cso-khd-final">
          <h3>{finalCtaTitle}</h3>
          <p>
            {formatKhaiGiangCard(khoa.loaiMoHinh, khoa.ngayKhaiGiangGanNhat)} ·
            học phí <span className="cso-khd-final-price">{hocPhiLabel}</span> ·
            gửi đăng ký tới {orgTen || "cơ sở"} duyệt
          </p>
          <button type="button" className="cso-khd-btn">
            <UserPlus size={15} aria-hidden />
            Chọn khung &amp; đăng ký
          </button>
        </footer>
      </article>
    </div>
  );
}

export function KhoaHocDetailView({
  orgId,
  orgTen,
  khoa,
  orgVerified = false,
  useMockup = false,
}: Props) {
  const searchParams = useSearchParams();
  const mockupFromQuery = searchParams.get("mockup") === "1";
  const isMockup =
    useMockup ||
    mockupFromQuery ||
    isKhoaHocDetailMockSlug(khoa.slug);

  const [detail, setDetail] = useState<KhoaHocDetailPayload | null>(
    isMockup ? buildKhoaHocDetailMock(orgTen) : null,
  );
  const [loading, setLoading] = useState(!isMockup);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isMockup) {
      setDetail(buildKhoaHocDetailMock(orgTen));
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(
      `/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc/${encodeURIComponent(khoa.id)}`,
    )
      .then(async (res) => {
        const body = (await res.json()) as {
          detail?: KhoaHocDetailPayload;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(body.error ?? "Không tải được chi tiết khóa.");
        }
        if (!cancelled && body.detail) {
          setDetail({
            ...body.detail,
            orgTen: body.detail.orgTen || orgTen,
          });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Không tải được chi tiết khóa.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orgId, khoa.id, orgTen, isMockup]);

  if (loading) {
    return (
      <div className="cso-khd cso-khd--landing cso-khd--loading">
        <div className="cso-kh-skeleton cso-khd-skeleton" aria-hidden />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="cso-khd cso-khd--landing">
        <p className="cso-kh-err">{error ?? "Không tải được chi tiết khóa."}</p>
      </div>
    );
  }

  return (
    <DetailContent
      detail={detail}
      orgVerified={orgVerified}
      isMockup={isMockup}
    />
  );
}
