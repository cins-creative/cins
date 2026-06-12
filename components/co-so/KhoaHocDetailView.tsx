"use client";

import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Clock,
  GraduationCap,
  Image as ImageIcon,
  Info,
  ListOrdered,
  Lock,
  MapPin,
  Eye,
  Pause,
  Pencil,
  Plus,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";

import type {
  BaiTapKhoaData,
  BaiTapKhoaDraft,
  BaiTapSectionDisplayMode,
  GiaoTrinhBaiData,
  GiaoVienKhoaData,
  KhoaHocCardData,
  KhoaHocDetailPayload,
  LopHocDetailData,
  LopHocFormInput,
  TrangThaiLop,
} from "@/lib/to-chuc/khoa-hoc-types";
import { BAI_TAP_PARTIAL_VISIBLE_COUNT } from "@/lib/to-chuc/khoa-hoc-types";
import {
  buildKhoaHocDetailMock,
  isKhoaHocDetailMockSlug,
  resolveKhoaHocDetailDisplay,
} from "@/lib/to-chuc/khoa-hoc-detail-mock";
import {
  loadBaiTapDrafts,
  saveBaiTapDrafts,
} from "@/lib/to-chuc/bai-tap-draft-storage";
import {
  loadBaiTapSectionDisplay,
  saveBaiTapSectionDisplay,
} from "@/lib/to-chuc/bai-tap-section-display-storage";
import { isInlineBaiTapThumbnail } from "@/lib/to-chuc/bai-tap-thumbnail";
import { notifyCoSoKhoaListChanged } from "@/lib/to-chuc/co-so-khoa-events";
import {
  coSoRootPath,
  coSoKhoaHocDetailPath,
  coSoTabPath,
} from "@/lib/to-chuc/co-so-routes";
import { getYoutubeId } from "@/lib/youtube";
import {
  formatKhaiGiangCard,
  formatKhoaFooterDangKyLine,
  formatKhoaHocPhi,
  formatThoiLuongKhoa,
  isScaffoldLopHoc,
  labelBaiTapSectionDisplay,
  labelHinhThucLopChiTiet,
  labelLoaiMoHinhKhoa,
  labelTrangThaiKhoaHoc,
  labelTrinhDoDauVao,
} from "@/lib/to-chuc/khoa-hoc-labels";

import { GiaoTrinhBaiTapPanel } from "./GiaoTrinhBaiTapPanel";
import { KhoaHocCreateModal } from "./KhoaHocCreateModal";
import { LopHocEditModal } from "./LopHocEditModal";

type Props = {
  orgId: string;
  orgSlug: string;
  orgTen: string;
  orgDiaChi?: string | null;
  khoa: KhoaHocCardData;
  orgVerified?: boolean;
  /** Bỏ qua API, render mockup demo đầy đủ. */
  useMockup?: boolean;
  canManageKhoaHoc?: boolean;
  onKhoaUpdated?: (khoa: KhoaHocCardData) => void;
};

