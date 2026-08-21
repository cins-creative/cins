"use client";

import {
  Bookmark,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarHeart,
  ClipboardList,
  Compass,
  DoorOpen,
  Eye,
  GraduationCap,
  Inbox,
  MessageCircle,
  Package,
  Route,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  UserPlus,
  UserRoundPlus,
  UserRoundSearch,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { ModuleId } from "@/lib/cins/home-adaptive/persona";
import { tHomeModDesc, tHomeModLabel } from "@/lib/i18n/home-modules";
import { useT } from "@/lib/i18n/use-t";
import { avatarBg, avatarHueFromSeed } from "@/lib/chat/avatar";

const TITLE_ICON: Partial<Record<ModuleId, LucideIcon>> = {
  theo_doi_org: CalendarDays,
  goi_y_theo_doi: UserRoundPlus,
  nguoi_cung_nganh: Users,
  goi_y_studio: Building2,
  duong_toi_do: GraduationCap,
  kham_pha_linh_vuc: Compass,
  khoa_hoc_goi_y: GraduationCap,
  lop_hoc_cua_ban: DoorOpen,
  ho_so_cua_ban: Route,
  co_hoi: Briefcase,
  cho_ban_duyet: Sparkles,
  hoc_vien_cua_ban: Users,
  scout_tai_nang: Sparkles,
  don_can_xu_ly: ClipboardList,
  don_mua_cua_toi: ShoppingBag,
  quay_cua_toi: Store,
  org_inbox: Inbox,
  quan_ly_su_kien: CalendarCheck,
  ung_vien_moi: UserRoundSearch,
  to_chuc_cua_ban: Building2,
  ung_tuyen_cua_toi: Briefcase,
  tin_nhan_ban_be: MessageCircle,
  tin_nhan_to_chuc: Building2,
  tin_nhan_mua_ban: ShoppingBag,
  loi_moi_ket_ban: UserPlus,
  se_tham_gia: CalendarHeart,
  da_luu: Bookmark,
  hang_feature: Package,
  quan_ly_kho: Package,
  gio_hang_cua_ban: ShoppingCart,
};

const CARD_CLASS: Partial<Record<ModuleId, string>> = {
  theo_doi_org: "ha-card--notify",
  nguoi_cung_nganh: "ha-card--people",
  goi_y_studio: "ha-card--studio",
  ho_so_cua_ban: "ha-card--profile",
  co_hoi: "ha-card--jobs",
  don_can_xu_ly: "ha-card--don",
  don_mua_cua_toi: "ha-card--don",
  tin_nhan_ban_be: "ha-card--chat",
  tin_nhan_to_chuc: "ha-card--chat",
  tin_nhan_mua_ban: "ha-card--chat",
  lop_hoc_cua_ban: "ha-card--lop",
  hang_feature: "ha-card--hang",
  quan_ly_kho: "ha-card--kho",
  gio_hang_cua_ban: "ha-card--gio",
};

type MockRow = { av: string; title: string; sub: string; extra?: string };

const MOCK_ROWS: Partial<Record<ModuleId, MockRow[]>> = {
  theo_doi_org: [
    {
      av: "CF",
      title: "Color Fiesta 17: Wonderland",
      sub: "02/10 · 17:00",
      extra: "Sẽ tham gia",
    },
    {
      av: "SK",
      title: "Workshop portfolio",
      sub: "Cuối tuần này",
      extra: "Quan tâm",
    },
  ],
  goi_y_theo_doi: [
    { av: "AN", title: "An Nguyễn", sub: "2 bạn chung" },
    { av: "MT", title: "Minh Trần", sub: "Đang học" },
  ],
  nguoi_cung_nganh: [
    { av: "LH", title: "Lan Hương", sub: "Thiết kế đồ họa" },
    { av: "PQ", title: "Phúc Quang", sub: "Motion design" },
  ],
  goi_y_studio: [
    { av: "ST", title: "Studio Nova", sub: "3 tin đang mở" },
    { av: "DN", title: "Pixel Agency", sub: "1 tin đang mở" },
  ],
  duong_toi_do: [
    { av: "CS", title: "CINs Academy", sub: "Cơ sở đào tạo" },
    { av: "FH", title: "FPT Art Hub", sub: "Khóa ngắn hạn" },
  ],
  khoa_hoc_goi_y: [
    { av: "UI", title: "UI/UX Intensive", sub: "CINs · Cohort" },
    { av: "MO", title: "Motion cơ bản", sub: "Đang mở tuyển" },
  ],
  lop_hoc_cua_ban: [
    {
      av: "A1",
      title: "Lớp A1",
      sub: "Motion cơ bản · CINs",
      extra: "Còn 25 phút",
    },
    {
      av: "B2",
      title: "Lớp B2",
      sub: "UI Intensive · CINs",
      extra: "T5 · 19:00",
    },
  ],
  co_hoi: [
    {
      av: "NO",
      title: "Junior Designer",
      sub: "Studio Nova · TP.HCM",
      extra: "12–18 triệu",
    },
    {
      av: "PX",
      title: "Intern Motion",
      sub: "Pixel · Remote",
      extra: "Thỏa thuận",
    },
  ],
  cho_ban_duyet: [
    { av: "KH", title: "Khánh Trang", sub: "Xác thực học viên" },
    { av: "DT", title: "Đức Thành", sub: "Xác thực giảng viên" },
  ],
  hoc_vien_cua_ban: [
    { av: "KH", title: "Khánh", sub: "Trang trí màu · Online" },
    { av: "MY", title: "My Anh", sub: "UI Foundation" },
  ],
  scout_tai_nang: [
    { av: "HP", title: "Hải Phương", sub: "3 cột mốc nổi bật" },
    { av: "QL", title: "Quỳnh Lam", sub: "Portfolio mới" },
  ],
  don_can_xu_ly: [
    { av: "AN", title: "An Nguyễn", sub: "DH-1024 · Chờ xác nhận", extra: "180k" },
    { av: "MT", title: "Minh Trần", sub: "DH-1025 · Chờ lấy hàng" },
  ],
  don_mua_cua_toi: [
    { av: "ST", title: "Studio Nova", sub: "Đang giao · 250k" },
    { av: "PX", title: "Pixel Shop", sub: "Chờ xác nhận" },
  ],
  quay_cua_toi: [
    { av: "CF", title: "Color Fiesta 17", sub: "Chờ duyệt" },
    { av: "WK", title: "Workshop weekend", sub: "Đã duyệt" },
  ],
  org_inbox: [
    { av: "HV", title: "Học viên Lan", sub: "CSĐT · Xin hỏi lịch học" },
    { av: "KH", title: "Khách Minh", sub: "Studio · Báo giá" },
  ],
  quan_ly_su_kien: [
    {
      av: "CF",
      title: "Color Fiesta 17",
      sub: "42 sẽ tham gia · 3 quầy chờ",
    },
    { av: "OD", title: "Open Day", sub: "18/24 slot" },
  ],
  ung_vien_moi: [
    { av: "HP", title: "Hải Phương", sub: "Junior Designer" },
    { av: "MY", title: "My Anh", sub: "Intern Motion" },
  ],
  to_chuc_cua_ban: [
    { av: "CN", title: "CINs Academy", sub: "CSĐT · Thành viên" },
    { av: "ST", title: "Studio Nova", sub: "Studio · Admin" },
  ],
  ung_tuyen_cua_toi: [
    { av: "JD", title: "Junior Designer", sub: "Studio Nova · Đang xem" },
    { av: "IM", title: "Intern Motion", sub: "Pixel · Mới nộp" },
  ],
  tin_nhan_ban_be: [
    { av: "AN", title: "An Nguyễn", sub: "Mai đi workshop không?" },
    { av: "LH", title: "Lan Hương", sub: "Gửi portfolio nhé" },
  ],
  tin_nhan_to_chuc: [
    { av: "L1", title: "Lớp UI Foundation", sub: "Nhắc nộp bài tuần 3" },
    { av: "CS", title: "CINs Academy", sub: "Lịch học cập nhật" },
  ],
  tin_nhan_mua_ban: [
    { av: "KH", title: "Khách An", sub: "Còn size M không ạ?" },
    { av: "MB", title: "Shop Pixel", sub: "Đơn đã gửi hàng" },
  ],
  loi_moi_ket_ban: [
    { av: "PQ", title: "Phúc Quang", sub: "Muốn kết bạn" },
    { av: "QL", title: "Quỳnh Lam", sub: "Muốn kết bạn" },
  ],
  se_tham_gia: [
    { av: "CF", title: "Color Fiesta 17", sub: "02/10 · Color Fiesta" },
    { av: "WK", title: "Workshop portfolio", sub: "Cuối tuần này" },
  ],
  da_luu: [
    { av: "CM", title: "Portfolio motion reel", sub: "Cột mốc" },
    { av: "TD", title: "Junior Designer", sub: "Tuyển dụng" },
  ],
  hang_feature: [
    { av: "S", title: "Sticker pack", sub: "Shop An · Bạn bè", extra: "85.000đ" },
    { av: "P", title: "Print A3", sub: "Pixel Lab · Gợi ý", extra: "120.000đ" },
    { av: "T", title: "Tote canvas", sub: "Studio Mộc · Bạn bè", extra: "195.000đ" },
  ],
  quan_ly_kho: [
    { av: "S", title: "Sticker pack", sub: "Size M", extra: "Hết hàng" },
    { av: "P", title: "Print A3", sub: "Mặc định", extra: "Còn 2" },
    { av: "T", title: "Tote canvas", sub: "Đen", extra: "Còn 5" },
  ],
  gio_hang_cua_ban: [
    { av: "S", title: "Sticker pack", sub: "Shop An · ×2", extra: "85.000đ" },
    { av: "P", title: "Print A3", sub: "Pixel Lab · ×1", extra: "120.000đ" },
    { av: "T", title: "Tote canvas", sub: "Studio Mộc · ×1", extra: "195.000đ" },
  ],
};

const LV_MOCK = [
  { label: "Thiết kế", color: "var(--cins-yellow)" },
  { label: "Motion", color: "var(--cins-mint)" },
  { label: "3D", color: "var(--cins-orange)" },
  { label: "Nhiếp ảnh", color: "var(--cins-violet)" },
  { label: "UI/UX", color: "var(--cins-blue)" },
  { label: "Game", color: "var(--cins-yellow)" },
];

function MockShell({
  id,
  title,
  children,
}: {
  id: ModuleId;
  title?: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const Icon = TITLE_ICON[id];
  const extra = CARD_CLASS[id];
  return (
    <section
      className={`ha-card ha-edit-mock${extra ? ` ${extra}` : ""}`}
      aria-hidden
    >
      <div className="ha-card-head">
        {Icon ? <Icon size={15} strokeWidth={2} aria-hidden /> : null}
        <span className="ha-card-title">{title ?? tHomeModLabel(t, id)}</span>
      </div>
      {children}
    </section>
  );
}

function MockHangRows({ rows }: { rows: MockRow[] }) {
  return (
    <ul className="ha-hang-list">
      {rows.map((r) => (
        <li key={r.title} className="ha-hang-cell">
          <span className="ha-hang-card">
            <span className="ha-hang-thumb" aria-hidden>
              <span className="ha-hang-thumb-fallback">{r.av}</span>
            </span>
            <span className="ha-hang-meta">
              <span className="ha-hang-title">{r.title}</span>
              {r.extra ? <span className="ha-hang-gia">{r.extra}</span> : null}
              <span className="ha-hang-sub">{r.sub}</span>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function MockPeopleRows({ rows }: { rows: MockRow[] }) {
  return (
    <div className="ha-edit-mock-list">
      {rows.map((r) => (
        <div key={r.title} className="ha-edit-mock-row">
          <span className="ha-edit-mock-av" aria-hidden>
            {r.av}
          </span>
          <span className="ha-edit-mock-meta">
            <span className="ha-edit-mock-title">{r.title}</span>
            <span className="ha-edit-mock-sub">{r.sub}</span>
          </span>
          {r.extra ? (
            <span className="ha-edit-mock-chip">{r.extra}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function MockDonRows({ rows }: { rows: MockRow[] }) {
  return (
    <div className="ha-don-list">
      {rows.map((r) => (
        <article key={r.title} className="ha-don">
          <div className="ha-don-row">
            <span className="ha-edit-mock-av" aria-hidden>
              {r.av}
            </span>
            <div className="ha-don-meta">
              <div className="ha-don-top">
                <span className="ha-don-name">{r.title}</span>
                {r.extra ? (
                  <span className="ha-don-price">{r.extra}</span>
                ) : null}
              </div>
              <div className="ha-don-sub">
                <span className="ha-don-code">{r.sub}</span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function MockChatRows({ rows }: { rows: MockRow[] }) {
  return (
    <div className="ha-chat-list" role="list">
      {rows.map((r) => {
        const initial =
          r.av.trim().slice(0, 1).toUpperCase() ||
          r.title.trim().slice(0, 1).toUpperCase() ||
          "?";
        const hue = avatarHueFromSeed(r.title);
        return (
          <div key={r.title} role="listitem">
            <div className="cins-chat-thread">
              <span className="cins-chat-avatar-wrap">
                <span
                  className="cins-chat-avatar"
                  style={{
                    width: 40,
                    height: 40,
                    fontSize: 15,
                    background: avatarBg(hue),
                  }}
                  aria-hidden
                >
                  {initial}
                </span>
              </span>
              <div className="cins-chat-thread-main">
                <div className="cins-chat-thread-top">
                  <span className="cins-chat-thread-name">
                    <strong>{r.title}</strong>
                  </span>
                </div>
                <div className="cins-chat-thread-bottom">
                  <span className="cins-chat-thread-preview">{r.sub}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Mockup tĩnh giống khối sidebar — không query API. */
export function HomeModuleMockCard({ id }: { id: ModuleId }) {
  const t = useT();
  if (id === "kham_pha_linh_vuc") {
    return (
      <MockShell id={id}>
        {LV_MOCK.map((lv) => (
          <div key={lv.label} className="ha-cat">
            <span
              className="ha-cat-dot"
              style={{ background: lv.color }}
            />
            <span className="ha-cat-name">{lv.label}</span>
          </div>
        ))}
      </MockShell>
    );
  }

  if (id === "ho_so_cua_ban") {
    return (
      <MockShell id={id}>
        <div className="ha-edit-mock-profile">
          <span className="ha-edit-mock-ring" aria-hidden>
            72%
          </span>
          <span className="ha-edit-mock-meta">
            <span className="ha-edit-mock-title">Đang hoàn thiện hồ sơ</span>
            <span className="ha-edit-mock-sub">
              Thêm dự án để studio dễ tìm thấy bạn.
            </span>
          </span>
        </div>
        <div className="ha-edit-mock-open">
          <Eye size={13} strokeWidth={2} aria-hidden />
          Đang mở cơ hội
        </div>
      </MockShell>
    );
  }

  if (id === "theo_doi_org") {
    const rows = MOCK_ROWS.theo_doi_org ?? [];
    return (
      <MockShell id={id}>
        <ul className="ha-edit-mock-events">
          {rows.map((r, i) => (
            <li
              key={r.title}
              className={`ha-edit-mock-event${i === 0 ? " ha-edit-mock-event--feat" : ""}`}
            >
              <span className="ha-edit-mock-date" aria-hidden>
                <span className="ha-edit-mock-date-m">Th10</span>
                <span className="ha-edit-mock-date-d">02</span>
              </span>
              <span className="ha-edit-mock-meta">
                <span className="ha-edit-mock-title">{r.title}</span>
                <span className="ha-edit-mock-sub">{r.sub}</span>
              </span>
              {r.extra ? (
                <span className="ha-edit-mock-chip">{r.extra}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </MockShell>
    );
  }

  const rows = MOCK_ROWS[id];
  if (rows) {
    if (id === "don_can_xu_ly" || id === "don_mua_cua_toi") {
      return (
        <MockShell id={id}>
          <MockDonRows rows={rows} />
        </MockShell>
      );
    }
    if (id === "hang_feature") {
      return (
        <MockShell id={id}>
          <MockHangRows rows={rows} />
        </MockShell>
      );
    }
    if (id === "quan_ly_kho") {
      return (
        <MockShell id={id}>
          <div className="ha-kho-list">
            {rows.map((r) => (
              <div
                key={r.title + r.sub}
                className={`ha-kho-row${r.extra === "Hết hàng" ? " ha-kho-row--het" : " ha-kho-row--sap_het"}`}
              >
                <span className="ha-kho-av" aria-hidden>
                  <span className="ha-kho-av-fallback">{r.av}</span>
                </span>
                <span className="ha-kho-body">
                  <span className="ha-kho-title">{r.title}</span>
                  <span className="ha-kho-sub">{r.sub}</span>
                </span>
                {r.extra ? <span className="ha-kho-ton">{r.extra}</span> : null}
              </div>
            ))}
          </div>
        </MockShell>
      );
    }
    if (id === "gio_hang_cua_ban") {
      return (
        <MockShell id={id}>
          <div className="ha-gio-list">
            {rows.map((r) => (
              <div key={r.title + r.sub} className="ha-gio-row">
                <span className="ha-gio-av" aria-hidden>
                  <span className="ha-gio-av-fallback">{r.av}</span>
                </span>
                <span className="ha-gio-body">
                  <span className="ha-gio-title">{r.title}</span>
                  <span className="ha-gio-sub">{r.sub}</span>
                </span>
                {r.extra ? <span className="ha-gio-gia">{r.extra}</span> : null}
              </div>
            ))}
          </div>
        </MockShell>
      );
    }
    if (
      id === "tin_nhan_ban_be" ||
      id === "tin_nhan_to_chuc" ||
      id === "tin_nhan_mua_ban"
    ) {
      return (
        <MockShell id={id}>
          <MockChatRows rows={rows} />
        </MockShell>
      );
    }
    return (
      <MockShell id={id}>
        <MockPeopleRows rows={rows} />
      </MockShell>
    );
  }

  return (
    <MockShell id={id}>
      <p className="ha-card-empty">{tHomeModDesc(t, id)}</p>
    </MockShell>
  );
}
