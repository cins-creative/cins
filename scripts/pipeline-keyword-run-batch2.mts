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
  // 01. Alpha channel
  {
    id: "9b2ecfb3-be8d-4ce5-a4cf-8bdbd219986f",
    tieu_de: "Alpha Channel",
    tieu_de_viet: "Kênh Alpha",
    tom_tat:
      "Alpha channel là kênh dữ liệu lưu trữ độ trong suốt của từng pixel — bổ sung cho ba kênh RGB. Đây là nền tảng của mọi thao tác trộn lớp, mask và composite trong design, VFX và web.",
    meta_title: "Alpha Channel là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Alpha channel lưu độ trong suốt của pixel — nền tảng của mask, composite và transparency. Tìm hiểu premultiplied vs straight alpha và ứng dụng thực tế.",
    noi_dung: `
<section class="arc-intro">
  <p>Xuất một logo PNG đặt lên ảnh khác — nền trong suốt vẫn giữ đúng. Render character CG để comp vào plate quay — vùng quanh nhân vật phải tự &quot;biến mất&quot;. Hai tình huống đó đều dựa trên một thứ: alpha channel — kênh dữ liệu vô hình quyết định pixel nào hiện, pixel nào ẩn.</p>
  <p>Alpha channel là kiến thức nền tảng của mọi designer, photographer, VFX artist và web developer. Hiểu đúng giúp tránh được các lỗi mất nền, viền đen quanh đối tượng hay alpha bị nhân đôi khi comp — những vấn đề rất phổ biến nhưng ít người giải thích được tận gốc.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Alpha Channel là gì?</h2>
  <p>Alpha channel là kênh dữ liệu thứ tư trong định dạng ảnh, lưu trữ độ trong suốt (opacity) của từng pixel — bên cạnh ba kênh màu Red, Green, Blue. Giá trị alpha từ 0 (hoàn toàn trong suốt) đến 1 hoặc 255 (hoàn toàn đặc), trung gian là bán trong suốt.</p>
  <p>Nhờ alpha channel, ảnh có thể có nền trong suốt, viền mờ tự nhiên (anti-aliasing), hoặc một phần độ mờ chuyển dần — điều không thể với chỉ RGB. Alpha là &quot;mask&quot; tích hợp ngay trong file, không cần file mask riêng.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Premultiplied vs Straight (Unpremultiplied) Alpha</span>
    <p>Đây là hai cách lưu kết hợp giữa RGB và alpha. <strong>Straight alpha</strong>: RGB là màu nguyên, alpha là kênh độc lập. <strong>Premultiplied alpha</strong>: RGB đã được nhân sẵn với alpha. Cùng một ảnh nhưng pipeline đọc nhầm sẽ thấy viền đen hoặc viền trắng quanh đối tượng — nguyên nhân lỗi alpha phổ biến nhất trong VFX.</p>
  </div>

  <ul class="arc-list">
    <li><strong>RGBA</strong> — định dạng có thêm kênh alpha (Red, Green, Blue, Alpha)</li>
    <li><strong>Anti-aliasing</strong> — alpha trung gian (0-255) tạo viền mượt thay vì răng cưa</li>
    <li><strong>Mask</strong> — alpha có thể được dùng như mask để kiểm soát blend</li>
    <li><strong>Bit depth</strong> — 8-bit alpha (0-255), 16-bit, hoặc 32-bit float cho HDR/VFX</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"alpha channel RGBA transparency diagram example"</span>
    </div>
    <p class="arc-image-caption">Minh họa kênh alpha — vùng trắng = opaque, vùng đen = transparent, xám = bán trong suốt</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các định dạng hỗ trợ Alpha</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>PNG — chuẩn web phổ biến nhất</summary>
      <div class="arc-card-body">
        <p>PNG-24 với alpha 8-bit (256 mức trong suốt) là chuẩn cho web và mobile. Hỗ trợ rộng rãi, lossless. Hạn chế: dung lượng lớn cho ảnh ảnh thật phức tạp.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>TIFF / PSD — chuẩn print và làm việc</summary>
      <div class="arc-card-body">
        <p>Hỗ trợ alpha với bit depth cao (16, 32-bit float). PSD giữ layer riêng biệt, mỗi layer có alpha riêng — nền tảng workflow Photoshop.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>EXR — chuẩn VFX và HDR</summary>
      <div class="arc-card-body">
        <p>OpenEXR hỗ trợ alpha 16/32-bit float, multi-channel (nhiều mask trong một file). Mặc định trong pipeline Nuke, Houdini, render Arnold/V-Ray.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>WebP / AVIF — định dạng web hiện đại</summary>
      <div class="arc-card-body">
        <p>Cả hai đều hỗ trợ alpha và có nén tốt hơn PNG nhiều. AVIF thường nhỏ hơn 30-50% so với PNG cùng chất lượng. Hỗ trợ tốt trên trình duyệt 2024+.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>JPEG — KHÔNG có alpha</summary>
      <div class="arc-card-body">
        <p>JPEG chỉ lưu RGB — không hỗ trợ trong suốt. Đây là lý do logo và icon không bao giờ nên xuất JPEG. Dùng PNG/WebP/SVG thay thế.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Alpha Channel trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Thiết kế đồ họa &amp; Web</h3>
    <ul class="arc-list">
      <li>Logo, icon luôn xuất PNG hoặc SVG để giữ nền trong suốt</li>
      <li>Mockup, UI element dùng alpha để lồng vào background đa dạng</li>
      <li>Web: PNG nén qua TinyPNG, hoặc dùng WebP/AVIF cho dung lượng tối ưu</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX &amp; Compositing</h3>
    <ul class="arc-list">
      <li>Render CG xuất EXR 32-bit có alpha — comp trong Nuke/Fusion/After Effects</li>
      <li>Phân biệt premultiplied vs straight là kỹ năng nền tảng — sai sẽ tạo viền đen quanh đối tượng</li>
      <li>Multi-channel EXR chứa nhiều mask (matte ID, depth, position) trong một file</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game</h3>
    <ul class="arc-list">
      <li>Texture UI dùng RGBA cho viền mềm, hiệu ứng dần mờ</li>
      <li>Particle, sprite, decal phụ thuộc alpha cho hiệu ứng</li>
      <li>Texture optimization: dùng channel packing để giảm số texture (R/G/B/A chứa 4 mask khác nhau)</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Viền đen quanh đối tượng sau khi comp</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> ảnh premultiplied được xử lý như straight (hoặc ngược lại).</p>
        <p><strong>Cách fix:</strong> trong Nuke/After Effects, đặt Premultiplied checkbox đúng theo nguồn. Render từ Arnold/V-Ray mặc định premultiplied; PNG export từ Photoshop thường là straight.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Logo PNG bị mất nền khi upload Facebook/Instagram</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> social media tự thêm background trắng vào PNG có alpha, hoặc convert sang JPEG.</p>
        <p><strong>Cách fix:</strong> upload ảnh với background full màu chứ không trong suốt; hoặc dùng template có sẵn background phù hợp.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Alpha bị mất khi save từ Photoshop</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> Save As JPEG (không có alpha) hoặc PNG-8 (alpha chỉ 1-bit, không có anti-alias).</p>
        <p><strong>Cách fix:</strong> dùng PNG-24 (File → Export → Export As → PNG, bật Transparency) hoặc Save for Web với option PNG-24.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 02. Ambient Occlusion
  {
    id: "a2573563-6b2b-4037-87af-706d58dc8291",
    tieu_de: "Ambient Occlusion",
    tieu_de_viet: "Khuất sáng môi trường (AO)",
    tom_tat:
      "Ambient Occlusion là kỹ thuật tạo bóng đổ mềm ở những vùng bề mặt gần nhau — giúp 3D có chiều sâu và bám sát thực tế. Là một trong những pass quan trọng nhất trong rendering hiện đại.",
    meta_title: "Ambient Occlusion là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Ambient Occlusion (AO) là kỹ thuật tạo bóng đổ mềm tăng chiều sâu cho cảnh 3D. Tìm hiểu các loại AO, ứng dụng trong render, game và lỗi thường gặp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn render một cảnh nội thất nhưng kết quả trông &quot;phẳng&quot;, các vật thể như &quot;dán&quot; lên nhau không gắn vào không gian. Bật Ambient Occlusion lên — góc tường, kẽ ghế, đáy bàn xuất hiện bóng đổ mềm và lập tức cảnh có chiều sâu, các vật &quot;ăn nhập&quot; với nhau hơn. Đó là phép màu của AO.</p>
  <p>Ambient Occlusion là một trong những kỹ thuật cơ bản nhất nhưng cũng dễ bị lạm dụng nhất trong 3D rendering. Hiểu đúng AO làm gì và khi nào nên dùng giúp bạn có render chuyên nghiệp, tự nhiên — thay vì kiểu &quot;over-AO&quot; làm cảnh trông như tranh minh họa game cũ.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Ambient Occlusion là gì?</h2>
  <p>Ambient Occlusion (AO) là kỹ thuật tô đậm các vùng bề mặt nằm gần nhau — nơi ánh sáng môi trường (ambient light) khó với tới. Trong thực tế, hai vật càng gần nhau, ánh sáng phản xạ và tán xạ giữa chúng càng ít → vùng đó tối hơn. AO mô phỏng đúng hiện tượng này.</p>
  <p>Ví dụ: chân ghế tiếp xúc sàn, kẽ hai viên gạch, đáy quyển sách — đều là vùng AO mạnh. Khi bật AO, render có thêm chiều sâu và &quot;contact shadow&quot; tự nhiên mà không cần tính toán đầy đủ global illumination.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">AO không phải shadow từ đèn</span>
    <p>Shadow truyền thống đến từ một nguồn sáng cụ thể, có hướng. AO là &quot;bóng môi trường&quot; — xảy ra ngay cả khi không có đèn nào. Trong workflow PBR, AO bổ sung cho GI (global illumination) chứ không thay thế.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Ray-traced AO</strong> — bắn ray từ mỗi pixel, đếm bao nhiêu ray bị occluded</li>
    <li><strong>Screen Space AO (SSAO)</strong> — tính AO chỉ từ depth buffer, nhanh nhưng kém chính xác</li>
    <li><strong>AO map</strong> — bake AO sẵn vào texture cho game/realtime</li>
    <li><strong>Cavity</strong> — AO chi tiết nhỏ (vết nứt, rãnh), khác AO chung của object</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"ambient occlusion 3D render comparison before after"</span>
    </div>
    <p class="arc-image-caption">So sánh render bật/tắt AO — AO tăng chiều sâu và contact shadow ở các vùng gần nhau</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Ambient Occlusion</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Ray-traced AO — chính xác nhất</summary>
      <div class="arc-card-body">
        <p>Renderer bắn nhiều ray từ mỗi pixel theo hemisphere, đếm tỷ lệ ray bị chặn để tính độ occlusion. Chính xác nhưng tốn tài nguyên. Dùng trong V-Ray, Arnold, Redshift, Cycles cho offline render.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>SSAO / SSGI — realtime cho game</summary>
      <div class="arc-card-body">
        <p>Screen Space Ambient Occlusion chỉ dùng depth buffer của khung hình hiện tại. Nhanh, hợp game engine, nhưng có hạn chế (artifact ở edge màn hình, không thấy occlusion từ vật ngoài view).</p>
        <p>Biến thể HBAO, GTAO, SSGI cải tiến chất lượng và performance.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>AO Map — bake trước</summary>
      <div class="arc-card-body">
        <p>Tính AO trong Substance Painter/3ds Max rồi bake thành texture. Dùng cho asset game realtime — engine chỉ multiply AO map vào lighting result, không cần tính lại mỗi frame.</p>
        <p>Lưu ý: AO map dạng PBR là channel riêng, KHÔNG bake vào albedo.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cavity Map — chi tiết nhỏ</summary>
      <div class="arc-card-body">
        <p>Khác AO ở radius — Cavity nhắm các vết nứt nhỏ, rãnh, chi tiết surface. AO chung cho object scale lớn, Cavity cho chi tiết micro. Hai cái thường dùng kết hợp trong PBR.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Ambient Occlusion trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Render kiến trúc &amp; Sản phẩm</h3>
    <ul class="arc-list">
      <li>Ray-traced AO trong V-Ray/Corona/Octane cho cảnh interior</li>
      <li>Đặc biệt quan trọng ở góc tường, kẽ đồ đạc, vùng tiếp xúc</li>
      <li>Cần cân bằng — AO quá mạnh làm cảnh trông &quot;3D demo&quot;, AO quá yếu lại phẳng</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game</h3>
    <ul class="arc-list">
      <li>SSAO realtime trong Unreal (UE5 dùng SSGI tích hợp Lumen)</li>
      <li>AO map bake vào asset cho details không phụ thuộc lighting động</li>
      <li>Mobile game thường dùng AO map thay realtime AO để tiết kiệm GPU</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX &amp; Animation</h3>
    <ul class="arc-list">
      <li>Render AO pass riêng (cùng beauty, diffuse, specular) cho comp Nuke có thêm control</li>
      <li>Compositor có thể tăng/giảm contribution AO ở post — không phải re-render</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Substance Painter / Designer</h3>
    <ul class="arc-list">
      <li>AO map dùng làm mask cho dirt, wear, edge highlight trong texturing</li>
      <li>Bake AO + Curvature ngay khi import model — base cho mọi material setup</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>AO quá đậm — cảnh trông &quot;dirty&quot;</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> AO intensity = 1.0 với radius rộng. Trong vật lý thực, AO contribution nhỏ — chỉ là phần của ambient bị chặn.</p>
        <p><strong>Cách fix:</strong> giảm AO intensity (0.5-0.7), giảm radius cho phù hợp scale object. Trong PBR pipeline, AO chỉ multiply vào indirect lighting, không vào direct lighting.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Halo / dark band quanh đối tượng (SSAO)</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> SSAO sampling pattern, hoặc bias quá thấp tạo self-occlusion.</p>
        <p><strong>Cách fix:</strong> tăng bias, hoặc chuyển sang HBAO/GTAO. Trong Unreal, dùng Lumen + AOcclusion thay cho SSAO cũ.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>AO map bake bị lỗi seam ở UV edge</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> padding/dilation không đủ ở UV edge khi bake.</p>
        <p><strong>Cách fix:</strong> tăng padding (16-32 pixel), bake với high samples (256-1024). Trong Substance Painter, bật &quot;Average Normal Per Fragment&quot;.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 03. Ambisonics
  {
    id: "2c7f3677-fa9e-4013-8bd4-de088c3f23a1",
    tieu_de: "Ambisonics",
    tieu_de_viet: "Định dạng âm thanh Ambisonics",
    tom_tat:
      "Ambisonics là kỹ thuật ghi và phát âm thanh hình cầu 360° độc lập với cấu hình loa — nền tảng của VR audio, YouTube 360 và sản xuất immersive hiện đại.",
    meta_title: "Ambisonics là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Ambisonics là định dạng ghi âm thanh 360° linh hoạt cho VR và immersive media. Tìm hiểu first-order, higher-order ambisonics và ứng dụng thực tế.",
    noi_dung: `
<section class="arc-intro">
  <p>Một video VR 360° trên YouTube — bạn xoay đầu sang trái, âm thanh con chim trên cây cũng &quot;xoay&quot; theo, vẫn ở đúng vị trí trong không gian. Đằng sau trải nghiệm đó là Ambisonics — định dạng âm thanh hình cầu cho phép decode theo bất kỳ hướng nhìn nào của người dùng.</p>
  <p>Ambisonics khác hẳn stereo hay surround truyền thống — nó không gắn với số loa cụ thể mà mã hóa toàn bộ &quot;không gian âm thanh&quot;. Đây là công nghệ nền cho VR, immersive video, và sản xuất nhạc 360°. Hiểu Ambisonics giúp sound designer cho VR và 360° hiệu quả hơn nhiều.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Ambisonics là gì?</h2>
  <p>Ambisonics là kỹ thuật ghi và tái tạo âm thanh không gian hình cầu (full sphere) — chứa thông tin về hướng nguồn âm theo cả ba trục X, Y, Z. Khác với stereo (chỉ trái-phải) hay surround 5.1/7.1 (loa trên cùng mặt phẳng), Ambisonics mã hóa toàn bộ trường âm thanh quanh người nghe.</p>
  <p>Điểm mạnh nhất: định dạng độc lập với cấu hình playback. Một file Ambisonics có thể decode ra binaural (tai nghe), 5.1, 7.1.4 Atmos, hoặc bất kỳ cấu hình nào — quyết định ở khâu playback chứ không phải khi ghi.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Tại sao Ambisonics &quot;mạnh&quot; cho VR</span>
    <p>Trong VR, người dùng xoay đầu liên tục. Stereo cố định không thể &quot;xoay&quot; theo. Ambisonics chứa thông tin toàn cầu, decoder chỉ cần biết hướng nhìn hiện tại để render lại binaural cho tai nghe — đảm bảo âm thanh luôn đúng vị trí trong không gian dù người dùng quay 360°.</p>
  </div>

  <ul class="arc-list">
    <li><strong>B-format</strong> — định dạng Ambisonics chuẩn (W, X, Y, Z cho first-order)</li>
    <li><strong>A-format</strong> — định dạng raw từ microphone Ambisonics (4 capsule), cần convert sang B-format</li>
    <li><strong>First-order (FOA)</strong> — 4 kênh, định vị âm thô</li>
    <li><strong>Higher-order (HOA)</strong> — 9, 16, 25+ kênh, định vị âm chính xác hơn</li>
    <li><strong>ACN / SN3D</strong> — chuẩn channel ordering và normalization phổ biến hiện nay</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"ambisonics microphone soundfield VR audio 360 diagram"</span>
    </div>
    <p class="arc-image-caption">Mic Ambisonics 4 capsule (như Sennheiser AMBEO, Zoom H3-VR) và sơ đồ trường âm thanh hình cầu</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các order của Ambisonics</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>First-Order Ambisonics (FOA) — 4 kênh, phổ biến nhất</summary>
      <div class="arc-card-body">
        <p>4 kênh W (omni), X, Y, Z biểu diễn trường âm thanh ở mức cơ bản nhất. Đủ cho YouTube 360, VR consumer. Mic 4 capsule (Sennheiser AMBEO, Zoom H3-VR) ghi trực tiếp FOA.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Second-Order — 9 kênh</summary>
      <div class="arc-card-body">
        <p>Định vị âm chính xác hơn FOA, đặc biệt ở khía cạnh độ cao. Ít mic ghi trực tiếp; thường được render từ tool như Facebook Spatial Workstation, Reaper.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Third-Order (TOA) &amp; Higher-Order — 16-25+ kênh</summary>
      <div class="arc-card-body">
        <p>Chuẩn cao cấp cho VR và immersive sound art. Mic Eigenmike (32 capsule) ghi đến order 4. Dùng trong nghiên cứu, dự án nghệ thuật âm thanh, planetarium.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mixed-Order — thực tế production</summary>
      <div class="arc-card-body">
        <p>Một số pipeline mix FOA và stereo dialogue → tạo &quot;Ambisonics + Head-Locked&quot;. YouTube hỗ trợ chuẩn này: FOA cho ambient, stereo cho narration luôn ở giữa.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Ambisonics trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">VR &amp; AR</h3>
    <ul class="arc-list">
      <li>Standard sound cho Oculus, SteamVR — game engine có Ambisonics decoder tích hợp</li>
      <li>Unity Audio Spatializer, Unreal Steam Audio đều render FOA → binaural realtime</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Video 360°</h3>
    <ul class="arc-list">
      <li>YouTube 360°, Facebook 360° hỗ trợ Ambisonics đính kèm video</li>
      <li>Workflow: thu Ambisonics on-set với mic 360 → mix trong Reaper/Pro Tools với Facebook 360 Spatial Workstation → encode FOA + stereo head-lock</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Nhạc immersive &amp; Sound Art</h3>
    <ul class="arc-list">
      <li>Album immersive đôi khi master cả Ambisonics bên cạnh Atmos</li>
      <li>Planetarium, installation art dùng HOA cho trải nghiệm âm thanh hình cầu thực sự</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game (alternative cho Atmos)</h3>
    <ul class="arc-list">
      <li>Một số game (No Man&apos;s Sky, Half-Life Alyx) dùng Ambisonics cho environment</li>
      <li>Tương thích với mọi cấu hình audio người dùng — không yêu cầu Atmos hardware</li>
    </ul>
  </div>
</section>
`,
  },

  // 04. Animatic
  {
    id: "bce22095-b256-451e-b1df-cba9461734e0",
    tieu_de: "Animatic",
    tieu_de_viet: "Hoạt hình thô (Animatic)",
    tom_tat:
      "Animatic là phiên bản chuyển động sơ bộ của storyboard — gắn timing, âm thanh và transition để xem trước nhịp phim trước khi production thực sự bắt đầu. Bước tiền sản xuất quan trọng nhất sau script.",
    meta_title: "Animatic là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Animatic là storyboard chuyển động giúp xem trước timing, nhịp phim. Tìm hiểu các loại animatic, quy trình và ứng dụng trong phim, hoạt hình, quảng cáo.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn có script và storyboard tốt, nhưng nhìn từng frame tĩnh không thể biết nhịp phim có hợp lý không, cảnh chuyển có mượt không, đoạn nào dài thừa, đoạn nào thiếu. Đạo diễn cần thấy phim &quot;chạy&quot; trước khi quay/animate — và animatic chính là công cụ đó.</p>
  <p>Animatic là bước &quot;rehearsal&quot; trước production thực sự. Một animatic tốt tiết kiệm hàng trăm giờ công và rất nhiều tiền, đặc biệt cho hoạt hình và VFX nơi mỗi second rendered tốn kém. Hiểu animatic giúp director, storyboard artist và animator giao tiếp hiệu quả về timing và nhịp diễn.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Animatic là gì?</h2>
  <p>Animatic là một phiên bản chuyển động (animated) sơ bộ của storyboard — gồm các panel storyboard được nối liền theo timeline với thời lượng thực, kèm scratch audio (dialogue tạm, nhạc tạm, sound effect). Mục đích là xem trước nhịp phim, timing thoại và chuyển cảnh trước khi đầu tư vào production tốn kém.</p>
  <p>Khác với storyboard (chỉ frame tĩnh) và previs (3D chuyển động chi tiết), animatic ở giữa — vừa đủ để cảm được nhịp phim, vừa nhanh đủ để iterate nhiều version trong giai đoạn pre-production.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Animatic vs Previs — khác nhau ở đâu?</span>
    <p><strong>Animatic</strong>: từ storyboard 2D + audio + transition đơn giản. Nhanh, rẻ. <strong>Previs</strong>: 3D blocking trong Maya/Unreal, có camera move, character chuyển động cơ bản. Chậm hơn nhưng giúp ích đặc biệt cho VFX/action sequence. Phim lớn thường có cả hai — animatic trước, previs sau.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Storyboard panel</strong> — các bản vẽ tĩnh là nguồn cho animatic</li>
    <li><strong>Scratch audio</strong> — voice ghi tạm, nhạc tạm, SFX tạm dùng cho animatic</li>
    <li><strong>Timing</strong> — thời lượng mỗi shot và toàn cảnh, điều chỉnh trong animatic</li>
    <li><strong>Transition</strong> — cut, fade, dissolve đơn giản giữa các panel</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"animatic storyboard timeline animation pre-production"</span>
    </div>
    <p class="arc-image-caption">Animatic trong Premiere/After Effects — panels storyboard trên timeline với scratch audio bên dưới</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Animatic</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Storyboard Animatic — đơn giản nhất</summary>
      <div class="arc-card-body">
        <p>Chỉ là panels storyboard tĩnh nối tiếp nhau theo timeline, gắn scratch audio và transition. Được làm trong Premiere, Storyboard Pro hoặc After Effects.</p>
        <p>Phổ biến cho hoạt hình 2D, quảng cáo, music video.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pan &amp; Scan Animatic</summary>
      <div class="arc-card-body">
        <p>Storyboard panel có camera move giả lập (pan, zoom in/out, scroll) để xem chuyển động camera trước. Phổ biến cho hoạt hình 2D Saturday morning.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Rough Animatic — có chuyển động cơ bản</summary>
      <div class="arc-card-body">
        <p>Một số nhân vật/element có chuyển động đơn giản (vẽ thêm vài frame, hoặc puppet animation trong After Effects). Cảm được rhythm tốt hơn nhưng tốn thời gian hơn.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3D Animatic / Previs Lite</summary>
      <div class="arc-card-body">
        <p>Dùng character/asset 3D placeholder, blocking trong Maya/Blender/Unreal. Cảm được không gian 3D và camera move thực hơn. Phổ biến cho phim VFX, game cinematic.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Animatic trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Hoạt hình 2D &amp; 3D</h3>
    <ul class="arc-list">
      <li>Bước bắt buộc trong pipeline animation — animatic được duyệt mới chuyển sang animate</li>
      <li>Pixar/Disney duyệt animatic nhiều vòng trước khi animator vào việc</li>
      <li>Pencil2D, Toon Boom Storyboard Pro, Premiere là tool phổ biến</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim live-action</h3>
    <ul class="arc-list">
      <li>Dùng cho cảnh action, VFX phức tạp — Nolan, Spielberg famously dùng animatic chi tiết</li>
      <li>Tiết kiệm rất nhiều ngày quay đắt đỏ — quyết định blocking, camera angle trước</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Quảng cáo &amp; Music Video</h3>
    <ul class="arc-list">
      <li>Khách hàng duyệt animatic trước khi production — tránh sửa lớn ở stage tốn kém</li>
      <li>Animatic + scratch music của bài hát giúp music video planning chính xác đến frame</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Cinematic</h3>
    <ul class="arc-list">
      <li>Cutscene/intro game được animatic trước với rough audio</li>
      <li>Studio AAA (Naughty Dog, Insomniac) đầu tư animatic kỹ lưỡng cho narrative scenes</li>
    </ul>
  </div>
</section>
`,
  },

  // 05. Animation
  {
    id: "8bc4f8bf-47d5-425d-b1eb-e6ece61851fd",
    tieu_de: "Animation",
    tieu_de_viet: "Hoạt hình",
    tom_tat:
      "Animation là nghệ thuật tạo ảo giác chuyển động bằng chuỗi hình ảnh nối tiếp nhau — bao trùm 2D, 3D, stop-motion và motion graphics. Nền tảng của phim hoạt hình, game, quảng cáo và UI/UX hiện đại.",
    meta_title: "Animation là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Animation là nghệ thuật tạo ảo giác chuyển động — bao trùm 2D, 3D, stop-motion. Tìm hiểu 12 nguyên lý, các loại animation và ứng dụng trong sáng tạo.",
    noi_dung: `
<section class="arc-intro">
  <p>Một nhân vật trong Toy Story biểu lộ cảm xúc qua ánh mắt, một dòng chữ trong intro YouTube nhảy theo nhạc, một quả banh nảy lên xuống trong UI app — tất cả đều là animation. Đây là ngành nghệ thuật rộng lớn, từ Disney 1937 đến TikTok 2026, có chung một nguyên lý: tạo ảo giác chuyển động.</p>
  <p>Hiểu animation không chỉ là biết phần mềm — quan trọng hơn là hiểu các nguyên lý cảm thụ chuyển động đã được Disney đúc kết từ thập niên 1930. Designer, motion graphics artist, UX designer hiện đại đều cần kiến thức nền này để làm chuyển động &quot;có hồn&quot;.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Animation là gì?</h2>
  <p>Animation (hoạt hình) là nghệ thuật và kỹ thuật tạo ảo giác chuyển động thông qua chuỗi hình ảnh tĩnh nối tiếp nhau với tốc độ đủ nhanh để mắt người không phân biệt được từng frame. Phát hiện ra hiện tượng persistence of vision (lưu ảnh) từ thế kỷ 19, animation trở thành phương tiện kể chuyện và biểu đạt mạnh nhất của thế kỷ 20-21.</p>
  <p>Khác với phim live-action (quay chuyển động thật), animation tạo từng frame — từ vẽ tay, dựng đất sét đến tính toán máy tính. Điều này cho animator quyền tự do tuyệt đối: gì cũng có thể chuyển động — bàn nhảy múa, mây biết nói, không gian bị bóp méo theo cảm xúc.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">12 nguyên lý hoạt hình của Disney</span>
    <p>Năm 1981, hai animator Disney huyền thoại Ollie Johnston và Frank Thomas xuất bản &quot;The Illusion of Life&quot; — đúc kết 12 nguyên lý: Squash &amp; stretch, Anticipation, Staging, Straight ahead vs Pose to pose, Follow through, Slow in &amp; slow out, Arcs, Secondary action, Timing, Exaggeration, Solid drawing, Appeal. Đây vẫn là kim chỉ nam cho mọi animator dù 2D, 3D hay motion graphics.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Frame rate (fps)</strong> — số khung hình mỗi giây (24fps phim, 30/60fps web/game)</li>
    <li><strong>Keyframe</strong> — frame quan trọng đặt bằng tay</li>
    <li><strong>Inbetween</strong> — frame trung gian giữa các keyframe</li>
    <li><strong>Timing</strong> — tốc độ và nhịp chuyển động</li>
    <li><strong>Easing</strong> — đường cong tăng/giảm tốc, ảnh hưởng cảm thụ chuyển động</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"12 principles of animation disney illustration bouncing ball"</span>
    </div>
    <p class="arc-image-caption">12 nguyên lý hoạt hình của Disney — nền tảng cảm thụ chuyển động cho mọi animator</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Animation phổ biến</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Animation 2D — vẽ truyền thống &amp; digital</summary>
      <div class="arc-card-body">
        <p>Vẽ từng frame trên giấy (Disney cổ điển) hoặc trên tablet với Toon Boom, TVPaint, Animate, Procreate Dreams. Hoạt hình anime, Cartoon Network shows, music video animated đều thuộc loại này.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Animation 3D — máy tính dựng</summary>
      <div class="arc-card-body">
        <p>Mô hình 3D có rig, animator điều khiển bằng keyframe trong Maya, Blender, Cinema 4D. Pixar, DreamWorks, Disney 3D đều dùng pipeline này. Game, VFX cũng phụ thuộc 3D animation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Stop Motion — chụp frame-by-frame</summary>
      <div class="arc-card-body">
        <p>Dựng nhân vật thật (đất sét, búp bê, papercraft), chụp từng frame một và di chuyển nhẹ giữa các shot. Wallace &amp; Gromit, Coraline, Isle of Dogs là ví dụ điển hình.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Motion Graphics</summary>
      <div class="arc-card-body">
        <p>Animation cho chữ, logo, infographic, UI element. After Effects là phần mềm chuẩn. Phổ biến cho TVC, intro YouTube, explainer video.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UI Animation &amp; Microinteraction</summary>
      <div class="arc-card-body">
        <p>Chuyển động trong app/website — button hover, transition giữa page, loading spinner. Cùng nguyên lý animation cổ điển nhưng scale nhỏ và phục vụ UX.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Animation trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim &amp; TV</h3>
    <ul class="arc-list">
      <li>Hoạt hình truyền thống: Pixar, DreamWorks, Studio Ghibli — pipeline 2-5 năm/phim</li>
      <li>Series truyền hình: Cartoon Network, Disney+ — tốc độ nhanh hơn, team lớn</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game</h3>
    <ul class="arc-list">
      <li>Character animation (idle, run, attack), cinematic cutscene, motion graphics UI</li>
      <li>Unreal Animation Blueprint, Unity Animator Controller cho realtime</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Quảng cáo &amp; Brand</h3>
    <ul class="arc-list">
      <li>TVC animated, intro brand, social content — phong cách đa dạng từ 2D đến 3D</li>
      <li>After Effects + Cinema 4D là pipeline phổ biến cho commercial</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">UI/UX &amp; Web</h3>
    <ul class="arc-list">
      <li>Microinteraction trong app — feedback, transition, onboarding</li>
      <li>Lottie cho web/mobile, Framer Motion cho React</li>
    </ul>
  </div>
</section>
`,
  },

  // 06. Art Direction
  {
    id: "d0cb420c-7593-441e-928b-9592cbdfbc09",
    tieu_de: "Art Direction",
    tieu_de_viet: "Chỉ đạo nghệ thuật",
    tom_tat:
      "Art Direction là quá trình định hướng phong cách thị giác tổng thể cho một dự án sáng tạo — từ màu sắc, layout đến typography và mood. Vai trò cầu nối giữa concept và execution.",
    meta_title: "Art Direction là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Art Direction định hướng phong cách thị giác cho dự án sáng tạo. Tìm hiểu vai trò Art Director trong quảng cáo, phim, game và quy trình xây visual identity.",
    noi_dung: `
<section class="arc-intro">
  <p>Một chiến dịch quảng cáo gồm hàng chục output: poster, video, social post, OOH, packaging. Tại sao tất cả nhìn vẫn &quot;cùng một bộ&quot; dù do nhiều designer khác nhau làm? Câu trả lời là Art Direction — một người (hoặc team) định hướng và giữ nhất quán visual style cho toàn dự án.</p>
  <p>Art Direction là một trong những vai trò quan trọng nhất nhưng cũng khó định nghĩa nhất trong ngành sáng tạo. Hiểu Art Direction làm gì giúp designer trẻ biết hướng phát triển sự nghiệp, brand biết tìm đúng người, và client biết kỳ vọng gì khi thuê agency hoặc studio.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Art Direction là gì?</h2>
  <p>Art Direction là quá trình định hướng và quản lý các yếu tố thị giác của một dự án sáng tạo — bao gồm màu sắc, layout, typography, photography style, illustration style, mood và tone. Người làm Art Direction (Art Director) chịu trách nhiệm visual consistency và creative quality của toàn project.</p>
  <p>Art Director không nhất thiết phải tự thiết kế từng output — họ định hướng và brief cho designer/illustrator/photographer thực thi, đảm bảo mọi output đều &quot;nói cùng một ngôn ngữ&quot; thị giác. Vai trò ở giao điểm giữa creative thinking và team management.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Art Director vs Creative Director vs Designer</span>
    <p><strong>Creative Director (CD)</strong>: định hướng toàn bộ concept (cả copy + art). <strong>Art Director (AD)</strong>: định hướng phần visual cụ thể, dưới CD. <strong>Designer</strong>: thực thi từng output cụ thể. Trong agency lớn, hệ thống rõ; trong studio nhỏ, một người có thể đeo cả 3 vai.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Mood board</strong> — bộ sưu tập hình ảnh tham chiếu thiết lập tone visual</li>
    <li><strong>Visual identity</strong> — bộ nguyên tắc thị giác đặc trưng (color, typography, layout, imagery)</li>
    <li><strong>Style guide</strong> — tài liệu quy định cách áp dụng visual identity nhất quán</li>
    <li><strong>Art bible</strong> — cẩm nang chi tiết về visual style cho phim/game</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"art direction mood board visual identity branding"</span>
    </div>
    <p class="arc-image-caption">Mood board điển hình — Art Director tổng hợp tham chiếu cho mood, color, type style của một dự án</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Art Direction trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Quảng cáo &amp; Branding</h3>
    <ul class="arc-list">
      <li>Art Director làm việc với copywriter — &quot;creative team&quot; — để phát triển concept campaign</li>
      <li>Định hướng photography, illustration, typography cho toàn loạt output</li>
      <li>Brief cho photographer, illustrator, retoucher; duyệt từng output</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim &amp; TV</h3>
    <ul class="arc-list">
      <li>Production Designer thiết kế tổng thể không gian; Art Director điều phối execution</li>
      <li>Set design, color palette, prop, costume — tất cả nhất quán với visual concept của phim</li>
      <li>Phim hoạt hình: Art Director định hướng style của character, environment, color script</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game</h3>
    <ul class="arc-list">
      <li>Art Director định visual pillars của game — color, character design, environment style</li>
      <li>Quản lý team concept artist, 3D artist, environment artist</li>
      <li>Đảm bảo art style nhất quán dù game có hàng nghìn asset</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Editorial &amp; Magazine</h3>
    <ul class="arc-list">
      <li>Art Director định layout, typography, photography style của tờ báo/tạp chí</li>
      <li>Working closely với editor để visual support nội dung</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Digital &amp; UI/UX</h3>
    <ul class="arc-list">
      <li>Visual Design Director trong tech company chịu trách nhiệm hệ thống design</li>
      <li>Khác UX Lead — Art Direction nghiêng về craft visual, UX nghiêng về flow và functionality</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Để trở thành Art Director cần gì?</h2>
  <ul class="arc-list">
    <li><strong>Nền tảng craft mạnh</strong> — Art Director xuất thân thường là designer giỏi nâng cấp lên</li>
    <li><strong>Visual taste</strong> — sense về typography, color, composition cao hơn trung bình</li>
    <li><strong>Communication skill</strong> — brief rõ ràng cho team, present với client</li>
    <li><strong>Reference library</strong> — biết nhiều hơn về art history, design history, current trends</li>
    <li><strong>Leadership</strong> — guide junior designer, đưa feedback xây dựng</li>
  </ul>
</section>
`,
  },

  // 07. Artboard
  {
    id: "ddee70f6-a9de-4b19-9292-50072dd32365",
    tieu_de: "Artboard",
    tieu_de_viet: "Vùng làm việc (Artboard)",
    tom_tat:
      "Artboard là vùng làm việc độc lập trong phần mềm thiết kế — cho phép có nhiều design (kích thước, layout) trong cùng một file. Tính năng cốt lõi của Illustrator, Photoshop, Figma, XD.",
    meta_title: "Artboard là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Artboard là vùng làm việc trong phần mềm thiết kế cho phép nhiều design trong một file. Tìm hiểu cách dùng Artboard trong Illustrator, Photoshop, Figma.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn cần làm bộ thiết kế gồm name card, brochure 3 trang, poster A2 và social post — tất cả cho cùng một thương hiệu. Mở 4 file riêng thì khó quản lý, mỗi lần đổi logo phải sửa cả 4 chỗ. Artboard giải quyết bài toán đó: tất cả trong một file, mỗi artboard là một &quot;trang&quot; độc lập với kích thước riêng.</p>
  <p>Artboard là tính năng tưởng cơ bản nhưng có nhiều &quot;tip&quot; tăng tốc workflow đáng kể. Hiểu artboard kỹ giúp bạn tổ chức file design gọn gàng, dễ xuất batch và linh hoạt khi làm các dự án nhiều output.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Artboard là gì?</h2>
  <p>Artboard là vùng làm việc độc lập có kích thước cố định bên trong file thiết kế. Mỗi artboard hoạt động như một &quot;trang&quot; riêng — có thể có dimension khác nhau, độc lập về layout, nhưng cùng chia sẻ assets (color, swatch, symbol) trong cùng file.</p>
  <p>Khái niệm artboard xuất hiện đầu tiên trong Illustrator CS4 (2008) và sau đó trở thành tính năng chuẩn ở Photoshop, Figma, Adobe XD, Sketch. Đặc biệt hữu ích cho designer làm responsive design, branding system, hoặc bộ output đa kích thước.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Artboard vs Page vs Frame</span>
    <p>InDesign dùng &quot;Page&quot; (luôn cùng kích thước trong một document). Figma/Sketch dùng &quot;Frame&quot; (có thể nested, mỗi frame có constraint riêng). Illustrator/Photoshop dùng &quot;Artboard&quot; (kích thước độc lập, không nest). Khái niệm tương đương nhau nhưng workflow hơi khác.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Artboard tool</strong> — công cụ tạo/sửa/sắp xếp artboard</li>
    <li><strong>Bleed</strong> — vùng tràn lề cho in (3-5mm thường)</li>
    <li><strong>Safe area</strong> — vùng nội dung an toàn, không quá gần edge</li>
    <li><strong>Export individual</strong> — xuất từng artboard thành file riêng</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"illustrator artboards multiple sizes workspace screenshot"</span>
    </div>
    <p class="arc-image-caption">Workspace Illustrator với nhiều artboard kích thước khác nhau trong cùng một file</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Artboard trong từng phần mềm</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Illustrator — artboard linh hoạt nhất</summary>
      <div class="arc-card-body">
        <p>Tới 100 artboard trong một file. Mỗi artboard có thể có kích thước khác. Export Asset cho phép xuất từng artboard thành PNG/SVG/PDF riêng. Phổ biến cho branding (logo nhiều variant), icon set, infographic.</p>
        <ul class="arc-list">
          <li>Shift+O để chọn Artboard Tool</li>
          <li>Window → Artboards panel để quản lý</li>
          <li>File → Export → Export As → Use Artboards để batch export</li>
        </ul>
      </div>
    </details>
    <details class="arc-card">
      <summary>Photoshop — artboard từ CC 2015</summary>
      <div class="arc-card-body">
        <p>Layer Group đặc biệt với kích thước cố định. Mỗi artboard có background riêng, render độc lập. Phổ biến cho UI design responsive (mobile, tablet, desktop trong một file).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Figma — Frame thay artboard</summary>
      <div class="arc-card-body">
        <p>Figma không gọi &quot;artboard&quot; mà gọi &quot;Frame&quot;. Frame có thể nested (frame trong frame), có auto layout, constraint. Phù hợp đặc biệt cho UI design responsive và design system.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Adobe XD &amp; Sketch — tương tự Figma</summary>
      <div class="arc-card-body">
        <p>Cả hai dùng artboard hoặc tương đương. XD có Repeat Grid cho danh sách item; Sketch có Symbol mạnh cho component.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Artboard trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Branding &amp; Identity</h3>
    <ul class="arc-list">
      <li>Mỗi artboard cho mỗi variant logo, business card, letterhead — tất cả trong một file .ai</li>
      <li>Đổi color/font một chỗ → cập nhật được toàn brand system</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Social Media &amp; Content</h3>
    <ul class="arc-list">
      <li>Artboard với kích thước chuẩn: Instagram square (1080×1080), Story (1080×1920), Facebook cover (820×360)</li>
      <li>Một file chứa cả bộ content cho một campaign</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">UI/UX</h3>
    <ul class="arc-list">
      <li>Mỗi screen là một artboard; flow giữa các screen dễ visualize</li>
      <li>Responsive design: cùng một screen ở 3 size (mobile, tablet, desktop)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Print Design</h3>
    <ul class="arc-list">
      <li>Brochure folded — mỗi trang là một artboard</li>
      <li>Set bleed (3mm) và safe area khi setup artboard cho in</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Object đè lên ranh artboard, export bị cắt</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> object kéo dài qua biên artboard. Khi export PNG/JPEG, phần ngoài artboard bị cắt.</p>
        <p><strong>Cách fix:</strong> kiểm tra trước khi export, cắt hoặc clip object đúng artboard. Hoặc dùng option &quot;Use Artboards&quot; khi export — output sẽ tự crop.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Quá nhiều artboard, file nặng và chậm</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> 50-100 artboard trong một file Illustrator phức tạp làm chậm khi pan/zoom.</p>
        <p><strong>Cách fix:</strong> chia file theo nhóm (logo, social, print riêng file). Dùng symbol cho element lặp lại để giảm dung lượng.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Artboard sai bleed → file in bị viền trắng</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> không setup bleed 3-5mm cho thiết kế in.</p>
        <p><strong>Cách fix:</strong> trong Document Setup, đặt Bleed = 3mm (hoặc theo yêu cầu nhà in). Kéo background, ảnh ra ngoài artboard đến vùng bleed.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 08. Atmospheric Perspective
  {
    id: "e7c64e7a-1241-4252-b8fb-897565194e9b",
    tieu_de: "Atmospheric Perspective",
    tieu_de_viet: "Phối cảnh khí quyển",
    tom_tat:
      "Atmospheric Perspective là kỹ thuật thị giác — vật càng xa càng nhạt và ngả về tông màu khí quyển — giúp tạo chiều sâu trong concept art, painting và digital matte. Một trong những nguyên lý cơ bản của perspective rendering.",
    meta_title: "Atmospheric Perspective là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Atmospheric Perspective tạo chiều sâu bằng cách làm vật xa nhạt và ngả màu khí quyển. Tìm hiểu nguyên lý, ứng dụng trong concept art, painting và VFX.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn nhìn ra cửa sổ một ngày trời quang — núi gần thấy rõ màu xanh lá, núi xa hơn hơi nhạt và ngả về xanh dương xám, núi xa nhất chỉ còn là silhouette mờ ảo. Đây không phải ảo giác — đó là cách khí quyển tán xạ ánh sáng và làm thay đổi màu sắc theo khoảng cách. Hiện tượng vật lý này được nghệ sĩ gọi là Atmospheric Perspective.</p>
  <p>Hiểu Atmospheric Perspective là kiến thức cơ bản cho concept artist, matte painter, environment artist và bất kỳ ai vẽ hoặc render cảnh có chiều sâu. Một bức tranh không có atmospheric perspective thường trông &quot;phẳng&quot; — các vật ở mọi khoảng cách đều có cùng độ rõ và saturation.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Atmospheric Perspective là gì?</h2>
  <p>Atmospheric Perspective (còn gọi Aerial Perspective) là hiệu ứng thị giác trong đó vật thể ở xa trông mờ hơn, nhạt màu hơn, và có xu hướng ngả về màu khí quyển (thường xanh dương xám trong ngày trời quang). Nguyên nhân là không khí và hạt bụi giữa người nhìn và vật thể tán xạ ánh sáng — vật càng xa, lớp khí càng dày, ảnh hưởng càng mạnh.</p>
  <p>Da Vinci là người đầu tiên ghi chép có hệ thống về hiện tượng này trong sổ tay của ông. Ông phát hiện ra rằng để tạo cảm giác chiều sâu, không chỉ cần linear perspective (đường thẳng hội tụ vanishing point) mà cần kết hợp atmospheric perspective.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">3 đặc điểm chính của vật ở xa</span>
    <p>(1) <strong>Mất contrast</strong> — chênh lệch tối/sáng giảm. (2) <strong>Mất saturation</strong> — màu nhạt đi, đến gần xám. (3) <strong>Ngả màu khí quyển</strong> — thường xanh dương/xám trong điều kiện ngày trời quang. Buổi sáng/tối, sương mù, bão bụi có thể đổi sang ngả vàng, hồng, đỏ tùy điều kiện.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Distance fog</strong> — fog dày tăng dần theo khoảng cách (mô phỏng hiện tượng này trong 3D)</li>
    <li><strong>Value flattening</strong> — value (độ sáng) bị nén lại ở khoảng cách xa</li>
    <li><strong>Hue shift</strong> — màu sắc đổi dần về khí quyển</li>
    <li><strong>Edge softening</strong> — đường nét vật xa mờ hơn, ít sắc nét</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"atmospheric perspective mountains landscape painting depth"</span>
    </div>
    <p class="arc-image-caption">Phong cảnh núi với atmospheric perspective rõ rệt — lớp gần đậm và rõ, lớp xa nhạt và ngả xám xanh</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Áp dụng Atmospheric Perspective trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Concept Art &amp; Digital Painting</h3>
    <ul class="arc-list">
      <li>Layer foreground - midground - background với value/saturation/hue khác nhau</li>
      <li>Thường rule: foreground sắc nét và đậm; background mờ và sáng/nhạt</li>
      <li>Dùng overlay color (color of atmosphere) layer dần ra xa</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Matte Painting &amp; Environment Design</h3>
    <ul class="arc-list">
      <li>Matte painter dựng cảnh nhiều lớp depth — phải mô phỏng atmospheric đúng</li>
      <li>Trong Photoshop: gradient map mô phỏng atmospheric, dùng masking theo depth</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3D Render</h3>
    <ul class="arc-list">
      <li>Volumetric atmosphere/fog trong V-Ray, Arnold, Octane mô phỏng atmospheric thực sự</li>
      <li>Distance-based fog rẻ và nhanh — phù hợp game realtime, viewport preview</li>
      <li>Z-depth pass + atmospheric pass riêng cho compositor kiểm soát ở post</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim &amp; Quay phim</h3>
    <ul class="arc-list">
      <li>DOP chọn lens dài, đặt cảnh đối tượng xa để có atmospheric tự nhiên</li>
      <li>Cảnh quay sương mù, bụi → atmospheric exaggerated tạo mood epic</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game</h3>
    <ul class="arc-list">
      <li>Distance fog cách giải quyết &quot;khuất&quot; vật xa thay vì render đủ chi tiết</li>
      <li>Phong cách stylized (Genshin Impact, Breath of the Wild) tận dụng atmospheric mạnh cho không gian thơ mộng</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Tips để vẽ Atmospheric Perspective hiệu quả</h2>
  <ul class="arc-list">
    <li><strong>Chia 3 plane</strong>: foreground, midground, background — mỗi plane có value khác nhau</li>
    <li><strong>Value structure trước color</strong>: phác tranh greyscale với value structure đúng trước, color sau</li>
    <li><strong>Color of atmosphere</strong>: chọn 1 màu khí quyển (vd xanh dương cho ngày, cam cho hoàng hôn), tăng dần ảnh hưởng ra xa</li>
    <li><strong>Don&apos;t use pure white/black</strong> ở background — luôn pha với hue atmospheric</li>
    <li><strong>Edges</strong>: foreground hard edges, background soft edges</li>
  </ul>
</section>
`,
  },

  // 09. Audio Middleware
  {
    id: "550bd61e-07f9-4a93-abc7-3178bcb9ee66",
    tieu_de: "Audio Middleware",
    tieu_de_viet: "Phần mềm trung gian âm thanh",
    tom_tat:
      "Audio Middleware là phần mềm trung gian giữa sound designer và game engine — cho phép thiết kế logic âm thanh phức tạp mà không cần code. Wwise và FMOD là hai middleware phổ biến nhất trong game audio.",
    meta_title: "Audio Middleware là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Audio Middleware là phần mềm trung gian giúp sound designer thiết kế âm thanh tương tác cho game. Tìm hiểu Wwise, FMOD và workflow trong game audio.",
    noi_dung: `
<section class="arc-intro">
  <p>Trong game, một bước chân nhân vật phải có âm thanh khác khi đi trên sàn gỗ, đá, cỏ hay kim loại. Một viên đạn bay phải có doppler effect tùy tốc độ. Mỗi NPC có voice variation random để không nghe nhàm. Để làm được những điều này mà không cần programmer viết hàng nghìn dòng code, ngành game audio dùng Audio Middleware.</p>
  <p>Audio Middleware là một trong những công nghệ then chốt của game audio chuyên nghiệp. Hiểu middleware giúp sound designer tự setup logic âm thanh phức tạp, làm việc song song với coder, và đảm bảo chất lượng audio không bị giới hạn bởi kỹ năng programming.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Audio Middleware là gì?</h2>
  <p>Audio Middleware là phần mềm trung gian nằm giữa sound designer và game engine. Nó cung cấp giao diện đồ họa cho sound designer thiết kế logic âm thanh — random variation, distance attenuation, layer mixing, real-time parameter control — mà không cần code C++ hay C#.</p>
  <p>Sau khi sound designer setup trong middleware, game engine chỉ cần gọi &quot;event&quot; (vd Play_Footstep, Play_Explosion) và middleware tự xử lý mọi chi tiết: chọn sample nào, volume, pitch, spatial, effect. Pipeline rất gọn — programmer không phải lo audio details.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Tại sao game cần middleware mà phim/TVC thì không?</span>
    <p>Phim có audio cố định — sound designer mix một lần, kết quả không đổi. Game có audio tương tác — phản ứng theo hành động player. Cùng một explosion có thể vang khác nhau trong nhà thờ, ngoài đường, dưới nước; cùng một footstep khác trên 10 loại surface; cùng một dialogue lặp 50 lần phải sound variation. Middleware giải quyết complexity này.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Event</strong> — đơn vị âm thanh game engine gọi (Play_Sword_Hit, Play_Music_Battle)</li>
    <li><strong>RTPC</strong> — Real-Time Parameter Control, biến đổi audio theo gameplay (tốc độ xe → engine pitch)</li>
    <li><strong>Switch / State</strong> — chọn variation theo context (surface type, weather, weapon type)</li>
    <li><strong>Bus</strong> — group nhiều sound để mix chung (Master, Music, SFX, Voice)</li>
    <li><strong>SoundBank</strong> — gói âm thanh build ra game engine</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"audio middleware wwise fmod game engine workflow"</span>
    </div>
    <p class="arc-image-caption">Vị trí audio middleware trong pipeline game — sound designer thiết kế trong middleware, game engine gọi event qua API</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các Audio Middleware phổ biến</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Wwise (Audiokinetic) — chuẩn industry AAA</summary>
      <div class="arc-card-body">
        <p>Wwise là middleware phổ biến nhất cho game AAA — The Last of Us, Cyberpunk 2077, Assassin&apos;s Creed đều dùng. Mạnh, profile tốt, integration sâu với Unity/Unreal/proprietary engines.</p>
        <ul class="arc-list">
          <li>Free cho dev game indie/small budget; tính phí khi có doanh thu lớn</li>
          <li>Workshop, certification chính thức từ Audiokinetic</li>
        </ul>
      </div>
    </details>
    <details class="arc-card">
      <summary>FMOD Studio (Firelight Technologies)</summary>
      <div class="arc-card-body">
        <p>Đối thủ chính của Wwise — workflow nhanh và trực quan hơn, đặc biệt mạnh cho indie game. Celeste, Genshin Impact, Hades dùng FMOD. Pricing thân thiện indie hơn.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Unreal Audio Engine (built-in)</summary>
      <div class="arc-card-body">
        <p>Unreal 5 có built-in audio engine tương đương middleware — MetaSounds cho procedural audio, ambisonics, spatial audio. Đủ mạnh cho nhiều game không cần middleware ngoài.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Unity Audio (built-in)</summary>
      <div class="arc-card-body">
        <p>Unity built-in audio cơ bản hơn Unreal — đủ cho game đơn giản. Cho game phức tạp, nhiều dev integrate FMOD hoặc Wwise.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Audio Middleware trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game AAA</h3>
    <ul class="arc-list">
      <li>Wwise gần như standard — team audio 10-20 người làm việc trong một project Wwise</li>
      <li>Complex behavior: dynamic mixing, adaptive music, voice management cho hàng nghìn line dialogue</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Indie</h3>
    <ul class="arc-list">
      <li>FMOD phổ biến hơn — free up to limited revenue, workflow nhanh, dễ học</li>
      <li>Team 1-3 người vẫn tận dụng được middleware hiệu quả</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VR &amp; Immersive Experience</h3>
    <ul class="arc-list">
      <li>Spatial audio, ambisonics critical cho VR — middleware có support tốt hơn engine built-in</li>
      <li>Wwise Spatial Audio, Steam Audio integration phổ biến</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Installation &amp; Interactive Art</h3>
    <ul class="arc-list">
      <li>Bảo tàng, triển lãm tương tác dùng FMOD/Wwise cho audio adaptive theo người tham quan</li>
      <li>Kết hợp với Unity/Unreal hoặc TouchDesigner</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Memory/RAM bị overflow vì quá nhiều sound load</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> không phân SoundBank đúng — tải hết audio của game vào memory lúc bắt đầu.</p>
        <p><strong>Cách fix:</strong> chia SoundBank theo level/zone, load/unload theo gameplay context. Dùng streaming cho music dài và voice line.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mixing không nhất quán giữa scene</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> không setup mixer hierarchy (bus structure) chặt chẽ — mỗi designer tự chỉnh volume riêng.</p>
        <p><strong>Cách fix:</strong> setup bus structure rõ (Master → SFX/Music/Voice → sub-bus). Reference loudness chuẩn (vd -23 LUFS broadcast, -16 LUFS streaming).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Footstep loop &quot;nhàm&quot; vì không có variation</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> chỉ một sample được play lại nhiều lần.</p>
        <p><strong>Cách fix:</strong> setup Random Container với 4-10 variation, pitch random ±10 cent, volume random ±2dB. Switch container theo surface type.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 10. Audio Mixing
  {
    id: "cee32bb4-5fa7-4dbf-8da9-02a8aabed11b",
    tieu_de: "Audio Mixing",
    tieu_de_viet: "Mixing âm thanh",
    tom_tat:
      "Audio Mixing là quá trình cân bằng và xử lý nhiều lớp âm thanh thành bản hoàn chỉnh — từ volume, EQ, dynamics đến spatial và effects. Bước hậu kỳ quyết định chất lượng cuối của music, phim, game, podcast.",
    meta_title: "Audio Mixing là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Audio Mixing là quá trình trộn nhiều lớp âm thành bản hoàn chỉnh. Tìm hiểu quy trình, các plugin cốt lõi và ứng dụng trong music, phim, game, podcast.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn thu xong vocal, guitar, bass, drum cho một bài hát. Mỗi track nghe riêng đều tốt — nhưng play cùng nhau lại bị &quot;đậm đặc&quot;, vocal chìm, drum át mọi thứ. Để chuyển từ &quot;tập hợp track riêng&quot; thành &quot;một bài hát hoàn chỉnh&quot; cần một quá trình tinh tế — đó là audio mixing.</p>
  <p>Mixing là một trong những công đoạn quan trọng nhất quyết định chất lượng cảm thụ cuối cùng của bất kỳ sản phẩm âm thanh nào. Một bài hát mix tốt nghe cuốn hút trên mọi thiết bị — từ tai nghe đắt tiền đến loa điện thoại. Hiểu mixing giúp musician, podcaster, sound designer kiểm soát quy trình sản xuất.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Audio Mixing là gì?</h2>
  <p>Audio Mixing là quá trình kết hợp nhiều track âm thanh riêng biệt thành một bản hoàn chỉnh — cân bằng volume, panning (trái phải), tone (EQ), dynamics (compression), spatial (reverb, delay), và effects. Mục tiêu: mỗi element có chỗ riêng trong &quot;không gian âm thanh&quot;, tổng thể nghe rõ và truyền đúng cảm xúc.</p>
  <p>Mixing khác với mastering — mastering là bước cuối, áp dụng EQ/compression/limiting nhẹ cho cả bản đã mix để chuẩn hóa loudness và optimize cho phương tiện phát (Spotify, vinyl, CD, broadcast). Mixing tạo &quot;bài hát&quot;, mastering làm &quot;bài hát đó nghe tốt trên mọi nơi&quot;.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Mix tốt = nghe rõ trên mọi thiết bị</span>
    <p>Một bài mix chuyên nghiệp phải nghe tốt trên: tai nghe studio, tai nghe phổ thông, loa điện thoại, loa xe hơi, hệ thống club. Mix engineer thường kiểm tra trên nhiều reference (NS-10, AirPods, loa laptop) để đảm bảo balance không phụ thuộc một hệ thống cụ thể.</p>
  </div>

  <ul class="arc-list">
    <li><strong>EQ (Equalization)</strong> — tăng/giảm tần số để tạo chỗ cho từng element</li>
    <li><strong>Compression</strong> — nén dynamics, làm signal đều hơn</li>
    <li><strong>Reverb / Delay</strong> — tạo cảm giác không gian, depth</li>
    <li><strong>Panning</strong> — đặt vị trí trái-phải</li>
    <li><strong>Bus / Group</strong> — gom track liên quan để xử lý chung</li>
    <li><strong>Sidechain</strong> — track A duck track B khi B có signal (kick duck bass)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"audio mixing studio DAW pro tools mixer fader"</span>
    </div>
    <p class="arc-image-caption">Mixing workspace trong DAW — multi-track, fader, plugin EQ/compression trên từng channel</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Quy trình Audio Mixing chuẩn</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Gain staging &amp; rough balance</summary>
      <div class="arc-card-body">
        <p>Set level đầu vào mỗi track ở -18 đến -12 dBFS để có headroom. Tạo rough balance giữa các element trước khi áp effects — đảm bảo level âm thanh không bị clipping.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. EQ — cắt trước khi boost</summary>
      <div class="arc-card-body">
        <p>Cắt tần số không cần (high-pass dưới 80Hz cho vocal, cắt mud 200-400Hz nếu đậm). Boost cuối cùng — chỉ boost tần số đặc trưng để element &quot;present&quot;.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Compression — kiểm soát dynamics</summary>
      <div class="arc-card-body">
        <p>Vocal compression ratio 3:1 đến 6:1, gain reduction 3-6dB. Drum bus compression mạnh hơn để &quot;glue&quot;. Tránh over-compression — mất sức sống dynamic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Spatial — reverb &amp; delay</summary>
      <div class="arc-card-body">
        <p>Tạo depth — element gần thì khô, element xa thì nhiều reverb. Dùng send bus thay vì reverb trên từng track để consistent.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Automation &amp; final balance</summary>
      <div class="arc-card-body">
        <p>Tự động fader cho dynamic của bài (verse nhỏ, chorus to). Refine balance, check trên nhiều reference system. Render bounce final.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Audio Mixing trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Music</h3>
    <ul class="arc-list">
      <li>DAW chuẩn: Pro Tools, Logic Pro, Cubase, Ableton</li>
      <li>Mỗi thể loại có convention riêng — EDM mix bass nặng, indie pop vocal forward, hip-hop drum và 808 dominant</li>
      <li>Reference track quan trọng — so sánh mix mình với hit cùng thể loại</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim &amp; TV (re-recording mixing)</h3>
    <ul class="arc-list">
      <li>Pro Tools Ultimate là chuẩn — hỗ trợ Atmos object-based mix</li>
      <li>Dialogue luôn trên cùng (intelligibility), music ducked dưới dialogue, SFX support emotion</li>
      <li>Standard loudness: -23 LUFS broadcast (EBU R128), -27 LUFS cinema</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game</h3>
    <ul class="arc-list">
      <li>Mix qua middleware (Wwise/FMOD) thay vì static bounce — adaptive theo gameplay</li>
      <li>Reference loudness console games: -23 LUFS; mobile: -16 LUFS</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Podcast</h3>
    <ul class="arc-list">
      <li>Voice là trọng tâm — EQ làm rõ vocal, de-essing, light compression</li>
      <li>Reference: -16 LUFS (Spotify, Apple Podcast)</li>
      <li>Audition, Adobe Podcast, Auphonic là tool phổ biến cho podcaster</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Mix nghe tốt trên studio nhưng tệ trên tai nghe / loa điện thoại</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> chỉ check một hệ thống (vd studio monitor có bass dày), không reference với consumer system.</p>
        <p><strong>Cách fix:</strong> kiểm tra mix trên ít nhất 3 hệ thống khác nhau — studio monitor, tai nghe, loa laptop. Use tool như Sonarworks hoặc IEM để compensate phòng.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Vocal bị &quot;chìm&quot; trong mix</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> các element khác đang chiếm dải tần của vocal (200-3000Hz), hoặc mix quá nhiều compression chung.</p>
        <p><strong>Cách fix:</strong> EQ &quot;carve&quot; — cắt dải mid của các element khác để mở chỗ cho vocal. Sidechain duck nhẹ instrument với vocal.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mix quá &quot;loud&quot; — clipping/distortion</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> cố tăng loudness bằng limiter mạnh, không để headroom cho mastering.</p>
        <p><strong>Cách fix:</strong> để mix peak ở -6 dBFS, leave headroom. Mastering sẽ tăng loudness sau. Đừng so sánh loudness mix với master commercial.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Quá nhiều reverb làm mix &quot;washy&quot;</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> add reverb trên từng track riêng thay vì send bus, hoặc reverb time quá dài cho thể loại nhanh.</p>
        <p><strong>Cách fix:</strong> dùng send bus cho reverb (max 2-3 reverb bus chung). Pre-delay 20-40ms giúp vocal vẫn intelligible với reverb nhiều.</p>
      </div>
    </details>
  </div>
</section>
`,
  },
];

console.log(`\n── Bắt đầu chạy ${items.length} bài keyword đợt 1.2 ──\n`);

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

console.log(`\n── Kết quả lần chạy này (Đợt 1.2) ──`);
for (const r of results) {
  if (r.error) {
    console.log(`✗ ${r.tieu_de} — ${r.error}`);
  } else {
    console.log(`✓ ${r.tieu_de} — ${r.do_dai} ký tự`);
  }
}
console.log(`\nCòn lại đợt 1: ${conLai} bài.`);
