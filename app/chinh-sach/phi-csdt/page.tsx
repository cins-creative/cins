import type { Metadata } from "next";
import Link from "next/link";

import { CinsShell } from "@/components/cins/CinsShell";
import { PhiThongBaoLog } from "@/components/chinh-sach/PhiThongBaoLog";
import { getChinhSachPhiPayload } from "@/lib/billing/phi-chinh-sach";

import "@/app/chinh-sach/phi-chinh-sach.css";

export const metadata: Metadata = {
  title: "CINs — Chính sách phí nền tảng (cơ sở đào tạo)",
  description:
    "Phí nền tảng CINs cho cơ sở đào tạo: tỷ lệ hiện tại, ngưỡng kích hoạt, hạn trả và lộ trình công bố.",
};

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

export default async function ChinhSachPhiCsdtPage() {
  const { dangApDung, thongBao } = await getChinhSachPhiPayload("csdt");
  const d = dangApDung;

  const nguyenTac = [
    {
      title: "CINs không cầm học phí",
      body: "Học phí học viên chuyển thẳng cho cơ sở. Phí nền tảng là khoản riêng cơ sở trả cho CINs, tách hẳn khỏi giao dịch tuyển sinh.",
    },
    {
      title: "Phí dùng công cụ nền tảng",
      body: "Là phí sử dụng hệ thống quản lý ngành, khoá học và tuyển sinh trên CINs — không phải khoản trích trên từng học viên.",
    },
    {
      title: "Luôn báo trước khi đổi",
      body: `Mọi thay đổi tỷ lệ hoặc kỳ phí đều được công bố trước tối thiểu ${d.camKetCongBoTruocNgay} ngày tại trang này, không áp dụng đột ngột.`,
    },
  ];

  const chiTiet = [
    { k: "Tỷ lệ", v: `${d.tyLePercent}%`, note: "Trên doanh thu đủ điều kiện ghi phí" },
    {
      k: "Ngưỡng kích hoạt",
      v: d.nguongVnd <= 0 ? "Không áp" : fmtVnd(d.nguongVnd),
      note: d.nguongVnd <= 0 ? "Chốt theo kỳ, không chờ ngưỡng" : "Bắt đầu tính khi vượt ngưỡng",
    },
    { k: "Hạn trả", v: `${d.soNgayHanTra} ngày`, note: "Kể từ khi thông báo hoá đơn" },
    { k: "Cách trả", v: "VietQR → STK CINs", note: "Có mã CK riêng trong mục Thanh toán" },
  ];

  return (
    <CinsShell data-screen-label="Chinh-sach-phi-csdt">
      <div className="cps-page">
        <header className="cps-masthead">
          <p className="cps-kicker">Chính sách phí — Cơ sở đào tạo</p>
          <div className="cps-masthead-grid">
            <div className="cps-masthead-lead">
              <h1 className="cps-title">
                Phí nền tảng cho cơ sở đào tạo, minh bạch và trả sau.
              </h1>
              <p className="cps-lede">
                CINs cung cấp công cụ quản lý ngành, khoá học và tuyển sinh. Học
                phí học viên chuyển thẳng cho cơ sở — chúng tôi không cầm học
                phí; cơ sở trả một khoản phí nền tảng riêng.
              </p>
              <p className="cps-lede-cta">
                <Link href="/tai-khoan/thanh-toan">Xem hoá đơn &amp; thanh toán phí →</Link>
              </p>
            </div>
            <figure className="cps-figure" aria-label="Tỷ lệ phí hiện hành">
              <span className="cps-figure-num">{d.tyLePercent}</span>
              <span className="cps-figure-pct">%</span>
              <figcaption className="cps-figure-cap">doanh thu, đang áp dụng</figcaption>
            </figure>
          </div>
        </header>

        <section className="cps-section" aria-labelledby="cps-nguyen-tac">
          <div className="cps-section-head">
            <h2 id="cps-nguyen-tac" className="cps-h2">Ba điều cần nắm</h2>
          </div>
          <dl className="cps-deflist">
            {nguyenTac.map((n, i) => (
              <div
                key={n.title}
                className={i === 0 ? "cps-def cps-def--wide" : "cps-def"}
              >
                <dt className="cps-def-term">
                  <span className="cps-def-idx">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {n.title}
                </dt>
                <dd className="cps-def-desc">{n.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="cps-section" aria-labelledby="cps-chi-tiet">
          <div className="cps-section-head">
            <h2 id="cps-chi-tiet" className="cps-h2">Điều khoản đang áp dụng</h2>
            <p className="cps-section-note">Số liệu lấy trực tiếp từ cấu hình hiện hành.</p>
          </div>
          <table className="cps-terms">
            <tbody>
              {chiTiet.map((row) => (
                <tr key={row.k}>
                  <th scope="row">{row.k}</th>
                  <td className="cps-terms-val">{row.v}</td>
                  <td className="cps-terms-note">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cps-fineprint">
            Khi nợ phí quá hạn, CINs có thể hạn chế tính năng nền tảng của cơ sở
            theo quy chế vận hành.
          </p>
        </section>

        <section className="cps-section" aria-labelledby="cps-lo-trinh">
          <div className="cps-section-head">
            <h2 id="cps-lo-trinh" className="cps-h2">Thông báo &amp; lộ trình</h2>
            <p className="cps-section-note">Thay đổi phí được công bố ở đây trước khi áp dụng.</p>
          </div>
          {thongBao.length === 0 ? (
            <p className="cps-empty">
              Chưa có thông báo mới — tỷ lệ nêu trên là bản đang áp dụng.
            </p>
          ) : (
            <PhiThongBaoLog items={thongBao} />
          )}
        </section>

        <footer className="cps-foot">
          <Link href="/chinh-sach/phi-san">Phí cửa hàng</Link>
          <span aria-hidden>/</span>
          <Link href="/termandservice">Điều khoản chung</Link>
        </footer>
      </div>
    </CinsShell>
  );
}
