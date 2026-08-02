/**
 * Apply rewrite batch 3 for nghề canonicals.
 * Audience: HS THPT & Sinh viên. Vietnamese-first, English only for role/tool names.
 *
 * Usage:
 *   npx tsx scripts/apply-nghe-rewrite-batch3.mts --apply
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
    id: "92dd4f46-1f58-4c77-a430-5b4b00cb872e",
    slug: "nghe-illustrator",
    title: "Illustrator",
    viet: "Họa sĩ minh họa",
    summary:
      "Người dùng hình vẽ để kể ý tưởng, giải thích nội dung, tạo cảm xúc và giúp sách, bài viết, chiến dịch hoặc sản phẩm số trở nên dễ hiểu hơn.",
    metaTitle: "Illustrator là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Illustrator làm gì, cần học vẽ, kể chuyện bằng hình và xây portfolio ra sao để bắt đầu từ học sinh/sinh viên.",
    intro: [
      "Một trang sách thiếu nhi có nhân vật khiến bạn nhớ mãi. Một bài viết dài bỗng dễ hiểu hơn nhờ hình minh họa. Một chiến dịch xã hội trở nên gần gũi hơn vì một bức vẽ đúng cảm xúc. Người đứng sau những hình ảnh đó thường là Illustrator.",
      "Illustrator không chỉ “vẽ đẹp”. Họ dùng hình để làm rõ ý tưởng, dẫn cảm xúc và giúp người xem hiểu điều mà chữ hoặc ảnh chụp chưa truyền tải đủ.",
    ],
    definition: [
      "Illustrator là họa sĩ minh họa: người tạo hình ảnh cho sách, báo, truyện, poster, quảng cáo, sản phẩm số, bao bì, giáo dục, truyền thông hoặc dự án cá nhân.",
      "Khác Concept Artist thường phục vụ giai đoạn phát triển thế giới/nhân vật cho phim game, Illustrator thường tạo hình ảnh hoàn chỉnh để người xem đọc, nhìn, chia sẻ hoặc in/xuất bản.",
    ],
    responsibilities: [
      "Hiểu nội dung cần minh họa và cảm xúc cần truyền tải",
      "Phác thảo nhiều hướng hình trước khi chọn bản cuối",
      "Hoàn thiện hình theo phong cách, kích thước và mục đích sử dụng",
      "Sửa theo góp ý của biên tập, khách hàng, art director hoặc đội thiết kế",
    ],
    appears: [
      ["Minh họa", "sách, báo, truyện, poster, bìa, bài viết, giáo dục, truyền thông."],
      ["Thiết kế đồ họa", "hình minh họa cho thương hiệu, chiến dịch, social, bao bì."],
      ["Sản phẩm số", "hình onboarding, icon minh họa, banner, nội dung học tập."],
    ],
    tasks: [
      {
        title: "Đọc brief và tìm trọng tâm hình ảnh",
        body:
          "Trước khi vẽ, Illustrator cần biết hình dùng để làm gì: kể chuyện, giải thích, gây chú ý, bán sản phẩm hay tạo cảm giác thân thiện.",
        bullets: [
          ["Thông điệp", "người xem cần hiểu điều gì sau khi nhìn hình"],
          ["Đối tượng", "trẻ em, học sinh, phụ huynh, khách hàng trẻ hay cộng đồng chuyên môn"],
          ["Ngữ cảnh dùng", "in sách, đăng mạng xã hội, chạy quảng cáo hay nằm trong app"],
        ],
      },
      {
        title: "Phác thảo ý tưởng và bố cục",
        body:
          "Một hình minh họa tốt thường đi qua nhiều thumbnail nhỏ. Phác thảo giúp thử nhanh góc nhìn, nhân vật, bố cục và điểm nhấn trước khi tốn thời gian tô kỹ.",
        bullets: [
          ["Thumbnail", "bản phác nhỏ để thử ý tưởng nhanh"],
          ["Bố cục", "dẫn mắt người xem đến phần quan trọng"],
          ["Biểu cảm", "nhân vật và dáng người nói cảm xúc trước cả chữ"],
        ],
      },
      {
        title: "Hoàn thiện hình theo mục đích sử dụng",
        body:
          "Hình cho sách khác hình cho poster, hình cho app khác hình cho bìa tạp chí. Illustrator phải xử lý nét, màu, độ chi tiết và file bàn giao đúng ngữ cảnh.",
        bullets: [
          ["Màu sắc", "phù hợp cảm xúc và hệ nhận diện nếu có"],
          ["Chi tiết", "đủ rõ nhưng không làm rối thông điệp"],
          ["Bàn giao", "đúng kích thước, định dạng, phiên bản màu hoặc in ấn"],
        ],
      },
      {
        title: "Sửa hình mà vẫn giữ ý tưởng",
        body:
          "Minh họa trong dự án thật thường có góp ý. Người làm nghề cần phân biệt góp ý giúp hình rõ hơn với thay đổi làm mất tinh thần ban đầu.",
        bullets: [
          ["Nhận góp ý", "hỏi lại phần nào chưa rõ thay vì sửa đoán"],
          ["Giữ trọng tâm", "đừng thêm chi tiết chỉ vì hình còn trống"],
          ["Phiên bản", "lưu bản phác, bản giữa, bản cuối để dễ so sánh"],
        ],
      },
    ],
    skills: [
      { icon: "✏️", label: "Vẽ nền tảng", body: ["Cần hiểu hình khối, dáng người, phối cảnh, ánh sáng và màu.", "Không nhất thiết vẽ theo một style duy nhất; quan trọng là hình đọc được và có chủ ý."] },
      { icon: "👁️", label: "Kể chuyện bằng hình", body: ["Minh họa phải giúp người xem hiểu hoặc cảm thấy điều gì đó.", "Tập kể một câu chuyện nhỏ chỉ bằng 1 hình, rồi hỏi người khác họ hiểu gì."] },
      { icon: "🎨", label: "Màu và phong cách", body: ["Màu tạo giọng: vui, ấm, bí ẩn, học thuật, trẻ trung hoặc nghiêm túc.", "Tập làm cùng một nội dung với 2 bảng màu khác nhau để thấy cảm xúc đổi ra sao."] },
      { icon: "📋", label: "Làm theo brief", body: ["Dự án thật có mục tiêu, kích thước, hạn và người duyệt.", "Tập tự viết brief ngắn trước khi vẽ: dùng ở đâu, cho ai, cần nói gì."] },
      { icon: "🤝", label: "Nhận sửa", body: ["Illustrator cần bảo vệ ý tưởng nhưng không cố chấp với chi tiết.", "Góp ý tốt giúp hình rõ hơn; hãy hỏi lý do trước khi phản biện."] },
      { icon: "🗂️", label: "Portfolio", body: ["Hồ sơ nên cho thấy bạn minh họa được nhiều ngữ cảnh, không chỉ tranh đẹp lẻ.", "Mỗi dự án nên có brief, phác thảo, bản cuối và mô tả mục đích."] },
    ],
    path: [
      ["Vẽ đều từ đời thật", "Ký họa người, đồ vật, không gian, ánh sáng để có vốn hình."],
      ["Làm bài minh họa nhỏ", "Minh họa một bài báo, một truyện ngắn, một bài học hoặc một poster CLB."],
      ["Tập làm theo brief", "Đặt giới hạn: đối tượng, kích thước, màu, deadline, nơi dùng."],
      ["Xây portfolio theo dự án", "Không chỉ đăng tranh; hãy trình bày vấn đề và cách hình giải quyết vấn đề."],
      ["Thử cộng tác", "Làm với bạn viết truyện, CLB truyền thông, tạp chí sinh viên hoặc dự án social."],
      ["Tìm việc/freelance nhỏ", "Bắt đầu từ minh họa bài viết, sách nhỏ, social, giáo dục, sticker hoặc visual cho thương hiệu."],
    ],
  },
  {
    id: "8d64609b-3bd1-43b2-8412-88529fc70dca",
    slug: "nghe-motion-designer",
    title: "Motion Designer",
    viet: "Nhà thiết kế chuyển động",
    summary:
      "Người thiết kế chuyển động cho chữ, hình, logo, giao diện hoặc video để thông tin trở nên dễ hiểu, có nhịp và có cảm xúc hơn.",
    metaTitle: "Motion Designer là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Motion Designer làm gì trong truyền thông, UI, video; cần học thiết kế, animation và nhịp chuyển động ra sao.",
    intro: [
      "Một logo xuất hiện bằng chuyển động mượt, một video giải thích có icon chạy đúng nhịp, một màn hình app phản hồi bằng animation nhỏ. Những chuyển động đó thường do Motion Designer thiết kế.",
      "Motion Designer không chỉ làm mọi thứ bay qua bay lại. Họ dùng chuyển động để dẫn mắt, giải thích thứ tự thông tin và tạo cảm giác chuyên nghiệp cho sản phẩm.",
    ],
    definition: [
      "Motion Designer là người thiết kế chuyển động cho đồ họa: chữ, hình khối, logo, icon, giao diện, video quảng cáo, nội dung mạng xã hội, phim giới thiệu hoặc sản phẩm số.",
      "Khác Animator nhân vật tập trung vào diễn xuất, Motion Designer thường làm việc với thông tin, thương hiệu, bố cục và nhịp chuyển cảnh.",
    ],
    responsibilities: [
      "Biến thiết kế tĩnh thành chuyển động có nhịp và mục đích",
      "Thiết kế intro, outro, lower-third, explainer, social video hoặc UI motion",
      "Giữ chuyển động đúng thương hiệu và không làm người xem rối",
      "Xuất file/video/asset đúng chuẩn cho editor, developer hoặc social team",
    ],
    appears: [
      ["VFX & Motion Graphics", "video giải thích, quảng cáo, intro, title, đồ họa chuyển động."],
      ["UI/UX Design", "micro-interaction, chuyển màn, feedback khi bấm/tải/thành công."],
      ["Thiết kế đồ họa", "logo motion, campaign visual, social post động."],
    ],
    tasks: [
      {
        title: "Chọn nhịp chuyển động",
        body:
          "Một chuyển động nhanh cho cảm giác năng lượng, chậm cho cảm giác cao cấp hoặc nhẹ nhàng. Motion Designer chọn nhịp phù hợp thông điệp.",
        bullets: [
          ["Timing", "chuyển động kéo dài bao lâu"],
          ["Spacing", "tốc độ thay đổi nhanh chậm trong chuyển động"],
          ["Nhịp tổng thể", "đoạn video có thở, có điểm nhấn, không chạy đều đều"],
        ],
      },
      {
        title: "Dẫn mắt qua thông tin",
        body:
          "Khi có nhiều chữ và hình, chuyển động giúp người xem biết nên nhìn cái gì trước. Đây là phần thiết kế, không chỉ kỹ thuật phần mềm.",
        bullets: [
          ["Thứ tự", "tiêu đề, ý chính, minh họa, CTA xuất hiện hợp lý"],
          ["Điểm nhấn", "phần quan trọng có chuyển động nổi hơn"],
          ["Đọc được", "chữ không chạy quá nhanh hoặc quá nhiều hiệu ứng"],
        ],
      },
      {
        title: "Giữ đúng phong cách thương hiệu",
        body:
          "Một thương hiệu trẻ có thể chuyển động bật nảy, còn thương hiệu giáo dục hoặc tài chính cần chuyển động tiết chế hơn. Motion phải khớp giọng hình ảnh.",
        bullets: [
          ["Màu và font", "không phá hệ thiết kế tĩnh"],
          ["Tính cách", "vui, nghiêm túc, hiện đại, cao cấp hoặc thân thiện"],
          ["Nhất quán", "cùng một dự án không nên mỗi cảnh một kiểu chuyển động"],
        ],
      },
      {
        title: "Xuất đúng định dạng",
        body:
          "Motion dùng cho nhiều nơi: TikTok, màn hình LED, app, web, video ngang/dọc. File phải đúng tỷ lệ, dung lượng và yêu cầu kỹ thuật.",
        bullets: [
          ["Tỷ lệ", "9:16, 1:1, 16:9 hoặc theo màn hình thật"],
          ["Dung lượng", "đủ nhẹ để tải nhanh nếu dùng web/app"],
          ["Phiên bản", "có/không nền, loop, có/không âm thanh khi cần"],
        ],
      },
    ],
    skills: [
      { icon: "🎬", label: "Nhịp chuyển động", body: ["Cần hiểu timing, spacing, ease, nhấn và nghỉ.", "Tập làm một quả bóng, một dòng chữ, một logo chuyển động với nhiều nhịp khác nhau."] },
      { icon: "🎨", label: "Thiết kế đồ họa", body: ["Motion tốt bắt đầu từ bố cục, chữ, màu và hierarchy tốt.", "Nếu thiết kế tĩnh rối, chuyển động sẽ càng rối."] },
      { icon: "👁️", label: "Dẫn mắt", body: ["Chuyển động phải giúp người xem đọc thông tin.", "Hỏi: sau 3 giây, người xem có hiểu ý chính không?"] },
      { icon: "🖥️", label: "Công cụ", body: ["After Effects phổ biến; thêm Figma, Blender, Rive hoặc Lottie tùy hướng.", "Không học hiệu ứng lẻ trước khi hiểu nguyên lý chuyển động."] },
      { icon: "🔧", label: "Tối ưu file", body: ["Motion cho web/app cần nhẹ và đúng format.", "Tập xuất mp4, gif, lottie hoặc video nhiều tỷ lệ."] },
      { icon: "🤝", label: "Làm việc nhóm", body: ["Motion thường nhận thiết kế từ designer và bàn giao cho editor/developer.", "Cần đặt tên layer/file rõ để người khác dùng tiếp."] },
    ],
    path: [
      ["Học thiết kế tĩnh", "Bố cục, chữ, màu, khoảng trắng là nền cho motion."],
      ["Học nguyên lý animation", "Timing, spacing, anticipation, ease in/out, follow-through."],
      ["Làm 10 bài nhỏ", "Logo reveal, title, icon loop, explainer 15 giây, UI interaction."],
      ["Tập làm theo brand", "Chọn một thương hiệu và thiết kế motion đúng tính cách của họ."],
      ["Xây reel ngắn", "Show 45–60 giây các đoạn tốt nhất, có nhịp và đa dạng ngữ cảnh."],
      ["Ứng tuyển/freelance", "Có thể bắt đầu từ social motion, video editor biết motion, UI motion hoặc motion junior."],
    ],
  },
  {
    id: "7f6a34df-99d0-4b0d-9cc0-c2a02391e4f6",
    slug: "nghe-3d-animator",
    title: "3D Animator",
    viet: "Họa sĩ hoạt hình 3D",
    summary:
      "Người tạo chuyển động cho nhân vật, sinh vật, đạo cụ hoặc camera 3D để hành động có trọng lượng, cảm xúc và nhịp diễn xuất.",
    metaTitle: "3D Animator là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "3D Animator làm gì trong hoạt hình, game, 3D; cần học diễn xuất, chuyển động và phần mềm ra sao để bắt đầu.",
    intro: [
      "Một nhân vật 3D biết sợ, biết vui, biết chạy hụt hơi hay lén nhìn sang bên không tự nhiên mà có. 3D Animator là người làm cho mô hình cứng trở thành nhân vật có hành động và cảm xúc.",
      "Nghề này không chỉ kéo tay chân nhân vật trong phần mềm. Animator phải hiểu nhịp, trọng lượng, diễn xuất và mục tiêu của từng chuyển động.",
    ],
    definition: [
      "3D Animator là người tạo animation cho nhân vật, sinh vật, đồ vật, camera hoặc cơ chế trong không gian 3D. Họ làm việc trên rig đã được chuẩn bị để tạo dáng và chuyển động qua thời gian.",
      "Trong phim hoạt hình, Animator kể cảm xúc. Trong game, Animator làm chuyển động phản hồi tốt với gameplay. Trong quảng cáo/3D, họ giúp sản phẩm hoặc camera chuyển động thuyết phục.",
    ],
    responsibilities: [
      "Tạo dáng chính, nhịp chuyển động và diễn xuất cho nhân vật/đồ vật",
      "Giữ chuyển động có trọng lượng, rõ ý và đúng phong cách dự án",
      "Sửa animation theo góp ý của đạo diễn, lead animator hoặc game designer",
      "Phối hợp với rigging, layout, camera, game engine hoặc đội dựng phim",
    ],
    appears: [
      ["Hoạt hình", "diễn xuất nhân vật, hành động, biểu cảm, cảnh phim."],
      ["Game", "đi, chạy, nhảy, tấn công, tương tác, cinematic."],
      ["3D Art & Visualization", "camera, sản phẩm, nhân vật minh họa, video 3D."],
    ],
    tasks: [
      {
        title: "Hiểu mục tiêu hành động",
        body:
          "Một nhân vật đi bộ vì vui sẽ khác đi bộ vì mệt. Animator cần biết nhân vật muốn gì và cảm thấy gì trước khi đặt keyframe.",
        bullets: [
          ["Mục tiêu", "nhân vật đang cố làm gì"],
          ["Cảm xúc", "vui, sợ, mệt, tự tin, lúng túng"],
          ["Phong cách", "chân thật, hoạt hình, game nhanh hay cinematic"],
        ],
      },
      {
        title: "Tạo pose và nhịp chính",
        body:
          "Animator thường bắt đầu bằng các pose quan trọng: bắt đầu, điểm nhấn, kết thúc. Sau đó mới thêm chuyển động giữa để hành động mượt và rõ.",
        bullets: [
          ["Pose chính", "dáng thể hiện ý của hành động"],
          ["Silhouette", "nhìn bóng dáng vẫn đọc được hành động"],
          ["Timing", "hành động nhanh/chậm đúng lực và cảm xúc"],
        ],
      },
      {
        title: "Làm chuyển động có trọng lượng",
        body:
          "Nếu nhân vật nhảy mà không thấy nặng, vung kiếm không có lực, quay đầu như robot, animation sẽ giả. Animator chỉnh khoảng cách, gia tốc và độ trễ để chuyển động sống hơn.",
        bullets: [
          ["Trọng lượng", "vật nặng và nhẹ chuyển động khác nhau"],
          ["Gia tốc", "không phải mọi thứ bắt đầu/dừng đều đều"],
          ["Độ trễ", "tóc, tay, áo, thân người không chuyển cùng lúc hoàn toàn"],
        ],
      },
      {
        title: "Sửa polish và bàn giao",
        body:
          "Bản đầu thường chỉ đúng ý chính. Giai đoạn polish sửa mắt nhìn, ngón tay, nhịp thở, rung nhỏ, tiếp xúc chân đất và lỗi kỹ thuật trước khi bàn giao.",
        bullets: [
          ["Foot contact", "chân không trượt hoặc xuyên mặt đất"],
          ["Biểu cảm", "mắt, miệng, đầu giúp diễn xuất rõ hơn"],
          ["Bàn giao", "đúng frame, đúng file, đúng yêu cầu engine hoặc dựng phim"],
        ],
      },
    ],
    skills: [
      { icon: "🏃", label: "Quan sát chuyển động", body: ["Cần nhìn được cơ thể bắt đầu, dừng, lệch trọng tâm ra sao.", "Quay video bản thân làm hành động rồi phân tích frame-by-frame."] },
      { icon: "🎭", label: "Diễn xuất", body: ["Animator là diễn viên phía sau nhân vật.", "Tập diễn trước gương: cùng một câu nhưng vui, sợ, tức, ngại sẽ khác nhau."] },
      { icon: "⏱️", label: "Timing", body: ["Chuyển động hay nhờ nhịp đúng.", "Thử cùng một cú nhảy ở 12, 24, 36 frame để thấy cảm giác đổi ra sao."] },
      { icon: "🧊", label: "Hiểu rig 3D", body: ["Cần biết điều khiển rig mà không làm model méo hoặc lỗi.", "Không cần làm rig giỏi, nhưng phải hiểu giới hạn của rig."] },
      { icon: "🔍", label: "Tỉ mỉ polish", body: ["Animation tốt hơn nhờ nhiều sửa nhỏ.", "Mắt nhìn, tay, chân, nhịp thở, độ trễ đều cần kiểm tra."] },
      { icon: "🤝", label: "Nhận góp ý", body: ["Animation trong studio sửa rất nhiều vòng.", "Hãy lưu bản cũ và ghi rõ thay đổi sau mỗi feedback."] },
    ],
    path: [
      ["Học nguyên lý animation", "Timing, spacing, squash/stretch, anticipation, follow-through, arcs."],
      ["Làm bài tập cơ bản", "Bóng nảy, vật nặng nhẹ, pendulum, walk cycle, run cycle."],
      ["Diễn xuất nhân vật ngắn", "Một shot 5–10 giây có cảm xúc rõ quan trọng hơn nhiều bài dài rời rạc."],
      ["Học phần mềm 3D", "Blender/Maya đều được; tập dùng rig có sẵn để tập animation."],
      ["Xây reel", "Chọn 5–8 shot tốt, cắt ngắn, ghi rõ vai trò của bạn."],
      ["Ứng tuyển junior", "Có thể bắt đầu từ animation junior, gameplay animator, layout/previz assistant hoặc 3D generalist thiên animation."],
    ],
  },
  {
    id: "7f3c25c3-007a-47d6-bd82-1b0b4bea6d7e",
    slug: "nghe-3d-generalist",
    title: "3D Generalist",
    viet: "Họa sĩ 3D tổng hợp",
    summary:
      "Người có thể làm nhiều khâu 3D ở mức đủ dùng — dựng hình, chất liệu, ánh sáng, render, đôi khi animation — để tạo sản phẩm hoặc prototype hoàn chỉnh.",
    metaTitle: "3D Generalist là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "3D Generalist làm gì, khác specialist ra sao, cần học các khâu 3D thế nào để bắt đầu.",
    intro: [
      "Trong một dự án nhỏ, không phải lúc nào cũng có riêng modeler, texture artist, lighting artist, render TD. Có lúc cần một người đủ hiểu nhiều khâu để làm ra hình 3D hoàn chỉnh. Đó là 3D Generalist.",
      "3D Generalist không nhất thiết giỏi nhất mọi mảng. Điểm mạnh là nhìn được toàn bộ quy trình và biết làm đủ tốt để sản phẩm chạy được từ đầu đến cuối.",
    ],
    definition: [
      "3D Generalist là người làm nhiều công đoạn trong sản xuất 3D: dựng model, UV, vật liệu, texture, ánh sáng, camera, render, đôi khi rig/animation hoặc compositing cơ bản.",
      "Vai trò này phổ biến trong studio nhỏ, quảng cáo, sản phẩm, diễn họa, game indie, nội dung social, hoặc giai đoạn prototype khi cần tốc độ và tính linh hoạt.",
    ],
    responsibilities: [
      "Tạo hoặc xử lý asset 3D từ đầu đến bản trình bày",
      "Hiểu các khâu chính để chuyển file sạch giữa model, texture, lighting, render",
      "Tự giải quyết lỗi kỹ thuật cơ bản trong cảnh 3D",
      "Phối hợp với specialist khi dự án lớn hơn và cần chất lượng sâu hơn",
    ],
    appears: [
      ["3D Art & Visualization", "sản phẩm, nội thất, kiến trúc, quảng cáo, hình social."],
      ["Game", "prototype asset, môi trường nhỏ, hỗ trợ art pipeline indie."],
      ["VFX & Motion Graphics", "shot 3D ngắn, title, sản phẩm, background, render minh họa."],
    ],
    tasks: [
      {
        title: "Nhìn toàn bộ quy trình 3D",
        body:
          "Generalist cần biết cảnh đi từ ý tưởng đến hình cuối qua những bước nào. Nếu chỉ biết một nút phần mềm, rất dễ kẹt khi file lỗi hoặc cần đổi hướng.",
        bullets: [
          ["Model", "hình khối và topology đủ sạch"],
          ["Material/texture", "bề mặt có màu, độ nhám, chi tiết hợp lý"],
          ["Lighting/render", "cảnh ra hình có ánh sáng và chất lượng dùng được"],
        ],
      },
      {
        title: "Làm nhanh bản đủ dùng",
        body:
          "Trong prototype hoặc dự án nhỏ, tốc độ rất quan trọng. 3D Generalist biết khi nào cần làm kỹ, khi nào dùng asset có sẵn, khi nào giảm chi tiết để kịp mục tiêu.",
        bullets: [
          ["Ưu tiên", "phần người xem nhìn thấy nhiều nhất cần được chăm kỹ"],
          ["Tái sử dụng", "dùng thư viện asset đúng cách để tiết kiệm thời gian"],
          ["Giới hạn", "không cố làm chuyên sâu mọi thứ khi dự án không cần"],
        ],
      },
      {
        title: "Sửa lỗi giữa các khâu",
        body:
          "Một cảnh 3D có thể lỗi UV, texture mất link, ánh sáng quá nặng, render nhiễu, file quá lớn. Generalist cần đủ hiểu để tự xử lý phần lớn lỗi thường gặp.",
        bullets: [
          ["File sạch", "đặt tên, thư mục, version rõ"],
          ["Tối ưu", "giữ cảnh nhẹ vừa đủ"],
          ["Debug", "biết lỗi nằm ở model, vật liệu, ánh sáng hay render"],
        ],
      },
      {
        title: "Bàn giao hoặc phối hợp với specialist",
        body:
          "Khi dự án lớn, Generalist có thể chuẩn bị bản đầu rồi chuyển cho specialist làm sâu hơn. File gọn và giải thích rõ giúp cả đội tiết kiệm thời gian.",
        bullets: [
          ["Ghi chú", "phần nào tạm, phần nào final, phần nào cần specialist"],
          ["Định dạng", "xuất file đúng phần mềm/engine cần"],
          ["Chất lượng", "bản đủ dùng nhưng không giấu lỗi quan trọng"],
        ],
      },
    ],
    skills: [
      { icon: "🧊", label: "Nền tảng 3D rộng", body: ["Biết nhiều khâu ở mức dùng được: model, material, lighting, render.", "Học từng khâu qua dự án nhỏ thay vì chỉ xem tutorial rời rạc."] },
      { icon: "👁️", label: "Mắt thẩm mỹ", body: ["Dù tổng hợp, sản phẩm vẫn cần nhìn đẹp và rõ.", "Quan sát ảnh sản phẩm, phim, game, kiến trúc để học ánh sáng và bố cục."] },
      { icon: "🔧", label: "Tự sửa lỗi", body: ["Generalist thường là người đầu tiên gặp lỗi file.", "Tập đọc lỗi, thử thay đổi có ghi chép, không sửa mò quá lâu."] },
      { icon: "📦", label: "Quản lý asset", body: ["File 3D dễ rối nếu đặt tên và thư mục kém.", "Tập tổ chức scene sạch từ khi làm bài cá nhân."] },
      { icon: "⏱️", label: "Ưu tiên", body: ["Không thể làm mọi thứ hoàn hảo trong dự án nhỏ.", "Học quyết định phần nào cần kỹ, phần nào chỉ cần đủ dùng."] },
      { icon: "🤝", label: "Phối hợp", body: ["Generalist hay nối giữa nhiều nhóm.", "Biết nói rõ mình đã làm gì và cần người khác tiếp gì."] },
    ],
    path: [
      ["Học một phần mềm 3D chính", "Blender là điểm bắt đầu tốt; Maya/3ds Max/Cinema 4D tùy hướng sau này."],
      ["Làm dự án end-to-end", "Một sản phẩm, một căn phòng, một nhân vật đơn giản từ model đến render."],
      ["Học từng khâu bằng lỗi thật", "Khi render xấu, tìm do ánh sáng hay vật liệu; khi file nặng, tìm do model hay texture."],
      ["Tạo portfolio đa dạng nhưng gọn", "Show 3–5 dự án hoàn chỉnh thay vì nhiều bài tập lẻ."],
      ["Chọn mảng mạnh dần", "Sau khi biết rộng, bạn có thể nghiêng về model, lighting, product, game hoặc motion."],
      ["Ứng tuyển studio nhỏ/indie", "3D Generalist hợp nơi cần người linh hoạt và làm được nhiều đầu việc."],
    ],
  },
  {
    id: "bf04d350-b6fe-43be-979b-48c3d658a997",
    slug: "nghe-3d-modeler",
    title: "3D Modeler",
    viet: "Họa sĩ dựng hình 3D",
    summary:
      "Người dựng mô hình 3D cho nhân vật, đạo cụ, môi trường hoặc sản phẩm để các khâu texture, rig, animation, render hoặc game engine dùng tiếp.",
    metaTitle: "3D Modeler là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "3D Modeler làm gì trong game, hoạt hình, 3D; cần học hình khối, topology và portfolio ra sao.",
    intro: [
      "Trước khi nhân vật game có thể chạy, trước khi robot trong phim có thể cử động, trước khi một chiếc ghế 3D được render đẹp, cần có mô hình 3D. Người dựng phần hình khối đó là 3D Modeler.",
      "3D Modeler không chỉ nặn cho giống. Mô hình phải đúng tỷ lệ, đủ chi tiết, sạch kỹ thuật và phù hợp khâu tiếp theo.",
    ],
    definition: [
      "3D Modeler là người tạo mô hình 3D cho nhân vật, sinh vật, đạo cụ, môi trường, kiến trúc, sản phẩm hoặc asset game. Họ biến bản vẽ, ảnh tham chiếu hoặc ý tưởng thành hình khối trong phần mềm 3D.",
      "Tùy dự án, model có thể cần đẹp để render, nhẹ để chạy trong game, sạch để rig/animation, hoặc chính xác để trình bày sản phẩm.",
    ],
    responsibilities: [
      "Dựng hình khối, tỷ lệ và chi tiết của asset 3D",
      "Giữ topology/mesh đủ sạch cho texture, rig, animation hoặc engine",
      "Tạo phiên bản high-poly/low-poly khi dự án cần",
      "Sửa model theo feedback của concept, art director, rigging, tech art",
    ],
    appears: [
      ["Game", "nhân vật, vũ khí, đạo cụ, môi trường, asset tối ưu cho engine."],
      ["Hoạt hình", "model nhân vật/đạo cụ/môi trường để rig và animate."],
      ["3D Art & Visualization", "sản phẩm, nội thất, kiến trúc, mô hình quảng cáo."],
    ],
    tasks: [
      {
        title: "Đọc reference và xác định tỷ lệ",
        body:
          "Modeler cần hiểu hình đang dựng thuộc thế giới nào: stylized, realistic, cute, sci-fi hay sản phẩm thật. Tỷ lệ sai sẽ làm mọi chi tiết sau đó lệch.",
        bullets: [
          ["Reference", "ảnh thật, concept, bản vẽ kỹ thuật hoặc mood hình khối"],
          ["Tỷ lệ", "độ dài tay/chân, kích thước vật, scale trong scene"],
          ["Silhouette", "nhìn bóng dáng đã nhận ra nhân vật/vật thể chưa"],
        ],
      },
      {
        title: "Dựng hình từ lớn đến nhỏ",
        body:
          "Một lỗi phổ biến là lao vào chi tiết quá sớm. Modeler giỏi thường khóa hình khối lớn, sau đó mới tới chi tiết vừa và nhỏ.",
        bullets: [
          ["Blockout", "dựng khối thô để kiểm tra dáng"],
          ["Secondary forms", "chi tiết vừa như nếp lớn, mảng chính"],
          ["Fine details", "vết xước, nếp nhỏ, phụ kiện sau cùng"],
        ],
      },
      {
        title: "Giữ mesh sạch và dùng được",
        body:
          "Model đẹp nhưng topology rối có thể làm rig méo, texture khó, game nặng. 3D Modeler phải nghĩ đến người dùng tiếp file của mình.",
        bullets: [
          ["Topology", "lưới hợp lý quanh khớp, mặt, vùng biến dạng"],
          ["UV", "trải bề mặt để vẽ texture nếu vai trò yêu cầu"],
          ["Tối ưu", "độ chi tiết vừa đủ cho mục đích sử dụng"],
        ],
      },
      {
        title: "Bàn giao asset có tổ chức",
        body:
          "Trong production, file model cần tên rõ, scale đúng, pivot đúng, không dư rác scene. Bàn giao sạch giúp texture, rig, animation và engine làm nhanh hơn.",
        bullets: [
          ["Tên object", "không để Cube.001 lộn xộn"],
          ["Scale/pivot", "đúng để import và animate không lỗi"],
          ["Version", "biết bản nào đã duyệt, bản nào còn thử"],
        ],
      },
    ],
    skills: [
      { icon: "🧊", label: "Hình khối", body: ["Cần nhìn vật thể dưới dạng khối lớn, mặt phẳng, cạnh và tỷ lệ.", "Tập dựng đồ vật quanh nhà trước khi làm nhân vật phức tạp."] },
      { icon: "👁️", label: "Quan sát", body: ["Modeler giỏi nhìn ra độ cong, mép, nếp, tỷ lệ nhỏ mà người khác bỏ qua.", "So model với reference thường xuyên, đừng chỉ nhìn từ một góc."] },
      { icon: "🔧", label: "Topology", body: ["Lưới sạch giúp model dùng được trong production.", "Học edge flow quanh mắt, miệng, vai, khuỷu, đầu gối nếu làm nhân vật."] },
      { icon: "🎨", label: "Thẩm mỹ", body: ["Dù kỹ thuật tốt, model vẫn cần silhouette và chi tiết đẹp.", "Học từ sculpture, figure drawing, product design hoặc kiến trúc tùy hướng."] },
      { icon: "⏱️", label: "Kỷ luật chi tiết", body: ["Không sa vào chi tiết khi hình lớn còn sai.", "Luôn kiểm tra blockout trước khi sculpt/model kỹ."] },
      { icon: "🤝", label: "Bàn giao sạch", body: ["Model không sống một mình; nó đi sang texture, rig, animation, engine.", "Tập đặt tên, gom folder và ghi chú rõ từ dự án cá nhân."] },
    ],
    path: [
      ["Học phần mềm 3D", "Blender là điểm bắt đầu phổ biến; Maya/ZBrush/Substance tùy hướng sau này."],
      ["Dựng đồ vật đơn giản", "Ly, bàn, ghế, tai nghe, đạo cụ nhỏ để luyện tỷ lệ và topology."],
      ["Chọn hướng model", "Hard-surface, character, environment, product hoặc stylized asset."],
      ["Làm asset production-ready", "Có blockout, model sạch, UV/texture cơ bản nếu cần, render trình bày."],
      ["Xây portfolio theo chất lượng", "5 model tốt có wireframe và breakdown giá trị hơn 30 model chưa hoàn thiện."],
      ["Ứng tuyển junior", "Có thể bắt đầu từ asset artist, 3D modeler junior, game prop artist hoặc 3D visualization assistant."],
    ],
  },
  {
    id: "60b42609-4f30-46f9-95fc-b62619b5005f",
    slug: "nghe-character-concept-artist",
    title: "Character Concept Artist",
    viet: "Họa sĩ concept nhân vật",
    summary:
      "Người phát triển ý tưởng hình ảnh cho nhân vật — dáng, trang phục, biểu cảm, màu, đạo cụ — trước khi nhân vật được dựng 3D, vẽ truyện hoặc sản xuất.",
    metaTitle: "Character Concept Artist là gì? Công việc và lộ trình | CINS",
    metaDescription:
      "Character Concept Artist làm gì trong game, hoạt hình; cần học thiết kế nhân vật, kể chuyện và portfolio ra sao.",
    intro: [
      "Trước khi một nhân vật game có model 3D hay xuất hiện trong phim hoạt hình, đội sản xuất cần biết nhân vật đó trông ra sao, mặc gì, dùng vật gì, có tính cách gì. Character Concept Artist là người tìm ra câu trả lời bằng hình.",
      "Nghề này không chỉ vẽ nhân vật đẹp. Concept nhân vật phải kể được vai trò, xuất thân, tính cách và thế giới của nhân vật ngay từ cái nhìn đầu tiên.",
    ],
    definition: [
      "Character Concept Artist là họa sĩ phát triển ý tưởng nhân vật cho game, hoạt hình, phim, truyện, đồ chơi hoặc dự án giải trí. Họ tạo nhiều hướng thiết kế trước khi chọn phương án sản xuất.",
      "Khác Character Designer có thể tập trung nhiều vào bản thiết kế cuối và tính nhất quán, Concept Artist thường làm mạnh ở giai đoạn khám phá: thử hình dáng, trang phục, màu, đạo cụ, biến thể và mood.",
    ],
    responsibilities: [
      "Tạo nhiều phương án hình dáng, trang phục, màu và phụ kiện nhân vật",
      "Giữ thiết kế khớp câu chuyện, thế giới và vai trò nhân vật",
      "Vẽ turn-around, biểu cảm, pose hoặc sheet hỗ trợ sản xuất khi cần",
      "Sửa theo feedback của art director, writer, game designer hoặc director",
    ],
    appears: [
      ["Game", "thiết kế nhân vật chơi được, NPC, boss, class, skin, companion."],
      ["Hoạt hình", "tìm hình dáng nhân vật phù hợp diễn xuất và thế giới phim."],
      ["Minh họa/Comic", "phát triển dàn nhân vật trước khi vẽ truyện hoặc chiến dịch."],
    ],
    tasks: [
      {
        title: "Hiểu nhân vật trước khi vẽ",
        body:
          "Một nhân vật không bắt đầu từ tóc hay áo. Concept Artist cần hiểu họ là ai, sống ở đâu, muốn gì, mạnh/yếu chỗ nào và người xem cần cảm gì.",
        bullets: [
          ["Vai trò", "anh hùng, phản diện, phụ tá, dân thường, boss, mentor"],
          ["Tính cách", "rụt rè, liều lĩnh, lạnh lùng, vui nhộn, bí ẩn"],
          ["Thế giới", "hiện đại, fantasy, sci-fi, lịch sử, học đường, hậu tận thế"],
        ],
      },
      {
        title: "Khám phá nhiều silhouette",
        body:
          "Silhouette là dáng tổng thể khi nhìn xa. Nhân vật tốt thường nhận ra được ngay cả khi chưa thấy chi tiết mặt.",
        bullets: [
          ["Dáng lớn", "cao/thấp, vuông/tròn, nặng/nhẹ, nhanh/chậm"],
          ["Tỷ lệ", "đầu, vai, tay, chân, trang phục tạo cảm giác nhân vật"],
          ["Đọc nhanh", "người xem nhận ra vai trò trong vài giây"],
        ],
      },
      {
        title: "Thiết kế trang phục và đạo cụ có lý do",
        body:
          "Trang phục không nên chỉ đẹp. Nó nói về nghề, địa vị, văn hóa, thói quen, khả năng chiến đấu hoặc môi trường sống của nhân vật.",
        bullets: [
          ["Chức năng", "đồ mặc có hỗ trợ hành động không"],
          ["Câu chuyện", "vết rách, huy hiệu, túi đồ, vũ khí nói gì về nhân vật"],
          ["Màu sắc", "giúp phân phe, cảm xúc hoặc vai trò"],
        ],
      },
      {
        title: "Chuẩn bị hình cho production",
        body:
          "Concept tốt cần giúp các khâu sau hiểu và làm tiếp. Khi cần, artist vẽ thêm mặt trước/sau, chi tiết phụ kiện, biểu cảm hoặc bảng màu.",
        bullets: [
          ["Turn-around", "mặt trước, sau, bên để dựng model hoặc vẽ nhất quán"],
          ["Expression", "biểu cảm giúp hiểu tính cách"],
          ["Callout", "phóng to chi tiết quan trọng như vũ khí, chất liệu, họa tiết"],
        ],
      },
    ],
    skills: [
      { icon: "✏️", label: "Vẽ nhân vật", body: ["Cần nền tảng dáng người, anatomy, pose, gesture.", "Tập vẽ người thật rồi mới cách điệu để nhân vật không bị cứng."] },
      { icon: "🧠", label: "Kể chuyện", body: ["Thiết kế phải nói nhân vật là ai.", "Tự hỏi: nếu bỏ tên nhân vật, người xem đoán được gì từ hình?"] },
      { icon: "👁️", label: "Silhouette", body: ["Dáng tổng thể quyết định nhân vật có dễ nhớ không.", "Tập tô đen nhân vật của mình và xem còn đọc được không."] },
      { icon: "🎨", label: "Màu và chất liệu", body: ["Màu, vải, kim loại, da, tóc, phụ kiện đều kể chuyện.", "Quan sát thời trang, lịch sử, văn hóa, nghề nghiệp thật để thiết kế có gốc."] },
      { icon: "🔍", label: "Research", body: ["Concept cần tham chiếu tốt, không vẽ từ trí nhớ rỗng.", "Tạo bảng tham chiếu nhưng phải biến đổi, không chép nguyên."] },
      { icon: "🤝", label: "Nhận feedback", body: ["Giai đoạn concept là thử và bỏ nhiều phương án.", "Đừng tiếc bản đầu; hãy giữ lý do thiết kế và sửa để nhân vật rõ hơn."] },
    ],
    path: [
      ["Học gesture và anatomy", "Vẽ dáng nhanh, dáng hành động, tỷ lệ cơ thể, biểu cảm."],
      ["Thiết kế nhân vật từ brief", "Ví dụ: học sinh pháp sư, thợ máy tương lai, phản diện vui tính."],
      ["Làm nhiều silhouette", "Mỗi brief thử 10–20 dáng nhỏ trước khi chọn."],
      ["Làm character sheet", "Bản cuối có pose, màu, trang phục, biểu cảm, chi tiết phụ kiện."],
      ["Xây portfolio theo thế giới", "2–3 nhân vật cùng một thế giới tốt hơn nhiều nhân vật rời rạc không giải thích."],
      ["Ứng tuyển/đi dự án nhỏ", "Game jam, truyện ngắn, hoạt hình sinh viên là nơi luyện brief thật."],
    ],
  },
  {
    id: "51f2e792-3de3-4cea-b643-cda3dee07f32",
    slug: "nghe-character-designer",
    title: "Character Designer",
    viet: "Nhà thiết kế nhân vật",
    summary:
      "Người thiết kế nhân vật hoàn chỉnh và nhất quán cho truyện, hoạt hình, game hoặc thương hiệu — để nhân vật dễ nhận ra, dễ dùng và có cá tính rõ.",
    metaTitle: "Character Designer là gì? Công việc, kỹ năng và lộ trình | CINS",
    metaDescription:
      "Character Designer làm gì, khác concept artist ra sao, cần học vẽ nhân vật và character sheet như thế nào.",
    intro: [
      "Một nhân vật hay không chỉ nằm ở khuôn mặt đẹp. Dáng người, trang phục, biểu cảm, cách đứng, bảng màu và chi tiết nhỏ đều khiến nhân vật có cá tính. Character Designer là người làm cho nhân vật đó rõ ràng và dùng được lâu dài.",
      "Nếu concept là giai đoạn thử nhiều hướng, Character Designer thường đưa nhân vật về bản thiết kế nhất quán để cả đội có thể vẽ, dựng, animate hoặc in ấn theo cùng một chuẩn.",
    ],
    definition: [
      "Character Designer là người thiết kế nhân vật cho hoạt hình, truyện tranh, game, minh họa, mascot, đồ chơi hoặc thương hiệu. Họ tạo bản thiết kế giúp nhân vật dễ nhận ra và có thể được sản xuất nhất quán.",
      "Vai trò này gần với Character Concept Artist nhưng thiên hơn về hình dáng cuối, tính biểu cảm, khả năng lặp lại và hệ thống thiết kế của nhân vật.",
    ],
    responsibilities: [
      "Thiết kế hình dáng, màu, trang phục, biểu cảm và pose đặc trưng",
      "Tạo sheet nhân vật: mặt trước/sau/bên, biểu cảm, tỷ lệ, chi tiết",
      "Giữ nhân vật nhất quán qua nhiều cảnh, tập, tranh hoặc sản phẩm",
      "Phối hợp với writer, animator, illustrator, 3D artist hoặc brand team",
    ],
    appears: [
      ["Hoạt hình", "nhân vật cần dễ animate và biểu cảm rõ."],
      ["Comic & Truyện tranh", "nhân vật cần dễ vẽ lại nhiều lần, nhận ra nhanh."],
      ["Game/Brand", "mascot, nhân vật đại diện, skin, avatar hoặc NPC."],
    ],
    tasks: [
      {
        title: "Xác định cá tính bằng hình",
        body:
          "Người xem nên cảm được nhân vật trước khi đọc mô tả. Character Designer dùng dáng, tỷ lệ, mắt, miệng, trang phục và màu để kể cá tính.",
        bullets: [
          ["Dáng", "tròn tạo thân thiện, góc cạnh tạo sắc/khó gần, dài tạo thanh thoát"],
          ["Biểu cảm", "mắt, lông mày, miệng, cổ, vai đều góp phần diễn xuất"],
          ["Chi tiết nhớ được", "một phụ kiện hoặc dáng tóc có thể trở thành dấu hiệu nhận diện"],
        ],
      },
      {
        title: "Làm nhân vật dễ vẽ/dựng lại",
        body:
          "Một nhân vật quá nhiều chi tiết có thể đẹp một tranh nhưng khó dùng trong truyện dài hoặc hoạt hình. Designer cần cân bằng đẹp và khả thi.",
        bullets: [
          ["Độ phức tạp", "vừa đủ để có cá tính, không quá nặng khi lặp lại"],
          ["Tỷ lệ", "nhất quán giữa các góc nhìn"],
          ["Hình khối", "rõ để animator/illustrator/3D artist dùng tiếp"],
        ],
      },
      {
        title: "Tạo character sheet",
        body:
          "Character sheet là tài liệu giúp cả đội vẽ hoặc dựng nhân vật giống nhau. Nó thường có turn-around, biểu cảm, màu, chi tiết trang phục và pose.",
        bullets: [
          ["Turn-around", "mặt trước, sau, bên, 3/4"],
          ["Expression", "vui, buồn, tức, sợ, ngạc nhiên, ngại"],
          ["Color key", "màu chính/phụ và cách dùng"],
        ],
      },
      {
        title: "Giữ nhân vật sống qua nhiều ngữ cảnh",
        body:
          "Nhân vật có thể xuất hiện trong cảnh vui, cảnh hành động, ảnh social, sticker, poster. Thiết kế tốt phải linh hoạt mà vẫn nhận ra là cùng một người.",
        bullets: [
          ["Pose đặc trưng", "cách đứng/ngồi/chạy thể hiện cá tính"],
          ["Biến thể", "trang phục khác nhưng vẫn giữ dấu hiệu nhận diện"],
          ["Consistency", "không đổi tỷ lệ/mặt quá nhiều giữa các hình"],
        ],
      },
    ],
    skills: [
      { icon: "✏️", label: "Vẽ dáng và biểu cảm", body: ["Cần hiểu gesture, anatomy, facial expression.", "Tập vẽ cùng một nhân vật trong nhiều cảm xúc và góc nhìn."] },
      { icon: "🧠", label: "Thiết kế cá tính", body: ["Nhân vật phải có tính cách đọc được qua hình.", "Viết 5 tính từ cho nhân vật rồi kiểm tra hình có nói được 5 từ đó không."] },
      { icon: "👁️", label: "Tính nhất quán", body: ["Character Designer phải giữ nhân vật không bị đổi mặt qua từng tranh.", "Dùng sheet, tỷ lệ và shape language để kiểm tra."] },
      { icon: "🎨", label: "Màu sắc", body: ["Bảng màu giúp nhân vật dễ nhớ và hợp thế giới.", "Không dùng quá nhiều màu nếu không có lý do."] },
      { icon: "📋", label: "Tài liệu hóa", body: ["Sheet rõ giúp đội khác sản xuất nhanh.", "Hãy ghi chú chi tiết quan trọng, vật liệu, màu và lỗi không được làm."] },
      { icon: "🤝", label: "Phối hợp", body: ["Nhân vật đi qua writer, animator, modeler, illustrator.", "Biết nghe giới hạn sản xuất để thiết kế không chỉ đẹp trên giấy."] },
    ],
    path: [
      ["Học vẽ nhân vật nền tảng", "Gesture, anatomy, biểu cảm, trang phục, pose."],
      ["Tạo nhân vật theo brief", "Không chỉ fanart; hãy tự đặt bối cảnh, vai trò, tính cách."],
      ["Làm sheet hoàn chỉnh", "Turn-around, expression, pose, màu, phụ kiện."],
      ["Thiết kế bộ nhân vật", "3–5 nhân vật cùng thế giới để luyện consistency."],
      ["Làm thử sản phẩm", "Sticker, truyện ngắn, hoạt hình ngắn, mascot CLB để kiểm tra nhân vật có dùng được không."],
      ["Xây portfolio", "Ưu tiên sheet rõ và nhân vật có câu chuyện hơn tranh splash lẻ."],
    ],
  },
  {
    id: "a6a8fc12-153b-4696-b1e8-34d67d0f1b7a",
    slug: "nghe-character-modeler",
    title: "Character Modeler",
    viet: "Họa sĩ dựng hình nhân vật 3D",
    summary:
      "Người dựng nhân vật 3D từ concept thành mô hình có hình khối, tỷ lệ, chi tiết và topology phù hợp để texture, rig, animate hoặc đưa vào game.",
    metaTitle: "Character Modeler là gì? Công việc, kỹ năng và lộ trình | CINS",
    metaDescription:
      "Character Modeler làm gì trong game, hoạt hình, 3D; cần học anatomy, sculpt, topology và portfolio ra sao.",
    intro: [
      "Một bản vẽ nhân vật chỉ là điểm bắt đầu. Để nhân vật xuất hiện trong game hoặc hoạt hình 3D, nó cần được dựng thành mô hình có thể xoay mọi góc, gắn chất liệu, rig và animate. Character Modeler là người làm việc đó.",
      "Nghề này đòi hỏi mắt nghệ thuật lẫn kỹ thuật. Model phải giống tinh thần concept, đẹp ở nhiều góc và sạch đủ để các khâu sau sử dụng.",
    ],
    definition: [
      "Character Modeler là người dựng mô hình 3D cho nhân vật người, sinh vật, quái vật, mascot hoặc stylized character. Họ có thể sculpt chi tiết, retopology, tạo UV và chuẩn bị model cho texture/rig.",
      "Khác 3D Modeler tổng quát, Character Modeler tập trung sâu vào anatomy, mặt, dáng, trang phục, tóc, biểu cảm và vùng biến dạng của nhân vật.",
    ],
    responsibilities: [
      "Chuyển concept nhân vật thành model 3D đúng tỷ lệ và tinh thần",
      "Dựng hình khối lớn, chi tiết cơ thể, trang phục, tóc, phụ kiện",
      "Tạo topology sạch quanh vùng mặt, vai, khuỷu, gối, tay nếu cần rig",
      "Phối hợp với concept artist, texture artist, rigger, animator và tech art",
    ],
    appears: [
      ["Game", "nhân vật chơi được, NPC, boss, skin, creature tối ưu cho engine."],
      ["Hoạt hình", "nhân vật cần rig, biểu cảm và diễn xuất tốt."],
      ["3D Art & Visualization", "mascot, nhân vật quảng cáo, collectible, cinematic."],
    ],
    tasks: [
      {
        title: "Giữ tinh thần concept khi chuyển sang 3D",
        body:
          "Một nhân vật đẹp trên tranh có thể khó chuyển thành 3D. Modeler phải giữ dáng, tỷ lệ, cảm xúc và chi tiết quan trọng mà vẫn làm được từ mọi góc.",
        bullets: [
          ["Silhouette", "dáng nhân vật vẫn nhận ra khi xoay quanh"],
          ["Tỷ lệ", "đầu, vai, tay, chân, phụ kiện đúng tinh thần thiết kế"],
          ["Cảm xúc", "mặt và pose trung tính vẫn có cá tính"],
        ],
      },
      {
        title: "Sculpt và dựng chi tiết nhân vật",
        body:
          "Character Modeler thường đi từ khối lớn đến anatomy, trang phục, tóc, nếp vải, giáp, da hoặc phụ kiện. Mỗi chi tiết cần có lý do và độ ưu tiên.",
        bullets: [
          ["Khối lớn", "thân, đầu, tay chân, dáng tổng thể"],
          ["Trang phục", "nếp vải, lớp đồ, giáp, phụ kiện"],
          ["Chi tiết nhỏ", "nếp da, vết xước, tóc, họa tiết chỉ làm khi khối lớn đã đúng"],
        ],
      },
      {
        title: "Làm topology cho rig/animation",
        body:
          "Nhân vật cần cử động nên lưới quanh khớp và mặt phải hợp lý. Topology kém sẽ làm cười méo, vai gãy hoặc khuỷu tay xấu.",
        bullets: [
          ["Edge flow", "luồng cạnh quanh mắt, miệng, vai, khuỷu, gối"],
          ["Retopology", "chuyển sculpt nặng thành mesh sạch dùng được"],
          ["Test pose", "kiểm tra vùng biến dạng quan trọng"],
        ],
      },
      {
        title: "Bàn giao model cho các khâu sau",
        body:
          "Model nhân vật thường đi sang texture, rig, animation, engine. File cần scale đúng, tên rõ, UV hợp lý và không có geometry thừa.",
        bullets: [
          ["UV/texture handoff", "bề mặt đủ rõ để vẽ chất liệu"],
          ["Rig handoff", "mesh sạch, vùng biến dạng hợp lý"],
          ["Engine/render", "độ chi tiết và format đúng yêu cầu"],
        ],
      },
    ],
    skills: [
      { icon: "👤", label: "Anatomy", body: ["Cần hiểu cơ thể người/sinh vật để nhân vật không bị sai khối.", "Kể cả stylized vẫn cần nền anatomy để cách điệu có chủ ý."] },
      { icon: "🧊", label: "Sculpt/modeling", body: ["Biết sculpt khối lớn và dựng chi tiết nhân vật.", "ZBrush/Blender/Maya/Substance tùy pipeline, nhưng nguyên lý quan trọng hơn tool."] },
      { icon: "👁️", label: "Silhouette", body: ["Nhân vật phải đẹp ở nhiều góc, không chỉ một góc render.", "Xoay model thường xuyên khi làm."] },
      { icon: "🔧", label: "Topology", body: ["Topology quyết định nhân vật rig/animate có tốt không.", "Học edge flow cho mặt và khớp từ sớm."] },
      { icon: "🎨", label: "Cảm giác chất liệu", body: ["Da, tóc, vải, kim loại, da thú, giáp đều cần xử lý khác nhau.", "Quan sát vật liệu thật để sculpt/texture có cơ sở."] },
      { icon: "🤝", label: "Phối hợp production", body: ["Character Modeler phải nghe feedback từ rigger, animator, tech artist.", "Đừng chỉ bảo vệ vẻ đẹp; hãy đảm bảo model dùng được."] },
    ],
    path: [
      ["Học anatomy và gesture", "Vẽ/đọc cơ thể trước khi sculpt nhân vật phức tạp."],
      ["Sculpt bust và full body", "Bắt đầu từ đầu/mặt, sau đó đến toàn thân và trang phục."],
      ["Học retopology và UV", "Model đẹp cần được sản xuất tiếp, không chỉ render sculpt nặng."],
      ["Làm nhân vật hoàn chỉnh", "Concept → sculpt → retopo → UV → texture cơ bản → turntable/render."],
      ["Show breakdown", "Portfolio nên có wireframe, texture map, turntable, close-up mặt/tay/chất liệu."],
      ["Ứng tuyển character/creature junior", "Có thể bắt đầu từ character artist junior, 3D modeler, game asset artist."],
    ],
  },
  {
    id: "b34377d2-83ed-490e-b338-1da9ee53d20c",
    slug: "nghe-costume-designer",
    title: "Costume Designer",
    viet: "Nhà thiết kế trang phục",
    summary:
      "Người thiết kế trang phục cho phim, sân khấu, nhân vật, game hoặc concept để trang phục kể được bối cảnh, tính cách và vai trò của nhân vật.",
    metaTitle: "Costume Designer là gì? Công việc, kỹ năng và lộ trình | CINS",
    metaDescription:
      "Costume Designer làm gì trong phim, hoạt hình, game và thời trang; cần học trang phục, nhân vật, chất liệu ra sao.",
    intro: [
      "Một nhân vật vừa bước vào khung hình, người xem đã đoán họ giàu hay nghèo, thuộc thời đại nào, tính cách ra sao, đang che giấu hay phô bày điều gì. Trang phục làm được điều đó. Costume Designer là người thiết kế phần ngôn ngữ ấy.",
      "Nghề này không chỉ chọn đồ đẹp. Trang phục phải hợp câu chuyện, cơ thể, hành động, bối cảnh, ánh sáng, chất liệu và khả năng sản xuất.",
    ],
    definition: [
      "Costume Designer là người thiết kế trang phục cho phim, sân khấu, hoạt hình, game, nhân vật, MV, quảng cáo hoặc dự án trình diễn. Họ dùng quần áo, phụ kiện, màu, chất liệu và form dáng để kể về nhân vật.",
      "Trong phim thật, trang phục còn phải may/mua/thuê/sửa và dùng được khi diễn viên di chuyển. Trong hoạt hình/game, thiết kế phải rõ nhân vật và khả thi cho vẽ, dựng 3D hoặc animate.",
    ],
    responsibilities: [
      "Nghiên cứu bối cảnh, nhân vật, thời kỳ, văn hóa và phong cách dự án",
      "Thiết kế trang phục, phụ kiện, bảng màu và biến thể theo cảnh",
      "Phối hợp với đạo diễn, art director, stylist, makeup, diễn viên hoặc artist",
      "Theo dõi việc sản xuất/sử dụng trang phục để giữ đúng ý đồ",
    ],
    appears: [
      ["Phim & Điện ảnh", "trang phục nhân vật theo cảnh, thời kỳ, tâm lý, continuity."],
      ["Thiết kế thời trang", "kiến thức form dáng, chất liệu, may đo, styling."],
      ["Game/Hoạt hình", "costume concept, skin, class outfit, trang phục nhân vật."],
    ],
    tasks: [
      {
        title: "Nghiên cứu nhân vật và bối cảnh",
        body:
          "Trang phục có thể nói về thời đại, nghề nghiệp, địa vị, khí hậu, văn hóa, thói quen và tâm lý. Costume Designer cần research trước khi vẽ hoặc chọn đồ.",
        bullets: [
          ["Bối cảnh", "thời kỳ, địa điểm, khí hậu, văn hóa, tầng lớp"],
          ["Nhân vật", "tuổi, nghề, tính cách, hoàn cảnh, thay đổi qua câu chuyện"],
          ["Hành động", "nhân vật cần chạy, chiến đấu, nhảy, ngồi, biểu diễn hay làm việc"],
        ],
      },
      {
        title: "Thiết kế form, màu và chất liệu",
        body:
          "Cùng một áo khoác nhưng form rộng, chất liệu thô và màu tối sẽ kể câu chuyện khác form gọn, vải bóng và màu sáng.",
        bullets: [
          ["Form dáng", "ôm, rộng, nặng, nhẹ, mềm, cứng"],
          ["Màu sắc", "phân phe, cảm xúc, trạng thái nhân vật"],
          ["Chất liệu", "vải, da, kim loại, nhựa, lông, phụ kiện tạo cảm giác khác nhau"],
        ],
      },
      {
        title: "Giữ trang phục dùng được trong sản xuất",
        body:
          "Thiết kế đẹp nhưng diễn viên không cử động được, animator khó vẽ lại, modeler không dựng nổi thì không ổn. Costume Designer phải nghĩ đến cách sản xuất.",
        bullets: [
          ["Tính khả thi", "may, thuê, dựng 3D hoặc vẽ lặp lại được"],
          ["Continuity", "trang phục không sai giữa các cảnh liên tiếp"],
          ["Bảo trì", "trang phục có thể dùng nhiều ngày quay hoặc nhiều scene"],
        ],
      },
      {
        title: "Theo dõi biến đổi của nhân vật",
        body:
          "Nhân vật có thể thay đổi tâm lý hoặc địa vị qua câu chuyện. Trang phục tốt phản ánh hành trình đó bằng màu, độ sạch/bẩn, form hoặc phụ kiện.",
        bullets: [
          ["Arc nhân vật", "đầu phim khác cuối phim như thế nào"],
          ["Phiên bản cảnh", "đồ thường ngày, chiến đấu, lễ hội, bị thương, cải trang"],
          ["Dấu hiệu nhận diện", "dù đổi đồ vẫn nhận ra là cùng nhân vật"],
        ],
      },
    ],
    skills: [
      { icon: "👗", label: "Trang phục", body: ["Cần hiểu form dáng, chất liệu, lớp đồ, phụ kiện.", "Quan sát quần áo đời thật: vì sao người ta mặc như vậy trong môi trường đó?"] },
      { icon: "🧠", label: "Nhân vật", body: ["Trang phục kể tính cách và bối cảnh.", "Tập thiết kế cùng một nhân vật ở 3 giai đoạn khác nhau."] },
      { icon: "🔍", label: "Research", body: ["Sai thời kỳ hoặc văn hóa có thể làm thiết kế mất tin cậy.", "Tìm nguồn tham chiếu đa dạng, ghi rõ điều học được, không chép nguyên."] },
      { icon: "🎨", label: "Màu/chất liệu", body: ["Màu và chất liệu ảnh hưởng trực tiếp đến cảm xúc.", "Tạo bảng vật liệu cho từng nhân vật hoặc phe nhóm."] },
      { icon: "📋", label: "Tổ chức", body: ["Phim/series có rất nhiều bộ đồ và phiên bản.", "Tập làm costume sheet có scene, trạng thái, phụ kiện, ghi chú."] },
      { icon: "🤝", label: "Phối hợp", body: ["Costume liên quan diễn viên, makeup, ánh sáng, art, camera, animator/modeler.", "Thiết kế cần đẹp và dùng được bởi cả đội."] },
    ],
    path: [
      ["Học thời trang và hình họa", "Form dáng, chất liệu, màu, cơ thể người, lịch sử trang phục cơ bản."],
      ["Thiết kế costume theo nhân vật", "Chọn một nhân vật và làm 3 phiên bản theo bối cảnh khác nhau."],
      ["Làm costume sheet", "Mặt trước/sau, phụ kiện, chất liệu, bảng màu, ghi chú chức năng."],
      ["Tham gia phim/ảnh/CLB", "Styling cho phim ngắn, photoshoot, sân khấu, cosplay hoặc dự án nhân vật."],
      ["Xây portfolio có research", "Trình bày bảng tham chiếu, phác thảo, bản cuối và lý do thiết kế."],
      ["Tìm hướng phù hợp", "Phim thật, game/animation character costume, fashion styling hoặc concept art."],
    ],
  },
  {
    id: "c9cc5127-b07d-4f8b-b085-221308a20279",
    slug: "nghe-creative-director",
    title: "Creative Director",
    viet: "Giám đốc sáng tạo",
    summary:
      "Người giữ hướng sáng tạo tổng thể cho thương hiệu, chiến dịch hoặc sản phẩm — quyết định ý tưởng lớn, giọng điệu, trải nghiệm và tiêu chuẩn đầu ra.",
    metaTitle: "Creative Director là gì? Công việc, kỹ năng và lộ trình | CINS",
    metaDescription:
      "Creative Director làm gì, khác Art Director ra sao, cần tích lũy tư duy, lãnh đạo sáng tạo và portfolio như thế nào.",
    intro: [
      "Một chiến dịch có phim, poster, social, sự kiện, landing page và nội dung KOL nhưng vẫn nói cùng một ý tưởng. Một thương hiệu nhiều năm vẫn giữ được giọng riêng. Người giữ hướng sáng tạo lớn đó thường là Creative Director.",
      "Creative Director không chỉ nghĩ ý tưởng hay. Họ phải biến mục tiêu kinh doanh/truyền thông thành hướng sáng tạo rõ, dẫn đội làm đúng và quyết định khi có nhiều phương án đẹp nhưng không cùng mục tiêu.",
    ],
    definition: [
      "Creative Director là người phụ trách hướng sáng tạo tổng thể của thương hiệu, chiến dịch, sản phẩm, studio hoặc đội nội dung. Họ giữ ý tưởng lớn, giọng điệu, trải nghiệm và tiêu chuẩn sáng tạo.",
      "Khác Art Director tập trung mạnh vào phần hình ảnh, Creative Director thường bao quát rộng hơn: thông điệp, concept, kịch bản, hình ảnh, âm thanh, trải nghiệm, đội ngũ và cách sản phẩm được cảm nhận.",
    ],
    responsibilities: [
      "Chuyển mục tiêu dự án thành hướng sáng tạo rõ ràng",
      "Dẫn đội art, copy, design, video, strategy hoặc product cùng đi một hướng",
      "Duyệt concept, mood, thông điệp và đầu ra quan trọng",
      "Làm việc với khách hàng, founder, producer hoặc ban lãnh đạo để bảo vệ hướng sáng tạo",
    ],
    appears: [
      ["Thiết kế đồ họa/Agency", "chiến dịch thương hiệu, quảng cáo, social, activation."],
      ["Thời trang/Giải trí", "hướng hình ảnh bộ sưu tập, show, MV, editorial, campaign."],
      ["Sản phẩm số/Game", "định hướng trải nghiệm, thế giới, giọng nói thương hiệu hoặc creative vision."],
    ],
    tasks: [
      {
        title: "Tìm ý tưởng lớn",
        body:
          "Creative Director cần hiểu vấn đề thật của dự án: muốn thay đổi nhận thức, bán sản phẩm, ra mắt thương hiệu, xây cộng đồng hay kể câu chuyện mới.",
        bullets: [
          ["Mục tiêu", "dự án cần đạt điều gì ngoài việc nhìn đẹp"],
          ["Insight", "người xem/người dùng đang nghĩ, sợ, muốn hoặc tin điều gì"],
          ["Concept", "ý tưởng lớn đủ rõ để nhiều đội triển khai"],
        ],
      },
      {
        title: "Dịch ý tưởng thành hướng làm",
        body:
          "Một ý tưởng lớn cần biến thành giọng chữ, hình ảnh, nhịp video, kịch bản, trải nghiệm và tiêu chuẩn duyệt. Nếu không, mỗi người sẽ hiểu một kiểu.",
        bullets: [
          ["Giọng điệu", "trẻ, thông minh, nổi loạn, ấm, sang, hài hước hay nghiêm túc"],
          ["Hướng hình ảnh", "màu, ánh sáng, bố cục, chất liệu, nhịp dựng"],
          ["Tiêu chí duyệt", "cái gì đúng concept, cái gì chỉ đẹp nhưng lệch"],
        ],
      },
      {
        title: "Dẫn đội sáng tạo",
        body:
          "Creative Director không tự làm hết. Họ giúp designer, writer, filmmaker, strategist, producer hiểu chung hướng và làm tốt phần của mình.",
        bullets: [
          ["Brief rõ", "đội biết cần giải quyết gì"],
          ["Feedback", "góp ý theo mục tiêu, không chỉ theo gu cá nhân"],
          ["Quyết định", "chọn hướng khi có nhiều phương án cạnh tranh"],
        ],
      },
      {
        title: "Bảo vệ và điều chỉnh hướng sáng tạo",
        body:
          "Dự án thật có giới hạn ngân sách, thời gian, khách hàng, rủi ro. Creative Director cần biết bảo vệ phần cốt lõi và linh hoạt phần có thể đổi.",
        bullets: [
          ["Bảo vệ core idea", "không để dự án mất ý chính vì nhiều sửa nhỏ"],
          ["Thỏa hiệp đúng chỗ", "giảm phần phụ nhưng giữ hiệu quả chính"],
          ["Đo kết quả", "học từ phản ứng thật để lần sau quyết tốt hơn"],
        ],
      },
    ],
    skills: [
      { icon: "🧠", label: "Tư duy ý tưởng", body: ["Cần nhìn ra vấn đề và biến nó thành concept rõ.", "Tập viết một ý tưởng trong 1 câu trước khi làm visual."] },
      { icon: "👁️", label: "Gu và tiêu chuẩn", body: ["Creative Director phải biết vì sao một hướng đúng hoặc sai.", "Xem nhiều chiến dịch, phim, thiết kế, sản phẩm và phân tích bằng lý do, không chỉ cảm tính."] },
      { icon: "💬", label: "Giao tiếp", body: ["Bạn phải trình bày ý tưởng cho đội và người duyệt.", "Tập nói rõ: mục tiêu là gì, insight là gì, vì sao hướng này giải quyết được."] },
      { icon: "🤝", label: "Lãnh đạo sáng tạo", body: ["Dẫn người khác làm tốt hơn, không chỉ tự làm giỏi.", "Feedback nên giúp người nhận biết bước sửa tiếp theo."] },
      { icon: "📋", label: "Hiểu production", body: ["Ý tưởng phải sản xuất được trong giới hạn thật.", "Biết ngân sách, deadline, nhân sự và rủi ro giúp quyết định thực tế hơn."] },
      { icon: "🔍", label: "Hiểu con người", body: ["Sáng tạo phục vụ người xem/người dùng.", "Quan sát văn hóa, hành vi, cộng đồng, xu hướng nhưng không chạy theo trend rỗng."] },
    ],
    path: [
      ["Đi từ một chuyên môn mạnh", "Thường bắt đầu từ design, copywriting, art direction, film, product, strategy hoặc content."],
      ["Làm dự án có concept", "Không chỉ làm đẹp; hãy luyện viết mục tiêu, insight, ý tưởng lớn và cách triển khai."],
      ["Học feedback và dẫn nhóm", "Dẫn bài nhóm, CLB, dự án freelance nhỏ để luyện ra quyết định sáng tạo."],
      ["Xây case study", "Portfolio của CD cần cho thấy vấn đề, ý tưởng, hệ triển khai và kết quả."],
      ["Mở rộng hiểu biết", "Brand, kinh doanh, văn hóa, công nghệ, media, production đều liên quan."],
      ["Tích lũy dần lên vai trò lead", "Creative Director không phải vị trí entry-level; đường vào thường qua senior/lead ở một mảng sáng tạo."],
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
  <p>Với học sinh THPT hoặc sinh viên, có thể hiểu nghề này như một hướng chuyên môn để thử từ dự án nhỏ: bài tập lớp, câu lạc bộ, game jam, phim ngắn, sản phẩm 3D hoặc portfolio cá nhân.</p>
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
