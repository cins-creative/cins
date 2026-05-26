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
  // 01. Bleed
  {
    id: "5f77034b-0555-4eef-bbf9-7e0578fda84a",
    tieu_de: "Bleed",
    tieu_de_viet: "Tràn lề (Bleed)",
    tom_tat:
      "Bleed là phần ảnh/màu nền kéo dài vượt qua đường cắt cuối cùng trong thiết kế in — bù trừ cho sai số máy cắt, tránh viền trắng không mong muốn ở thành phẩm.",
    meta_title: "Bleed là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Bleed là phần tràn lề trong thiết kế in để tránh viền trắng do sai số máy cắt. Tìm hiểu setup bleed trong Illustrator, InDesign cho name card, brochure, poster.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn vừa giao file in 1000 brochure cho nhà in. Hôm sau nhận về — một số tờ có viền trắng mỏng ở mép, một số tờ thì cắt lệch vào nội dung. Đây không phải lỗi nhà in — đây là lỗi thiết kế không có bleed.</p>
  <p>Bleed là kiến thức nền tảng cho bất kỳ designer làm thiết kế in. Hiểu bleed và setup đúng giúp tránh được nhiều rắc rối khi gửi file in, đảm bảo thành phẩm đẹp đúng ý từ name card đến packaging cao cấp.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Bleed là gì?</h2>
  <p>Bleed (tràn lề) là phần hình ảnh, màu nền hoặc các yếu tố thiết kế được kéo dài vượt ra ngoài đường cắt cuối cùng của ấn phẩm — thường 3-5mm tùy quy chuẩn nhà in. Mục đích: bù trừ cho sai số máy cắt giấy (~1mm typical), đảm bảo không có viền trắng xuất hiện ở mép thành phẩm.</p>
  <p>Máy cắt giấy không bao giờ chính xác 100% — luôn có sai số nhỏ vài mm. Nếu thiết kế dừng đúng tại đường cắt, một cú cắt lệch sẽ lộ ra giấy trắng phía sau. Bleed là &quot;đệm an toàn&quot; — thừa ra để có cắt lệch vẫn không lộ giấy.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Bleed vs Safe Area vs Trim</span>
    <p><strong>Trim</strong>: đường cắt cuối (vd 90×54mm cho name card). <strong>Bleed</strong>: vùng tràn ra ngoài trim 3-5mm — chỉ cho background/ảnh. <strong>Safe area</strong>: vùng nội dung an toàn, cách trim vào trong 3-5mm — text, logo phải nằm trong này để không bị cắt sát.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Trim line</strong> — đường cắt thật, kích thước final</li>
    <li><strong>Bleed line</strong> — đường ngoài trim 3-5mm, background phải kéo đến đây</li>
    <li><strong>Safe area</strong> — đường trong trim 3-5mm, text/logo phải trong này</li>
    <li><strong>Crop marks</strong> — dấu cắt trên file in chỉ cho nhà in</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"print bleed trim safe area diagram explanation"</span>
    </div>
    <p class="arc-image-caption">Sơ đồ bleed/trim/safe area — background kéo đến bleed, text trong safe area, máy cắt theo trim</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Setup Bleed trong từng phần mềm</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Illustrator</summary>
      <div class="arc-card-body">
        <p>File → Document Setup → Bleed: nhập 3mm cho 4 cạnh (hoặc theo yêu cầu nhà in). Đường bleed hiện màu đỏ ngoài artboard. Khi xuất PDF, tick &quot;Use Document Bleed Settings&quot; và &quot;Trim Marks&quot;.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>InDesign</summary>
      <div class="arc-card-body">
        <p>File → Document Setup → Bleed and Slug. Set bleed 3mm. Trang hiện đường bleed màu đỏ. Export PDF với preset &quot;PDF/X-1a&quot; cho in chuyên nghiệp.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Photoshop</summary>
      <div class="arc-card-body">
        <p>Photoshop ít dùng cho in chuyên nghiệp nhưng vẫn được. Tạo file với kích thước có thêm bleed (vd name card 90×54mm + 3mm bleed = 96×60mm). Đường dẫn lèo (guide) đánh dấu trim line.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Figma</summary>
      <div class="arc-card-body">
        <p>Figma không có concept bleed built-in. Tạo frame lớn hơn final size 6mm (cho 3mm bleed mỗi cạnh), dùng guide đánh trim. Plugin &quot;Print for Figma&quot; hỗ trợ workflow in.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Bleed trong từng ấn phẩm</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Name Card</h3>
    <ul class="arc-list">
      <li>Trim 90×54mm (chuẩn quốc tế) hoặc 85×55mm (chuẩn châu Á)</li>
      <li>Bleed 3mm mỗi cạnh → file ship 96×60mm hoặc 91×61mm</li>
      <li>Safe area 3mm trong — text logo không gần mép</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Brochure / Flyer</h3>
    <ul class="arc-list">
      <li>A4: 210×297mm + 3mm bleed = 216×303mm</li>
      <li>A5: 148×210mm + 3mm bleed = 154×216mm</li>
      <li>Folded brochure: setup bleed cho mỗi panel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Poster</h3>
    <ul class="arc-list">
      <li>A2/A1/A0 — bleed 5mm cho khổ lớn (sai số cắt lớn hơn)</li>
      <li>Resolution 150 DPI là đủ cho poster nhìn xa, 300 DPI cho cận cảnh</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Packaging</h3>
    <ul class="arc-list">
      <li>Bleed 5-10mm (packaging có folding, cần đệm hơn)</li>
      <li>Dieline (đường gấp/cắt) tích hợp trong file</li>
      <li>Cần tham vấn nhà in từ đầu — chuẩn bleed mỗi nơi khác</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Book / Magazine</h3>
    <ul class="arc-list">
      <li>Bleed 3-5mm tất cả các cạnh; gutter (gáy) cần thêm space</li>
      <li>Spread: bleed vào giữa nhưng tránh nội dung quan trọng trong gutter</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>File in xong có viền trắng ở mép</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> không setup bleed, background dừng đúng tại trim line.</p>
        <p><strong>Cách fix:</strong> setup bleed 3mm ngay từ Document Setup, kéo background ra đến bleed line.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Text bị cắt sát mép</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> đặt text quá gần edge, không vào safe area.</p>
        <p><strong>Cách fix:</strong> giữ text/logo cách trim line tối thiểu 3-5mm (safe area).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Xuất PDF không có bleed</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> quên tick &quot;Use Document Bleed&quot; khi export.</p>
        <p><strong>Cách fix:</strong> trong dialog Export PDF, tab Marks and Bleeds → tick &quot;Use Document Bleed Settings&quot; và &quot;Trim Marks&quot;.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 02. Blending Mode
  {
    id: "c7fb530d-79f4-4a17-82c8-22990455a72e",
    tieu_de: "Blending Mode",
    tieu_de_viet: "Chế độ pha trộn (Blending Mode)",
    tom_tat:
      "Blending Mode là tính năng hòa trộn pixel giữa các layer theo công thức toán học — tạo hiệu ứng từ ánh sáng đến grunge texture đến color grading. Một trong những công cụ mạnh nhất nhưng ít dùng hết của Photoshop.",
    meta_title: "Blending Mode là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Blending Mode hòa trộn layer theo công thức toán học. Tìm hiểu Multiply, Screen, Overlay, Soft Light và ứng dụng trong design, photo, retouch.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn có một bức ảnh chân dung và muốn thêm hiệu ứng ánh nắng vàng buổi chiều. Tạo layer mới, fill màu cam, blending mode &quot;Overlay&quot; — lập tức cả bức ảnh nhuốm sắc nắng tự nhiên. Đây là một trong vô số cách Blending Mode giải quyết nhanh những hiệu ứng phức tạp.</p>
  <p>Blending Mode là một trong những tính năng mạnh nhất và đa năng nhất trong design software. Hiểu cách hoạt động và biết khi nào dùng mode nào là kỹ năng phân biệt designer trung cấp với cao cấp — đặc biệt trong retouch, color grading và composite.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Blending Mode là gì?</h2>
  <p>Blending Mode là công thức toán học quyết định cách pixel của một layer kết hợp với pixel layer phía dưới. Thay vì chỉ hiển thị layer phía trên (chế độ Normal), Blending Mode tính toán giá trị mới dựa trên blend giữa hai layer — tạo ra hàng loạt hiệu ứng từ darken (Multiply), lighten (Screen), contrast (Overlay), đến color (Hue, Color).</p>
  <p>Có khoảng 27 blending mode trong Photoshop, chia thành 6 nhóm chính. Hiểu nhóm và cơ chế giúp bạn không phải nhớ thuộc lòng — chỉ cần biết loại hiệu ứng muốn đạt được là chọn được mode phù hợp.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">6 nhóm Blending Mode chính</span>
    <p>(1) <strong>Normal</strong>: Normal, Dissolve. (2) <strong>Darken</strong>: Multiply, Darken, Color Burn — kết quả tối hơn. (3) <strong>Lighten</strong>: Screen, Lighten, Color Dodge — kết quả sáng hơn. (4) <strong>Contrast</strong>: Overlay, Soft Light, Hard Light — tăng contrast. (5) <strong>Compare</strong>: Difference, Exclusion — so sánh. (6) <strong>Color</strong>: Hue, Saturation, Color, Luminosity — pha màu/độ sáng riêng.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Multiply</strong> — &quot;in chồng&quot;, tối đi; phù hợp shadow, dark texture</li>
    <li><strong>Screen</strong> — ngược của Multiply, sáng lên; phù hợp light effect, lens flare</li>
    <li><strong>Overlay</strong> — kết hợp Multiply + Screen tùy luminance; tăng contrast</li>
    <li><strong>Soft Light</strong> — Overlay nhẹ nhàng hơn, ít gay gắt</li>
    <li><strong>Color</strong> — chỉ lấy hue/saturation từ layer trên, giữ luminance dưới</li>
    <li><strong>Luminosity</strong> — chỉ lấy luminance từ trên, giữ color dưới</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"blending mode photoshop comparison multiply screen overlay"</span>
    </div>
    <p class="arc-image-caption">Cùng 2 layer với các Blending Mode khác nhau — mỗi mode cho kết quả khác biệt rõ rệt</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các Blending Mode hay dùng nhất</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Multiply — tối đi, in mực</summary>
      <div class="arc-card-body">
        <p>Pixel layer trên nhân với pixel layer dưới. White (255) thì không thay đổi, black (0) thì kết quả luôn đen. Phổ biến cho: đặt logo đen lên ảnh, shadow effect, mockup mockup chữ trên giấy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Screen — sáng lên, light overlay</summary>
      <div class="arc-card-body">
        <p>Ngược Multiply. Black thì không thay đổi, white thì kết quả trắng. Dùng cho: thêm ánh sáng (lens flare, light leak, star/sparkle), đặt fire/explosion footage lên cảnh.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Overlay — tăng contrast</summary>
      <div class="arc-card-body">
        <p>Multiply ở vùng tối, Screen ở vùng sáng. Tăng contrast của layer dưới với màu layer trên. Phổ biến cho: color grading, dodge &amp; burn (50% gray + black/white brush), texture overlay.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Soft Light — Overlay nhẹ</summary>
      <div class="arc-card-body">
        <p>Tương tự Overlay nhưng nhẹ nhàng hơn. Phù hợp khi Overlay quá gay gắt. Sử dụng cho color tinting, subtle texture.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color &amp; Luminosity — tách màu khỏi luminance</summary>
      <div class="arc-card-body">
        <p><strong>Color</strong>: ghép hue+saturation của trên với luminance của dưới. Dùng cho coloring ảnh đen trắng, sửa color cast. <strong>Luminosity</strong>: ngược lại — sharpen mà không đụng đến color (high-pass + Luminosity).</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Blending Mode trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photo Retouch &amp; Color Grading</h3>
    <ul class="arc-list">
      <li>Dodge &amp; burn: layer 50% gray + Overlay/Soft Light, paint white/black</li>
      <li>Frequency separation: dùng Linear Light cho high frequency</li>
      <li>Color grading: Solid color layer + Color blend</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Digital Painting &amp; Illustration</h3>
    <ul class="arc-list">
      <li>Multiply layer cho shadow, Color/Overlay cho lighting effect</li>
      <li>Procreate, Photoshop digital painting: 80% workflow dùng blending mode</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Composite &amp; VFX</h3>
    <ul class="arc-list">
      <li>Add fire, explosion: Screen mode loại bỏ vùng đen</li>
      <li>Light wrap, glow effect: Screen với blurred copy</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Graphic Design</h3>
    <ul class="arc-list">
      <li>Multiply: chữ trên textured background giữ texture</li>
      <li>Color: đổi màu logo nhanh không cần repaint</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Blending mode trong After Effects khác với Photoshop</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> AE và PS có định nghĩa khác nhau cho một số mode (Soft Light đặc biệt).</p>
        <p><strong>Cách fix:</strong> trong AE, dùng &quot;Soft Light - Photoshop&quot; nếu cần match. Test mode khác nếu kết quả không khớp expected.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blending mode không hiển thị đúng trong export PNG</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> blending cần layer dưới — khi flatten/save with no background, kết quả thay đổi.</p>
        <p><strong>Cách fix:</strong> &quot;Stamp Visible&quot; (Ctrl+Alt+Shift+E) để flatten trước khi export. Hoặc dùng PSD nếu cần giữ blend layer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Overlay quá gay gắt</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> Overlay có effect mạnh, opacity 100% thường quá nhiều.</p>
        <p><strong>Cách fix:</strong> giảm opacity (40-60%), hoặc đổi sang Soft Light cho nhẹ hơn.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 03. Blocking
  {
    id: "ae8c39af-98f9-455e-9d9f-75506f602dc3",
    tieu_de: "Blocking",
    tieu_de_viet: "Blocking (giai đoạn dàn dựng)",
    tom_tat:
      "Blocking là giai đoạn đầu của animation/film — dựng pose chính, timing tổng quát, blocking camera. Bước nền tảng quyết định cảm xúc và nhịp diễn trước khi đi vào polish chi tiết.",
    meta_title: "Blocking là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Blocking trong animation và film — dựng pose, timing, camera trước khi polish. Tìm hiểu workflow blocking, splining, polish cho animator.",
    noi_dung: `
<section class="arc-intro">
  <p>Animator giỏi bắt đầu một cảnh diễn xuất không bằng tinh chỉnh từng frame mà bằng việc đặt 5-10 pose chính — đủ để hiểu nhân vật &quot;đang làm gì&quot;. Đạo diễn xem được nhịp diễn ngay; nếu cảm xúc sai, sửa ở giai đoạn này tốn 30 phút thay vì 2 ngày polish lại. Đây là sức mạnh của blocking.</p>
  <p>Blocking là một trong những kỹ năng quan trọng nhất phân biệt animator giỏi với animator mới. Hiểu blocking workflow giúp tiết kiệm hàng giờ làm việc và đảm bảo nhịp diễn đúng từ đầu, thay vì &quot;đánh bóng&quot; một cảnh sai về tốc độ.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Blocking là gì?</h2>
  <p>Blocking là giai đoạn đầu tiên trong quá trình animation hoặc filmmaking, nơi các pose/khoảnh khắc chính (key pose) và timing tổng quát được thiết lập. Trong animation, đó là việc đặt keyframe cho pose quan trọng nhất; trong phim live-action, đó là dàn cảnh diễn viên, vị trí camera trong không gian.</p>
  <p>Mục tiêu của blocking: trả lời câu hỏi &quot;cảnh này diễn cái gì, ở đâu, khi nào&quot; trước khi đầu tư vào chi tiết. Blocking tốt = cảnh đã có đủ thông tin để duyệt; chỉ thiếu polish. Blocking sai = polish bao nhiêu cũng không cứu được nhịp diễn.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">3 giai đoạn của Animation workflow</span>
    <p>(1) <strong>Blocking</strong>: đặt key pose, timing tổng. Mỗi pose hold cứng, không có inbetween. (2) <strong>Splining/Breakdown</strong>: chuyển từ hold sang interpolate, thêm breakdown pose. (3) <strong>Polish</strong>: tinh chỉnh từng frame, secondary motion, lip sync. Mỗi giai đoạn cần được duyệt trước khi sang giai đoạn sau.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Key pose</strong> — pose quan trọng định nghĩa moment của cảnh</li>
    <li><strong>Stepped mode</strong> — animation hold cứng giữa key, không nội suy (chuẩn blocking)</li>
    <li><strong>Spline mode</strong> — animation nội suy mượt giữa key (sau blocking)</li>
    <li><strong>Breakdown pose</strong> — pose phụ giữa hai key pose chính</li>
    <li><strong>Beat</strong> — đơn vị nhịp diễn — mỗi beat thường có pose riêng</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"animation blocking key poses stepped mode workflow"</span>
    </div>
    <p class="arc-image-caption">Blocking animation — chuỗi key pose stepped, mỗi pose hold cứng, đủ để cảm nhịp diễn</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Blocking trong từng pipeline</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Character Animation 3D</title>
      <div class="arc-card-body">
        <p>Animator xem reference (video tham khảo) → xác định key pose → đặt key pose trên timeline ở Stepped mode. Hold mỗi pose 6-12 frame tùy timing. Duyệt nội bộ và với supervisor trước khi sang splining.</p>
        <ul class="arc-list">
          <li>Maya: F9 → Stepped tangent</li>
          <li>Blender: T → Constant interpolation</li>
        </ul>
      </div>
    </details>
    <details class="arc-card">
      <summary>2D Animation</title>
      <div class="arc-card-body">
        <p>Tương tự 3D — vẽ key pose trên timeline đầu tiên (đôi khi gọi &quot;rough&quot;). Inbetween animator hoặc tweener sẽ vẽ frame trung gian sau. Toon Boom Harmony, TVPaint là tool chuẩn.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Film Live-Action — Camera Blocking</summary>
      <div class="arc-card-body">
        <p>Đạo diễn và DOP dàn cảnh diễn viên trong location, đánh dấu vị trí (mark) cho diễn viên di chuyển. Xác định camera angle, shot size, movement. Thường rehearse với diễn viên trước khi quay.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Theatre &amp; Stage</summary>
      <div class="arc-card-body">
        <p>Blocking nguồn gốc từ sân khấu — directors block diễn viên di chuyển trên sân khấu trước khi rehearse dialogue và emotion. Khái niệm sau đó được mượn sang film và animation.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Blocking trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation Studio</h3>
    <ul class="arc-list">
      <li>Blocking pass là milestone bắt buộc — duyệt với supervisor trước khi splining</li>
      <li>Pixar, DreamWorks có quy trình rất strict: thumbnail → blocking → blocking plus → spline → polish</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Cinematic</h3>
    <ul class="arc-list">
      <li>Cutscene của game AAA dùng workflow animation chuẩn — blocking trước polish</li>
      <li>Naughty Dog, Insomniac đầu tư blocking sâu cho narrative cutscene</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX Performance Capture</h3>
    <ul class="arc-list">
      <li>Mocap data làm base, animator block lại pose chính, cleanup, polish</li>
      <li>&quot;Keyframe + mocap&quot; pipeline phổ biến — blocking giúp animator control lại performance</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Quảng cáo &amp; Motion Graphics</h3>
    <ul class="arc-list">
      <li>Motion graphics khác character — blocking thường là &quot;rough storyboard with timing&quot;</li>
      <li>Setup chính: layout key element, timing đại khái, music sync</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Blocking hiệu quả</h2>
  <ul class="arc-list">
    <li><strong>Reference video trước khi block</strong> — không dựa vào trí nhớ, quay reference bản thân hoặc tìm trên video</li>
    <li><strong>Thumbnail sketch</strong> — vẽ rough thumbnail của key pose trước khi vào software</li>
    <li><strong>Stepped mode bắt buộc</strong> — đừng dùng spline ngay; spline che dấu sai timing</li>
    <li><strong>Get approval trước khi spline</strong> — sửa timing ở blocking tốn 1h, ở polish tốn 1 ngày</li>
    <li><strong>Don&apos;t skip step</strong> — đi thẳng từ blocking sang polish bỏ qua splining → ra cảnh &quot;sai sai&quot;</li>
  </ul>
</section>
`,
  },

  // 04. Bố cục (Composition)
  {
    id: "073e2c90-d6b5-488f-b3e0-8e0364c751ef",
    tieu_de: "Bố cục",
    tieu_de_viet: "Bố cục (Composition)",
    tom_tat:
      "Bố cục là cách sắp xếp các yếu tố thị giác trong khung hình — quyết định hướng nhìn, cảm xúc và hiệu quả truyền đạt của tác phẩm. Nền tảng của nhiếp ảnh, hội họa, thiết kế và điện ảnh.",
    meta_title: "Bố cục (Composition) là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Bố cục là cách sắp xếp yếu tố thị giác trong khung hình. Tìm hiểu quy tắc 1/3, golden ratio, leading lines và ứng dụng trong photo, design, phim.",
    noi_dung: `
<section class="arc-intro">
  <p>Hai bức ảnh chụp cùng đối tượng, cùng ánh sáng — bức A nhìn cuốn hút, bức B nhìn &quot;thường thôi&quot;. Khác biệt thường nằm ở bố cục: nơi đặt chủ thể, cách dẫn mắt, cân bằng giữa các yếu tố. Đây là kỹ năng nền tảng phân biệt creative chuyên nghiệp với amateur.</p>
  <p>Bố cục là kỹ năng cảm thụ thị giác cơ bản nhất cho mọi nghề sáng tạo — photographer, designer, painter, filmmaker, motion graphics artist. Hiểu nguyên tắc bố cục giúp bạn không chỉ &quot;làm cho đẹp&quot; mà còn dẫn dắt cảm xúc người xem theo ý đồ cụ thể.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Bố cục là gì?</h2>
  <p>Bố cục (composition) là cách sắp xếp và tổ chức các yếu tố thị giác — chủ thể, nền, đường nét, khối, màu sắc, ánh sáng — trong khung hình hoặc không gian thiết kế. Mục tiêu: tạo trải nghiệm thị giác có chủ đích, dẫn mắt người xem theo trình tự mong muốn và truyền tải thông điệp hoặc cảm xúc cụ thể.</p>
  <p>Bố cục không phải là quy tắc cứng — đó là tập hợp các nguyên lý cảm thụ đã được nhân loại đúc kết qua hàng nghìn năm hội họa, nhiếp ảnh. Master các nguyên lý xong rồi mới có thể &quot;phá&quot; có chủ đích để tạo style riêng.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Bố cục tốt = mắt người xem &quot;chảy&quot; tự nhiên</span>
    <p>Khi xem một tác phẩm có bố cục tốt, mắt người xem di chuyển theo một &quot;trình tự&quot; tự nhiên — từ điểm nhấn chính, qua các điểm phụ, rồi quay lại. Mắt không bị &quot;mắc kẹt&quot; ở rìa, không bị nhảy nhót lung tung. Đây là dấu hiệu của bố cục thành công.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Focal point</strong> — điểm nhấn chính, nơi mắt người xem dừng đầu tiên</li>
    <li><strong>Rule of Thirds</strong> — chia khung 3×3, đặt chủ thể tại giao điểm</li>
    <li><strong>Leading lines</strong> — đường dẫn mắt từ rìa vào focal point</li>
    <li><strong>Balance</strong> — cân bằng trọng lượng thị giác giữa hai bên</li>
    <li><strong>Negative space</strong> — không gian trống, &quot;thở&quot; cho composition</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"composition rule of thirds photography golden ratio diagram"</span>
    </div>
    <p class="arc-image-caption">Quy tắc 1/3 và golden ratio — hai khung composition phổ biến nhất trong nhiếp ảnh và design</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các nguyên tắc Bố cục cơ bản</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Rule of Thirds — quy tắc 1/3</summary>
      <div class="arc-card-body">
        <p>Chia khung hình thành 3×3 ô bằng nhau (2 đường ngang, 2 đường dọc). Đặt chủ thể tại một trong 4 giao điểm. Đây là &quot;safe choice&quot; cho bố cục cân đối, năng động hơn đặt chính giữa.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Golden Ratio / Fibonacci Spiral</summary>
      <div class="arc-card-body">
        <p>Tỷ lệ vàng (1:1.618) — quy tắc bố cục cổ điển từ thời Phục hưng. Spiral Fibonacci dẫn mắt theo đường xoắn ốc — phổ biến trong photography artistic và painting.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Leading Lines — đường dẫn mắt</summary>
      <div class="arc-card-body">
        <p>Dùng đường (đường ngang, đường chéo, đường cong) để dẫn mắt từ rìa khung hình đến chủ thể. Đường ray xe lửa, lối đi, sông ngòi là leading line tự nhiên phổ biến.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Symmetry &amp; Asymmetry</summary>
      <div class="arc-card-body">
        <p>Symmetry (đối xứng) tạo cảm giác trang nghiêm, ổn định. Asymmetry tạo năng động, hấp dẫn. Cả hai đều hợp lệ tùy mood muốn truyền tải.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Negative Space — không gian trống</summary>
      <div class="arc-card-body">
        <p>Vùng trống quanh chủ thể giúp chủ thể &quot;thở&quot;, nổi bật hơn. Minimalist design phụ thuộc lớn vào negative space.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Framing — đóng khung trong khung</summary>
      <div class="arc-card-body">
        <p>Dùng yếu tố trong cảnh (cửa sổ, vòm, lá cây) làm khung tự nhiên cho chủ thể — tăng chiều sâu và focus.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Bố cục trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Nhiếp ảnh</h3>
    <ul class="arc-list">
      <li>Rule of Thirds là &quot;default&quot; — bật grid trong camera/phone</li>
      <li>Leading lines: đường ray, đường mòn, hàng cột — dẫn mắt vào subject</li>
      <li>Negative space cho chân dung tối giản</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Thiết kế đồ họa</h3>
    <ul class="arc-list">
      <li>Visual hierarchy — element quan trọng có visual weight lớn</li>
      <li>Grid system tổ chức bố cục poster, web layout</li>
      <li>Asymmetric balance tạo dynamic, symmetric tạo formal</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Điện ảnh &amp; TV</h3>
    <ul class="arc-list">
      <li>DOP composition mỗi shot — frame trong frame, leading lines cinematic</li>
      <li>Aspect ratio (1.85, 2.39) ảnh hưởng cách composition</li>
      <li>Movement trong frame cũng là bố cục theo thời gian</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Digital Painting &amp; Concept Art</h3>
    <ul class="arc-list">
      <li>Thumbnail sketch nhiều variation trước khi vào painting chi tiết</li>
      <li>Value structure (light/dark) trước color để composition mạnh</li>
      <li>Atmospheric perspective + composition tạo chiều sâu epic</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">UI/UX</h3>
    <ul class="arc-list">
      <li>F-pattern, Z-pattern reading flow cho web</li>
      <li>Visual hierarchy quyết định element nào user notice trước</li>
      <li>Grid system (8pt, 12-column) tổ chức layout có thể scale</li>
    </ul>
  </div>
</section>
`,
  },

  // 05. Bokeh
  {
    id: "0a0732fe-e4ea-40eb-890d-c6c1d0f44415",
    tieu_de: "Bokeh",
    tieu_de_viet: "Hiệu ứng Bokeh",
    tom_tat:
      "Bokeh là chất lượng vùng mờ (out-of-focus) trong ảnh — tạo ra những vòng sáng mềm phía sau chủ thể. Yếu tố thẩm mỹ quan trọng trong nhiếp ảnh chân dung, sản phẩm và cinematography.",
    meta_title: "Bokeh là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Bokeh là chất lượng vùng mờ trong ảnh — tạo vòng sáng mềm. Tìm hiểu cách tạo bokeh trong nhiếp ảnh, ống kính nào cho bokeh đẹp và mô phỏng trong Photoshop.",
    noi_dung: `
<section class="arc-intro">
  <p>Bức chân dung cô dâu phía sau là dãy đèn Giáng sinh — không phải dãy đèn rõ nét, mà là những vòng sáng tròn mềm mại như ngọc trai lung linh. Chính những vòng sáng đó tạo nên không khí mơ mộng đặc biệt của bức ảnh. Đây là bokeh — một trong những đặc trưng thị giác được săn đón nhất của nhiếp ảnh chuyên nghiệp.</p>
  <p>Bokeh là yếu tố thẩm mỹ then chốt trong nhiếp ảnh chân dung, sản phẩm và cinematography. Hiểu cách tạo bokeh đẹp giúp photographer chọn được equipment phù hợp, kỹ thuật chụp đúng và mô phỏng bokeh khi cần trong post-production.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Bokeh là gì?</h2>
  <p>Bokeh (từ tiếng Nhật &quot;ぼけ&quot; — &quot;mờ&quot;) là chất lượng và đặc tính thị giác của vùng out-of-focus trong ảnh — đặc biệt là cách các điểm sáng (highlights, đèn) ngoài vùng nét được render thành các hình tròn hoặc nhiều cạnh mềm mại. Bokeh không chỉ là &quot;mờ&quot; — nó là cách phân biệt giữa mờ đẹp (smooth, creamy) và mờ xấu (busy, harsh).</p>
  <p>Chất lượng bokeh phụ thuộc nhiều vào thiết kế ống kính — số lá khẩu (aperture blade), độ tròn của khẩu, aberration. Ống kính chuyên dùng cho bokeh thường có khẩu lớn (f/1.4, f/1.2, f/0.95) và nhiều lá khẩu tròn.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Bokeh ≠ Shallow Depth of Field</span>
    <p>Shallow DOF là <em>lượng</em> vùng mờ (mờ nhiều hay ít). Bokeh là <em>chất lượng</em> của vùng mờ (đẹp hay không). Bạn có thể có shallow DOF với bokeh tệ (vòng sáng méo, viền cứng) hoặc bokeh đẹp với DOF không quá shallow.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Aperture</strong> — khẩu độ; mở càng lớn (f/1.4 vs f/8) thì DOF càng shallow, bokeh càng rõ</li>
    <li><strong>Focal length</strong> — ống kính tele (85mm, 135mm) có bokeh mạnh hơn wide</li>
    <li><strong>Distance</strong> — gần subject + xa background = bokeh nhiều</li>
    <li><strong>Aperture blade</strong> — 9 lá tròn cho bokeh tròn; 7 lá có thể có cạnh</li>
    <li><strong>Bokeh balls</strong> — vòng sáng tròn từ điểm sáng nền out of focus</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"bokeh portrait photography 85mm f/1.4 background lights"</span>
    </div>
    <p class="arc-image-caption">Chân dung với bokeh đẹp — vòng sáng tròn mềm mại từ đèn nền out-of-focus</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Bokeh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Round Bokeh — bokeh tròn lý tưởng</summary>
      <div class="arc-card-body">
        <p>Vòng sáng hoàn toàn tròn, viền mềm. Đạt được nhờ aperture có nhiều lá (9+) và khẩu tròn. Ống kính chân dung cao cấp (85mm f/1.4, 50mm f/1.2) thường có round bokeh đẹp.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cat&apos;s Eye Bokeh — bokeh ở rìa khung hình</summary>
      <div class="arc-card-body">
        <p>Vòng sáng ở rìa khung hình bị &quot;cắt&quot; thành hình mắt mèo (oval). Do mechanical vignetting — phổ biến ở ống kính khẩu lớn (f/1.4 trở xuống). Có người yêu thích, có người ghét.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Onion Ring Bokeh</summary>
      <div class="arc-card-body">
        <p>Vòng sáng có các đường tròn đồng tâm như vòng hành tây — artifact của ống kính có aspherical element không hoàn hảo. Thường bị xem là &quot;bokeh xấu&quot;.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Swirly Bokeh — bokeh xoáy ốc</summary>
      <div class="arc-card-body">
        <p>Bokeh bị &quot;xoáy&quot; theo edge khung hình — đặc trưng của ống kính cổ (Helios 44-2, Petzval). Đặc biệt được photographer artistic yêu thích cho mood vintage.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Polygonal Bokeh — bokeh đa giác</summary>
      <div class="arc-card-body">
        <p>Khi khẩu bị stop down (f/4, f/5.6...), bokeh có hình đa giác theo số lá khẩu (6 lá → lục giác). Không phải lúc nào cũng &quot;xấu&quot; — có thể có thẩm mỹ riêng.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Bokeh trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Nhiếp ảnh chân dung</h3>
    <ul class="arc-list">
      <li>85mm f/1.4, 105mm f/1.4 là ống kính chân dung &quot;bokeh king&quot;</li>
      <li>Sigma 35mm f/1.2, Canon 85mm f/1.2 cho bokeh extreme</li>
      <li>Smartphone &quot;Portrait Mode&quot; mô phỏng bokeh bằng AI + nhiều camera</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cinematography &amp; Video</h3>
    <ul class="arc-list">
      <li>Cine lens (ARRI Master Prime, Cooke S4) có bokeh quality controlled</li>
      <li>Anamorphic lens cho bokeh oval đặc trưng — &quot;cinematic look&quot;</li>
      <li>Vintage lens (Helios, Pentax SMC) cho swirly bokeh artistic</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Product Photography</h3>
    <ul class="arc-list">
      <li>Macro lens với khẩu lớn cho product close-up — bokeh tạo focus và premium feel</li>
      <li>Jewelry, food photography phụ thuộc vào bokeh để tách subject khỏi background</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Post-production / VFX</h3>
    <ul class="arc-list">
      <li>Photoshop Iris Blur, Lens Blur mô phỏng bokeh trên ảnh chụp DOF sâu</li>
      <li>3D render: bokeh-aware DOF (Arnold, V-Ray) cho cinematic CG</li>
      <li>After Effects/Nuke có bokeh plugin cho post DOF</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tạo Bokeh trong Photoshop</h2>
  <ul class="arc-list">
    <li><strong>Iris Blur</strong> — Filter → Blur Gallery → Iris Blur — tạo bokeh radius có thể control shape</li>
    <li><strong>Lens Blur</strong> — Filter → Blur → Lens Blur, set Iris shape và Specular Highlights cho bokeh balls</li>
    <li><strong>Depth Map</strong> — tạo depth mask cho controlled DOF (depth ước lượng từ ảnh hoặc generate AI)</li>
    <li><strong>Custom shape brush</strong> — vẽ bokeh balls thủ công bằng brush soft với star/heart shape</li>
    <li><strong>Lưu ý</strong>: bokeh thật vẫn đẹp hơn mô phỏng — chỉ dùng khi không quay/chụp lại được</li>
  </ul>
</section>
`,
  },

  // 06. Bounce Expression
  {
    id: "2ac98dd9-6848-4bff-9acb-c9237c733e1d",
    tieu_de: "Bounce Expression",
    tieu_de_viet: "Bounce Expression (After Effects)",
    tom_tat:
      "Bounce Expression là đoạn code JavaScript ngắn trong After Effects tạo chuyển động nảy bật tự nhiên — thay thế việc đặt thủ công hàng chục keyframe. Một trong những expression hữu dụng nhất cho motion designer.",
    meta_title: "Bounce Expression là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Bounce Expression tạo chuyển động nảy bật trong After Effects bằng code ngắn. Tìm hiểu cách áp dụng, tweak amplitude/frequency và workflow motion graphics.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn muốn làm logo nhảy vào màn hình với chuyển động bounce — đáp xuống và nảy lên vài lần trước khi dừng. Đặt thủ công thì cần 8-10 keyframe với timing chính xác. Hoặc — gắn một dòng expression vào property scale, thay đổi 2 tham số, là xong. Đây là Bounce Expression.</p>
  <p>Bounce Expression là kỹ năng then chốt cho motion designer làm việc trong After Effects. Hiểu và customize được expression giúp tạo ra animation thông minh, có thể adjust nhanh chóng và áp dụng được cho hàng chục layer cùng lúc.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Bounce Expression là gì?</h2>
  <p>Bounce Expression là một đoạn code JavaScript (Expression) trong After Effects được gắn vào property của layer (Position, Scale, Rotation, Opacity) để tạo chuyển động nảy bật mô phỏng vật lý — như quả bóng nảy giảm dần. Thay vì đặt thủ công 8-15 keyframe, bạn chỉ cần 2 keyframe đầu/cuối và expression tự tính toán bounce sau đó.</p>
  <p>Expression sử dụng hàm <code>thisProperty.key()</code> để truy cập keyframe có sẵn, kết hợp với <code>Math.sin()</code> và <code>Math.exp()</code> tạo dao động giảm dần. Bạn có thể tweak 2 tham số chính: <strong>amplitude</strong> (độ mạnh nảy) và <strong>frequency</strong> (tần suất dao động).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Expression vs Keyframe — khi nào dùng cái nào</span>
    <p><strong>Keyframe</strong>: control tuyệt đối, mỗi frame nắm chắc. <strong>Expression</strong>: dynamic, dễ chỉnh, có thể link cross-property. Bounce expression hữu ích vì bouncing là dao động toán học rõ ràng — code mô tả gọn hơn nhiều keyframe.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Amplitude</strong> — biên độ nảy đầu tiên (cao bao nhiêu)</li>
    <li><strong>Frequency</strong> — tốc độ dao động (nảy nhanh hay chậm)</li>
    <li><strong>Decay</strong> — tốc độ giảm dần biên độ qua mỗi nảy</li>
    <li><strong>key(1) / key(2)</strong> — keyframe thứ nhất và thứ hai làm input cho expression</li>
    <li><strong>velocity</strong> — tốc độ tại thời điểm key cuối, dùng để tính cường độ bounce</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"after effects bounce expression motion graphics ball example"</span>
    </div>
    <p class="arc-image-caption">Bounce expression áp lên scale layer — logo nảy giảm dần tự nhiên</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Cách áp dụng Bounce Expression</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Setup cơ bản</summary>
      <div class="arc-card-body">
        <p>1. Đặt 2 keyframe trên property muốn bounce (vd Position: A → B). 2. Alt+click vào stopwatch của property → expression panel mở. 3. Dán expression bounce code. 4. Chỉnh amplitude/frequency.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Code Bounce Expression cổ điển</summary>
      <div class="arc-card-body">
        <p>Một version phổ biến — gắn vào property bất kỳ với 2 keyframe đầu/cuối:</p>
        <pre><code>amp = 0.1; // biên độ
freq = 2.0; // tần suất
decay = 4.0; // giảm dần
n = 0;
if (numKeys &gt; 0) {
  n = nearestKey(time).index;
  if (key(n).time &gt; time) n--;
}
if (n == 0) value
else {
  t = time - key(n).time;
  value + amp * Math.sin(freq * t * Math.PI * 2) / Math.exp(decay * t) * (value - key(n).value);
}</code></pre>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tweak parameters</summary>
      <div class="arc-card-body">
        <p>Tăng <strong>amp</strong> → nảy cao hơn. Tăng <strong>freq</strong> → nảy nhanh hơn. Tăng <strong>decay</strong> → tắt nhanh hơn. Thử 3-5 lần để tìm feel phù hợp.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Áp lên nhiều layer cùng lúc</summary>
      <div class="arc-card-body">
        <p>Copy expression từ một layer (Edit → Copy Expression Only) sang nhiều layer khác. Kết hợp với offset thời gian để stagger animation.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Bounce Expression trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Graphics &amp; Title</h3>
    <ul class="arc-list">
      <li>Logo reveal: scale bounce vào màn hình</li>
      <li>Text animation: position bounce từ ngoài vào</li>
      <li>UI element: button click feedback với bounce nhẹ</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Explainer Video</h3>
    <ul class="arc-list">
      <li>Element bounce vào màn hình tạo personality, friendly feel</li>
      <li>Combined với squash &amp; stretch cho character cartoon style</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">UI Animation</h3>
    <ul class="arc-list">
      <li>iOS-style bounce khi scroll quá đầu/cuối</li>
      <li>Notification badge nảy lên khi xuất hiện</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Quảng cáo &amp; Social Content</h3>
    <ul class="arc-list">
      <li>Product reveal trong Instagram ads — bounce tạo cảm giác playful</li>
      <li>Stickers, emoji animation cho Stories</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Expression không chạy / hiển thị màu đỏ</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> syntax error, hoặc property type không khớp (vd array vs scalar).</p>
        <p><strong>Cách fix:</strong> đọc error message ở góc layer. Đảm bảo expression trả về cùng type với property (Position là array 2D, Opacity là scalar).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bounce quá nhiều, không tự nhiên</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> decay quá thấp, hoặc amp quá cao.</p>
        <p><strong>Cách fix:</strong> tăng decay (4-8), giảm amp (0.05-0.2). Reference video thực để cảm bouncing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Render chậm với nhiều expression</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> expression tính lại mỗi frame, áp lên hàng trăm layer làm chậm preview.</p>
        <p><strong>Cách fix:</strong> bake expression thành keyframe (Animation → Keyframe Assistant → Convert Expression to Keyframes) khi animation đã final.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 07. Brand Identity
  {
    id: "e3447ba4-1f78-4cec-abb6-9642f7f9b357",
    tieu_de: "Brand Identity",
    tieu_de_viet: "Nhận diện thương hiệu",
    tom_tat:
      "Brand Identity là tập hợp các yếu tố thị giác và phi thị giác tạo nên cách thương hiệu được nhận biết và cảm nhận — bao gồm logo, màu sắc, typography, giọng điệu và giá trị cốt lõi.",
    meta_title: "Brand Identity là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Brand Identity là nhận diện thương hiệu toàn diện — logo, màu sắc, typography, giọng điệu. Tìm hiểu các thành phần và quy trình xây dựng brand identity.",
    noi_dung: `
<section class="arc-intro">
  <p>Nhìn vào dấu tick Nike, hộp xanh Tiffany, font tròn của Coca-Cola — bạn nhận ra ngay không cần đọc tên. Đó là sức mạnh của brand identity được xây dựng nhất quán qua nhiều thập kỷ. Mỗi tương tác với thương hiệu — từ logo đến packaging đến cách họ trả lời email — đều củng cố cảm nhận trong đầu khách hàng.</p>
  <p>Brand Identity là kiến thức nền tảng cho designer, marketer và founder. Hiểu cấu trúc và quy trình xây brand identity giúp tạo ra thương hiệu nhất quán, dễ nhớ và xây dựng được niềm tin lâu dài — thay vì &quot;design đẹp&quot; rời rạc.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Brand Identity là gì?</h2>
  <p>Brand Identity là tập hợp các yếu tố hữu hình và vô hình tạo nên cách một thương hiệu được nhận biết, cảm nhận và phân biệt với các thương hiệu khác. Bao gồm yếu tố thị giác (logo, màu sắc, typography, imagery) và phi thị giác (giọng điệu, giá trị, mission, personality).</p>
  <p>Khác biệt với <strong>Brand</strong> (toàn bộ cảm nhận về thương hiệu trong đầu khách hàng — bao gồm cả product, service) và <strong>Brand Image</strong> (cách thương hiệu thực sự được cảm nhận), Brand Identity là phần thương hiệu chủ động thiết kế và kiểm soát.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Brand Identity ≠ Logo</span>
    <p>Nhiều người nhầm brand identity = logo. Thực ra logo chỉ là một phần. Brand identity còn bao gồm typography system, color palette, photography style, illustration style, voice &amp; tone, motion principles. Nestlé có logo, Apple có logo — nhưng identity của hai brand khác nhau toàn diện ở mọi mặt.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Logo</strong> — biểu tượng đại diện thương hiệu</li>
    <li><strong>Color Palette</strong> — màu primary, secondary cho mọi material</li>
    <li><strong>Typography</strong> — font headline, body, accent</li>
    <li><strong>Imagery Style</strong> — phong cách ảnh, illustration</li>
    <li><strong>Voice &amp; Tone</strong> — cách viết, cách nói của thương hiệu</li>
    <li><strong>Brand Guideline</strong> — tài liệu quy định cách áp dụng đúng identity</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"brand identity design system logo typography color palette"</span>
    </div>
    <p class="arc-image-caption">Brand identity toàn diện — logo, color, typography, imagery, voice nhất quán xuyên suốt</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các thành phần của Brand Identity</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Logo &amp; Logotype</summary>
      <div class="arc-card-body">
        <p>Symbol chính của thương hiệu. Có thể là wordmark (chữ — Coca-Cola), lettermark (chữ viết tắt — IBM), pictorial mark (hình — Apple), abstract mark (Nike swoosh), hoặc combination. Variant: full logo, icon, monochrome, dark/light background.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Palette</summary>
      <div class="arc-card-body">
        <p>Primary color (1-2), secondary colors (3-5), neutral colors (đen, xám, trắng). Đặc tả ở mã hex, RGB, CMYK, Pantone. Tiffany Blue (#0ABAB5) là ví dụ kinh điển của brand color đặc trưng.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Typography System</summary>
      <div class="arc-card-body">
        <p>Headline font (eyecatch, distinctive), Body font (readable), Accent font (cho display/quote). Pairing typography là kỹ năng then chốt — serif + sans-serif là combination phổ biến.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Imagery &amp; Photography Style</summary>
      <div class="arc-card-body">
        <p>Phong cách ảnh chính: documentary, studio, candid, conceptual. Color treatment (warm/cool, high contrast), subject matter (people, product, abstract).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Voice &amp; Tone</summary>
      <div class="arc-card-body">
        <p>Cách thương hiệu &quot;nói&quot;. Voice là tính cách (friendly, expert, playful, serious) — consistent. Tone thay đổi theo context (social casual hơn legal). Mailchimp brand guide có voice &amp; tone framework nổi tiếng.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Motion &amp; Sound Identity</summary>
      <div class="arc-card-body">
        <p>Brand modern bao gồm motion principles (cách element move) và sonic logo (Intel chime, McDonald&apos;s &quot;ba-da-ba-ba-ba&quot;). Quan trọng cho digital và broadcast.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Quy trình xây dựng Brand Identity</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Brand Strategy</h3>
    <ul class="arc-list">
      <li>Định nghĩa: mission, vision, values, target audience, positioning</li>
      <li>Brand personality (Aaker framework: sincerity, excitement, competence, sophistication, ruggedness)</li>
      <li>Output: brand strategy doc làm nền cho design</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Research &amp; Mood Boarding</h3>
    <ul class="arc-list">
      <li>Competitive analysis — brand identity của đối thủ và whitespace</li>
      <li>Mood board — visual reference cho concept</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Design — Logo, Color, Type</h3>
    <ul class="arc-list">
      <li>Sketch nhiều direction → narrow xuống 3 → develop chi tiết 1</li>
      <li>Test trên mọi medium: small icon, large billboard, B&amp;W, color</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. System &amp; Application</h3>
    <ul class="arc-list">
      <li>Áp identity lên business card, letterhead, packaging, website, social</li>
      <li>Mockup mỗi touchpoint để demo cho client</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Brand Guideline</h3>
    <ul class="arc-list">
      <li>Tài liệu quy định: logo usage, color codes, typography rules, do/don&apos;t</li>
      <li>Bonus: voice &amp; tone guide, photography direction, motion principles</li>
    </ul>
  </div>
</section>
`,
  },

  // 08. Broadcast Graphics
  {
    id: "2a24b14b-083f-4383-b605-8deeb9ccd556",
    tieu_de: "Broadcast Graphics",
    tieu_de_viet: "Đồ họa truyền hình",
    tom_tat:
      "Broadcast Graphics là đồ họa chuyển động cho TV — bao gồm lower thirds, bumper, news ticker, scoreboard và các yếu tố on-air khác. Lĩnh vực chuyên môn đòi hỏi cả thiết kế và kỹ thuật vận hành live.",
    meta_title: "Broadcast Graphics là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Broadcast Graphics là đồ họa chuyển động cho TV và live broadcast. Tìm hiểu lower thirds, bumpers, news ticker, scoreboard và workflow chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem trận đấu World Cup — tỷ số góc trên cập nhật realtime, lower third giới thiệu cầu thủ vừa ghi bàn, replay slow-motion với graphics overlay. Đây không phải hậu kỳ ở studio mà là broadcast graphics — tất cả hiển thị live, được vận hành bởi đội ngũ kỹ thuật ngồi tại OB van ngoài sân.</p>
  <p>Broadcast Graphics là lĩnh vực giao điểm giữa motion design và kỹ thuật truyền hình. Hiểu workflow broadcast giúp motion designer mở rộng sang sản xuất TV/live event — một thị trường lớn và technical specific khác với motion graphics cho web.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Broadcast Graphics là gì?</h2>
  <p>Broadcast Graphics là tập hợp các yếu tố đồ họa chuyển động được sản xuất cho truyền hình và live broadcast — bao gồm tên người nói (lower thirds), intro chương trình (bumpers, idents), thông tin chạy (ticker, crawl), scoreboard, weather overlay, election results, và mọi graphic xuất hiện trên sóng.</p>
  <p>Khác với motion graphics cho web/social (render offline, play file), broadcast graphics thường hiển thị live — kết nối với data realtime, được vận hành bởi operator. Yêu cầu kỹ thuật và workflow khác hẳn motion graphics &quot;truyền thống&quot;.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Broadcast vs Motion Graphics — khác nhau cốt lõi</span>
    <p>Motion graphics cho YouTube/social: render file MP4, deliver. Broadcast: template được build trong tool chuyên dụng (Viz Artist, ChyronHego), data live link với database, operator điều khiển on-air. Cần hiểu cả design và kỹ thuật vận hành.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Lower Third</strong> — graphic ở 1/3 dưới màn hình giới thiệu speaker, location</li>
    <li><strong>Bumper / Sting</strong> — animation ngắn giữa các phân đoạn, trước break</li>
    <li><strong>Ident / Bug</strong> — logo channel góc màn hình</li>
    <li><strong>Ticker / Crawl</strong> — text chạy ngang dưới cùng (news, finance)</li>
    <li><strong>L-Bar</strong> — graphic phức tạp chiếm trái + dưới khung hình</li>
    <li><strong>Safe Area</strong> — vùng an toàn của TV (90% center)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"broadcast graphics tv news lower third sports scoreboard"</span>
    </div>
    <p class="arc-image-caption">Broadcast graphics trên sóng — lower third giới thiệu speaker, ticker dưới cùng, channel bug góc</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Broadcast Graphics</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>News Graphics</summary>
      <div class="arc-card-body">
        <p>Lower thirds cho anchor và reporter, world map locator, breaking news banner, weather, sports score updates. Yêu cầu cao về realtime data integration.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sports Graphics</summary>
      <div class="arc-card-body">
        <p>Scoreboard, stats overlay, replay graphics, player intro. World Cup, Olympics có đội ngũ broadcast graphics riêng cho từng sự kiện. Vizrt và ChyronHego là tool chính của ngành.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Channel Branding / Idents</summary>
      <div class="arc-card-body">
        <p>Logo animation, bumpers giữa programs, channel identity package. MTV idents là ví dụ kinh điển của broadcast branding creative.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Show Opens / Title Sequences</summary>
      <div class="arc-card-body">
        <p>Intro animation cho show (Game of Thrones opens, Late Night talk show). Thường outsource cho studio chuyên (Imaginary Forces, Elastic).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Election &amp; Data Visualization</summary>
      <div class="arc-card-body">
        <p>Election night graphics — bản đồ vote results, polls, charts realtime. Đòi hỏi data feed + design + technical seamless integration.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Tools &amp; Workflow Broadcast Graphics</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Tools chuyên dụng cho live</h3>
    <ul class="arc-list">
      <li><strong>Vizrt (Viz Artist + Viz Engine)</strong> — chuẩn industry cho news, sports broadcast cao cấp</li>
      <li><strong>ChyronHego (Lyric)</strong> — đối thủ của Vizrt, phổ biến ở Mỹ</li>
      <li><strong>Avid Maestro</strong> — branded graphics, virtual sets</li>
      <li><strong>CasparCG</strong> — open source, dùng cho local TV và indie broadcast</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Tools cho design template</h3>
    <ul class="arc-list">
      <li>After Effects + Motion Graphics Templates (.mogrt) — export sang Premiere cho semi-live</li>
      <li>Houdini, Cinema 4D cho 3D broadcast graphics phức tạp</li>
      <li>Substance Painter, Maya cho virtual studio set</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Live Operator Role</h3>
    <ul class="arc-list">
      <li>Graphics operator ngồi tại control room hoặc OB van, vận hành template trong live show</li>
      <li>Phối hợp với director, technical director, replay operator</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lưu ý kỹ thuật cho Broadcast Graphics</h2>
  <ul class="arc-list">
    <li><strong>Safe area</strong> — chừa 5-10% rìa, content quan trọng trong 90% center</li>
    <li><strong>Resolution &amp; aspect ratio</strong> — 1920×1080 (1080i/1080p) chuẩn HD broadcast; 3840×2160 cho 4K</li>
    <li><strong>Frame rate</strong> — 25fps (PAL/châu Âu), 29.97fps (NTSC/Mỹ), 50/59.94fps cho sports motion</li>
    <li><strong>Color space</strong> — Rec.709 cho HD, Rec.2020 cho 4K HDR</li>
    <li><strong>Broadcast safe color</strong> — luminance không vượt ngưỡng (100 IRE), avoid pure black và pure white</li>
    <li><strong>Font weight</strong> — không quá thin trên TV — TV resolution thấp hơn monitor, font thin nhìn không rõ</li>
  </ul>
</section>
`,
  },

  // 09. Brochure
  {
    id: "c31a0aee-5144-42e0-a8f6-b99d9a2c8608",
    tieu_de: "Brochure",
    tieu_de_viet: "Tài liệu quảng cáo (Brochure)",
    tom_tat:
      "Brochure là ấn phẩm in nhiều trang gấp lại — dùng để giới thiệu sản phẩm, dịch vụ, công ty hoặc sự kiện một cách chi tiết. Vẫn là format phổ biến cho marketing offline dù thời đại digital.",
    meta_title: "Brochure là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Brochure là ấn phẩm in nhiều trang gấp lại để giới thiệu sản phẩm/dịch vụ. Tìm hiểu các loại brochure, kích thước chuẩn và quy trình thiết kế chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bước vào sảnh khách sạn cao cấp, một tờ brochure thiết kế tinh tế giới thiệu spa &amp; nhà hàng đặt trên bàn — bạn cầm lên xem, mở ra từng trang. Hoặc ở triển lãm thương mại, brochure giúp khách thăm có tài liệu mang về tham khảo. Dù marketing digital phát triển mạnh, brochure vẫn là touchpoint hữu hình quan trọng cho nhiều ngành.</p>
  <p>Brochure design là một trong những thiết kế in cơ bản nhất nhưng dễ bị xem nhẹ. Hiểu cấu trúc, kích thước chuẩn, fold type và workflow giúp designer làm brochure chuyên nghiệp ngay từ project đầu tiên — tránh sai sót gây lỗi in.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Brochure là gì?</h2>
  <p>Brochure là một loại ấn phẩm in nhỏ gọn, thường được gấp lại thành nhiều panel (tới 3-6 panel) hoặc ghim/đóng sách thành nhiều trang. Mục đích chính: cung cấp thông tin chi tiết về sản phẩm, dịch vụ, công ty hoặc sự kiện một cách trực quan, dễ mang theo.</p>
  <p>Khác với flyer (1 tờ một mặt hoặc hai mặt, đơn giản) và catalog (nhiều trang đóng quyển, chi tiết hơn), brochure ở giữa — nhiều thông tin hơn flyer, gọn hơn catalog. Thường được dùng trong sales kit, hotel/restaurant info, event handout, corporate intro.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Brochure vs Pamphlet vs Leaflet</span>
    <p>Tiếng Anh có nhiều term gần nhau. <strong>Brochure</strong>: ấn phẩm gấp, có hình ảnh đẹp, marketing. <strong>Pamphlet</strong>: thiên về thông tin/giáo dục, đơn giản hơn. <strong>Leaflet</strong>: tờ rơi đơn lẻ, không gấp hoặc 1 fold. Tiếng Việt thường gọi tất cả là &quot;brochure&quot; hoặc &quot;tờ gấp&quot;.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Panel</strong> — một mặt sau khi gấp; bi-fold có 4 panel, tri-fold có 6 panel</li>
    <li><strong>Fold Line</strong> — đường gấp; có thể là đường gấp đôi, gấp 3, gấp gate, gấp Z</li>
    <li><strong>Cover Panel</strong> — panel ngoài cùng, thường có headline + hero image</li>
    <li><strong>Bleed</strong> — phần tràn lề 3-5mm cho cắt giấy</li>
    <li><strong>Reading Flow</strong> — thứ tự nội dung khi người dùng mở brochure</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"brochure design tri-fold layout mockup print"</span>
    </div>
    <p class="arc-image-caption">Tri-fold brochure mở ra — 6 panel với cover, inside spread và back</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Brochure phổ biến</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Tri-fold Brochure (3 mảnh) — phổ biến nhất</summary>
      <div class="arc-card-body">
        <p>Khổ A4 (210×297mm) hoặc letter, gấp 2 lần thành 3 panel mỗi mặt = 6 panel tổng. Cover + 5 panel nội dung. Phổ biến cho service intro, menu, sales sheet.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bi-fold Brochure (2 mảnh)</summary>
      <div class="arc-card-body">
        <p>Gấp đôi thành 4 panel (2 mặt × 2 panel). Phù hợp khi nội dung không quá nhiều, hoặc cần lớn hơn (A3 gấp đôi thành A4).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Z-fold &amp; Accordion Fold</summary>
      <div class="arc-card-body">
        <p>Gấp Z (3 panel theo hình Z) hoặc accordion (4-6 panel liên tiếp như đàn xếp). Phù hợp content có flow theo step (timeline, infographic).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Gate Fold</summary>
      <div class="arc-card-body">
        <p>Hai panel ngoài gấp vào giữa như cửa, mở ra reveal panel trong. Tạo cảm giác premium, thường dùng cho real estate, luxury brochure.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Booklet (đóng quyển)</summary>
      <div class="arc-card-body">
        <p>Nhiều trang (8-32+) đóng staple hoặc perfect bind. Khi nội dung quá nhiều cho fold đơn giản. Phổ biến cho company profile, annual report.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Brochure trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Hospitality (Hotel, Resort, Restaurant)</h3>
    <ul class="arc-list">
      <li>In-room brochure giới thiệu dịch vụ, menu, hoạt động địa phương</li>
      <li>Photography quality cao là yếu tố then chốt</li>
      <li>Multiple language thường có (English + local)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Real Estate</h3>
    <ul class="arc-list">
      <li>Property brochure cao cấp: gate fold với floor plan, 3D render</li>
      <li>Print quality cao, paper stock dày, finishes (spot UV, foil) phổ biến</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Corporate / B2B</h3>
    <ul class="arc-list">
      <li>Company profile, capabilities deck dạng brochure cho meeting</li>
      <li>Annual report cho stakeholder, thường booklet 24-48 trang</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Event &amp; Conference</h3>
    <ul class="arc-list">
      <li>Program brochure tại event — schedule, speakers, venue map</li>
      <li>Trade show booklet — sales kit cho khách thăm booth</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Education &amp; Non-profit</h3>
    <ul class="arc-list">
      <li>University admission brochure cho prospective students</li>
      <li>NGO awareness brochure cho campaign</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lưu ý quan trọng khi thiết kế Brochure</h2>
  <ul class="arc-list">
    <li><strong>Setup fold line</strong> trong InDesign/Illustrator — dùng guide đánh đúng vị trí gấp</li>
    <li><strong>Bleed 3-5mm</strong> trên mọi cạnh ngoài</li>
    <li><strong>Safe area 5-7mm</strong> từ trim line — text không sát mép</li>
    <li><strong>Reading flow</strong> — thiết kế theo thứ tự người mở brochure thấy (cover → mở 1 fold → mở hoàn toàn)</li>
    <li><strong>Cover phải catch attention</strong> — headline mạnh, image hero quality</li>
    <li><strong>CTA rõ ràng ở cuối</strong> — phone, email, website, QR code</li>
    <li><strong>Paper stock</strong> — chọn weight 150-250 gsm cho cảm giác premium</li>
    <li><strong>Spread design</strong> — không gập đôi text quan trọng qua fold line</li>
  </ul>
</section>
`,
  },

  // 10. Brushes
  {
    id: "f1c0246f-1247-4db7-8941-d3ee9a627268",
    tieu_de: "Brushes",
    tieu_de_viet: "Cọ vẽ kỹ thuật số (Brushes)",
    tom_tat:
      "Brushes là công cụ vẽ trong phần mềm đồ họa — từ nét cơ bản đến brush mô phỏng phấn, sơn dầu, mực. Yếu tố quyết định cảm giác vẽ tay và phong cách trong digital art.",
    meta_title: "Brushes là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Brushes là công cụ vẽ kỹ thuật số mô phỏng chất liệu thật. Tìm hiểu các loại brush, phần mềm và ứng dụng trong digital painting, illustration, design.",
    noi_dung: `
<section class="arc-intro">
  <p>Một artist dùng cùng Photoshop, cùng tablet — nhưng tác phẩm của Kim Jung Gi nhìn khác hẳn của Loish, và khác hẳn của Pascal Campion. Một phần lớn lý do nằm ở brush — cách brush phản ứng với pressure, tilt, velocity tạo ra signature style. Brush là &quot;voice&quot; của digital artist.</p>
  <p>Brushes là kiến thức nền tảng cho mọi digital artist, illustrator và designer làm việc với painting hoặc texturing. Hiểu cách brush hoạt động, build brush riêng và chọn đúng brush cho từng task giúp tạo ra tác phẩm có character riêng.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Brushes là gì?</h2>
  <p>Brush trong phần mềm đồ họa là công cụ vẽ với một &quot;tip&quot; (đầu cọ) và bộ tham số quy định hành vi: kích thước, độ trong suốt, texture, jitter, response với pressure/tilt của stylus. Khi bạn vẽ, phần mềm &quot;stamp&quot; tip đó liên tục theo đường di chuyển, kết hợp các tham số để tạo nét.</p>
  <p>Brush khác cọ vẽ thật ở chỗ: hoàn toàn programmable. Bạn có thể mô phỏng phấn than thật, hoặc tạo brush không tồn tại trong vật lý (brush rải lá tự nhiên theo path). Mỗi phần mềm có brush engine riêng — Photoshop, Procreate, Krita, Clip Studio, Substance đều có capability khác nhau.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Brush là cá nhân — không có &quot;brush tốt nhất&quot;</span>
    <p>Một brush hoàn hảo cho artist này có thể không phù hợp với artist khác. Phong cách, thói quen vẽ, áp lực bút mỗi người khác — vì thế brush settings cá nhân hóa được. Artist chuyên nghiệp thường có 5-10 brush yêu thích custom cho workflow riêng.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Tip / Shape</strong> — hình dạng đầu cọ (round, scatter, texture)</li>
    <li><strong>Spacing</strong> — khoảng cách giữa các stamp khi kéo</li>
    <li><strong>Pressure Sensitivity</strong> — response với áp lực bút (size, opacity, flow)</li>
    <li><strong>Tilt &amp; Rotation</strong> — response với góc nghiêng bút (Apple Pencil 2, Wacom Pro Pen 3D)</li>
    <li><strong>Scatter &amp; Jitter</strong> — randomization tạo cảm giác tự nhiên</li>
    <li><strong>Dual Brush</strong> — overlay 2 brush tạo texture phức tạp</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"digital painting brushes photoshop procreate samples"</span>
    </div>
    <p class="arc-image-caption">Các loại brush khác nhau — round, charcoal, oil paint, watercolor, leaf scatter</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Brushes phổ biến</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Basic Round &amp; Hard Round</summary>
      <div class="arc-card-body">
        <p>Brush nền tảng — hình tròn, edge cứng hoặc mềm. Dùng cho lineart, sketching, color block. Hầu hết artist bắt đầu chỉ với 2-3 brush round trước khi mở rộng.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Natural Media — phấn, sơn dầu, mực</summary>
      <div class="arc-card-body">
        <p>Brush mô phỏng vật liệu thật — charcoal, pencil, oil paint, watercolor, ink. Kyle&apos;s Brushes (Photoshop), Procreate default set, Krita brushes là collection phổ biến.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Texture Brushes</summary>
      <div class="arc-card-body">
        <p>Brush có pattern texture (giấy, vải, đá, lá). Một stroke tạo cảm giác material. Phổ biến cho environment painting, texturing 3D model.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Scatter Brushes</summary>
      <div class="arc-card-body">
        <p>Brush stamp nhiều object dọc path — rải lá, rải sao, rải tóc. Tiết kiệm thời gian cho element nhiều như foliage, particle.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pattern / Stamp Brushes</summary>
      <div class="arc-card-body">
        <p>Stamp một image cụ thể (lá, viên đá, mảng mây) lặp lại. Phổ biến cho concept artist tạo nhanh element environment.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Smudge / Mixer Brushes</summary>
      <div class="arc-card-body">
        <p>Không vẽ thêm mà mix màu có sẵn trên canvas — mô phỏng cọ thật khi blend. Photoshop Mixer Brush, Procreate Smudge tool.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Brushes trong từng phần mềm</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photoshop</h3>
    <ul class="arc-list">
      <li>Brush engine mạnh nhưng phức tạp — nhiều panel settings</li>
      <li>Format .abr để chia sẻ; Kyle&apos;s Brushes (free với CC subscription) là collection chuẩn</li>
      <li>Mixer Brush cho painting traditional feel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Procreate (iPad)</h3>
    <ul class="arc-list">
      <li>Brush engine native cho touch + Apple Pencil — feel tự nhiên nhất</li>
      <li>Format .brushset, marketplace lớn (Procreate Folio, BrushGalaxy)</li>
      <li>Tilt response tốt nhờ Apple Pencil 2</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Krita</h3>
    <ul class="arc-list">
      <li>Open source, brush engine rất mạnh, đặc biệt cho digital painting</li>
      <li>Bundle default 100+ brush chuyên nghiệp</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Clip Studio Paint</h3>
    <ul class="arc-list">
      <li>Chuẩn cho manga, comic, anime art — brush optimized cho lineart</li>
      <li>Vector layer cho lineart adjustable</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Substance Painter / 3D Texturing</h3>
    <ul class="arc-list">
      <li>Brush cho 3D — paint trực tiếp lên model với material attributes</li>
      <li>Brush có alpha, height, material properties — không chỉ color</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips chọn và build Brushes</h2>
  <ul class="arc-list">
    <li><strong>Start với basic</strong> — không quá 5-10 brush cho project đầu, mở rộng từ từ</li>
    <li><strong>Test pressure sensitivity</strong> — vẽ test stroke đầu mỗi session, đảm bảo tablet hoạt động đúng</li>
    <li><strong>Build brush từ ảnh</strong> — chụp texture giấy, gỗ, đá → tạo brush tip từ pattern đó</li>
    <li><strong>Pair brushes</strong> — chọn brush base (cứng cho sketch) + brush blend (soft) + brush detail (texture) cho workflow đầy đủ</li>
    <li><strong>Reset settings thường xuyên</strong> — brush tweak nhiều có thể tích lũy lỗi; reset lại default rồi build từ đó</li>
  </ul>
</section>
`,
  },
];

console.log(`\n── Bắt đầu chạy ${items.length} bài keyword đợt 1.4 ──\n`);

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
