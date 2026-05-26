import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

type Item = {
  id: string;
  tieu_de: string;
  tieu_de_viet: string;
  tom_tat: string;
  meta_title: string;
  meta_description: string;
  noi_dung: string;
};

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

const items: Item[] = [
  // 01. Bumpers
  {
    id: "35580a97-0648-40f5-a285-0107d64ae729",
    tieu_de: "Bumpers",
    tieu_de_viet: "Bumper (đoạn chuyển)",
    tom_tat:
      "Bumpers là đoạn chuyển cảnh ngắn 2-5 giây dùng trong TV, streaming và YouTube để phân tách phân đoạn nội dung hoặc hiển thị logo. Yếu tố nhỏ nhưng quan trọng cho branding và pacing.",
    meta_title: "Bumpers là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Bumpers là đoạn chuyển cảnh ngắn 2-5 giây giữa các phân đoạn nội dung. Tìm hiểu các loại bumper, ứng dụng trong TV, YouTube, podcast và workflow thiết kế.",
    noi_dung: `
<section class="arc-intro">
  <p>Xem một show YouTube — sau intro chính, mỗi khi chuyển sang phân mục mới (Highlights, Q&amp;A, Outro) lại có 2-3 giây animation logo show. Hoặc giữa các chương trình TV, mỗi đoạn quảng cáo bắt đầu/kết thúc với 5 giây logo kênh. Đó là bumpers — element nhỏ nhưng giúp giữ identity và pacing cho nội dung dài.</p>
  <p>Bumpers là kiến thức cơ bản cho motion designer làm việc trong TV, streaming, content creator. Hiểu vai trò và quy cách bumpers giúp tạo content có nhịp chuyên nghiệp và branding nhất quán.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Bumpers là gì?</h2>
  <p>Bumpers (hoặc &quot;bumps&quot;) là đoạn video ngắn — thường 2 đến 10 giây — dùng để chuyển giữa các phân đoạn nội dung trong show, phim, broadcast hoặc podcast. Mục đích: phân tách logic content, hiển thị branding, hoặc tạo &quot;đệm&quot; trước/sau quảng cáo.</p>
  <p>Bumpers thường có animation logo, sound design ngắn (sting), và visual style phù hợp với brand chung của show. Khác với intro/outro dài (15-30 giây), bumpers gọn hơn và xuất hiện nhiều lần trong cùng một episode.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Bumper khác Intro và Lower Third</span>
    <p><strong>Intro</strong>: mở đầu show, dài, một lần/episode. <strong>Bumper</strong>: chuyển giữa các phân đoạn, ngắn, nhiều lần. <strong>Lower Third</strong>: graphic overlay khi đang phát, không phải đoạn chuyển. Cả ba đều là yếu tố branding nhưng vai trò khác nhau.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Logo bumper</strong> — chỉ logo + sting, 2-3 giây</li>
    <li><strong>Section bumper</strong> — giới thiệu phân đoạn tiếp theo (vd &quot;Coming Up&quot;)</li>
    <li><strong>Ad bumper</strong> — đệm trước/sau quảng cáo</li>
    <li><strong>Sting / Audio Logo</strong> — phần âm thanh kèm bumper</li>
    <li><strong>Outro Bumper</strong> — đệm cuối episode, dẫn tới next video</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"bumper logo animation broadcast motion graphics short"</span>
    </div>
    <p class="arc-image-caption">Bumper điển hình — logo show + sting âm thanh, 2-5 giây giữa các phân đoạn</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Bumpers trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Truyền hình &amp; Broadcast</h3>
    <ul class="arc-list">
      <li>Channel bumper trước/sau commercial break</li>
      <li>Programme bumper giữa các phân đoạn của show</li>
      <li>Phải tuân thủ broadcast safe area, color, frame rate chuẩn (25/29.97 fps)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">YouTube &amp; Podcast</h3>
    <ul class="arc-list">
      <li>Creator dùng bumper để branding cho mỗi phần (Sponsor section, Q&amp;A, Outro)</li>
      <li>Podcast video: bumper âm thanh + visual đơn giản</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Streaming &amp; Live</h3>
    <ul class="arc-list">
      <li>Twitch stream: starting soon bumper, BRB bumper, stream end bumper</li>
      <li>Webinar: section transition bumper</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Event &amp; Corporate</h3>
    <ul class="arc-list">
      <li>Conference: bumper giữa các speaker</li>
      <li>Annual meeting: chương trình bumper định danh từng phần</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Thiết kế Bumpers hiệu quả</h2>
  <ul class="arc-list">
    <li><strong>Ngắn, có nhịp</strong> — 2-5 giây cho bumper trong content; 5-10 giây cho ad bumper</li>
    <li><strong>Logo animation rõ</strong> — logo xuất hiện và &quot;ổn định&quot; ít nhất 1 giây cuối</li>
    <li><strong>Sound design quan trọng</strong> — sting âm thanh tạo memorability cao hơn visual đơn thuần</li>
    <li><strong>Consistent với brand</strong> — color, motion style, font phải khớp với toàn bộ show identity</li>
    <li><strong>Multiple variant</strong> — có 3-5 phiên bản khác nhau cùng style, tránh người xem nhàm</li>
    <li><strong>Safe area broadcast</strong> — text/logo trong 90% center khi làm cho TV</li>
  </ul>
</section>
`,
  },

  // 02. Callout Sheet
  {
    id: "b0371c53-aa53-43a1-b0b2-749cadab5e7e",
    tieu_de: "Callout Sheet",
    tieu_de_viet: "Bảng chú thích nhân vật (Callout Sheet)",
    tom_tat:
      "Callout Sheet là tài liệu kỹ thuật trong pipeline animation/comic — ghi chi tiết đặc biệt của nhân vật (nút áo, hoa văn, tỉ lệ) để đảm bảo nhất quán giữa các họa sĩ và phân đoạn.",
    meta_title: "Callout Sheet là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Callout Sheet là tài liệu chi tiết kỹ thuật nhân vật trong animation/comic. Tìm hiểu cách lập, áp dụng và lỗi thường gặp trong pipeline production.",
    noi_dung: `
<section class="arc-intro">
  <p>Một bộ phim hoạt hình có 5-10 character artist làm việc song song trên cùng một nhân vật. Nếu mỗi người tự diễn giải &quot;cô gái mặc áo len có 3 nút&quot;, kết quả sẽ là 5 phiên bản nhân vật khác nhau qua các cảnh. Callout sheet giải quyết vấn đề đó — quy chuẩn từng chi tiết để mọi artist vẽ ra cùng nhân vật.</p>
  <p>Callout Sheet là tài liệu chuẩn trong pipeline animation, comic, illustration team. Hiểu callout sheet giúp character designer và lead artist communicate hiệu quả với cả team, đảm bảo character consistency trong sản xuất quy mô lớn.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Callout Sheet là gì?</h2>
  <p>Callout Sheet là tài liệu kỹ thuật mô tả chi tiết các đặc điểm đặc biệt của một nhân vật — bao gồm số lượng nút áo, vị trí pocket, kích thước phụ kiện, hoa văn trang phục, tỉ lệ cụ thể giữa các bộ phận cơ thể, color codes đầy đủ. Sheet kèm theo character turnaround (vẽ nhân vật từ nhiều góc) và character expressions.</p>
  <p>Mục đích: tạo nguồn tham chiếu duy nhất cho mọi artist làm việc với character. Khi storyboard artist vẽ pose, animator dựng chuyển động, color artist tô màu — tất cả đều dùng cùng callout sheet để giữ nhân vật &quot;cùng một người&quot;.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Callout Sheet ≠ Character Sheet</span>
    <p><strong>Character Sheet</strong> (turnaround): vẽ nhân vật từ nhiều góc (front, side, 3/4, back). <strong>Callout Sheet</strong>: chú thích chi tiết kỹ thuật trên character sheet — &quot;tóc dài đến vai&quot;, &quot;5 nút áo&quot;, &quot;đôi giày da đỏ hex #8B2530&quot;. Hai thứ thường được combine trong cùng package nhưng vai trò khác nhau.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Character Turnaround</strong> — vẽ nhân vật từ 4-8 góc nhìn</li>
    <li><strong>Proportion Guide</strong> — tỷ lệ giữa các phần cơ thể, thường tính theo &quot;heads&quot;</li>
    <li><strong>Color Callout</strong> — chỉ rõ màu từng phần với mã hex hoặc Pantone</li>
    <li><strong>Detail Annotation</strong> — text/arrow chú thích chi tiết quan trọng</li>
    <li><strong>Expression Sheet</strong> — biểu cảm chuẩn (happy, sad, angry, surprised)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"character callout sheet animation production reference"</span>
    </div>
    <p class="arc-image-caption">Callout sheet điển hình — turnaround nhân vật với annotation chi tiết và color codes</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các thành phần của Callout Sheet</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Turnaround 4-góc tối thiểu</summary>
      <div class="arc-card-body">
        <p>Front, 3/4 front, side, back. Một số production có thêm 3/4 back hoặc top view. Mỗi góc giúp animator dựng pose từ angle bất kỳ.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Proportion Grid</summary>
      <div class="arc-card-body">
        <p>Tỉ lệ cơ thể tính theo &quot;heads&quot; — cao 6 heads (cartoon child), 7-8 heads (adult realistic), 9 heads (heroic). Đường tham chiếu cho artist không bị lệch.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Callouts với mã exact</summary>
      <div class="arc-card-body">
        <p>Mỗi phần trang phục, da, tóc, mắt có color code chính xác (hex, RGB, Pantone). Animator/colorist apply trực tiếp, không phỏng đoán.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Detail Annotations</summary>
      <div class="arc-card-body">
        <p>Arrow chỉ vào chi tiết quan trọng + ghi chú: &quot;5 nút áo&quot;, &quot;tóc luôn rủ về bên trái&quot;, &quot;đeo nhẫn ngón giữa tay phải&quot;. Detail nào quên ghi → mỗi artist vẽ khác → consistency lỗi.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Expression Sheet</summary>
      <div class="arc-card-body">
        <p>10-20 biểu cảm chuẩn để animator có range tham chiếu. Phổ biến: neutral, happy, sad, angry, surprised, scared, disgusted, smug, sleepy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Costume Variations</summary>
      <div class="arc-card-body">
        <p>Nếu nhân vật có nhiều outfit qua phim (regular, formal, sleep), mỗi outfit có turnaround + callout riêng.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Callout Sheet trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation 2D &amp; 3D</h3>
    <ul class="arc-list">
      <li>Mỗi nhân vật chính có callout sheet riêng, gửi cho mọi artist team</li>
      <li>Pixar, Disney có callout sheet rất chi tiết — cả model sheet nhỏ cho prop của nhân vật</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Comic / Manga</h3>
    <ul class="arc-list">
      <li>Tác giả manga lập callout sheet (character bible) khi serial dài</li>
      <li>Khi có assistant vẽ background hoặc minor character, callout đảm bảo consistency</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game</h3>
    <ul class="arc-list">
      <li>Character art bible cho game dài hạn (MMO, live service)</li>
      <li>Cả 3D model spec + concept art + callout — pipeline lớn</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Branded Mascot</h3>
    <ul class="arc-list">
      <li>Brand mascot (Duolingo owl, Mailchimp Freddie) có callout sheet trong brand guide</li>
      <li>Mọi designer trong/ngoài team đều dùng cùng spec để giữ mascot consistency</li>
    </ul>
  </div>
</section>
`,
  },

  // 03. CG
  {
    id: "292f0d07-5ce5-48b9-8e37-6c748caccd3d",
    tieu_de: "CG",
    tieu_de_viet: "Đồ họa máy tính (CG)",
    tom_tat:
      "CG (Computer Graphics) là lĩnh vực tạo hình ảnh, animation và mô hình bằng máy tính — nền tảng của phim hoạt hình, VFX, game và mọi đồ họa số hiện đại. Khái niệm rộng bao trùm nhiều ngành con.",
    meta_title: "CG là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "CG (Computer Graphics) là đồ họa máy tính — nền tảng của VFX, animation, game. Tìm hiểu các nhánh CG, lịch sử và ứng dụng trong ngành sáng tạo.",
    noi_dung: `
<section class="arc-intro">
  <p>Xem trailer Marvel — robot khổng lồ đánh nhau trên thành phố sụp đổ; chơi The Last of Us — nhân vật biểu lộ cảm xúc qua từng cơ mặt; quảng cáo nước hoa — chai sản phẩm xoay mượt trên nền nhung. Tất cả đều có chung một thuật ngữ &quot;đứng sau&quot;: CG. Khái niệm rộng đến mức &quot;CG&quot; gần như là từ chỉ chung mọi thứ tạo bằng máy tính trong ngành hình ảnh.</p>
  <p>CG là kiến thức nền tảng nhất cho ai bước vào ngành đồ họa, VFX, game, hoạt hình. Hiểu CG bao gồm những nhánh nào, lịch sử và mối quan hệ giữa các nhánh giúp định hướng sự nghiệp và biết những kỹ năng/phần mềm cần học cho từng nhánh con.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>CG là gì?</h2>
  <p>CG (Computer Graphics — Đồ họa máy tính) là lĩnh vực rộng bao gồm mọi kỹ thuật và quá trình tạo, xử lý, hiển thị hình ảnh bằng máy tính. Bao trùm từ pixel art đơn giản đến animation 3D phức tạp, từ UI design đến simulation vật lý cho VFX bom tấn.</p>
  <p>Trong ngành điện ảnh và game, &quot;CG&quot; thường được dùng cụ thể hơn để chỉ <strong>3D CG</strong> — animation và VFX 3D tạo bằng máy tính (khác với live-action quay thật). Tuy nhiên CG về mặt học thuật rộng hơn nhiều.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">CG ≠ VFX ≠ Animation</span>
    <p>CG là kỹ thuật rộng. <strong>VFX</strong>: dùng CG (và compositing) để thêm yếu tố không quay được vào phim live-action. <strong>Animation</strong>: dùng CG để tạo phim hoạt hình toàn bộ là CG, không có live-action. Một bộ phim Marvel: dùng CG, có VFX (kết hợp với cảnh quay thật), không gọi là animation. Pixar: 100% CG animation, không phải VFX.</p>
  </div>

  <ul class="arc-list">
    <li><strong>2D CG</strong> — đồ họa 2 chiều: UI, illustration, motion graphics</li>
    <li><strong>3D CG</strong> — đồ họa 3 chiều: modeling, animation, render</li>
    <li><strong>Rendering</strong> — quá trình tính toán pixel cuối từ mô hình 3D</li>
    <li><strong>Real-time CG</strong> — render mỗi frame trong realtime (game, AR/VR)</li>
    <li><strong>Offline CG</strong> — render mỗi frame mất minutes/hours (phim, animation)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"computer graphics CG fields visual effects animation"</span>
    </div>
    <p class="arc-image-caption">Phổ rộng của CG — từ pixel art đến VFX phim bom tấn</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các nhánh chính của CG</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>3D Modeling &amp; Animation</summary>
      <div class="arc-card-body">
        <p>Tạo mô hình 3D, dựng chuyển động, render thành ảnh/video. Phần mềm: Maya, Blender, 3ds Max, Cinema 4D. Lĩnh vực rộng nhất của CG hiện đại.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>VFX (Visual Effects)</summary>
      <div class="arc-card-body">
        <p>Kết hợp CG với live-action footage. Bao gồm compositing, matte painting, simulation (lửa, nước, khói), tracking. Houdini, Nuke, Maya, Substance là chuẩn.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Motion Graphics &amp; 2D Animation</summary>
      <div class="arc-card-body">
        <p>Animation cho chữ, logo, UI, explainer video. After Effects + Illustrator/Photoshop là pipeline phổ biến.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Game Graphics</summary>
      <div class="arc-card-body">
        <p>Real-time CG: asset cho engine game (Unreal, Unity), tối ưu cho 30-60+ fps. Khác offline CG ở constraint performance.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Architectural &amp; Product Viz</summary>
      <div class="arc-card-body">
        <p>Render kiến trúc, sản phẩm photorealistic. V-Ray, Corona, Octane. Tăng nhanh nhờ realtime engine (Twinmotion, Unreal).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Scientific &amp; Medical Visualization</summary>
      <div class="arc-card-body">
        <p>CG cho dữ liệu khoa học: visualize phân tử, dòng chảy, MRI scan. Nhánh ít phổ biến nhưng đặc biệt important.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>CG trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim &amp; Điện ảnh</h3>
    <ul class="arc-list">
      <li>VFX studio: ILM, WETA, MPC — tạo cảnh khó/không thể quay thật</li>
      <li>Phim hoạt hình full CG: Pixar, DreamWorks, Disney 3D</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game</h3>
    <ul class="arc-list">
      <li>Asset 3D cho game engine, optimization cho realtime</li>
      <li>Cutscene pre-rendered hoặc realtime cinematic</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Quảng cáo &amp; Marketing</h3>
    <ul class="arc-list">
      <li>Product CG: chai nước hoa, ô tô, điện thoại — render thay vì chụp thật</li>
      <li>Motion graphics cho social, intro YouTube, explainer</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Kiến trúc &amp; Sản phẩm</h3>
    <ul class="arc-list">
      <li>Bất động sản: render trước khi xây — bán dự án</li>
      <li>Product design: visualize prototype trước khi production</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Y tế &amp; Khoa học</h3>
    <ul class="arc-list">
      <li>Animation y khoa: giải phẫu, dược lý, surgical training</li>
      <li>Scientific visualization: data khổng lồ thành hình</li>
    </ul>
  </div>
</section>
`,
  },

  // 04. Cinematography
  {
    id: "c574a672-4ca5-4b39-a04b-391bf96564c9",
    tieu_de: "Cinematography",
    tieu_de_viet: "Quay phim (Cinematography)",
    tom_tat:
      "Cinematography là nghệ thuật và kỹ thuật tạo hình ảnh cho phim — từ chọn máy quay, ánh sáng, bố cục đến chuyển động camera. Vai trò của Director of Photography (DOP) định hình &quot;look&quot; thị giác của bộ phim.",
    meta_title: "Cinematography là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Cinematography là nghệ thuật tạo hình ảnh điện ảnh. Tìm hiểu vai trò DOP, kỹ thuật ánh sáng, camera movement và ứng dụng trong phim, TVC, music video.",
    noi_dung: `
<section class="arc-intro">
  <p>Hai phim cùng kịch bản, cùng diễn viên — phim A nhìn cinematic và emotional, phim B trông như video gia đình. Khác biệt chính nằm ở cinematography — sự kết hợp giữa lens choice, ánh sáng, bố cục và camera movement. Đây là &quot;ngôn ngữ thị giác&quot; của điện ảnh.</p>
  <p>Cinematography là kiến thức nền tảng cho mọi filmmaker, video creator, DOP. Hiểu cinematography giúp bạn không chỉ &quot;quay được&quot; mà còn quay được hình ảnh có cảm xúc, có ý đồ — phân biệt giữa video amateur và phim chuyên nghiệp.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Cinematography là gì?</h2>
  <p>Cinematography là nghệ thuật và khoa học tạo ra hình ảnh chuyển động cho điện ảnh và truyền hình. Bao gồm mọi quyết định liên quan đến hình ảnh: chọn camera, lens, ánh sáng, exposure, bố cục, color, camera movement, blocking diễn viên trong frame.</p>
  <p>Người chịu trách nhiệm cinematography là Director of Photography (DOP/DP) — cộng tác chặt chẽ với đạo diễn để thực hiện &quot;visual storytelling&quot; theo ý đồ của phim. DOP không chỉ &quot;biết kỹ thuật&quot; mà còn cần sense thẩm mỹ và cảm xúc thị giác mạnh.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">DOP vs Director vs Camera Operator</span>
    <p><strong>Director</strong>: quyết định storytelling tổng thể. <strong>DOP</strong>: chịu trách nhiệm visual — lens, lighting, exposure, mood. <strong>Camera Operator</strong>: vận hành camera theo direction của DOP. Trên set lớn, ba vai trò riêng; small production thì có thể một người đeo nhiều mũ.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Camera</strong> — chọn body (ARRI, RED, Sony, Blackmagic), sensor size, dynamic range</li>
    <li><strong>Lens</strong> — focal length, aperture, lens character (cine vs photo lens)</li>
    <li><strong>Lighting</strong> — key, fill, back lights tạo mood và shape mặt</li>
    <li><strong>Composition</strong> — framing, rule of thirds, leading lines</li>
    <li><strong>Camera Movement</strong> — static, pan, tilt, dolly, crane, handheld, steadicam, drone</li>
    <li><strong>Color Treatment</strong> — quay flat/log, grade sau hoặc baked color in-camera</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"cinematography film set DOP lighting camera setup"</span>
    </div>
    <p class="arc-image-caption">Set cinematography điển hình — camera, lighting setup, DOP và operator</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các thành phần của Cinematography</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Lighting — quan trọng nhất</summary>
      <div class="arc-card-body">
        <p>3-point lighting (key, fill, back) là nền tảng. Hard light (sharp shadow) tạo drama; soft light (diffused) tạo nhẹ nhàng. Motivated lighting đến từ source &quot;có thật&quot; trong cảnh (đèn bàn, cửa sổ).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lens &amp; Focal Length</summary>
      <div class="arc-card-body">
        <p>Wide (24mm) cho không gian rộng, perspective exaggerated. Standard (35-50mm) gần với mắt người. Tele (85mm+) cho close-up, background blur. Mỗi focal length kể câu chuyện khác.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Camera Movement</summary>
      <div class="arc-card-body">
        <p>Static (cảnh tĩnh): focus, formal. Handheld: documentary, urgency. Dolly/Steadicam: smooth, immersive. Crane/Drone: epic, reveal. Movement phải có motivation — không phải để &quot;trông phong cách&quot;.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Composition &amp; Framing</summary>
      <div class="arc-card-body">
        <p>Wide shot, medium, close-up, extreme close-up. Mỗi shot size có mục đích storytelling cụ thể. Eye-level, low angle (subject mạnh mẽ), high angle (subject nhỏ bé).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Exposure &amp; Dynamic Range</summary>
      <div class="arc-card-body">
        <p>Set ISO, shutter, aperture cho exposure. Quay Log (S-Log, Log-C) cho dynamic range tối đa, grade sau. Quay Rec.709 cho color baked, ít sửa post.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Cinematography trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim điện ảnh</h3>
    <ul class="arc-list">
      <li>Camera: ARRI Alexa, RED, Sony Venice — sensor lớn, dynamic range cao</li>
      <li>Lens prime cinematic — Cooke S4, ARRI Master Prime</li>
      <li>Quay anamorphic cho widescreen 2.39:1</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">TV &amp; Series</h3>
    <ul class="arc-list">
      <li>Camera: Sony FX9, ARRI Mini — đủ quality, dễ vận hành cho schedule nhanh</li>
      <li>Lens zoom thường hơn prime cho tốc độ</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">TVC / Quảng cáo</h3>
    <ul class="arc-list">
      <li>Camera ARRI Alexa thường — &quot;commercial look&quot;</li>
      <li>Lighting cao cấp, perfectionist mỗi shot</li>
      <li>Slow motion 120-1000fps cho product showcase</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Music Video</h3>
    <ul class="arc-list">
      <li>Sáng tạo nhất — mọi technique được dùng</li>
      <li>One-take, anamorphic, vintage lens, in-camera effects phổ biến</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Documentary &amp; Vlog</h3>
    <ul class="arc-list">
      <li>Sony FX3, Blackmagic Pocket, Canon C70 — compact, low light tốt</li>
      <li>Natural lighting, handheld phổ biến cho authentic feel</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Để học Cinematography</h2>
  <ul class="arc-list">
    <li><strong>Hiểu lighting trước hết</strong> — 70% chất lượng cinematography đến từ lighting, không phải camera</li>
    <li><strong>Quay nhiều, watch nhiều</strong> — phân tích shot của phim yêu thích, recreate trên small project</li>
    <li><strong>Master shot size language</strong> — biết khi nào dùng wide, medium, close-up</li>
    <li><strong>Learn from masters</strong> — Roger Deakins, Emmanuel Lubezki, Greig Fraser — xem behind-the-scenes</li>
    <li><strong>Reference real cinema</strong> — book &quot;American Cinematographer&quot;, ASC magazine</li>
    <li><strong>Practice with what you have</strong> — phone camera + natural light đủ để học bố cục và lighting basics</li>
  </ul>
</section>
`,
  },

  // 05. Clipping Mask
  {
    id: "681a42d2-4f82-473e-8998-f5abf9bc4924",
    tieu_de: "Clipping Mask",
    tieu_de_viet: "Mặt nạ cắt (Clipping Mask)",
    tom_tat:
      "Clipping Mask là kỹ thuật dùng hình dạng layer làm khung &quot;cắt&quot; cho layer khác — chỉ phần nội dung nằm trong layer base mới hiển thị. Tính năng cốt lõi trong Photoshop, Illustrator, Figma.",
    meta_title: "Clipping Mask là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Clipping Mask cắt hiển thị layer theo hình dạng layer khác. Tìm hiểu cách dùng trong Photoshop, Illustrator, Figma và ứng dụng thiết kế thực tế.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn muốn đặt một bức ảnh vào hình tròn, hoặc cho chữ &quot;chứa&quot; hình ảnh bên trong, hoặc cho photo &quot;lấp&quot; vào shape phức tạp. Cách lười — dùng eraser tool xóa ngoài shape (mất ảnh gốc). Cách chuyên nghiệp — clipping mask, không phá hủy gì cả mà vẫn đạt kết quả tương đương.</p>
  <p>Clipping Mask là kỹ năng cơ bản nhưng thiết yếu cho mọi designer, illustrator. Hiểu clipping mask giúp work non-destructive — luôn có thể edit lại, thay ảnh, chỉnh shape mà không phải làm lại từ đầu.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Clipping Mask là gì?</h2>
  <p>Clipping Mask là kỹ thuật sử dụng hình dạng của một layer làm &quot;khung cắt&quot; cho layer khác (hoặc nhóm layer khác) phía trên nó. Chỉ phần của layer phía trên nằm trong vùng có pixel của layer base mới hiển thị; phần ngoài bị ẩn đi (không xóa).</p>
  <p>Clipping mask là kỹ thuật <strong>non-destructive</strong> — bạn không cắt/xóa pixel của ảnh gốc. Layer ảnh vẫn nguyên vẹn, chỉ display bị giới hạn theo shape của base layer. Có thể tắt clipping bất kỳ lúc nào để thấy lại nguyên ảnh.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Clipping Mask vs Layer Mask vs Vector Mask</span>
    <p><strong>Clipping Mask</strong>: dùng shape của layer khác làm boundary. <strong>Layer Mask</strong>: mask raster gắn vào layer, dùng black/white để show/hide. <strong>Vector Mask</strong>: mask dạng vector path. Cả ba đều non-destructive nhưng phù hợp use case khác nhau.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Base layer</strong> — layer dưới, hình dạng quyết định vùng hiển thị</li>
    <li><strong>Clipped layer</strong> — layer trên, bị &quot;clip&quot; theo base</li>
    <li><strong>Non-destructive</strong> — không phá hủy nội dung gốc</li>
    <li><strong>Release</strong> — gỡ clipping, layer trở về bình thường</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"clipping mask photoshop illustrator layer example"</span>
    </div>
    <p class="arc-image-caption">Clipping mask — ảnh chỉ hiển thị trong vùng shape (chữ, hình tròn, custom path)</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Clipping Mask trong từng phần mềm</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Photoshop — Ctrl+Alt+G / Cmd+Opt+G</summary>
      <div class="arc-card-body">
        <p>Đặt layer ảnh phía trên layer shape (text, hình). Nhấp chuột phải layer ảnh → Create Clipping Mask. Hoặc Alt+click vào ranh giới giữa hai layer trong panel.</p>
        <p>Có thể clip nhiều layer cùng một base — alt+click chuỗi layer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Illustrator — Ctrl+7 / Cmd+7</summary>
      <div class="arc-card-body">
        <p>Chọn shape làm mask và object cần clip → Object → Clipping Mask → Make (Ctrl+7). Release: Ctrl+Alt+7.</p>
        <p>Illustrator chuyên vector — clipping cho gradient, pattern, complex artwork.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Figma — Use as Mask</summary>
      <div class="arc-card-body">
        <p>Chọn shape làm mask → ngay click chuột phải → &quot;Use as Mask&quot;. Shape phải nằm <em>dưới</em> object cần clip trong same frame/group.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>After Effects — Track Matte</summary>
      <div class="arc-card-body">
        <p>AE không gọi &quot;clipping mask&quot; mà gọi &quot;Track Matte&quot;. Layer A clipped bằng Alpha của layer B (Alpha Matte) hoặc Luminance (Luma Matte). Concept tương tự.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Procreate, Affinity, Krita</summary>
      <div class="arc-card-body">
        <p>Procreate: tap layer → Clipping Mask. Affinity: tương tự Photoshop. Krita: Inherit Alpha. Mọi software design hiện đại đều có equivalent.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Ứng dụng phổ biến của Clipping Mask</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photo Edit &amp; Composite</h3>
    <ul class="arc-list">
      <li>Áp adjustment layer (curve, levels) chỉ lên layer cụ thể — không ảnh hưởng toàn ảnh</li>
      <li>Đặt ảnh vào shape (hình tròn, polygon) cho avatar, profile</li>
      <li>Apply texture vào subject — texture clipped lên shape của subject</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Typography Design</h3>
    <ul class="arc-list">
      <li>Image inside text — chữ &quot;chứa&quot; ảnh photography</li>
      <li>Pattern fill text — chữ pattern hoa văn, geometric</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">UI/UX Design</h3>
    <ul class="arc-list">
      <li>Profile avatar trong circle</li>
      <li>Image card với rounded corner</li>
      <li>Banner image clipped trong custom shape</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Illustration &amp; Branding</h3>
    <ul class="arc-list">
      <li>Logo có image fill bên trong shape</li>
      <li>Coloring digital painting — apply color chỉ trong shape của character</li>
      <li>Texture lên illustration — clip texture vào từng element</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Clipping mask không có hiệu lực</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> base layer dưới không có pixel (empty), hoặc thứ tự sai (clipped phải trên base).</p>
        <p><strong>Cách fix:</strong> đảm bảo base layer có content và clipped layer ngay phía trên base.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Clipped layer hiển thị mờ/trong suốt khi không muốn</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> base layer có opacity &lt; 100%, clipped layer thừa hưởng.</p>
        <p><strong>Cách fix:</strong> set base layer opacity 100%, control opacity riêng trên clipped layer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Export PNG không giữ clipping</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> export setting không flatten đúng, hoặc layer order sai khi flatten.</p>
        <p><strong>Cách fix:</strong> trong Photoshop, dùng &quot;Save As&quot; PNG hoặc &quot;Export As&quot;; tránh &quot;Save for Web&quot; legacy.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 06. CMYK
  {
    id: "ad81b374-d538-4759-9cde-c732d76b8f8f",
    tieu_de: "CMYK",
    tieu_de_viet: "Hệ màu CMYK",
    tom_tat:
      "CMYK là hệ màu trừ dùng trong in ấn — gồm Cyan, Magenta, Yellow và Black. Bắt buộc cho mọi designer làm việc với print, packaging, magazine. Khác hoàn toàn với RGB của màn hình.",
    meta_title: "CMYK là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "CMYK là hệ màu in ấn — Cyan, Magenta, Yellow, Black. Tìm hiểu khác biệt với RGB, conversion và lỗi thường gặp khi thiết kế cho in.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn thiết kế poster màu xanh rực rỡ trên màn hình. In ra — màu xanh trông tối hơn, &quot;xỉn&quot; hơn so với trên screen. Đây không phải lỗi in mà là vấn đề khác biệt fundamental giữa RGB (màn hình) và CMYK (in). Hiểu CMYK giúp bạn thiết kế đúng cho từng medium và không bị &quot;sốc màu&quot; khi nhận thành phẩm in.</p>
  <p>CMYK là kiến thức bắt buộc cho mọi designer làm in ấn — name card, brochure, packaging, magazine, poster. Sai CMYK setup ngay từ đầu = file in xong không đúng ý muốn.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>CMYK là gì?</h2>
  <p>CMYK là hệ màu trừ (subtractive color model) sử dụng trong in ấn, gồm 4 mực chính: <strong>C</strong>yan (xanh lơ), <strong>M</strong>agenta (hồng cánh sen), <strong>Y</strong>ellow (vàng), và <strong>K</strong>ey (đen — &quot;K&quot; thay vì &quot;B&quot; để tránh nhầm với Blue trong RGB).</p>
  <p>Khác RGB (cộng — bắt đầu từ đen, thêm màu thành sáng), CMYK là trừ — bắt đầu từ giấy trắng, thêm mực trừ đi ánh sáng để thành màu. Vì giới hạn của mực in, gamut (phạm vi màu) của CMYK hẹp hơn RGB — đặc biệt ở vùng xanh lá và xanh dương rực rỡ.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Tại sao có thêm &quot;K&quot; (Black)?</span>
    <p>Về lý thuyết, C+M+Y kết hợp 100% nên cho ra đen. Thực tế: mực không tinh khiết hoàn toàn, C+M+Y cho ra nâu xám, không đen sâu. Hơn nữa, mực đen rẻ hơn mực màu — dùng K cho phần đen tiết kiệm chi phí. Nên thêm K riêng trong hệ màu in.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Subtractive</strong> — mực trừ ánh sáng, ngược với additive RGB</li>
    <li><strong>Gamut</strong> — phạm vi màu CMYK hẹp hơn RGB</li>
    <li><strong>Coated vs Uncoated</strong> — giấy có/không tráng, ảnh hưởng độ rực rỡ</li>
    <li><strong>Total Ink Coverage</strong> — tổng % mực, max 300-340% tùy in</li>
    <li><strong>Out of Gamut</strong> — màu RGB không reproduced được trong CMYK</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"CMYK vs RGB color gamut comparison print"</span>
    </div>
    <p class="arc-image-caption">So sánh CMYK và RGB gamut — CMYK hẹp hơn ở vùng xanh dương và xanh lá rực rỡ</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>CMYK vs RGB — khác biệt cốt lõi</h2>

  <div class="arc-image-block arc-image-grid-2">
    <div>
      <div class="arc-image-placeholder">
        <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
        <span class="arc-img-hint-kw">"RGB additive color model screen monitor"</span>
      </div>
      <p class="arc-image-caption">RGB — additive, bắt đầu từ đen, thêm light, dùng cho screen</p>
    </div>
    <div>
      <div class="arc-image-placeholder">
        <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
        <span class="arc-img-hint-kw">"CMYK subtractive color model print paper"</span>
      </div>
      <p class="arc-image-caption">CMYK — subtractive, bắt đầu từ giấy trắng, thêm mực, dùng cho in</p>
    </div>
  </div>

  <div class="arc-infobox">
    <span class="arc-infobox-label">CMYK vs RGB — tóm tắt khác biệt</span>
    <p>
      <strong>RGB</strong>: 3 màu (Red, Green, Blue), additive, dùng cho screen, gamut rộng.<br>
      <strong>CMYK</strong>: 4 màu (Cyan, Magenta, Yellow, Black), subtractive, dùng cho in, gamut hẹp hơn.<br>
      <strong>Lưu ý</strong>: file thiết kế cho web/screen luôn RGB; cho in luôn CMYK. Convert giữa hai cần test vì màu rực có thể tối/xỉn đi.
    </p>
  </div>

  <ul class="arc-list">
    <li>RGB có ~16.7 triệu màu (8-bit), CMYK ~16,000 unique distinguishable</li>
    <li>Nhiều màu xanh dương neon, xanh lá fluorescent không có trong CMYK</li>
    <li>Spot color (Pantone) bù cho gamut hẹp của CMYK — in cao cấp dùng Pantone metallic, fluorescent</li>
  </ul>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>CMYK trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Print Design (Magazine, Book)</h3>
    <ul class="arc-list">
      <li>Setup document CMYK từ đầu trong InDesign/Illustrator</li>
      <li>Ảnh import nên convert sang CMYK trước với ICC profile nhà in cung cấp</li>
      <li>Test print trước khi run hàng loạt</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Packaging</h3>
    <ul class="arc-list">
      <li>CMYK + Spot Color (Pantone) cho brand color exact</li>
      <li>Total Ink Coverage không vượt 300-340% — quá nhiều mực không khô được trên giấy</li>
      <li>Đặc biệt chú ý đen rich: 100K hoặc 60C 40M 40Y 100K cho đen sâu</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Marketing Print (Flyer, Brochure)</h3>
    <ul class="arc-list">
      <li>Convert ảnh sang CMYK trong Photoshop trước khi đặt vào InDesign</li>
      <li>Check &quot;Out of Gamut&quot; warning để xem màu nào sẽ bị shift khi in</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Apparel Printing</h3>
    <ul class="arc-list">
      <li>Screen print: spot color riêng từng màu</li>
      <li>DTG (Direct to Garment): CMYK + white ink trên vải tối</li>
      <li>Sublimation: CMYK trên polyester</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Màu trên in tối/xỉn hơn screen rất nhiều</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> thiết kế RGB chứa màu out of CMYK gamut (xanh dương rực, xanh lá fluorescent).</p>
        <p><strong>Cách fix:</strong> thiết kế trong CMYK từ đầu để thấy ngay limitation. Soft Proof CMYK trong Photoshop (Ctrl+Y) khi work RGB.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Đen không sâu trong in</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> dùng 100K only — chỉ in mực đen, kết quả là đen mờ, ngả xám.</p>
        <p><strong>Cách fix:</strong> dùng &quot;Rich Black&quot; cho vùng đen lớn: 60C 40M 40Y 100K hoặc theo spec nhà in. Đừng dùng 100C 100M 100Y 100K (quá nhiều mực).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Convert RGB → CMYK làm ảnh xỉn</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> conversion default trong Photoshop dùng generic profile, không khớp printer thực.</p>
        <p><strong>Cách fix:</strong> hỏi nhà in ICC profile của họ, install và convert qua đó. Profile phổ biến: ISO Coated v2, US Web Coated SWOP.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Total Ink Coverage quá cao, mực không khô</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> thiết kế vùng có C+M+Y+K cộng &gt;340%.</p>
        <p><strong>Cách fix:</strong> check Total Ink trong Photoshop. Giảm bằng cách thay K cho mực khác (GCR/UCR).</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 07. Codec
  {
    id: "5d3e3593-259f-4fa9-ba35-18a03ac8e98c",
    tieu_de: "Codec",
    tieu_de_viet: "Codec (mã hóa - giải mã)",
    tom_tat:
      "Codec là thuật toán nén và giải nén video/audio — quyết định chất lượng, dung lượng và compatibility. Hiểu codec là kỹ năng nền tảng cho video editor, livestreamer và mọi người làm việc với media.",
    meta_title: "Codec là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Codec là thuật toán nén video/audio quyết định chất lượng và dung lượng. Tìm hiểu H.264, H.265, ProRes, AAC và lỗi compatibility thường gặp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xuất video 4K trong Premiere — chọn H.264 ra file 200MB, chọn H.265 ra file 100MB cùng chất lượng, chọn ProRes ra file 5GB. Cùng một video, cùng resolution, nhưng dung lượng khác nhau hàng chục lần. Đây là sức mạnh và khác biệt của codec — yếu tố ít hiển thị nhưng quyết định mọi thứ trong workflow video.</p>
  <p>Codec là kiến thức nền tảng cho video editor, motion designer, livestreamer, và bất kỳ ai làm việc với video/audio chuyên nghiệp. Hiểu codec đúng giúp chọn được setup tối ưu cho từng use case: editing nhanh, archive lâu dài, streaming, hay deliverable client.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Codec là gì?</h2>
  <p>Codec (viết tắt của Coder-Decoder) là thuật toán dùng để nén (encode) và giải nén (decode) dữ liệu video, audio, hoặc cả hai. Codec quyết định cách dữ liệu raw từ camera/microphone được &quot;đóng gói&quot; thành file có thể lưu trữ và stream — và cách phần mềm/thiết bị khác đọc lại.</p>
  <p>Phân biệt với <strong>container</strong> (định dạng file như MP4, MOV, MKV) — container là &quot;vỏ&quot; chứa video/audio đã encode bằng codec. Một file .mp4 có thể chứa video H.264 hoặc H.265; cùng tên file extension nhưng codec bên trong khác hoàn toàn.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Lossy vs Lossless — hai cách nén</span>
    <p><strong>Lossy</strong>: bỏ thông tin &quot;mắt người không phân biệt được&quot; — file nhỏ nhiều, chất lượng giảm. H.264, H.265, AAC, MP3. <strong>Lossless</strong>: nén nhưng không mất thông tin — file lớn, có thể restore exact. ProRes, DNxHR, FLAC, ALAC. Trade-off giữa size và quality preservation.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Encoding</strong> — quá trình nén dữ liệu raw thành file codec</li>
    <li><strong>Decoding</strong> — giải nén để playback</li>
    <li><strong>Bitrate</strong> — lượng data/giây, quyết định chất lượng</li>
    <li><strong>I-frame / P-frame / B-frame</strong> — cấu trúc frame trong video codec</li>
    <li><strong>Hardware acceleration</strong> — encode/decode bằng GPU (NVENC, QuickSync)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"video codec comparison h264 h265 prores workflow"</span>
    </div>
    <p class="arc-image-caption">So sánh codec phổ biến — H.264, H.265, ProRes, DNxHR ở use case khác nhau</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các Codec phổ biến nhất</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>H.264 / AVC — chuẩn web phổ biến nhất</summary>
      <div class="arc-card-body">
        <p>Lossy, nén rất tốt, hỗ trợ rộng (mọi browser, thiết bị, social platform). Chuẩn cho YouTube upload, web video. Hardware decode trên hầu hết GPU/CPU.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>H.265 / HEVC — kế thừa H.264</summary>
      <div class="arc-card-body">
        <p>Nén tốt hơn H.264 ~50% (cùng chất lượng = nửa dung lượng). Cần hardware decode để play smooth. Vấn đề licensing patent phức tạp.</p>
        <p>iPhone quay HEVC default từ iOS 11. Netflix, Disney+ stream HEVC cho 4K.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>AV1 — codec mã nguồn mở thế hệ mới</summary>
      <div class="arc-card-body">
        <p>Nén tốt hơn H.265 ~30%, royalty-free. YouTube, Netflix đang dần chuyển sang AV1. Hardware decode hỗ trợ từ NVIDIA RTX 30+, Intel ARC.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>ProRes (Apple) — chuẩn editing</summary>
      <div class="arc-card-body">
        <p>Codec intermediate cho editing — không nén nặng, decode nhanh, không thay đổi chất lượng qua nhiều export. ProRes 422, 422 HQ, 4444 cho các use case. File lớn (~150 Mbps cho 1080p HQ).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>DNxHR / DNxHD (Avid) — đối thủ ProRes</summary>
      <div class="arc-card-body">
        <p>Tương tự ProRes nhưng từ Avid. Phổ biến trong post-production environment Windows.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Audio Codec — AAC, MP3, Opus, FLAC</summary>
      <div class="arc-card-body">
        <ul class="arc-list">
          <li><strong>AAC</strong>: chuẩn cho streaming, mobile</li>
          <li><strong>MP3</strong>: legacy nhưng vẫn phổ biến</li>
          <li><strong>Opus</strong>: hiện đại, voice/music tốt ở bitrate thấp</li>
          <li><strong>FLAC, ALAC</strong>: lossless cho music</li>
        </ul>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Codec cho từng use case</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">YouTube / Web Upload</h3>
    <ul class="arc-list">
      <li>H.264 high bitrate (1.5-2x recommended) — YouTube re-encode</li>
      <li>H.265 cũng ok nhưng compatibility kém hơn</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Video Editing</h3>
    <ul class="arc-list">
      <li>Editing direct trên H.264 từ phone/camera consumer — ok cho project ngắn</li>
      <li>Project dài/phức tạp: transcode sang ProRes/DNxHR cho smooth editing</li>
      <li>4K/8K: bắt buộc transcode sang proxy</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Archive &amp; Master</h3>
    <ul class="arc-list">
      <li>Master: ProRes 422 HQ hoặc 4444 — lossless tương đối</li>
      <li>Archive cinema: DPX, EXR sequence (32-bit float)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Live Streaming</h3>
    <ul class="arc-list">
      <li>H.264 CBR — encode realtime, smooth bandwidth</li>
      <li>Hardware encode (NVENC, AMD AMF) cho CPU rảnh tay xử lý OBS</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Broadcast Delivery</h3>
    <ul class="arc-list">
      <li>ProRes 422 HQ hoặc XDCAM HD 50 cho TV station</li>
      <li>IMX 50 cho legacy broadcast</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>File không play được trên thiết bị khác</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> codec không phổ biến hoặc thiết bị thiếu hardware decode (H.265 trên máy cũ).</p>
        <p><strong>Cách fix:</strong> deliver H.264 cho compatibility tối đa. Test trên thiết bị target trước.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Editing 4K H.264 lag, dropped frames</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhour:</strong> H.264 nặng decode, GPU không kịp.</p>
        <p><strong>Cách fix:</strong> transcode sang ProRes proxy hoặc DNxHR LB. Editing trên proxy, link back sang master khi export.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Re-encode nhiều lần làm chất lượng giảm dần</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> H.264 lossy, mỗi lần encode mất thêm chất lượng.</p>
        <p><strong>Cách fix:</strong> edit trên intermediate codec (ProRes) qua cả pipeline. Chỉ encode H.264 ở deliver cuối cùng.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 08. Color Correction
  {
    id: "32a9f00e-545e-4a92-82f6-9186424bf856",
    tieu_de: "Color Correction",
    tieu_de_viet: "Hiệu chỉnh màu (Color Correction)",
    tom_tat:
      "Color Correction là bước chỉnh sửa kỹ thuật cho footage — cân bằng trắng, exposure, contrast — để mọi shot trông tự nhiên và nhất quán. Bước nền tảng trước color grading sáng tạo.",
    meta_title: "Color Correction là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Color Correction cân bằng kỹ thuật footage trước grading sáng tạo. Tìm hiểu workflow, tool và phân biệt với Color Grading.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn dựng phim từ footage 3 ngày quay — shot ngoài trời có ánh nắng vàng, shot trong nhà có đèn ngả xanh do đèn LED, shot tối muộn underexpose. Trước khi áp &quot;look&quot; cinematic, bạn phải làm cho mọi shot trông &quot;giống một bộ phim&quot;. Đây là color correction — bước nền tảng quan trọng nhưng ít được chú ý.</p>
  <p>Color Correction là kỹ năng cơ bản nhất trong post-production màu sắc — đến trước Color Grading. Hiểu CC giúp bạn có baseline đúng cho creative grading, đồng thời sửa được các lỗi technical khó nhận ra nhưng phá vỡ chất lượng phim.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Color Correction là gì?</h2>
  <p>Color Correction (CC) là quá trình hiệu chỉnh kỹ thuật màu sắc của footage để đạt được trạng thái &quot;trung tính&quot; và &quot;chính xác&quot; — đảm bảo white balance đúng, exposure cân đối, contrast hợp lý, skin tone tự nhiên, và mọi shot trong scene khớp nhau (continuity).</p>
  <p>Khác với Color Grading (creative, áp &quot;look&quot; cảm xúc), Color Correction là về <strong>technical accuracy</strong>. Mục tiêu: footage phải đúng trước khi đẹp. Một grade đẹp dựa trên CC sai thì kết quả vẫn không nhất quán.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Color Correction luôn đến trước Color Grading</span>
    <p>Workflow chuẩn: footage Log/Raw → <strong>Color Correction</strong> (cân bằng, sửa lỗi, match shot) → <strong>Color Grading</strong> (apply look, mood). Skip CC mà grade thẳng = mỗi shot trong scene grade khác nhau, kết quả lộn xộn. CC là &quot;dọn bàn&quot; trước khi &quot;trang trí&quot;.</p>
  </div>

  <ul class="arc-list">
    <li><strong>White Balance</strong> — cân bằng nhiệt độ màu, tránh ngả xanh/vàng/đỏ</li>
    <li><strong>Exposure</strong> — tổng độ sáng, không quá tối/sáng</li>
    <li><strong>Contrast</strong> — chênh lệch giữa shadow và highlight</li>
    <li><strong>Saturation</strong> — độ rực rỡ màu sắc</li>
    <li><strong>Skin tone</strong> — màu da phải tự nhiên (vector scope I-line)</li>
    <li><strong>Shot Matching</strong> — các shot liên tiếp phải khớp màu</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"color correction before after davinci resolve scopes"</span>
    </div>
    <p class="arc-image-caption">Color correction — trước (off white balance) và sau (neutral, ready for grade)</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Quy trình Color Correction</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Set baseline — Lift/Gamma/Gain</summary>
      <div class="arc-card-body">
        <p>Adjust tổng exposure: Lift (shadow), Gamma (midtone), Gain (highlight). Mục tiêu: video không clipped highlight, shadow có detail, midtone hợp lý. Dùng waveform scope để check.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. White balance</summary>
      <div class="arc-card-body">
        <p>Pick neutral object trong frame (giấy trắng, tường trắng) — dùng Eyedropper, footage tự balance. Hoặc adjust thủ công với Color Wheel. Vector scope giúp check chính xác.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Contrast &amp; saturation</summary>
      <div class="arc-card-body">
        <p>Tăng/giảm contrast cho phù hợp. Sat default ở 100, có thể tăng nhẹ nếu footage flat từ Log. Tránh quá rực — skin tone bị over saturated trông không tự nhiên.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Skin tone check</summary>
      <div class="arc-card-body">
        <p>Trong vector scope, skin tone (mọi sắc tộc) nên nằm trên đường I-Line (110 độ). Lệch khỏi line này = skin trông không tự nhiên.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Shot matching</summary>
      <div class="arc-card-body">
        <p>Sau khi CC từng shot riêng, compare shot liên tiếp (split screen). Adjust nhẹ để continuity. Resolve có tính năng &quot;Shot Match&quot; tự động làm baseline.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Color Correction trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim &amp; TV</h3>
    <ul class="arc-list">
      <li>Colorist chuyên nghiệp làm CC trên DaVinci Resolve — pipeline chuẩn</li>
      <li>CC từng shot, sau đó grade scene thành look cinematic</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">YouTube / Vlog</h3>
    <ul class="arc-list">
      <li>Premiere Lumetri Color đủ cho CC cơ bản — white balance, exposure</li>
      <li>Auto-color đôi khi đủ cho fast workflow, nhưng manual mới control tốt</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photo Editing</h3>
    <ul class="arc-list">
      <li>Lightroom: White Balance + Exposure + Tone curves cho CC ảnh</li>
      <li>Cùng concept với video CC — base correction trước stylized treatment</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Live Broadcast</h3>
    <ul class="arc-list">
      <li>CC realtime tại camera (vision engineer chỉnh trong camera control unit)</li>
      <li>Không có post — phải đúng ngay khi broadcast</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Skip CC, grade thẳng từ Log</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> apply &quot;Log to Rec709&quot; LUT rồi grade luôn — bỏ qua CC step.</p>
        <p><strong>Cách fix:</strong> sau LUT, vẫn phải CC từng shot (white balance, exposure match) rồi mới grade. LUT chỉ là conversion technical, không phải CC.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>White balance nhìn ok trên monitor nhưng sai trên scope</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> monitor không calibrated, mắt &quot;adapt&quot; vào ngả màu sau vài phút.</p>
        <p><strong>Cách fix:</strong> dùng vector scope để confirm thay vì trust mắt. Calibrate monitor 6500K, 100 nits.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Shot liên tiếp grade khác nhau, continuity lỗi</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> grade từng shot riêng mà không reference scene.</p>
        <p><strong>Cách fix:</strong> CC scene first — match shot trong scene đến cùng baseline, sau đó grade scene như một đơn vị.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 09. Color Dynamics
  {
    id: "27e74512-7cd7-46d4-99b0-4c2f83c15891",
    tieu_de: "Color Dynamics",
    tieu_de_viet: "Động lực màu sắc (Color Dynamics)",
    tom_tat:
      "Color Dynamics là cách màu sắc thay đổi và tương tác trong thiết kế — bao gồm hue, saturation, brightness và mối quan hệ giữa các màu. Nền tảng của lý thuyết màu trong thiết kế và hội họa.",
    meta_title: "Color Dynamics là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Color Dynamics là cách màu sắc tương tác và thay đổi trong thiết kế. Tìm hiểu hue, saturation, brightness và lý thuyết màu thực hành.",
    noi_dung: `
<section class="arc-intro">
  <p>Hai bức tranh dùng cùng các màu chính nhưng cảm giác hoàn toàn khác — bức A &quot;hài hòa, dễ chịu&quot;, bức B &quot;khó chịu, lộn xộn&quot;. Khác biệt nằm ở Color Dynamics — cách các màu tương tác với nhau và thay đổi qua không gian. Đây là một trong những khía cạnh tinh tế nhất của lý thuyết màu.</p>
  <p>Color Dynamics là kiến thức quan trọng cho designer, painter, illustrator — nâng level từ &quot;biết dùng màu&quot; lên &quot;hiểu màu sắc hoạt động ra sao&quot;. Hiểu dynamics giúp bạn chọn palette có cảm xúc, áp dụng được vào digital painting, branding, và lighting.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Color Dynamics là gì?</h2>
  <p>Color Dynamics là thuật ngữ chỉ cách các thuộc tính màu sắc (hue, saturation, brightness) thay đổi và tương tác với nhau trong một thiết kế hoặc tác phẩm hội họa. Trong Photoshop, Color Dynamics còn là một panel cụ thể trong Brush Settings — quy định cách brush thay đổi màu theo stroke (foreground/background jitter, hue/sat/brightness variation).</p>
  <p>Hiểu rộng hơn, Color Dynamics là lĩnh vực nhỏ trong color theory — nghiên cứu mối quan hệ giữa các màu khi đặt cạnh nhau, ảnh hưởng đến cảm xúc và visual hierarchy. Liên quan đến simultaneous contrast, color temperature, color shift.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">3 thuộc tính cốt lõi của màu sắc</span>
    <p><strong>Hue</strong>: vị trí trên color wheel (đỏ, vàng, xanh...). <strong>Saturation</strong>: độ rực rỡ (xám = 0%, neon = 100%). <strong>Brightness/Value</strong>: độ sáng (đen = 0%, trắng = 100%). Color Dynamics là cách 3 yếu tố này thay đổi và tương tác. Master 3 yếu tố này = master color theory.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Hue Shift</strong> — màu thay đổi vị trí trên wheel theo ánh sáng/bóng</li>
    <li><strong>Simultaneous Contrast</strong> — màu A bên cạnh màu B trông khác A khi đứng riêng</li>
    <li><strong>Color Temperature</strong> — warm (đỏ/cam/vàng) vs cool (xanh dương/lá)</li>
    <li><strong>Saturation Falloff</strong> — vùng sáng và tối giảm saturation, midtone rực nhất</li>
    <li><strong>Color Harmony</strong> — combination màu hài hòa (complementary, analogous, triadic)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"color dynamics hue saturation brightness theory chart"</span>
    </div>
    <p class="arc-image-caption">Color dynamics — hue, saturation, brightness và tương tác giữa các màu</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Color Dynamics trong digital painting</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Hue Shift theo ánh sáng</summary>
      <div class="arc-card-body">
        <p>Trong vật lý thực, vùng sáng của vật thể có hue khác midtone. Vd: da người ở highlight ngả vàng/cam (warm light), midtone đỏ tự nhiên, shadow ngả tím/xanh (cool). Painter giỏi không chỉ đổi value khi vẽ shadow — họ shift hue.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Saturation Falloff</summary>
      <div class="arc-card-body">
        <p>Vùng quá sáng (gần white) và quá tối (gần black) bị giảm saturation. Color rực nhất nằm ở midtone. Painter mới hay làm highlight vẫn full saturation → trông &quot;CG&quot; không tự nhiên.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Simultaneous Contrast</summary>
      <div class="arc-card-body">
        <p>Cùng một xám trông sáng hơn khi đặt cạnh đen, tối hơn khi đặt cạnh trắng. Cùng một đỏ trông &quot;đỏ hơn&quot; cạnh xanh lá. Painter và designer dùng nguyên lý này để tạo focal point.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Temperature Shift</summary>
      <div class="arc-card-body">
        <p>Warm areas đứng cạnh cool areas tạo độ sâu — warm tiến (gần) cool lùi (xa). Trong landscape: foreground warm + background cool tạo perspective.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Color Dynamics trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Digital Painting &amp; Concept Art</h3>
    <ul class="arc-list">
      <li>Hue shift là kỹ năng phân biệt amateur với pro</li>
      <li>Atmospheric perspective dựa trên saturation và temperature shift</li>
      <li>Master class từ Sinix Design, Bobby Chiu về color theory</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Branding &amp; Identity Design</h3>
    <ul class="arc-list">
      <li>Color palette dựa trên color harmony (complementary, triadic)</li>
      <li>Test color trên nhiều background — simultaneous contrast có thể đổi cảm nhận màu</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">UI/UX</h3>
    <ul class="arc-list">
      <li>Color hierarchy: primary action dùng màu rực nhất, secondary giảm sat</li>
      <li>Accessibility: contrast ratio đủ cao cho người yếu thị giác (WCAG)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Color Grading (Phim/Video)</h3>
    <ul class="arc-list">
      <li>Teal &amp; Orange grading dựa trên color temperature contrast</li>
      <li>Highlight và shadow split-toning là dynamics manipulation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photoshop Brush Settings — Color Dynamics panel</h3>
    <ul class="arc-list">
      <li>Foreground/Background Jitter: brush random giữa 2 màu</li>
      <li>Hue Jitter, Saturation Jitter, Brightness Jitter cho variation tự nhiên</li>
      <li>Phổ biến cho painting lá cây, đám đông, particle</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Học Color Dynamics hiệu quả</h2>
  <ul class="arc-list">
    <li><strong>Vẽ bằng grey first</strong> — value structure đúng trước khi color</li>
    <li><strong>Study from masters</strong> — Sargent, Sorolla, Bouguereau cho oil painting; Pascal Campion, Loish cho digital</li>
    <li><strong>Color comp study</strong> — chọn ảnh, paint over chỉ với 5-7 colors, học cách màu tương tác</li>
    <li><strong>Limit palette</strong> — practice với 3-5 màu thay vì full palette — bắt buộc thinking về dynamics</li>
    <li><strong>Photo reference</strong> — chụp ảnh cùng object dưới ánh sáng khác nhau, study hue shift trong vật lý thật</li>
  </ul>
</section>
`,
  },

  // 10. Color Grading
  {
    id: "faf000cc-29c2-435b-9c51-ba66278eaa0e",
    tieu_de: "Color Grading",
    tieu_de_viet: "Hiệu chỉnh màu sáng tạo (Color Grading)",
    tom_tat:
      "Color Grading là bước hiệu chỉnh màu sắc sáng tạo — định hình mood, cảm xúc và phong cách thị giác của tác phẩm. Đến sau Color Correction và là dấu ấn nghệ thuật của colorist.",
    meta_title: "Color Grading là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Color Grading là tạo look sáng tạo cho phim, video. Tìm hiểu workflow, các look phổ biến (teal &amp; orange) và phân biệt với Color Correction.",
    noi_dung: `
<section class="arc-intro">
  <p>Cùng một footage, dưới tay 5 colorist khác nhau sẽ ra 5 &quot;look&quot; khác nhau — một bản warm và nostalgic, một bản cold và moody, một bản pastel mơ mộng. Đây là sức mạnh của Color Grading — bước nghệ thuật quyết định cảm xúc thị giác của phim. Không phải kỹ thuật thuần — là creative direction qua màu sắc.</p>
  <p>Color Grading là kỹ năng phân biệt amateur video editor với colorist chuyên nghiệp. Hiểu workflow grading và sense thẩm mỹ màu sắc giúp filmmaker, video creator nâng tầm sản phẩm — từ &quot;quay đẹp&quot; lên &quot;phim có cảm xúc&quot;.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Color Grading là gì?</h2>
  <p>Color Grading là quá trình điều chỉnh màu sắc và tone của footage một cách có chủ đích để tạo ra mood, cảm xúc và phong cách thị giác cụ thể. Khác với Color Correction (technical, đúng/sai), Color Grading là creative (chủ quan, có style).</p>
  <p>Trong workflow chuẩn: <strong>Color Correction</strong> đến trước (sửa lỗi, neutralize), <strong>Color Grading</strong> đến sau (apply look creative). Bộ phim hoàn thiện = footage đúng + look đẹp. Skip một trong hai = sản phẩm không hoàn chỉnh.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Color Grading khác LUT</span>
    <p><strong>LUT</strong> (Look-Up Table) là một &quot;preset&quot; — file áp dụng one-click cho một look. <strong>Color Grading</strong> là quá trình toàn diện — có thể bắt đầu từ LUT nhưng cần tweaks thêm cho từng shot, từng cảnh. LUT là tool, grading là craft.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Look</strong> — đặc trưng thị giác của phim (cinematic, vintage, pastel, noir)</li>
    <li><strong>Primary Grade</strong> — adjustment toàn frame</li>
    <li><strong>Secondary Grade</strong> — adjustment vùng cụ thể (qualifier, mask)</li>
    <li><strong>Power Window</strong> — mask trong DaVinci Resolve cho secondary</li>
    <li><strong>Node-based</strong> — DaVinci dùng node graph cho grading (vs layer-based AE)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"color grading davinci resolve teal orange film look"</span>
    </div>
    <p class="arc-image-caption">Color grading trong DaVinci Resolve — node-based workflow cho cinematic look</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các &quot;Look&quot; phổ biến trong Color Grading</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Teal &amp; Orange — Hollywood blockbuster</summary>
      <div class="arc-card-body">
        <p>Look phổ biến nhất từ 2000s — shadow ngả teal/cyan, skin tone ngả cam/orange. Dựa trên complementary color (đối nhau trên wheel) tạo contrast mạnh. Marvel, Bond, hầu hết phim hành động.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bleach Bypass — gritty, washed out</summary>
      <div class="arc-card-body">
        <p>Saturation thấp, contrast cao, ngả xanh xám. Phổ biến cho war film (Saving Private Ryan), thriller, sci-fi tối tăm.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pastel / Vintage — Wes Anderson style</summary>
      <div class="arc-card-body">
        <p>Saturation vừa phải, hue ngả vàng/đỏ ấm, contrast thấp. Cảm giác hoài cổ, mơ mộng. Grand Budapest Hotel, Moonrise Kingdom.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Film Emulation — Kodak, Fuji film stock</summary>
      <div class="arc-card-body">
        <p>Mô phỏng phim nhựa cụ thể — Kodak Vision3 200T, Fuji Eterna. LUT chuyên dụng (FilmConvert, Dehancer). Phổ biến cho indie film, music video vintage.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>HDR Cinematic — màu rộng cho TV cao cấp</summary>
      <div class="arc-card-body">
        <p>HDR10, Dolby Vision cho TV hiện đại. Highlight bright hơn, color gamut rộng (Rec.2020). Cần grade riêng cho SDR và HDR deliver.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Color Grading trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim điện ảnh &amp; Series</h3>
    <ul class="arc-list">
      <li>Colorist chuyên dùng DaVinci Resolve hoặc Baselight (Filmlight)</li>
      <li>Grading session với director, DOP — collaborative</li>
      <li>Deliver multiple format: DCP cho rạp, HDR cho streaming, SDR cho TV</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Quảng cáo / TVC</h3>
    <ul class="arc-list">
      <li>Look mạnh, đặc trưng brand</li>
      <li>Grading time-budget eo hẹp — colorist phải nhanh và precise</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Music Video</h3>
    <ul class="arc-list">
      <li>Look sáng tạo nhất — extreme grade, neon color, bold style</li>
      <li>Không bị giới hạn realism — &quot;artistic license&quot; tối đa</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">YouTube &amp; Vlog</h3>
    <ul class="arc-list">
      <li>Premiere Lumetri Color đủ cho grading basic</li>
      <li>LUT preset từ Lutify, Cinegrains cho fast workflow</li>
      <li>Brand consistency: cùng look qua mọi video</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Documentary</h3>
    <ul class="arc-list">
      <li>Grade subtle, prioritize authenticity</li>
      <li>Tránh look quá &quot;commercial&quot; — destroys credibility</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Workflow Color Grading cơ bản</h2>
  <ul class="arc-list">
    <li><strong>1. Setup project color</strong> — quay Log → set Log to Rec.709 conversion. ACES nếu pipeline cao cấp</li>
    <li><strong>2. Primary grade</strong> — apply Lift/Gamma/Gain, set baseline look toàn frame</li>
    <li><strong>3. Secondary grade</strong> — qualifier/mask cho skin tone, sky, specific object</li>
    <li><strong>4. Match shots</strong> — đảm bảo continuity giữa shot trong scene</li>
    <li><strong>5. Reference monitor</strong> — calibrated reference monitor (FSI, Sony BVM) thay vì laptop screen</li>
    <li><strong>6. Output for delivery</strong> — render đúng codec, color space, loudness cho từng platform</li>
  </ul>
</section>
`,
  },
];

console.log(`\n── Bắt đầu chạy ${items.length} bài keyword đợt 1.5 ──\n`);

const results: { tieu_de: string; do_dai?: number; error?: string }[] = [];

for (const it of items) {
  const sql = `UPDATE article_bai_viet SET
  tieu_de             = '${esc(it.tieu_de)}',
  tieu_de_viet        = '${esc(it.tieu_de_viet)}',
  tom_tat             = '${esc(it.tom_tat)}',
  meta_title          = '${esc(it.meta_title)}',
  meta_description    = '${esc(it.meta_description)}',
  trang_thai_noi_dung = 'published',
  noi_dung            = $noidung$${it.noi_dung}$noidung$
WHERE id = '${it.id}'
  AND loai_bai_viet = 'keyword'
RETURNING id, slug, tieu_de, LENGTH(noi_dung) AS do_dai;
`;

  try {
    const res = await runAdminSql(sql, "full");
    const row = res.rows?.find(
      (r) => r && typeof r === "object" && "do_dai" in r,
    ) as { do_dai?: string | number; tieu_de?: string } | undefined;
    const doDai =
      typeof row?.do_dai === "string" ? Number(row.do_dai) : row?.do_dai;
    if (typeof doDai === "number" && doDai > 800) {
      console.log(`✓ ${it.tieu_de} — ${doDai} ký tự`);
      results.push({ tieu_de: it.tieu_de, do_dai: doDai });
    } else {
      console.log(`⚠ ${it.tieu_de} — do_dai = ${doDai} (cần > 800)`);
      results.push({ tieu_de: it.tieu_de, do_dai: doDai, error: "too_short" });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`✗ ${it.tieu_de} — ${msg}`);
    results.push({ tieu_de: it.tieu_de, error: msg });
  }
}

const remain = await runAdminSql(
  `SELECT COUNT(*) AS con_lai_dot1
FROM article_bai_viet
WHERE loai_bai_viet = 'keyword'
  AND (noi_dung IS NULL OR noi_dung = '')
  AND tieu_de < 'I'`,
  "read",
);
const conLai = remain.rows?.[0]?.con_lai_dot1;

console.log(`\nCòn lại đợt 1: ${conLai} bài.`);
