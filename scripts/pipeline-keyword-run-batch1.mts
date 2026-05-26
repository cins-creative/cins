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
  // ───────────────────────────────────────── 01. 3D Animation ─────────────────────────────────────────
  {
    id: "6f7963a3-fc4a-4a38-a766-62fe5b283047",
    tieu_de: "3D Animation",
    tieu_de_viet: "Hoạt hình 3D",
    tom_tat:
      "3D Animation là kỹ thuật tạo chuyển động cho đối tượng trong không gian ba chiều — nền tảng của phim hoạt hình, game, VFX và quảng cáo hiện đại. Hiểu đúng cơ chế giúp animator kiểm soát cảm xúc, vật lý và nhịp diễn của từng cảnh.",
    meta_title:
      "3D Animation là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "3D Animation là kỹ thuật tạo chuyển động trong không gian ba chiều — nền tảng của phim hoạt hình, game, VFX và quảng cáo. Tìm hiểu các loại và quy trình.",
    noi_dung: `
<section class="arc-intro">
  <p>Khi xem một cảnh nhân vật Pixar khóc, một boss trong game AAA tung chiêu, hay một chiếc xe hơi xoay nhẹ trong quảng cáo — toàn bộ cử động đó được tính toán từng khung hình bởi animator. Đây là sản phẩm của 3D Animation, lĩnh vực biến mô hình tĩnh thành nhân vật biết &quot;diễn&quot;.</p>
  <p>3D Animation là nền tảng của hầu hết nội dung hình ảnh chuyển động hiện đại — từ phim hoạt hình, game, VFX cho đến motion graphics. Hiểu rõ cơ chế và workflow giúp bạn không chỉ làm chuyển động đúng vật lý mà còn truyền được cảm xúc và nhịp diễn cho khán giả.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>3D Animation là gì?</h2>
  <p>3D Animation (hoạt hình ba chiều) là quá trình tạo ra ảo giác chuyển động cho các đối tượng trong không gian ba chiều bằng máy tính. Animator điều khiển vị trí, xoay, biến dạng của mô hình qua thời gian — máy tính nội suy (interpolate) các trạng thái trung gian để tạo thành chuyển động liên tục.</p>
  <p>Khác với hoạt hình 2D (vẽ từng khung hình), 3D Animation làm việc với mô hình có chiều sâu thật. Animator có thể quay camera quanh nhân vật, đổi góc nhìn bất kỳ lúc nào mà không phải vẽ lại — nhưng đổi lại phải hiểu vật lý chuyển động, rigging, và timing ở mức sâu hơn.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">12 nguyên tắc hoạt hình kinh điển vẫn áp dụng</span>
    <p>Squash &amp; stretch, anticipation, follow through, exaggeration… — 12 nguyên tắc do Disney đúc kết từ thập niên 1930 vẫn là kim chỉ nam cho 3D animator hiện đại. Máy tính chỉ là công cụ; những gì làm cho chuyển động &quot;có hồn&quot; vẫn nằm ở việc hiểu các nguyên tắc cảm thụ này.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Rig</strong> — bộ &quot;khung xương&quot; gắn vào mô hình để animator điều khiển</li>
    <li><strong>Keyframe</strong> — khung hình quan trọng đặt bằng tay, máy nội suy giữa các keyframe</li>
    <li><strong>Timeline / dope sheet</strong> — bảng điều khiển thời gian, nơi animator tinh chỉnh từng keyframe</li>
    <li><strong>Graph editor</strong> — biểu đồ đường cong điều khiển tốc độ vào/ra của chuyển động (easing)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"3D animation keyframe graph editor maya blender workflow"</span>
    </div>
    <p class="arc-image-caption">Workflow điển hình của animator — đặt keyframe trên timeline rồi tinh chỉnh đường cong trong graph editor</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại 3D Animation phổ biến</h2>

  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>Keyframe Animation — phương pháp truyền thống nhất</summary>
      <div class="arc-card-body">
        <p>Animator đặt các trạng thái quan trọng (key pose) ở những thời điểm xác định, phần mềm tự nội suy chuyển động giữa các key đó. Đây là cách phổ biến nhất cho hoạt hình nhân vật vì cho phép kiểm soát hoàn toàn từng chi tiết diễn xuất.</p>
        <ul class="arc-list">
          <li>Phù hợp: hoạt hình nhân vật, cinematics game, cutscene</li>
          <li>Phần mềm chính: Maya, Blender, Cinema 4D, 3ds Max</li>
        </ul>
      </div>
    </details>

    <details class="arc-card">
      <summary>Motion Capture (MoCap) — bắt chuyển động thật</summary>
      <div class="arc-card-body">
        <p>Diễn viên mặc đồ có marker hoặc dùng cảm biến IMU, phần mềm ghi lại chuyển động thật rồi áp lên nhân vật 3D. Tiết kiệm thời gian khi cần chuyển động tự nhiên, nhưng vẫn cần animator cleanup và stylize.</p>
        <p>Phổ biến trong game AAA (The Last of Us, God of War), phim bom tấn (Avatar, Avengers) và sản xuất quy mô lớn cần nhiều chuyển động trong thời gian ngắn.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Procedural Animation — tự sinh bằng thuật toán</summary>
      <div class="arc-card-body">
        <p>Chuyển động được sinh ra bằng code hoặc node graph theo quy tắc toán học/vật lý — ví dụ tóc, vải, đám đông, lá rơi. Không cần keyframe từng đối tượng, phù hợp khi số lượng quá lớn.</p>
        <p>Houdini là phần mềm mạnh nhất cho procedural; Unreal và Unity cũng có hệ thống procedural cho game (NPC, crowd, physics).</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Simulation — mô phỏng vật lý</summary>
      <div class="arc-card-body">
        <p>Phần mềm giả lập các hiện tượng vật lý: lửa, khói, nước, vải, va chạm cứng (rigid body), va chạm mềm (soft body). Animator setup điều kiện đầu, simulator tính toán toàn bộ chuyển động dựa trên luật vật lý.</p>
      </div>
    </details>

  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>3D Animation trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim hoạt hình &amp; điện ảnh</h3>
    <ul class="arc-list">
      <li>Diễn xuất nhân vật là cốt lõi — animator phải hiểu acting, timing, weight</li>
      <li>Workflow: blocking → polish → final → render — mỗi bước thay đổi trách nhiệm cụ thể</li>
      <li>Phần mềm chuẩn studio: Maya cho character; Houdini cho FX và simulation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game</h3>
    <ul class="arc-list">
      <li>Animation phải tối ưu cho realtime — số bone giới hạn, blend tree cho transition mượt</li>
      <li>Loop animation (run, idle, attack) phải khớp đầu-cuối, không bị giật khi lặp lại</li>
      <li>Engine: Unreal sử dụng Animation Blueprint; Unity dùng Animator Controller</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Quảng cáo &amp; Motion Graphics</h3>
    <ul class="arc-list">
      <li>Thường ngắn (15-60 giây), tập trung vào sản phẩm hoặc concept, ít nhân vật phức tạp</li>
      <li>Cinema 4D phổ biến nhờ MoGraph và tích hợp After Effects</li>
      <li>Yêu cầu cao về styling và visual polish hơn là acting</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Kiến trúc &amp; Sản phẩm</h3>
    <ul class="arc-list">
      <li>Camera animation và simulation (gió thổi cây, nước chảy) thường nhiều hơn character</li>
      <li>Mục tiêu: trình bày không gian, vật liệu, ánh sáng đúng thực tế</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>Foot sliding — bàn chân nhân vật trượt trên sàn khi đi</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> bước chân không khớp với khoảng cách di chuyển của root (gốc rig), thường do đặt keyframe root quá đều mà không tính bước.</p>
        <p><strong>Cách fix:</strong> bật IK lock cho chân khi tiếp đất, hoặc đo lại stride length và điều chỉnh root translate theo bước chân thực tế.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Chuyển động không có &quot;weight&quot; — nhân vật trông như giấy</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> thiếu anticipation, follow-through và overshoot. Mọi bộ phận di chuyển cùng tốc độ và dừng cùng lúc — không giống cơ thể thật.</p>
        <p><strong>Cách fix:</strong> áp dụng 12 nguyên tắc — đặc biệt là squash &amp; stretch, anticipation và overlapping action. Trong graph editor, dùng ease in/out thay vì đường cong tuyến tính.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Cảnh diễn xuất nhìn cứng, thiếu cảm xúc</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> animator focus vào pose chính mà bỏ qua transition giữa các pose. Mắt, lông mày, ngón tay không có chuyển động phụ.</p>
        <p><strong>Cách fix:</strong> thêm secondary motion (ngón tay, mắt nhìn), thêm breathing nhẹ. Quay video tham khảo (reference) bản thân hoặc diễn viên trước khi animate.</p>
      </div>
    </details>

  </div>
</section>
`,
  },

  // ───────────────────────────────────────── 02. 3D Audio ─────────────────────────────────────────
  {
    id: "9d55d82e-7fd5-4124-a17b-fb9975a7645d",
    tieu_de: "3D Audio",
    tieu_de_viet: "Âm thanh ba chiều",
    tom_tat:
      "3D Audio là công nghệ tái tạo âm thanh có chiều sâu và phương hướng — giúp người nghe cảm nhận vị trí nguồn âm trong không gian. Đây là nền tảng của trải nghiệm điện ảnh, game VR và sản xuất âm nhạc immersive hiện đại.",
    meta_title:
      "3D Audio là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "3D Audio là công nghệ tái tạo âm thanh có phương hướng và chiều sâu — nền tảng của Dolby Atmos, VR và game. Tìm hiểu Binaural, Ambisonics và ứng dụng.",
    noi_dung: `
<section class="arc-intro">
  <p>Đeo tai nghe xem trailer Avatar — bạn nghe rõ tiếng chim bay ngang sau gáy, tiếng nước chảy bên trái, tiếng gió ở phía trên. Bộ não bạn &quot;tin&quot; những nguồn âm đó nằm ở vị trí cụ thể trong không gian dù thực tế chỉ có hai loa nhỏ trong tai. Đó là 3D Audio.</p>
  <p>Khác với stereo (chỉ trái-phải) hay surround truyền thống (loa quanh người), 3D Audio thêm chiều cao và độ sâu — cho phép âm thanh đến từ bất kỳ vị trí nào trong không gian ba chiều. Đây là nền tảng của điện ảnh hiện đại, game VR, và sản xuất nhạc immersive.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>3D Audio là gì?</h2>
  <p>3D Audio (âm thanh ba chiều) là công nghệ tái tạo âm thanh có thông tin về phương hướng và khoảng cách — giúp người nghe cảm nhận được nguồn âm nằm ở đâu trong không gian quanh mình. Nó dựa trên cách bộ não con người xử lý sự chênh lệch nhỏ về thời gian, cường độ và phổ tần giữa hai tai để định vị âm thanh.</p>
  <p>Trong khi stereo chỉ phân biệt trái-phải, và 5.1/7.1 surround chia loa quanh người ở cùng một mặt phẳng, 3D Audio thêm trục đứng (trên-dưới) và độ sâu (gần-xa). Kết quả là trải nghiệm âm thanh sống động gần với cách tai người nghe trong thế giới thật.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">HRTF — bí quyết của 3D Audio qua tai nghe</span>
    <p>HRTF (Head-Related Transfer Function) là tập hợp các phản hồi mô phỏng cách tai, đầu và thân người con người &quot;biến dạng&quot; âm thanh từ các hướng khác nhau. Nhờ HRTF, hai loa tai nghe có thể giả lập âm thanh đến từ mọi hướng quanh đầu — đây là nền tảng kỹ thuật của 3D Audio trên tai nghe.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Spatial audio</strong> — thuật ngữ chung chỉ mọi công nghệ tạo cảm giác không gian cho âm thanh</li>
    <li><strong>Object-based audio</strong> — mỗi nguồn âm là một &quot;object&quot; với tọa độ riêng, không phụ thuộc số loa</li>
    <li><strong>Binaural</strong> — mô phỏng nghe bằng hai tai, dùng HRTF, chỉ hoạt động với tai nghe</li>
    <li><strong>Ambisonics</strong> — định dạng ghi/lưu âm thanh 360 độ độc lập với cấu hình loa</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"3D audio spatial sound diagram dolby atmos binaural"</span>
    </div>
    <p class="arc-image-caption">Sơ đồ minh họa âm thanh ba chiều — nguồn âm phân bố trong không gian quanh người nghe theo trục X, Y, Z</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các công nghệ 3D Audio phổ biến</h2>

  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>Dolby Atmos — tiêu chuẩn điện ảnh và streaming hiện đại</summary>
      <div class="arc-card-body">
        <p>Dolby Atmos là chuẩn object-based audio phổ biến nhất hiện nay. Mỗi nguồn âm là một object có tọa độ 3D; hệ thống render phân bổ âm thanh đến các loa hoặc tai nghe phù hợp tại thời điểm phát.</p>
        <ul class="arc-list">
          <li>Rạp chiếu phim Atmos có loa trần và loa quanh để tạo bán cầu âm thanh</li>
          <li>Streaming (Netflix, Apple Music) hỗ trợ Atmos qua tai nghe với binaural rendering</li>
          <li>Apple Spatial Audio thực chất là Atmos trên hệ sinh thái Apple</li>
        </ul>
      </div>
    </details>

    <details class="arc-card">
      <summary>Binaural — 3D Audio trên tai nghe</summary>
      <div class="arc-card-body">
        <p>Sử dụng HRTF để mô phỏng âm thanh đến từ các hướng khác nhau khi chỉ có hai loa tai nghe. Đây là kỹ thuật phổ biến cho VR, ASMR, podcast immersive.</p>
        <p>Hạn chế: HRTF mặc định không khớp hoàn hảo với tai từng người — vì sao cùng một bản binaural có người nghe rất sống động, người khác lại thấy &quot;trong đầu&quot;.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Ambisonics — âm thanh hình cầu 360°</summary>
      <div class="arc-card-body">
        <p>Định dạng ghi và lưu âm thanh toàn cầu (full sphere) độc lập với cấu hình phát lại. Phổ biến trong VR (YouTube 360, Oculus) vì khi người dùng xoay đầu, hệ thống có thể decode lại theo hướng nhìn mới mà không cần ghi lại.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>DTS:X &amp; Auro-3D — đối thủ của Atmos</summary>
      <div class="arc-card-body">
        <p>DTS:X cũng là object-based audio, tương thích với cấu hình loa hiện có. Auro-3D dùng kiến trúc layer (lớp ngang, lớp trên, voice of god) phổ biến trong rạp phim cao cấp ở châu Âu.</p>
      </div>
    </details>

  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>3D Audio trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim &amp; Streaming</h3>
    <ul class="arc-list">
      <li>Dolby Atmos là chuẩn — Netflix, Apple TV+, Disney+ đều phát Atmos cho phim/series cao cấp</li>
      <li>Mix engineer làm việc trong DAW hỗ trợ object-based (Pro Tools Ultimate, Nuendo)</li>
      <li>Phải master cả version stereo và Atmos để tương thích người dùng không có thiết bị Atmos</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game &amp; VR</h3>
    <ul class="arc-list">
      <li>3D Audio bắt buộc trong VR — sai phương hướng âm thanh phá vỡ cảm giác immersion</li>
      <li>Game engine có hệ thống riêng: Unreal Audio (binaural), Unity (FMOD/Wwise integration)</li>
      <li>Steam Audio, Resonance Audio là middleware miễn phí phổ biến cho indie</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Âm nhạc &amp; Podcast</h3>
    <ul class="arc-list">
      <li>Apple Music, Tidal đẩy mạnh Spatial Audio — nhiều album được mix lại Atmos</li>
      <li>Podcast binaural tạo cảm giác &quot;người dẫn ngồi cạnh&quot; — phổ biến cho ASMR và storytelling</li>
      <li>Logic Pro, Pro Tools có native support Atmos cho producer độc lập</li>
    </ul>
  </div>
</section>
`,
  },

  // ───────────────────────────────────────── 03. ACES ─────────────────────────────────────────
  {
    id: "de722e8b-2fd7-4e16-9d43-06b3e8de9d2c",
    tieu_de: "ACES",
    tieu_de_viet: "Hệ quản lý màu ACES",
    tom_tat:
      "ACES là hệ thống quản lý màu chuẩn của Viện Hàn lâm Điện ảnh Mỹ — đảm bảo màu sắc nhất quán từ máy quay đến rạp chiếu. Đây là nền tảng pipeline màu của hầu hết phim bom tấn và studio VFX lớn hiện nay.",
    meta_title:
      "ACES là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "ACES là hệ thống quản lý màu chuẩn của Academy giúp màu nhất quán từ quay đến chiếu. Tìm hiểu các thành phần ACEScg, ACEScct, IDT, ODT trong pipeline VFX.",
    noi_dung: `
<section class="arc-intro">
  <p>Một dự án phim quay bằng camera ARRI, RED và Sony — mỗi máy lại có cách mã hóa màu riêng. Khi đưa vào pipeline VFX với plate quay thật trộn lẫn cảnh CG, làm sao đảm bảo màu sắc nhất quán từ máy quay cho đến rạp chiếu? Đây chính là vấn đề mà ACES giải quyết.</p>
  <p>ACES là hệ thống quản lý màu sắc do Viện Hàn lâm Điện ảnh Mỹ (Academy of Motion Picture Arts and Sciences) phát triển. Hiểu ACES không chỉ giúp colorist và VFX artist làm việc đúng chuẩn studio quốc tế mà còn tránh được nhiều lỗi màu sắc oan uổng khi giao file giữa các bộ phận.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>ACES là gì?</h2>
  <p>ACES (Academy Color Encoding System) là một hệ thống quản lý màu sắc toàn diện — không phải đơn thuần là một color space. Nó định nghĩa toàn bộ pipeline: cách đọc màu từ camera, cách lưu trữ ở định dạng trung gian, và cách xuất ra cho các thiết bị hiển thị khác nhau (rạp, TV HDR, web).</p>
  <p>Lợi ích chính của ACES: footage từ nhiều camera khác nhau và assets CG có thể trộn lẫn trong cùng một không gian màu duy nhất, sau đó render ra cho bất kỳ thiết bị nào mà vẫn giữ &quot;ý đồ creative&quot; của đạo diễn hình ảnh.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">ACES không phải là một &quot;look&quot;</span>
    <p>Nhiều người nhầm ACES là tonemap hay LUT cho ra hình &quot;đẹp&quot; sẵn. Thực ra ACES chỉ là khuôn khổ kỹ thuật — bạn vẫn cần colorist làm grading bên trong ACES. Nhưng nhờ pipeline chuẩn, kết quả grading sẽ nhất quán giữa các phần mềm và thiết bị.</p>
  </div>

  <ul class="arc-list">
    <li><strong>IDT</strong> (Input Device Transform) — biến đổi từ định dạng máy quay sang không gian ACES</li>
    <li><strong>ACES2065-1</strong> — không gian màu archive, gamut rộng nhất, lưu trữ master</li>
    <li><strong>ACEScg</strong> — không gian làm việc cho CG/VFX, gamut hẹp hơn nhưng phù hợp với rendering</li>
    <li><strong>ACEScct</strong> — không gian làm việc cho color grading, có log-encoding phù hợp với colorist</li>
    <li><strong>ODT / RRT</strong> — Output Device Transform &amp; Reference Rendering Transform, xuất ra thiết bị hiển thị</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"ACES pipeline diagram IDT ODT RRT workflow"</span>
    </div>
    <p class="arc-image-caption">Sơ đồ pipeline ACES — IDT đưa footage vào không gian chuẩn, ACEScg/ACEScct cho làm việc, ODT/RRT đưa ra thiết bị xem</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các thành phần chính của ACES</h2>

  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>ACES2065-1 — master archive</summary>
      <div class="arc-card-body">
        <p>Không gian màu lưu trữ chính của ACES, gamut cực rộng (rộng hơn cả mắt người nhìn thấy). Dùng để archive master cuối cùng — phim nào lưu trong ACES2065-1 thì có thể tái master cho bất kỳ chuẩn hiển thị nào trong tương lai mà không mất thông tin.</p>
        <p>File extension thường gặp: EXR 16-bit half float.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>ACEScg — không gian làm việc cho VFX/CG</summary>
      <div class="arc-card-body">
        <p>Gamut được thu hẹp về AP1, phù hợp với rendering vật lý chính xác. Hầu hết renderer hiện đại (Arnold, V-Ray, Redshift, Octane) đều hỗ trợ ACEScg là working space mặc định.</p>
        <ul class="arc-list">
          <li>Texture phải được convert sang ACEScg trước khi vào render</li>
          <li>Linear light — không có gamma encoding</li>
        </ul>
      </div>
    </details>

    <details class="arc-card">
      <summary>ACEScct — không gian cho color grading</summary>
      <div class="arc-card-body">
        <p>Có log-encoding, mô phỏng cách colorist quen làm việc với Log footage. Phù hợp cho grading trong DaVinci Resolve, Baselight. Có biến thể ACEScc (không có toe section) ít phổ biến hơn.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>IDT — đưa footage máy quay vào ACES</summary>
      <div class="arc-card-body">
        <p>Mỗi camera có IDT riêng được nhà sản xuất hoặc Academy chuẩn hóa: ARRI LogC, Sony S-Log3, RED IPP2, BMPCC… Áp IDT đúng là bước đầu tiên và quan trọng nhất của pipeline ACES.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>ODT &amp; RRT — đưa ra thiết bị xem</summary>
      <div class="arc-card-body">
        <p>RRT (Reference Rendering Transform) là phép biến đổi chung từ ACES sang &quot;ý đồ hiển thị&quot;. ODT (Output Device Transform) tinh chỉnh tiếp cho từng thiết bị cụ thể: rạp DCI-P3, sRGB web, Rec.709 broadcast, HDR Rec.2020.</p>
      </div>
    </details>

  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>ACES trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Điện ảnh &amp; Phim truyền hình</h3>
    <ul class="arc-list">
      <li>Workflow chuẩn từ on-set (DIT áp IDT) → editorial → color grading → DCP delivery</li>
      <li>DaVinci Resolve là phần mềm phổ biến nhất cho ACES grading — Color Management Mode thiết lập ACES</li>
      <li>Master archive lưu ACES2065-1 EXR cho khả năng tái master tương lai</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX &amp; Animation</h3>
    <ul class="arc-list">
      <li>Render trong ACEScg — Arnold, V-Ray, Redshift, Octane đều có preset ACES</li>
      <li>Compositing trong Nuke/Fusion với OCIO config ACES — texture albedo phải utility-sRGB-texture rồi convert sang ACEScg</li>
      <li>Plate quay được chuyển sang ACES (IDT) trước khi đưa vào comp</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game (high-end)</h3>
    <ul class="arc-list">
      <li>Unreal Engine và Unity đều có ACES tonemapping mặc định</li>
      <li>Texture vẫn tạo trong sRGB, engine sẽ convert sang ACEScg trước khi render</li>
      <li>HDR output: ACES giúp giữ highlight không bị clip khi mapping sang HDR10/Dolby Vision</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Quảng cáo &amp; Motion Graphics</h3>
    <ul class="arc-list">
      <li>Cinema 4D với Redshift hoặc Octane đều có ACES workflow</li>
      <li>After Effects hỗ trợ ACES qua OCIO config — thiết lập đúng để comp không bị nhầm gamma</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>Áp sai IDT — màu footage trông &quot;washed out&quot; hoặc &quot;quá đậm&quot;</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> chọn IDT không khớp với định dạng footage. Ví dụ footage Sony S-Log3 nhưng áp IDT ARRI LogC.</p>
        <p><strong>Cách fix:</strong> kiểm tra metadata footage để biết đúng định dạng log/gamut, sau đó chọn IDT tương ứng trong color management settings.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Double tonemapping — highlight cháy hoặc midtone không khớp với preview</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> áp RRT/ODT hai lần — một lần trong viewer, một lần khi export. Hoặc add LUT lên trên RRT đã active.</p>
        <p><strong>Cách fix:</strong> chỉ một display transform trong cả pipeline. Trong Nuke kiểm tra OCIODisplay không bị nhân đôi; trong Resolve kiểm tra Output Color Space không bị áp LUT bổ sung.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Texture albedo trông quá sáng trong render</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> texture sRGB được đọc như linear, hoặc không khai báo Utility - sRGB - Texture trong OCIO.</p>
        <p><strong>Cách fix:</strong> trong shader gán color space &quot;Utility - sRGB - Texture&quot; cho albedo/color map; texture dữ liệu (normal, roughness) gán &quot;Utility - Raw&quot; hoặc &quot;Utility - Linear&quot;.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>CG render không match plate quay khi comp</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> CG render trong ACEScg nhưng plate vẫn ở camera log space — chưa qua IDT.</p>
        <p><strong>Cách fix:</strong> đảm bảo cả plate và CG đều ở ACEScg trước khi comp. Áp IDT cho plate, render CG đã ở ACEScg, comp xong rồi mới áp ODT cho display.</p>
      </div>
    </details>

  </div>
</section>
`,
  },

  // ───────────────────────────────────────── 04. Action Photoshop ─────────────────────────────────────────
  {
    id: "6516ee4d-b295-4d2e-9a24-d3e9732c554b",
    tieu_de: "Action Photoshop",
    tieu_de_viet: "Action trong Photoshop",
    tom_tat:
      "Action là tính năng ghi lại chuỗi thao tác trong Photoshop để phát lại tự động trên ảnh khác — công cụ tiết kiệm thời gian then chốt cho nhiếp ảnh gia, designer và người làm hậu kỳ hàng loạt.",
    meta_title:
      "Action Photoshop là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Action Photoshop là tính năng ghi và phát lại chuỗi thao tác giúp tự động hóa chỉnh sửa hàng loạt. Tìm hiểu cách tạo, dùng Batch và lỗi thường gặp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn vừa nhận về 200 ảnh chụp sự kiện và cần áp cùng một loạt chỉnh sửa: resize, sharpen nhẹ, gắn watermark, export JPEG chất lượng 80. Làm thủ công thì mất cả ngày. Đây là lúc Action Photoshop trở thành cứu cánh — ghi lại một lần, phát lại cho mọi ảnh khác.</p>
  <p>Action là một trong những tính năng tự động hóa lâu đời và hữu dụng nhất trong Photoshop. Hiểu cách thiết kế Action tốt giúp nhiếp ảnh gia, designer và retoucher tiết kiệm hàng giờ làm việc lặp lại — đồng thời đảm bảo tính nhất quán giữa các file trong cùng dự án.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Action trong Photoshop là gì?</h2>
  <p>Action là tính năng cho phép Photoshop ghi lại tuần tự các thao tác bạn thực hiện (tạo layer, áp filter, đổi blend mode, save…) rồi phát lại chính xác chuỗi đó trên ảnh khác chỉ với một cú click. Bạn cũng có thể gán phím tắt cho Action để chạy nhanh từ bàn phím.</p>
  <p>Action mạnh hơn macro thông thường ở chỗ: có thể chứa các điều kiện rẽ nhánh (conditional), pause cho thao tác thủ công của người dùng, và kết hợp với Batch để chạy cho cả folder ảnh.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Action vs Smart Object — khác nhau ở đâu</span>
    <p>Action ghi lại các bước thao tác và áp dụng &quot;destructive&quot; lên ảnh. Smart Object lưu cấu trúc filter để có thể chỉnh lại sau (non-destructive). Khi cần tự động hóa, dùng Action; khi cần linh hoạt sửa sau, dùng Smart Object — hai công cụ bổ sung cho nhau.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Set</strong> — thư mục chứa nhiều Action liên quan</li>
    <li><strong>Step</strong> — từng thao tác được ghi trong một Action</li>
    <li><strong>Modal control</strong> — biểu tượng dialog cho phép pause để người dùng nhập tham số</li>
    <li><strong>Insert Stop</strong> — pause Action để người dùng làm thao tác thủ công rồi tiếp tục</li>
    <li><strong>Batch</strong> — tính năng chạy Action cho hàng loạt file trong folder</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"photoshop actions panel record button workflow"</span>
    </div>
    <p class="arc-image-caption">Panel Actions trong Photoshop với các thao tác đã được ghi và nút record/play</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Action thường dùng</h2>

  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>Action chỉnh ảnh hàng loạt — phổ biến nhất</summary>
      <div class="arc-card-body">
        <p>Áp cùng một workflow chỉnh sửa cho nhiều ảnh: cân bằng trắng, tăng contrast, sharpen, resize, export. Phù hợp cho nhiếp ảnh gia sự kiện, e-commerce, ảnh sản phẩm.</p>
        <ul class="arc-list">
          <li>Kết hợp với Batch (File → Automate → Batch) để chạy cả folder</li>
          <li>Lưu output sang folder riêng để không ghi đè bản gốc</li>
        </ul>
      </div>
    </details>

    <details class="arc-card">
      <summary>Action tạo hiệu ứng / preset</summary>
      <div class="arc-card-body">
        <p>Một bộ chỉnh tone, color grading, retouch ra phong cách nhất quán — như &quot;film look&quot;, &quot;moody portrait&quot;, &quot;HDR landscape&quot;. Nhiều bộ Action thương mại của photographer nổi tiếng bán theo dạng này.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Action gắn watermark / logo / mockup</summary>
      <div class="arc-card-body">
        <p>Tự động chèn logo vào vị trí cố định, scale, blend mode đúng. Hoặc đưa ảnh thiết kế vào mockup template (smart object) rồi export.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Action phục vụ workflow phức tạp — retouch chân dung</summary>
      <div class="arc-card-body">
        <p>Tạo sẵn layer set cho dodge &amp; burn, frequency separation, color check — chuyên gia retouch dùng để bắt đầu mỗi file nhanh hơn.</p>
      </div>
    </details>

  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Action trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Nhiếp ảnh</h3>
    <ul class="arc-list">
      <li>Batch xử lý folder ảnh sau buổi chụp — resize, export web, gắn watermark</li>
      <li>Áp preset color grading nhất quán cho cả series</li>
      <li>Action retouch portrait (frequency separation setup) — tiết kiệm thời gian setup mỗi file</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Thiết kế in &amp; quảng cáo</h3>
    <ul class="arc-list">
      <li>Setup template nhanh — Action tạo các artboard chuẩn (A4, A3, business card…)</li>
      <li>Áp Smart Object lên mockup nhiều góc cho khách trình bày</li>
      <li>Chuyển CMYK ↔ RGB hàng loạt cho file in &amp; web</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Web &amp; Mobile</h3>
    <ul class="arc-list">
      <li>Export multi-resolution (1x, 2x, 3x) cho iOS/Android — Action kết hợp với Generator</li>
      <li>Optimize hàng loạt PNG/JPEG cho upload web — giảm dung lượng, đảm bảo sRGB profile</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>Action chạy thất bại vì layer name không khớp</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> Action ghi lại với layer có tên cụ thể (vd &quot;Background copy&quot;), nhưng file mới có layer tên khác → Action không tìm thấy bước đó.</p>
        <p><strong>Cách fix:</strong> trong khi ghi Action, đổi cách chọn layer thành &quot;Select bottom layer&quot;, &quot;Select all layers&quot; hoặc dùng layer index thay vì tên cụ thể.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Action không record được một số thao tác (canvas, view…)</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> Photoshop không ghi mọi thao tác — zoom, scroll, một số menu view không vào Action.</p>
        <p><strong>Cách fix:</strong> dùng <strong>Insert Menu Item</strong> để chèn các thao tác menu mà Action không bắt được. Hoặc viết script JavaScript (.jsx) cho thao tác phức tạp rồi gọi từ Action.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Batch chạy nhưng kết quả khác nhau giữa các ảnh</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> Action chứa thao tác phụ thuộc kích thước ảnh (vd: resize cố định 1920px nhưng ảnh ban đầu có tỉ lệ khác). Hoặc dùng tọa độ tuyệt đối khi đặt watermark.</p>
        <p><strong>Cách fix:</strong> dùng đơn vị tương đối (%) thay vì pixel cố định khi có thể. Trong Batch, bật &quot;Override Action Save As&quot; để đồng nhất output.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Action bị mất khi cài lại Photoshop</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> Action lưu trong thư mục preferences của Photoshop, không tự backup khi update phiên bản.</p>
        <p><strong>Cách fix:</strong> export Set sang file .atn (Window → Actions → menu → Save Actions) và lưu vào cloud storage. Khi cài lại, double-click .atn để load lại.</p>
      </div>
    </details>

  </div>
</section>
`,
  },

  // ───────────────────────────────────────── 05. Adobe Sensei ─────────────────────────────────────────
  {
    id: "2e0c0ddc-9813-47c3-98fe-132d3bcf26e9",
    tieu_de: "Adobe Sensei",
    tieu_de_viet: "Nền tảng AI Adobe Sensei",
    tom_tat:
      "Adobe Sensei là nền tảng AI và machine learning của Adobe — sức mạnh đằng sau các tính năng tự động hóa thông minh trong Photoshop, Premiere, Lightroom và toàn bộ Creative Cloud. Nay đã mở rộng thành Sensei GenAI cho tạo sinh nội dung.",
    meta_title:
      "Adobe Sensei là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Adobe Sensei là nền tảng AI tích hợp khắp Creative Cloud — từ Select Subject đến Generative Fill, Auto Reframe. Tìm hiểu các tính năng và ứng dụng thực tế.",
    noi_dung: `
<section class="arc-intro">
  <p>Mở Photoshop, click một nút &quot;Select Subject&quot; — AI tự khoanh đúng người trong ảnh trong 1 giây. Mở Premiere, kéo clip 16:9 vào project 9:16 — AI tự reframe đúng nhân vật chính cho từng phân cảnh. Đây đều là Adobe Sensei đang làm việc đằng sau.</p>
  <p>Adobe Sensei là nền tảng AI và machine learning xuyên suốt hệ sinh thái Adobe — bạn không &quot;mở&quot; Sensei mà nó hiện diện trong từng phần mềm dưới dạng các tính năng thông minh. Hiểu Sensei làm gì và làm thế nào giúp tận dụng tối đa Creative Cloud trong workflow hàng ngày.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Adobe Sensei là gì?</h2>
  <p>Adobe Sensei là nền tảng trí tuệ nhân tạo (AI) và học máy (machine learning) do Adobe phát triển, được tích hợp xuyên suốt các sản phẩm Creative Cloud, Document Cloud và Experience Cloud. Nó không phải là một ứng dụng riêng — mà là &quot;não bộ&quot; chạy nền cho hàng trăm tính năng tự động hóa thông minh.</p>
  <p>Sensei được huấn luyện trên kho dữ liệu hình ảnh, video, font, layout khổng lồ của Adobe và đối tác. Từ 2023, Adobe bổ sung Sensei GenAI — nhánh tập trung vào tạo sinh nội dung (generative AI) như Firefly, Generative Fill, Generative Expand.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Sensei vs Firefly — quan hệ thế nào</span>
    <p>Firefly là họ mô hình tạo sinh AI của Adobe (image, video, vector). Sensei là &quot;khung&quot; lớn hơn bao gồm cả AI phân tích (computer vision, NLP) và AI tạo sinh (Firefly). Khi bạn dùng Generative Fill trong Photoshop, đó là Firefly chạy bên dưới Sensei.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Computer vision</strong> — nhận diện đối tượng, mặt, biên cạnh trong ảnh</li>
    <li><strong>Speech recognition</strong> — chuyển giọng nói thành văn bản (Premiere transcribe)</li>
    <li><strong>NLP</strong> — phân tích văn bản (search trong Lightroom theo nội dung)</li>
    <li><strong>Generative AI (Firefly)</strong> — tạo ảnh, video, hiệu ứng từ text prompt</li>
    <li><strong>Personalization</strong> — gợi ý template, font, color phù hợp với người dùng</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"adobe sensei AI features creative cloud icons overview"</span>
    </div>
    <p class="arc-image-caption">Các tính năng Sensei nổi bật trong Creative Cloud — Select Subject, Generative Fill, Auto Reframe, Content-Aware</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các tính năng Sensei nổi bật</h2>

  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>Select Subject &amp; Object Selection — Photoshop</summary>
      <div class="arc-card-body">
        <p>Một click chọn đúng người/vật chính trong ảnh. Sensei phân tích vị trí biên, độ tương phản, semantic content để chọn không cần dùng path/lasso thủ công. Object Selection cho phép chọn từng đối tượng cụ thể bằng cách quét chuột qua.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Content-Aware Fill — Photoshop / After Effects</summary>
      <div class="arc-card-body">
        <p>Xóa đối tượng và tự lấp vùng trống dựa trên bối cảnh xung quanh. Trong After Effects, Content-Aware Fill tracking phức tạp hơn nhiều — phải tính cho từng khung hình video.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Auto Reframe — Premiere Pro</summary>
      <div class="arc-card-body">
        <p>Chuyển video 16:9 sang dọc 9:16 (TikTok/Reels) tự động — Sensei nhận diện chủ thể chính và crop theo để giữ người trong khung. Phù hợp cho content creator muốn repurpose video nhanh.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Generative Fill / Generative Expand — Photoshop</summary>
      <div class="arc-card-body">
        <p>Powered by Firefly. Generative Fill: chọn vùng, gõ prompt, AI tạo nội dung mới phù hợp ánh sáng và perspective. Generative Expand: kéo rộng canvas, AI tự fill bối cảnh logical.</p>
        <ul class="arc-list">
          <li>Firefly được train trên Adobe Stock + ảnh public domain, ít rủi ro bản quyền hơn các mô hình khác</li>
          <li>Có Content Credentials đính kèm ảnh tạo bằng AI</li>
        </ul>
      </div>
    </details>

    <details class="arc-card">
      <summary>Speech-to-Text &amp; Auto Caption — Premiere</summary>
      <div class="arc-card-body">
        <p>Chuyển audio thành transcript chính xác cao, hỗ trợ nhiều ngôn ngữ (gồm tiếng Việt). Caption tự sinh ra dưới dạng graphics có thể style được như motion graphics layer.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Enhanced Speech &amp; Audio Tag — Premiere / Podcast</summary>
      <div class="arc-card-body">
        <p>Loại bỏ noise và echo, làm sạch voice recorded trong phòng không có acoustic treatment. Phổ biến cho podcast và video tutorial.</p>
      </div>
    </details>

  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Adobe Sensei trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Nhiếp ảnh &amp; Photo Editing</h3>
    <ul class="arc-list">
      <li>Lightroom: Mask AI (Sky, Subject, Background) — chỉnh cục bộ chính xác trong vài giây</li>
      <li>Photoshop: Generative Fill thay thế công việc của retoucher khi xóa đối tượng phức tạp</li>
      <li>Denoise AI trong Lightroom giảm noise ISO cao tốt hơn nhiều phương pháp truyền thống</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Video &amp; Motion</h3>
    <ul class="arc-list">
      <li>Premiere: Auto Reframe, Speech-to-Text, Scene Edit Detection — đẩy nhanh editing</li>
      <li>After Effects: Content-Aware Fill cho video, Roto Brush AI cho mask động</li>
      <li>Premiere Rush dùng Sensei nhiều hơn cho mobile creator</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Thiết kế đồ họa &amp; Web</h3>
    <ul class="arc-list">
      <li>Illustrator: Generative Recolor đề xuất palette từ prompt; Text to Vector tạo vector từ mô tả</li>
      <li>Express: gợi ý template phù hợp brand, font pairing thông minh</li>
      <li>InDesign: liquid layout AI gợi ý layout cho nhiều kích thước</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Audio &amp; Podcast</h3>
    <ul class="arc-list">
      <li>Audition / Podcast: Enhanced Speech làm sạch voice; Auto Ducking giảm nhạc nền khi có voice</li>
      <li>Premiere: Essential Sound AI tự phân loại clip thành Dialogue, Music, SFX, Ambience</li>
    </ul>
  </div>
</section>
`,
  },

  // ───────────────────────────────────────── 06. ADR ─────────────────────────────────────────
  {
    id: "b89ff727-cbed-4b92-804b-23bddfbab579",
    tieu_de: "ADR",
    tieu_de_viet: "Lồng tiếng sau ghi hình (ADR)",
    tom_tat:
      "ADR là quy trình thu lại thoại diễn viên trong phòng thu sau khi cảnh quay xong — để thay thế audio bị ồn, sửa diễn xuất hoặc thêm thoại mới. Một bước hậu kỳ then chốt trong sản xuất phim chuyên nghiệp.",
    meta_title:
      "ADR là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "ADR (Automated Dialogue Replacement) là kỹ thuật lồng tiếng sau ghi hình trong phòng thu. Tìm hiểu quy trình, lỗi thường gặp và ứng dụng trong sản xuất phim.",
    noi_dung: `
<section class="arc-intro">
  <p>Trong cảnh quay ngoài trời, tiếng diễn viên bị xe cộ và gió át đi. Hoặc đạo diễn nghe playback và muốn diễn viên đọc lại câu thoại với cảm xúc khác. Hoặc kịch bản được sửa sau khi quay xong và cần thêm thoại mới — tất cả những tình huống này đều được xử lý bằng ADR.</p>
  <p>ADR (Automated Dialogue Replacement) là một bước không thể thiếu trong sản xuất phim chuyên nghiệp. Hiểu ADR giúp diễn viên, đạo diễn và sound team phối hợp tốt hơn — đồng thời tránh được nhiều vấn đề âm thanh phổ biến khiến phim bị mất chất lượng ở khâu cuối.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>ADR là gì?</h2>
  <p>ADR (Automated Dialogue Replacement, còn gọi là looping hoặc post-sync) là quá trình thu lại lời thoại của diễn viên trong phòng thu sau khi cảnh quay đã hoàn thành. Diễn viên xem lại clip quay trong studio, đeo headphone nghe audio gốc làm guide, rồi diễn lại đúng nhịp môi để thay thế.</p>
  <p>Tên &quot;automated&quot; có từ thời cũ khi hệ thống cuộn lặp tự động cho diễn viên nghe từng câu. Ngày nay quá trình hoàn toàn số hóa nhưng tên gọi vẫn giữ. ADR khác với dubbing (lồng tiếng sang ngôn ngữ khác) — ADR là diễn viên gốc thu lại bằng ngôn ngữ gốc.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Khi nào cần ADR?</span>
    <p>Có 4 lý do chính: (1) audio production bị ồn không cứu được; (2) diễn xuất cần điều chỉnh emotion/timing; (3) kịch bản đổi sau khi quay, cần thoại mới; (4) phim ra rạp quốc tế cần thay từ nhạy cảm. Trong phim Hollywood, ~30-50% thoại cuối cùng là ADR — kể cả khi audio gốc tốt, đạo diễn vẫn muốn control nhiều hơn.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Cue / Line</strong> — từng câu thoại cần ADR, được liệt kê trong ADR cue sheet</li>
    <li><strong>Guide track</strong> — audio gốc làm tham chiếu cho diễn viên</li>
    <li><strong>Beep / streamer</strong> — tín hiệu đếm ngược (3 beep) để diễn viên vào đúng nhịp</li>
    <li><strong>Lip sync</strong> — đồng bộ thoại với chuyển động môi trên video</li>
    <li><strong>Room tone</strong> — tiếng &quot;im lặng&quot; của địa điểm gốc, cần ghi để pha cùng ADR cho khớp</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"ADR session recording studio actor screen microphone"</span>
    </div>
    <p class="arc-image-caption">Một session ADR điển hình — diễn viên đứng trước mic, xem cảnh quay trên màn hình và nghe guide qua headphone</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Quy trình ADR chuẩn</h2>

  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>1. Spotting — xác định cảnh cần ADR</summary>
      <div class="arc-card-body">
        <p>Sound supervisor và đạo diễn xem lại bản dựng final, đánh dấu từng câu thoại cần ADR. Lập ADR cue sheet liệt kê: số scene, timecode, thoại gốc, lý do cần thu lại, ghi chú diễn xuất.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>2. Studio setup &amp; chuẩn bị diễn viên</summary>
      <div class="arc-card-body">
        <p>Phòng thu acoustic chuẩn, mic giống/match với mic dùng trên trường nếu có thể. Chiếu cảnh quay lên màn hình trước mặt diễn viên, gửi guide qua headphone, có thể có streamers (đường line chạy ngang màn hình báo nhịp).</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>3. Recording — thu nhiều take</summary>
      <div class="arc-card-body">
        <p>Diễn viên xem cảnh, nghe guide, diễn lại 3-10 take cho mỗi cue tùy độ khó. Sound recordist note take nào tốt nhất, đạo diễn có thể chỉ đạo emotion / pacing.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>4. Editing &amp; lip sync</summary>
      <div class="arc-card-body">
        <p>Dialogue editor cắt take tốt nhất, sync chính xác với hình. Có thể time-stretch nhẹ (≤5%) để khớp môi mà không thay đổi pitch. Pha thêm room tone để không bị &quot;quá sạch&quot; so với production audio xung quanh.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>5. Mixing — blend vào dialogue track</summary>
      <div class="arc-card-body">
        <p>Re-recording mixer áp EQ, reverb, compression để ADR sound &quot;hợp&quot; với location gốc. Một câu ADR thu trong phòng thu khô khốc phải qua reverb để giống cảnh trong nhà thờ, ngoài đường, trong xe…</p>
      </div>
    </details>

  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>ADR trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim điện ảnh</h3>
    <ul class="arc-list">
      <li>Lịch ADR thường nằm ở giai đoạn picture lock (sau khi dựng xong)</li>
      <li>Phim hành động ngoài trời thường có tỉ lệ ADR rất cao do gió, máy nổ, đám đông</li>
      <li>Diễn viên A-list nhiều khi thu ADR từ nước khác qua remote ISDN/Source Connect</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim truyền hình &amp; streaming</h3>
    <ul class="arc-list">
      <li>Lịch ngắn hơn — ADR thường gói gọn 1-2 ngày cho cả tập</li>
      <li>Sound quality target thấp hơn rạp nhưng vẫn yêu cầu lip sync chuẩn</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Hoạt hình &amp; Game</h3>
    <ul class="arc-list">
      <li>Trong animation, thường thu thoại TRƯỚC khi animate (animator dựng môi theo audio) — gần như ngược lại với ADR</li>
      <li>Game cutscene có thể vừa thu trước vừa ADR sau tùy pipeline</li>
      <li>Voice acting trong game thường có nhiều variation cho cùng một câu — không phải ADR strict</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Lồng tiếng quốc tế (Dubbing)</h3>
    <ul class="arc-list">
      <li>Khác ADR ở chỗ thay ngôn ngữ — nhưng cùng kỹ thuật lip sync và studio setup</li>
      <li>Đặc biệt thử thách khi ngôn ngữ đích có cấu trúc câu/độ dài rất khác (vd Anh ↔ Việt)</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>Lip sync lệch — môi đóng nhưng vẫn có tiếng</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> diễn viên không vào đúng nhịp khi thu, hoặc dialogue editor không sync chính xác.</p>
        <p><strong>Cách fix:</strong> sử dụng thêm streamers (đường chạy ngang màn hình báo vào nhịp), thu nhiều take ngắn thay vì câu dài. Khi edit, dùng Vocalign hoặc các plugin time-align để match waveform với guide.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>ADR nghe &quot;quá sạch&quot; so với cảnh xung quanh</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> phòng thu khô khốc không match acoustic của location gốc, không có ambient/room tone bù.</p>
        <p><strong>Cách fix:</strong> ghi room tone tại location khi quay (nhớ trước khi rời), pha vào ADR. Áp reverb impulse response (IR) phù hợp với không gian: nhà thờ, hành lang, ngoài trời.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Diễn xuất ADR khác hẳn diễn xuất gốc</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> diễn viên ở studio bị mất context emotion của cảnh, không có bạn diễn để phản ứng.</p>
        <p><strong>Cách fix:</strong> đạo diễn nên có mặt và giải thích lại bối cảnh. Cho diễn viên xem cảnh trước khi thu. Một số đạo diễn yêu cầu diễn viên đứng, di chuyển hoặc làm động tác cơ thể như cảnh gốc để có cùng năng lượng.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Frequency response của ADR không khớp với production audio</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> mic studio khác mic boom dùng trên trường, hoặc khoảng cách mic khác.</p>
        <p><strong>Cách fix:</strong> dùng cùng dòng mic (hoặc tương đương) cho ADR. Re-recording mixer áp EQ matching để align frequency curve giữa ADR và production audio.</p>
      </div>
    </details>

  </div>
</section>
`,
  },

  // ───────────────────────────────────────── 07. Agency ─────────────────────────────────────────
  {
    id: "11e93ab7-27c1-4cff-84a3-9f5d35b8e08c",
    tieu_de: "Agency",
    tieu_de_viet: "Công ty Agency",
    tom_tat:
      "Agency là công ty cung cấp dịch vụ sáng tạo, quảng cáo, truyền thông hoặc thiết kế cho khách hàng. Đây là một trong những môi trường làm việc phổ biến nhất của designer, copywriter và creative director trẻ.",
    meta_title:
      "Agency là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Agency là công ty dịch vụ sáng tạo, quảng cáo và truyền thông. Tìm hiểu các loại agency — creative, digital, media, production house — và cách làm việc hiệu quả.",
    noi_dung: `
<section class="arc-intro">
  <p>Một thương hiệu sắp ra mắt sản phẩm mới và cần một chiến dịch quảng cáo lớn. Họ có thể xây team in-house, nhưng tốn thời gian và khó có đa dạng góc nhìn — vì thế đa phần chọn thuê agency. Agency là nơi tập trung designer, copywriter, strategist, producer làm việc cùng nhau cho nhiều thương hiệu khác nhau.</p>
  <p>Với người mới vào ngành sáng tạo, agency thường là điểm dừng đầu tiên — học nhanh, va chạm nhiều brand, xây portfolio đa dạng. Hiểu cách agency hoạt động giúp bạn chọn đúng nơi để gia nhập (hoặc đúng đối tác để hợp tác), và làm việc hiệu quả với họ dù ở vai trò client hay vendor.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Agency là gì?</h2>
  <p>Agency là công ty cung cấp dịch vụ chuyên nghiệp trong lĩnh vực quảng cáo, truyền thông, thiết kế hoặc sáng tạo cho các khách hàng (client). Khác với công ty sản xuất sản phẩm, agency bán năng lực sáng tạo và thực thi — họ làm việc theo project hoặc retainer dài hạn.</p>
  <p>Mô hình tổ chức điển hình của agency gồm các bộ phận: <strong>Account</strong> (làm việc với client), <strong>Strategy/Planning</strong> (xây chiến lược), <strong>Creative</strong> (designer, copywriter, art director, creative director), <strong>Production</strong> (sản xuất hiện thực), và <strong>Media</strong> (mua/đặt media nếu là agency media).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Agency vs Studio vs Freelancer — khác nhau ở đâu?</span>
    <p>Agency thường nhận project lớn nhiều giai đoạn, có team đa chức năng. Studio nhỏ hơn, focus vào tay nghề chuyên môn (vd design studio, animation studio). Freelancer là cá nhân, linh hoạt nhưng giới hạn capacity. Cùng một dự án có thể có agency làm strategy/concept, studio làm execution, freelancer support specialist.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Client</strong> — thương hiệu/công ty thuê agency, người trả tiền và duyệt sản phẩm</li>
    <li><strong>Account</strong> — vai trò làm cầu nối giữa client và team creative bên agency</li>
    <li><strong>Brief</strong> — văn bản tóm tắt yêu cầu, mục tiêu, đối tượng, budget của dự án</li>
    <li><strong>Pitch</strong> — buổi trình bày ý tưởng cho client để giành dự án (đôi khi miễn phí)</li>
    <li><strong>Retainer</strong> — hợp đồng dài hạn, agency làm việc thường xuyên cho client với phí cố định/tháng</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"advertising agency creative team brainstorm workspace"</span>
    </div>
    <p class="arc-image-caption">Workspace điển hình của một agency sáng tạo — team account, creative và production làm việc cùng nhau</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Agency phổ biến</h2>

  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>Creative / Advertising Agency — &quot;agency truyền thống&quot;</summary>
      <div class="arc-card-body">
        <p>Đảm nhiệm full-service: từ chiến lược thương hiệu, big idea, đến sản xuất TVC, print, OOH. Đây là loại agency cổ điển nhất (Ogilvy, BBDO, Dentsu, Y&amp;R…).</p>
        <p>Vai trò trong agency này: Creative Director, Art Director, Copywriter, Account Manager, Strategic Planner.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Digital Agency — chuyên về digital channels</summary>
      <div class="arc-card-body">
        <p>Tập trung vào website, mobile app, social media, performance marketing, SEO/SEM. Nhiều digital agency có cả tech team (developer, UX/UI designer) bên cạnh creative team.</p>
        <ul class="arc-list">
          <li>Performance agency: chuyên Facebook/Google Ads, đo kết quả bằng KPI cụ thể</li>
          <li>Social media agency: content cho TikTok, Instagram, community management</li>
        </ul>
      </div>
    </details>

    <details class="arc-card">
      <summary>Media Agency — mua/đặt media</summary>
      <div class="arc-card-body">
        <p>Không sản xuất nội dung mà chuyên đặt media: mua spot TV, billboard, ad space online. Sức mạnh ở quy mô đàm phán với nhà phát hành — agency lớn được giá tốt hơn nhiều so với client tự đặt.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Production House — chuyên sản xuất</summary>
      <div class="arc-card-body">
        <p>Thực thi phần production cho TVC, music video, photoshoot, animation. Có thể là vendor cho creative agency hoặc làm trực tiếp với brand. Đội ngũ gồm director, producer, DOP, gaffer, art department, post-production.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Branding / Design Agency</summary>
      <div class="arc-card-body">
        <p>Focus vào nhận diện thương hiệu: logo, visual identity, packaging, brand guideline. Project thường dài hạn, có depth hơn về research và craft. Pentagram, Wolff Olins, Bratus là ví dụ điển hình.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>PR Agency &amp; Influencer Agency</summary>
      <div class="arc-card-body">
        <p>PR agency lo communication với báo chí, crisis management, event. Influencer agency làm việc với KOL/KOC cho campaign. Hai loại này tăng nhanh trong những năm gần đây nhờ sự nổi lên của social media.</p>
      </div>
    </details>

  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Làm việc với Agency từ các vai trò</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Designer / Creative trẻ vào agency</h3>
    <ul class="arc-list">
      <li>Môi trường học nhanh — được va chạm nhiều brand, nhiều thể loại trong thời gian ngắn</li>
      <li>Áp lực cao về deadline, pitch và iteration; làm việc đa team là kỹ năng then chốt</li>
      <li>Portfolio đa dạng nhưng có thể không &quot;sâu&quot; bằng làm in-house một brand lâu dài</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Brand / Client làm việc với Agency</h3>
    <ul class="arc-list">
      <li>Brief tốt = sản phẩm tốt — đầu tư thời gian viết brief rõ ràng, có constraint và success metric</li>
      <li>Tránh micro-manage execution — thuê agency là để họ chuyên nghiệp về cách làm, không phải để làm chính xác như mình tưởng tượng</li>
      <li>Feedback theo &quot;intent&quot; (mong muốn cuối cùng) thay vì &quot;solution&quot; (cách cụ thể) — để agency tự tìm cách tối ưu</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Freelancer / Studio nhỏ hợp tác với Agency</h3>
    <ul class="arc-list">
      <li>Agency thường outsource một số phần — illustration, motion graphics, sound design — đây là nguồn việc lớn cho freelancer</li>
      <li>Giao tiếp qua producer, không trực tiếp với client (trừ khi agency cho phép)</li>
      <li>Hợp đồng và NDA chặt — agency phải bảo vệ thông tin client</li>
    </ul>
  </div>
</section>
`,
  },

  // ───────────────────────────────────────── 08. AI_Artificial Intelligence ─────────────────────────────────────────
  {
    id: "ee2c3c67-a7e6-4d4a-8935-210dc0a5b937",
    tieu_de: "AI_Artificial Intelligence",
    tieu_de_viet: "Trí tuệ nhân tạo (AI)",
    tom_tat:
      "AI trong ngành hình ảnh là tập hợp các công nghệ máy học giúp máy tính &quot;nhìn&quot;, hiểu và tạo ra nội dung thị giác. Từ tự động hóa retouch đến tạo sinh ảnh, AI đang định hình lại workflow của designer, photographer và VFX artist.",
    meta_title:
      "AI (Artificial Intelligence) là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "AI trong sáng tạo là máy học giúp máy tính nhìn, hiểu và tạo nội dung. Tìm hiểu computer vision, generative AI và ứng dụng trong design, photo, video, 3D.",
    noi_dung: `
<section class="arc-intro">
  <p>Mở Photoshop, một click chọn được đúng người trong ảnh. Gõ prompt vào MidJourney, vài giây sau có hàng chục concept art. Premiere tự transcribe audio thành caption, Lightroom giảm noise cực mạnh trên ảnh ISO cao. Tất cả đều dựa trên AI — và đây mới chỉ là vài năm đầu của làn sóng này.</p>
  <p>AI không phải là &quot;tương lai&quot; — nó đã hiện diện trong workflow hàng ngày của hầu hết ngành sáng tạo. Hiểu các nhánh AI khác nhau và biết khi nào dùng (hay không dùng) là kỹ năng then chốt mới — cho cả người mới vào nghề lẫn chuyên gia muốn tận dụng công cụ hiệu quả.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>AI trong lĩnh vực hình ảnh là gì?</h2>
  <p>AI (Artificial Intelligence — Trí tuệ nhân tạo) trong ngành hình ảnh là tập hợp các công nghệ máy học cho phép máy tính &quot;nhìn&quot;, hiểu, phân tích và tạo ra nội dung thị giác. Khác với phần mềm truyền thống chỉ làm theo lệnh, AI có khả năng học từ dữ liệu — mỗi lần dùng càng nhiều, nó càng &quot;hiểu&quot; tốt hơn các kiểu input mới.</p>
  <p>Trong sáng tạo, AI thường được phân thành hai nhánh chính: <strong>AI phân tích</strong> (nhận diện, phân loại, tách nền, phục hồi) và <strong>AI tạo sinh</strong> (sinh ra ảnh, video, vector mới từ prompt). Hầu hết phần mềm chuyên nghiệp hiện đại đều tích hợp cả hai.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">AI không thay thế designer — nó thay thế designer không dùng AI</span>
    <p>Đây là quan niệm phổ biến trong ngành 2025-2026. AI là công cụ làm nhanh các tác vụ lặp lại, generate variation, phá trắng canvas — nhưng tư duy thiết kế, hiểu brand, và craft cuối vẫn cần con người. Designer nắm rõ AI sẽ làm việc hiệu quả gấp 3-5 lần người không biết tận dụng.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Machine Learning (ML)</strong> — thuật toán học từ dữ liệu thay vì lập trình rules cụ thể</li>
    <li><strong>Deep Learning</strong> — nhánh ML dùng neural network nhiều lớp, mạnh cho hình ảnh và ngôn ngữ</li>
    <li><strong>Computer Vision</strong> — AI &quot;nhìn&quot; và hiểu nội dung ảnh (object detection, segmentation, recognition)</li>
    <li><strong>Generative AI</strong> — AI tạo sinh ra ảnh/video/text mới từ prompt (Stable Diffusion, MidJourney, Firefly, Sora)</li>
    <li><strong>LLM</strong> — Large Language Model, AI ngôn ngữ lớn (GPT, Claude, Gemini), nền tảng của copilot, chatbot</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"AI generative neural network creative tools overview diagram"</span>
    </div>
    <p class="arc-image-caption">Các nhánh chính của AI trong sáng tạo — computer vision phân tích, generative AI tạo sinh, LLM ngôn ngữ</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các nhánh AI trong sáng tạo</h2>

  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>Computer Vision — máy &quot;nhìn&quot; ảnh</summary>
      <div class="arc-card-body">
        <p>Cho phép máy nhận diện đối tượng, mặt, biên cạnh, segment vùng. Ứng dụng phổ biến: Select Subject trong Photoshop, Auto Mask trong Lightroom, Auto Roto trong After Effects, face tracking trong VFX.</p>
        <ul class="arc-list">
          <li>Phổ biến nhất: object detection, semantic segmentation, depth estimation</li>
          <li>Đa số chạy được realtime trên máy tính/điện thoại hiện đại</li>
        </ul>
      </div>
    </details>

    <details class="arc-card">
      <summary>Generative AI cho ảnh — Stable Diffusion / MidJourney / Firefly</summary>
      <div class="arc-card-body">
        <p>Tạo ảnh mới từ prompt văn bản hoặc ảnh tham chiếu. Nền tảng kỹ thuật: diffusion model — đi từ noise ngẫu nhiên dần &quot;khử nhiễu&quot; thành ảnh khớp prompt.</p>
        <p>Khác biệt giữa các mô hình:</p>
        <ul class="arc-list">
          <li>MidJourney: thiên về thẩm mỹ, ít control kỹ thuật</li>
          <li>Stable Diffusion: open source, customize được, train LoRA riêng</li>
          <li>Firefly (Adobe): tích hợp Creative Cloud, an toàn bản quyền hơn</li>
        </ul>
      </div>
    </details>

    <details class="arc-card">
      <summary>Generative AI cho video — Sora, Runway, Kling, Veo</summary>
      <div class="arc-card-body">
        <p>Tạo video từ prompt hoặc ảnh đầu vào. Năm 2024-2025 là điểm bước ngoặt — chất lượng từ &quot;novelty&quot; lên đến &quot;usable cho commercial&quot; cho cảnh ngắn.</p>
        <p>Hiện tại phù hợp cho: B-roll, cảnh nền, concept video. Chưa thay thế được narrative film vì kiểm soát storytelling còn hạn chế.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>AI cho enhancement — upscale, denoise, restoration</summary>
      <div class="arc-card-body">
        <p>Tăng độ phân giải, giảm noise, phục hồi ảnh cũ. Topaz Gigapixel, Topaz Photo AI, Lightroom Denoise AI là ví dụ. Nguyên lý: AI &quot;học&quot; cách lấp chi tiết bị mất dựa trên hàng triệu ảnh tham chiếu.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>LLM &amp; Multimodal — ChatGPT, Claude, Gemini</summary>
      <div class="arc-card-body">
        <p>AI ngôn ngữ giúp brainstorm concept, viết copy, tóm tắt brief, phân tích reference. Multimodal LLM còn nhìn được ảnh và mô tả lại — hữu ích khi feedback design hay extract style từ moodboard.</p>
      </div>
    </details>

  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>AI trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Thiết kế &amp; Branding</h3>
    <ul class="arc-list">
      <li>Mood board từ prompt — generate nhanh hàng chục style options</li>
      <li>Generative Recolor trong Illustrator để khám phá palette</li>
      <li>Logo concept exploration — AI cho 50 directions trong vài phút, designer chọn 3 để phát triển</li>
      <li>Lưu ý: output AI thường có &quot;feel&quot; chung — cần craft thủ công để tách biệt brand</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Nhiếp ảnh &amp; Retouch</h3>
    <ul class="arc-list">
      <li>Lightroom Denoise AI vượt trội cho ảnh ISO cao</li>
      <li>Generative Remove xóa người/vật trong ảnh không cần clone stamp thủ công</li>
      <li>AI sky replacement, AI portrait retouch (Retouch4me, Imagen)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Video &amp; Motion</h3>
    <ul class="arc-list">
      <li>Premiere Speech-to-Text + Auto Caption — đẩy nhanh subtitling 10x</li>
      <li>Runway Magic Tools: object remove, motion brush, frame interpolation</li>
      <li>Topaz Video AI để upscale 1080p lên 4K cho phim cũ</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3D &amp; VFX</h3>
    <ul class="arc-list">
      <li>AI denoise (NVIDIA Optix, Intel Open Image Denoise) tăng tốc render 10-20x</li>
      <li>Texture generation từ prompt — Substance 3D có Text to Material</li>
      <li>Motion capture từ video monocular — không cần suit truyền thống</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game</h3>
    <ul class="arc-list">
      <li>NPC dialogue dynamic dùng LLM — phản ứng theo hành động player</li>
      <li>Texture/asset generation cho prototype nhanh</li>
      <li>DLSS, FSR — AI upscale realtime cho gameplay mượt hơn</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi và hiểu nhầm phổ biến về AI</h2>

  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>Output AI trông &quot;rẻ tiền&quot; vì dùng default prompt</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> prompt quá chung chung, không có style reference, không có composition guide.</p>
        <p><strong>Cách fix:</strong> học prompt engineering — mô tả cụ thể style, lighting, camera angle, mood. Dùng image reference (--cref, image-to-image) để control style sâu hơn. Kết hợp AI với chỉnh tay sau cùng.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Lo lắng bản quyền khi dùng ảnh AI cho commercial</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> nhiều mô hình train trên dữ liệu không rõ nguồn, có thể tạo ra ảnh giống tác phẩm có bản quyền.</p>
        <p><strong>Cách fix:</strong> chọn mô hình rõ ràng về training data (Firefly, Getty Generative AI). Đọc kỹ ToS — đa số platform cho phép commercial use nhưng có giới hạn. Tránh prompt tên artist/thương hiệu cụ thể.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Tay với 6 ngón, mặt méo, text bị lỗi</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> diffusion model gặp khó với chi tiết có cấu trúc cứng (anatomy, text). Năm 2026 đã cải thiện nhiều nhưng vẫn xảy ra.</p>
        <p><strong>Cách fix:</strong> dùng inpainting để sửa vùng lỗi, hoặc dùng ControlNet với pose/depth guide. Với text, dùng mô hình có flux/recent (DALL-E 3, Firefly 3, Imagen 3) thay vì các mô hình cũ.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Quá phụ thuộc AI, mất tư duy sáng tạo</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> dùng AI cho mọi bước, không còn vẽ sketch, không brainstorm concept thủ công.</p>
        <p><strong>Cách fix:</strong> xem AI là công cụ thực thi, không phải tư duy. Vẫn sketch ý tưởng tay, định concept trước rồi mới dùng AI generate variation. Coi AI là &quot;intern nhanh&quot; — bạn vẫn là art director.</p>
      </div>
    </details>

  </div>
</section>
`,
  },

  // ───────────────────────────────────────── 09. Albedo/Diffuse ─────────────────────────────────────────
  {
    id: "ef644991-a3fb-4e0e-ae4a-4549539eeeb8",
    tieu_de: "Albedo/Diffuse",
    tieu_de_viet: "Albedo và Diffuse",
    tom_tat:
      "Albedo và Diffuse là hai map cơ bản nhất trong vật liệu 3D — đều mô tả màu sắc bề mặt nhưng theo logic khác nhau. Hiểu sự khác biệt là điều kiện tiên quyết để làm material đúng vật lý trong workflow PBR hiện đại.",
    meta_title:
      "Albedo/Diffuse là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Albedo và Diffuse là hai map texture mô tả màu bề mặt trong 3D. Tìm hiểu khác biệt giữa PBR Albedo và Diffuse cũ, lỗi thường gặp khi làm material.",
    noi_dung: `
<section class="arc-intro">
  <p>Lúc làm material cho 3D, bạn sẽ thấy hai slot tên gần giống nhau: Albedo (trong shader PBR như Principled BSDF, Unreal Material) và Diffuse (trong shader cũ như V-Ray Standard, Maya Phong). Nhiều người dùng lẫn lộn, bake hỏng ánh sáng vào texture, hoặc nhân đôi shadow — kết quả là render trông &quot;sai sai&quot; mà không biết tại sao.</p>
  <p>Phân biệt đúng Albedo và Diffuse là một trong những kiến thức nền tảng nhất của workflow material PBR. Hiểu rõ giúp bạn làm texture chuẩn, render đúng vật lý, và tránh được những lỗi phổ biến khi import asset từ thư viện hoặc bake từ phần mềm khác.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Albedo/Diffuse là gì?</h2>
  <p>Cả Albedo và Diffuse đều là texture map mô tả màu sắc bề mặt của vật liệu 3D — &quot;màu base&quot; trước khi ánh sáng tác động. Tuy nhiên chúng khác nhau ở triết lý: <strong>Albedo</strong> là khái niệm PBR (Physically Based Rendering) tinh khiết, chỉ chứa màu reflectance thuần; <strong>Diffuse</strong> là khái niệm cũ có thể &quot;chứa lẫn&quot; thông tin ánh sáng bake vào.</p>
  <p>Trong workflow PBR hiện đại (Unreal, Unity, Substance, V-Ray Next, Arnold, Redshift), Albedo là chuẩn. Diffuse vẫn xuất hiện trong workflow cũ hơn hoặc trong asset từ một số thư viện stock 3D.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Cách phân biệt Albedo &quot;đúng&quot; — luật flat range</span>
    <p>Albedo PBR đúng chuẩn không có shadow hoặc highlight bake vào — nó nên trông &quot;phẳng&quot;, đều ánh sáng. Giá trị màu của hầu hết vật liệu thực nằm trong khoảng 30-240 (sRGB 8-bit). Quá tối (&lt;30) = noise đen; quá sáng (&gt;240) = vi phạm conservation of energy.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Albedo</strong> — màu reflectance thuần, không có shadow/highlight bake</li>
    <li><strong>Diffuse</strong> — màu cũ có thể chứa lighting bake vào, không tách biệt giữa color và shadow</li>
    <li><strong>Base Color</strong> — tên gọi khác của Albedo trong nhiều DCC (Blender Principled, Unreal, Substance)</li>
    <li><strong>Conservation of Energy</strong> — nguyên tắc vật lý: vật liệu không phản xạ nhiều ánh sáng hơn lượng nhận vào</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"albedo vs diffuse texture comparison PBR workflow"</span>
    </div>
    <p class="arc-image-caption">So sánh Albedo PBR (phẳng, không shadow) với Diffuse cũ (có thể có shadow bake vào)</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Albedo vs Diffuse — khái niệm hay gây nhầm lẫn</h2>
  <p>Hai khái niệm này thường bị dùng lẫn lộn nhưng có sự khác biệt nền tảng quan trọng — đặc biệt khi pipeline mix giữa PBR và non-PBR.</p>

  <div class="arc-image-block arc-image-grid-2">
    <div>
      <div class="arc-image-placeholder">
        <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
        <span class="arc-img-hint-kw">"albedo PBR base color flat texture map example"</span>
      </div>
      <p class="arc-image-caption">Albedo PBR — phẳng, không có shadow bake, giá trị màu trong range vật lý</p>
    </div>
    <div>
      <div class="arc-image-placeholder">
        <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
        <span class="arc-img-hint-kw">"diffuse texture old workflow shadow baked example"</span>
      </div>
      <p class="arc-image-caption">Diffuse cũ — có thể bake AO, shadow, thậm chí lighting vào texture</p>
    </div>
  </div>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Albedo vs Diffuse — phân biệt khi nào dùng cái nào</span>
    <p>
      <strong>Albedo:</strong> dùng trong PBR workflow (Unreal, Unity, Substance, Arnold, V-Ray Next). Không chứa shadow/highlight. Luôn pair với metallic/roughness map.<br>
      <strong>Diffuse:</strong> dùng trong workflow cũ (Phong/Blinn, V-Ray Standard) hoặc specular/glossy workflow. Có thể chứa AO/shadow bake để &quot;cheating&quot; lighting.<br>
      <strong>Lưu ý:</strong> nhiều stock asset gọi nhầm — bạn nhận map tên &quot;diffuse&quot; nhưng thực chất là albedo. Kiểm tra bằng cách xem có shadow bake hay không.
    </p>
  </div>

  <ul class="arc-list">
    <li>Trong PBR, AO được tách ra map riêng — không bake vào albedo</li>
    <li>Trong workflow cũ, nhiều khi AO + shadow đã bake sẵn vào diffuse cho &quot;gần như đẹp&quot; mà không cần lighting đúng</li>
    <li>Khi convert non-PBR sang PBR, phải tách AO ra khỏi diffuse trước khi dùng làm albedo</li>
  </ul>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Albedo/Diffuse trong từng phần mềm</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Unreal Engine &amp; Unity</h3>
    <ul class="arc-list">
      <li>Slot tên <strong>Base Color</strong> (Unreal) hoặc <strong>Albedo</strong> (Unity Standard / URP) — chuẩn PBR Metallic/Roughness</li>
      <li>Texture phải gán color space sRGB (engine tự convert sang linear khi render)</li>
      <li>AO map gán slot riêng (Ambient Occlusion), không gộp vào albedo</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Substance Painter / Designer</h3>
    <ul class="arc-list">
      <li>Xuất theo template tương ứng pipeline: Unreal/Unity Metallic-Roughness, V-Ray, Arnold, Redshift</li>
      <li>Export channel Base Color khi target PBR; Diffuse khi target legacy</li>
      <li>Substance có sẵn material PBR-validated — đảm bảo giá trị nằm trong range vật lý</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">V-Ray, Arnold, Octane, Redshift</h3>
    <ul class="arc-list">
      <li>V-Ray: <strong>VRayMtl</strong> dùng Diffuse, <strong>VRayBRDFMtl</strong> dùng Base Color (PBR)</li>
      <li>Arnold: aiStandardSurface dùng Base Color (PBR chuẩn)</li>
      <li>Octane: Universal Material dùng Albedo (PBR)</li>
      <li>Redshift: RedshiftStandardMaterial — Base Color slot</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Blender</h3>
    <ul class="arc-list">
      <li>Principled BSDF dùng slot <strong>Base Color</strong> — PBR metallic/roughness chuẩn</li>
      <li>Image Texture cần đổi Color Space sang sRGB cho albedo, sang Non-Color cho normal/roughness/metallic</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>Render trông quá sáng / quá tối bất thường</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> texture albedo được đọc sai color space — sRGB texture đọc như linear, hoặc ngược lại.</p>
        <p><strong>Cách fix:</strong> trong Blender, kiểm tra Color Space của Image Texture: albedo phải sRGB, normal/roughness/metallic phải Non-Color. Trong Unreal, kiểm tra sRGB checkbox trong Texture Properties bật cho albedo, tắt cho data textures.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Shadow &quot;đôi&quot; trong render — vùng tối quá đậm</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> Albedo đã có AO bake vào, lighting engine lại tính AO lần nữa → shadow nhân đôi.</p>
        <p><strong>Cách fix:</strong> Albedo PBR phải sạch — không có AO bake. Nếu nhận asset từ thư viện cũ có AO trong albedo, dùng Substance hoặc Photoshop để &quot;de-bake&quot; (chia ngược cho AO map riêng).</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Asset từ thư viện trông &quot;rẻ tiền&quot; trong render PBR</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> asset cũ chỉ có Diffuse + Specular, không có Roughness/Metallic chuẩn PBR. Pipeline PBR không tận dụng được.</p>
        <p><strong>Cách fix:</strong> remake material trong Substance Painter, sinh đầy đủ albedo/normal/roughness/metallic. Hoặc dùng plugin convert (vd Substance Source) để chuyển legacy maps sang PBR.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Vật liệu kim loại trông &quot;giả&quot;, không phản chiếu môi trường đúng</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> kim loại trong PBR cần albedo có giá trị cao (color của kim loại) và metallic = 1. Nhiều người làm albedo xám tối + thử áp specular cũ → sai logic PBR.</p>
        <p><strong>Cách fix:</strong> trong PBR, vật liệu kim loại nguyên chất có metallic = 1, albedo là màu phản chiếu thực (gold ~ 1.0, 0.766, 0.336). Vật liệu phi kim metallic = 0, albedo là màu thấy thường.</p>
      </div>
    </details>

  </div>
</section>
`,
  },

  // ───────────────────────────────────────── 10. Alembic ─────────────────────────────────────────
  {
    id: "9e4867e1-ae16-4c7e-b044-04740d4cc78b",
    tieu_de: "Alembic",
    tieu_de_viet: "Định dạng Alembic (.abc)",
    tom_tat:
      "Alembic là định dạng file mã nguồn mở để trao đổi dữ liệu hình học và animation giữa các phần mềm 3D. Đây là chuẩn bridge phổ biến nhất trong pipeline VFX, animation và motion graphics chuyên nghiệp hiện nay.",
    meta_title:
      "Alembic là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Alembic là định dạng file mã nguồn mở để trao đổi geometry và animation giữa phần mềm 3D. Tìm hiểu đặc điểm, ứng dụng trong VFX, animation và lỗi thường gặp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn animate nhân vật trong Maya, render trong Houdini, comp trong Nuke — mỗi phần mềm có format riêng và không hỗ trợ rig native từ Maya. Hoặc bạn export character rigged cho VFX team dùng Cinema 4D mà không muốn họ thấy hệ thống rig phức tạp. Đây là lúc Alembic phát huy giá trị.</p>
  <p>Alembic là cầu nối &quot;dùng chung&quot; giữa hầu hết phần mềm 3D chuyên nghiệp. Hiểu Alembic giúp bạn xây pipeline mượt mà giữa các bộ phận, tránh được nhiều bug khó debug khi pass file qua lại, và biết khi nào dùng Alembic thay vì FBX, USD hay native format.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Alembic là gì?</h2>
  <p>Alembic (file extension <strong>.abc</strong>) là định dạng file mã nguồn mở được phát triển bởi Sony Pictures Imageworks và Industrial Light &amp; Magic năm 2010, mục đích là chuẩn hóa cách lưu trữ hình học và animation cho pipeline VFX. Khác với FBX (chứa cả rig, animation curve, material), Alembic chỉ lưu kết quả cuối cùng — vị trí điểm (vertex) và transform — theo từng frame.</p>
  <p>Nói cách khác: Alembic là &quot;animation đã bake&quot;. Một character đang chạy được lưu thành chuỗi vị trí điểm theo thời gian, không có thông tin về rig hay skeleton. Điều này làm Alembic gọn, nhanh, ổn định khi pass giữa các phần mềm — nhưng không edit lại rig được.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Alembic không lưu rig, material, light — chỉ lưu geometry cache</span>
    <p>Đây là điểm dễ nhầm. Alembic được thiết kế để &quot;đông cứng&quot; animation cho downstream pipeline. Rig, material, light phải gắn lại ở phần mềm đích. Nếu cần lưu cả rig &amp; material, dùng FBX hoặc USD thay thế.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Geometry cache</strong> — vị trí từng vertex tại từng thời điểm, không có rig</li>
    <li><strong>Transform hierarchy</strong> — parent-child relationship giữa các object</li>
    <li><strong>Sub-frame data</strong> — sample nhiều lần/frame cho motion blur chính xác</li>
    <li><strong>UV / normals / color</strong> — properties phụ có thể đính kèm</li>
    <li><strong>Compression — Ogawa</strong> — engine nén hiện đại, nhanh và gọn hơn HDF5 cũ</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"alembic file pipeline maya houdini nuke workflow diagram"</span>
    </div>
    <p class="arc-image-caption">Vai trò của Alembic trong pipeline — bridge animation từ Maya/Blender sang Houdini, Nuke, C4D</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Đặc điểm cốt lõi của Alembic</h2>

  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>Bake animation — không phụ thuộc rig</summary>
      <div class="arc-card-body">
        <p>Alembic lưu vị trí điểm sau khi rig đã evaluate xong. Phần mềm đích không cần hiểu rig — chỉ playback vị trí vertex theo thời gian. Đây là lý do Alembic ổn định khi pass character giữa các software.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Hỗ trợ topology thay đổi — đặc biệt mạnh</summary>
      <div class="arc-card-body">
        <p>Khác FBX, Alembic hỗ trợ topology thay đổi giữa các frame (vd nước, vải xé rách, simulation phá vỡ). Đây là tính năng quan trọng cho FX và simulation pipeline.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Sub-frame sampling — motion blur chính xác</summary>
      <div class="arc-card-body">
        <p>Alembic có thể sample nhiều lần trong một frame (vd 2x hoặc 3x) — quan trọng cho motion blur khi render. Phần mềm 3D đích có thể interpolate hoặc dùng raw sub-frame để tính blur chuẩn xác.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Format mã nguồn mở, đa nền tảng</summary>
      <div class="arc-card-body">
        <p>Alembic là open source, được hỗ trợ trên hầu hết phần mềm 3D chuyên nghiệp: Maya, Houdini, 3ds Max, Blender, Cinema 4D, Modo, Katana, Nuke, V-Ray, Arnold, Renderman. SDK miễn phí cho developer custom tool.</p>
      </div>
    </details>

  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Alembic trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX &amp; Phim điện ảnh</h3>
    <ul class="arc-list">
      <li>Pipeline chuẩn: animation Maya → Alembic → simulation/FX Houdini → render Arnold/Renderman → comp Nuke</li>
      <li>Mọi creature/character đều pass qua Alembic giữa các bộ phận</li>
      <li>FX simulation (lửa, vải, water) output Alembic cho lighting team</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation Studio</h3>
    <ul class="arc-list">
      <li>Animator dùng rig phức tạp trong Maya, cache ra Alembic cho lighting/render artist</li>
      <li>Pixar, Disney, Sony Imageworks đều có pipeline dựa trên Alembic và USD</li>
      <li>Cho phép animator update animation mà không phá vỡ scene lighting downstream</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Graphics &amp; Quảng cáo</h3>
    <ul class="arc-list">
      <li>Cinema 4D nhận Alembic cho character animate từ Maya/Blender</li>
      <li>Houdini FX → Alembic → C4D render với Redshift là pipeline phổ biến cho commercial</li>
      <li>Tránh được conflict rig khi đa phần mềm trong project</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game (preview/cinematic, không phải runtime)</h3>
    <ul class="arc-list">
      <li>Game runtime không dùng Alembic — quá nặng, dùng skeletal animation tối ưu hơn</li>
      <li>Cinematic / pre-rendered intro: Alembic dùng để chuyển character từ Maya/Blender sang renderer</li>
      <li>Unreal Sequencer hỗ trợ Alembic cho cinematic cao cấp</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>File Alembic quá nặng (hàng GB) cho cảnh ngắn</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> export topology cao mà không tối ưu, hoặc bao gồm history/intermediate object không cần.</p>
        <p><strong>Cách fix:</strong> trước khi export, xóa history, freeze transform. Trong Maya, dùng option <strong>Strip Namespaces</strong> và chỉ chọn mesh cần thiết. Cân nhắc giảm topology bằng GPU cache hoặc proxy nếu chỉ dùng cho viewport.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>UV bị mất khi import vào phần mềm khác</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> không tick &quot;Write UV Sets&quot; khi export, hoặc UV set có ký tự không hợp lệ.</p>
        <p><strong>Cách fix:</strong> bật explicit UV write trong export options. Đảm bảo UV set name dùng ASCII đơn giản, không có dấu cách hoặc unicode.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Motion blur sai khi render từ Alembic</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> không export sub-frame samples khi animation có chuyển động nhanh, hoặc shutter của renderer không khớp.</p>
        <p><strong>Cách fix:</strong> khi export, bật <strong>Sub Frame Samples</strong> = 2-3. Trong renderer, đảm bảo shutter setting (open/close) khớp với phần mềm gốc — vd Maya shutter 0.5 → V-Ray shutter 0.5.</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>Interpolation lỗi — character nhảy frame</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> topology thay đổi giữa các frame (do mesh tách/ghép trong simulation) nhưng renderer không hỗ trợ.</p>
        <p><strong>Cách fix:</strong> dùng renderer hỗ trợ varying topology (Arnold, Renderman). Hoặc nếu không cần topology change, lock topology trước khi export và remove modifier tạo thay đổi.</p>
      </div>
    </details>

  </div>
</section>
`,
  },
];

console.log(`\n── Bắt đầu chạy ${items.length} bài keyword đợt 1.1 ──\n`);

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

console.log(`\n── Kết quả lần chạy này (Đợt 1) ──`);
for (const r of results) {
  if (r.error) {
    console.log(`✗ ${r.tieu_de} — ${r.error}`);
  } else {
    console.log(`✓ ${r.tieu_de} — ${r.do_dai} ký tự`);
  }
}
console.log(`\nCòn lại đợt 1: ${conLai} bài. Chạy lại để tiếp tục.`);
