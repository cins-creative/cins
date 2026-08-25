import type { Metadata } from "next";
import Link from "next/link";

import { CinsShell } from "@/components/cins/CinsShell";
import { PhiThongBaoLog } from "@/components/chinh-sach/PhiThongBaoLog";
import { getChinhSachPhiPayload } from "@/lib/billing/phi-chinh-sach";
import { getCinsLocale } from "@/lib/locale/server";
import { intlLocale, type CinsLocale } from "@/lib/locale/types";

import "@/app/policies/phi-chinh-sach.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCinsLocale();
  if (locale === "en") {
    return {
      title: "CINs — Marketplace fee policy (Shop)",
      description:
        "CINs platform fee for sellers: current rate, billing cycle, payment, and how changes are announced.",
    };
  }
  return {
    title: "CINs — Chính sách phí sàn (cửa hàng)",
    description:
      "Phí sử dụng nền tảng CINs cho người bán hàng: tỷ lệ hiện tại, kỳ tính, thanh toán và lộ trình công bố.",
  };
}

function fmtVnd(n: number, locale: CinsLocale): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(n) + "₫";
}

export default async function ChinhSachPhiSanPage() {
  const locale = await getCinsLocale();
  const en = locale === "en";
  const { dangApDung, thongBao } = await getChinhSachPhiPayload("shop");
  const d = dangApDung;

  const nguyenTac = en
    ? [
        {
          title: "CINs never holds your sales revenue",
          body: "Buyers pay you directly. The marketplace fee is a separate amount you pay back to CINs, fully detached from the sale itself.",
        },
        {
          title: "Not a per-order commission",
          body: "It is not a shipping fee, nor a cut withheld from each P2P order. It is a monthly fee for using the selling tools.",
        },
        {
          title: "Always announced before any change",
          body: `Any change to the rate or billing cycle is announced on this page at least ${d.camKetCongBoTruocNgay} days in advance — never applied without notice.`,
        },
      ]
    : [
        {
          title: "CINs không cầm tiền hàng",
          body: "Tiền hàng người mua chuyển thẳng cho bạn. Phí sàn là khoản riêng bạn trả ngược lại cho CINs, tách hẳn khỏi giao dịch mua bán.",
        },
        {
          title: "Không phải hoa hồng đơn hàng",
          body: "Đây không phải phí ship, cũng không phải khoản giữ lại từ mỗi đơn P2P. Nó là phí sử dụng công cụ bán hàng theo tháng.",
        },
        {
          title: "Luôn báo trước khi đổi",
          body: `Mọi thay đổi tỷ lệ hoặc kỳ phí đều được công bố trước tối thiểu ${d.camKetCongBoTruocNgay} ngày tại trang này, không áp dụng đột ngột.`,
        },
      ];

  const chiTiet = en
    ? [
        { k: "Rate", v: `${d.tyLePercent}% GMV`, note: "On revenue from fee-eligible orders" },
        { k: "Billing cycle", v: "Calendar month", note: "Closed on the 1st of the next month, paid in arrears" },
        {
          k: "Minimum to bill",
          v: fmtVnd(d.toiThieuXuatKyVnd, locale),
          note: "Below this, it rolls into the next month",
        },
        { k: "Payment due", v: `${d.soNgayHanTra} days`, note: "From the invoice notification" },
        {
          k: "Activation threshold",
          v: d.nguongVnd <= 0 ? "None" : fmtVnd(d.nguongVnd, locale),
          note: d.nguongVnd <= 0 ? "Billed monthly, no threshold to wait for" : "Charged once you pass the threshold",
        },
        { k: "How to pay", v: "VietQR → CINs account", note: "A dedicated transfer code is in the Payments section" },
      ]
    : [
        { k: "Tỷ lệ", v: `${d.tyLePercent}% GMV`, note: "Trên doanh thu đơn đủ điều kiện ghi phí" },
        { k: "Kỳ tính", v: "Theo tháng lịch", note: "Chốt ngày 1 tháng sau, trả sau" },
        {
          k: "Tối thiểu xuất kỳ",
          v: fmtVnd(d.toiThieuXuatKyVnd, locale),
          note: "Dưới mức này dồn sang tháng kế tiếp",
        },
        { k: "Hạn trả", v: `${d.soNgayHanTra} ngày`, note: "Kể từ khi thông báo hoá đơn" },
        {
          k: "Ngưỡng kích hoạt",
          v: d.nguongVnd <= 0 ? "Không áp" : fmtVnd(d.nguongVnd, locale),
          note: d.nguongVnd <= 0 ? "Chốt theo tháng, không chờ ngưỡng" : "Bắt đầu tính khi vượt ngưỡng",
        },
        { k: "Cách trả", v: "VietQR → STK CINs", note: "Có mã CK riêng trong mục Thanh toán" },
      ];

  const c = en
    ? {
        kicker: "Fee policy — Shop",
        title: "Marketplace fees for sellers — written to be read carefully before you sell.",
        lede: "CINs provides the tools for showcasing, inventory, cart, and orders. We don't hold your sales revenue — sellers pay a separate platform usage fee that is transparent and paid in arrears.",
        cta: "View invoices & pay fees →",
        figureAria: "Current fee rate",
        figureCap: "of revenue per month, currently in effect",
        principlesHead: "Three things to know",
        termsHead: "Current terms",
        termsNote: "Figures are pulled directly from the current configuration.",
        fineprint: "If fees are overdue, CINs may restrict order intake or shop activity under the operating rules.",
        logHead: "Announcements & roadmap",
        logNote: "Fee changes are announced here before they take effect.",
        empty: "No new announcements — the rate above is the one currently in effect.",
        footPlatform: "Training provider fees",
        footTerms: "General terms",
      }
    : {
        kicker: "Chính sách phí — Cửa hàng",
        title: "Phí sàn cho người bán, viết cho bạn đọc kỹ trước khi bán.",
        lede: "CINs cung cấp công cụ trưng bày, kho, giỏ hàng và đơn hàng. Chúng tôi không giữ tiền hàng — người bán trả một khoản phí sử dụng nền tảng riêng, minh bạch và trả sau.",
        cta: "Xem hoá đơn & thanh toán phí →",
        figureAria: "Tỷ lệ phí hiện hành",
        figureCap: "doanh thu mỗi tháng, đang áp dụng",
        principlesHead: "Ba điều cần nắm",
        termsHead: "Điều khoản đang áp dụng",
        termsNote: "Số liệu lấy trực tiếp từ cấu hình hiện hành.",
        fineprint: "Khi nợ phí quá hạn, CINs có thể hạn chế nhận đơn hoặc hoạt động cửa hàng theo quy chế vận hành.",
        logHead: "Thông báo & lộ trình",
        logNote: "Thay đổi phí được công bố ở đây trước khi áp dụng.",
        empty: "Chưa có thông báo mới — tỷ lệ nêu trên là bản đang áp dụng.",
        footPlatform: "Phí cơ sở đào tạo",
        footTerms: "Điều khoản chung",
      };

  const logLabels = en
    ? {
        dateNotice: "Announced on",
        dateEffective: "Effective on",
        expected: "expected",
        rateAria: (pct: number) => `Expected rate ${pct}%`,
      }
    : {
        dateNotice: "Ngày thông báo",
        dateEffective: "Ngày hiệu lực",
        expected: "dự kiến",
        rateAria: (pct: number) => `Tỷ lệ dự kiến ${pct}%`,
      };

  return (
    <CinsShell data-screen-label="Chinh-sach-phi-san">
      <div className="cps-page">
        <header className="cps-masthead">
          <p className="cps-kicker">{c.kicker}</p>
          <h1 className="cps-title">{c.title}</h1>
          <div className="cps-masthead-grid">
            <div className="cps-masthead-lead">
              <p className="cps-lede">{c.lede}</p>
              <p className="cps-lede-cta">
                <Link href="/account/billing">{c.cta}</Link>
              </p>
            </div>
            <figure className="cps-figure" aria-label={c.figureAria}>
              <span className="cps-figure-num">{d.tyLePercent}</span>
              <span className="cps-figure-pct">%</span>
              <figcaption className="cps-figure-cap">{c.figureCap}</figcaption>
            </figure>
          </div>
        </header>

        <section className="cps-section" aria-labelledby="cps-nguyen-tac">
          <div className="cps-section-head">
            <h2 id="cps-nguyen-tac" className="cps-h2">{c.principlesHead}</h2>
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
            <h2 id="cps-chi-tiet" className="cps-h2">{c.termsHead}</h2>
            <p className="cps-section-note">{c.termsNote}</p>
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
          <p className="cps-fineprint">{c.fineprint}</p>
        </section>

        <section className="cps-section" aria-labelledby="cps-lo-trinh">
          <div className="cps-section-head">
            <h2 id="cps-lo-trinh" className="cps-h2">{c.logHead}</h2>
            <p className="cps-section-note">{c.logNote}</p>
          </div>
          {thongBao.length === 0 ? (
            <p className="cps-empty">{c.empty}</p>
          ) : (
            <PhiThongBaoLog
              items={thongBao}
              locale={locale}
              labels={logLabels}
              emptyText={c.empty}
            />
          )}
        </section>

        <footer className="cps-foot">
          <Link href="/policies/platform-fee">{c.footPlatform}</Link>
          <span aria-hidden>/</span>
          <Link href="/terms">{c.footTerms}</Link>
        </footer>
      </div>
    </CinsShell>
  );
}
