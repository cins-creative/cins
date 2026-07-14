import Link from "next/link";

const EFFECTIVE_DATE = "14 tháng 7 năm 2026";
const CONTACT_EMAIL = "info.cins.vn@gmail.com";
const SITE = "https://cins.vn";

const TOC = [
  { id: "gioi-thieu", label: "Giới thiệu & chấp nhận điều khoản" },
  { id: "dich-vu", label: "Mô tả dịch vụ CINs" },
  { id: "tai-khoan", label: "Tài khoản & đăng nhập" },
  { id: "noi-dung", label: "Nội dung do bạn tạo" },
  { id: "verify", label: "Xác thực (verify) & danh tính nghề" },
  { id: "tuong-tac", label: "Tương tác xã hội, chat & quyền riêng tư hiển thị" },
  { id: "bang-xep-hang", label: "Phân bổ nội dung & xếp hạng Timeline" },
  { id: "cam", label: "Hành vi bị cấm" },
  { id: "to-chuc", label: "Tổ chức trên CINs" },
  { id: "so-huu", label: "Sở hữu trí tuệ của CINs" },
  { id: "ben-thu-ba", label: "Dịch vụ bên thứ ba" },
  { id: "mien-tru", label: "Giới hạn trách nhiệm" },
  { id: "cham-dut", label: "Tạm ngưng & chấm dứt" },
  { id: "thay-doi", label: "Thay đổi điều khoản" },
  { id: "luat", label: "Luật áp dụng & liên hệ" },
] as const;

