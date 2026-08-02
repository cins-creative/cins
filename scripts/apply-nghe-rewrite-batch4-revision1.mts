/**
 * Revision for 5 batch-4 nghề articles after readability feedback.
 * Goal: fewer list-like blocks, stronger narrative flow, clearer role boundaries.
 *
 * Usage:
 *   npx tsx scripts/apply-nghe-rewrite-batch4-revision1.mts --apply
 */
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");

type Article = {
  id: string;
  slug: string;
  viet: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  html: string;
};

const articles: Article[] = [
  {
    id: "64455109-16f9-40ac-b337-51543267b546",
    slug: "nghe-product-designer",
    viet: "Nhà thiết kế sản phẩm số",
    summary:
      "Product Designer trong bối cảnh UI/UX là người thiết kế sản phẩm số như app, web, dashboard: hiểu vấn đề người dùng, đề xuất luồng, làm giao diện và cùng đội kiểm tra sản phẩm sau khi ra mắt.",
    metaTitle: "Product Designer là gì? Thiết kế sản phẩm số, không chỉ vẽ UI | CINS",
    metaDescription:
      "Product Designer làm gì trong app/web, khác UI Designer và thiết kế sản phẩm vật lý ra sao, học sinh/sinh viên nên bắt đầu thế nào.",
    html: `<section class="arc-intro">
  <p>Khi nghe “Product Designer”, nhiều bạn dễ nghĩ tới người thiết kế đồ vật: ghế, chai nước, bao bì, thiết bị. Nhưng trong nhóm UI/UX và công ty công nghệ, Product Designer thường được hiểu là <em>nhà thiết kế sản phẩm số</em>: app, website, dashboard, nền tảng cộng đồng, công cụ nội bộ hoặc một tính năng trong sản phẩm.</p>
  <p>Điểm quan trọng là nghề này không dừng ở việc “vẽ màn hình đẹp”. Product Designer phải hiểu người dùng đang kẹt ở đâu, sản phẩm đang cần đạt mục tiêu gì, đội kỹ thuật có thể xây gì, rồi biến những điều đó thành trải nghiệm rõ ràng, dùng được và có thể cải tiến sau khi ra mắt.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Product Designer là ai?</h2>
  <p>Product Designer là người thiết kế cách một sản phẩm số hoạt động và được cảm nhận. Họ đi từ câu hỏi rất đời thường: “Người dùng muốn làm việc gì ở đây?” đến những quyết định cụ thể như màn hình nào xuất hiện trước, nút nào cần nổi bật, thông báo lỗi nên nói gì, dữ liệu trống thì hiện ra sao.</p>
  <p>So với UI Designer, Product Designer thường tham gia sớm hơn vào việc xác định vấn đề và luồng trải nghiệm. So với UX Designer, vai trò này thường đi xa hơn tới giao diện chi tiết, prototype, bàn giao cho developer và theo dõi sản phẩm sau khi build. Ở mỗi công ty ranh giới có thể khác nhau, nhưng cốt lõi vẫn là: thiết kế để sản phẩm số giải quyết đúng việc cho đúng người.</p>
  <p>Với học sinh THPT hoặc sinh viên, có thể hiểu đơn giản: nếu bạn từng dùng một app và nghĩ “sao bước này khó hiểu vậy?” rồi thử vẽ lại cách làm dễ hơn, bạn đang chạm vào tư duy Product Designer.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Xuất hiện ở đâu?</span>
    <p><strong>UI/UX Design</strong> — app, web, dashboard, flow, prototype, design system.<br>
    <strong>Startup/Product team</strong> — thiết kế tính năng, giảm lỗi người dùng, cải thiện tỉ lệ hoàn thành tác vụ.<br>
    <strong>Thiết kế đồ họa</strong> — nền visual giúp giao diện rõ, đẹp và đúng nhận diện, nhưng không phải phần duy nhất của nghề.</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Công việc diễn ra như thế nào?</h2>
  <p>Một bài toán product thường không bắt đầu bằng Figma. Nó bắt đầu bằng một vấn đề: người dùng bỏ dở đăng ký, không tìm thấy khóa học, không hiểu phí, không biết bài đã lưu ở đâu, hoặc nhân viên nội bộ mất quá nhiều bước để xử lý một hồ sơ. Product Designer cần hỏi: đây có phải vấn đề thật không, ảnh hưởng ai, và nếu sửa thì kết quả nào tốt hơn?</p>
  <p>Sau đó mới đến phần tạo luồng. Designer vẽ đường đi từ lúc người dùng bắt đầu tới lúc hoàn thành việc cần làm. Ở bước này, những màn hình lỗi, trạng thái chờ, dữ liệu trống, quyền truy cập, thao tác hủy hay xác nhận đều quan trọng. Một sản phẩm chỉ “đẹp” ở màn hình lý tưởng nhưng vỡ ở tình huống thật thì chưa phải thiết kế tốt.</p>
  <p>Khi luồng đã rõ, Product Designer chuyển sang wireframe, UI và prototype. Màn hình phải có thứ tự thông tin dễ đọc, nút chính/phụ rõ, chữ ngắn gọn, trạng thái tương tác đủ, và responsive nếu chạy trên nhiều kích thước màn hình. Sau đó họ bàn giao cho developer, kiểm tra bản build, nhận phản hồi thật và tiếp tục chỉnh.</p>

  <div class="arc-job-item">
    <h3 class="arc-h3">Câu hỏi nghề này hay tự hỏi</h3>
    <ul class="arc-list">
      <li><strong>Người dùng đang muốn hoàn thành việc gì?</strong> Nếu không trả lời được, rất dễ vẽ giao diện đẹp nhưng sai mục tiêu.</li>
      <li><strong>Điểm khó hiểu nằm ở đâu?</strong> Có thể là chữ, luồng, thứ tự thông tin, quyền truy cập, tốc độ tải hoặc kỳ vọng sai.</li>
      <li><strong>Giải pháp này có build được không?</strong> Product Designer cần hiểu giới hạn kỹ thuật đủ để không thiết kế thứ đội không thể triển khai.</li>
      <li><strong>Sau khi ra mắt, mình đo bằng gì?</strong> Số người hoàn thành tác vụ, số lỗi, phản hồi người dùng hoặc dữ liệu sử dụng đều giúp thiết kế bớt cảm tính.</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Cần luyện gì?</h2>
  <p>Nền tảng đầu tiên là khả năng nhìn vấn đề từ góc người dùng. Bạn không cần nói chuyện như chuyên gia nghiên cứu ngay từ đầu, nhưng cần biết quan sát: người dùng đang bối rối ở bước nào, họ dùng từ gì, họ bỏ cuộc lúc nào, họ làm đường vòng nào để hoàn thành việc.</p>
  <p>Nền tảng thứ hai là thiết kế giao diện. Product Designer vẫn phải biết typography, spacing, màu, component, hierarchy, trạng thái UI và design system. Nếu tư duy sản phẩm tốt nhưng giao diện khó đọc, sản phẩm vẫn khó dùng. Ngược lại, UI đẹp nhưng không giải quyết đúng vấn đề cũng chưa đủ.</p>
  <p>Nền tảng thứ ba là giao tiếp với đội. Product Designer làm việc với PM, developer, data, marketing, support hoặc founder. Một quyết định thiết kế tốt cần được giải thích bằng lý do: người dùng nào, vấn đề gì, ràng buộc nào, vì sao phương án này đáng làm.</p>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Không nên hiểu sai Product Designer là gì?</summary>
      <div class="arc-card-body">
        <p>Ở bài này, Product Designer không phải industrial/product designer chuyên thiết kế đồ vật vật lý. Cũng không phải người chỉ trang trí màn hình. Đây là vai trò thiết kế sản phẩm số, đứng giữa UI/UX, product thinking và quá trình build thật.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Có cần biết code không?</summary>
      <div class="arc-card-body">
        <p>Không nhất thiết phải code giỏi, nhưng cần hiểu web/app hoạt động ở mức cơ bản: component, responsive, trạng thái loading, dữ liệu, constraint kỹ thuật. Hiểu dev giúp bàn giao thực tế hơn.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lộ trình bắt đầu</h2>
  <div class="arc-path">
    <div class="arc-path-step"><div class="arc-step-num">1</div><div class="arc-step-body"><strong>Chọn một vấn đề nhỏ quanh bạn</strong><p>Ví dụ: đăng ký CLB, đặt lịch học thử, tìm lớp, nộp bài, lưu tài liệu. Đừng bắt đầu bằng app quá lớn.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">2</div><div class="arc-step-body"><strong>Quan sát người dùng thật</strong><p>Hỏi 3-5 người họ làm việc đó thế nào, bước nào khó hiểu, họ đang dùng cách nào để né khó khăn.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">3</div><div class="arc-step-body"><strong>Vẽ luồng trước, UI sau</strong><p>Phác các bước chính, trạng thái lỗi/trống/chờ, rồi mới làm wireframe và giao diện chi tiết.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">4</div><div class="arc-step-body"><strong>Làm prototype và test</strong><p>Cho người khác bấm thử. Nếu họ hỏi nhiều hoặc đi sai đường, đó là dữ liệu để sửa.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">5</div><div class="arc-step-body"><strong>Viết case study rõ</strong><p>Portfolio nên kể: vấn đề là gì, bạn tìm hiểu ra sao, chọn hướng nào, test được gì, sửa gì sau feedback.</p></div></div>
  </div>
</section>`,
  },
  {
    id: "916b9a4d-7204-4e19-971d-bdfcce697675",
    slug: "nghe-design-director",
    viet: "Giám đốc thiết kế",
    summary:
      "Người giữ hướng và tiêu chuẩn thiết kế cấp cao, giúp nhiều đầu ra của sản phẩm hoặc thương hiệu đi cùng một hệ thống, một mục tiêu và một chất lượng.",
    metaTitle: "Design Director là gì? Vai trò giữ hướng thiết kế | CINS",
    metaDescription:
      "Design Director làm gì, khác Design Manager và Creative Director ra sao, học sinh/sinh viên nên hiểu vai trò này thế nào.",
    html: `<section class="arc-intro">
  <p>Một app có nhiều tính năng, một thương hiệu có nhiều chiến dịch, một studio có nhiều designer cùng làm. Nếu mỗi người kéo thiết kế theo một kiểu, sản phẩm sẽ rời rạc rất nhanh. Design Director là người giữ hướng thiết kế để mọi thứ vẫn thuộc về cùng một hệ thống.</p>
  <p>Vai trò này không chỉ là “người duyệt cho đẹp”. Design Director phải biết vì sao thiết kế nên đi hướng này, tiêu chuẩn chất lượng là gì, phần nào cần giữ chặt, phần nào có thể linh hoạt, và làm sao để đội thiết kế cùng hiểu điều đó.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Design Director là ai?</h2>
  <p>Design Director là vai trò lãnh đạo về chất lượng và định hướng thiết kế. Họ thường xuất hiện trong công ty sản phẩm, agency, studio, brand team hoặc nhóm thiết kế lớn. Công việc của họ là biến mục tiêu thành ngôn ngữ thiết kế rõ ràng: sản phẩm nên trông thế nào, cảm giác ra sao, dùng hệ thống nào, và tiêu chuẩn nào để duyệt.</p>
  <p>Design Director khác Design Manager ở trọng tâm. Design Manager thường lo con người, quy trình, phân bổ việc và nhịp vận hành. Design Director tập trung nhiều hơn vào hướng sáng tạo, tiêu chuẩn thị giác/trải nghiệm và quyết định thiết kế cấp cao. Họ cũng khác Creative Director ở chỗ phạm vi thường nghiêng về thiết kế, trong khi Creative Director có thể bao quát cả thông điệp, kịch bản, campaign và ý tưởng truyền thông lớn.</p>
  <p>Với học sinh THPT hoặc sinh viên, đây không phải vị trí bắt đầu ngay sau khi học một phần mềm. Hãy xem nó như một hướng phát triển dài hạn: từ việc làm thiết kế tốt, hiểu hệ thống, biết giải thích quyết định, rồi dần dẫn người khác cùng làm tốt.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Xuất hiện ở đâu?</span>
    <p><strong>UI/UX Design</strong> — giữ design system, trải nghiệm và chất lượng sản phẩm số.<br>
    <strong>Brand/Agency</strong> — giữ ngôn ngữ thiết kế cho chiến dịch, thương hiệu, bộ nhận diện.<br>
    <strong>Thời trang/Nội dung hình ảnh</strong> — định hướng visual cho lookbook, campaign, editorial hoặc bộ sưu tập.</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Công việc cốt lõi</h2>
  <p>Design Director bắt đầu bằng việc hiểu mục tiêu. Sản phẩm cần đáng tin hơn? Thương hiệu cần trẻ hơn? Giao diện cần dễ mở rộng hơn? Một hệ thống đang bị loạn component? Nếu mục tiêu chưa rõ, việc duyệt thiết kế sẽ chỉ còn là cuộc tranh luận gu cá nhân.</p>
  <p>Khi mục tiêu đã rõ, họ chuyển nó thành nguyên tắc thiết kế. Ví dụ: hệ màu nào được dùng cho trạng thái quan trọng, chữ nào dành cho tiêu đề, khoảng cách nào tạo nhịp đọc, hình ảnh nên chân thật hay cách điệu, chuyển động nên nhanh hay tiết chế. Những nguyên tắc này giúp đội thiết kế không phải đoán mỗi lần làm màn hình hoặc ấn phẩm mới.</p>
  <p>Một phần lớn thời gian là review. Design Director nhìn bản thiết kế và hỏi: nó có đúng mục tiêu không, có phá hệ thống không, có dùng được trong các trường hợp khác không, có giúp người dùng/khách hàng hiểu nhanh hơn không. Feedback tốt phải làm designer biết bước tiếp theo, không chỉ nghe một câu “chưa tới”.</p>

  <div class="arc-job-item">
    <h3 class="arc-h3">Điểm dễ nhầm</h3>
    <p>Design Director không phải người ngồi trên để sửa từng pixel cho cả đội. Nếu họ phải sửa mọi chi tiết nhỏ, hệ thống hoặc năng lực đội đang có vấn đề. Vai trò đúng hơn là đặt tiêu chuẩn, giữ hướng, giúp đội ra quyết định tốt hơn và chỉ can thiệp sâu ở các điểm ảnh hưởng lớn.</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Năng lực cần có</h2>
  <p>Design Director cần gu, nhưng gu phải có lý do. Họ cần phân tích được vì sao một bố cục rõ hơn, vì sao một màu làm thương hiệu mất cảm giác tin cậy, vì sao một component đẹp ở một màn nhưng khó mở rộng cho toàn hệ thống. Năng lực nhìn hệ thống quan trọng hơn việc tự tay làm một màn hình thật ấn tượng.</p>
  <p>Họ cũng cần giao tiếp tốt. Một hướng thiết kế chỉ có giá trị khi đội hiểu và dùng được. Nói chuyện với designer khác nói chuyện với developer, marketing, founder hoặc khách hàng. Design Director phải dịch được quyết định thiết kế sang ngôn ngữ mục tiêu: dễ dùng hơn, nhất quán hơn, tiết kiệm công sản xuất hơn, nhận diện rõ hơn.</p>

  <div class="arc-accordion">
    <details class="arc-card" open><summary>Muốn đi hướng này nên học gì trước?</summary><div class="arc-card-body"><p>Hãy bắt đầu bằng một chuyên môn thiết kế mạnh: UI, brand, graphic, product, fashion hoặc visual. Sau đó học cách làm hệ thống, viết guideline, review thiết kế và trình bày quyết định bằng lý do.</p></div></details>
    <details class="arc-card"><summary>Vị trí này có cần quản lý người không?</summary><div class="arc-card-body"><p>Thường có, nhưng mức độ tùy công ty. Có nơi Design Director quản lý trực tiếp đội; có nơi họ giữ hướng chuyên môn còn Design Manager quản lý vận hành.</p></div></details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lộ trình bắt đầu</h2>
  <div class="arc-path">
    <div class="arc-path-step"><div class="arc-step-num">1</div><div class="arc-step-body"><strong>Làm chắc nền thiết kế</strong><p>Typography, bố cục, màu, hierarchy, hệ thống component hoặc nhận diện thương hiệu.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">2</div><div class="arc-step-body"><strong>Luyện làm theo hệ thống</strong><p>Không chỉ làm một màn đẹp; hãy làm bộ màn, bộ ấn phẩm hoặc guideline nhất quán.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">3</div><div class="arc-step-body"><strong>Tập review bằng tiêu chí</strong><p>Viết rõ vì sao phương án A tốt hơn B: rõ hơn, đúng brand hơn, dễ mở rộng hơn, ít lỗi hơn.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">4</div><div class="arc-step-body"><strong>Dẫn nhóm nhỏ</strong><p>Dự án CLB hoặc freelance team giúp bạn học cách giữ hướng khi nhiều người cùng làm.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">5</div><div class="arc-step-body"><strong>Xây case study có hệ thống</strong><p>Show mục tiêu, nguyên tắc, biến thể, guideline, trước/sau và cách bạn đưa ra quyết định.</p></div></div>
  </div>
</section>`,
  },
  {
    id: "96aebeac-4853-4b02-ab00-61c81e31eb62",
    slug: "nghe-design-manager",
    viet: "Quản lý đội thiết kế",
    summary:
      "Người giúp đội thiết kế làm việc rõ ưu tiên, rõ trách nhiệm, rõ nhịp review và phát triển năng lực, để designer không bị kẹt giữa quá nhiều việc và quá nhiều feedback.",
    metaTitle: "Design Manager là gì? Quản lý đội thiết kế như thế nào | CINS",
    metaDescription:
      "Design Manager làm gì, khác Design Director ra sao, cần kỹ năng tổ chức, feedback, mentor và phối hợp đội như thế nào.",
    html: `<section class="arc-intro">
  <p>Một đội thiết kế có nhiều người giỏi vẫn có thể rối: việc nào cũng gấp, feedback đến từ quá nhiều phía, designer không rõ ai duyệt, người mới không biết hỏi ai, còn product hoặc marketing thì thấy thiết kế “sao lâu vậy”. Design Manager xuất hiện để làm đội bớt rối và làm việc bền hơn.</p>
  <p>Nếu Design Director giữ hướng thiết kế, Design Manager giữ cách đội đi tới hướng đó. Họ quan tâm tới người, ưu tiên, quy trình, nhịp review, phân bổ việc và sự phát triển của designer.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Design Manager là ai?</h2>
  <p>Design Manager là người quản lý đội thiết kế về vận hành và con người. Họ không nhất thiết là người làm visual mạnh nhất, nhưng phải đủ hiểu thiết kế để biết đội đang gặp vấn đề gì: thiếu brief, thiếu dữ liệu, deadline phi lý, review không rõ tiêu chí, hoặc designer đang cần được mentor.</p>
  <p>Trong công ty sản phẩm, họ thường làm với Product Designer, UI Designer, UX Researcher và developer. Trong agency hoặc studio, họ có thể quản lý designer qua nhiều dự án cùng lúc. Ở môi trường kiến trúc/nội thất hoặc creative studio, họ có thể điều phối giữa concept, 3D, hồ sơ, khách hàng và timeline.</p>
  <p>Với học sinh THPT hoặc sinh viên, có thể hình dung nghề này qua trải nghiệm làm trưởng nhóm bài tập hoặc CLB: bạn không tự làm hết, mà giúp mọi người hiểu việc, đúng hạn, bớt hiểu nhầm và cùng nâng chất lượng.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Xuất hiện ở đâu?</span>
    <p><strong>UI/UX Design</strong> — quản lý product design team, review, handoff, phối hợp PM/dev.<br>
    <strong>Agency/studio</strong> — chia việc cho nhiều dự án, giữ timeline và chất lượng.<br>
    <strong>Kiến trúc & Nội thất</strong> — điều phối concept, 3D, hồ sơ, feedback khách hàng.</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Công việc hằng ngày</h2>
  <p>Việc đầu tiên của Design Manager là làm rõ ưu tiên. Khi đội có 20 việc nhưng chỉ đủ sức làm 8 việc tốt, ai đó phải giúp cả nhóm biết việc nào ảnh hưởng lớn nhất, việc nào đang chặn người khác, việc nào có thể lùi. Nếu không có ưu tiên, designer dễ rơi vào trạng thái vừa làm vừa lo.</p>
  <p>Việc thứ hai là giữ nhịp review. Feedback thiết kế rất dễ biến thành vòng lặp: người này góp màu, người kia góp chữ, người khác đổi mục tiêu. Design Manager cần xác định ai là người duyệt, feedback nào thuộc mục tiêu, feedback nào là gu cá nhân, và quyết định cuối cùng được ghi lại ở đâu.</p>
  <p>Việc thứ ba là phát triển con người. Một designer junior cần hướng dẫn khác một designer senior. Có người mạnh về visual nhưng yếu trình bày, có người tư duy sản phẩm tốt nhưng UI còn non, có người đang quá tải. Design Manager quan sát những điều đó và tạo điều kiện để từng người tiến bộ.</p>

  <div class="arc-job-item">
    <h3 class="arc-h3">Một Design Manager tốt thường làm đội thấy gì?</h3>
    <ul class="arc-list">
      <li>Mọi người biết việc nào quan trọng nhất trong tuần.</li>
      <li>Feedback có nơi ghi lại, không bị mất trong chat.</li>
      <li>Designer biết tiêu chuẩn của mình và biết cần luyện gì tiếp.</li>
      <li>Các đội khác hiểu thiết kế cần input gì, khi nào, và vì sao.</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Năng lực cần luyện</h2>
  <p>Design Manager cần tổ chức tốt, nhưng không chỉ là biết dùng bảng việc. Họ phải biết tách một dự án mơ hồ thành các đầu việc có người phụ trách, hạn, trạng thái và tiêu chí hoàn thành. Họ cũng phải nhìn ra dependency: việc nào đang chờ nội dung, chờ dev, chờ khách hàng, chờ quyết định của founder.</p>
  <p>Kỹ năng feedback rất quan trọng. Feedback tốt không làm người nhận thấy bị chê chung chung; nó chỉ ra vấn đề, lý do và hướng sửa. Ví dụ, thay vì nói “màn này chưa đẹp”, Design Manager có thể nói “người dùng chưa thấy bước tiếp theo vì CTA chìm, thử tăng hierarchy và rút bớt thông tin phụ”.</p>
  <p>Ngoài ra, đây là nghề cần sự bình tĩnh. Khi deadline gấp, designer mệt, khách đổi ý hoặc scope tăng, Design Manager phải giúp đội nhìn rõ lựa chọn thay vì chỉ truyền áp lực xuống.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lộ trình bắt đầu</h2>
  <div class="arc-path">
    <div class="arc-path-step"><div class="arc-step-num">1</div><div class="arc-step-body"><strong>Học một nền thiết kế đủ chắc</strong><p>Không cần giỏi mọi mảng, nhưng cần hiểu designer đang làm gì và chất lượng cơ bản ra sao.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">2</div><div class="arc-step-body"><strong>Tập quản lý dự án nhỏ</strong><p>CLB, bài nhóm, freelance team: chia việc, ghi quyết định, theo dõi deadline, tổng kết sau dự án.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">3</div><div class="arc-step-body"><strong>Luyện feedback cụ thể</strong><p>Mỗi góp ý nên có vấn đề, bằng chứng và hướng sửa. Tránh feedback theo cảm giác mơ hồ.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">4</div><div class="arc-step-body"><strong>Học mentor</strong><p>Giúp một bạn junior hơn cải thiện portfolio hoặc quy trình làm bài là bài tập tốt.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">5</div><div class="arc-step-body"><strong>Đi từ designer/lead lên manager</strong><p>Đa số Design Manager cần thời gian làm thực tế trước khi quản lý đội chính thức.</p></div></div>
  </div>
</section>`,
  },
  {
    id: "ff95bbe4-85bf-46dc-b22e-054b47b66032",
    slug: "nghe-director",
    viet: "Đạo diễn",
    summary:
      "Người giữ cách kể chuyện tổng thể của phim, hoạt hình, MV hoặc video: diễn xuất, góc nhìn, nhịp cảnh, âm thanh và cảm xúc cuối cùng đều phải cùng phục vụ câu chuyện.",
    metaTitle: "Đạo diễn là gì? Vai trò kể chuyện bằng hình ảnh | CINS",
    metaDescription:
      "Đạo diễn làm gì trong phim và hoạt hình, cần học kể chuyện, diễn xuất, hình ảnh, dựng và làm việc với ekip ra sao.",
    html: `<section class="arc-intro">
  <p>Cùng một kịch bản, có đạo diễn kể thành một bộ phim hài ấm áp, có người kể thành một câu chuyện lạnh và căng. Khác biệt không chỉ nằm ở máy quay hay diễn viên, mà ở cách nhìn: cảnh nào được giữ lại, nhân vật im lặng bao lâu, camera đứng gần hay xa, âm thanh có nên vang lên hay để trống.</p>
  <p>Đạo diễn là người giữ cách kể chuyện đó. Họ không làm hết mọi việc, nhưng mọi bộ phận — diễn viên, camera, art, âm thanh, dựng, VFX, sản xuất — cần hiểu mình đang phục vụ cảm xúc và câu chuyện nào.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Đạo diễn là ai?</h2>
  <p>Director là người định hướng sáng tạo tổng thể cho phim, hoạt hình, MV, quảng cáo, video hoặc một sản phẩm kể chuyện bằng hình ảnh. Họ đọc kịch bản, hiểu nhân vật, xác định giọng kể, rồi dẫn ekip biến kịch bản thành trải nghiệm người xem có thể cảm được.</p>
  <p>Trong phim live-action, đạo diễn làm việc nhiều với diễn viên, quay phim, bối cảnh, phục trang, ánh sáng và hiện trường. Trong hoạt hình, họ làm việc nhiều với storyboard, layout, voice, animation, dựng và âm thanh. Dù môi trường khác nhau, câu hỏi trung tâm vẫn giống nhau: cảnh này cần người xem hiểu gì, cảm gì, và theo dõi ai?</p>
  <p>Với học sinh THPT hoặc sinh viên, đạo diễn không phải là người “ra lệnh cho mọi người”. Ở dự án nhỏ, đạo diễn thường là người hiểu câu chuyện rõ nhất, biết chuẩn bị, biết giao tiếp, biết chọn phương án khi thời gian và nguồn lực có hạn.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Xuất hiện ở đâu?</span>
    <p><strong>Phim & Điện ảnh</strong> — phim ngắn, phim dài, quảng cáo, MV, documentary, web series.<br>
    <strong>Hoạt hình</strong> — chỉ đạo story, storyboard, diễn xuất nhân vật, nhịp sequence.<br>
    <strong>Nội dung số</strong> — video thương hiệu, phim giới thiệu, series ngắn, social video có câu chuyện.</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Công việc thật sự là giữ câu chuyện</h2>
  <p>Trước khi quay hoặc animate, đạo diễn phải hiểu kịch bản. Không chỉ hiểu “chuyện gì xảy ra”, mà hiểu nhân vật muốn gì, sợ gì, đang giấu gì, và cảnh này làm câu chuyện đổi như thế nào. Nếu cảnh không làm điều gì thay đổi, rất có thể nó cần viết lại, rút ngắn hoặc kể bằng cách khác.</p>
  <p>Khi vào sản xuất, đạo diễn đưa những hiểu biết đó thành quyết định cụ thể: camera đứng gần để người xem thấy sự ngập ngừng, hay đứng xa để nhân vật nhỏ bé trong không gian? Diễn viên nên bùng nổ hay kìm lại? Cảnh có cần nhiều thoại không, hay một hành động nhỏ đủ nói thay?</p>
  <p>Ở hậu kỳ, đạo diễn tiếp tục giữ câu chuyện cùng editor, sound designer, composer và colorist. Một cảnh quay tốt có thể bị mất lực nếu cắt sai nhịp; một đoạn nhạc vào quá sớm có thể làm cảm xúc bị ép. Vì vậy đạo diễn phải nghe, nhìn và quyết định đến tận bản cuối.</p>

  <div class="arc-job-item">
    <h3 class="arc-h3">Đạo diễn giỏi thường không hỏi “cảnh này đẹp chưa?” trước tiên</h3>
    <p>Họ hỏi: cảnh này có cần không, đang kể từ góc nhìn của ai, cảm xúc có đúng mức không, người xem có hiểu quá sớm hoặc quá muộn không, và bộ phận nào đang làm lệch giọng kể?</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Cần luyện gì?</h2>
  <p>Nền đầu tiên là kể chuyện. Hãy tập xem phim bằng câu hỏi: nhân vật muốn gì trong cảnh này, lực cản là gì, cuối cảnh điều gì thay đổi? Khi làm phim ngắn, đừng cố nhồi nhiều cú máy phức tạp nếu câu chuyện chưa rõ.</p>
  <p>Nền thứ hai là diễn xuất và quan sát con người. Đạo diễn cần giúp diễn viên hoặc animator tìm đúng mức cảm xúc. Nói “buồn hơn” thường chưa đủ; cần nói nhân vật đang cố giấu nỗi buồn, đang sợ bị phát hiện, hay đang buồn nhưng không muốn người kia lo.</p>
  <p>Nền thứ ba là giao tiếp với ekip. Đạo diễn không cần giỏi hơn từng trưởng bộ phận ở chuyên môn của họ, nhưng cần nói được điều mình muốn bằng ngôn ngữ họ hiểu: với quay phim là góc nhìn và ánh sáng, với art là không gian và đạo cụ, với editor là nhịp, với sound là cảm giác nghe.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lộ trình bắt đầu</h2>
  <div class="arc-path">
    <div class="arc-path-step"><div class="arc-step-num">1</div><div class="arc-step-body"><strong>Xem phim có ghi chú</strong><p>Chọn một cảnh và ghi: nhân vật muốn gì, camera đứng đâu, cắt lúc nào, âm thanh làm gì.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">2</div><div class="arc-step-body"><strong>Làm phim 1-3 phút</strong><p>Ít bối cảnh, ít nhân vật, một xung đột rõ. Phim nhỏ nhưng hoàn thành sẽ dạy nhiều hơn ý tưởng lớn bỏ dở.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">3</div><div class="arc-step-body"><strong>Tập storyboard và blocking</strong><p>Vẽ sơ cảnh trước khi quay để biết nhân vật đứng đâu, camera nhìn gì, cảnh cần bao nhiêu shot.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">4</div><div class="arc-step-body"><strong>Thử nhiều vai trong ekip</strong><p>Làm editor, script, assistant, art hoặc camera giúp bạn hiểu việc đạo diễn yêu cầu sẽ ảnh hưởng người khác ra sao.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">5</div><div class="arc-step-body"><strong>Xây reel bằng phim đã hoàn thành</strong><p>Đừng chỉ nói ý tưởng. Hãy có sản phẩm, bản dựng và ghi rõ bạn đạo diễn phần nào.</p></div></div>
  </div>
</section>`,
  },
  {
    id: "0bd99e00-73c8-4068-ae69-c5cabb9c005a",
    slug: "nghe-editor",
    viet: "Dựng phim",
    summary:
      "Người chọn và sắp xếp hình ảnh, âm thanh, khoảng lặng để câu chuyện có nhịp, dễ hiểu và có cảm xúc; không chỉ cắt bỏ phần thừa.",
    metaTitle: "Editor là gì? Dựng phim là kể chuyện bằng nhịp | CINS",
    metaDescription:
      "Editor làm gì trong phim, hoạt hình và video; cần học nhịp dựng, câu chuyện, âm thanh và phần mềm ra sao.",
    html: `<section class="arc-intro">
  <p>Nhiều người nghĩ editor là người “cắt video”. Đúng, nhưng chưa đủ. Một editor có thể làm cảnh hài buồn đi, làm cảnh buồn nhẹ hơn, làm một cuộc đối thoại căng lên chỉ bằng việc giữ ánh nhìn thêm nửa giây hoặc cắt đi một câu thoại thừa.</p>
  <p>Dựng phim là kể chuyện bằng nhịp. Editor chọn người xem nhìn thấy gì, lúc nào, trong bao lâu, nghe âm thanh gì, và khoảng lặng nào cần được giữ lại.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Editor là ai?</h2>
  <p>Editor là người dựng phim/video: xem footage hoặc shot, chọn phần tốt nhất, sắp xếp thành mạch kể chuyện, cắt nhịp, xử lý âm thanh tạm, làm nhiều phiên bản dựng và phối hợp với đạo diễn/producer để ra bản cuối.</p>
  <p>Trong phim, editor giúp câu chuyện rõ và cảm xúc đúng. Trong hoạt hình, editor có thể làm từ animatic, layout đến bản dựng episode. Trong video social hoặc thương hiệu, editor giúp thông tin đi nhanh, có điểm nhấn và phù hợp nền tảng. Dù sản phẩm khác nhau, kỹ năng lõi vẫn là đọc nhịp và chọn cái cần giữ.</p>
  <p>Với học sinh THPT hoặc sinh viên, editor là một nghề rất đáng thử sớm vì bạn có thể bắt đầu từ video CLB, vlog, phim ngắn, phỏng vấn, bài thuyết trình hoặc dự án cá nhân. Quan trọng không phải phần mềm đắt tiền, mà là bạn có biết kể chuyện bằng lựa chọn cắt hay không.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Xuất hiện ở đâu?</span>
    <p><strong>Phim & Điện ảnh</strong> — phim ngắn, phim dài, trailer, MV, documentary, quảng cáo.<br>
    <strong>Hoạt hình</strong> — animatic, layout, episode edit, nhịp sequence.<br>
    <strong>Nội dung số</strong> — YouTube, TikTok, khóa học, video thương hiệu, social campaign.</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Dựng là chọn và sắp xếp</h2>
  <p>Editor bắt đầu bằng việc xem vật liệu. Có thể một cảnh quay đẹp về ánh sáng nhưng diễn xuất không thật; có thể một câu nói không hoàn hảo nhưng ánh mắt sau đó lại rất giá trị. Editor phải chọn theo câu chuyện, không chỉ theo độ đẹp của shot.</p>
  <p>Sau đó là nhịp. Một đoạn phỏng vấn cần rõ ý, một cảnh rượt đuổi cần lực, một cảnh chia tay cần khoảng lặng. Nhịp không chỉ đến từ tốc độ cắt; nó còn đến từ âm thanh, hơi thở, chuyển động trong khung hình và thứ tự thông tin. Có lúc cắt nhanh làm cảnh mạnh hơn, có lúc giữ lâu mới làm người xem tin vào cảm xúc.</p>
  <p>Khi bản dựng thô đã có, editor cùng đạo diễn hoặc producer xem lại: đoạn nào lặp, đoạn nào khó hiểu, đoạn nào giải thích quá nhiều, cảm xúc chuyển có gấp không. Dựng tốt thường là quá trình bớt đi, đổi chỗ, thử nhịp, rồi bớt tiếp cho đến khi câu chuyện thở được.</p>

  <div class="arc-job-item">
    <h3 class="arc-h3">Một số quyết định nhỏ nhưng quan trọng</h3>
    <ul class="arc-list">
      <li>Cắt trước hay sau khi nhân vật nói xong?</li>
      <li>Giữ ánh mắt phản ứng của người nghe hay quay lại người nói?</li>
      <li>Nhạc vào từ đầu hay chờ tới khi cảm xúc thật sự đổi?</li>
      <li>Một cảnh đẹp có cần bỏ nếu nó làm câu chuyện chậm?</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Cần luyện gì?</h2>
  <p>Trước hết là cảm nhịp. Bạn có thể luyện bằng cách xem một cảnh phim và đếm độ dài từng shot, sau đó tự hỏi vì sao cảnh này giữ lâu, vì sao cảnh kia cắt nhanh. Hãy thử dựng cùng một footage thành hai bản: một bản hài, một bản căng. Bạn sẽ thấy dựng thay đổi cảm xúc mạnh thế nào.</p>
  <p>Tiếp theo là tai âm thanh. Editor không cần thay sound designer, nhưng phải nghe được thoại có rõ không, âm nền có phá không, nhạc có ép cảm xúc không, cut có bị “khựng” vì âm thanh không. Rất nhiều cú cắt mượt là nhờ âm thanh dẫn trước hoặc giữ lại sau hình.</p>
  <p>Cuối cùng là tổ chức file. Dự án thật có nhiều footage, version, nhạc, phụ đề, graphics, export. Timeline rối sẽ làm bạn mất thời gian và gây lỗi cho người làm màu, âm thanh hoặc VFX sau đó.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lộ trình bắt đầu</h2>
  <div class="arc-path">
    <div class="arc-path-step"><div class="arc-step-num">1</div><div class="arc-step-body"><strong>Học một phần mềm dựng</strong><p>DaVinci Resolve, Premiere, Final Cut hoặc phần mềm bạn có. Học cắt, âm thanh, text, export trước.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">2</div><div class="arc-step-body"><strong>Dựng video ngắn thường xuyên</strong><p>Phỏng vấn, vlog, phim 1 phút, recap sự kiện, video CLB. Mỗi bài tập nên có mục tiêu nhịp rõ.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">3</div><div class="arc-step-body"><strong>Luyện nhiều phiên bản từ cùng footage</strong><p>Cùng một dữ liệu, thử dựng bản nhanh, bản chậm, bản cảm xúc, bản thông tin.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">4</div><div class="arc-step-body"><strong>Làm với đạo diễn hoặc người quay khác</strong><p>Dựng footage không phải của mình giúp bạn học cách chọn và trao đổi chuyên nghiệp hơn.</p></div></div>
    <div class="arc-path-step"><div class="arc-step-num">5</div><div class="arc-step-body"><strong>Xây showreel và breakdown</strong><p>Đưa đoạn trước/sau, ghi rõ bạn dựng gì, xử lý âm thanh tạm ra sao, mục tiêu nhịp là gì.</p></div></div>
  </div>
</section>`,
  },
];

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

