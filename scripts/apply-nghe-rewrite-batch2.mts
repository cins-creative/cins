/**
 * Apply rewrite batch 2 for nghề canonicals.
 * Audience: HS THPT & Sinh viên. Vietnamese-first, English only for necessary role/tool names.
 *
 * Usage:
 *   npx tsx scripts/apply-nghe-rewrite-batch2.mts --apply
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
    id: "b1860ed9-e428-458a-946f-1f541d742077",
    slug: "nghe-lighting-artist",
    title: "Lighting Artist",
    viet: "Họa sĩ ánh sáng",
    summary:
      "Người đặt và chỉnh ánh sáng trong cảnh 3D/hoạt hình/VFX để nhân vật, bối cảnh và cảm xúc hiện ra đúng như ý đồ hình ảnh.",
    metaTitle: "Lighting Artist là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Lighting Artist làm gì trong 3D, hoạt hình và VFX; cần học ánh sáng, màu, render ra sao để bắt đầu.",
    intro: [
      "Cùng một căn phòng 3D: nếu ánh sáng rọi từ cửa sổ buổi sáng, cảnh thấy ấm và hy vọng; nếu ánh sáng xanh từ màn hình, cảnh có thể lạnh và cô đơn. Người điều khiển cảm giác đó bằng ánh sáng là Lighting Artist.",
      "Lighting Artist không chỉ làm cảnh “sáng lên”. Họ dùng ánh sáng để người xem nhìn đúng chỗ, cảm đúng tâm trạng và tin rằng nhân vật đang thật sự đứng trong không gian đó.",
    ],
    definition: [
      "Lighting Artist là người đặt, chỉnh và kiểm tra ánh sáng trong cảnh 3D, hoạt hình, VFX hoặc diễn họa. Họ quyết định hướng sáng, độ mạnh, màu sáng, bóng đổ và cách vật liệu phản ứng với ánh sáng.",
      "Nếu Modeler tạo hình khối, Texture Artist làm bề mặt, thì Lighting Artist giúp mọi thứ hiện ra có chiều sâu, không khí và cảm xúc.",
    ],
    responsibilities: [
      "Đặt nguồn sáng chính/phụ cho nhân vật và bối cảnh",
      "Giữ ánh sáng khớp với thời gian, không khí và câu chuyện",
      "Kiểm tra bóng đổ, phản chiếu, vùng tối và vùng sáng",
      "Phối hợp với người dựng cảnh, chất liệu, render và Art Director",
    ],
    appears: [
      ["Hoạt hình", "làm cảnh 3D có cảm xúc, chiều sâu và đúng phong cách phim."],
      ["VFX", "ghép ánh sáng của vật thể số khớp với cảnh quay thật."],
      ["3D Art & Visualization", "làm sản phẩm, nội thất, kiến trúc hoặc nhân vật trông thuyết phục."],
    ],
    tasks: [
      {
        title: "Hiểu cảm xúc của cảnh",
        body:
          "Trước khi đặt đèn, Lighting Artist cần biết cảnh đang vui, sợ, căng thẳng, huyền bí hay bình yên. Ánh sáng không có cảm xúc rõ sẽ làm cảnh bị phẳng.",
        bullets: [
          ["Thời điểm", "sáng sớm, trưa, hoàng hôn, đêm đều có cảm giác khác nhau"],
          ["Tâm trạng", "ấm, lạnh, mềm, gắt, tối, mơ màng"],
          ["Điểm nhìn", "người xem nên nhìn vào nhân vật, vật thể hay không gian nào trước"],
        ],
      },
      {
        title: "Đặt ánh sáng chính và ánh sáng phụ",
        body:
          "Một cảnh thường có nguồn sáng chính, ánh sáng phụ và vài nguồn nhấn. Việc khó là làm đủ rõ mà không giả, đủ đẹp mà không phá câu chuyện.",
        bullets: [
          ["Nguồn sáng chính", "quyết định hướng và cảm giác tổng thể"],
          ["Ánh sáng phụ", "giữ vùng tối còn đọc được chi tiết"],
          ["Ánh sáng nhấn", "làm nhân vật hoặc vật quan trọng nổi bật"],
        ],
      },
      {
        title: "Kiểm tra vật liệu và bóng đổ",
        body:
          "Ánh sáng tốt phải làm chất liệu hiện ra đúng: kim loại bóng khác vải, da khác nhựa, kính khác nước. Bóng đổ cũng phải hợp vị trí và cường độ nguồn sáng.",
        bullets: [
          ["Bóng đổ", "quá đen, quá nhạt hoặc sai hướng đều làm cảnh giả"],
          ["Phản chiếu", "vật bóng cần phản chiếu hợp môi trường"],
          ["Độ đọc hình", "người xem vẫn phải thấy được phần quan trọng của cảnh"],
        ],
      },
      {
        title: "Tối ưu để cảnh render được",
        body:
          "Ánh sáng đẹp nhưng render quá lâu hoặc game chạy quá nặng thì không dùng được. Lighting Artist cần hiểu giới hạn kỹ thuật để giữ cảnh vừa đẹp vừa khả thi.",
        bullets: [
          ["Thời gian render", "cảnh càng phức tạp càng tốn thời gian xuất hình"],
          ["Nhiễu hình", "ánh sáng yếu hoặc phản chiếu phức tạp dễ tạo hạt nhiễu"],
          ["Tối ưu", "giữ phần quan trọng đẹp, giảm phần không cần thiết"],
        ],
      },
    ],
    skills: [
      { icon: "💡", label: "Hiểu ánh sáng", body: ["Cần biết ánh sáng đi từ đâu, tạo bóng thế nào và đổi cảm xúc ra sao.", "Quan sát ánh sáng trong phòng, ngoài trời, phim và ảnh; thử chụp cùng một vật ở nhiều thời điểm."] },
      { icon: "🎨", label: "Màu sắc", body: ["Màu của ánh sáng ảnh hưởng trực tiếp đến cảm xúc cảnh.", "Tập phân tích cảnh phim: ánh sáng vàng, xanh, đỏ được dùng khi nào và vì sao."] },
      { icon: "👁️", label: "Mắt nhìn không gian", body: ["Lighting Artist phải thấy cảnh có phẳng không, nhân vật có tách khỏi nền không.", "Học phối cảnh, hình khối và bố cục để ánh sáng phục vụ điểm nhìn."] },
      { icon: "🧊", label: "Hiểu 3D", body: ["Cần hiểu mô hình, chất liệu, camera và render hoạt động cùng nhau.", "Blender là cách tốt để bắt đầu thử ánh sáng với cảnh đơn giản."] },
      { icon: "🔍", label: "Tỉ mỉ", body: ["Một bóng sai hướng hoặc vùng sáng quá gắt có thể làm cảnh mất tự nhiên.", "Tập so trước/sau và ghi rõ mình đã sửa điều gì."] },
      { icon: "🤝", label: "Phối hợp", body: ["Lighting Artist làm việc với người dựng hình, chất liệu, render và Art Director.", "Biết hỏi đúng: cảnh cần cảm xúc gì, phong cách nào, giới hạn kỹ thuật ra sao?"] },
    ],
    path: [
      ["Học ánh sáng từ đời thật", "Quan sát ánh sáng cửa sổ, đèn bàn, đèn đường, trời mưa/nắng. Vẽ hoặc chụp lại để hiểu bóng và màu."],
      ["Làm quen phần mềm 3D", "Dùng Blender để đặt vài vật thể đơn giản rồi thử nhiều kiểu ánh sáng."],
      ["Chép ánh sáng từ phim/ảnh", "Chọn một cảnh thích, thử dựng lại cảm giác ánh sáng bằng 3D hoặc vẽ."],
      ["Làm dự án nhỏ", "Một căn phòng, một nhân vật, một sản phẩm hoặc một cảnh ngắn có trước/sau ánh sáng."],
      ["Lưu hồ sơ năng lực", "Cho thấy cảnh chưa ánh sáng, bản thử, bản cuối và lý do lựa chọn."],
      ["Ứng tuyển vào 3D/hoạt hình/VFX", "Có thể bắt đầu từ lighting junior, render assistant hoặc 3D generalist thiên về ánh sáng."],
    ],
  },
  {
    id: "eeb3b9a0-d6d6-4c8f-bf86-e12a38303fc9",
    slug: "nghe-fx-artist",
    title: "FX Artist",
    viet: "Họa sĩ hiệu ứng",
    summary:
      "Người tạo các hiệu ứng như khói, lửa, nước, phép thuật, vụ nổ, bụi, tia sáng hoặc chuyển động đặc biệt trong game, hoạt hình và VFX.",
    metaTitle: "FX Artist là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "FX Artist làm gì trong game, hoạt hình và VFX; cần học chuyển động, vật lý, phần mềm hiệu ứng ra sao để bắt đầu.",
    intro: [
      "Một cú đánh trong game có tia sáng, bụi văng và vòng năng lượng. Một cảnh hoạt hình có nước bắn, lửa cháy, khói cuộn. Những chi tiết đó thường do FX Artist tạo ra.",
      "FX Artist không chỉ làm hiệu ứng cho “ngầu”. Hiệu ứng phải giúp người xem hiểu lực, tốc độ, nguy hiểm, phép thuật hoặc cảm xúc của hành động.",
    ],
    definition: [
      "FX Artist là người tạo hiệu ứng hình ảnh: khói, lửa, nước, bụi, mưa, phép thuật, vụ nổ, tia sáng, vệt chuyển động hoặc các hiện tượng khó quay/vẽ thủ công.",
      "Trong game, hiệu ứng còn phải giúp người chơi hiểu hành động: đòn nào trúng, kỹ năng nào mạnh, vùng nào nguy hiểm. Trong phim/hoạt hình, hiệu ứng giúp cảnh có năng lượng và cảm giác vật lý.",
    ],
    responsibilities: [
      "Tạo hiệu ứng phù hợp phong cách dự án",
      "Giữ hiệu ứng rõ nghĩa, đẹp mắt và không che mất hành động chính",
      "Tối ưu để game/phim/render chạy được",
      "Phối hợp với animator, lập trình viên, lighting và Art Director",
    ],
    appears: [
      ["Game", "hiệu ứng kỹ năng, va chạm, phép thuật, môi trường, giao tranh."],
      ["Hoạt hình", "khói, lửa, nước, bụi, chuyển động cách điệu."],
      ["VFX", "mô phỏng hiện tượng tự nhiên hoặc hiệu ứng không thể quay thật an toàn."],
    ],
    tasks: [
      {
        title: "Hiểu hành động cần thể hiện",
        body:
          "Trước khi làm hiệu ứng, FX Artist cần hiểu sự kiện đang xảy ra: lửa cháy nhẹ hay nổ mạnh, phép thuật chữa lành hay tấn công, bụi do xe chạy hay do nhà sập.",
        bullets: [
          ["Lực", "hiệu ứng nhẹ, vừa hay mạnh"],
          ["Thời gian", "xuất hiện nhanh, kéo dài hay tan dần"],
          ["Ý nghĩa", "báo nguy hiểm, tạo cảm xúc hay nhấn hành động"],
        ],
      },
      {
        title: "Tạo chuyển động và hình dáng hiệu ứng",
        body:
          "Hiệu ứng đẹp thường có nhịp: bắt đầu, bùng lên, rồi tan. Nếu chỉ thêm lửa/khói ngẫu nhiên, cảnh sẽ rối và giả.",
        bullets: [
          ["Hình dáng", "vệt, vòng, tia, đám mây, dòng chảy"],
          ["Nhịp chuyển động", "nhanh/chậm, nảy/bùng/tan"],
          ["Độ rõ", "người xem vẫn đọc được hành động chính"],
        ],
      },
      {
        title: "Làm hiệu ứng hợp phong cách",
        body:
          "Game hoạt hình cần hiệu ứng khác phim thật. Một cảnh cute không nên dùng vụ nổ quá thực; một phim nghiêm túc không nên có hiệu ứng quá màu mè.",
        bullets: [
          ["Màu sắc", "phù hợp phe, kỹ năng, cảm xúc hoặc thương hiệu"],
          ["Mức độ chi tiết", "cách điệu hay chân thật tùy dự án"],
          ["Tính nhất quán", "hiệu ứng cùng hệ phải có chung ngôn ngữ hình ảnh"],
        ],
      },
      {
        title: "Tối ưu và kiểm tra trong sản phẩm",
        body:
          "Hiệu ứng đẹp nhưng quá nặng có thể làm game giật hoặc cảnh render quá lâu. FX Artist phải kiểm tra trong môi trường thật của dự án.",
        bullets: [
          ["Hiệu năng", "không làm game hoặc cảnh quá nặng"],
          ["Độ nhìn rõ", "không che UI, nhân vật hoặc thông tin quan trọng"],
          ["Kiểm tra lặp lại", "hiệu ứng dùng nhiều lần vẫn không gây khó chịu"],
        ],
      },
    ],
    skills: [
      { icon: "⚡", label: "Cảm giác chuyển động", body: ["Hiệu ứng cần có nhịp và lực. Nó phải cho người xem cảm giác tác động đang xảy ra.", "Hãy quay chậm nước bắn, bụi bay, lửa cháy hoặc xem animation frame-by-frame để học nhịp."] },
      { icon: "🎨", label: "Màu và hình", body: ["Màu giúp phân biệt hiệu ứng chữa lành, tấn công, nguy hiểm hay môi trường.", "Tập làm cùng một hiệu ứng với 3 cảm xúc khác nhau: vui, nguy hiểm, huyền bí."] },
      { icon: "🧠", label: "Hiểu vật lý cơ bản", body: ["Không cần thành nhà khoa học, nhưng cần hiểu khói bay lên, nước chảy xuống, vật nặng rơi khác vật nhẹ.", "Quan sát đời thật rồi cách điệu có chủ đích."] },
      { icon: "🖥️", label: "Biết công cụ", body: ["Tùy ngành có thể dùng Unity, Unreal, Houdini, Blender hoặc After Effects.", "Bắt đầu từ hiệu ứng nhỏ: tia sáng, bụi, lửa đơn giản, vòng phép."] },
      { icon: "👁️", label: "Đọc hành động", body: ["Hiệu ứng không được che mất nhân vật hoặc khiến người chơi hiểu nhầm.", "Đặt câu hỏi: người xem cần thấy gì trong 1 giây đầu?"] },
      { icon: "🔧", label: "Tối ưu", body: ["Trong game và 3D, đẹp thôi chưa đủ; hiệu ứng phải chạy được.", "Tập làm phiên bản đẹp và phiên bản nhẹ hơn để so sánh."] },
    ],
    path: [
      ["Học chuyển động từ đời thật", "Quan sát khói, nước, bụi, lửa, tia sáng và va chạm. Vẽ lại nhịp chính."],
      ["Làm hiệu ứng 2D đơn giản", "Vẽ flipbook hoặc dùng After Effects để hiểu nhịp trước khi vào 3D/game."],
      ["Chọn công cụ theo hướng đi", "Game: Unity/Unreal. VFX: Houdini/Nuke. Hoạt hình/3D: Blender/Houdini tùy studio."],
      ["Làm bộ 5 hiệu ứng nhỏ", "Ví dụ: đòn đánh, hồi máu, lửa, bụi, nước bắn. Mỗi hiệu ứng nên có mục đích rõ."],
      ["Kiểm tra trong ngữ cảnh", "Đưa hiệu ứng vào game/cảnh thật, không chỉ xem trên nền đen."],
      ["Ứng tuyển junior/assistant", "Có thể bắt đầu từ motion, game VFX junior, 3D generalist thiên hiệu ứng hoặc trợ lý hậu kỳ."],
    ],
  },
  {
    id: "82f8e036-cb41-4d64-8467-f053f1ab364a",
    slug: "nghe-music-composer",
    title: "Music Composer",
    viet: "Người soạn nhạc",
    summary:
      "Người viết nhạc cho phim, game, hoạt hình hoặc video — giúp cảnh có cảm xúc, nhịp và dấu ấn riêng thay vì chỉ có hình ảnh.",
    metaTitle: "Music Composer là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Music Composer làm gì trong phim, game, hoạt hình; cần học nhạc, kể chuyện và phần mềm âm thanh ra sao để bắt đầu.",
    intro: [
      "Một cảnh chia tay có thể khiến bạn nghẹn không chỉ vì lời thoại, mà vì tiếng piano rất nhỏ phía sau. Một màn boss trong game trở nên căng vì nhịp trống dồn dập. Người viết phần nhạc đó là Music Composer.",
      "Music Composer không chỉ viết giai điệu hay. Họ viết nhạc phục vụ hình ảnh, câu chuyện và nhịp cảm xúc — lúc cần nổi bật, lúc cần lùi xuống để người xem không chú ý nhưng vẫn cảm được.",
    ],
    definition: [
      "Music Composer là người sáng tác nhạc cho phim, game, hoạt hình, quảng cáo, video hoặc sản phẩm số. Họ có thể viết giai điệu chính, nhạc nền theo cảnh, đoạn chuyển, nhạc chiến đấu, nhạc menu hoặc âm nhạc nhận diện của dự án.",
      "Khác người sản xuất bài hát độc lập, Composer phải viết theo hình ảnh và mục tiêu cụ thể. Nhạc không đứng một mình; nó phải giúp cảnh hoặc trải nghiệm tốt hơn.",
    ],
    responsibilities: [
      "Viết nhạc theo cảm xúc và nhịp của từng cảnh/tình huống",
      "Làm chủ đề âm nhạc cho nhân vật, thế giới hoặc thương hiệu",
      "Chỉnh nhạc theo góp ý của đạo diễn, game designer hoặc producer",
      "Bàn giao file âm thanh đúng định dạng và đúng mốc thời gian",
    ],
    appears: [
      ["Phim & Hoạt hình", "nhạc nền theo cảnh, chủ đề nhân vật, nhạc mở/đóng phim."],
      ["Game", "nhạc menu, chiến đấu, khám phá, thắng/thua, nhạc thay đổi theo tình huống."],
      ["Video quảng cáo", "nhạc tạo cảm xúc nhanh và bám thương hiệu."],
    ],
    tasks: [
      {
        title: "Hiểu cảm xúc và nhịp cảnh",
        body:
          "Trước khi viết, Composer cần xem hình ảnh hoặc đọc mô tả cảnh: nhân vật đang sợ, nhớ, vui, chiến đấu hay khám phá? Nhạc phải đi cùng nhịp dựng và cảm xúc đó.",
        bullets: [
          ["Cảm xúc chính", "cảnh cần buồn, vui, căng, kỳ ảo hay hài hước"],
          ["Nhịp cảnh", "cắt nhanh hay chậm, hành động nhiều hay ít"],
          ["Điểm nhấn", "khoảnh khắc nào nhạc cần nâng lên hoặc im lại"],
        ],
      },
      {
        title: "Viết giai điệu và màu âm thanh",
        body:
          "Một dự án có thể cần giai điệu dễ nhớ, hoặc chỉ cần lớp âm thanh mỏng để tạo không khí. Composer chọn nhạc cụ, tiết tấu và hòa âm để tạo cảm giác phù hợp.",
        bullets: [
          ["Giai điệu chính", "đoạn nhạc người xem/người chơi có thể nhớ"],
          ["Nhạc cụ", "piano, dây, trống, synth, nhạc cụ dân tộc hoặc âm thanh điện tử"],
          ["Không khí", "nhạc có thể dày, mỏng, tối, sáng, cổ điển hoặc hiện đại"],
        ],
      },
      {
        title: "Chỉnh theo hình ảnh và góp ý",
        body:
          "Nhạc hay nhưng vào cảnh sai nhịp vẫn phải sửa. Composer thường nhận góp ý kiểu “ít bi hơn”, “căng hơn”, “đừng lấn thoại”, rồi chuyển nó thành thay đổi âm nhạc cụ thể.",
        bullets: [
          ["Đỡ lấn thoại", "giảm dày, giảm cao độ hoặc đổi nhạc cụ"],
          ["Tăng kịch tính", "đổi nhịp, tăng trống, tăng căng hòa âm"],
          ["Sửa theo mốc hình", "nhạc phải khớp khoảnh khắc trong cảnh/game"],
        ],
      },
      {
        title: "Bàn giao và tổ chức file",
        body:
          "Dự án thật cần nhiều phiên bản: dài/ngắn, có trống/không trống, lặp lại được trong game, bản cuối cho dựng phim. Composer phải bàn giao gọn để đội khác dùng được.",
        bullets: [
          ["Phiên bản", "đầy đủ, rút gọn, loop, không melody hoặc chỉ nhịp"],
          ["Định dạng", "file âm thanh đúng chuẩn dự án cần"],
          ["Tên file rõ", "để dựng phim/lập trình không nhầm bản"],
        ],
      },
    ],
    skills: [
      { icon: "🎵", label: "Nền tảng âm nhạc", body: ["Cần hiểu giai điệu, hòa âm, tiết tấu và nhạc cụ.", "Học piano/guitar/nhạc lý cơ bản hoặc tự học qua dự án nhỏ đều được, miễn luyện tai đều."] },
      { icon: "🎬", label: "Kể chuyện bằng âm thanh", body: ["Nhạc phải phục vụ cảnh, không chỉ khoe kỹ thuật.", "Xem phim/game và tắt nhạc để cảm nhận nhạc đã làm cảnh khác đi thế nào."] },
      { icon: "🖥️", label: "Biết phần mềm âm nhạc", body: ["Các phần mềm như Logic, Ableton, Cubase, FL Studio giúp viết và dựng nhạc.", "Bắt đầu bằng đoạn 30–60 giây cho một cảnh ngắn."] },
      { icon: "👂", label: "Tai nghe chi tiết", body: ["Cần nghe được nhạc cụ nào đang lấn thoại, đoạn nào quá dày hoặc thiếu lực.", "Tập so bản nhạc của mình trên tai nghe, loa laptop và điện thoại."] },
      { icon: "🤝", label: "Nhận góp ý", body: ["Đạo diễn có thể không nói bằng thuật ngữ nhạc. Bạn phải hiểu cảm xúc họ muốn.", "Hỏi lại bằng ví dụ: buồn nhẹ hay bi kịch, căng âm thầm hay bùng nổ?"] },
      { icon: "⏱️", label: "Làm đúng hạn", body: ["Nhạc thường nằm cuối quy trình nên thời gian gấp.", "Tập làm nhanh nhiều bản nháp thay vì ôm một bản quá lâu."] },
    ],
    path: [
      ["Học nhạc lý và một nhạc cụ", "Không cần bắt đầu quá hàn lâm, nhưng cần hiểu nhịp, hợp âm, giai điệu và cách nghe."],
      ["Viết nhạc cho cảnh ngắn", "Lấy phim câm/video ngắn/gameplay 30 giây và tự viết nhạc cho nó."],
      ["Học phần mềm âm nhạc", "Chọn một phần mềm và học cách dùng nhạc cụ ảo, thu âm, xuất file."],
      ["Làm dự án với bạn học", "Phim ngắn, game jam, hoạt hình lớp, video CLB là nơi luyện tốt."],
      ["Xây hồ sơ theo cảm xúc", "Đưa 5–8 đoạn nhạc ngắn: vui, buồn, căng, kỳ ảo, hành động, nhẹ nhàng."],
      ["Tìm việc trợ lý/nhạc cho dự án nhỏ", "Có thể bắt đầu từ làm nhạc cho video, podcast, game indie, phim sinh viên."],
    ],
  },
  {
    id: "789cbd5a-3e78-4c0d-9747-852dc803598c",
    slug: "nghe-pipeline-td",
    title: "Pipeline TD",
    viet: "Kỹ thuật viên quy trình sản xuất",
    summary:
      "Người xây và sửa các công cụ/quy trình giúp đội phim, game, hoạt hình, VFX làm việc trơn tru hơn — giảm lỗi file, lặp việc và tắc nghẽn kỹ thuật.",
    metaTitle: "Pipeline TD là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Pipeline TD làm gì trong studio sáng tạo, cần học lập trình và quy trình sản xuất ra sao để bắt đầu.",
    intro: [
      "Trong một studio, hàng trăm file nhân vật, cảnh, texture, âm thanh, shot, phiên bản có thể chạy qua nhiều người. Nếu đặt tên sai, lưu nhầm chỗ, mở lỗi phần mềm, cả nhóm bị kẹt. Pipeline TD là người làm cho guồng đó chạy mượt hơn.",
      "Pipeline TD nằm giữa nghệ thuật và kỹ thuật: hiểu artist đang đau ở đâu, rồi viết công cụ, quy tắc hoặc cách tự động hóa để công việc bớt lặp và ít lỗi hơn.",
    ],
    definition: [
      "Pipeline TD là người xây dựng, duy trì và sửa các công cụ/quy trình kỹ thuật trong studio game, hoạt hình, VFX hoặc 3D. “Pipeline” có thể hiểu là đường đi của dữ liệu từ ý tưởng đến sản phẩm cuối.",
      "Nếu artist tập trung tạo hình, Pipeline TD giúp họ không mất thời gian vào việc lặp lại, lỗi file, đổi định dạng, xuất nhầm hoặc chờ phần mềm xử lý thủ công.",
    ],
    responsibilities: [
      "Tạo công cụ nhỏ giúp artist làm nhanh hơn",
      "Sửa lỗi quy trình: file, phiên bản, xuất nhập dữ liệu, render",
      "Kết nối nhiều phần mềm trong studio",
      "Viết hướng dẫn và hỗ trợ đội khi công cụ gặp vấn đề",
    ],
    appears: [
      ["Hoạt hình & VFX", "quản lý shot, asset, render, chuyển file giữa phần mềm."],
      ["Game", "hỗ trợ art xuất asset vào engine, kiểm tra lỗi và tự động hóa."],
      ["3D studio", "giúp mô hình, chất liệu, ánh sáng, render đi qua quy trình ổn định."],
    ],
    tasks: [
      {
        title: "Tìm điểm nghẽn trong quy trình",
        body:
          "Pipeline TD bắt đầu bằng việc nghe artist than phiền: xuất file quá lâu, tên file loạn, mỗi ngày phải làm 20 bước lặp, render hay lỗi. Từ đó họ tìm cách sửa gốc vấn đề.",
        bullets: [
          ["Lỗi lặp lại", "vấn đề xảy ra nhiều lần và tốn thời gian"],
          ["Bước thủ công", "việc máy có thể tự làm thay người"],
          ["Điểm nghẽn", "khâu làm cả nhóm phải chờ"],
        ],
      },
      {
        title: "Viết công cụ hỗ trợ",
        body:
          "Đôi khi chỉ cần một nút bấm xuất đúng file, một script kiểm tra tên, hoặc một bảng tự gom lỗi. Công cụ tốt không cần phức tạp; chỉ cần giải quyết đúng nỗi đau.",
        bullets: [
          ["Tự động hóa", "giảm việc lặp lại bằng script/công cụ"],
          ["Kiểm tra lỗi", "báo sớm file thiếu, sai tên, sai định dạng"],
          ["Giao diện đơn giản", "artist dùng được mà không cần biết code"],
        ],
      },
      {
        title: "Kết nối phần mềm và dữ liệu",
        body:
          "Studio thường dùng nhiều phần mềm: dựng hình, vẽ chất liệu, render, quản lý shot, game engine. Pipeline TD giúp dữ liệu đi qua các nơi này ít lỗi nhất.",
        bullets: [
          ["Xuất/nhập file", "đúng định dạng và đúng thư mục"],
          ["Phiên bản", "biết file nào mới nhất, file nào đã duyệt"],
          ["Tài liệu", "ghi rõ cách dùng để người mới không hỏi lại mãi"],
        ],
      },
      {
        title: "Hỗ trợ khi production gặp lỗi",
        body:
          "Khi gần deadline mà render lỗi hoặc asset không vào game, Pipeline TD phải bình tĩnh kiểm tra. Công việc này giống bác sĩ kỹ thuật của studio.",
        bullets: [
          ["Đọc lỗi", "hiểu thông báo lỗi hoặc log để tìm nguyên nhân"],
          ["Sửa tạm/sửa gốc", "phân biệt cách cứu deadline và cách sửa lâu dài"],
          ["Trao đổi rõ", "báo cho team biết cần làm gì, tránh tự sửa lung tung"],
        ],
      },
    ],
    skills: [
      { icon: "💻", label: "Lập trình cơ bản", body: ["Python thường rất hữu ích trong studio 3D/VFX.", "Bắt đầu bằng script đổi tên file, gom thư mục, kiểm tra lỗi đơn giản."] },
      { icon: "🧩", label: "Hiểu quy trình", body: ["Cần biết artist làm việc qua những bước nào.", "Tham gia dự án 3D/game nhỏ để hiểu đường đi của file từ đầu đến cuối."] },
      { icon: "🔧", label: "Giải quyết vấn đề", body: ["Pipeline TD gặp nhiều lỗi lạ và phải tìm nguyên nhân.", "Tập chia lỗi lớn thành câu hỏi nhỏ: lỗi ở file, phần mềm, đường dẫn hay dữ liệu?"] },
      { icon: "🤝", label: "Nói chuyện với artist", body: ["Công cụ chỉ tốt nếu người dùng thật sự dùng được.", "Hỏi artist đang mất thời gian ở đâu trước khi viết tool."] },
      { icon: "📋", label: "Viết tài liệu", body: ["Công cụ không có hướng dẫn sẽ làm người khác sợ dùng.", "Tập viết hướng dẫn 5 bước, có ảnh minh họa và lỗi thường gặp."] },
      { icon: "⏱️", label: "Bình tĩnh khi gấp", body: ["Lỗi kỹ thuật hay xuất hiện sát hạn.", "Học cách ưu tiên: cứu dự án trước, ghi lại để sửa bền sau."] },
    ],
    path: [
      ["Học Python cơ bản", "Biến, vòng lặp, đọc ghi file, xử lý thư mục — đủ để làm tool nhỏ."],
      ["Làm một dự án 3D/game nhỏ", "Hiểu artist cần xuất file, đặt tên, cập nhật phiên bản như thế nào."],
      ["Tự động hóa việc lặp", "Viết script đổi tên file, gom ảnh, kiểm tra thiếu texture, tạo thư mục dự án."],
      ["Học phần mềm studio dùng", "Maya/Blender/Houdini/Unreal tùy hướng, không cần giỏi art nhưng phải hiểu cách dữ liệu đi qua."],
      ["Tạo hồ sơ bằng tool thật", "Show vấn đề, công cụ bạn viết, trước/sau tiết kiệm thời gian như thế nào."],
      ["Ứng tuyển technical assistant/junior TD", "Cửa vào có thể từ IT studio, 3D generalist biết code, hoặc game technical art."],
    ],
  },
  {
    id: "18464e52-1b58-4998-b42f-53d86046f2b0",
    slug: "nghe-project-manager",
    title: "Project Manager",
    viet: "Quản lý dự án",
    summary:
      "Người quản lý mục tiêu, phạm vi, tiến độ, người phụ trách và rủi ro của một dự án sáng tạo để đội làm đúng việc và giao đúng hạn.",
    metaTitle: "Project Manager là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Project Manager làm gì trong game, thiết kế, 3D; khác Producer/Production Manager ra sao và sinh viên nên bắt đầu thế nào.",
    intro: [
      "Một dự án thiết kế có logo, poster, web, bài đăng; một game nhỏ có art, code, âm thanh, thử lỗi; một dự án 3D có mô hình, chất liệu, ánh sáng. Nếu không ai giữ mục tiêu và tiến độ, nhóm rất dễ làm nhiều nhưng không xong. Đó là lúc cần Project Manager.",
      "Project Manager không nhất thiết là người sáng tạo chính. Họ giúp cả nhóm biết mình đang làm gì, vì sao làm, khi nào xong, ai chịu trách nhiệm và rủi ro nào cần xử lý sớm.",
    ],
    definition: [
      "Project Manager là người quản lý dự án: mục tiêu, phạm vi, tiến độ, đầu việc, người phụ trách, giao tiếp và rủi ro. Trong ngành sáng tạo, họ giúp designer, artist, lập trình viên, client hoặc producer làm việc cùng nhau rõ ràng hơn.",
      "Khác Producer, Project Manager thường tập trung nhiều hơn vào việc dự án chạy đúng kế hoạch. Khác Production Manager, vai trò này có thể rộng hơn, xuất hiện ở thiết kế, game, 3D, agency, công nghệ hoặc giáo dục.",
    ],
    responsibilities: [
      "Làm rõ mục tiêu, phạm vi và đầu ra của dự án",
      "Chia việc, đặt mốc, theo dõi trạng thái và nhắc việc",
      "Giữ giao tiếp giữa khách hàng/leader và đội thực hiện",
      "Phát hiện rủi ro, đề xuất phương án và cập nhật tiến độ",
    ],
    appears: [
      ["Game", "theo dõi art, code, gameplay, test, mốc ra bản chơi được."],
      ["Thiết kế đồ họa", "quản lý chiến dịch, bộ nhận diện, social, in ấn, bàn giao."],
      ["3D Art & Visualization", "điều phối model, chất liệu, ánh sáng, render và feedback khách hàng."],
    ],
    tasks: [
      {
        title: "Làm rõ dự án cần giao gì",
        body:
          "Nhiều nhóm thất bại vì mỗi người hiểu đầu ra khác nhau. Project Manager cần biến yêu cầu mơ hồ thành danh sách sản phẩm cụ thể.",
        bullets: [
          ["Mục tiêu", "dự án giải quyết vấn đề gì"],
          ["Đầu ra", "file/sản phẩm/màn hình/cảnh nào phải giao"],
          ["Giới hạn", "phần nào không làm trong đợt này"],
        ],
      },
      {
        title: "Chia việc và đặt mốc",
        body:
          "Sau khi rõ đầu ra, Project Manager chia thành việc nhỏ, gán người phụ trách và đặt hạn. Việc tốt là việc có người chịu trách nhiệm và tiêu chí hoàn thành rõ.",
        bullets: [
          ["Đầu việc nhỏ", "đủ rõ để biết đang làm hay đã xong"],
          ["Người phụ trách", "mỗi việc có một người chính"],
          ["Mốc kiểm tra", "không đợi đến cuối mới xem kết quả"],
        ],
      },
      {
        title: "Giữ giao tiếp không bị rối",
        body:
          "Thông tin dự án dễ thất lạc trong chat, email, file, cuộc họp. Project Manager giữ nơi lưu quyết định, bản mới nhất và việc cần làm tiếp.",
        bullets: [
          ["Tóm tắt sau họp", "ai làm gì, hạn khi nào, quyết định gì"],
          ["Nguồn sự thật", "một nơi cập nhật trạng thái chính"],
          ["Nhắc đúng lúc", "nhắc trước khi trễ, không đợi cháy"],
        ],
      },
      {
        title: "Xử lý thay đổi và rủi ro",
        body:
          "Khách đổi ý, thành viên bận, file lỗi, việc khó hơn dự đoán — dự án nào cũng có thay đổi. Project Manager giúp nhóm hiểu ảnh hưởng và chọn phương án.",
        bullets: [
          ["Đánh giá ảnh hưởng", "đổi này tốn thêm gì, trễ bao lâu"],
          ["Đề xuất lựa chọn", "giữ phạm vi, giảm phần phụ hoặc dời mốc"],
          ["Cập nhật kế hoạch", "khi quyết định đổi, lịch và việc cũng phải đổi"],
        ],
      },
    ],
    skills: [
      { icon: "📋", label: "Tổ chức", body: ["Biết chia việc, đặt mốc, theo dõi trạng thái.", "Tập quản lý bài nhóm hoặc dự án CLB bằng bảng việc rõ ràng."] },
      { icon: "💬", label: "Giao tiếp", body: ["Nói ngắn, rõ, đúng người, đúng lúc.", "Sau mỗi buổi họp, tập gửi tóm tắt 5 dòng: quyết định, việc, người, hạn."] },
      { icon: "🎯", label: "Giữ phạm vi", body: ["Dự án sáng tạo rất dễ thêm thứ mới.", "Học nói: phần này hay, nhưng có thuộc mục tiêu đợt này không?"] },
      { icon: "🔍", label: "Nhìn rủi ro", body: ["Phát hiện sớm việc có thể trễ hoặc thiếu đầu vào.", "Luôn hỏi: việc nào đang chặn việc nào?"] },
      { icon: "🤝", label: "Làm việc với nhiều kiểu người", body: ["Designer, coder, artist, khách hàng có ngôn ngữ khác nhau.", "Tập dịch thông tin giữa các nhóm thay vì để họ hiểu nhầm."] },
      { icon: "🧠", label: "Bình tĩnh", body: ["Khi dự án rối, Project Manager cần làm rõ bước tiếp theo.", "Đừng chỉ báo lỗi; hãy kèm 2 phương án xử lý."] },
    ],
    path: [
      ["Quản lý bài nhóm thật nghiêm túc", "Dù là bài nhỏ, hãy thử chia việc, đặt hạn, theo dõi trạng thái."],
      ["Học công cụ quản lý cơ bản", "Notion, Trello, Google Sheet hoặc Jira đều được; quan trọng là tư duy, không phải tên tool."],
      ["Tham gia dự án sáng tạo", "Game jam, CLB thiết kế, phim ngắn, sự kiện, dự án web — nơi có nhiều người phối hợp."],
      ["Tập viết tài liệu ngắn", "Mục tiêu, phạm vi, timeline, danh sách việc, quyết định sau họp."],
      ["Xây case trong hồ sơ", "Show dự án bạn quản lý: vấn đề, cách chia việc, rủi ro, kết quả."],
      ["Ứng tuyển project coordinator/intern", "Có thể bắt đầu từ điều phối dự án, trợ lý sản xuất, account intern hoặc PM intern."],
    ],
  },
  {
    id: "f2ee2857-3a70-4024-83ea-9a60fdbc2027",
    slug: "nghe-render-td",
    title: "Render TD",
    viet: "Kỹ thuật viên render",
    summary:
      "Người xử lý phần xuất hình cuối trong 3D/hoạt hình/VFX — tối ưu chất lượng, thời gian render, lỗi kỹ thuật và quy trình để cảnh ra được bản cuối.",
    metaTitle: "Render TD là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Render TD làm gì trong 3D, hoạt hình và VFX; cần học render, ánh sáng, kỹ thuật và tối ưu ra sao để bắt đầu.",
    intro: [
      "Một cảnh 3D đẹp trong phần mềm chưa chắc xuất ra được. Nó có thể render 12 tiếng vẫn nhiễu, thiếu texture, cháy sáng, lỗi tóc, hoặc crash giữa chừng. Render TD là người xử lý để cảnh ra được hình cuối ổn định.",
      "Render TD nằm giữa nghệ thuật và kỹ thuật: hiểu chất lượng hình ảnh mà đạo diễn muốn, nhưng cũng hiểu máy tính, render engine và lỗi sản xuất đang cản điều đó.",
    ],
    definition: [
      "Render TD là kỹ thuật viên phụ trách render — quá trình tính toán để biến cảnh 3D thành hình ảnh cuối. Họ tối ưu thiết lập, xử lý lỗi, hỗ trợ lighting/material và đảm bảo shot xuất ra đúng chất lượng.",
      "Nếu Lighting Artist đặt ánh sáng, Texture Artist làm chất liệu, thì Render TD giúp cảnh đó được tính toán hiệu quả và ít lỗi nhất.",
    ],
    responsibilities: [
      "Tối ưu thời gian render và chất lượng hình ảnh",
      "Sửa lỗi thiếu file, nhiễu, crash, sai đường dẫn, sai thiết lập",
      "Hỗ trợ đội ánh sáng/chất liệu khi cảnh quá nặng",
      "Quản lý bản render và báo lỗi cho các bộ phận liên quan",
    ],
    appears: [
      ["Hoạt hình 3D", "đảm bảo hàng trăm shot xuất hình ổn định."],
      ["VFX", "render nhân vật/vật thể số để ghép vào cảnh quay."],
      ["3D Art & Visualization", "tối ưu ảnh sản phẩm, nội thất, kiến trúc, cinematic 3D."],
    ],
    tasks: [
      {
        title: "Kiểm tra cảnh trước khi render",
        body:
          "Render TD kiểm tra cảnh có thiếu file, vật thể quá nặng, chất liệu lỗi, ánh sáng gây nhiễu hoặc thiết lập sai không. Bắt lỗi sớm giúp tiết kiệm rất nhiều giờ máy.",
        bullets: [
          ["Đường dẫn file", "texture, cache, mô hình có bị thiếu không"],
          ["Thiết lập render", "độ phân giải, chất lượng, lớp xuất hình"],
          ["Cảnh quá nặng", "mô hình/hiệu ứng/chất liệu có làm máy quá tải không"],
        ],
      },
      {
        title: "Tối ưu chất lượng và thời gian",
        body:
          "Mục tiêu không phải render đẹp bằng mọi giá, mà là đẹp đủ chuẩn trong thời gian hợp lý. Render TD cân bằng giữa chất lượng hình và chi phí máy.",
        bullets: [
          ["Nhiễu hình", "giảm hạt mà không tăng thời gian quá mức"],
          ["Chi tiết quan trọng", "giữ đẹp ở vùng người xem chú ý"],
          ["Thiết lập hợp lý", "không dùng mức quá cao cho phần không cần"],
        ],
      },
      {
        title: "Xử lý lỗi kỹ thuật",
        body:
          "Khi render lỗi, Render TD đọc log, thử lại, tìm file gây lỗi hoặc báo cho đúng bộ phận sửa. Đây là công việc cần kiên nhẫn và tư duy tìm nguyên nhân.",
        bullets: [
          ["Crash", "phần mềm tắt hoặc render dừng giữa chừng"],
          ["Thiếu dữ liệu", "file không đúng nơi, sai phiên bản, thiếu cache"],
          ["Sai hình", "bóng, màu, vật liệu hoặc lớp render không đúng"],
        ],
      },
      {
        title: "Quản lý bản render cuối",
        body:
          "Một shot có thể có nhiều lớp: nhân vật, nền, bóng, hiệu ứng, ánh sáng. Render TD giúp các lớp này được xuất đúng để compositor hoặc editor dùng tiếp.",
        bullets: [
          ["Lớp render", "tách các phần cần ghép/sửa sau"],
          ["Đặt tên", "bản nào là mới nhất, shot nào, phiên bản nào"],
          ["Bàn giao", "đúng định dạng, đúng nơi, đúng mốc"],
        ],
      },
    ],
    skills: [
      { icon: "🖥️", label: "Hiểu render", body: ["Cần biết máy tính tính ánh sáng, vật liệu, bóng và phản chiếu ra sao.", "Bắt đầu bằng Blender/Cycles hoặc engine tương tự để hiểu noise, samples, resolution."] },
      { icon: "💡", label: "Ánh sáng và chất liệu", body: ["Render TD cần hiểu vì sao ánh sáng/chất liệu làm cảnh nặng hoặc nhiễu.", "Học chung với lighting và surfacing sẽ rất có lợi."] },
      { icon: "🔧", label: "Sửa lỗi", body: ["Nhiều ngày công việc là đọc lỗi và tìm nguyên nhân.", "Tập ghi lại lỗi, cách thử, kết quả thay vì sửa mò."] },
      { icon: "📊", label: "Tối ưu", body: ["Biết giảm thời gian render mà không phá chất lượng chính.", "So sánh nhiều thiết lập và đo thời gian thay vì chỉ cảm giác."] },
      { icon: "🧠", label: "Tư duy hệ thống", body: ["Render liên quan file, máy, phần mềm, network, shot, version.", "Hiểu đường đi của dữ liệu giúp tìm lỗi nhanh hơn."] },
      { icon: "🤝", label: "Hỗ trợ team", body: ["Render TD giúp lighting, surfacing, compositor, pipeline cùng chạy.", "Cần giải thích lỗi kỹ thuật bằng ngôn ngữ dễ hiểu."] },
    ],
    path: [
      ["Học 3D cơ bản", "Dựng cảnh đơn giản, đặt vật liệu, đặt đèn và render thử."],
      ["Tìm hiểu vì sao render chậm", "Thử đổi ánh sáng, vật liệu, độ phân giải và so thời gian."],
      ["Học đọc lỗi", "Khi render fail, đừng bỏ qua log. Tập ghi nguyên nhân và cách xử lý."],
      ["Làm cảnh có nhiều lớp", "Tách nền, nhân vật, bóng, hiệu ứng để hiểu render phục vụ hậu kỳ."],
      ["Xây hồ sơ bằng case tối ưu", "Cho thấy cảnh ban đầu chậm/lỗi và cách bạn làm nó ổn hơn."],
      ["Ứng tuyển 3D/render assistant", "Có thể bắt đầu từ 3D junior, lighting/render assistant hoặc pipeline assistant."],
    ],
  },
  {
    id: "15e079e4-07df-4ca5-93e9-f8532c1ea218",
    slug: "nghe-rigging-artist",
    title: "Rigging Artist",
    viet: "Họa sĩ dựng khung điều khiển",
    summary:
      "Người tạo hệ xương và bộ điều khiển cho nhân vật/đồ vật 3D để animator có thể làm chúng cử động tự nhiên trong game, hoạt hình hoặc 3D.",
    metaTitle: "Rigging Artist là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Rigging Artist làm gì, cần học giải phẫu, 3D và điều khiển nhân vật ra sao để bắt đầu.",
    intro: [
      "Một nhân vật 3D đẹp nhưng không có rig thì giống búp bê cứng: không cúi, không cười, không giơ tay, không chạy được. Rigging Artist là người tạo “khung điều khiển” để nhân vật có thể chuyển động.",
      "Nghề này ít hào nhoáng hơn vẽ nhân vật, nhưng cực kỳ quan trọng. Rig tốt giúp animator làm việc nhanh và nhân vật cử động tự nhiên; rig tệ khiến mọi hành động bị gãy, méo hoặc rất khó sửa.",
    ],
    definition: [
      "Rigging Artist là người tạo hệ xương, khớp và bộ điều khiển cho mô hình 3D. Họ giúp nhân vật, khuôn mặt, quần áo, máy móc hoặc đạo cụ có thể được animator điều khiển.",
      "Nếu Modeler tạo hình nhân vật, Animator làm nhân vật chuyển động, thì Rigging Artist xây phần “cơ thể kỹ thuật” nằm giữa hai khâu đó.",
    ],
    responsibilities: [
      "Tạo xương, khớp và bộ điều khiển cho mô hình 3D",
      "Gắn bề mặt nhân vật vào hệ xương để cử động không bị méo xấu",
      "Làm điều khiển khuôn mặt, tay, chân, tóc, đồ vật khi cần",
      "Sửa rig theo góp ý của animator và yêu cầu kỹ thuật của dự án",
    ],
    appears: [
      ["Hoạt hình 3D", "rig nhân vật, khuôn mặt, sinh vật, đạo cụ để diễn hoạt."],
      ["Game", "rig nhân vật/monster/vũ khí phù hợp engine và animation gameplay."],
      ["3D Art & Visualization", "rig sản phẩm, máy móc, nhân vật hoặc vật thể cần chuyển động."],
    ],
    tasks: [
      {
        title: "Hiểu nhân vật cần cử động thế nào",
        body:
          "Trước khi rig, cần biết nhân vật sẽ đi, chạy, nhảy, nói, biến hình hay chỉ xoay vài động tác. Rig càng đúng nhu cầu, animator càng dễ làm.",
        bullets: [
          ["Phạm vi chuyển động", "nhân vật cần làm những hành động nào"],
          ["Kiểu cơ thể", "người, thú, robot, quái vật, đồ vật đều khác nhau"],
          ["Yêu cầu dự án", "phim cần diễn xuất tinh tế, game cần chạy ổn và nhẹ"],
        ],
      },
      {
        title: "Tạo xương và bộ điều khiển",
        body:
          "Rigging Artist đặt xương/khớp bên trong mô hình và tạo các nút điều khiển để animator kéo, xoay, tạo dáng. Điều khiển càng rõ, animator càng ít bực.",
        bullets: [
          ["Xương khớp", "cấu trúc bên trong để mô hình gập, xoay, duỗi"],
          ["Điều khiển", "nút/đường giúp animator tạo dáng dễ hơn"],
          ["Tên và màu", "sắp xếp rõ để người khác không bị lạc"],
        ],
      },
      {
        title: "Gắn da và sửa phần bị méo",
        body:
          "Khi nhân vật giơ tay, khuỷu tay, vai, cổ, mặt rất dễ bị méo. Rigging Artist chỉnh cách bề mặt đi theo xương để chuyển động nhìn tự nhiên hơn.",
        bullets: [
          ["Vùng gập", "vai, khuỷu, gối, cổ tay thường khó"],
          ["Da/mặt", "cần giữ cảm xúc và hình dáng khi nói/cười"],
          ["Kiểm tra pose", "thử nhiều dáng cực hạn để tìm lỗi"],
        ],
      },
      {
        title: "Hỗ trợ animator trong quá trình làm",
        body:
          "Rig thường phải sửa sau khi animator dùng thật. Có thể cần thêm điều khiển, giảm lỗi, làm chuyển động mượt hơn hoặc tối ưu cho game.",
        bullets: [
          ["Nhận góp ý", "animator báo khó dùng hoặc thiếu chức năng"],
          ["Sửa nhanh", "không để cả đội animation bị kẹt"],
          ["Tối ưu", "rig đủ mạnh nhưng không quá nặng"],
        ],
      },
    ],
    skills: [
      { icon: "🧊", label: "Hiểu 3D", body: ["Cần hiểu mô hình 3D, khớp, trục xoay và cách bề mặt biến dạng.", "Học Blender/Maya cơ bản trước khi rig phức tạp."] },
      { icon: "👤", label: "Giải phẫu/chuyển động", body: ["Biết cơ thể gập, xoay, duỗi ra sao giúp rig tự nhiên hơn.", "Quan sát người thật, động vật hoặc robot tùy hướng bạn chọn."] },
      { icon: "🔧", label: "Tư duy kỹ thuật", body: ["Rigging là nghề giải bài toán: làm sao điều khiển dễ mà không méo.", "Tập chia vấn đề lớn thành khớp, xương, điều khiển, vùng biến dạng."] },
      { icon: "💻", label: "Biết script là lợi thế", body: ["Python/MEL có thể giúp tự động hóa việc rig lặp lại.", "Không bắt buộc lúc mới học, nhưng rất có lợi khi làm studio."] },
      { icon: "🤝", label: "Làm việc với animator", body: ["Rig tốt là rig animator thích dùng.", "Hỏi họ cần điều khiển gì, phần nào khó tạo dáng, phần nào hay lỗi."] },
      { icon: "🔍", label: "Kiên nhẫn sửa lỗi", body: ["Vai méo, ngón tay lỗi, mặt cười xấu — rig cần sửa rất nhiều chi tiết.", "Nếu bạn thích giải lỗi kỹ thuật bằng mắt nhìn hình ảnh, nghề này hợp."] },
    ],
    path: [
      ["Học 3D và animation cơ bản", "Hiểu mô hình và chuyển động trước khi tạo rig cho người khác dùng."],
      ["Rig vật thể đơn giản", "Cánh cửa, robot tay máy, quả bóng có đuôi — bắt đầu từ cấu trúc dễ."],
      ["Rig nhân vật đơn giản", "Tạo xương tay/chân/cột sống, điều khiển cơ bản và thử vài dáng."],
      ["Học sửa biến dạng", "Tập sửa vai, khuỷu, đầu gối, cổ tay khi nhân vật gập mạnh."],
      ["Làm demo trước/sau", "Show model chưa rig, bộ điều khiển, vài pose và lỗi bạn đã sửa."],
      ["Ứng tuyển rigging junior/3D technical", "Có thể bắt đầu từ 3D generalist thiên kỹ thuật hoặc assistant rigging."],
    ],
  },
  {
    id: "11f17339-2267-464f-b53c-7ee595d8eb9e",
    slug: "nghe-sound-designer",
    title: "Sound Designer",
    viet: "Nhà thiết kế âm thanh",
    summary:
      "Người tạo và sắp xếp âm thanh cho phim, game, hoạt hình — bước chân, gió, va chạm, phép thuật, không gian — để hình ảnh có cảm giác sống.",
    metaTitle: "Sound Designer là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Sound Designer làm gì trong phim, game, hoạt hình; cần học nghe, thu âm, dựng âm thanh ra sao để bắt đầu.",
    intro: [
      "Một cánh cửa mở trong phim kinh dị có thể khiến bạn nổi da gà không phải vì hình ảnh, mà vì tiếng kẽo kẹt rất nhỏ. Trong game, chỉ một âm thanh “ting” đúng lúc cũng giúp người chơi biết mình nhặt được vật phẩm. Đó là sức mạnh của Sound Designer.",
      "Sound Designer không chỉ thêm tiếng cho có. Họ thiết kế âm thanh để người xem/người chơi hiểu không gian, lực, cảm xúc và hành động.",
    ],
    definition: [
      "Sound Designer là người tạo, chọn, chỉnh và sắp xếp âm thanh cho phim, game, hoạt hình, video hoặc sản phẩm tương tác. Âm thanh có thể là bước chân, gió, máy móc, phép thuật, tiếng UI, không gian phòng, va chạm hoặc hiệu ứng kỳ ảo.",
      "Khác Music Composer viết nhạc, Sound Designer tập trung vào thế giới âm thanh và hành động. Nhiều sản phẩm hay nhờ âm thanh dù người xem không nhận ra.",
    ],
    responsibilities: [
      "Tạo âm thanh cho hành động, môi trường, vật thể và giao diện",
      "Thu, chọn, chỉnh và ghép nhiều lớp âm thanh",
      "Giữ âm thanh hợp hình ảnh, nhịp dựng và cảm xúc",
      "Phối hợp với dựng phim, game designer, composer và đạo diễn",
    ],
    appears: [
      ["Phim & Hoạt hình", "bước chân, môi trường, va chạm, phép thuật, âm thanh cảnh."],
      ["Game", "âm thanh kỹ năng, UI, môi trường, phản hồi hành động người chơi."],
      ["Video/quảng cáo", "tạo cảm giác sản phẩm, nhịp chuyển cảnh, điểm nhấn thương hiệu."],
    ],
    tasks: [
      {
        title: "Hiểu cảnh cần nghe như thế nào",
        body:
          "Trước khi thêm âm thanh, Sound Designer cần hiểu cảnh diễn ra ở đâu, gần hay xa, thật hay kỳ ảo, vui hay căng. Âm thanh của cùng một bước chân trong hành lang bệnh viện khác sân trường rất nhiều.",
        bullets: [
          ["Không gian", "phòng nhỏ, hang, phố, rừng, sân vận động đều khác"],
          ["Chất liệu", "gỗ, kim loại, vải, nước, đá tạo tiếng khác nhau"],
          ["Cảm xúc", "âm thanh có thể làm cảnh thân thiện hoặc đáng sợ hơn"],
        ],
      },
      {
        title: "Thu hoặc tìm âm thanh phù hợp",
        body:
          "Nhiều âm thanh được thu ngoài đời rồi chỉnh lại. Một tiếng quái vật có thể là nhiều lớp: tiếng động vật, hơi thở, kim loại, gió. Công việc này rất sáng tạo.",
        bullets: [
          ["Thu âm", "tự ghi bước chân, đồ vật, môi trường"],
          ["Thư viện âm thanh", "tìm âm có sẵn nhưng chỉnh cho hợp dự án"],
          ["Ghép lớp", "nhiều âm nhỏ tạo thành một âm lớn có cảm giác mới"],
        ],
      },
      {
        title: "Dựng âm thanh khớp hình",
        body:
          "Âm thanh phải đúng thời điểm. Cú đấm lệch nửa giây sẽ mất lực; tiếng cửa đến sớm quá làm cảnh sai; game phản hồi chậm khiến người chơi khó chịu.",
        bullets: [
          ["Đúng nhịp", "âm thanh khớp hành động hoặc chuyển cảnh"],
          ["Đúng khoảng cách", "âm gần/xa phải có độ lớn và vang phù hợp"],
          ["Không lấn nhau", "thoại, nhạc và hiệu ứng cần có chỗ thở"],
        ],
      },
      {
        title: "Kiểm tra trải nghiệm cuối",
        body:
          "Âm thanh phải nghe ổn trên tai nghe, loa điện thoại, laptop, rạp hoặc trong game. Sound Designer kiểm tra nhiều môi trường để tránh âm quá nhỏ, quá gắt hoặc mệt tai.",
        bullets: [
          ["Cân bằng âm lượng", "âm quan trọng nghe rõ, âm phụ không lấn"],
          ["Không gây mệt", "âm lặp lại trong game cần dễ chịu"],
          ["Bản xuất", "file đúng định dạng và mức âm lượng dự án cần"],
        ],
      },
    ],
    skills: [
      { icon: "👂", label: "Tai nghe chi tiết", body: ["Bạn cần nghe được âm nào thừa, thiếu, quá gần, quá xa, quá gắt.", "Tập nhắm mắt nghe môi trường xung quanh và ghi lại từng lớp âm."] },
      { icon: "🎬", label: "Kể chuyện bằng âm", body: ["Âm thanh giúp người xem hiểu không gian và cảm xúc.", "Xem một cảnh không bật hình, thử đoán đang ở đâu và chuyện gì xảy ra."] },
      { icon: "🎙️", label: "Thu âm cơ bản", body: ["Biết đặt micro, tránh ồn, thu vật liệu khác nhau.", "Điện thoại cũng có thể bắt đầu nếu biết chọn nơi yên và nghe lại kỹ."] },
      { icon: "🖥️", label: "Dựng âm thanh", body: ["Cần biết cắt, ghép, chỉnh âm lượng, thêm vang, lọc tiếng.", "Bắt đầu bằng DaVinci Resolve, Audition, Reaper hoặc phần mềm bạn có."] },
      { icon: "🧠", label: "Sáng tạo vật liệu âm", body: ["Tiếng rồng có thể đến từ nhiều âm thật ghép lại.", "Thử tạo tiếng phép thuật từ ly thủy tinh, giấy, hơi thở, tiếng nước."] },
      { icon: "🤝", label: "Phối hợp", body: ["Âm thanh liên quan dựng phim, nhạc, game design và đạo diễn.", "Hỏi rõ: âm này cần thật, vui, đáng sợ, nhẹ hay mạnh?"] },
    ],
    path: [
      ["Tập nghe chủ động", "Ghi lại âm thanh quanh nhà/trường và phân tích chúng đến từ đâu."],
      ["Thu âm vật dụng đơn giản", "Bước chân, cửa, giấy, nước, kim loại, vải — rồi thử ghép vào video ngắn."],
      ["Học phần mềm dựng âm", "Cắt, ghép, chỉnh âm lượng, thêm vang, lọc ồn, xuất file."],
      ["Làm âm cho phim/game sinh viên", "Một cảnh ngắn không tiếng là bài tập rất tốt."],
      ["Xây hồ sơ trước/sau", "Cho xem cảnh gốc im lặng và bản có âm thanh, giải thích lựa chọn."],
      ["Tìm cơ hội hậu kỳ/audio", "Có thể bắt đầu từ thu âm hiện trường, dựng âm, game audio junior hoặc video editor thiên âm thanh."],
    ],
  },
  {
    id: "e9c48ca3-2fee-4f75-8a40-2d18b0732cee",
    slug: "nghe-storyboard-artist",
    title: "Storyboard Artist",
    viet: "Họa sĩ phân cảnh",
    summary:
      "Người vẽ chuỗi khung hình phác thảo để lên kế hoạch cho cảnh phim, hoạt hình, quảng cáo hoặc video — giúp đội thấy nhịp kể chuyện trước khi sản xuất.",
    metaTitle: "Storyboard Artist là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Storyboard Artist làm gì, khác Concept Artist ra sao, cần học kể chuyện bằng khung hình thế nào để bắt đầu.",
    intro: [
      "Trước khi quay một cảnh rượt đuổi hay làm một đoạn hoạt hình, đạo diễn cần biết camera nhìn từ đâu, nhân vật đi hướng nào, cảnh cắt sang đâu. Storyboard Artist vẽ chuỗi khung hình để cả đội nhìn thấy cảnh đó trước khi tốn tiền sản xuất.",
      "Storyboard không cần là tranh hoàn thiện. Nó cần rõ hành động, góc nhìn, nhịp và cảm xúc — giống bản nháp bằng hình của một cảnh phim.",
    ],
    definition: [
      "Storyboard Artist là người vẽ phân cảnh: chuỗi khung hình thể hiện diễn biến của một cảnh, một đoạn phim, một quảng cáo, một animation hoặc đôi khi là trailer/game cinematic.",
      "Khác Concept Artist tìm hình dáng/thế giới, Storyboard Artist tập trung vào kể chuyện theo thời gian: khung nào trước, khung nào sau, camera ở đâu, nhân vật làm gì.",
    ],
    responsibilities: [
      "Vẽ chuỗi khung hình thể hiện hành động và nhịp cảnh",
      "Chọn góc máy, cỡ cảnh, hướng chuyển động và điểm nhấn cảm xúc",
      "Sửa phân cảnh theo góp ý của đạo diễn hoặc trưởng nhóm story",
      "Giúp đội quay/animation/dựng hiểu cảnh trước khi sản xuất",
    ],
    appears: [
      ["Phim & Điện ảnh", "lên kế hoạch cảnh khó, hành động, quảng cáo, MV, trailer."],
      ["Hoạt hình", "xây nhịp kể chuyện trước khi animate."],
      ["Minh họa/truyện", "gần với việc chia trang, nhịp khung và hướng đọc."],
    ],
    tasks: [
      {
        title: "Đọc kịch bản và hiểu nhịp cảnh",
        body:
          "Storyboard Artist bắt đầu từ kịch bản hoặc mô tả cảnh. Họ cần hiểu ai đang làm gì, cảm xúc gì, khoảnh khắc nào quan trọng và người xem cần biết thông tin nào.",
        bullets: [
          ["Hành động chính", "nhân vật làm gì trong cảnh"],
          ["Cảm xúc", "cảnh hài, căng, buồn, hồi hộp hay bất ngờ"],
          ["Thông tin cần thấy", "người xem phải hiểu điều gì sau cảnh này"],
        ],
      },
      {
        title: "Chọn khung hình và góc nhìn",
        body:
          "Cùng một hành động có thể kể bằng cận mặt, toàn cảnh, góc thấp, góc cao. Storyboard Artist chọn cách nhìn giúp câu chuyện rõ và có cảm xúc.",
        bullets: [
          ["Cỡ cảnh", "toàn, trung, cận để điều khiển sự chú ý"],
          ["Góc máy", "cao/thấp/ngang để tạo cảm giác quyền lực, yếu thế hoặc gần gũi"],
          ["Hướng nhìn", "dẫn mắt người xem qua từng khung"],
        ],
      },
      {
        title: "Vẽ nhanh, rõ, đủ dùng",
        body:
          "Storyboard cần tốc độ. Hình có thể đơn giản, nhưng người xem phải hiểu nhân vật ở đâu, nhìn hướng nào, hành động gì. Vẽ quá đẹp nhưng chậm có thể không phù hợp.",
        bullets: [
          ["Dáng người", "thể hiện hành động và cảm xúc bằng silhouette rõ"],
          ["Mũi tên/chú thích", "giúp đọc chuyển động khi cần"],
          ["Không sa chi tiết", "ưu tiên nhịp và bố cục trước"],
        ],
      },
      {
        title: "Sửa nhịp theo góp ý",
        body:
          "Phân cảnh thường sửa nhiều. Có cảnh cần thêm khung để rõ hành động, có cảnh cần cắt bớt cho nhanh, có góc máy phải đổi vì quay/animation khó.",
        bullets: [
          ["Thêm/bớt khung", "điều chỉnh tốc độ kể chuyện"],
          ["Đổi góc", "làm cảnh rõ hơn hoặc giàu cảm xúc hơn"],
          ["Bản animatic", "ghép khung với thời gian/âm thanh để xem nhịp"],
        ],
      },
    ],
    skills: [
      { icon: "✏️", label: "Vẽ nhanh", body: ["Cần vẽ dáng, hành động, biểu cảm đủ rõ trong thời gian ngắn.", "Tập ký họa người đang chuyển động và vẽ thumbnail nhỏ."] },
      { icon: "🎬", label: "Ngôn ngữ điện ảnh", body: ["Hiểu cỡ cảnh, góc máy, chuyển cảnh, nhịp dựng.", "Xem phim và vẽ lại 6–10 khung chính của một cảnh."] },
      { icon: "🧠", label: "Kể chuyện", body: ["Storyboard là kể chuyện bằng hình theo thời gian.", "Tập kể một câu chuyện 1 phút chỉ bằng 12 khung, không cần thoại."] },
      { icon: "👁️", label: "Bố cục", body: ["Khung hình phải dẫn mắt đúng chỗ.", "Học cách đặt nhân vật, đường nhìn, khoảng trống và tương phản."] },
      { icon: "🤝", label: "Nhận góp ý", body: ["Phân cảnh sửa nhiều, không nên quá gắn bó với bản đầu.", "Tập trình bày lý do chọn góc và sẵn sàng đổi khi câu chuyện rõ hơn."] },
      { icon: "⏱️", label: "Tốc độ", body: ["Storyboard thường cần nhiều khung nhanh.", "Đặt thời gian: 30–60 giây cho một thumbnail để luyện không sa chi tiết."] },
    ],
    path: [
      ["Học vẽ dáng và phối cảnh", "Không cần tô đẹp, nhưng phải vẽ người/vật trong không gian rõ."],
      ["Xem phim bằng mắt phân cảnh", "Dừng cảnh, vẽ lại khung chính, ghi cỡ cảnh và cảm xúc."],
      ["Làm phân cảnh cho kịch bản ngắn", "Một cảnh 30 giây là đủ để luyện nhịp."],
      ["Ghép animatic đơn giản", "Đưa khung vào video, thêm thời gian và âm thanh tạm để kiểm tra nhịp."],
      ["Tham gia phim/hoạt hình sinh viên", "Dự án nhóm giúp bạn hiểu phân cảnh phục vụ sản xuất ra sao."],
      ["Xây hồ sơ theo sequence", "Show chuỗi khung, không chỉ một hình đẹp. Nhà tuyển dụng muốn thấy bạn kể chuyện."],
    ],
  },
  {
    id: "72d5efa4-8c60-4629-afc5-ca15964ec11c",
    slug: "nghe-architectural-visualizer",
    title: "Architectural Visualizer",
    viet: "Họa sĩ diễn họa kiến trúc",
    summary:
      "Người tạo hình ảnh/animation 3D giúp người xem hình dung công trình, nội thất hoặc không gian trước khi nó được xây dựng thật.",
    metaTitle:
      "Architectural Visualizer là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS",
    metaDescription:
      "Architectural Visualizer làm gì, cần học 3D, ánh sáng, kiến trúc và dựng cảnh ra sao để bắt đầu.",
    intro: [
      "Một căn hộ chưa xây xong nhưng khách đã thấy phòng khách ngập nắng, chất liệu gỗ, rèm, sofa và view ngoài cửa sổ. Hình ảnh đó thường do Architectural Visualizer tạo ra.",
      "Architectural Visualizer không thiết kế kiến trúc thay kiến trúc sư. Họ biến bản vẽ, mô hình và ý tưởng không gian thành hình ảnh dễ hiểu, đẹp và thuyết phục.",
    ],
    definition: [
      "Architectural Visualizer là người diễn họa kiến trúc/nội thất bằng 3D, hình ảnh, animation hoặc đôi khi trải nghiệm tương tác. Họ giúp chủ đầu tư, khách hàng, người mua nhà hoặc hội đồng duyệt hiểu công trình trước khi xây.",
      "Nghề này nằm giữa kiến trúc, 3D, nhiếp ảnh và kể chuyện bằng hình. Một hình diễn họa tốt không chỉ đẹp mà còn phải đúng không gian, vật liệu, ánh sáng và mục đích trình bày.",
    ],
    responsibilities: [
      "Dựng hoặc nhận mô hình kiến trúc/nội thất để tạo cảnh 3D",
      "Thiết lập vật liệu, ánh sáng, camera và bối cảnh",
      "Tạo hình ảnh tĩnh, video walkthrough hoặc góc nhìn bán hàng/trình bày",
      "Chỉnh sửa theo góp ý của kiến trúc sư, chủ đầu tư hoặc khách hàng",
    ],
    appears: [
      ["Kiến trúc & Nội thất", "diễn họa công trình, căn hộ, showroom, khách sạn, cảnh quan."],
      ["3D Art & Visualization", "tạo hình ảnh sản phẩm không gian, concept kiến trúc, video trải nghiệm."],
    ],
    tasks: [
      {
        title: "Hiểu bản vẽ và ý đồ không gian",
        body:
          "Trước khi dựng cảnh đẹp, Visualizer cần hiểu công trình: chức năng, phong cách, vật liệu, ánh sáng mong muốn và góc nhìn quan trọng.",
        bullets: [
          ["Mặt bằng/mặt đứng", "đọc kích thước và bố cục không gian"],
          ["Phong cách", "tối giản, sang trọng, ấm, công nghiệp, nghỉ dưỡng…"],
          ["Mục đích hình", "bán hàng, thuyết trình, duyệt thiết kế hay portfolio"],
        ],
      },
      {
        title: "Dựng cảnh và bố trí camera",
        body:
          "Một góc camera tốt giúp người xem hiểu không gian và cảm thấy muốn bước vào. Góc quá rộng, quá méo hoặc đặt sai cao độ sẽ làm công trình kém thuyết phục.",
        bullets: [
          ["Camera", "chọn góc nhìn rõ công năng và cảm xúc"],
          ["Bố cục", "sắp xếp tiền cảnh, trung cảnh, hậu cảnh"],
          ["Tỷ lệ", "đồ nội thất, người, cây, vật dụng phải đúng kích thước"],
        ],
      },
      {
        title: "Làm vật liệu và ánh sáng",
        body:
          "Gỗ, đá, kính, bê tông, vải, kim loại phải có cảm giác đúng. Ánh sáng quyết định không gian sang, ấm, rộng, yên tĩnh hay cao cấp.",
        bullets: [
          ["Vật liệu", "màu, vân, độ bóng, độ nhám"],
          ["Ánh sáng tự nhiên", "nắng, cửa sổ, bóng đổ, thời điểm trong ngày"],
          ["Ánh sáng nhân tạo", "đèn trần, đèn hắt, đèn trang trí"],
        ],
      },
      {
        title: "Chỉnh hình để thuyết phục người xem",
        body:
          "Bản render thô thường cần chỉnh màu, thêm người/cây/phụ kiện, sửa lỗi và làm hình có không khí hơn. Mục tiêu là đẹp nhưng không lừa sai thiết kế.",
        bullets: [
          ["Hậu kỳ", "chỉnh màu, tương phản, chi tiết nhỏ"],
          ["Bối cảnh sống", "người, cây, vật dụng giúp không gian có cảm giác sử dụng"],
          ["Trung thực", "hình đẹp nhưng vẫn tôn trọng thiết kế và tỷ lệ thật"],
        ],
      },
    ],
    skills: [
      { icon: "🏗️", label: "Hiểu không gian", body: ["Cần đọc được mặt bằng, tỷ lệ, công năng và vật liệu.", "Nếu còn đi học, hãy tập nhìn nhà/cafe/lớp học theo mặt bằng và góc nhìn."] },
      { icon: "🧊", label: "3D", body: ["Biết dựng cảnh, đặt camera, vật liệu, ánh sáng.", "Blender/3ds Max/SketchUp tùy hướng; chọn một công cụ để bắt đầu."] },
      { icon: "📸", label: "Góc nhìn như nhiếp ảnh", body: ["Hình kiến trúc đẹp cần camera tốt.", "Học bố cục, tiêu cự, chiều cao camera, ánh sáng tự nhiên từ nhiếp ảnh."] },
      { icon: "🎨", label: "Vật liệu và màu", body: ["Không gian thuyết phục nhờ gỗ, đá, kính, vải, ánh sáng đúng.", "Quan sát vật liệu thật và thử làm lại trong 3D."] },
      { icon: "👁️", label: "Mắt thẩm mỹ", body: ["Diễn họa cần vừa đúng kỹ thuật vừa có cảm xúc.", "So ảnh render tốt với ảnh thật để học chi tiết."] },
      { icon: "🤝", label: "Làm việc với khách/kiến trúc sư", body: ["Visualizer phải sửa theo góp ý và hiểu ý đồ thiết kế.", "Tập hỏi rõ: hình này dùng để bán, duyệt thiết kế hay trình bày ý tưởng?"] },
    ],
    path: [
      ["Học phối cảnh và không gian", "Vẽ phòng, đường phố, nội thất đơn giản để hiểu tỷ lệ."],
      ["Làm quen công cụ 3D", "Dựng một căn phòng nhỏ, đặt vật liệu và ánh sáng."],
      ["Học nhiếp ảnh kiến trúc", "Quan sát góc máy, ánh sáng cửa sổ, chiều cao camera trong ảnh nội thất."],
      ["Làm 3 dự án nhỏ", "Một phòng ngủ, một quán cafe, một mặt tiền nhà. Mỗi dự án có 2–3 góc render."],
      ["Tạo before/after", "Show bản mô hình xám, bản vật liệu, bản ánh sáng, bản hậu kỳ."],
      ["Ứng tuyển junior/freelance nhỏ", "Có thể bắt đầu từ diễn họa nội thất, hỗ trợ kiến trúc sư hoặc 3D visualization junior."],
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
