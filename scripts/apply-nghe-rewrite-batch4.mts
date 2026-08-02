/**
 * Apply rewrite batch 4 for nghề canonicals.
 * Audience: HS THPT & Sinh viên. Vietnamese-first, English only for role/tool names.
 *
 * Usage:
 *   npx tsx scripts/apply-nghe-rewrite-batch4.mts --apply
 */
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");

type Job = {
  id: string;
  slug: string;
  title: string;
  viet: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  intro: [string, string];
  definition: [string, string];
  responsibilities: string[];
  appears: [string, string][];
  tasks: { title: string; body: string; bullets: [string, string][] }[];
  skills: { icon: string; label: string; body: [string, string] }[];
  path: [string, string][];
};

const jobs: Job[] = [
  {
    id: "916b9a4d-7204-4e19-971d-bdfcce697675",
    slug: "nghe-design-director",
    title: "Design Director",
    viet: "Giám đốc thiết kế",
    summary:
      "Người giữ tiêu chuẩn và hướng thiết kế cấp cao cho sản phẩm, thương hiệu hoặc đội thiết kế, bảo đảm nhiều đầu ra vẫn cùng một hệ thống và mục tiêu.",
    metaTitle: "Design Director là gì? Công việc, kỹ năng và lộ trình | CINS",
    metaDescription:
      "Design Director làm gì, khác Design Manager và Creative Director ra sao, sinh viên cần tích lũy gì để đi theo hướng này.",
    intro: [
      "Một sản phẩm số có app, website, email, banner, tài liệu bán hàng nhưng vẫn nhìn như một hệ thống. Một thương hiệu ra nhiều chiến dịch mà thiết kế không bị mỗi nơi một kiểu. Người giữ tiêu chuẩn thiết kế cấp cao đó thường là Design Director.",
      "Design Director không chỉ tự thiết kế đẹp. Họ quyết định hướng thiết kế, chất lượng đầu ra, cách đội dùng hệ thống và vì sao một phương án thiết kế phục vụ mục tiêu tốt hơn phương án khác.",
    ],
    definition: [
      "Design Director là vai trò lãnh đạo thiết kế, thường xuất hiện trong sản phẩm số, agency, studio, thương hiệu thời trang, nội thất hoặc đội truyền thông lớn. Họ định hướng thẩm mỹ, hệ thống, quy chuẩn và quyết định thiết kế quan trọng.",
      "Khác Design Manager tập trung nhiều vào vận hành đội và tiến độ, Design Director thường tập trung sâu hơn vào chất lượng sáng tạo, ngôn ngữ thiết kế và cách thiết kế tạo giá trị cho người dùng/thương hiệu.",
    ],
    responsibilities: [
      "Đặt hướng thiết kế và tiêu chuẩn chất lượng cho dự án/đội",
      "Duyệt các phương án thiết kế quan trọng và giải thích quyết định",
      "Xây hoặc giữ hệ thống thiết kế, guideline, nguyên tắc dùng hình/ chữ/ màu",
      "Huấn luyện designer trẻ và làm việc với product, marketing, founder hoặc khách hàng",
    ],
    appears: [
      ["UI/UX Design", "giữ hệ thống giao diện, trải nghiệm và tiêu chuẩn sản phẩm số."],
      ["Thiết kế thời trang/brand", "định hướng hình ảnh, lookbook, campaign, hệ nhận diện."],
      ["Agency/studio", "duyệt concept thiết kế, trình bày hướng cho khách hàng và đội triển khai."],
    ],
    tasks: [
      {
        title: "Biến mục tiêu thành hướng thiết kế",
        body:
          "Design Director cần hiểu sản phẩm hoặc thương hiệu đang cần gì: dễ dùng hơn, cao cấp hơn, trẻ hơn, rõ hơn hay đáng tin hơn. Từ đó họ chọn hướng thiết kế thay vì chỉ chọn theo gu.",
        bullets: [
          ["Mục tiêu", "thiết kế phải giải quyết vấn đề cụ thể"],
          ["Người dùng", "thiết kế dành cho ai, họ đang cần gì"],
          ["Ngôn ngữ thiết kế", "màu, chữ, bố cục, hình ảnh, nhịp tương tác đi theo một hướng"],
        ],
      },
      {
        title: "Duyệt và phản biện thiết kế",
        body:
          "Khi có nhiều phương án đẹp, Design Director chọn phương án đúng hơn với mục tiêu. Feedback của họ cần có lý do để designer hiểu và phát triển.",
        bullets: [
          ["Tiêu chí", "rõ, dễ dùng, đúng brand, có thể mở rộng, phù hợp ngữ cảnh"],
          ["Phản biện", "nói vì sao cần sửa, không chỉ nói thích/không thích"],
          ["Ưu tiên", "biết phần nào cần hoàn hảo, phần nào chỉ cần đủ tốt"],
        ],
      },
      {
        title: "Giữ hệ thống thiết kế nhất quán",
        body:
          "Đội càng đông càng dễ lệch. Design Director giữ nguyên tắc để nhiều người làm nhưng người xem vẫn cảm thấy cùng một sản phẩm hoặc thương hiệu.",
        bullets: [
          ["Design system", "component, font, màu, spacing, trạng thái UI"],
          ["Quy chuẩn", "cách dùng logo, ảnh, icon, layout, motion"],
          ["Mở rộng", "hệ thống đủ linh hoạt cho nhiều tình huống mới"],
        ],
      },
      {
        title: "Phát triển năng lực đội thiết kế",
        body:
          "Vai trò này không tự làm hết. Họ giúp designer junior/senior hiểu tiêu chuẩn, ra quyết định tốt hơn và trình bày thiết kế tự tin hơn.",
        bullets: [
          ["Mentor", "góp ý để người khác tiến bộ"],
          ["Review", "xem thiết kế theo mục tiêu và hệ thống"],
          ["Trình bày", "giúp đội nói chuyện với product/marketing/khách hàng rõ hơn"],
        ],
      },
    ],
    skills: [
      { icon: "👁️", label: "Gu có lý do", body: ["Không chỉ thấy đẹp; cần giải thích được vì sao đúng hoặc sai.", "Tập phân tích thiết kế bằng mục tiêu, người dùng, brand và hệ thống."] },
      { icon: "📐", label: "Hệ thống thiết kế", body: ["Cần hiểu component, typography, màu, spacing, quy chuẩn và cách mở rộng.", "Làm lại một app nhỏ bằng cùng một hệ thống là bài tập tốt."] },
      { icon: "🧠", label: "Tư duy sản phẩm", body: ["Thiết kế phải phục vụ hành vi và kết quả, không chỉ bề mặt.", "Luôn hỏi: người dùng làm gì dễ hơn sau thiết kế này?"] },
      { icon: "💬", label: "Feedback", body: ["Feedback tốt giúp đội đi đúng hướng mà không làm người nhận mù mờ.", "Nêu vấn đề, lý do, gợi ý hướng sửa; tránh chỉ nói 'chưa ổn'."] },
      { icon: "🤝", label: "Lãnh đạo đội", body: ["Design Director cần kéo nhiều người về cùng chuẩn.", "Kỹ năng nghe, ưu tiên và ra quyết định quan trọng không kém kỹ năng thiết kế."] },
      { icon: "📋", label: "Hiểu production", body: ["Thiết kế phải triển khai được bởi dev, marketing, in ấn hoặc vendor.", "Biết giới hạn thật giúp quyết định thực tế hơn."] },
    ],
    path: [
      ["Bắt đầu từ một chuyên môn thiết kế mạnh", "UI/UX, brand, graphic, fashion, product hoặc visual design đều có thể là nền."],
      ["Làm dự án có hệ thống", "Không chỉ làm một màn/hình; hãy làm bộ component, guideline hoặc series thiết kế nhất quán."],
      ["Tập review thiết kế", "Giải thích vì sao một phương án tốt hơn phương án khác bằng tiêu chí rõ."],
      ["Dẫn nhóm nhỏ", "CLB, dự án sinh viên, freelance team giúp luyện giao việc và feedback."],
      ["Xây case study", "Show vấn đề, hướng thiết kế, hệ thống, biến thể, kết quả và bài học."],
      ["Tích lũy lên lead/director", "Đây không phải vị trí vào nghề ngay; thường đi qua designer, senior, lead rồi director."],
    ],
  },
  {
    id: "96aebeac-4853-4b02-ab00-61c81e31eb62",
    slug: "nghe-design-manager",
    title: "Design Manager",
    viet: "Quản lý đội thiết kế",
    summary:
      "Người quản lý con người, quy trình, ưu tiên và chất lượng vận hành của đội thiết kế để designer làm đúng việc, đúng nhịp và phát triển được.",
    metaTitle: "Design Manager là gì? Công việc, kỹ năng và lộ trình | CINS",
    metaDescription:
      "Design Manager làm gì trong đội UI/UX, agency hoặc studio; khác Design Director ra sao và sinh viên nên chuẩn bị gì.",
    intro: [
      "Một đội thiết kế có nhiều người giỏi vẫn có thể rối: việc trùng, deadline lệch, designer không rõ ưu tiên, feedback vòng vo, người mới không biết hỏi ai. Design Manager giúp đội vận hành rõ ràng hơn.",
      "Design Manager không nhất thiết là người vẽ đẹp nhất trong phòng. Họ là người giúp designer làm việc tốt hơn, phối hợp tốt hơn và phát triển đúng hướng.",
    ],
    definition: [
      "Design Manager là người quản lý đội thiết kế: nhân sự, ưu tiên, quy trình, kế hoạch, năng lực, giao tiếp với các đội khác và chất lượng vận hành. Vai trò này phổ biến trong công ty sản phẩm, agency, studio hoặc đội marketing lớn.",
      "Khác Design Director thiên về hướng thiết kế và tiêu chuẩn sáng tạo, Design Manager thường tập trung nhiều hơn vào người, quy trình và cách đội giao việc đúng hạn.",
    ],
    responsibilities: [
      "Phân bổ designer vào dự án và làm rõ ưu tiên",
      "Theo dõi tiến độ, blockers, workload và chất lượng giao tiếp",
      "Mentor, review năng lực và hỗ trợ designer phát triển",
      "Kết nối đội thiết kế với product, dev, marketing, sales hoặc khách hàng",
    ],
    appears: [
      ["UI/UX Design", "quản lý đội product designer, quy trình review, phối hợp dev/product."],
      ["Kiến trúc & Nội thất", "điều phối nhóm concept, 3D, hồ sơ, khách hàng và tiến độ."],
      ["Agency/studio", "chia người cho nhiều dự án, cân bằng chất lượng và deadline."],
    ],
    tasks: [
      {
        title: "Làm rõ ưu tiên và phân bổ việc",
        body:
          "Nếu mọi việc đều gấp, đội sẽ kiệt sức. Design Manager giúp xác định việc nào quan trọng, ai phụ trách, khi nào cần review và việc nào có thể lùi.",
        bullets: [
          ["Ưu tiên", "việc nào ảnh hưởng người dùng/kinh doanh nhiều nhất"],
          ["Workload", "tránh một người quá tải trong khi người khác chờ việc"],
          ["Kỳ vọng", "mỗi đầu việc có đầu ra và tiêu chí hoàn thành rõ"],
        ],
      },
      {
        title: "Giữ quy trình review không rối",
        body:
          "Feedback thiết kế dễ bị nhiều chiều. Design Manager giúp thiết lập nhịp review, người duyệt, cách ghi quyết định và vòng sửa hợp lý.",
        bullets: [
          ["Review cadence", "khi nào xem bản nháp, khi nào duyệt bản cuối"],
          ["Decision log", "ghi quyết định để không tranh luận lại từ đầu"],
          ["Blocker", "phát hiện sớm việc đang kẹt vì thiếu thông tin hoặc người duyệt"],
        ],
      },
      {
        title: "Phát triển designer trong đội",
        body:
          "Một phần quan trọng của nghề là hiểu mỗi designer mạnh/yếu ở đâu, muốn đi hướng nào và cần dự án nào để tiến bộ.",
        bullets: [
          ["Mentor", "góp ý kỹ năng, portfolio, cách trình bày, cách nhận feedback"],
          ["Career path", "junior, mid, senior cần tiêu chuẩn khác nhau"],
          ["Tâm lý đội", "nhận ra burnout, mâu thuẫn hoặc thiếu tự tin"],
        ],
      },
      {
        title: "Kết nối thiết kế với các đội khác",
        body:
          "Thiết kế không sống riêng. Design Manager giúp product, dev, marketing hoặc khách hàng hiểu quy trình thiết kế và cung cấp input đúng lúc.",
        bullets: [
          ["Giao tiếp", "dịch ngôn ngữ thiết kế sang mục tiêu sản phẩm/kinh doanh"],
          ["Hand-off", "bàn giao rõ cho dev, production hoặc vendor"],
          ["Kỳ vọng", "giải thích vì sao thiết kế cần thời gian research/review"],
        ],
      },
    ],
    skills: [
      { icon: "📋", label: "Tổ chức", body: ["Cần chia việc, theo dõi mốc, ưu tiên và dependency.", "Tập quản lý một dự án CLB bằng bảng việc rõ ràng."] },
      { icon: "💬", label: "Giao tiếp", body: ["Nói rõ kỳ vọng, quyết định và lý do.", "Sau mỗi buổi review, thử viết tóm tắt: ai sửa gì, hạn nào, vì sao."] },
      { icon: "🤝", label: "Mentor", body: ["Quản lý thiết kế là giúp người khác làm tốt hơn.", "Feedback nên cụ thể, có ví dụ và hướng luyện tiếp."] },
      { icon: "👁️", label: "Hiểu chất lượng thiết kế", body: ["Dù không phải director, vẫn cần biết thiết kế đang đạt hay lệch.", "Học nguyên lý UI, brand, bố cục, usability tùy đội mình quản."] },
      { icon: "🧠", label: "Ưu tiên", body: ["Không có đủ thời gian để làm mọi thứ hoàn hảo.", "Học phân biệt việc quan trọng với việc chỉ gây ồn."] },
      { icon: "🧭", label: "Giữ nhịp đội", body: ["Đội thiết kế cần nhịp làm việc lành mạnh.", "Quan sát workload, cảm xúc, mâu thuẫn và blockers sớm."] },
    ],
    path: [
      ["Học một chuyên môn thiết kế", "Có nền thiết kế giúp bạn hiểu designer đang gặp gì."],
      ["Tập dẫn dự án nhỏ", "Bài nhóm, CLB, freelance team là nơi luyện phân việc và review."],
      ["Học quản lý quy trình", "Trello, Notion, Jira, Figma branch, design review, hand-off."],
      ["Luyện feedback", "Góp ý dựa trên mục tiêu và tiêu chí, không dựa vào gu cá nhân."],
      ["Xây case quản lý", "Ghi lại cách bạn tổ chức dự án, xử lý blockers và giúp đội giao được sản phẩm."],
      ["Đi từ designer/lead lên manager", "Thường cần kinh nghiệm thực chiến trước khi quản lý đội thiết kế chính thức."],
    ],
  },
  {
    id: "ff95bbe4-85bf-46dc-b22e-054b47b66032",
    slug: "nghe-director",
    title: "Director",
    viet: "Đạo diễn",
    summary:
      "Người giữ cách kể chuyện và quyết định sáng tạo tổng thể của phim, hoạt hình, MV hoặc video — từ diễn xuất, hình ảnh, nhịp đến cảm xúc cuối cùng.",
    metaTitle: "Director là gì? Công việc, kỹ năng và lộ trình đạo diễn | CINS",
    metaDescription:
      "Director làm gì trong phim và hoạt hình; cần học kể chuyện, diễn xuất, hình ảnh, làm việc với ekip ra sao.",
    intro: [
      "Cùng một kịch bản, hai đạo diễn có thể tạo ra hai bộ phim rất khác: một bản căng thẳng, một bản hài hước, một bản lặng và đau. Director là người giữ cách kể chuyện đó.",
      "Đạo diễn không tự làm hết mọi thứ. Họ làm việc với diễn viên, quay phim, art, dựng, âm thanh, producer để mọi lựa chọn cùng phục vụ câu chuyện và cảm xúc.",
    ],
    definition: [
      "Director là người chịu trách nhiệm định hướng sáng tạo tổng thể của phim, hoạt hình, MV, quảng cáo, video hoặc sản phẩm kể chuyện bằng hình. Họ quyết định cách câu chuyện được nhìn, nghe, diễn và cảm.",
      "Trong hoạt hình, đạo diễn có thể làm việc nhiều với storyboard, layout, animation, voice, edit. Trong phim thật, họ làm trực tiếp với diễn viên, camera, bối cảnh, ánh sáng và hậu kỳ.",
    ],
    responsibilities: [
      "Hiểu kịch bản và xác định cách kể chuyện",
      "Dẫn diễn viên/nhân vật, hình ảnh, nhịp cảnh và cảm xúc",
      "Phối hợp với các trưởng bộ phận: quay phim, art, âm thanh, dựng, sản xuất",
      "Duyệt bản dựng, âm thanh, màu, hiệu ứng để giữ tinh thần tác phẩm",
    ],
    appears: [
      ["Phim & Điện ảnh", "phim ngắn, phim dài, quảng cáo, MV, series, documentary."],
      ["Hoạt hình", "định hướng story, storyboard, animation, diễn xuất nhân vật."],
      ["Nội dung số", "video thương hiệu, phim giới thiệu, web series, social video có câu chuyện."],
    ],
    tasks: [
      {
        title: "Tìm cách kể của kịch bản",
        body:
          "Đạo diễn đọc kịch bản để hiểu nhân vật muốn gì, xung đột nằm ở đâu và cảm xúc chính là gì. Từ đó họ chọn cách kể: gần gũi, lạnh, nhanh, chậm, hài hay căng.",
        bullets: [
          ["Chủ đề", "tác phẩm thật sự nói về điều gì"],
          ["Nhân vật", "ai thay đổi, ai che giấu, ai đẩy câu chuyện đi"],
          ["Giọng kể", "hiện thực, cách điệu, nhẹ nhàng, dữ dội hay trào phúng"],
        ],
      },
      {
        title: "Làm việc với hình ảnh và diễn xuất",
        body:
          "Director quyết định cách camera nhìn nhân vật, cảnh diễn ra ở đâu, diễn viên/nhân vật nên thể hiện mức cảm xúc nào và khoảnh khắc nào cần giữ lâu hơn.",
        bullets: [
          ["Blocking", "nhân vật đứng/di chuyển ở đâu trong cảnh"],
          ["Diễn xuất", "cảm xúc vừa đủ, không quá lố hoặc quá phẳng"],
          ["Góc nhìn", "khán giả nên biết gì và chưa nên biết gì"],
        ],
      },
      {
        title: "Dẫn ekip cùng một hướng",
        body:
          "Một bộ phim có nhiều bộ phận. Nếu art muốn một kiểu, camera một kiểu, diễn viên một kiểu, phim sẽ rời rạc. Đạo diễn giữ câu chuyện làm trục chung.",
        bullets: [
          ["Brief sáng tạo", "đội hiểu cảm xúc và mục tiêu từng cảnh"],
          ["Quyết định", "chọn phương án khi có nhiều lựa chọn"],
          ["Giao tiếp", "nói bằng ngôn ngữ mà từng bộ phận hiểu được"],
        ],
      },
      {
        title: "Giữ nhịp ở hậu kỳ",
        body:
          "Phim thật sự hình thành nhiều ở dựng. Director cùng editor, sound designer, composer, colorist kiểm tra nhịp, cảm xúc và điểm rơi câu chuyện.",
        bullets: [
          ["Dựng", "cắt cảnh nhanh/chậm để giữ cảm xúc"],
          ["Âm thanh/nhạc", "tăng hoặc giảm cảm xúc đúng chỗ"],
          ["Màu/hình cuối", "giữ không khí và ý đồ thị giác"],
        ],
      },
    ],
    skills: [
      { icon: "🎬", label: "Kể chuyện", body: ["Đạo diễn phải hiểu cấu trúc, nhân vật, xung đột và nhịp cảm xúc.", "Xem phim rồi tóm tắt mỗi cảnh: nhân vật muốn gì, cảnh đổi điều gì."] },
      { icon: "🎭", label: "Diễn xuất", body: ["Cần biết dẫn diễn viên hoặc animator đến cảm xúc đúng.", "Tập chỉ đạo một cảnh ngắn với bạn bè để hiểu nói thế nào cho người khác diễn được."] },
      { icon: "👁️", label: "Ngôn ngữ hình ảnh", body: ["Góc máy, ánh sáng, màu, bối cảnh đều kể chuyện.", "Vẽ storyboard đơn giản trước khi quay để kiểm tra ý đồ."] },
      { icon: "💬", label: "Giao tiếp", body: ["Director làm việc với rất nhiều người.", "Nói rõ mục tiêu cảm xúc thay vì chỉ nói 'đẹp hơn' hoặc 'hay hơn'."] },
      { icon: "🧠", label: "Ra quyết định", body: ["Trên set hoặc production, nhiều quyết định phải đưa nhanh.", "Học giữ phần cốt lõi và linh hoạt phần phụ."] },
      { icon: "🔍", label: "Quan sát con người", body: ["Phim hay thường đến từ chi tiết đời sống.", "Ghi lại cách người thật nói, im lặng, tránh nhìn, nói dối, vui mừng."] },
    ],
    path: [
      ["Xem phim chủ động", "Phân tích cảnh, nhịp, góc máy, diễn xuất, âm thanh thay vì chỉ xem nội dung."],
      ["Làm phim rất ngắn", "Một cảnh 1–3 phút với bạn bè đủ để học blocking, quay, dựng, âm thanh."],
      ["Học storyboard và dựng", "Biết dựng giúp đạo diễn hiểu nhịp và biết quay cái gì cần thiết."],
      ["Làm nhiều vai trong ekip", "Trợ lý đạo diễn, editor, script, camera, art giúp hiểu ekip vận hành."],
      ["Xây reel/case", "Show phim ngắn, phân cảnh, bản dựng và vai trò đạo diễn của bạn."],
      ["Đi từ dự án nhỏ", "Phim sinh viên, MV nhỏ, quảng cáo nội bộ, web series, hoạt hình ngắn là nơi luyện thật."],
    ],
  },
  {
    id: "0bd99e00-73c8-4068-ae69-c5cabb9c005a",
    slug: "nghe-editor",
    title: "Editor",
    viet: "Dựng phim",
    summary:
      "Người chọn, sắp xếp và cắt nối hình ảnh/âm thanh để tạo nhịp kể chuyện, cảm xúc và thông tin rõ ràng cho phim, video hoặc hoạt hình.",
    metaTitle: "Editor là gì? Công việc dựng phim, kỹ năng và lộ trình | CINS",
    metaDescription:
      "Editor làm gì trong phim, hoạt hình, video; cần học nhịp dựng, kể chuyện và phần mềm ra sao để bắt đầu.",
    intro: [
      "Một cảnh quay có thể bình thường, nhưng khi được cắt đúng nhịp với ánh nhìn, âm thanh và khoảng lặng, nó trở nên xúc động. Editor là người tạo nhịp kể chuyện đó ở bàn dựng.",
      "Editor không chỉ cắt bỏ phần thừa. Họ quyết định người xem biết gì trước, cảm gì sau, cảnh nào cần nhanh, cảnh nào cần chậm và lúc nào nên im lặng.",
    ],
    definition: [
      "Editor là người dựng phim/video: chọn shot, sắp xếp cảnh, cắt nhịp, xử lý âm thanh tạm, làm phiên bản dựng và phối hợp với đạo diễn/producer để tạo bản cuối.",
      "Trong phim và hoạt hình, editor là người giúp câu chuyện rõ hơn. Trong video thương hiệu/social, editor giúp thông tin cuốn hơn và đúng nhịp nền tảng.",
    ],
    responsibilities: [
      "Xem footage/shot và chọn phần tốt nhất",
      "Sắp xếp cảnh theo nhịp kể chuyện và mục tiêu nội dung",
      "Làm bản dựng thô, dựng tinh, chỉnh âm thanh tạm, nhịp nhạc và chuyển cảnh",
      "Bàn giao timeline/file cho màu, âm thanh, VFX hoặc xuất bản",
    ],
    appears: [
      ["Phim & Điện ảnh", "phim ngắn/dài, quảng cáo, MV, documentary, trailer."],
      ["Hoạt hình", "animatic, layout, bản dựng episode, nhịp cảnh."],
      ["Nội dung số", "YouTube, TikTok, khóa học, video thương hiệu, social campaign."],
    ],
    tasks: [
      {
        title: "Tìm câu chuyện trong footage",
        body:
          "Editor xem nhiều cảnh quay và chọn phần phục vụ câu chuyện nhất. Không phải shot đẹp nhất luôn là shot đúng nhất.",
        bullets: [
          ["Khoảnh khắc", "ánh nhìn, cử chỉ, khoảng ngừng có thể rất quan trọng"],
          ["Thông tin", "người xem cần hiểu gì ở mỗi đoạn"],
          ["Cảm xúc", "shot nào làm cảm xúc thật hơn"],
        ],
      },
      {
        title: "Dựng nhịp",
        body:
          "Nhịp dựng quyết định cảm giác nhanh, chậm, căng, hài, buồn hay lặng. Editor điều khiển nhịp bằng độ dài shot, thứ tự cảnh, âm thanh và khoảng trống.",
        bullets: [
          ["Pacing", "tốc độ tổng thể của đoạn"],
          ["Cut point", "cắt ở khoảnh khắc nào để giữ lực"],
          ["Khoảng lặng", "không cắt cũng là một quyết định dựng"],
        ],
      },
      {
        title: "Làm rõ cấu trúc và mạch cảm xúc",
        body:
          "Bản dựng đầu có thể dài, rối hoặc lặp. Editor giúp câu chuyện đi thẳng hơn bằng cách bỏ phần thừa, đổi thứ tự hoặc giữ lại chi tiết quan trọng.",
        bullets: [
          ["Cấu trúc", "mở, phát triển, cao trào, kết"],
          ["Continuity", "hành động, ánh nhìn, vị trí không gây khó hiểu"],
          ["Mạch cảm xúc", "không nhảy cảm xúc quá đột ngột nếu không có chủ ý"],
        ],
      },
      {
        title: "Chuẩn bị bản bàn giao",
        body:
          "Sau khi dựng được duyệt, editor cần bàn giao cho màu, âm thanh, VFX hoặc xuất bản. Timeline sạch giúp các khâu sau đỡ lỗi.",
        bullets: [
          ["Timeline gọn", "đặt tên track, phiên bản, marker rõ"],
          ["Âm thanh tạm", "đủ để hiểu nhịp trước khi sound designer xử lý"],
          ["Export", "đúng codec, tỷ lệ, phụ đề, bản ngang/dọc khi cần"],
        ],
      },
    ],
    skills: [
      { icon: "🎬", label: "Kể chuyện", body: ["Editor phải biết cảnh nào đổi câu chuyện và cảnh nào chỉ thừa.", "Tập dựng lại một video ngắn theo 2 cảm xúc khác nhau."] },
      { icon: "⏱️", label: "Cảm nhịp", body: ["Nhịp là kỹ năng sống còn của dựng.", "Xem một cảnh và đếm độ dài shot để hiểu cách phim tạo cảm giác."] },
      { icon: "👂", label: "Tai âm thanh", body: ["Âm thanh và nhạc ảnh hưởng mạnh đến cut.", "Tập dựng cùng một cảnh với nhạc khác nhau để thấy nhịp đổi."] },
      { icon: "🖥️", label: "Phần mềm dựng", body: ["Premiere, DaVinci Resolve, Final Cut hoặc Avid tùy môi trường.", "Quan trọng là tư duy dựng, không chỉ biết nút bấm."] },
      { icon: "🔍", label: "Tỉ mỉ", body: ["Một frame lệch, âm thanh pop, continuity sai có thể phá cảm giác.", "Tập xem lại nhiều lần: hình, âm, phụ đề, màu, export."] },
      { icon: "🤝", label: "Làm việc với đạo diễn", body: ["Editor cần hiểu ý đồ và cũng biết đề xuất cách kể tốt hơn.", "Hỏi: đoạn này cần người xem cảm gì, biết gì, chờ gì?"] },
    ],
    path: [
      ["Học phần mềm dựng cơ bản", "Cắt, ghép, âm thanh, text, export đúng format."],
      ["Dựng video ngắn thật nhiều", "Vlog, phỏng vấn, phim 1 phút, quảng cáo CLB, reel cá nhân."],
      ["Học kể chuyện qua cut", "Dựng cùng footage thành bản hài, bản buồn, bản căng để luyện nhịp."],
      ["Làm việc với footage của người khác", "Dựng phim bạn quay giúp bạn học cách chọn từ dữ liệu không hoàn hảo."],
      ["Xây showreel", "Chọn đoạn trước/sau, nêu vai trò: dựng, âm thanh tạm, color cơ bản nếu có."],
      ["Ứng tuyển assistant/editor junior", "Có thể bắt đầu từ video editor, assistant editor, social editor hoặc dựng phim sinh viên."],
    ],
  },
  {
    id: "38105b54-bebf-4a0f-b295-31025a9c6783",
    slug: "nghe-environment-artist",
    title: "Environment Artist",
    viet: "Họa sĩ dựng môi trường",
    summary:
      "Người xây dựng bối cảnh 2D/3D cho game, hoạt hình hoặc phim: nhà cửa, thiên nhiên, đường phố, căn phòng, thế giới để nhân vật sống trong đó.",
    metaTitle: "Environment Artist là gì? Công việc, kỹ năng và lộ trình | CINS",
    metaDescription:
      "Environment Artist làm gì trong game và hoạt hình; cần học bố cục, 3D, ánh sáng, vật liệu và kể chuyện bằng bối cảnh ra sao.",
    intro: [
      "Một nhân vật game bước vào thành phố đổ nát, một căn phòng cũ đầy đồ cá nhân, một khu rừng phát sáng trong phim hoạt hình — môi trường không chỉ làm nền. Nó kể người sống ở đó là ai và chuyện gì đã xảy ra.",
      "Environment Artist là người dựng hoặc hoàn thiện thế giới đó để người xem/người chơi tin rằng nhân vật thật sự thuộc về không gian này.",
    ],
    definition: [
      "Environment Artist là họa sĩ tạo môi trường/bối cảnh cho game, hoạt hình, phim, VFX hoặc 3D. Họ có thể làm model, set dressing, vật liệu, ánh sáng cơ bản và bố cục cảnh tùy pipeline.",
      "Khác Environment Concept Artist thiên về ý tưởng ban đầu, Environment Artist thường đưa môi trường vào sản xuất: asset, scene, level, render hoặc engine.",
    ],
    responsibilities: [
      "Dựng bối cảnh, kiến trúc, thiên nhiên, đạo cụ và chi tiết môi trường",
      "Sắp xếp asset để cảnh có bố cục, đường đi và câu chuyện",
      "Giữ môi trường đúng phong cách, tối ưu và dùng được trong game/phim",
      "Phối hợp với concept, level design, lighting, tech art hoặc director",
    ],
    appears: [
      ["Game", "level, map, dungeon, thành phố, rừng, interior, props."],
      ["Hoạt hình", "set 3D/2D nơi nhân vật diễn xuất."],
      ["Phim/VFX", "môi trường số, extension bối cảnh, set ảo."],
    ],
    tasks: [
      {
        title: "Hiểu chức năng của môi trường",
        body:
          "Một môi trường game phải dẫn đường và hỗ trợ gameplay; môi trường phim phải phục vụ khung hình và cảm xúc. Không gian đẹp nhưng không phục vụ mục tiêu sẽ bị rối.",
        bullets: [
          ["Mục đích", "khám phá, chiến đấu, nghỉ ngơi, kể chuyện hay giới thiệu thế giới"],
          ["Đường nhìn", "người xem/người chơi nên chú ý đâu trước"],
          ["Tính dùng được", "nhân vật có di chuyển, tương tác hoặc diễn xuất được không"],
        ],
      },
      {
        title: "Dựng khối và bố cục cảnh",
        body:
          "Environment Artist thường bắt đầu bằng blockout: khối lớn, đường đi, tỷ lệ, điểm nhấn. Sau đó mới thêm chi tiết, vật liệu và ánh sáng.",
        bullets: [
          ["Scale", "cửa, ghế, cây, đường đi đúng tỷ lệ với nhân vật"],
          ["Composition", "bố cục giúp cảnh đọc rõ"],
          ["Landmark", "điểm nhận diện giúp người chơi/người xem định hướng"],
        ],
      },
      {
        title: "Thêm chi tiết kể chuyện",
        body:
          "Một chiếc cốc vỡ, poster rách, bụi trên bàn, vết bánh xe có thể kể lịch sử của nơi đó. Chi tiết tốt giúp môi trường có đời sống.",
        bullets: [
          ["Set dressing", "sắp đồ vật để không gian có người từng sống/làm việc"],
          ["Wear and tear", "vết cũ, bụi, rỉ, hỏng hóc có lý do"],
          ["Không quá tải", "chi tiết nhiều nhưng vẫn phải dẫn mắt rõ"],
        ],
      },
      {
        title: "Tối ưu và bàn giao",
        body:
          "Trong game, môi trường phải chạy mượt. Trong phim/3D, cảnh phải render được. Artist cần hiểu giới hạn kỹ thuật để cảnh đẹp mà khả thi.",
        bullets: [
          ["Tối ưu asset", "giảm chi tiết không cần, dùng lại module khi hợp lý"],
          ["Material", "bề mặt nhất quán và không quá nặng"],
          ["Bàn giao", "scene sạch, tên rõ, layer/collection có tổ chức"],
        ],
      },
    ],
    skills: [
      { icon: "🏞️", label: "Không gian", body: ["Cần hiểu tỷ lệ, phối cảnh, kiến trúc cơ bản và bố cục.", "Quan sát phòng, phố, quán, trường học: đồ vật được đặt vì lý do gì?"] },
      { icon: "🧊", label: "3D/2D production", body: ["Tùy dự án có thể dùng Blender, Maya, Unreal, Unity, Substance.", "Bắt đầu bằng một căn phòng nhỏ hoặc góc phố đơn giản."] },
      { icon: "🎨", label: "Vật liệu", body: ["Gỗ, đá, đất, kim loại, vải, cây cối đều có bề mặt khác nhau.", "Chụp ảnh texture đời thật và phân tích độ nhám, màu, vết cũ."] },
      { icon: "💡", label: "Ánh sáng cơ bản", body: ["Ánh sáng giúp cảnh có mood và đọc được.", "Dù có Lighting Artist riêng, Environment Artist vẫn cần hiểu ánh sáng."] },
      { icon: "🧠", label: "Kể chuyện môi trường", body: ["Bối cảnh nên gợi câu chuyện, không chỉ là đồ vật đẹp.", "Tập thiết kế một căn phòng nói về chủ nhân mà không cần nhân vật xuất hiện."] },
      { icon: "🔧", label: "Tối ưu", body: ["Môi trường thường nặng vì nhiều asset.", "Học dùng module, LOD, instancing hoặc asset reuse tùy công cụ."] },
    ],
    path: [
      ["Học phối cảnh và bố cục", "Vẽ không gian đơn giản, học scale và đường dẫn mắt."],
      ["Làm scene nhỏ", "Một bàn học, phòng ngủ, ngõ nhỏ, cổng trường hoặc góc quán."],
      ["Học asset và vật liệu", "Dựng đồ vật, tạo material, set dressing có câu chuyện."],
      ["Đưa vào engine/render", "Nếu theo game, thử scene trong Unreal/Unity; nếu theo phim, render turntable/camera shot."],
      ["Xây breakdown", "Show blockout, asset, material, lighting, final và lý do bố cục."],
      ["Ứng tuyển junior", "Có thể bắt đầu từ environment artist junior, prop artist, 3D generalist hoặc level art assistant."],
    ],
  },
  {
    id: "42920cdc-be88-48c4-80f7-e900a8588871",
    slug: "nghe-environment-concept-artist",
    title: "Environment Concept Artist",
    viet: "Họa sĩ concept môi trường",
    summary:
      "Người phát triển ý tưởng bối cảnh và thế giới bằng hình ảnh: thành phố, căn phòng, thiên nhiên, công trình, không khí và câu chuyện của nơi chốn.",
    metaTitle: "Environment Concept Artist là gì? Công việc và lộ trình | CINS",
    metaDescription:
      "Environment Concept Artist làm gì trong game, hoạt hình; cần học phối cảnh, ánh sáng, worldbuilding và portfolio ra sao.",
    intro: [
      "Trước khi game có một thành phố để khám phá hay phim hoạt hình có một vương quốc để nhân vật sống, đội cần hình dung thế giới đó trông như thế nào. Environment Concept Artist vẽ những hình đầu tiên để định hình nơi chốn.",
      "Nghề này không chỉ vẽ cảnh đẹp. Một concept môi trường tốt phải nói được bối cảnh, lịch sử, khí hậu, văn hóa, cảm xúc và chức năng của không gian.",
    ],
    definition: [
      "Environment Concept Artist là họa sĩ phát triển ý tưởng môi trường cho game, hoạt hình, phim, VFX hoặc dự án giải trí. Họ tạo key art, mood, layout, kiến trúc, thiên nhiên, đạo cụ lớn và ngôn ngữ thế giới.",
      "Khác Environment Artist thiên về dựng scene sản xuất, Environment Concept Artist tập trung vào giai đoạn tìm hướng: nơi này là đâu, trông ra sao, có cảm giác gì và quy luật thế giới là gì.",
    ],
    responsibilities: [
      "Vẽ nhiều hướng bối cảnh, kiến trúc, không khí, ánh sáng và bố cục",
      "Xây ngôn ngữ thế giới: hình khối, vật liệu, văn hóa, công nghệ, thiên nhiên",
      "Tạo key art hoặc callout giúp đội 3D/level/animation sản xuất tiếp",
      "Sửa concept theo feedback của art director, director, game designer hoặc writer",
    ],
    appears: [
      ["Game", "world, level, dungeon, city, environment key art, exploration mood."],
      ["Hoạt hình", "bối cảnh, thế giới, set, color key, location design."],
      ["Phim/VFX", "ý tưởng thành phố, hành tinh, set ảo, cảnh không thể quay thật."],
    ],
    tasks: [
      {
        title: "Xác định câu chuyện của nơi chốn",
        body:
          "Một môi trường có thể kể rằng nơi này từng giàu, vừa bị bỏ hoang, đang có chiến tranh hoặc thuộc nền văn hóa riêng. Concept Artist cần xác định câu chuyện đó trước khi vẽ chi tiết.",
        bullets: [
          ["Lịch sử", "nơi này mới xây, cổ, bị phá, được chăm sóc hay bị quên lãng"],
          ["Cư dân", "ai sống ở đây, họ cần gì, họ để lại dấu vết gì"],
          ["Cảm xúc", "ấm, lạnh, nguy hiểm, linh thiêng, cô đơn, náo nhiệt"],
        ],
      },
      {
        title: "Thiết kế hình khối và ánh sáng",
        body:
          "Environment concept dùng hình khối lớn, ánh sáng và màu để người xem cảm được không gian ngay lập tức. Chi tiết nhỏ chỉ hiệu quả khi khối lớn đã đúng.",
        bullets: [
          ["Silhouette", "thành phố, công trình, núi, cây có dáng nhận diện"],
          ["Ánh sáng", "thời điểm trong ngày và mood của thế giới"],
          ["Depth", "tiền cảnh, trung cảnh, hậu cảnh tạo chiều sâu"],
        ],
      },
      {
        title: "Làm nhiều phương án khám phá",
        body:
          "Giai đoạn concept là thử. Có thể cùng một thành phố nhưng thử bản cổ kính, bản công nghiệp, bản sinh học, bản tương lai để tìm hướng đúng nhất.",
        bullets: [
          ["Thumbnail", "phác nhỏ nhiều bố cục nhanh"],
          ["Biến thể", "thử nhiều vật liệu, kiến trúc, khí hậu, scale"],
          ["Chọn hướng", "phương án cuối phải phục vụ story/gameplay, không chỉ đẹp"],
        ],
      },
      {
        title: "Bàn giao ý tưởng cho production",
        body:
          "Concept cần giúp đội 3D, level, layout hoặc background hiểu cách xây thế giới. Vì vậy ngoài key art đẹp, đôi khi cần callout, sơ đồ, bảng vật liệu hoặc góc nhìn phụ.",
        bullets: [
          ["Callout", "phóng to cửa, biển hiệu, vật liệu, cây, máy móc"],
          ["Scale", "so với nhân vật/người để hiểu kích thước"],
          ["Production notes", "phần nào quan trọng, phần nào có thể linh hoạt"],
        ],
      },
    ],
    skills: [
      { icon: "📐", label: "Phối cảnh", body: ["Cần vẽ không gian thuyết phục.", "Học 1 điểm tụ, 2 điểm tụ, camera cao/thấp và scale người trong cảnh."] },
      { icon: "💡", label: "Ánh sáng/màu", body: ["Môi trường sống nhờ ánh sáng và khí quyển.", "Tập vẽ cùng một địa điểm lúc sáng, hoàng hôn, đêm, mưa."] },
      { icon: "🏛️", label: "Kiến trúc/vật liệu", body: ["Không cần thành kiến trúc sư, nhưng phải hiểu hình khối và chức năng công trình.", "Quan sát nhà cửa, cầu, chợ, trường, temple, factory từ đời thật."] },
      { icon: "🧠", label: "Worldbuilding", body: ["Thế giới tốt có quy luật.", "Tự hỏi: người ở đây sống bằng gì, di chuyển thế nào, khí hậu ảnh hưởng ra sao?"] },
      { icon: "🔍", label: "Research", body: ["Concept mạnh đến từ tham chiếu có chọn lọc.", "Gom tham chiếu về văn hóa, thiên nhiên, vật liệu, công nghệ rồi biến đổi có chủ ý."] },
      { icon: "🤝", label: "Làm việc với production", body: ["Hình đẹp cần dùng được bởi đội sau.", "Ghi chú rõ ý tưởng, scale và phần thiết kế không nên thay đổi."] },
    ],
    path: [
      ["Học phối cảnh và sketch cảnh", "Vẽ phòng, phố, cảnh thiên nhiên, công trình đơn giản."],
      ["Vẽ thumbnail nhiều", "Mỗi brief thử 20 bố cục nhỏ trước khi chọn một hướng."],
      ["Nghiên cứu thế giới thật", "Kiến trúc Việt Nam, chợ, nhà tập thể, làng, khu công nghiệp, rừng, biển đều là vốn quý."],
      ["Làm location sheet", "Một địa điểm có key art, góc phụ, callout vật liệu, scale người."],
      ["Xây portfolio theo thế giới", "3–5 location cùng một thế giới giúp thể hiện tư duy hệ thống."],
      ["Tham gia game/animation nhỏ", "Game jam, phim hoạt hình sinh viên, truyện tranh là nơi luyện brief thật."],
    ],
  },
  {
    id: "810b0597-b804-4c02-bb8f-338e39a96f0b",
    slug: "nghe-foley-artist",
    title: "Foley Artist",
    viet: "Nghệ sĩ âm thanh Foley",
    summary:
      "Người tái tạo các âm thanh đời thường như bước chân, quần áo, đồ vật va chạm trong phòng thu để phim/hoạt hình/game nghe thật và sống hơn.",
    metaTitle: "Foley Artist là gì? Công việc, kỹ năng và lộ trình | CINS",
    metaDescription:
      "Foley Artist làm gì trong phim và hoạt hình; khác Sound Designer ra sao, cần học nghe, thu âm và biểu diễn âm thanh thế nào.",
    intro: [
      "Trong phim, tiếng bước chân trên sỏi, tiếng áo khoác sột soạt, tiếng đặt ly xuống bàn thường không đến từ hiện trường. Chúng có thể được Foley Artist tái tạo trong phòng thu.",
      "Foley Artist giống một diễn viên âm thanh: xem hình, canh đúng nhịp và dùng cơ thể/đồ vật để tạo ra âm thanh khiến cảnh trở nên thật hơn.",
    ],
    definition: [
      "Foley Artist là người biểu diễn và ghi lại âm thanh đồng bộ với hình ảnh, thường là tiếng bước chân, quần áo, vật dụng, va chạm nhỏ, cử động cơ thể hoặc hành động đời thường.",
      "Khác Sound Designer có thể tạo nhiều âm thanh kỳ ảo bằng chỉnh sửa và ghép lớp, Foley Artist tập trung vào âm thanh vật lý, được diễn lại theo nhịp của cảnh.",
    ],
    responsibilities: [
      "Xem cảnh và xác định âm thanh cần tái tạo",
      "Chọn vật liệu/đạo cụ phù hợp để tạo tiếng",
      "Biểu diễn âm thanh đúng nhịp hình và đúng cảm xúc",
      "Phối hợp với recordist, sound editor, sound designer và đạo diễn âm thanh",
    ],
    appears: [
      ["Phim & Điện ảnh", "bước chân, quần áo, đồ vật, va chạm nhỏ, hành động đời thường."],
      ["Hoạt hình", "tạo âm vật lý cho nhân vật và môi trường không có thu hiện trường."],
      ["Game/Cinematic", "ghi bộ âm thanh tương tác hoặc đoạn cutscene cần cảm giác thật."],
    ],
    tasks: [
      {
        title: "Phân tích cảnh cần tiếng gì",
        body:
          "Foley Artist xem từng cảnh để biết thiếu âm nào: bước chân, tay chạm vải, mở cửa, nhặt chìa khóa, ngồi xuống ghế. Những âm nhỏ này làm cảnh có thân thể.",
        bullets: [
          ["Hành động", "nhân vật đang làm gì và âm nào nên nghe"],
          ["Chất liệu", "gỗ, đá, vải, kim loại, nước tạo tiếng khác nhau"],
          ["Khoảng cách", "âm gần/xa, mạnh/nhẹ tùy góc máy"],
        ],
      },
      {
        title: "Chọn đạo cụ và bề mặt",
        body:
          "Một đôi giày, túi cát, miếng vải, khay kim loại, rau củ, nước, giấy có thể tạo rất nhiều âm. Foley Artist sáng tạo với vật dụng đời thường.",
        bullets: [
          ["Bước chân", "giày và bề mặt phải hợp cảnh"],
          ["Quần áo", "vải dày/mỏng tạo cảm giác nhân vật khác nhau"],
          ["Đạo cụ thay thế", "dùng vật khác để tạo âm nghe giống hơn hình thật"],
        ],
      },
      {
        title: "Biểu diễn đúng nhịp hình",
        body:
          "Âm Foley phải khớp hình. Bước chân lệch nửa nhịp, tiếng đặt cốc đến chậm hoặc tiếng áo quá mạnh đều làm người xem khó chịu dù không biết vì sao.",
        bullets: [
          ["Sync", "âm khớp khoảnh khắc hành động"],
          ["Lực", "nhân vật nhẹ nhàng hay tức giận sẽ tạo tiếng khác nhau"],
          ["Nhịp diễn", "Foley cũng có diễn xuất, không chỉ tạo tiếng"],
        ],
      },
      {
        title: "Thu sạch và bàn giao cho hậu kỳ",
        body:
          "Âm Foley cần ít nhiễu, đúng mức âm lượng và tách lớp đủ để sound editor trộn vào phim. Phòng thu và cách đặt mic rất quan trọng.",
        bullets: [
          ["Micro", "đặt gần/xa để lấy đúng cảm giác"],
          ["Layer", "bước chân, quần áo, đạo cụ có thể thu riêng"],
          ["Bàn giao", "file đặt tên rõ theo cảnh/shot/hành động"],
        ],
      },
    ],
    skills: [
      { icon: "👂", label: "Tai nghe chi tiết", body: ["Cần nghe được âm nhỏ và chất liệu âm.", "Tập nhắm mắt nghe người đi qua, mở cửa, đặt đồ, chạm vải."] },
      { icon: "🎭", label: "Biểu diễn", body: ["Foley là diễn theo hình bằng âm thanh.", "Cùng một bước chân có thể sợ, vội, tự tin hoặc mệt."] },
      { icon: "🎙️", label: "Thu âm cơ bản", body: ["Biết micro, phòng yên, mức âm lượng, tránh tiếng thừa.", "Điện thoại có thể luyện, nhưng nên nghe lại bằng tai nghe tốt."] },
      { icon: "🧠", label: "Sáng tạo vật liệu", body: ["Âm nghe thật không nhất thiết đến từ vật thật.", "Thử dùng rau, giấy, vải, cát, kim loại để tạo tiếng khác nhau."] },
      { icon: "⏱️", label: "Canh nhịp", body: ["Âm phải khớp hình như diễn viên khớp lời thoại.", "Tập xem video câm và tạo tiếng đúng thời điểm."] },
      { icon: "🤝", label: "Phối hợp hậu kỳ", body: ["Foley đi cùng sound editor/designer.", "Cần đặt tên file và ghi chú để người trộn âm dùng dễ."] },
    ],
    path: [
      ["Tập nghe đời thường", "Ghi lại 20 âm quanh nhà/trường và mô tả chất liệu, lực, khoảng cách."],
      ["Làm Foley cho video câm", "Chọn clip 30 giây, tự tạo bước chân, đồ vật, quần áo."],
      ["Học thu âm sạch", "Dùng micro/điện thoại trong phòng yên, kiểm tra nhiễu và mức âm."],
      ["Tạo thư viện âm nhỏ", "Bước chân nhiều bề mặt, cửa, giấy, vải, kim loại, nước."],
      ["Làm với phim sinh viên/animation", "Dự án ngắn giúp bạn hiểu deadline và sync thật."],
      ["Xây before/after", "Show cảnh không Foley và bản có Foley để chứng minh tác dụng."],
    ],
  },
  {
    id: "b668d06c-6aa9-414d-874c-26bfa5aa8ec3",
    slug: "nghe-line-producer",
    title: "Line Producer",
    viet: "Quản lý sản xuất trực tiếp",
    summary:
      "Người quản lý phần sản xuất thực tế của phim/hoạt hình: ngân sách, lịch, nhân sự, địa điểm, thiết bị và các nguồn lực để dự án quay/làm được.",
    metaTitle: "Line Producer là gì? Công việc, kỹ năng và lộ trình | CINS",
    metaDescription:
      "Line Producer làm gì trong phim và hoạt hình, khác Producer ra sao, cần học ngân sách, lịch sản xuất và điều phối như thế nào.",
    intro: [
      "Một ý tưởng phim có thể rất hay, nhưng nếu không có lịch quay, ngân sách, ekip, thiết bị, địa điểm, hợp đồng và phương án dự phòng, nó sẽ không thành sản phẩm. Line Producer là người biến kế hoạch sáng tạo thành kế hoạch sản xuất chạy được.",
      "Vai trò này ít xuất hiện trên poster nhưng ảnh hưởng trực tiếp đến việc dự án có quay/làm đúng hạn, đúng tiền và ít hỗn loạn hay không.",
    ],
    definition: [
      "Line Producer là người quản lý sản xuất trực tiếp của phim, series, quảng cáo, hoạt hình hoặc dự án nội dung lớn. Họ theo sát ngân sách, lịch, nhân sự, thiết bị, địa điểm, giấy tờ, vendor và rủi ro production.",
      "Khác Producer thường bao quát cả phát triển dự án, gọi vốn, quan hệ và chiến lược, Line Producer tập trung nhiều vào phần vận hành hằng ngày để sản xuất thật sự diễn ra.",
    ],
    responsibilities: [
      "Lập và theo dõi ngân sách sản xuất",
      "Xây lịch quay/lịch sản xuất, phân bổ nhân sự và nguồn lực",
      "Điều phối địa điểm, thiết bị, hợp đồng, vendor và logistics",
      "Xử lý rủi ro phát sinh để đội sáng tạo có thể làm việc",
    ],
    appears: [
      ["Phim & Điện ảnh", "quản lý quay phim, ekip, địa điểm, thiết bị, chi phí."],
      ["Hoạt hình", "theo dõi lịch sản xuất tập/shot, nhân sự, vendor và delivery."],
      ["Quảng cáo/MV", "điều phối sản xuất ngắn hạn với deadline và ngân sách chặt."],
    ],
    tasks: [
      {
        title: "Chuyển kịch bản thành nhu cầu sản xuất",
        body:
          "Line Producer đọc kịch bản để biết cần bao nhiêu ngày quay, địa điểm, diễn viên, đạo cụ, VFX, phục trang, thiết bị và nhân sự.",
        bullets: [
          ["Breakdown", "tách kịch bản thành cảnh, địa điểm, người, đồ, kỹ thuật"],
          ["Nguồn lực", "cần ai, cần gì, trong bao lâu"],
          ["Rủi ro", "cảnh đêm, mưa, đông người, trẻ em, stunt, VFX đều cần tính trước"],
        ],
      },
      {
        title: "Lập ngân sách và lịch",
        body:
          "Line Producer cân bằng giữa mong muốn sáng tạo và giới hạn thực tế. Một quyết định thêm ngày quay hoặc đổi địa điểm có thể kéo theo nhiều chi phí.",
        bullets: [
          ["Ngân sách", "ước tính và theo dõi chi phí theo hạng mục"],
          ["Lịch", "xếp cảnh theo địa điểm, diễn viên, ánh sáng, hiệu quả sản xuất"],
          ["Dự phòng", "giữ buffer cho thời tiết, thiết bị, sức khỏe, thay đổi yêu cầu"],
        ],
      },
      {
        title: "Điều phối sản xuất hằng ngày",
        body:
          "Khi production chạy, Line Producer cần biết hôm nay ai ở đâu, thiết bị nào đến chưa, chi phí đang thế nào và vấn đề nào cần quyết ngay.",
        bullets: [
          ["Call sheet", "thông tin ngày quay/ngày làm việc rõ cho ekip"],
          ["Logistics", "di chuyển, ăn uống, địa điểm, thiết bị, giấy phép"],
          ["Quyết định nhanh", "xử lý khi lịch trễ, thiếu người, thiếu đồ, phát sinh chi phí"],
        ],
      },
      {
        title: "Giữ dự án không vượt kiểm soát",
        body:
          "Line Producer không chỉ nói 'không'. Họ tìm cách giữ phần sáng tạo quan trọng trong khi giảm lãng phí, đổi phương án hoặc thương lượng nguồn lực.",
        bullets: [
          ["Theo dõi chi phí", "biết hạng mục nào đang vượt"],
          ["Thay phương án", "đổi địa điểm, gộp ngày, đơn giản hóa phần phụ"],
          ["Báo cáo", "producer/đạo diễn biết tình hình thật để quyết định"],
        ],
      },
    ],
    skills: [
      { icon: "📊", label: "Ngân sách", body: ["Cần hiểu chi phí theo người, ngày, thiết bị, địa điểm, hậu kỳ.", "Tập lập budget giả cho phim ngắn 3 phút để thấy các khoản ẩn."] },
      { icon: "📅", label: "Lập lịch", body: ["Sản xuất phụ thuộc lịch người, địa điểm, ánh sáng, thiết bị.", "Tập xếp lịch quay ít ngày nhất cho một kịch bản ngắn."] },
      { icon: "💬", label: "Giao tiếp", body: ["Line Producer nói chuyện với rất nhiều bộ phận.", "Thông tin phải rõ, đúng lúc, không để ekip đoán."] },
      { icon: "🧠", label: "Giải quyết vấn đề", body: ["Production luôn có phát sinh.", "Học đưa 2-3 phương án thay vì chỉ báo vấn đề."] },
      { icon: "🤝", label: "Thương lượng", body: ["Cần làm việc với vendor, địa điểm, ekip, khách hàng.", "Thương lượng tốt là giữ quan hệ và giữ dự án chạy được."] },
      { icon: "🔍", label: "Tỉ mỉ", body: ["Một thiếu sót nhỏ có thể làm cả ngày quay trễ.", "Checklist, bảng theo dõi và giấy tờ là công cụ quan trọng."] },
    ],
    path: [
      ["Tham gia production nhỏ", "Phim sinh viên, MV, quảng cáo CLB, sự kiện giúp hiểu hiện trường."],
      ["Học breakdown kịch bản", "Tách từng cảnh thành người, đồ, địa điểm, kỹ thuật, thời gian."],
      ["Tập lập budget/lịch", "Làm bảng chi phí và lịch quay cho dự án giả hoặc dự án thật nhỏ."],
      ["Làm trợ lý sản xuất", "Runner, production assistant, coordinator là cửa vào thực tế."],
      ["Ghi lại case xử lý phát sinh", "Portfolio/kinh nghiệm production nên có vấn đề, cách xử lý, kết quả."],
      ["Đi dần lên line producer", "Vai trò này cần kinh nghiệm hiện trường và khả năng chịu áp lực tốt."],
    ],
  },
  {
    id: "1ed9f2e4-4717-4098-b8be-950d78d805d2",
    slug: "nghe-previs-artist",
    title: "Previs Artist",
    viet: "Họa sĩ dựng cảnh thử",
    summary:
      "Người dựng bản nháp hình ảnh/chuyển động trước khi quay hoặc sản xuất chính để kiểm tra góc máy, hành động, nhịp cảnh và phương án kỹ thuật.",
    metaTitle: "Previs Artist là gì? Công việc, kỹ năng và lộ trình | CINS",
    metaDescription:
      "Previs Artist làm gì trong phim, hoạt hình, VFX; cần học storyboard, 3D, camera và dựng cảnh ra sao.",
    intro: [
      "Trước khi quay một cảnh hành động đắt tiền hoặc làm một sequence VFX phức tạp, đội cần biết camera sẽ đi đâu, nhân vật di chuyển thế nào, cảnh dài bao lâu và có khả thi không. Previs Artist dựng bản thử để trả lời các câu hỏi đó.",
      "Previs không cần đẹp như bản cuối. Nó cần rõ: nhìn được hành động, nhịp, góc máy, scale và vấn đề kỹ thuật trước khi tốn nhiều tiền sản xuất.",
    ],
    definition: [
      "Previs Artist là người tạo bản dựng hình ảnh sơ bộ cho phim, hoạt hình, quảng cáo, VFX hoặc game cinematic. Họ có thể dùng 3D đơn giản, storyboard, camera animation và dựng nháp để mô phỏng cảnh.",
      "Vai trò này nằm giữa storyboard, layout, animation và kỹ thuật quay/VFX. Mục tiêu là giúp đạo diễn và production quyết định trước khi sản xuất chính.",
    ],
    responsibilities: [
      "Dựng bản nháp cảnh/sequence bằng 3D hoặc hình đơn giản",
      "Thiết kế góc máy, chuyển động camera, nhịp hành động và bố cục",
      "Kiểm tra scale, timing, staging và khả năng quay/VFX",
      "Cập nhật bản previs theo feedback của director, VFX supervisor hoặc stunt/camera team",
    ],
    appears: [
      ["Hoạt hình", "layout cảnh, camera, nhịp sequence trước animation final."],
      ["VFX & Motion Graphics", "cảnh phức tạp cần tính trước kỹ thuật và compositing."],
      ["Phim & Điện ảnh", "hành động, chase, stunt, cảnh nhiều nhân vật hoặc camera khó."],
    ],
    tasks: [
      {
        title: "Hiểu cảnh cần kiểm tra điều gì",
        body:
          "Previs có thể dùng để kiểm tra nhịp, góc máy, hành động, VFX, stunt hoặc chi phí. Biết mục tiêu giúp bản previs không sa vào làm đẹp thừa.",
        bullets: [
          ["Câu hỏi chính", "camera nhìn được không, hành động rõ không, cảnh dài bao lâu"],
          ["Giới hạn", "địa điểm, thiết bị, diễn viên, kỹ thuật có đáp ứng không"],
          ["Mức chi tiết", "chỉ làm đủ để quyết định"],
        ],
      },
      {
        title: "Dựng không gian và nhân vật đơn giản",
        body:
          "Previs thường dùng model đơn giản để đại diện bối cảnh và nhân vật. Quan trọng là tỷ lệ, vị trí và chuyển động đọc được.",
        bullets: [
          ["Scale", "kích thước không gian, nhân vật, vật thể đúng tương đối"],
          ["Blocking", "ai đi đâu, đứng đâu, nhìn đâu"],
          ["Placeholder", "dùng hình tạm nhưng rõ chức năng"],
        ],
      },
      {
        title: "Thiết kế camera và nhịp cảnh",
        body:
          "Camera trong previs giúp đạo diễn xem cảnh trước khi quay. Artist thử nhiều góc, đường camera và cut để tìm phương án hiệu quả.",
        bullets: [
          ["Camera", "góc, tiêu cự, chuyển động, khoảng cách"],
          ["Cut", "cắt ở đâu để hành động rõ và có lực"],
          ["Timing", "cảnh nhanh/chậm, khoảng ngừng, điểm nhấn"],
        ],
      },
      {
        title: "Cập nhật theo feedback production",
        body:
          "Previs là công cụ ra quyết định, nên sửa nhiều vòng. Feedback có thể đến từ đạo diễn, quay phim, VFX, stunt, producer hoặc animation lead.",
        bullets: [
          ["Phiên bản", "lưu các bản để so hướng"],
          ["Ghi chú", "vì sao đổi camera, rút cảnh, thêm shot"],
          ["Bàn giao", "video, file scene hoặc shot list cho đội tiếp theo"],
        ],
      },
    ],
    skills: [
      { icon: "🎬", label: "Ngôn ngữ điện ảnh", body: ["Cần hiểu góc máy, cỡ cảnh, nhịp dựng, staging.", "Xem cảnh hành động và vẽ lại shot list để học cách kể bằng camera."] },
      { icon: "🧊", label: "3D cơ bản", body: ["Previs cần dựng nhanh không gian và camera.", "Blender/Maya/Unreal đều có thể dùng tùy pipeline."] },
      { icon: "⏱️", label: "Timing", body: ["Cảnh có rõ và có lực hay không phụ thuộc nhiều vào nhịp.", "Tập dựng 10 giây hành động với nhiều tốc độ khác nhau."] },
      { icon: "👁️", label: "Bố cục", body: ["Dù bản nháp, khung hình vẫn phải đọc được.", "Không cần đẹp final nhưng cần biết người xem nhìn đâu."] },
      { icon: "🔧", label: "Tư duy production", body: ["Previs phục vụ quay/VFX/animation thật.", "Luôn hỏi: cảnh này giúp đội quyết định được điều gì?"] },
      { icon: "🤝", label: "Sửa nhanh", body: ["Previs thay đổi nhiều theo góp ý.", "Cần làm nhanh, rõ version và không quá tiếc chi tiết tạm."] },
    ],
    path: [
      ["Học storyboard và camera", "Hiểu cỡ cảnh, góc máy, chuyển động camera, shot continuity."],
      ["Học 3D layout cơ bản", "Dựng không gian đơn giản, đặt camera, animate chuyển động thô."],
      ["Làm sequence ngắn", "Một cảnh rượt đuổi 15 giây, một cảnh đối thoại, một cú máy khó."],
      ["Dựng animatic/previs", "Xuất video có nhịp, camera và âm thanh tạm nếu cần."],
      ["Show breakdown", "Bản script/storyboard → previs → shot list hoặc bản final nếu có."],
      ["Ứng tuyển layout/previs junior", "Có thể vào từ storyboard, layout, animation hoặc 3D generalist thiên camera."],
    ],
  },
  {
    id: "64455109-16f9-40ac-b337-51543267b546",
    slug: "nghe-product-designer",
    title: "Product Designer",
    viet: "Nhà thiết kế sản phẩm số",
    summary:
      "Người thiết kế trải nghiệm và giao diện của sản phẩm số, cân bằng nhu cầu người dùng, mục tiêu sản phẩm, khả năng kỹ thuật và hệ thống thiết kế.",
    metaTitle: "Product Designer là gì? Công việc, kỹ năng và lộ trình | CINS",
    metaDescription:
      "Product Designer làm gì trong app/web, khác UI Designer và UX Designer ra sao, sinh viên cần học gì để bắt đầu.",
    intro: [
      "Một app dễ dùng không chỉ nhờ nút đẹp. Người dùng phải hiểu mình đang ở đâu, làm gì tiếp, vì sao lỗi xảy ra và cách hoàn thành mục tiêu nhanh nhất. Product Designer thiết kế trải nghiệm đó.",
      "Product Designer nằm giữa người dùng, sản phẩm, kinh doanh và kỹ thuật. Họ không chỉ vẽ màn hình, mà còn hỏi: vấn đề thật là gì, giải pháp này có đáng làm không, và khi build xong người dùng có dùng được không?",
    ],
    definition: [
      "Product Designer là người thiết kế sản phẩm số như app, website, dashboard, công cụ nội bộ hoặc nền tảng cộng đồng. Họ làm research, luồng trải nghiệm, wireframe, UI, prototype, handoff và cải tiến sau khi có dữ liệu.",
      "Khác UI Designer tập trung nhiều vào giao diện, Product Designer thường tham gia rộng hơn vào vấn đề sản phẩm, hành trình người dùng, ưu tiên tính năng và đo hiệu quả.",
    ],
    responsibilities: [
      "Hiểu vấn đề người dùng và mục tiêu sản phẩm",
      "Thiết kế user flow, wireframe, UI, prototype và trạng thái tương tác",
      "Làm việc với PM, developer, researcher, data, marketing hoặc khách hàng",
      "Kiểm tra, học từ phản hồi/dữ liệu và cải tiến sản phẩm sau khi ra mắt",
    ],
    appears: [
      ["UI/UX Design", "app, web, dashboard, design system, user flow, prototype."],
      ["Thiết kế đồ họa", "nền visual giúp giao diện rõ, đẹp và đúng brand."],
      ["Startup/Product team", "thiết kế tính năng mới, cải thiện chuyển đổi, giảm lỗi người dùng."],
    ],
    tasks: [
      {
        title: "Hiểu vấn đề trước khi vẽ màn hình",
        body:
          "Một lỗi phổ biến là mở Figma quá sớm. Product Designer cần hiểu người dùng đang kẹt ở đâu, mục tiêu của sản phẩm là gì và ràng buộc kỹ thuật/kinh doanh ra sao.",
        bullets: [
          ["User problem", "người dùng cần hoàn thành việc gì"],
          ["Business goal", "sản phẩm cần tăng gì, giảm gì, học gì"],
          ["Constraint", "deadline, kỹ thuật, data, pháp lý, nội dung có giới hạn nào"],
        ],
      },
      {
        title: "Thiết kế luồng và cấu trúc thông tin",
        body:
          "Trước khi làm UI đẹp, cần biết người dùng đi qua các bước nào. Luồng tốt giúp ít lạc, ít lỗi và ít phải hỏi.",
        bullets: [
          ["User flow", "từ điểm bắt đầu đến mục tiêu cuối"],
          ["Information architecture", "thông tin nào đặt ở đâu, nhóm thế nào"],
          ["Edge case", "lỗi, trống dữ liệu, loading, quyền truy cập, hủy thao tác"],
        ],
      },
      {
        title: "Thiết kế giao diện và prototype",
        body:
          "Product Designer tạo wireframe, UI và prototype để đội xem trước trải nghiệm. Giao diện cần rõ, dễ dùng, đúng brand và có thể build.",
        bullets: [
          ["Wireframe", "bố cục và chức năng trước khi chăm visual"],
          ["UI", "màu, chữ, component, spacing, trạng thái"],
          ["Prototype", "mô phỏng tương tác để test và trao đổi"],
        ],
      },
      {
        title: "Bàn giao và cải tiến sau khi ra mắt",
        body:
          "Thiết kế không kết thúc khi giao file. Product Designer cần làm với dev để build đúng, rồi xem phản hồi/dữ liệu để cải tiến.",
        bullets: [
          ["Handoff", "component, specs, states, responsive, copy rõ"],
          ["QA", "kiểm tra sản phẩm build có lệch thiết kế hoặc khó dùng không"],
          ["Iteration", "dựa vào phản hồi thật để sửa tiếp"],
        ],
      },
    ],
    skills: [
      { icon: "🧠", label: "Tư duy sản phẩm", body: ["Cần hiểu vấn đề, mục tiêu, ràng buộc và trade-off.", "Luôn hỏi: tính năng này giúp ai, trong tình huống nào, bằng chứng là gì?"] },
      { icon: "👥", label: "Hiểu người dùng", body: ["Product Designer phải quan sát hành vi thật, không chỉ đoán.", "Tập phỏng vấn bạn bè về cách họ dùng một app quen thuộc."] },
      { icon: "📐", label: "Luồng và cấu trúc", body: ["Flow rõ giúp sản phẩm dễ dùng hơn rất nhiều.", "Vẽ sơ đồ bước trước khi vẽ UI chi tiết."] },
      { icon: "🎨", label: "UI visual", body: ["Màu, chữ, spacing, component, hierarchy làm giao diện rõ và tin cậy.", "Học design system và copy các app tốt để hiểu nguyên tắc."] },
      { icon: "💬", label: "Giao tiếp với dev/PM", body: ["Thiết kế cần build được và phục vụ roadmap.", "Biết giải thích lý do thiết kế, nghe constraint kỹ thuật và điều chỉnh hợp lý."] },
      { icon: "🔍", label: "Kiểm tra và học", body: ["Không có thiết kế đúng mãi ngay từ đầu.", "Test prototype, xem analytics, đọc feedback để cải tiến."] },
    ],
    path: [
      ["Học UI/UX nền tảng", "Hierarchy, typography, spacing, component, flow, heuristic usability."],
      ["Chọn một vấn đề nhỏ", "Ví dụ: đăng ký CLB, đặt lịch học, quản lý bài tập, tìm lớp học."],
      ["Làm case study đầy đủ", "Problem → user flow → wireframe → UI → prototype → test → sửa."],
      ["Học Figma và handoff", "Component, auto layout, variants, responsive, design specs."],
      ["Làm với developer", "Một sản phẩm nhỏ được build thật dạy bạn nhiều hơn file đẹp không chạy."],
      ["Ứng tuyển intern/junior", "Portfolio nên giải thích tư duy, không chỉ show màn hình cuối."],
    ],
  },
];

