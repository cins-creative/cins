"use client";

import {
  BadgeCheck,
  Globe,
  Image as ImageIcon,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Settings2,
} from "lucide-react";
import { useState } from "react";

import type { CoSoPagePayload } from "@/lib/to-chuc/co-so-page-queries";

type TabId = "bai-dang" | "khoa-hoc" | "san-pham" | "hinh-anh";

const TABS: { id: TabId; label: string }[] = [
  { id: "bai-dang", label: "Bài đăng" },
  { id: "khoa-hoc", label: "Khóa học" },
  { id: "san-pham", label: "Sản phẩm học viên" },
  { id: "hinh-anh", label: "Hình ảnh" },
];

function orgInitial(ten: string): string {
  const ch = ten.trim().charAt(0);
  return ch ? ch.toUpperCase() : "C";
}

function EmptyPanel({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="cso-empty">
      <p className="cso-empty-title">{title}</p>
      <p className="cso-empty-hint">{hint}</p>
    </div>
  );
}

export function CoSoDaoTaoView({ data }: { data: CoSoPagePayload }) {
  const [tab, setTab] = useState<TabId>("bai-dang");
  const subtitle =
    data.tenChinhThuc !== data.ten ? data.tenChinhThuc : data.moTa ?? data.loaiCoSoLabel;

  return (
    <div className="cso-page">
      <div className="cso-main">
        <aside className="cso-col-left">
          <div className="cso-cover">
            {data.coverUrl ? <img src={data.coverUrl} alt="" /> : null}
          </div>
          <div className="cso-info-pad">
            <div className="cso-avatar-wrap">
              <div className="cso-avatar">
                {data.avatarUrl ? (
                  <img src={data.avatarUrl} alt="" />
                ) : (
                  orgInitial(data.ten)
                )}
              </div>
            </div>
            <button type="button" className="cso-btn-msg" disabled>
              <MessageSquare size={17} aria-hidden />
              Nhắn tin
            </button>
            <h1 className="cso-org-name">{data.ten}</h1>
            {subtitle ? <p className="cso-org-sub">{subtitle}</p> : null}
            <div className="cso-badge-row">
              <span className="cso-badge">Cơ sở đào tạo</span>
              {data.daVerify ? (
                <span className="cso-badge cso-badge-verified">
                  <BadgeCheck size={13} aria-hidden />
                  Đã xác thực
                </span>
              ) : (
                <span className="cso-badge cso-badge-muted">Chưa xác thực</span>
              )}
              <span className="cso-badge">{data.loaiCoSoLabel}</span>
            </div>

            {(data.diaChi || data.tinhThanhLabel || data.dienThoai || data.emailLienHe || data.website) ? (
              <>
                <div className="cso-sect-label">Liên hệ</div>
                {data.diaChi || data.tinhThanhLabel ? (
                  <div className="cso-contact-row">
                    <MapPin size={17} aria-hidden />
                    <span>
                      {[data.diaChi, data.tinhThanhLabel].filter(Boolean).join(", ")}
                    </span>
                  </div>
                ) : null}
                {data.dienThoai ? (
                  <div className="cso-contact-row">
                    <Phone size={17} aria-hidden />
                    <span>{data.dienThoai}</span>
                  </div>
                ) : null}
                {data.emailLienHe ? (
                  <div className="cso-contact-row">
                    <Mail size={17} aria-hidden />
                    <span>{data.emailLienHe}</span>
                  </div>
                ) : null}
                {data.website ? (
                  <div className="cso-contact-row">
                    <Globe size={17} aria-hidden />
                    <a href={data.website} target="_blank" rel="noopener noreferrer">
                      {data.website.replace(/^https?:\/\//i, "")}
                    </a>
                  </div>
                ) : null}
                <div className="cso-divider" />
              </>
            ) : null}

            <div className="cso-sect-label">Số liệu đào tạo</div>
            <div className="cso-stat-grid">
              <div className="cso-stat-card cso-stat-full">
                <div className="cso-stat-label">Học viên</div>
                <div className="cso-stat-val">—</div>
              </div>
              <div className="cso-stat-card">
                <div className="cso-stat-label">Khóa đang mở</div>
                <div className="cso-stat-val cso-stat-big">0</div>
              </div>
              <div className="cso-stat-card">
                <div className="cso-stat-label">Năm thành lập</div>
                <div className="cso-stat-val cso-stat-big">
                  {data.namThanhLap ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="cso-col-center">
          <div className="cso-tabbar">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`cso-tab${tab === t.id ? " active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "bai-dang" ? (
            <div className="cso-panel active">
              {data.filters.length > 0 ? (
                <div className="cso-filter-bar">
                  <span className="cso-chip active">Tất cả</span>
                  {data.filters.map((f) => (
                    <span key={f.id} className="cso-chip">{f.ten}</span>
                  ))}
                  <span className="cso-filter-edit">
                    <Settings2 size={14} aria-hidden />
                    Quản lý nhãn
                  </span>
                </div>
              ) : null}
              <EmptyPanel
                title="Chưa có bài đăng"
                hint="Thêm bài viết, khóa học hoặc sự kiện để hiện trên timeline Journey của cơ sở."
              />
            </div>
          ) : null}

          {tab === "khoa-hoc" ? (
            <div className="cso-panel active">
              <EmptyPanel
                title="Chưa có khóa học"
                hint="Tạo khóa học đầu tiên để học viên có thể đăng ký."
              />
            </div>
          ) : null}

          {tab === "san-pham" ? (
            <div className="cso-panel active">
              <EmptyPanel
                title="Chưa có sản phẩm học viên"
                hint="Sản phẩm học viên sẽ hiện khi học viên đăng tác phẩm gắn với cơ sở."
              />
            </div>
          ) : null}

          {tab === "hinh-anh" ? (
            <div className="cso-panel active">
              <div className="cso-img-grid">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="cso-img-cell">
                    <ImageIcon size={26} aria-hidden />
                  </div>
                ))}
              </div>
              <EmptyPanel
                title="Chưa có hình ảnh"
                hint="Thêm ảnh không gian, lớp học hoặc sự kiện của cơ sở."
              />
            </div>
          ) : null}
        </section>

        <aside className="cso-col-right">
          <div className="cso-right-head">
            <span className="cso-right-title">Khai giảng sắp tới</span>
          </div>
          <EmptyPanel
            title="Chưa có lớp sắp khai giảng"
            hint="Lịch khai giảng sẽ hiện khi bạn tạo khóa học và lớp."
          />
        </aside>
      </div>
    </div>
  );
}
