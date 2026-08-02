/**
 * Apply rewrite batch 1 for merged nghề canonicals.
 * Audience: HS THPT & Sinh viên. Vietnamese-first, English only for necessary role/tool names.
 *
 * Usage:
 *   npx tsx scripts/apply-nghe-rewrite-batch1.mts --apply
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
  tasks: {
    title: string;
    body: string;
    bullets: [string, string][];
    image?: [string, string];
  }[];
  skills: {
    icon: string;
    label: string;
    title: string;
    body: [string, string];
  }[];
  path: [string, string][];
};

const jobs: Job[] = [
  {
    id: "ed2ada16-7d9c-40bb-a9b5-843ca9e85e0e",
    slug: "nghe-colorist",
    title: "Colorist",
    viet: "Người chỉnh màu",
    summary:
      "Người chỉnh màu giúp hình ảnh có cảm xúc và sự nhất quán — từ phim, hoạt hình, video quảng cáo đến truyện tranh — bằng cách điều chỉnh màu, sáng tối và độ tương phản.",
    metaTitle: "Colorist là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Colorist làm gì, cần học màu sắc ra sao và học sinh/sinh viên nên bắt đầu thế nào để theo nghề chỉnh màu.",
    intro: [
      "Cùng một cảnh quay trong lớp học: nếu màu xanh lạnh, bạn thấy cô đơn; nếu màu vàng ấm, bạn thấy hoài niệm; nếu tương phản mạnh, cảnh trở nên căng thẳng. Người giúp hình ảnh đi đúng cảm xúc đó là Colorist.",
      "Colorist không chỉ “kéo filter cho đẹp”. Họ đọc câu chuyện, hiểu cảm xúc cảnh, rồi chỉnh màu, sáng tối và độ tương phản để toàn bộ sản phẩm có một giọng hình ảnh thống nhất.",
    ],
    definition: [
      "Colorist là người chỉnh màu cho hình ảnh sau khi đã quay, vẽ hoặc dựng xong. Trong phim và video, họ làm việc ở giai đoạn hậu kỳ. Trong hoạt hình, VFX hoặc truyện tranh, vai trò này có thể gần với người giữ màu và không khí hình ảnh.",
      "Nếu Editor sắp xếp nhịp cắt, Compositor ghép các lớp hình, thì Colorist giúp hình ảnh cuối cùng có cảm xúc đúng và không bị cảnh này một màu, cảnh kia một màu vô lý.",
    ],
    responsibilities: [
      "Cân bằng màu giữa nhiều cảnh để hình ảnh không bị lệch",
      "Tạo không khí: ấm, lạnh, u tối, tươi sáng, cổ điển hoặc hiện đại",
      "Giữ màu da, ánh sáng và vùng tối/sáng trông tự nhiên khi cần",
      "Phối hợp với đạo diễn, quay phim, người dựng hoặc đội hình ảnh để chốt bản cuối",
    ],
    appears: [
      ["Phim & Điện ảnh", "chỉnh màu cảnh quay sau khi dựng, giữ cảm xúc từng phân đoạn."],
      ["Hoạt hình & VFX", "đảm bảo màu, ánh sáng và không khí thống nhất sau nhiều khâu sản xuất."],
      ["Video quảng cáo", "làm sản phẩm đúng màu thương hiệu và nổi bật trên nhiều nền tảng."],
      ["Comic & Minh họa", "gần với người tô màu/giữ bảng màu để trang truyện có nhịp và cảm xúc rõ."],
    ],
    tasks: [
      {
        title: "Cân bằng màu trước khi làm đẹp",
        body:
          "Việc đầu tiên thường không phải tạo màu “ngầu”, mà là sửa những thứ lệch: cảnh quá xanh, da quá đỏ, vùng tối mất chi tiết, cảnh trước và cảnh sau không khớp nhau.",
        bullets: [
          ["Cân bằng trắng", "giúp màu trắng/trung tính không bị ám xanh, vàng hoặc đỏ quá mức"],
          ["Cân bằng sáng tối", "giữ vùng sáng không cháy và vùng tối không bị bệt"],
          ["Khớp giữa các cảnh", "để một cuộc đối thoại không bị mỗi góc máy một màu"],
        ],
        image: ["cân bằng màu trước sau trong cảnh phim", "Cân bằng màu là nền móng; nếu nền sai, mọi hiệu ứng màu phía sau đều dễ giả."],
      },
      {
        title: "Tạo cảm xúc bằng màu",
        body:
          "Sau khi hình ảnh đã ổn, Colorist bắt đầu tạo “chất” cho sản phẩm. Cảnh hồi tưởng có thể mềm và ít tương phản; cảnh hành động có thể mạnh, tối và gắt hơn; cảnh tuổi học trò có thể sáng, nhẹ, nhiều không khí.",
        bullets: [
          ["Bảng màu chính", "nhóm màu lặp lại để người xem nhớ cảm giác của tác phẩm"],
          ["Tương phản", "độ chênh sáng tối giúp cảnh dịu, căng hoặc kịch tính"],
          ["Nhịp màu", "màu thay đổi theo cảm xúc câu chuyện chứ không tùy hứng"],
        ],
      },
      {
        title: "Giữ màu đúng khi xuất ra nhiều nơi",
        body:
          "Một video có thể chiếu trên rạp, điện thoại, màn hình lớp học, YouTube hoặc mạng xã hội. Colorist phải hiểu bản xuất cuối sẽ xem ở đâu để màu không bị quá tối, quá rực hoặc mất chi tiết.",
        bullets: [
          ["Màn hình khác nhau", "điện thoại, laptop, rạp chiếu có cách hiển thị màu khác nhau"],
          ["Bản xuất", "phiên bản cuối phù hợp nơi đăng/chiếu"],
          ["Kiểm tra lần cuối", "soát lỗi màu, nhấp nháy, cảnh lệch trước khi giao"],
        ],
      },
      {
        title: "Nói chuyện với đội sáng tạo",
        body:
          "Colorist không làm một mình. Họ cần hiểu ý đạo diễn, quay phim, Art Director hoặc người dựng muốn cảnh này đem lại cảm giác gì. Cùng một màu xanh có thể là lạnh lẽo, công nghệ, buồn hoặc huyền bí.",
        bullets: [
          ["Hỏi đúng cảm xúc", "cảnh này cần làm người xem thấy gì?"],
          ["Đưa lựa chọn", "thường có 2–3 hướng màu để so sánh"],
          ["Giải thích bằng hình", "cho xem trước/sau thay vì chỉ nói bằng cảm tính"],
        ],
        image: ["người chỉnh màu họp với đạo diễn xem màn hình trước sau", "Colorist cần thuyết phục bằng hình ảnh, không chỉ bằng thuật ngữ kỹ thuật."],
      },
    ],
    skills: [
      {
        icon: "🎨",
        label: "Cảm giác màu",
        title: "Cảm giác màu",
        body: [
          "Bạn cần nhận ra màu nào đang làm cảnh bị sai cảm xúc. Màu đẹp không phải lúc nào cũng hợp câu chuyện.",
          "Hãy phân tích cảnh phim, ảnh quảng cáo, bìa truyện: vì sao cảnh này thấy lạnh, cảnh kia thấy ấm, cảnh khác thấy ngột ngạt?",
        ],
      },
      {
        icon: "👁️",
        label: "Mắt nhìn chi tiết",
        title: "Mắt nhìn chi tiết",
        body: [
          "Colorist soi những lỗi nhỏ: da hơi đỏ, vùng tối mất chi tiết, cảnh sau sáng hơn cảnh trước dù cùng một phòng.",
          "Tập so ảnh trước/sau và ghi ra chính xác mình đã thấy gì, thay vì chỉ nói “hơi kỳ”.",
        ],
      },
      {
        icon: "🎬",
        label: "Hiểu câu chuyện",
        title: "Hiểu câu chuyện",
        body: [
          "Màu phải phục vụ cảm xúc. Nếu nhân vật đang sợ, vui, nhớ nhà hoặc trưởng thành, màu có thể giúp người xem cảm thấy điều đó.",
          "Xem phim không chỉ xem nội dung; hãy dừng ở vài cảnh và hỏi: màu đang kể thêm điều gì?",
        ],
      },
      {
        icon: "🖥️",
        label: "Biết phần mềm chỉnh màu",
        title: "Biết phần mềm chỉnh màu",
        body: [
          "DaVinci Resolve là công cụ phổ biến, nhưng phần mềm chỉ là dụng cụ. Quan trọng hơn là hiểu mình đang sửa gì và vì sao.",
          "Bắt đầu bằng bản miễn phí, học cân bằng sáng tối, màu da, độ tương phản và so sánh trước/sau.",
        ],
      },
      {
        icon: "🤝",
        label: "Giao tiếp",
        title: "Giao tiếp",
        body: [
          "Đạo diễn có thể nói “muốn buồn hơn” chứ không nói thông số màu. Colorist phải dịch cảm xúc đó thành lựa chọn hình ảnh.",
          "Tập hỏi lại bằng ví dụ: buồn kiểu lạnh lẽo, hoài niệm hay ngột ngạt?",
        ],
      },
      {
        icon: "⏱️",
        label: "Kiên nhẫn",
        title: "Kiên nhẫn",
        body: [
          "Chỉnh màu là công việc lặp đi lặp lại: sửa một cảnh, so với cảnh trước, xuất thử, rồi sửa tiếp.",
          "Nếu bạn thích chăm chút chi tiết nhỏ và không ngại xem đi xem lại, đây là điểm mạnh lớn.",
        ],
      },
    ],
    path: [
      ["Học nền màu và ánh sáng", "Bắt đầu từ ảnh, phim, tranh: sáng/tối, tương phản, màu nóng/lạnh, màu da. Không cần thiết bị đắt tiền ngay."],
      ["Tập chỉnh ảnh và video ngắn", "Dùng ảnh điện thoại hoặc video lớp/CLB để luyện trước-sau. Mục tiêu là nhìn rõ vấn đề, không chỉ áp màu có sẵn."],
      ["Học một phần mềm chỉnh màu", "DaVinci Resolve là lựa chọn tốt để bắt đầu. Học từng bước: cân bằng, chỉnh vùng sáng tối, chỉnh màu da, xuất bản cuối."],
      ["Làm dự án nhỏ có câu chuyện", "Chỉnh màu cho phim ngắn, MV sinh viên, video câu lạc bộ hoặc trailer game nhỏ. Có câu chuyện sẽ giúp màu có lý do."],
      ["Lưu lại quá trình trước/sau", "Hồ sơ năng lực nên có hình trước/sau, giải thích mục tiêu cảm xúc và những lỗi đã sửa."],
      ["Tìm cơ hội ở hậu kỳ/video/studio", "Có thể bắt đầu từ dựng video, trợ lý hậu kỳ, chỉnh ảnh, hoặc làm video cho CLB. Khi mắt màu tốt dần, bạn tiến gần hơn vai trò Colorist."],
    ],
  },
  {
    id: "0bb41ed0-9fba-4391-91af-20159057734c",
    slug: "nghe-compositor",
    title: "Compositor",
    viet: "Người ghép hình kỹ xảo",
    summary:
      "Người ghép nhiều lớp hình ảnh — cảnh quay, 3D, nền, khói lửa, ánh sáng — thành một khung hình liền mạch để người xem không nhận ra đâu là phần ghép.",
    metaTitle: "Compositor là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Compositor làm gì trong phim, hoạt hình và VFX; cần học hình ảnh, ánh sáng, tách ghép lớp ra sao để bắt đầu.",
    intro: [
      "Một nhân vật đứng trước con rồng, phía sau là thành phố cháy, trên trời có khói và tia lửa — nhưng ngoài đời trường quay chỉ có phông xanh và vài đạo cụ. Người ghép các phần đó thành một khung hình tin được là Compositor.",
      "Compositor không chỉ “dán hình vào nhau”. Họ phải làm cho ánh sáng, màu, hạt nhiễu, viền tóc, bóng đổ và chuyển động khớp đến mức người xem quên rằng cảnh đó được ghép.",
    ],
    definition: [
      "Compositor là người ghép nhiều lớp hình ảnh thành một cảnh cuối: cảnh quay thật, nhân vật 3D, nền vẽ, khói lửa, màn hình điện thoại, bầu trời, hiệu ứng ánh sáng hoặc phần cần xóa/sửa.",
      "Nếu Colorist chỉnh màu cho cảm xúc cuối, Compositor xử lý việc các lớp hình có hòa vào nhau hay không. Một cảnh kỹ xảo tốt là cảnh người xem không bị kéo ra khỏi câu chuyện.",
    ],
    responsibilities: [
      "Ghép các lớp hình ảnh thành một khung hình liền mạch",
      "Tách chủ thể khỏi nền, sửa viền, thêm bóng và ánh sáng phù hợp",
      "Xóa hoặc thay thế chi tiết không mong muốn trong cảnh quay",
      "Phối hợp với đội 3D, quay phim, dựng phim và chỉnh màu",
    ],
    appears: [
      ["Phim & Điện ảnh", "ghép kỹ xảo vào cảnh quay thật: quái vật, cháy nổ, màn hình, bầu trời."],
      ["VFX & Motion Graphics", "làm các lớp hình, chữ, hiệu ứng và vật thể số hòa thành một cảnh."],
      ["Hoạt hình", "ghép nhân vật, nền, ánh sáng, hiệu ứng và màu để ra khung hình hoàn chỉnh."],
    ],
    tasks: [
      {
        title: "Tách và chuẩn bị các lớp hình",
        body:
          "Trước khi ghép, Compositor cần tách phần cần giữ, bỏ phần không cần, làm sạch nền hoặc chuẩn bị từng lớp hình. Đây là phần rất tỉ mỉ, nhất là tóc, khói, kính, nước hoặc vật thể trong suốt.",
        bullets: [
          ["Tách chủ thể", "giữ nhân vật hoặc vật thể, bỏ nền không cần"],
          ["Làm sạch cảnh", "xóa dây, marker, bụi, logo hoặc vật lọt vào khung hình"],
          ["Chuẩn bị lớp hình", "sắp xếp các phần: nền, nhân vật, hiệu ứng, ánh sáng"],
        ],
        image: ["tách chủ thể khỏi phông xanh và ghép nền mới", "Tách tốt là nền móng của một cảnh ghép tin được."],
      },
      {
        title: "Ghép sao cho ánh sáng và màu khớp",
        body:
          "Một con rồng 3D đặt vào cảnh quay thật sẽ lộ ngay nếu ánh sáng sai hướng, bóng không có, màu quá sạch hoặc độ nét khác cảnh. Compositor sửa những yếu tố này để các lớp hình cùng thuộc một thế giới.",
        bullets: [
          ["Khớp ánh sáng", "hướng sáng và độ sáng phải hợp với cảnh"],
          ["Khớp màu", "lớp ghép không quá xanh, đỏ, sáng hoặc tối so với nền"],
          ["Thêm bóng/tiếp xúc", "vật thể phải có cảm giác chạm vào mặt đất hoặc môi trường"],
        ],
      },
      {
        title: "Làm hiệu ứng hòa vào cảnh",
        body:
          "Khói, lửa, mưa, bụi, tia sáng hoặc màn hình điện thoại đều cần được ghép cẩn thận. Hiệu ứng đẹp nhưng lạc ánh sáng hoặc quá sắc nét sẽ làm cảnh giả.",
        bullets: [
          ["Độ mờ và độ nét", "vật ở xa/gần phải có mức nét hợp lý"],
          ["Hạt và nhiễu hình", "lớp ghép cần có chất giống cảnh quay"],
          ["Chuyển động", "hiệu ứng phải đi theo máy quay và hành động trong cảnh"],
        ],
      },
      {
        title: "Soát lỗi trước khi giao bản cuối",
        body:
          "Compositor thường xem đi xem lại từng khung hình để tìm lỗi: viền tóc bị xanh, bóng nhảy, lớp hình rung, ánh sáng lệch hoặc vật thể trôi khỏi vị trí. Công việc này cần mắt chi tiết và sự kiên nhẫn.",
        bullets: [
          ["So trước/sau", "đảm bảo sửa đúng mục tiêu, không làm hỏng cảnh"],
          ["Xem ở nhiều mức phóng", "vừa nhìn tổng thể vừa soi chi tiết"],
          ["Ghi chú sửa", "theo dõi từng lỗi để không bỏ sót khi deadline gần"],
        ],
        image: ["người làm kỹ xảo soát lỗi ghép hình trên màn hình nhiều lớp", "Compositor giỏi thường là người thấy lỗi rất nhỏ trước khi khán giả thấy."],
      },
    ],
    skills: [
      {
        icon: "👁️",
        label: "Mắt quan sát",
        title: "Mắt quan sát",
        body: [
          "Bạn cần nhận ra vì sao một lớp hình bị giả: ánh sáng sai, viền quá rõ, bóng thiếu, màu không khớp.",
          "Hãy tập xem cảnh VFX và tự hỏi: nếu cảnh này giả, nó giả ở đâu?",
        ],
      },
      {
        icon: "🎨",
        label: "Ánh sáng và màu",
        title: "Ánh sáng và màu",
        body: [
          "Ghép hình không thể tách khỏi ánh sáng và màu. Hai lớp hình chỉ hòa vào nhau khi chúng có cùng điều kiện ánh sáng.",
          "Học từ nhiếp ảnh và điện ảnh: hướng sáng, độ tương phản, bóng, phản chiếu, màu da.",
        ],
      },
      {
        icon: "🧩",
        label: "Tư duy lớp hình",
        title: "Tư duy lớp hình",
        body: [
          "Compositor nhìn một cảnh thành nhiều lớp: nền, chủ thể, khói, ánh sáng, bóng, màu, chi tiết cần xóa.",
          "Bài tập tốt: lấy một ảnh đơn giản và thử tách nó thành các lớp hình khác nhau.",
        ],
      },
      {
        icon: "🖥️",
        label: "Biết phần mềm ghép hình",
        title: "Biết phần mềm ghép hình",
        body: [
          "Nuke là phần mềm phổ biến trong VFX; After Effects cũng thường dùng cho video/motion. Nhưng nền tảng hình ảnh vẫn quan trọng hơn tên phần mềm.",
          "Bắt đầu bằng bài đơn giản: xóa vật thể, thay bầu trời, ghép màn hình điện thoại, ghép khói/lửa.",
        ],
      },
      {
        icon: "🔍",
        label: "Tỉ mỉ",
        title: "Tỉ mỉ",
        body: [
          "Một lỗi nhỏ ở viền tóc hoặc bóng đổ có thể làm người xem thấy cảnh giả ngay. Công việc này hợp với người kiên nhẫn soi chi tiết.",
          "Tập xem bản của mình ở tốc độ chậm, phóng to, thu nhỏ và trên màn hình khác.",
        ],
      },
      {
        icon: "🤝",
        label: "Phối hợp",
        title: "Phối hợp",
        body: [
          "Compositor nhận đầu vào từ quay phim, 3D, hiệu ứng, dựng phim và chỉnh màu. Nếu không hỏi rõ, rất dễ sửa sai hướng.",
          "Tập ghi chú rõ: lỗi gì, cần file nào, ai chịu trách nhiệm, bản nào là mới nhất.",
        ],
      },
    ],
    path: [
      ["Học nền hình ảnh", "Bắt đầu từ ánh sáng, màu sắc, phối cảnh, nhiếp ảnh và quan sát cảnh phim. Không cần học kỹ xảo ngay từ ngày đầu."],
      ["Làm bài ghép đơn giản", "Thay nền, xóa vật thể, ghép màn hình điện thoại, thêm khói/lửa vào cảnh quay ngắn."],
      ["Học một phần mềm chính", "After Effects dễ bắt đầu; Nuke phù hợp nếu đi sâu VFX. Quan trọng là hiểu lớp hình và lý do chỉnh."],
      ["Làm dự án phim ngắn/game nhỏ", "Tham gia CLB phim, hoạt hình, game sinh viên. Có cảnh thật để ghép sẽ học nhanh hơn chỉ xem tutorial."],
      ["Lưu trước/sau vào hồ sơ năng lực", "Compositor nên show quá trình: footage gốc, các lớp ghép, bản cuối và những lỗi đã xử lý."],
      ["Ứng tuyển trợ lý hậu kỳ/VFX", "Có thể bắt đầu từ roto, clean-up, motion, hậu kỳ video; dần tiến tới shot phức tạp hơn."],
    ],
  },
  {
    id: "08a377b6-efaa-432d-a07d-344c35383ed2",
    slug: "nghe-texture-surfacing-artist",
    title: "Texture / Surfacing Artist",
    viet: "Họa sĩ chất liệu bề mặt",
    summary:
      "Người tạo màu, hoa văn và chất liệu cho mô hình 3D — giúp nhân vật, đạo cụ, môi trường không còn là khối xám mà có da, vải, kim loại, gỗ, bụi bẩn và cảm giác thật.",
    metaTitle:
      "Texture / Surfacing Artist là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Texture / Surfacing Artist làm gì trong 3D, game và hoạt hình; học chất liệu, màu, quan sát ra sao để bắt đầu.",
    intro: [
      "Một mô hình 3D mới dựng xong thường chỉ là khối xám: chưa có da, vải, gỗ, kim loại, bụi, vết xước hay độ bóng. Người biến khối xám đó thành nhân vật có làn da, áo khoác cũ, thanh kiếm rỉ sét hoặc căn phòng có chất liệu tin được là Texture / Surfacing Artist.",
      "Nếu Modeler tạo hình khối, Texture / Surfacing Artist tạo <em>bề mặt</em>: thứ khiến người xem cảm nhận được vật này mềm hay cứng, mới hay cũ, sạch hay bẩn, thật hay hoạt hình.",
    ],
    definition: [
      "Texture / Surfacing Artist là người thiết kế màu sắc, hoa văn, độ nhám, độ bóng và chất liệu bề mặt cho mô hình 3D trong phim hoạt hình, game, quảng cáo, diễn họa hoặc sản phẩm số.",
      "Trong vài nơi, “texture” nhấn vào vẽ bản đồ màu/chi tiết; “surfacing” rộng hơn, gồm cả cách chất liệu phản ứng với ánh sáng. Với người mới học, có thể hiểu chung là nghề làm cho bề mặt 3D có cảm giác sống.",
    ],
    responsibilities: [
      "Tạo màu, hoa văn, vết bẩn, vết xước, chi tiết nhỏ trên mô hình 3D",
      "Thiết lập chất liệu: da, vải, kim loại, gỗ, nhựa, đá, nước…",
      "Kiểm tra bề mặt dưới nhiều ánh sáng để không bị giả",
      "Phối hợp với người dựng hình, ánh sáng, diễn hoạt hoặc game engine",
    ],
    appears: [
      ["Hoạt hình 3D", "làm chất liệu nhân vật, bối cảnh, đạo cụ trước khi render."],
      ["Game", "tạo bề mặt tối ưu để chạy được trong game nhưng vẫn đẹp."],
      ["3D Art & Visualization", "làm chất liệu sản phẩm, nội thất, kiến trúc, nhân vật, đồ vật."],
    ],
    tasks: [
      {
        title: "Quan sát chất liệu thật",
        body:
          "Trước khi vẽ bề mặt, bạn phải hiểu vật liệu thật trông như thế nào. Da người không chỉ một màu; vải có sợi; kim loại có cạnh mòn; gỗ có vân; đồ cũ có bụi ở khe và mòn ở chỗ hay chạm.",
        bullets: [
          ["Ảnh tham khảo", "chụp hoặc sưu tầm ảnh chất liệu ngoài đời"],
          ["Vùng mòn", "chỗ nào thường xước, cũ, bẩn hoặc bóng hơn"],
          ["Câu chuyện đồ vật", "vật này mới mua, đã dùng lâu, hay từng bị va đập?"],
        ],
        image: ["bảng tham khảo chất liệu da vải kim loại gỗ cho 3D", "Chất liệu thuyết phục bắt đầu từ quan sát đời thật, không chỉ từ tưởng tượng."],
      },
      {
        title: "Vẽ màu và chi tiết bề mặt",
        body:
          "Sau khi hiểu vật liệu, người làm texture vẽ hoặc tạo các lớp màu, hoa văn, vết bẩn, logo, đường may, vết xước. Những chi tiết nhỏ này giúp mô hình kể câu chuyện của nó.",
        bullets: [
          ["Màu nền", "màu chính của da, vải, gỗ, kim loại"],
          ["Chi tiết nhỏ", "vân, bụi, xước, đường may, hình in, vết mòn"],
          ["Không lặp giả", "tránh hoa văn bị lặp quá rõ khiến vật thể trông rẻ tiền"],
        ],
      },
      {
        title: "Thiết lập chất liệu phản ứng với ánh sáng",
        body:
          "Cùng một màu xám có thể là nhựa, kim loại, đá hoặc vải nếu cách phản chiếu ánh sáng khác nhau. Surfacing Artist chỉnh độ bóng, độ nhám, trong suốt hoặc gồ ghề để bề mặt có cảm giác đúng.",
        bullets: [
          ["Độ nhám", "bề mặt mờ hay bóng"],
          ["Phản chiếu", "kim loại, kính, nước cần phản chiếu khác vải hoặc da"],
          ["Gồ ghề", "chi tiết nhỏ làm ánh sáng vỡ ra tự nhiên hơn"],
        ],
      },
      {
        title: "Kiểm tra trong ánh sáng thật của dự án",
        body:
          "Một chất liệu có thể đẹp trong màn hình làm việc nhưng hỏng khi đưa vào cảnh thật: quá tối, quá bóng, quá nhiều chi tiết hoặc không hợp phong cách. Vì vậy cần kiểm tra với ánh sáng, camera và môi trường của dự án.",
        bullets: [
          ["Kiểm tra nhiều góc", "xoay mô hình để xem bề mặt có ổn từ mọi phía"],
          ["Kiểm tra xa/gần", "chi tiết phải hợp khi nhìn gần và không nhiễu khi nhìn xa"],
          ["Tối ưu cho game", "giữ chất liệu đẹp nhưng không quá nặng"],
        ],
        image: ["mô hình 3D trước sau khi thêm chất liệu bề mặt", "Bề mặt tốt khiến mô hình có tuổi, chất liệu và câu chuyện riêng."],
      },
    ],
    skills: [
      {
        icon: "👁️",
        label: "Quan sát vật liệu",
        title: "Quan sát vật liệu",
        body: [
          "Bạn cần nhìn được sự khác nhau giữa vải cotton, da, kim loại sơn, gỗ cũ, nhựa rẻ tiền. Mỗi chất liệu có cách phản chiếu và cũ đi khác nhau.",
          "Hãy chụp ảnh đồ vật quanh nhà và ghi chú: chỗ nào bóng, chỗ nào mòn, chỗ nào bẩn?",
        ],
      },
      {
        icon: "🎨",
        label: "Màu và chi tiết",
        title: "Màu và chi tiết",
        body: [
          "Texture không chỉ tô màu phẳng. Nó cần sắc độ, vết dùng, chi tiết nhỏ và mức độ tự nhiên vừa đủ.",
          "Tập vẽ chất liệu đơn giản: vải jean, da người, gỗ, kim loại, giấy cũ, nhựa.",
        ],
      },
      {
        icon: "💡",
        label: "Hiểu ánh sáng",
        title: "Hiểu ánh sáng",
        body: [
          "Chất liệu chỉ hiện ra khi có ánh sáng. Nếu không hiểu ánh sáng, bạn sẽ khó biết vì sao vật này nhìn nhựa, vật kia nhìn kim loại.",
          "Quan sát cùng một vật dưới nắng, trong phòng, dưới đèn vàng và trên màn hình.",
        ],
      },
      {
        icon: "🧊",
        label: "Hiểu mô hình 3D",
        title: "Hiểu mô hình 3D",
        body: [
          "Bạn không nhất thiết là Modeler giỏi nhất, nhưng cần hiểu mô hình được trải bề mặt như thế nào và vì sao chi tiết có thể bị méo.",
          "Học Blender cơ bản là một cách tốt để hiểu quy trình này.",
        ],
      },
      {
        icon: "⚙️",
        label: "Biết công cụ",
        title: "Biết công cụ",
        body: [
          "Substance Painter, Photoshop, Blender hoặc phần mềm tương tự thường được dùng. Nhưng công cụ chỉ giúp nhanh hơn; mắt quan sát mới quyết định chất lượng.",
          "Bắt đầu bằng một vật đơn giản: cái cốc, cái ghế, chiếc rương, rồi làm 3 phiên bản mới/cũ/bẩn.",
        ],
      },
      {
        icon: "🔍",
        label: "Tỉ mỉ",
        title: "Tỉ mỉ",
        body: [
          "Bề mặt sống nhờ chi tiết nhỏ: mép áo sờn, cạnh kiếm mòn, bụi ở khe cửa. Nhưng quá nhiều chi tiết cũng làm rối.",
          "Tập tiết chế: thêm chi tiết ở nơi có lý do, không rải đều khắp vật thể.",
        ],
      },
    ],
    path: [
      ["Học vẽ chất liệu bằng mắt thường", "Quan sát và vẽ lại vải, gỗ, kim loại, da, nhựa, đá. Đây là nền tảng trước khi vào 3D."],
      ["Làm quen Blender hoặc phần mềm 3D cơ bản", "Hiểu mô hình, ánh sáng và vật liệu hoạt động ra sao. Không cần dựng quá phức tạp lúc đầu."],
      ["Học công cụ vẽ chất liệu", "Thử Substance Painter/Photoshop hoặc công cụ tương tự. Làm vật thể đơn giản trước: cốc, hộp, rương, vũ khí."],
      ["Tạo bộ trước-sau cho hồ sơ năng lực", "Cho xem mô hình xám, bước thêm màu, thêm chi tiết, bản cuối trong ánh sáng thật."],
      ["Làm dự án nhỏ", "Một nhân vật, một căn phòng, một bộ đạo cụ game hoặc sản phẩm 3D. Dự án có ngữ cảnh sẽ thuyết phục hơn bài tập rời."],
      ["Ứng tuyển vào game/3D/hoạt hình", "Có thể bắt đầu từ thực tập 3D, texture junior, môi trường game hoặc diễn họa sản phẩm."],
    ],
  },
  {
    id: "8a46846e-b3a2-4df8-88e3-0fbd29ec11e8",
    slug: "nghe-producer",
    title: "Producer",
    viet: "Nhà sản xuất",
    summary:
      "Người biến một dự án sáng tạo thành việc có thể làm thật — kết nối ý tưởng, tiền, người, lịch làm và đầu ra trong phim, hoạt hình, game hoặc sản phẩm truyền thông.",
    metaTitle: "Producer là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Producer làm gì, khác Production Manager ra sao, cần kỹ năng nào và học sinh/sinh viên nên bắt đầu thế nào.",
    intro: [
      "Một phim ngắn có ý tưởng hay nhưng không có tiền thuê thiết bị. Một game sinh viên có đội vẽ tốt nhưng không ai chốt phạm vi. Một chiến dịch quảng cáo đẹp nhưng trễ hạn vì thiếu người điều phối. Người đứng ra biến ý tưởng thành dự án có thể chạy được là Producer.",
      "Producer không nhất thiết là người sáng tạo hình ảnh trực tiếp. Họ là người kết nối: mục tiêu, ngân sách, đội ngũ, lịch làm, rủi ro và đầu ra cuối cùng.",
    ],
    definition: [
      "Producer (Nhà sản xuất) là người chịu trách nhiệm đưa một dự án sáng tạo từ ý tưởng đến khi hoàn thành và phát hành. Tùy ngành, họ có thể lo gọi vốn, chọn đội, làm việc với khách hàng, theo dõi tiến độ, xử lý rủi ro và bảo vệ mục tiêu của dự án.",
      "Nếu Art Director giữ phần hình ảnh, Director giữ cách kể chuyện, Production Manager lo vận hành hằng ngày, thì Producer nhìn rộng hơn: dự án này có đáng làm không, làm bằng nguồn lực nào, ai cần tham gia, và làm sao để nó ra được đời.",
    ],
    responsibilities: [
      "Chọn hoặc phát triển dự án có khả năng làm thật",
      "Kết nối người sáng tạo, khách hàng, nhà đầu tư hoặc đối tác",
      "Theo dõi ngân sách, phạm vi và mục tiêu đầu ra",
      "Ra quyết định khi dự án gặp rủi ro lớn về tiền, thời gian hoặc chất lượng",
    ],
    appears: [
      ["Phim & Hoạt hình", "kết nối ý tưởng, đạo diễn, ekip, kinh phí và phát hành."],
      ["Game", "giữ phạm vi sản phẩm, đội ngũ, lịch ra mắt và ưu tiên tính năng."],
      ["Truyền thông/quảng cáo", "đảm bảo chiến dịch đúng yêu cầu khách hàng, ngân sách và thời hạn."],
    ],
    tasks: [
      {
        title: "Chọn dự án và xác định mục tiêu",
        body:
          "Producer cần hiểu dự án này làm để làm gì: chiếu liên hoan, bán cho khách hàng, ra mắt game, quảng bá thương hiệu hay xây hồ sơ năng lực. Mục tiêu khác nhau sẽ kéo theo cách tổ chức khác nhau.",
        bullets: [
          ["Mục tiêu đầu ra", "dự án cần ra mắt ở đâu, cho ai xem, đo thành công bằng gì"],
          ["Phạm vi", "làm đến mức nào là đủ, phần nào chưa cần làm"],
          ["Rủi ro lớn", "thiếu tiền, thiếu người, quá khó kỹ thuật, thời gian quá ngắn"],
        ],
        image: ["nhà sản xuất họp bàn kế hoạch phim game sáng tạo", "Producer đặt câu hỏi thực tế để ý tưởng không chỉ nằm trên giấy."],
      },
      {
        title: "Tìm và sắp xếp nguồn lực",
        body:
          "Nguồn lực có thể là tiền, thiết bị, địa điểm, phần mềm, người làm hình, người viết, diễn viên, lập trình viên hoặc kênh phát hành. Producer không nhất thiết tự làm mọi thứ, nhưng phải biết còn thiếu gì.",
        bullets: [
          ["Đội ngũ", "ai làm phần nào, ai quyết định phần nào"],
          ["Ngân sách", "tiền dùng cho đâu, khoản nào bắt buộc, khoản nào có thể cắt"],
          ["Đối tác", "khách hàng, nhà tài trợ, studio, trường học, cộng đồng"],
        ],
      },
      {
        title: "Giữ dự án không vượt quá khả năng",
        body:
          "Dự án sáng tạo rất dễ phình ra: thêm cảnh, thêm tính năng, thêm nhân vật, thêm hiệu ứng. Producer phải nhắc cả nhóm đâu là phần cốt lõi, đâu là phần đẹp nhưng có thể để sau.",
        bullets: [
          ["Ưu tiên", "việc nào quan trọng nhất để sản phẩm ra được"],
          ["Cắt giảm có lý do", "bỏ bớt phần phụ để giữ phần chính"],
          ["Theo dõi tiến độ", "biết dự án đang đúng hướng hay đang trượt khỏi kế hoạch"],
        ],
      },
      {
        title: "Giải quyết vấn đề giữa người và việc",
        body:
          "Khi dự án căng, Producer thường là người nghe nhiều phía: đội sáng tạo muốn thêm thời gian, khách hàng muốn nhanh, ngân sách không tăng, lịch đã sát. Họ cần bình tĩnh để tìm phương án ít hại nhất.",
        bullets: [
          ["Giao tiếp rõ", "nói sớm khi có vấn đề, không để sát hạn mới báo"],
          ["Quyết định", "chốt hướng khi nhóm tranh luận quá lâu"],
          ["Bảo vệ dự án", "giữ mục tiêu chung thay vì chiều tất cả yêu cầu nhỏ"],
        ],
        image: ["producer điều phối ekip sáng tạo trong phòng họp dự án", "Producer giỏi giúp người sáng tạo có điều kiện làm tốt, chứ không chỉ thúc deadline."],
      },
    ],
    skills: [
      {
        icon: "📋",
        label: "Tổ chức công việc",
        title: "Tổ chức công việc",
        body: [
          "Producer phải biến ý tưởng mơ hồ thành việc cụ thể: ai làm, khi nào xong, cần gì, có rủi ro gì.",
          "Tập từ dự án lớp/CLB: chia việc, ghi mốc, theo dõi tiến độ và tổng kết sau khi xong.",
        ],
      },
      {
        icon: "🤝",
        label: "Giao tiếp",
        title: "Giao tiếp",
        body: [
          "Bạn sẽ nói chuyện với người sáng tạo, người trả tiền, người kỹ thuật và người xem. Mỗi nhóm quan tâm một thứ khác nhau.",
          "Học cách nói rõ vấn đề, đề xuất lựa chọn và xác nhận lại quyết định bằng văn bản.",
        ],
      },
      {
        icon: "🎯",
        label: "Biết ưu tiên",
        title: "Biết ưu tiên",
        body: [
          "Không dự án nào có đủ thời gian và tiền cho mọi thứ. Producer cần biết phần nào làm nên giá trị chính.",
          "Bài tập: với một phim ngắn/game nhỏ, thử chia tính năng/cảnh thành “bắt buộc”, “nên có”, “có thì tốt”.",
        ],
      },
      {
        icon: "📊",
        label: "Hiểu tiền và nguồn lực",
        title: "Hiểu tiền và nguồn lực",
        body: [
          "Producer không cần là kế toán, nhưng phải hiểu tiền đang đi đâu và quyết định nào làm chi phí tăng.",
          "Tập làm ngân sách đơn giản cho một buổi quay, sự kiện CLB hoặc dự án game nhỏ.",
        ],
      },
      {
        icon: "🧠",
        label: "Hiểu sáng tạo",
        title: "Hiểu sáng tạo",
        body: [
          "Producer không chỉ quản lý bảng tính. Họ cần đủ hiểu nghệ thuật/sản phẩm để bảo vệ phần quan trọng và không cắt nhầm linh hồn dự án.",
          "Xem nhiều phim, game, chiến dịch; tập phân tích vì sao dự án đó đáng làm và ai là người xem.",
        ],
      },
      {
        icon: "⚡",
        label: "Bình tĩnh khi có rủi ro",
        title: "Bình tĩnh khi có rủi ro",
        body: [
          "Dự án sáng tạo luôn có bất ngờ. Người làm Producer cần bình tĩnh, hỏi đúng câu và đưa phương án thay vì chỉ lo lắng.",
          "Tập thói quen ghi rủi ro sớm: chuyện gì có thể hỏng, dấu hiệu nào báo trước, nếu hỏng thì làm gì?",
        ],
      },
    ],
    path: [
      ["Tham gia dự án nhỏ", "CLB phim, game jam, sự kiện trường, kênh YouTube lớp, triển lãm sinh viên — nơi nào có nhiều người cùng làm là nơi học tốt."],
      ["Tập làm người điều phối", "Nhận việc lập lịch, chia việc, nhắc tiến độ, tổng hợp yêu cầu. Đây là nền tảng Producer."],
      ["Học ngôn ngữ của ngành", "Nếu đi phim, hiểu quay/dựng/hậu kỳ. Nếu đi game, hiểu art/lập trình/thiết kế màn chơi. Không cần làm hết, nhưng phải nói chuyện được."],
      ["Làm ngân sách và kế hoạch đơn giản", "Tự lập bảng: cần ai, cần gì, tốn bao nhiêu, mốc nào cần xong. Dự án nhỏ cũng nên tập làm rõ."],
      ["Ghi lại case đã sản xuất", "Hồ sơ năng lực của Producer nên có mục tiêu dự án, đội ngũ, phạm vi, vấn đề gặp phải và cách bạn xử lý."],
      ["Bắt đầu từ trợ lý sản xuất/điều phối", "Có thể vào nghề qua trợ lý sản xuất, điều phối dự án, quản lý cộng đồng game, sản xuất video hoặc account trong agency."],
    ],
  },
  {
    id: "3e18de3d-7722-4cc2-a2a2-93e1740ecb3c",
    slug: "nghe-production-manager",
    title: "Production Manager",
    viet: "Quản lý sản xuất",
    summary:
      "Người điều phối vận hành hằng ngày của dự án sáng tạo — lịch, người, đầu việc, tài nguyên và vấn đề phát sinh — để phim, game, truyện, thời trang hoặc chiến dịch chạy đúng kế hoạch.",
    metaTitle:
      "Production Manager là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Production Manager làm gì, khác Producer ra sao, cần kỹ năng điều phối nào và sinh viên nên bắt đầu thế nào.",
    intro: [
      "Một đoàn phim có nhiều bộ phận, một studio hoạt hình có hàng trăm shot, một bộ truyện có lịch vẽ-dàn trang-in ấn, một show thời trang có người mẫu, đồ, địa điểm, ánh sáng. Nếu không ai điều phối, mọi thứ rất dễ trễ và rối. Production Manager là người giữ guồng vận hành đó.",
      "Khác Producer, Production Manager thường không quyết định dự án có nên làm hay gọi vốn thế nào. Họ tập trung vào việc: hôm nay ai làm gì, mốc nào sắp đến, bộ phận nào đang kẹt, và cần xử lý gì để dự án tiếp tục chạy.",
    ],
    definition: [
      "Production Manager (Quản lý sản xuất) là người quản lý hoạt động sản xuất hằng ngày của một dự án sáng tạo. Họ theo dõi lịch làm, nguồn lực, đầu việc, người phụ trách, tài liệu, chi phí vận hành và các vấn đề phát sinh.",
      "Nếu Producer nhìn ở tầng chiến lược, Production Manager đứng gần hiện trường hơn: biến kế hoạch thành lịch cụ thể và đảm bảo các bộ phận không giẫm chân nhau.",
    ],
    responsibilities: [
      "Lập và theo dõi lịch sản xuất chi tiết",
      "Điều phối người, phòng ban, thiết bị, tài liệu và đầu vào cần thiết",
      "Phát hiện việc trễ, thiếu người, thiếu dữ liệu hoặc vượt phạm vi",
      "Báo cáo tình trạng dự án cho Producer, đạo diễn, trưởng nhóm hoặc khách hàng",
    ],
    appears: [
      ["Phim & Điện ảnh", "điều phối lịch quay, đoàn phim, địa điểm, thiết bị, giấy tờ."],
      ["Hoạt hình & Game", "theo dõi asset, shot, tính năng, mốc duyệt và tiến độ từng đội."],
      ["Comic & Xuất bản", "giữ lịch kịch bản, vẽ, tô màu, chữ, dàn trang, in/phát hành."],
      ["Thời trang", "điều phối mẫu, fitting, lịch chụp, show, sản xuất lookbook hoặc bộ sưu tập."],
    ],
    tasks: [
      {
        title: "Biến kế hoạch lớn thành đầu việc cụ thể",
        body:
          "Một câu “làm xong trailer” nghe đơn giản nhưng bên trong có kịch bản, hình ảnh, dựng, âm thanh, duyệt, xuất file. Production Manager chia nhỏ việc để biết ai đang làm gì và phần nào phụ thuộc phần nào.",
        bullets: [
          ["Danh sách đầu việc", "tách dự án thành việc nhỏ có người phụ trách"],
          ["Mốc thời gian", "biết khi nào cần xong bản nháp, bản duyệt, bản cuối"],
          ["Phụ thuộc", "việc nào phải xong trước thì việc sau mới làm được"],
        ],
        image: ["bảng tiến độ sản xuất phim hoạt hình game nhiều đầu việc", "Quản lý sản xuất giỏi nhìn thấy dự án dưới dạng đầu việc, người phụ trách và mốc giao."],
      },
      {
        title: "Theo dõi tiến độ hằng ngày",
        body:
          "Production Manager cần biết bộ phận nào đang đúng tiến độ, bộ phận nào đang kẹt, phần nào có nguy cơ trễ. Họ không đợi đến ngày cuối mới phát hiện vấn đề.",
        bullets: [
          ["Cập nhật trạng thái", "chưa làm, đang làm, chờ duyệt, cần sửa, đã xong"],
          ["Nhắc mốc", "báo sớm khi sắp đến hạn hoặc có nguy cơ trễ"],
          ["Gỡ kẹt", "thiếu file, thiếu người duyệt, thiếu thông tin thì phải tìm cách xử lý"],
        ],
      },
      {
        title: "Kết nối nhiều bộ phận",
        body:
          "Trong dự án sáng tạo, người viết, người vẽ, người dựng, người quay, người lập trình, người in ấn hoặc người tổ chức sự kiện có thể cần đầu vào của nhau. Production Manager giúp thông tin đi đúng người.",
        bullets: [
          ["Luồng bàn giao", "ai giao cho ai, file nào là bản mới nhất"],
          ["Cuộc họp ngắn", "chốt vấn đề cần quyết định, không họp cho có"],
          ["Tài liệu chung", "giữ yêu cầu, link file, bản duyệt ở nơi dễ tìm"],
        ],
      },
      {
        title: "Báo cáo và xử lý rủi ro",
        body:
          "Khi lịch trễ, người nghỉ, khách đổi yêu cầu hoặc chi phí tăng, Production Manager phải báo rõ tình hình và đề xuất phương án. Công việc này cần bình tĩnh, không né vấn đề.",
        bullets: [
          ["Báo cáo rõ", "đang đúng, đang trễ, kẹt vì đâu, cần ai quyết"],
          ["Phương án thay thế", "thêm người, giảm phạm vi, đổi thứ tự, dời mốc"],
          ["Ghi lại quyết định", "tránh việc cả nhóm nhớ mỗi người một kiểu"],
        ],
        image: ["quản lý sản xuất họp với các trưởng bộ phận xem tiến độ", "Production Manager là người biến tình trạng rối thành thông tin rõ để dự án đi tiếp."],
      },
    ],
    skills: [
      {
        icon: "📋",
        label: "Tổ chức chi tiết",
        title: "Tổ chức chi tiết",
        body: [
          "Bạn phải nhớ nhiều đầu việc, nhưng không thể chỉ nhớ bằng đầu. Cần biết ghi, chia nhóm, đặt mốc và theo dõi.",
          "Tập với dự án lớp: làm bảng việc, người phụ trách, hạn, trạng thái và ghi chú.",
        ],
      },
      {
        icon: "⏱️",
        label: "Quản lý thời gian",
        title: "Quản lý thời gian",
        body: [
          "Sản xuất luôn có hạn. Production Manager cần biết việc nào đang chặn việc khác và mốc nào thật sự nguy hiểm.",
          "Học cách ước lượng: việc này cần bao lâu, ai duyệt, nếu sửa thì mất thêm mấy ngày?",
        ],
      },
      {
        icon: "🤝",
        label: "Giao tiếp rõ",
        title: "Giao tiếp rõ",
        body: [
          "Cùng một vấn đề nói với artist, đạo diễn, lập trình viên, khách hàng sẽ cần cách nói khác nhau. Nhưng thông tin phải rõ và không vòng vo.",
          "Tập viết tin nhắn ngắn: vấn đề, ảnh hưởng, cần ai làm gì, hạn khi nào.",
        ],
      },
      {
        icon: "🔍",
        label: "Phát hiện rủi ro",
        title: "Phát hiện rủi ro",
        body: [
          "Người quản lý sản xuất tốt thấy dấu hiệu trễ trước khi nó thành khủng hoảng: file chưa có, người duyệt im lặng, phần việc quá lớn.",
          "Luôn hỏi: nếu việc này trễ, nó kéo theo việc nào?",
        ],
      },
      {
        icon: "🧠",
        label: "Hiểu quy trình sáng tạo",
        title: "Hiểu quy trình sáng tạo",
        body: [
          "Bạn không cần vẽ giỏi hay quay phim giỏi, nhưng phải hiểu cơ bản mỗi bộ phận cần đầu vào gì và đầu ra là gì.",
          "Tham gia nhiều vai trò nhỏ trong dự án sinh viên sẽ giúp bạn hiểu điều này nhanh hơn học lý thuyết.",
        ],
      },
      {
        icon: "⚡",
        label: "Bình tĩnh xử lý việc gấp",
        title: "Bình tĩnh xử lý việc gấp",
        body: [
          "Dự án sẽ có ngày mọi thứ cùng hỏng: người vắng, file lỗi, khách đổi ý, deadline sát. Production Manager cần giữ nhịp để nhóm không hoảng.",
          "Tập thói quen đưa 2–3 phương án thay vì chỉ báo “không kịp”.",
        ],
      },
    ],
    path: [
      ["Tham gia tổ chức dự án ở trường", "CLB, sự kiện, phim ngắn, truyện nhóm, game jam, show thời trang sinh viên đều là nơi tốt để học điều phối."],
      ["Tập dùng bảng việc", "Dùng Notion, Trello, Google Sheet hoặc giấy cũng được. Quan trọng là biết chia việc, đặt hạn và cập nhật trạng thái."],
      ["Hiểu một quy trình sản xuất cụ thể", "Chọn phim, game, hoạt hình, comic, thời trang hoặc quảng cáo. Mỗi ngành có ngôn ngữ và mốc việc riêng."],
      ["Làm trợ lý cho dự án nhỏ", "Nhận việc nhắc lịch, tổng hợp file, ghi biên bản, chuẩn bị buổi quay/chụp/họp. Đây là việc thật của quản lý sản xuất ở mức cơ bản."],
      ["Xây hồ sơ bằng case vận hành", "Ghi lại dự án bạn điều phối: quy mô, thời gian, đội ngũ, bảng việc, vấn đề gặp phải và cách xử lý."],
      ["Ứng tuyển trợ lý sản xuất/điều phối", "Có thể bắt đầu từ production assistant, project coordinator, studio assistant, hoặc điều phối nội dung tại agency/studio."],
    ],
  },
];

function renderList(items: string[]): string {
  return items.map((item) => `    <li>${item}</li>`).join("\n");
}

function renderHtml(job: Job): string {
  return `<section class="arc-intro">
  <p>${job.intro[0]}</p>
  <p>${job.intro[1]}</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>${job.title} là ai?</h2>
  <p>${job.definition[0]}</p>
  <p>${job.definition[1]}</p>
  <ul class="arc-list">
${renderList(job.responsibilities)}
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"${job.title.toLowerCase()} nghề sáng tạo học sinh sinh viên minh họa"</span>
    </div>
    <p class="arc-image-caption">${job.title} giúp phần hình ảnh của dự án rõ mục tiêu và có thể sản xuất tiếp.</p>
  </div>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Xuất hiện ở đâu?</span>
    <p>${job.appears
      .map(([name, text]) => `<strong>${name}</strong> — ${text}`)
      .join("<br>\n    ")}</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Công việc của một ${job.title}</h2>
${job.tasks
  .map((task, index) => {
    const image = task.image
      ? `

    <div class="arc-image-block ${index === 3 ? "arc-image-wide" : "arc-image-single"}">
      <div class="arc-image-placeholder${index === 3 ? " arc-image-placeholder--wide" : ""}">
        <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
        <span class="arc-img-hint-kw">"${task.image[0]}"</span>
      </div>
      <p class="arc-image-caption">${task.image[1]}</p>
    </div>`
      : "";
    return `
  <div class="arc-job-item">
    <h3 class="arc-h3">${index + 1}. ${task.title}</h3>
    <p>${task.body}</p>
    <ul class="arc-list">
${task.bullets
  .map(([term, desc]) => `      <li><strong>${term}</strong> — ${desc}</li>`)
  .join("\n")}
    </ul>${image}
  </div>`;
  })
  .join("\n")}
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>${job.title} cần giỏi gì?</h2>

  <div class="arc-skill-grid">
${job.skills
  .map(
    (skill) => `    <div class="arc-skill-icon-item">
      <span class="arc-skill-emoji">${skill.icon}</span>
      <span>${skill.label}</span>
    </div>`,
  )
  .join("\n")}
  </div>

  <div class="arc-accordion">
${job.skills
  .map(
    (skill, index) => `    <details class="arc-card"${index === 0 ? " open" : ""}>
      <summary>${skill.title}</summary>
      <div class="arc-card-body">
        <p>${skill.body[0]}</p>
        <p>${skill.body[1]}</p>
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
    ([title, body], index) => `    <div class="arc-path-step">
      <div class="arc-step-num">${index + 1}</div>
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
    const html = renderHtml(job);
    console.log(`${job.slug}: ${html.length} chars`);
    if (!APPLY) continue;

    const updated = await sql`
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
    if (!updated.length) {
      console.error(`No row updated: ${job.slug}`);
      process.exit(1);
    }
    console.log("OK", updated[0]);
  }

  if (APPLY) {
    const verify = await sql`
      SELECT a.slug, a.tieu_de_eng, a.tieu_de_viet,
        length(a.noi_dung)::int AS len,
        (a.noi_dung LIKE '%Xuất hiện ở đâu%') AS has_fields_box,
        (
          SELECT string_agg(lv.ten, ' · ' ORDER BY g.la_chinh DESC)
          FROM article_gan_linh_vuc g
          JOIN linh_vuc lv ON lv.id = g.id_linh_vuc
          WHERE g.id_bai_viet = a.id
        ) AS lvs
      FROM article_bai_viet a
      WHERE a.id = ANY(${jobs.map((j) => j.id)}::uuid[])
      ORDER BY a.slug
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