function list(items: string[]): string {
  return items.map((x) => `    <li>${x}</li>`).join("\n");
}

function render(job: Job): string {
  return `<section class="arc-intro">
  <p>${job.intro[0]}</p>
  <p>${job.intro[1]}</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>${job.title} là ai?</h2>
  <p>${job.definition[0]}</p>
  <p>${job.definition[1]}</p>
  <p>Với học sinh THPT hoặc sinh viên, có thể hiểu nghề này như một hướng chuyên môn để thử từ dự án nhỏ: bài tập lớp, câu lạc bộ, phim ngắn, game jam, sản phẩm số hoặc portfolio cá nhân.</p>
  <ul class="arc-list">
${list(job.responsibilities)}
  </ul>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Xuất hiện ở đâu?</span>
    <p>${job.appears.map(([k, v]) => `<strong>${k}</strong> — ${v}`).join("<br>\n    ")}</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Công việc của một ${job.title}</h2>
${job.tasks
  .map(
    (task, i) => `
  <div class="arc-job-item">
    <h3 class="arc-h3">${i + 1}. ${task.title}</h3>
    <p>${task.body}</p>
    <ul class="arc-list">
${task.bullets.map(([k, v]) => `      <li><strong>${k}</strong> — ${v}</li>`).join("\n")}
    </ul>
  </div>`,
  )
  .join("\n")}
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>${job.title} cần giỏi gì?</h2>

  <div class="arc-skill-grid">
${job.skills
  .map(
    (s) => `    <div class="arc-skill-icon-item">
      <span class="arc-skill-emoji">${s.icon}</span>
      <span>${s.label}</span>
    </div>`,
  )
  .join("\n")}
  </div>

  <div class="arc-accordion">
${job.skills
  .map(
    (s, i) => `    <details class="arc-card"${i === 0 ? " open" : ""}>
      <summary>${s.label}</summary>
      <div class="arc-card-body">
        <p>${s.body[0]}</p>
        <p>${s.body[1]}</p>
      </div>
    </details>`,
  )
  .join("\n\n")}
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Làm cách nào để trở thành ${job.title}?</h2>
  <div class="arc-path">
${job.path
  .map(
    ([title, body], i) => `    <div class="arc-path-step">
      <div class="arc-step-num">${i + 1}</div>
      <div class="arc-step-body">
        <strong>${title}</strong>
        <p>${body}</p>
      </div>
    </div>`,
  )
  .join("\n\n")}
  </div>
</section>`;
}

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