export function TermAndServiceContent() {
  return (
    <div className="tas-root">
      <header className="tas-hero">
        <div className="tas-hero-bg" aria-hidden />
        <div className="tas-hero-inner">
          <p className="tas-brand">CINs</p>
          <p className="tas-kicker">Điều khoản · Legal</p>
          <h1 className="tas-title">Điều khoản dịch vụ</h1>
          <p className="tas-title-en">Terms of Service</p>
          <p className="tas-lede">
            Quy định quyền và nghĩa vụ khi bạn dùng mạng xã hội chuyên môn CINs
            — Journey, verify, kết nối nghề và tri thức cộng đồng.
          </p>
          <dl className="tas-facts">
            <div>
              <dt>Hiệu lực</dt>
              <dd>{EFFECTIVE_DATE}</dd>
            </div>
            <div>
              <dt>URL công khai</dt>
              <dd>
                <a href={`${SITE}/termandservice`}>{SITE}/termandservice</a>
              </dd>
            </div>
            <div>
              <dt>Liên hệ</dt>
              <dd>
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="tas-shell">
        <nav className="tas-toc" aria-label="Mục lục điều khoản">
          <p className="tas-toc-title">Mục lục</p>
          <ol>
            {TOC.map((item, i) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>
                  <span className="tas-toc-n" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="tas-toc-label">{item.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="tas-doc">
          <p className="tas-accept">
            Khi tạo tài khoản, đăng nhập (kể cả qua Google), hoặc tiếp tục sử
            dụng dịch vụ tại {SITE}, bạn xác nhận đã đọc và đồng ý với các điều
            khoản dưới đây.
          </p>

          <section className="tas-section" id="gioi-thieu">
            <h2>
              <span className="tas-n" aria-hidden>
                01
              </span>
              Giới thiệu &amp; chấp nhận điều khoản
            </h2>
            <p>
              CINs (C.INS) là mạng xã hội chuyên môn cho ngành sáng tạo tại Việt
              Nam, vận hành tại miền {SITE}. Tài liệu này quy định quyền và
              nghĩa vụ giữa bạn (“người dùng”) và đơn vị vận hành CINs khi bạn
              sử dụng website, ứng dụng và các tính năng liên quan (gọi chung
              là “Dịch vụ”).
            </p>
            <p>
              Nếu bạn không đồng ý với Điều khoản, vui lòng không tạo tài khoản
              hoặc ngừng sử dụng Dịch vụ. Việc tiếp tục sử dụng sau khi Điều
              khoản được cập nhật đồng nghĩa với việc chấp nhận phiên bản mới
              (xem mục 14).
            </p>
          </section>

          <section className="tas-section" id="dich-vu">
            <h2>
              <span className="tas-n" aria-hidden>
                02
              </span>
              Mô tả dịch vụ CINs
            </h2>
            <p>CINs cung cấp hạ tầng để bạn:</p>
            <ul>
              <li>
                Xây <strong>Journey / portfolio</strong> đa định dạng (ảnh,
                video, 3D, embed sáng tạo, chữ…) và cột mốc nghề nghiệp.
              </li>
              <li>
                Khám phá theo <strong>entity</strong> (nghề, phần mềm, trường,
                tag…) và theo dõi nội dung công khai qua Gallery / feed.
              </li>
              <li>
                Kết nối nghề: kết bạn, theo dõi, cộng đồng, chat có ngữ cảnh,
                và đóng góp tri thức canonical trên các trang entity.
              </li>
              <li>
                Gắn quan hệ với tổ chức (trường, cơ sở đào tạo, studio, cộng
                đồng) và gửi yêu cầu <strong>verify</strong> để bên có thẩm
                quyền xác nhận.
              </li>
            </ul>
            <p>
              CINs không phải sàn việc làm thuần túy, không phải Behance chỉ
              xem một chiều, không phải LMS đầy đủ, và không vận hành feed thuật
              toán kiểu MXH generic dựa trên đua số người theo dõi. Tính năng
              cụ thể có thể thay đổi theo lộ trình sản phẩm.
            </p>
          </section>

          <section className="tas-section" id="tai-khoan">
            <h2>
              <span className="tas-n" aria-hidden>
                03
              </span>
              Tài khoản &amp; đăng nhập
            </h2>
            <ul>
              <li>
                Bạn phải cung cấp thông tin chính xác khi đăng ký (email, mật
                khẩu, hoặc đăng nhập Google/OAuth khác mà CINs hỗ trợ) và giữ
                bảo mật thông tin đăng nhập.
              </li>
              <li>
                Một người nên dùng tài khoản phản ánh đúng danh tính nghề của
                mình. CINs có thể yêu cầu xác minh bổ sung hoặc hạn chế tài
                khoản giả mạo, spam, hoặc lạm dụng.
              </li>
              <li>
                Bạn chịu trách nhiệm với mọi hoạt động xảy ra dưới tài khoản của
                mình, trừ khi đã báo kịp thời về truy cập trái phép.
              </li>
              <li>
                Người dưới độ tuổi theo quy định pháp luật Việt Nam về giao kết
                hợp đồng điện tử chỉ được sử dụng Dịch vụ khi có sự đồng ý và
                giám sát của người đại diện hợp pháp, nếu áp dụng.
              </li>
            </ul>
          </section>

          <section className="tas-section" id="noi-dung">
            <h2>
              <span className="tas-n" aria-hidden>
                04
              </span>
              Nội dung do bạn tạo
            </h2>
            <p>
              Bạn giữ quyền sở hữu đối với nội dung bạn đăng (tác phẩm, mô tả,
              bình luận, bản đóng góp canonical…). Bằng việc đăng tải, bạn cấp
              cho CINs giấy phép không độc quyền, toàn cầu, miễn phí bản quyền
              để lưu trữ, hiển thị, phân phối, sao chép kỹ thuật và xử lý nội
              dung đó nhằm vận hành, cải thiện và quảng bá Dịch vụ — trong phạm
              vi bạn đã chọn chế độ hiển thị (công khai, theo nhóm, chỉ mình,
              cộng đồng…).
            </p>
            <ul>
              <li>
                Bạn cam kết có quyền đăng nội dung đó (kể cả khi gắn đồng tác
                giả / co-author — phải có sự đồng ý theo cơ chế của CINs).
              </li>
              <li>
                Nội dung không được xâm phạm bản quyền, nhãn hiệu, bí mật kinh
                doanh, quyền riêng tư hay pháp luật hiện hành.
              </li>
              <li>
                CINs có thể gỡ, ẩn, giới hạn phân phối hoặc từ chối nội dung vi
                phạm Điều khoản, báo cáo hợp lệ, hoặc yêu cầu pháp lý — kể cả
                khi chưa có phán quyết cuối cùng, nếu cần bảo vệ người dùng hoặc
                hệ thống.
              </li>
              <li>
                Bản đóng góp canonical: mỗi người soạn bản riêng; curator có
                thể promote thành bài chính. Bản không được chọn vẫn có thể công
                khai theo chính sách sản phẩm, trừ khi bạn tự ẩn/xóa trong phạm
                vi được phép.
              </li>
            </ul>
          </section>

          <section className="tas-section" id="verify">
            <h2>
              <span className="tas-n" aria-hidden>
                05
              </span>
              Xác thực (verify) &amp; danh tính nghề
            </h2>
            <p>
              Verify là cơ chế để bên thứ hai (thường là tổ chức) xác nhận quan
              hệ hoặc ngữ cảnh tác phẩm. Milestone / badge đã verify phản ánh
              xác nhận đó — không phải tự khai đơn phương được đối xử như sự
              thật đã duyệt.
            </p>
            <ul>
              <li>
                Bạn không được giả mạo quan hệ, bằng chứng, hoặc lợi dụng luồng
                verify để gây hiểu lầm.
              </li>
              <li>
                Tổ chức duyệt verify theo thẩm quyền của mình; im lặng có thể
                giữ trạng thái trung gian (tự khai), không đồng nghĩa đã bị từ
                chối trừ khi hiển thị rõ trên sản phẩm.
              </li>
              <li>
                CINs không bảo đảm mọi yêu cầu verify sẽ được chấp nhận, cũng
                không bảo đảm tổ chức luôn phản hồi trong thời hạn nhất định.
              </li>
            </ul>
          </section>

          <section className="tas-section" id="tuong-tac">
            <h2>
              <span className="tas-n" aria-hidden>
                06
              </span>
              Tương tác xã hội, chat &amp; quyền riêng tư hiển thị
            </h2>
            <ul>
              <li>
                Like/reaction, bình luận, lưu, theo dõi và kết bạn phải tôn
                trọng người khác và không quấy rối.
              </li>
              <li>
                <strong>Số người theo dõi không hiển thị công khai</strong> như
                bảng điểm vanity — theo dõi là kênh nhận nội dung.
              </li>
              <li>
                Chat trên CINs gắn ngữ cảnh (1-1, với tổ chức, nhóm bạn bè đã
                kết bạn…). Bạn không được dùng chat để spam, lừa đảo, phát tán
                nội dung bất hợp pháp hoặc xâm hại người khác.
              </li>
              <li>
                Bạn chịu trách nhiệm chọn đúng chế độ hiển thị cho từng bài; nội
                dung đánh dấu công khai có thể xuất hiện trên Timeline, Gallery,
                trang entity hoặc kết quả tìm kiếm nội bộ.
              </li>
            </ul>
          </section>

          <section className="tas-section" id="bang-xep-hang">
            <h2>
              <span className="tas-n" aria-hidden>
                07
              </span>
              Phân bổ nội dung &amp; xếp hạng Timeline
            </h2>
            <p>
              Thứ tự hiển thị trên World Timeline trang chủ dựa trên hệ điểm
              theo <strong>bài</strong> (chất lượng nội dung, verify, tương tác
              theo thang log, giảm theo thời gian…) — không phải bảng xếp hạng
              theo số follower hay thâm niên tài khoản. Gallery và một số bề
              mặt khác có thể dùng quy tắc sắp xếp riêng (ví dụ thời gian thực
              + ưu tiên biên tập).
            </p>
            <ul>
              <li>
                CINs có thể điều chỉnh công thức điểm và chính sách phân bổ để
                bảo vệ trải nghiệm cộng đồng sáng tạo; hướng dẫn công khai nằm
                trong mục Trợ giúp trên sản phẩm.
              </li>
              <li>
                Đội ngũ CINs có thể ưu tiên editorial một số nội dung phù hợp
                định hướng sản phẩm; việc này không phải gói quảng cáo trả phí
                mặc định trừ khi CINs công bố sản phẩm quảng cáo riêng.
              </li>
              <li>
                Không bảo đảm mọi bài sẽ đạt “top” hoặc tiếp cận một số lượng
                người xem nhất định.
              </li>
            </ul>
          </section>

          <section className="tas-section" id="cam">
            <h2>
              <span className="tas-n" aria-hidden>
                08
              </span>
              Hành vi bị cấm
            </h2>
            <p>Bạn không được:</p>
            <ul>
              <li>
                Đăng nội dung bất hợp pháp, khiêu dâm trẻ em, thù địch, quấy
                rối, đe dọa, hoặc vi phạm nghiêm trọng thuần phong mỹ tục theo
                pháp luật Việt Nam.
              </li>
              <li>
                Spam, bot, mua/bán tương tác giả, thao túng điểm feed, hoặc khai
                thác lỗ hổng hệ thống.
              </li>
              <li>
                Thu thập dữ liệu người dùng trái phép, giả mạo danh tính CINs /
                tổ chức / người khác.
              </li>
              <li>
                Đăng tải phần mềm độc hại, phishing, hoặc liên kết nhằm đánh
                cắp thông tin.
              </li>
              <li>
                Dùng Dịch vụ để cạnh tranh không lành mạnh bằng cách sao chép
                hàng loạt nội dung hoặc cấu trúc không được phép.
              </li>
            </ul>
          </section>

          <section className="tas-section" id="to-chuc">
            <h2>
              <span className="tas-n" aria-hidden>
                09
              </span>
              Tổ chức trên CINs
            </h2>
            <p>
              Người đại diện tạo hoặc quản trị trang tổ chức (trường, cơ sở đào
              tạo, studio, cộng đồng…) cam kết có thẩm quyền hành động nhân
              danh tổ chức đó trong phạm vi được cấp quyền trên CINs. Tổ chức
              chịu trách nhiệm về nội dung tự đăng, việc duyệt verify, tin tuyển
              dụng hoặc sự kiện gắn với trang của mình theo phân quyền đã cấu
              hình.
            </p>
          </section>

          <section className="tas-section" id="so-huu">
            <h2>
              <span className="tas-n" aria-hidden>
                10
              </span>
              Sở hữu trí tuệ của CINs
            </h2>
            <p>
              Nhãn hiệu, logo, giao diện, mã nguồn, tài liệu thiết kế và các
              thành phần không phải nội dung người dùng thuộc về CINs hoặc bên
              cấp phép tương ứng. Bạn không được sao chép, đảo ngược kỹ thuật,
              hoặc khai thác thương mại các thành phần đó ngoài phạm vi sử dụng
              Dịch vụ được cho phép.
            </p>
          </section>

          <section className="tas-section" id="ben-thu-ba">
            <h2>
              <span className="tas-n" aria-hidden>
                11
              </span>
              Dịch vụ bên thứ ba
            </h2>
            <p>
              Dịch vụ có thể tích hợp đăng nhập (ví dụ Google), lưu trữ
              ảnh/video, embed (Sketchfab, Figma, Rive…), email và hạ tầng đám
              mây. Việc bạn dùng dịch vụ bên thứ ba còn tuân theo điều khoản và
              chính sách riêng của họ. CINs không kiểm soát toàn bộ nội dung
              hoặc độ sẵn sàng của bên thứ ba.
            </p>
          </section>

          <section className="tas-section" id="mien-tru">
            <h2>
              <span className="tas-n" aria-hidden>
                12
              </span>
              Giới hạn trách nhiệm
            </h2>
            <p>
              Dịch vụ được cung cấp “nguyên trạng” trong khả năng vận hành hợp
              lý. Trong phạm vi pháp luật cho phép, CINs không chịu trách nhiệm
              về: mất mát gián tiếp, mất lợi nhuận, mất dữ liệu do sự cố ngoài
              tầm kiểm soát hợp lý; nội dung hoặc hành vi của người dùng / tổ
              chức khác; hoặc quyết định nghề nghiệp, tuyển dụng, học tập mà
              bạn đưa ra dựa trên thông tin trên CINs.
            </p>
            <p>
              Không nội dung nào trên CINs cấu thành tư vấn pháp lý, tài chính
              hoặc tuyển dụng được bảo chứng.
            </p>
          </section>

          <section className="tas-section" id="cham-dut">
            <h2>
              <span className="tas-n" aria-hidden>
                13
              </span>
              Tạm ngưng &amp; chấm dứt
            </h2>
            <ul>
              <li>
                Bạn có thể ngừng sử dụng và yêu cầu xóa / vô hiệu hóa tài khoản
                theo quy trình hỗ trợ của CINs (liên hệ email dưới đây), trừ khi
                pháp luật hoặc nghĩa vụ lưu giữ hợp lệ yêu cầu khác.
              </li>
              <li>
                CINs có thể tạm ngưng, hạn chế hoặc chấm dứt quyền truy cập nếu
                bạn vi phạm Điều khoản, gây rủi ro bảo mật, hoặc theo yêu cầu
                cơ quan có thẩm quyền.
              </li>
              <li>
                Một số nội dung đã verify hoặc đã được phân phối công khai có
                thể vẫn xuất hiện ở dạng giới hạn (ví dụ bản ghi lịch sử) theo
                thiết kế sản phẩm và pháp luật — chi tiết sẽ được thông báo
                trong quy trình hỗ trợ khi áp dụng.
              </li>
            </ul>
          </section>

          <section className="tas-section" id="thay-doi">
            <h2>
              <span className="tas-n" aria-hidden>
                14
              </span>
              Thay đổi điều khoản
            </h2>
            <p>
              CINs có thể cập nhật Điều khoản để phản ánh thay đổi pháp luật
              hoặc sản phẩm. Phiên bản mới sẽ được đăng tại URL này kèm ngày
              hiệu lực. Thay đổi trọng yếu có thể được thông báo qua email hoặc
              trong sản phẩm. Việc tiếp tục sử dụng sau ngày hiệu lực cấu thành
              chấp nhận bản cập nhật.
            </p>
          </section>

          <section className="tas-section" id="luat">
            <h2>
              <span className="tas-n" aria-hidden>
                15
              </span>
              Luật áp dụng &amp; liên hệ
            </h2>
            <p>
              Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Tranh chấp
              ưu tiên giải quyết thân thiện; nếu không được, thẩm quyền thuộc
              tòa án có thẩm quyền tại Việt Nam, trừ khi pháp luật bắt buộc
              khác.
            </p>
            <p>
              Liên hệ về Điều khoản / hỗ trợ tài khoản:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
            <p>
              Trang liên quan trên sản phẩm:{" "}
              <Link href="/thong-tin-du-an">Thông tin dự án</Link>.
            </p>
          </section>

          <footer className="tas-foot">
            <p className="tas-foot-url">
              URL chính thức để nộp xác minh (Google OAuth và đối tác):{" "}
              <a href={`${SITE}/termandservice`}>{SITE}/termandservice</a>
            </p>
            <p>
              Tài liệu này mô tả điều kiện sử dụng dịch vụ CINs theo tư duy sản
              phẩm hiện tại. Với giao dịch hoặc tuân thủ đặc thù, bạn nên tham
              vấn cố vấn pháp lý độc lập khi cần.
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