function BaiTapCard({
  item,
  index,
  canManage = false,
  onEdit,
}: {
  item: BaiTapKhoaData;
  index: number;
  canManage?: boolean;
  onEdit?: (item: BaiTapKhoaData) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const youtubeId = item.videoYoutubeUrl
    ? getYoutubeId(item.videoYoutubeUrl)
    : null;
  const hasVideo = Boolean(youtubeId);

  function toggleExpand() {
    if (!hasVideo) return;
    setExpanded((v) => !v);
  }

  function onMainKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!hasVideo) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleExpand();
    }
  }

  return (
    <article
      className={[
        "cso-khd-bt-card",
        hasVideo ? "cso-khd-bt-card--expandable" : "",
        canManage ? "cso-khd-bt-card--manage" : "",
        expanded ? "is-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="cso-khd-bt-card-main"
        role={hasVideo ? "button" : undefined}
        tabIndex={hasVideo ? 0 : undefined}
        aria-expanded={hasVideo ? expanded : undefined}
        aria-label={
          hasVideo
            ? item.visible
              ? `${expanded ? "Thu gọn" : "Xem"} bài tập: ${item.tenBaiTap}`
              : `${expanded ? "Thu gọn" : "Xem"} bài tập (cần đăng ký): ${item.tenBaiTap}`
            : undefined
        }
        onClick={hasVideo ? toggleExpand : undefined}
        onKeyDown={onMainKeyDown}
      >
        <div
          className={`cso-khd-bt-card-thumb c${(index % 3) + 1}${item.thumbnailUrl ? " has-img" : ""}`}
        >
          {item.thumbnailUrl ? (
            <Image
              src={item.thumbnailUrl}
              alt=""
              fill
              className="cso-khd-bt-card-thumb-img"
              sizes="80px"
              unoptimized={isInlineBaiTapThumbnail(item.thumbnailUrl)}
            />
          ) : null}
        </div>
        <div className="cso-khd-bt-card-body">
          <div className="cso-khd-bt-card-title-row">
            <h3 className="cso-khd-bt-card-title">
              <span className="cso-khd-bt-card-order">Bài {index + 1}</span>
              <span className="cso-khd-bt-card-title-text">{item.tenBaiTap}</span>
            </h3>
            {canManage || (hasVideo && item.visible) ? (
              <div className="cso-khd-bt-card-title-actions">
                {canManage ? (
                  <button
                    type="button"
                    className="cso-khd-bt-card-edit-bt"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(item);
                    }}
                    aria-label={`Sửa bài tập: ${item.tenBaiTap}`}
                    title="Sửa bài tập"
                  >
                    <Pencil size={15} aria-hidden />
                  </button>
                ) : null}
                {hasVideo && item.visible ? (
                  <span
                    className={[
                      "cso-khd-bt-card-view-bt",
                      expanded ? "is-open" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden
                  >
                    <Eye size={16} />
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          {item.moTa ? (
            <p className="cso-khd-bt-card-desc">{item.moTa}</p>
          ) : null}
        </div>
      </div>
      {expanded && hasVideo ? (
        <div className="cso-khd-bt-card-expand">
          {item.visible ? (
            <div className="cso-khd-bt-card-vid">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                title={`Video: ${item.tenBaiTap}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="cso-khd-bt-card-lock" role="status">
              <Lock size={18} aria-hidden />
              <p>
                Vui lòng đăng ký khóa học để xem đầy đủ
              </p>
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}

const BAI_TAP_DISPLAY_OPTIONS: BaiTapSectionDisplayMode[] = [
  "an",
  "mot_phan",
  "day_du",
];

function BaiTapVisitorSection({
  baiTapList,
  giaoTrinh,
  displayMode,
  tenKhoaHoc,
  onSaveBaiTap,
}: {
  baiTapList: BaiTapKhoaData[];
  giaoTrinh: GiaoTrinhBaiData[];
  displayMode: BaiTapSectionDisplayMode;
  tenKhoaHoc: string;
  onSaveBaiTap: (draft: BaiTapKhoaDraft) => void;
}) {
  const total = baiTapList.length;

  if (displayMode === "an") {
    return (
      <div className="cso-khd-bt-contact-panel" role="status">
        <p>Vui lòng liên hệ để có thông tin chi tiết.</p>
      </div>
    );
  }

  if (displayMode === "mot_phan" && total > BAI_TAP_PARTIAL_VISIBLE_COUNT) {
    const previewItems = baiTapList.slice(0, BAI_TAP_PARTIAL_VISIBLE_COUNT);
    const restItems = baiTapList.slice(BAI_TAP_PARTIAL_VISIBLE_COUNT);

    return (
      <div className="cso-khd-bt-partial">
        <div className="cso-khd-bt-partial-preview">
          <div className="cso-khd-bt-list">
            {previewItems.map((bt, i) => (
              <BaiTapCard key={bt.id} item={bt} index={i} />
            ))}
          </div>
        </div>
        {restItems.length > 0 ? (
          <div className="cso-khd-bt-partial-rest">
            <div className="cso-khd-bt-list">
              {restItems.map((bt, i) => (
                <BaiTapCard
                  key={bt.id}
                  item={bt}
                  index={i + BAI_TAP_PARTIAL_VISIBLE_COUNT}
                />
              ))}
            </div>
            <div className="cso-khd-bt-partial-fade" aria-hidden />
          </div>
        ) : null}
        <p className="cso-khd-bt-partial-cta" role="status">
          <UserPlus size={17} aria-hidden />
          <span>Vui lòng đăng ký để xem đầy đủ giáo trình</span>
        </p>
      </div>
    );
  }

  return (
    <div className="cso-khd-bt-list">
      {baiTapList.map((bt, i) => (
        <BaiTapCard key={bt.id} item={bt} index={i} />
      ))}
      {giaoTrinh.map((bai, i) => (
        <GiaoTrinhBaiTapRow
          key={bai.id}
          bai={bai}
          index={i}
          canManage={false}
          tenKhoaHoc={tenKhoaHoc}
          onAddBaiTap={onSaveBaiTap}
        />
      ))}
    </div>
  );
}

function GiaoTrinhBaiTapRow({
  bai,
  index,
  canManage = false,
  tenKhoaHoc = "",
  onAddBaiTap,
}: {
  bai: GiaoTrinhBaiData;
  index: number;
  canManage?: boolean;
  tenKhoaHoc?: string;
  onAddBaiTap: (draft: BaiTapKhoaDraft) => void;
}) {
  const locked = bai.visibility === "chi_hoc_vien";
  const [baiTapOpen, setBaiTapOpen] = useState(false);

  return (
    <>
      <div
        className={[
          "cso-khd-bt-row",
          locked && !canManage ? "locked" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="cso-khd-bt-num">{index + 1}</span>
        <div className="cso-khd-bt-info">
          <div className="cso-khd-bt-title">{bai.tieuDe}</div>
          {bai.soBuoi != null && bai.soBuoi > 0 ? (
            <span className="cso-khd-buoi">{bai.soBuoi} buổi</span>
          ) : null}
        </div>
        <div className="cso-khd-bt-actions">
          {canManage ? (
            <button
              type="button"
              className="cso-khd-les-add-bt"
              onClick={() => setBaiTapOpen(true)}
            >
              <Plus size={12} aria-hidden />
              Thêm bài tập
            </button>
          ) : locked ? (
            <span className="cso-khd-les-lock">
              <Lock size={13} aria-hidden />
              Đăng ký để mở
            </span>
          ) : null}
        </div>
      </div>
      {canManage ? (
        <GiaoTrinhBaiTapPanel
          open={baiTapOpen}
          onClose={() => setBaiTapOpen(false)}
          bai={bai}
          baiIndex={index}
          tenKhoaHoc={tenKhoaHoc}
          onSave={onAddBaiTap}
        />
      ) : null}
    </>
  );
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

const LOP_OPEN_STATES = new Set<TrangThaiLop>(["sap_khai_giang", "dang_hoc"]);

function giaoVienFromLopText(text: string | null): GiaoVienKhoaData {
  const trimmed = text?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const initials =
      parts.length === 0
        ? "?"
        : parts.length === 1
          ? parts[0].slice(0, 2).toUpperCase()
          : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return {
      key: `text:${trimmed}`,
      ten: trimmed,
      slug: null,
      verified: false,
      initials,
      vaiTro: null,
      pendingProfile: true,
    };
  }
  return {
    key: "pending",
    ten: "Đang cập nhật",
    slug: null,
    verified: false,
    initials: "—",
    vaiTro: null,
    pendingProfile: false,
  };
}

function applyMockLopSave(
  detail: KhoaHocDetailPayload,
  editing: LopHocDetailData | null,
  payload: LopHocFormInput,
): KhoaHocDetailPayload {
  const trangThai = payload.trangThaiLop ?? "sap_khai_giang";
  const lich = payload.lichHoc?.trim() || null;
  const patch = {
    maLop: payload.maLop?.trim() || null,
    tenLop: lich,
    hinhThuc: payload.hinhThuc ?? "truc_tiep",
    lichHoc: lich,
    ngayKhaiGiang:
      payload.ngayKhaiGiang?.trim() ||
      detail.khoa.ngayKhaiGiangGanNhat ||
      new Date().toISOString().slice(0, 10),
    slotToiDa: payload.slotToiDa ?? null,
    trangThaiLop: trangThai,
    conCho: LOP_OPEN_STATES.has(trangThai),
    giaoVienText: payload.giaoVienText?.trim() || null,
    giaoVien: giaoVienFromLopText(payload.giaoVienText ?? null),
    diaChiHoc: detail.khoa.diaChiHoc,
  };

  if (editing) {
    return {
      ...detail,
      lopHoc: detail.lopHoc.map((lop) =>
        lop.id === editing.id ? { ...lop, ...patch } : lop,
      ),
    };
  }

  return {
    ...detail,
    lopHoc: [...detail.lopHoc, { id: crypto.randomUUID(), ...patch }],
  };
}

function LopHocCard({
  lop,
  lopIndex,
  highlighted,
  loaiMoHinh,
  canManage = false,
  onEdit,
}: {
  lop: LopHocDetailData;
  lopIndex: number;
  highlighted: boolean;
  loaiMoHinh: KhoaHocCardData["loaiMoHinh"];
  canManage?: boolean;
  onEdit?: (lop: LopHocDetailData) => void;
}) {
  const maLabel = lop.maLop ?? `Lớp ${lopIndex + 1}`;
  const lichLabel =
    lop.lichHoc ??
    (loaiMoHinh === "lien_tuc_theo_thang"
      ? "Khai giảng hàng tuần"
      : formatKhaiGiangCard("cohort_co_dinh", lop.ngayKhaiGiang));

  return (
    <div className={`cso-khd-khung cso-khd-lop${highlighted ? " hl" : ""}`}>
      <div className="cso-khd-khung-top">
        <div className="cso-khd-lop-head">
          <span className="cso-khd-lop-code">{maLabel}</span>
          {lop.tenLop ? (
            <span className="cso-khd-lop-sub">{lop.tenLop}</span>
          ) : null}
        </div>
        <div className="cso-khd-lop-top-actions">
          {lop.conCho ? (
            <span className="cso-khd-khung-st">Còn chỗ</span>
          ) : null}
          {canManage ? (
            <button
              type="button"
              className="cso-khd-lop-edit-bt"
              onClick={() => onEdit?.(lop)}
              aria-label={`Sửa lớp ${maLabel}`}
              title="Sửa lớp học"
            >
              <Pencil size={15} aria-hidden />
            </button>
          ) : null}
        </div>
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
        {!canManage ? (
          <button
            type="button"
            className={`cso-khd-btn cso-khd-btn--sm${highlighted ? "" : " cso-khd-btn--ghost"}`}
          >
            <UserPlus size={13} aria-hidden />
            Đăng ký lớp này
          </button>
        ) : null}
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
  orgSlug,
  orgVerified = false,
  isMockup = false,
  isManagingBaiTap = false,
  canEditKhoaDetail = false,
  onOpenKhoaEdit,
  baiTapDisplayMode,
  onBaiTapDisplayModeChange,
  baiTapList,
  baiTapOpen,
  onBaiTapOpenChange,
  onOpenAddBaiTap,
  editingBaiTap,
  onEditBaiTap,
  onSaveBaiTap,
  isManagingLop = false,
  onOpenAddLop,
  onEditLop,
}: {
  detail: KhoaHocDetailPayload;
  orgSlug: string;
  orgVerified?: boolean;
  isMockup?: boolean;
  /** Quản trị bài tập — chỉ khi có quyền và đang bật chế độ quản trị. */
  isManagingBaiTap?: boolean;
  canEditKhoaDetail?: boolean;
  onOpenKhoaEdit?: () => void;
  baiTapDisplayMode: BaiTapSectionDisplayMode;
  onBaiTapDisplayModeChange: (mode: BaiTapSectionDisplayMode) => void;
  baiTapList: BaiTapKhoaData[];
  baiTapOpen: boolean;
  onBaiTapOpenChange: (open: boolean) => void;
  onOpenAddBaiTap: () => void;
  editingBaiTap: BaiTapKhoaData | null;
  onEditBaiTap: (item: BaiTapKhoaData) => void;
  onSaveBaiTap: (draft: BaiTapKhoaDraft) => void;
  isManagingLop?: boolean;
  onOpenAddLop: () => void;
  onEditLop: (lop: LopHocDetailData) => void;
}) {
  const display = useMemo(
    () => resolveKhoaHocDetailDisplay(detail),
    [detail],
  );
  const { khoa, orgTen, giaoTrinh, lopHoc, giaoVien } = display;
  const visibleLopHoc = useMemo(() => {
    if (isMockup) return lopHoc;
    return lopHoc.filter((lop) => !isScaffoldLopHoc(lop));
  }, [lopHoc, isMockup]);
  const hasScaffoldLop = useMemo(
    () => !isMockup && lopHoc.some(isScaffoldLopHoc),
    [lopHoc, isMockup],
  );
  const hasCover = Boolean(khoa.coverUrl);
  const covClass = [
    "cso-khd-cover",
    hasCover ? `c${(khoa.coverVariant % 3) + 1}` : "cso-khd-cover--placeholder",
  ]
    .filter(Boolean)
    .join(" ");

  const tryCount = giaoTrinh.filter((b) => b.visibility === "public").length;

  const giaoTrinhSummary = useMemo(() => {
    if (!giaoTrinh.length || isManagingBaiTap) return null;
    const totalBuoi = giaoTrinh.reduce((s, b) => s + (b.soBuoi ?? 0), 0);
    const parts: string[] = [];
    if (totalBuoi > 0) parts.push(`${totalBuoi} buổi`);
    parts.push(`${giaoTrinh.length} bài`);
    if (tryCount > 0) parts.push(`${tryCount} xem thử`);
    return parts.join(" · ");
  }, [giaoTrinh, tryCount, isManagingBaiTap]);

  const showBaiTapSection =
    isManagingBaiTap || giaoTrinh.length > 0 || baiTapList.length > 0;

  const thoiLuongLabel = formatThoiLuongKhoa(
    khoa.thoiLuongBuoi,
    khoa.thoiLuongPhutMoiBuoi,
  );
  const hasThoiLuong = thoiLuongLabel !== "—";
  const hocPhiFormatted = formatKhoaHocPhi(khoa.hocPhi, khoa.loaiMoHinh);
  const hasHocPhi = khoa.hocPhi != null;
  const hocPhiValue = hocPhiFormatted.replace(/\/th$/, "");
  const hocPhiUnit =
    khoa.loaiMoHinh === "lien_tuc_theo_thang" ? "VNĐ/tháng" : "VNĐ/khóa";
  const hinhThucLabel = khoa.hinhThuc
    ? labelHinhThucLopChiTiet(khoa.hinhThuc)
    : "—";
  const khoaStatus = labelTrangThaiKhoaHoc(khoa.trangThaiKhoaHoc);
  const finalCtaTitle = isMockup ? "SẴN SÀNG CẦM CHÌ?" : "Sẵn sàng bắt đầu?";

  return (
    <div className="cso-khd cso-khd--landing">
      {isMockup ? (
        <p className="cso-khd-mock-banner" role="status">
          Mockup thiết kế · dữ liệu demo
        </p>
      ) : null}
      <article
        className={[
          "cso-khd-sheet",
          canEditKhoaDetail ? "cso-khd-sheet--manage" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {canEditKhoaDetail ? (
          <div className="cso-khd-sheet-toolbar">
            <button
              type="button"
              className="cso-khd-sheet-edit-bt"
              onClick={onOpenKhoaEdit}
            >
              <Pencil size={14} aria-hidden />
              Sửa khóa học
            </button>
          </div>
        ) : null}
        <nav className="cso-khd-crumb" aria-label="Breadcrumb">
          <Link href={coSoRootPath(orgSlug)} scroll={false}>
            {orgTen || "Cơ sở"}
          </Link>
          <ChevronRight size={13} aria-hidden />
          <Link href={coSoTabPath(orgSlug, "khoa-hoc")} scroll={false}>
            Khóa học
          </Link>
          <ChevronRight size={13} aria-hidden />
          <span className="here" aria-current="page">
            {khoa.tenKhoaHoc}
          </span>
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
        </div>

        <header className="cso-khd-head">
          <div className="cso-khd-h-org-row">
            <p className="cso-khd-h-org">
              <GraduationCap size={14} aria-hidden />
              {orgTen}
              {orgVerified || isMockup ? (
                <BadgeCheck size={14} className="cso-khd-h-org-v" aria-hidden />
              ) : null}
            </p>
            <span
              className={`cso-khd-status cso-khd-status--${khoaStatus.tone}`}
            >
              {khoaStatus.tone === "pause" ? (
                <Pause size={11} aria-hidden />
              ) : (
                <CircleDot size={11} aria-hidden />
              )}
              {khoaStatus.text}
            </span>
          </div>
          <h1 className="cso-khd-h-title">{khoa.tenKhoaHoc}</h1>
          <div className="cso-khd-facts">
            <div className="cso-khd-facts-meta">
              <div className="cso-khd-fact">
                <div className="k">Mô hình</div>
                <div className="v">{labelLoaiMoHinhKhoa(khoa.loaiMoHinh)}</div>
              </div>
              <div className="cso-khd-fact">
                <div className="k">Hình thức học</div>
                <div className="v">{hinhThucLabel}</div>
              </div>
              <div className="cso-khd-fact">
                <div className="k">Đầu vào</div>
                <div className="v">
                  {labelTrinhDoDauVao(khoa.trinhDoDauVao)}
                </div>
              </div>
            </div>
            <div
              className="cso-khd-hero-metrics"
              aria-label="Học phí và thời lượng"
            >
              <div className="cso-khd-metric cso-khd-metric--fee">
                <span className="cso-khd-metric-k">Học phí</span>
                <div className="cso-khd-metric-main">
                  <span
                    className={[
                      "cso-khd-metric-v",
                      !hasHocPhi ? "is-empty" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {hocPhiValue}
                  </span>
                  {hasHocPhi ? (
                    <span className="cso-khd-metric-unit">{hocPhiUnit}</span>
                  ) : null}
                </div>
              </div>
              <div className="cso-khd-metric cso-khd-metric--duration">
                <span className="cso-khd-metric-k">Thời lượng</span>
                <span
                  className={[
                    "cso-khd-metric-v",
                    !hasThoiLuong ? "is-empty" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {thoiLuongLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="cso-khd-hero-cta">
            <button type="button" className="cso-khd-btn">
              <UserPlus size={15} aria-hidden />
              Đăng ký học
            </button>
          </div>
        </header>

        <div className="cso-khd-body">
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

          {showBaiTapSection ? (
            <>
              <div className="cso-khd-rule" aria-hidden />
              <section className="cso-khd-bt-block" aria-labelledby="cso-khd-bt-block-title">
                <div
                  id="cso-khd-bt-block-title"
                  className="cso-khd-s-label cso-khd-bt-block-head"
                >
                  <span className="cso-khd-bt-block-head-main">
                    {isManagingBaiTap ? (
                      <ClipboardList size={15} aria-hidden />
                    ) : (
                      <ListOrdered size={15} aria-hidden />
                    )}
                    {isManagingBaiTap ? "Bài tập" : "Lộ trình bài"}
                    {giaoTrinhSummary ? (
                      <span className="cso-khd-s-sum">{giaoTrinhSummary}</span>
                    ) : null}
                  </span>
                  {isManagingBaiTap ? (
                    <select
                      className="cso-khd-bt-display-select"
                      value={baiTapDisplayMode}
                      onChange={(e) =>
                        onBaiTapDisplayModeChange(
                          e.target.value as BaiTapSectionDisplayMode,
                        )
                      }
                      aria-label="Cách hiển thị bài tập cho khách"
                    >
                      {BAI_TAP_DISPLAY_OPTIONS.map((mode) => (
                        <option key={mode} value={mode}>
                          {labelBaiTapSectionDisplay(mode)}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
                <div className="cso-khd-bt-block-body">
                  {isManagingBaiTap ? (
                    <>
                      {baiTapList.length > 0 ? (
                        <div className="cso-khd-bt-list">
                          {baiTapList.map((bt, i) => (
                            <BaiTapCard
                              key={bt.id}
                              item={bt}
                              index={i}
                              canManage
                              onEdit={onEditBaiTap}
                            />
                          ))}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        className={[
                          "cso-khd-bt-empty-card",
                          baiTapList.length > 0
                            ? "cso-khd-bt-empty-card--compact"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={onOpenAddBaiTap}
                      >
                        <Plus size={22} aria-hidden />
                        <span className="cso-khd-bt-empty-title">Thêm bài tập</span>
                        {baiTapList.length === 0 ? (
                          <span className="cso-khd-bt-empty-hint">
                            Chưa có bài tập trong khóa này.
                          </span>
                        ) : null}
                      </button>
                      <GiaoTrinhBaiTapPanel
                        open={baiTapOpen}
                        onClose={() => onBaiTapOpenChange(false)}
                        tenKhoaHoc={khoa.tenKhoaHoc}
                        editItem={editingBaiTap}
                        onSave={onSaveBaiTap}
                      />
                    </>
                  ) : (
                    <BaiTapVisitorSection
                      baiTapList={baiTapList}
                      giaoTrinh={giaoTrinh}
                      displayMode={baiTapDisplayMode}
                      tenKhoaHoc={khoa.tenKhoaHoc}
                      onSaveBaiTap={onSaveBaiTap}
                    />
                  )}
                </div>
              </section>
            </>
          ) : null}

          {visibleLopHoc.length > 0 || isManagingLop ? (
            <>
              <div className="cso-khd-rule" aria-hidden />
              <div className="cso-khd-s-label">
                <CalendarClock size={15} aria-hidden />
                Lớp học
              </div>
              <p className="cso-khd-s-sub">
                {khoa.loaiMoHinh === "lien_tuc_theo_thang"
                  ? "Một khóa có thể mở nhiều lớp — mỗi lớp có mã, lịch và giảng viên riêng. Vào học linh hoạt; cùng giáo trình."
                  : "Một khóa có thể mở nhiều lớp — mỗi lớp có mã (VD: HHK30), lịch khai giảng và giảng viên riêng."}
              </p>
              {visibleLopHoc.map((lop, i) => (
                <LopHocCard
                  key={lop.id}
                  lop={lop}
                  lopIndex={i}
                  highlighted={!isManagingLop && i === 0}
                  loaiMoHinh={khoa.loaiMoHinh}
                  canManage={isManagingLop}
                  onEdit={onEditLop}
                />
              ))}
              {isManagingLop ? (
                <button
                  type="button"
                  className={[
                    "cso-khd-bt-empty-card",
                    visibleLopHoc.length > 0
                      ? "cso-khd-bt-empty-card--compact"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={onOpenAddLop}
                >
                  <Plus size={22} aria-hidden />
                  <span className="cso-khd-bt-empty-title">
                    {visibleLopHoc.length === 0 && hasScaffoldLop
                      ? "Cấu hình lớp"
                      : "Thêm lớp"}
                  </span>
                  {visibleLopHoc.length === 0 ? (
                    <span className="cso-khd-bt-empty-hint">
                      {hasScaffoldLop
                        ? "Hoàn thiện mã lớp, lịch học và giảng viên."
                        : "Chưa có lớp học trong khóa này."}
                    </span>
                  ) : null}
                </button>
              ) : null}
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
          {canEditKhoaDetail ? (
            <div className="cso-khd-works-note">
              <BadgeCheck size={16} aria-hidden />
              <span>
                <b>Học viên tự đăng</b> rồi gắn &quot;làm khi học khóa này&quot;,{" "}
                {orgTen || "cơ sở"} bấm xác nhận. Mỗi tác phẩm gắn thẳng hồ sơ
                nghề thật của học viên.
              </span>
            </div>
          ) : null}
          <p className="cso-khd-works-empty">
            Chưa có tác phẩm được xác nhận cho khóa này.
          </p>
        </div>

        <footer className="cso-khd-final">
          <h3>{finalCtaTitle}</h3>
          <p>
            {formatKhoaFooterDangKyLine(
              khoa.loaiMoHinh,
              khoa.ngayKhaiGiangGanNhat,
            )}{" "}
            ·
            học phí <span className="cso-khd-final-price">{hocPhiFormatted}</span> ·
            gửi đăng ký tới {orgTen || "cơ sở"} duyệt
          </p>
          <button type="button" className="cso-khd-btn">
            <UserPlus size={15} aria-hidden />
            Đăng ký học
          </button>
        </footer>
      </article>
    </div>
  );
}

export function KhoaHocDetailView({
  orgId,
  orgSlug,
  orgTen,
  orgDiaChi = null,
  khoa,
  orgVerified = false,
  useMockup = false,
  canManageKhoaHoc = false,
  onKhoaUpdated,
}: Props) {
  const router = useRouter();
  const ctx = useTruongInlineEdit();
  const searchParams = useSearchParams();
  const mockupFromQuery = searchParams.get("mockup") === "1";
  const isMockup =
    useMockup ||
    mockupFromQuery ||
    isKhoaHocDetailMockSlug(khoa.slug);
  const isManagingKhoa =
    canManageKhoaHoc && (ctx?.isEditing ?? false) && !isMockup;
  const isManagingBaiTap = isManagingKhoa;

  const [detail, setDetail] = useState<KhoaHocDetailPayload | null>(
    isMockup ? buildKhoaHocDetailMock(orgTen) : null,
  );
  const [loading, setLoading] = useState(!isMockup);
  const [error, setError] = useState<string | null>(null);
  const [baiTapOpen, setBaiTapOpen] = useState(false);
  const [editingBaiTap, setEditingBaiTap] = useState<BaiTapKhoaData | null>(
    null,
  );
  const [baiTapList, setBaiTapList] = useState(() =>
    loadBaiTapDrafts(orgId, khoa.id),
  );
  const [baiTapDisplayMode, setBaiTapDisplayMode] = useState(() =>
    loadBaiTapSectionDisplay(orgId, khoa.id),
  );
  const [khoaEditOpen, setKhoaEditOpen] = useState(false);
  const [lopOpen, setLopOpen] = useState(false);
  const [editingLop, setEditingLop] = useState<LopHocDetailData | null>(null);

  useEffect(() => {
    setBaiTapOpen(false);
    setEditingBaiTap(null);
    setBaiTapList(loadBaiTapDrafts(orgId, khoa.id));
    setBaiTapDisplayMode(loadBaiTapSectionDisplay(orgId, khoa.id));
  }, [orgId, khoa.id]);

  useEffect(() => {
    if (!isManagingKhoa) {
      setBaiTapOpen(false);
      setEditingBaiTap(null);
      setKhoaEditOpen(false);
      setLopOpen(false);
      setEditingLop(null);
    }
  }, [isManagingKhoa]);

  async function refetchDetail() {
    const res = await fetch(
      `/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc/${encodeURIComponent(khoa.id)}`,
    );
    const body = (await res.json()) as {
      detail?: KhoaHocDetailPayload;
      error?: string;
    };
    if (!res.ok || !body.detail) {
      throw new Error(body.error ?? "Không tải được chi tiết khóa.");
    }
    setDetail({
      ...body.detail,
      orgTen: body.detail.orgTen || orgTen,
    });
  }

  function handleOpenAddBaiTap() {
    setEditingBaiTap(null);
    setBaiTapOpen(true);
  }

  function handleBaiTapOpenChange(open: boolean) {
    setBaiTapOpen(open);
    if (!open) setEditingBaiTap(null);
  }

  function handleEditBaiTap(item: BaiTapKhoaData) {
    setEditingBaiTap(item);
    setBaiTapOpen(true);
  }

  function handleBaiTapDisplayModeChange(mode: BaiTapSectionDisplayMode) {
    setBaiTapDisplayMode(mode);
    saveBaiTapSectionDisplay(orgId, khoa.id, mode);
  }

  function handleSaveBaiTap(draft: BaiTapKhoaDraft) {
    setBaiTapList((prev) => {
      const next = editingBaiTap
        ? prev.map((bt) =>
            bt.id === editingBaiTap.id ? { ...bt, ...draft } : bt,
          )
        : [...prev, { id: crypto.randomUUID(), ...draft }];
      saveBaiTapDrafts(orgId, khoa.id, next);
      return next;
    });
    setEditingBaiTap(null);
  }

  function handleOpenAddLop() {
    const scaffold =
      !isMockup && detail
        ? (detail.lopHoc.find(isScaffoldLopHoc) ?? null)
        : null;
    setEditingLop(scaffold);
    setLopOpen(true);
  }

  function handleLopOpenChange(open: boolean) {
    setLopOpen(open);
    if (!open) setEditingLop(null);
  }

  function handleEditLop(lop: LopHocDetailData) {
    setEditingLop(lop);
    setLopOpen(true);
  }

  function handleLopSaved(payload: LopHocFormInput) {
    if (isMockup) {
      setDetail((prev) =>
        prev ? applyMockLopSave(prev, editingLop, payload) : prev,
      );
    } else {
      void refetchDetail().catch(() => {
        /* giữ UI cũ nếu refetch lỗi */
      });
    }
    setEditingLop(null);
  }

  function handleKhoaUpdated(updated: KhoaHocCardData) {
    setDetail((prev) => (prev ? { ...prev, khoa: updated } : prev));
    onKhoaUpdated?.(updated);
    notifyCoSoKhoaListChanged(orgId);
    setKhoaEditOpen(false);
    if (updated.slug !== khoa.slug) {
      router.replace(coSoKhoaHocDetailPath(orgSlug, updated.slug), {
        scroll: false,
      });
    }
  }

  useEffect(() => {
    if (isMockup) {
      setDetail(buildKhoaHocDetailMock(orgTen));
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setDetail(null);
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
  }, [orgId, khoa.id, isMockup]);

  if (loading || !detail) {
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
    <>
      <DetailContent
        detail={detail}
        orgSlug={orgSlug}
        orgVerified={orgVerified}
        isMockup={isMockup}
        isManagingBaiTap={isManagingBaiTap}
        canEditKhoaDetail={isManagingKhoa}
        onOpenKhoaEdit={() => setKhoaEditOpen(true)}
        baiTapDisplayMode={baiTapDisplayMode}
        onBaiTapDisplayModeChange={handleBaiTapDisplayModeChange}
        baiTapList={baiTapList}
        baiTapOpen={baiTapOpen}
        onBaiTapOpenChange={handleBaiTapOpenChange}
        onOpenAddBaiTap={handleOpenAddBaiTap}
        editingBaiTap={editingBaiTap}
        onEditBaiTap={handleEditBaiTap}
        onSaveBaiTap={handleSaveBaiTap}
        isManagingLop={isManagingKhoa}
        onOpenAddLop={handleOpenAddLop}
        onEditLop={handleEditLop}
      />
      {isManagingKhoa ? (
        <LopHocEditModal
          open={lopOpen}
          onClose={() => handleLopOpenChange(false)}
          orgId={orgId}
          khoaId={khoa.id}
          loaiMoHinh={detail.khoa.loaiMoHinh}
          tenKhoaHoc={detail.khoa.tenKhoaHoc}
          editing={editingLop}
          isMockup={isMockup}
          onSaved={handleLopSaved}
        />
      ) : null}
      {isManagingKhoa ? (
        <KhoaHocCreateModal
          open={khoaEditOpen}
          orgId={orgId}
          orgDiaChi={orgDiaChi}
          editing={detail.khoa}
          onClose={() => setKhoaEditOpen(false)}
          onUpdated={handleKhoaUpdated}
        />
      ) : null}
    </>
  );
}