async function main() {
  console.log(APPLY ? "MODE: APPLY" : "MODE: DRY-RUN (pass --apply)");
  for (const job of jobs) {
    const html = render(job);
    console.log(`${job.slug}: ${html.length} chars`);
    if (!APPLY) continue;
    const rows = await sql`
      UPDATE article_bai_viet SET
        tieu_de_viet = ${job.viet},
        tom_tat = ${job.summary},
        meta_title = ${job.metaTitle},
        meta_description = ${job.metaDescription},
        trang_thai_noi_dung = 'published',
        noi_dung = ${html},
        cap_nhat_luc = now()
      WHERE id = ${job.id}::uuid
        AND loai_bai_viet = 'nghe'
      RETURNING slug, length(noi_dung)::int AS len
    `;
    if (!rows.length) {
      console.error(`No row updated: ${job.slug}`);
      process.exit(1);
    }
    console.log("OK", rows[0]);
  }
  if (APPLY) {
    const verify = await sql`
      SELECT slug, tieu_de_eng, tieu_de_viet, length(noi_dung)::int AS len,
        (noi_dung LIKE '%Xuất hiện ở đâu%') AS has_fields_box,
        (noi_dung LIKE '%học sinh%' OR noi_dung LIKE '%sinh viên%') AS has_audience
      FROM article_bai_viet
      WHERE id = ANY(${jobs.map((j) => j.id)}::uuid[])
      ORDER BY slug
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
