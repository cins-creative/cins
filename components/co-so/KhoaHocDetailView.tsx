"use client";

import {
  ArrowUpRight,
  BadgeCheck,
  Calendar,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDot,
  GraduationCap,
  Image as ImageIcon,
  Info,
  ListOrdered,
  Lock,
  MapPin,
  PencilRuler,
  Play,
  PlayCircle,
  Repeat,
  Rocket,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type {
  GiaoTrinhBaiData,
  GiaoVienKhoaData,
  KhoaHocCardData,
  KhoaHocDetailPayload,
  LopHocDetailData,
} from "@/lib/to-chuc/khoa-hoc-types";
import {
  formatKhaiGiangCard,
  formatKhoaHocPhi,
  formatThoiLuongKhoa,
  labelHinhThucLopChiTiet,
  labelLoaiMoHinhKhoa,
  labelTrangThaiKhoaHero,
  labelTrinhDoDauVao,
  showTrangThaiKhoaHero,
} from "@/lib/to-chuc/khoa-hoc-labels";

type Props = {
  orgId: string;
  orgTen: string;
  khoa: KhoaHocCardData;
};

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
}: {
  bai: GiaoTrinhBaiData;
  index: number;
}) {
  const locked = bai.visibility === "chi_hoc_vien";
  const desc =
    bai.moTaNgan?.trim() || (locked ? "Mở khi đăng ký." : "");

  return (
    <div className={`cso-khd-les${locked ? " locked" : ""}`}>
      <span className="cso-khd-les-num">{index + 1}</span>
      <div className="cso-khd-les-body">
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
        {desc ? <div className="cso-khd-les-d">{desc}</div> : null}
      </div>
      {locked ? (
        <span className="cso-khd-pill-lock">
          <Lock size={12} aria-hidden />
          Đăng ký để mở
        </span>
      ) : (
        <span className="cso-khd-pill-try">
          <Play size={12} aria-hidden />
          Xem thử
        </span>
      )}
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
    <div className={`cso-khd-khung${highlighted ? " open" : ""}`}>
      <div className="cso-khd-khung-top">
        <span className="cso-khd-khung-name">{lop.tenLop}</span>
        {lop.conCho ? (
          <span className="cso-khd-khung-st">Còn chỗ</span>
        ) : null}
      </div>
      <div className="cso-khd-khung-meta">
        <span className="cso-khd-km">
          <Calendar size={14} aria-hidden />
          Lịch <b>{lichLabel}</b>
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
                (lop.giaoVien.pendingProfile
                  ? "GV chưa có hồ sơ CINS"
                  : "Giảng viên")}
            </div>
          </div>
        </div>
        <button type="button" className="cso-khd-btn">
          <UserPlus size={13} aria-hidden />
          Đăng ký khung này
        </button>
      </div>
    </div>
  );
}

function GiaoVienCard({ gv }: { gv: GiaoVienKhoaData }) {
  return (
    <div className="cso-khd-gv-card">
      <GiaoVienAvatar gv={gv} />
      <div>
        <GiaoVienName gv={gv} />
        <div className="cso-khd-gv-card-rl">
          {gv.vaiTro ?? (gv.pendingProfile ? "Giảng viên" : "Giảng viên khóa")}
        </div>
        {gv.slug && gv.verified ? (
          <Link href={`/${gv.slug}`} className="cso-khd-gv-lk">
            <ArrowUpRight size={11} aria-hidden />
            Xem hồ sơ
          </Link>
        ) : gv.pendingProfile ? (
          <div className="cso-khd-gv-pend">Chưa có hồ sơ CINS</div>
        ) : null}
      </div>
    </div>
  );
}

