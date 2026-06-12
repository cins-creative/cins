import Link from "next/link";

import { NGHE_NGHIEP_HUB_PATH } from "@/lib/cins/hubPaths";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link href="/" className="footer-logo">
            <img src="/assets/logo-cins-white.png" alt="CINs" />
          </Link>
          <p className="footer-tagline">
            Khám phá ngành sáng tạo thị giác tại Việt Nam — Phim, Game, Hoạt
            hình, Kiến trúc, Thời trang, Thiết kế.
          </p>
        </div>
        <div className="footer-col">
          <div className="footer-col-title">Khám phá</div>
          <ul>
            <li>
              <Link href={NGHE_NGHIEP_HUB_PATH}>Hướng nghiệp</Link>
            </li>
            <li>
              <Link href="#">Trường ĐH</Link>
            </li>
            <li>
              <Link href="#">Lĩnh vực</Link>
            </li>
            <li>
              <Link href="#">Bài viết</Link>
            </li>
          </ul>
        </div>
        <div className="footer-col">
          <div className="footer-col-title">Cộng đồng</div>
          <ul>
            <li>
              <Link href="#">Portfolio sinh viên</Link>
            </li>
            <li>
              <Link href="#">Câu chuyện thực tế</Link>
            </li>
            <li>
              <Link href="#">Sự kiện</Link>
            </li>
          </ul>
        </div>
        <div className="footer-col">
          <div className="footer-col-title">Liên hệ</div>
          <ul>
            <li>
              <Link href="#">Về chúng tôi</Link>
            </li>
            <li>
              <Link href="#">Hợp tác</Link>
            </li>
            <li>
              <Link href="#">Góp ý</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div>© 2026 CINs — Visual Creative Industries connection platform.</div>
        <div>made by{" "}
          <a
            href="https://sineart.vn"
            target="_blank"
            rel="noopener noreferrer"
          >
            SineArt.vn
          </a></div>
      </div>
    </footer>
  );
}
