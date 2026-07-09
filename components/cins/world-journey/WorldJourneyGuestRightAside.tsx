import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  CalendarDays,
  MapPin,
  Megaphone,
  UserRoundPlus,
} from "lucide-react";
import Link from "next/link";

const FOLLOW_SUGGESTIONS = [
  {
    id: "trang-ui",
    initials: "TU",
    avatarStyle: "linear-gradient(135deg, #ff758c, #fdad4c)",
    isOrg: false,
    verified: true,
    name: "Trang UI",
    role: "Product Designer @ Colory",
  },
  {
    id: "sun-wolf",
    initials: "CW",
    avatarStyle: "var(--cins-violet)",
    isOrg: true,
    verified: true,
    name: "Sun Wolf",
    role: "Studio · Animation",
  },
  {
    id: "duy-khang",
    initials: "DK",
    avatarStyle: "linear-gradient(135deg, #0f8f7e, #6efec0)",
    isOrg: false,
    verified: false,
    name: "Duy Khang",
    role: "Game Artist",
  },
] as const;

const UPCOMING_EVENTS = [
  {
    id: "storyboard",
    month: "Th6",
    day: "28",
    title: "Workshop Storyboard cơ bản",
    location: "Sine Art · Tân Sơn Nhì",
  },
  {
    id: "trien-lam",
    month: "Th7",
    day: "05",
    title: "Triển lãm đồ án cuối khoá",
    location: "Online",
  },
] as const;

/** Cột phải — event ad + gợi ý theo dõi + sự kiện (mock từ cins-trang-chu-B.html). */
export function WorldJourneyGuestRightAside() {
  return (
    <aside
      className="wj-guest-aside wj-guest-aside--right"
      aria-label="Gợi ý và sự kiện"
    >
      <div className="wj-ad">
        <span className="wj-ad-blob" aria-hidden />
        <div className="wj-ad-body">
          <span className="wj-ad-eyebrow">
            <Megaphone size={12} strokeWidth={2} aria-hidden />
            Sự kiện
          </span>
          <h3 className="wj-ad-title">THI THỬ NĂNG KHIẾU VẼ 2026</h3>
          <p className="wj-ad-desc">
            Thử sức với đề thi độc quyền từ Sine Art. Mỗi môn kèm video chữa bài.
          </p>
          <div className="wj-ad-when">
            <Calendar size={14} strokeWidth={2} aria-hidden />
            28/06 · Online
          </div>
          <button type="button" className="wj-ad-cta">
            Tìm hiểu
            <ArrowRight size={15} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <span className="wj-ad-spons">Được tài trợ</span>
      </div>

      <div className="wj-panel">
        <div className="wj-panel-head">
          <UserRoundPlus size={16} strokeWidth={2} aria-hidden />
          Gợi ý theo dõi
          <Link href="#" className="wj-panel-more" prefetch={false}>
            Xem thêm
          </Link>
        </div>
        {FOLLOW_SUGGESTIONS.map((item) => (
          <div key={item.id} className="wj-sg">
            <span
              className={`wj-sg-av${item.isOrg ? " wj-sg-av--org" : ""}`}
              style={{ background: item.avatarStyle }}
            >
              {item.initials}
            </span>
            <div className="wj-sg-meta">
              <div className="wj-sg-name">
                {item.name}
                {item.verified ? (
                  <BadgeCheck size={12} strokeWidth={2} aria-hidden />
                ) : null}
              </div>
              <div className="wj-sg-role">{item.role}</div>
            </div>
            <button type="button" className="wj-sg-follow">
              Theo dõi
            </button>
          </div>
        ))}
      </div>

      <div className="wj-panel">
        <div className="wj-panel-head">
          <CalendarDays size={16} strokeWidth={2} aria-hidden />
          Sự kiện sắp tới
        </div>
        {UPCOMING_EVENTS.map((ev) => (
          <div key={ev.id} className="wj-ev">
            <div className="wj-ev-date">
              <div className="wj-ev-month">{ev.month}</div>
              <div className="wj-ev-day">{ev.day}</div>
            </div>
            <div className="wj-ev-meta">
              <div className="wj-ev-name">{ev.title}</div>
              <div className="wj-ev-loc">
                <MapPin size={12} strokeWidth={2} aria-hidden />
                {ev.location}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