function DetailContent({ detail }: { detail: KhoaHocDetailPayload }) {
  const { khoa, orgTen, giaoTrinh, lopHoc, giaoVien } = detail;
  const covClass = `cso-khd-cover c${(khoa.coverVariant % 3) + 1}`;
  const heroBadge = labelTrangThaiKhoaHero(khoa.trangThaiKhoaHoc);
  const showBadge = showTrangThaiKhoaHero(khoa.trangThaiKhoaHoc) && heroBadge;

  const tryCount = giaoTrinh.filter((b) => b.visibility === "public").length;
  const giaoTrinhNote = useMemo(() => {
    if (!giaoTrinh.length) return null;
    const totalBuoi = giaoTrinh.reduce((s, b) => s + (b.soBuoi ?? 0), 0);
    const buoiPart =
      totalBuoi > 0
        ? `${totalBuoi} buổi`
        : formatThoiLuongKhoa(khoa.thoiLuongBuoi, khoa.thoiLuongPhutMoiBuoi);
    const tryPart =
      tryCount > 0 ? `${tryCount} bài xem thử` : "chưa có bài xem thử";
    return `${buoiPart} · ${tryPart} · phần còn lại mở cho học viên`;
  }, [giaoTrinh, tryCount, khoa.thoiLuongBuoi, khoa.thoiLuongPhutMoiBuoi]);

  const railBig = formatKhaiGiangCard(
    khoa.loaiMoHinh,
    khoa.ngayKhaiGiangGanNhat,
  );
  const railSub =
    khoa.loaiMoHinh === "lien_tuc_theo_thang"
      ? "Vào học bất cứ lúc nào"
      : khoa.ngayKhaiGiangGanNhat
        ? "Cohort có ngày khai giảng cố định"
        : "Liên hệ cơ sở để biết lịch";

  const slotMax = lopHoc.find((l) => l.slotToiDa != null)?.slotToiDa ?? null;
  const hinhThucRail = lopHoc[0]?.hinhThuc ?? khoa.hinhThuc;
  const diaChiRail = lopHoc[0]?.diaChiHoc ?? khoa.diaChiHoc;

  return (
    <div className="cso-khd">
      <nav className="cso-khd-crumb" aria-label="Breadcrumb">
        <span>{orgTen || "Cơ sở"}</span>
        <ChevronRight size={13} aria-hidden />
        <span>Khóa học</span>
        <ChevronRight size={13} aria-hidden />
        <span>{khoa.tenKhoaHoc}</span>
      </nav>

      <div className="cso-khd-hero">
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
            <>
              <span className="cso-khd-cover-dot b1" aria-hidden />
              <span className="cso-khd-cover-dot b2" aria-hidden />
            </>
          )}
        </div>
        <div className="cso-khd-hero-body">
          <div className="cso-khd-thumb">
            <PencilRuler size={36} aria-hidden />
          </div>
          <div className="cso-khd-hero-main">
            <h2 className="cso-khd-name">
              {khoa.tenKhoaHoc}
              {showBadge && heroBadge ? (
                <span className="cso-khd-badge-st">
                  <CircleDot size={11} aria-hidden />
                  {heroBadge}
                </span>
              ) : null}
            </h2>
            <p className="cso-khd-org">
              <GraduationCap size={14} aria-hidden />
              {orgTen}
            </p>
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
                <div className="v">
                  {formatKhoaHocPhi(khoa.hocPhi, khoa.loaiMoHinh)}
                </div>
                <div className="k">Học phí</div>
              </div>
              <div className="cso-khd-fact">
                <div className="v">{labelTrinhDoDauVao(khoa.trinhDoDauVao)}</div>
                <div className="k">Đầu vào</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="cso-khd-cols">
        <aside className="cso-khd-rail" aria-label="Đăng ký học">
          <div className="cso-khd-rail-card">
            <div className="cso-khd-rail-top">
              <Rocket size={14} aria-hidden />
              Đăng ký học
            </div>
            <div className="cso-khd-rail-in">
              <div className="cso-khd-rail-big">{railBig}</div>
              <div className="cso-khd-rail-sub">{railSub}</div>
              <div className="cso-khd-rail-li">
                <Wallet size={15} aria-hidden />
                Học phí{" "}
                <b>{formatKhoaHocPhi(khoa.hocPhi, khoa.loaiMoHinh)}</b>
              </div>
              {slotMax != null ? (
                <div className="cso-khd-rail-li">
                  <Users size={15} aria-hidden />
                  Sỉ số <b>≤ {slotMax}</b> HV/lớp
                </div>
              ) : null}
              {hinhThucRail ? (
                <div className="cso-khd-rail-li">
                  <MapPin size={15} aria-hidden />
                  {labelHinhThucLopChiTiet(hinhThucRail)}
                  {diaChiRail ? <> · {diaChiRail}</> : null}
                </div>
              ) : null}
              <div className="cso-khd-rail-li">
                <Repeat size={15} aria-hidden />
                {formatThoiLuongKhoa(
                  khoa.thoiLuongBuoi,
                  khoa.thoiLuongPhutMoiBuoi,
                )}
              </div>
              <div className="cso-khd-rail-cta">
                <button type="button" className="cso-khd-btn cso-khd-btn--wide">
                  <UserPlus size={13} aria-hidden />
                  Chọn khung &amp; đăng ký
                </button>
              </div>
              <p className="cso-khd-rail-fine">
                Đăng ký gửi tới {orgTen || "cơ sở"} duyệt
              </p>
            </div>
          </div>
        </aside>

        <div className="cso-khd-main">
        {(khoa.moTa || khoa.yeuCauChuanBi) && (
          <section className="cso-khd-sec">
            <span className="cso-khd-blk-tag">Nội dung khóa</span>
            <h3 className="cso-khd-sec-h">
              <Info size={16} aria-hidden />
              Giới thiệu
            </h3>
            {khoa.moTa ? <p className="cso-khd-intro">{khoa.moTa}</p> : null}
            {khoa.yeuCauChuanBi ? (
              <div className="cso-khd-outcomes">
                <div className="cso-khd-oc">
                  <Check size={15} aria-hidden />
                  {khoa.yeuCauChuanBi}
                </div>
              </div>
            ) : null}
          </section>
        )}

        {giaoTrinh.length > 0 ? (
          <section className="cso-khd-sec">
            <h3 className="cso-khd-sec-h">
              <ListOrdered size={16} aria-hidden />
              Lộ trình bài
            </h3>
            <p className="cso-khd-sec-hint">
              Vài bài đầu mở xem thử; phần sau mở khi đăng ký.
            </p>
            {giaoTrinh.map((bai, i) => (
              <GiaoTrinhRow key={bai.id} bai={bai} index={i} />
            ))}
            {giaoTrinhNote ? (
              <p className="cso-khd-note-it">{giaoTrinhNote}</p>
            ) : null}
          </section>
        ) : null}

        {lopHoc.length > 0 ? (
          <section className="cso-khd-sec">
            <h3 className="cso-khd-sec-h">
              <CalendarClock size={16} aria-hidden />
              Khung lớp &amp; lịch học
            </h3>
            <p className="cso-khd-sec-hint">
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
          </section>
        ) : null}

        {giaoVien.length > 0 ? (
          <section className="cso-khd-sec">
            <h3 className="cso-khd-sec-h">
              <UsersRound size={16} aria-hidden />
              Giảng viên
            </h3>
            <p className="cso-khd-sec-hint">
              Có hồ sơ CINS → xem được Journey nghề thật; chưa có → hiện tên,
              không badge.
            </p>
            <div className="cso-khd-gv-grid">
              {giaoVien.map((gv) => (
                <GiaoVienCard key={gv.key} gv={gv} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="cso-khd-sec">
          <h3 className="cso-khd-sec-h">
            <ImageIcon size={16} aria-hidden />
            Sản phẩm học viên từ khóa
          </h3>
          <div className="cso-khd-works-note">
            <BadgeCheck size={15} aria-hidden />
            <span>
              <b>Học viên tự đăng</b> rồi gắn &quot;làm khi học khóa này&quot;,{" "}
              {orgTen || "cơ sở"} bấm xác nhận. Mỗi tác phẩm gắn thẳng hồ sơ nghề
              thật của học viên.
            </span>
          </div>
          <p className="cso-khd-works-empty">
            Chưa có tác phẩm được xác nhận cho khóa này.
          </p>
        </section>
        </div>
      </div>
    </div>
  );
}

export function KhoaHocDetailView({ orgId, orgTen, khoa }: Props) {
  const [detail, setDetail] = useState<KhoaHocDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [orgId, khoa.id, orgTen]);

  if (loading) {
    return (
      <div className="cso-khd cso-khd--loading">
        <div className="cso-kh-skeleton cso-khd-skeleton" aria-hidden />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="cso-khd">
        <p className="cso-kh-err">{error ?? "Không tải được chi tiết khóa."}</p>
      </div>
    );
  }

  return <DetailContent detail={detail} />;
}
