import Link from "next/link";

import { CO_SO_DAO_TAO_HUB_PATH } from "@/lib/cins/hubPaths";

const MASCOTS = [
  { src: "/assets/mascot-artist.png", name: "Artist" },
  { src: "/assets/mascot-technical-artist.png", name: "Tech Artist" },
  { src: "/assets/mascot-manager.png", name: "Manager" },
  { src: "/assets/mascot-supporter.png", name: "Supporter" },
] as const;

function IconHome() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12L12 3l9 9" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 6l-10 7L2 6" />
      <rect x="2" y="4" width="20" height="16" rx="2" />
    </svg>
  );
}

function IconWrench() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2L9 9H2l5.5 4.5L5 21l7-5 7 5-2.5-7.5L22 9h-7z" />
    </svg>
  );
}

export default function MaintenancePage() {
  return (
    <div className="cins-maint-page">
      <nav className="cins-maint-top">
        <Link className="cins-maint-logo" href="/" aria-label="C.INS trang chủ">
          <img
            src="/assets/logo-cins-wide.svg"
            alt="C.INS"
            className="cins-maint-logo-img"
          />
        </Link>
        <div className="cins-maint-nav-links">
          <Link href="/">Trang chủ</Link>
          <Link href={CO_SO_DAO_TAO_HUB_PATH}>Trường đại học</Link>
          <Link href="/huong-nghiep">Hướng nghiệp</Link>
        </div>
        <Link className="cins-maint-nav-cta" href="/huong-nghiep">
          <IconStar />
          Quiz hướng nghiệp
        </Link>
      </nav>

      <main className="cins-maint-main">
        <div className="cins-maint-bg-shapes" aria-hidden>
          <div className="s1" />
          <div className="s2" />
          <div className="s3" />
          <div className="s4" />
          <div className="s5" />
          <div className="s6" />
          <div className="s7" />
        </div>

        <div className="cins-maint-inner">
          <div>
            <div className="cins-maint-eyebrow fade fade-1">
              Lỗi 404 · Maintenance mode
            </div>
            <div className="cins-maint-big-num fade fade-1" aria-hidden>
              4<span className="em-y">oh</span>4
            </div>
            <div className="cins-maint-tag-row fade fade-2">
              <IconWrench />
              Website đang nâng cấp lớn
            </div>
            <h1 className="cins-maint-headline fade fade-2">
              CINs đang xây <em>phiên bản mới</em> cho bạn —
              <br />
              quay lại sớm nha!
            </h1>
            <p className="cins-maint-sub fade fade-3">
              Trang web tạm thời ngắt một số tính năng để đội ngũ CINs cập nhật giao
              diện và dữ liệu ngành học. Cảm ơn bạn đã kiên nhẫn chờ đợi.
            </p>
            <div className="cins-maint-cta-row fade fade-3">
              <Link className="cins-maint-btn primary" href="/">
                <IconHome />
                Về trang chủ
              </Link>
              <a className="cins-maint-btn ghost" href="mailto:hello@cins.vn">
                <IconMail />
                Nhận email khi v2 ra mắt
              </a>
            </div>
          </div>

          <div className="cins-maint-right">
            <div className="cins-maint-mascot-stage fade fade-4">
              <div className="cins-maint-mascot-grid">
                {MASCOTS.map((m) => (
                  <div key={m.name} className="cins-maint-mascot-bubble">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.src} alt={`${m.name} mascot`} />
                    <span className="cins-maint-mascot-name">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="cins-maint-status-card fade fade-4">
              <div className="cins-maint-status-icon" aria-hidden />
              <div className="cins-maint-status-text">
                <div className="l">Đang nâng cấp · Tiến độ 68%</div>
                <div className="v">Dự kiến hoàn thành 28 / 05 / 2026</div>
                <div className="cins-maint-status-bar">
                  <div className="fill" />
                </div>
              </div>
              <div className="cins-maint-status-pct">68%</div>
            </div>
          </div>
        </div>
      </main>

      <footer className="cins-maint-footer">
        <span>© {new Date().getFullYear()} CINs Vietnam · Creative hub</span>
        <div className="cins-maint-footer-links">
          <a href="https://facebook.com" target="_blank" rel="noreferrer">
            Facebook
          </a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a href="https://tiktok.com" target="_blank" rel="noreferrer">
            TikTok
          </a>
          <a href="https://youtube.com" target="_blank" rel="noreferrer">
            YouTube
          </a>
        </div>
      </footer>
    </div>
  );
}