async function main() {
  console.log(APPLY ? "MODE: APPLY" : "MODE: DRY-RUN (pass --apply)");
  for (const article of articles) {
    console.log(`${article.slug}: ${article.html.length} chars`);
    if (!APPLY) continue;
    const rows = await sql`
      UPDATE article_bai_viet SET
        tieu_de_viet = ${article.viet},
        tom_tat = ${article.summary},
        meta_title = ${article.metaTitle},
        meta_description = ${article.metaDescription},
        trang_thai_noi_dung = 'published',
        noi_dung = ${article.html},
        cap_nhat_luc = now()
      WHERE id = ${article.id}::uuid
        AND loai_bai_viet = 'nghe'
      RETURNING slug, length(noi_dung)::int AS len
    `;
    if (!rows.length) {
      console.error(`No row updated: ${article.slug}`);
      process.exit(1);
    }
    console.log("OK", rows[0]);
  }

  if (APPLY) {
    const verify = await sql`
      SELECT slug, length(noi_dung)::int AS len,
        (noi_dung LIKE '%Xuất hiện ở đâu%') AS has_fields_box,
        (noi_dung LIKE '%học sinh%' OR noi_dung LIKE '%sinh viên%') AS has_audience,
        (noi_dung LIKE '%Product Designer không phải industrial/product designer%') AS product_boundary
      FROM article_bai_viet
      WHERE id = ANY(${articles.map((a) => a.id)}::uuid[])
      ORDER BY array_position(${articles.map((a) => a.slug)}, slug)
    `;
    console.table(verify);
  }
  await sql.end({ timeout: 5 });
}

main().catch(async (e) => {
  console.error(e);
  await sql.end({ timeout: 5 });
  process.exit(1);
});
