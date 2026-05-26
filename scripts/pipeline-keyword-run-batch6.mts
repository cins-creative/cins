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
  // 01. Color Harmony
  {
    id: "dbb1cd7f-0b0d-4dd6-9d56-fbd310234874",
    tieu_de: "Color Harmony",
    tieu_de_viet: "Hòa sắc (Color Harmony)",
    tom_tat:
      "Color Harmony là nguyên tắc phối các màu sắc tạo cân bằng dễ chịu — bao gồm complementary, analogous, triadic, split-complementary và tetradic. Nền tảng của mọi quyết định màu sắc trong thiết kế.",
    meta_title: "Color Harmony là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Color Harmony là nguyên tắc phối màu hài hòa. Tìm hiểu complementary, analogous, triadic và ứng dụng trong branding, UI/UX, painting.",
    noi_dung: `
<section class="arc-intro">
  <p>Một website palette gồm xanh dương + cam — trông năng động, professional. Một poster với xanh lá + đỏ + vàng cùng saturation cao — trông như Giáng sinh hoặc... hỗn loạn. Khác biệt nằm ở việc các màu có theo nguyên tắc Color Harmony hay không. Đây là &quot;ngữ pháp&quot; của màu sắc.</p>
  <p>Color Harmony là kiến thức nền tảng cho mọi designer, painter, illustrator. Hiểu các scheme cơ bản (complementary, analogous, triadic) giúp chọn palette nhanh, có cơ sở khoa học thay vì &quot;cảm tính&quot; — đặc biệt khi cần defend quyết định màu với client.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Color Harmony là gì?</h2>
  <p>Color Harmony (hòa sắc) là tập hợp các nguyên tắc về cách kết hợp các màu sắc trên color wheel để tạo ra palette cân bằng, dễ chịu về mặt thị giác. Dựa trên mối quan hệ hình học giữa các màu trên wheel — đối nhau, kế nhau, hoặc tạo tam giác/tứ giác đều.</p>
  <p>Color Harmony không phải quy tắc cứng — đó là điểm khởi đầu được nghiên cứu kỹ. Designer chuyên nghiệp dùng harmony schemes như framework rồi tweak theo brand và intention cụ thể. Không có &quot;palette đẹp nhất&quot; — chỉ có palette phù hợp nhất với mục đích.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Color Wheel — công cụ cốt lõi</span>
    <p>Color wheel hiện đại có 12 màu chính (3 primary: đỏ, vàng, xanh; 3 secondary: cam, tím, lá; 6 tertiary giữa). Mọi harmony scheme đều dựa vào vị trí các màu trên wheel. Photoshop, Adobe Color, Coolors đều cung cấp wheel interactive.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Complementary</strong> — hai màu đối diện (đỏ + xanh lá, cam + xanh dương)</li>
    <li><strong>Analogous</strong> — 3-5 màu kế tiếp (xanh dương + xanh lá + xanh lơ)</li>
    <li><strong>Triadic</strong> — 3 màu cách đều 120° (đỏ + vàng + xanh dương)</li>
    <li><strong>Split-Complementary</strong> — một màu + 2 màu bên cạnh đối diện</li>
    <li><strong>Tetradic / Square</strong> — 4 màu tạo hình vuông trên wheel</li>
    <li><strong>Monochromatic</strong> — variation của một hue duy nhất</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"color harmony wheel complementary analogous triadic"</span>
    </div>
    <p class="arc-image-caption">6 color harmony schemes phổ biến trên color wheel</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Color Harmony chi tiết</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Complementary — đối diện, contrast mạnh</summary>
      <div class="arc-card-body">
        <p>Hai màu đối diện trên wheel — tương phản tối đa, tạo sự sống động và nhấn mạnh. Sports brand (Lakers purple+gold), film grading (teal+orange). Mạnh nhưng dễ &quot;quá&quot; — dùng một làm chính, một làm accent.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Analogous — kế nhau, hài hòa</summary>
      <div class="arc-card-body">
        <p>3-5 màu kế nhau trên wheel — tạo cảm giác êm dịu, nature. Phong cảnh hoàng hôn (đỏ + cam + vàng), biển (xanh lơ + xanh dương + tím). Thiếu contrast → cần value variation để không &quot;flat&quot;.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Triadic — 3 màu cách đều, vibrant</summary>
      <div class="arc-card-body">
        <p>3 màu đỉnh tam giác đều trên wheel — đỏ+vàng+xanh dương (primary), hoặc cam+xanh lá+tím. Vibrant và playful — phù hợp brand trẻ, children product, Google.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Split-Complementary — &quot;an toàn hơn&quot; complementary</summary>
      <div class="arc-card-body">
        <p>Một màu chính + 2 màu bên cạnh đối diện (thay vì đối diện thẳng). Giữ contrast nhưng nhẹ nhàng hơn. Ví dụ: xanh dương + cam đỏ + cam vàng.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Monochromatic — một hue, variation</summary>
      <div class="arc-card-body">
        <p>Một màu, biến đổi saturation và brightness. Đơn giản, elegant, professional. Tone-on-tone branding (Apple, Tiffany).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tetradic — 4 màu hình vuông</summary>
      <div class="arc-card-body">
        <p>2 cặp complementary tạo hình vuông trên wheel. Phong phú nhưng khó balance — cần một dominant, các còn lại support.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Color Harmony trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Branding &amp; Identity</h3>
    <ul class="arc-list">
      <li>Brand color palette dựa trên harmony scheme + brand personality</li>
      <li>FedEx: complementary (purple + orange); Spotify: monochromatic + accent green</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">UI/UX</h3>
    <ul class="arc-list">
      <li>Material Design: primary + secondary (analogous) + accent (complementary)</li>
      <li>iOS: thường monochromatic với accent</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Painting &amp; Illustration</h3>
    <ul class="arc-list">
      <li>Concept art landscape: analogous cho mood, một accent complementary cho focal point</li>
      <li>Character design: triadic cho cartoon, monochromatic cho serious</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Interior Design</h3>
    <ul class="arc-list">
      <li>Phòng ngủ: analogous warm cho ấm cúng</li>
      <li>Phòng khách: split-complementary cho lively</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Fashion</h3>
    <ul class="arc-list">
      <li>Collection palette dựa trên season mood + harmony rule</li>
      <li>Outfit pairing: stylist dùng harmony schemes intuitive</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools để chọn Color Harmony</h2>
  <ul class="arc-list">
    <li><strong>Adobe Color</strong> (color.adobe.com) — tool free, chọn rule + base color, auto generate palette</li>
    <li><strong>Coolors</strong> (coolors.co) — generate palette nhanh, save và export</li>
    <li><strong>Khroma</strong> — AI suggest palette dựa trên preference</li>
    <li><strong>Color Hunt</strong> — curated palettes từ community</li>
    <li><strong>Pantone</strong> — chuẩn industry cho print, fashion, product</li>
    <li><strong>Procreate / Photoshop Color Wheel</strong> — pick harmony scheme trực tiếp khi paint</li>
  </ul>
</section>
`,
  },

  // 02. Color script
  {
    id: "b7fdb829-8910-4ef6-8f44-c581e37d921d",
    tieu_de: "Color Script",
    tieu_de_viet: "Bảng định hướng màu phim (Color Script)",
    tom_tat:
      "Color Script là tài liệu lên kế hoạch màu sắc cho toàn bộ phim hoặc game — mỗi cảnh có màu chủ đạo riêng để màu sắc kể chuyện và dẫn dắt cảm xúc. Bước nền tảng trong pipeline animation studio lớn.",
    meta_title: "Color Script là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Color Script là tài liệu định hướng màu sắc cho phim, game. Tìm hiểu vai trò của color script trong pipeline Pixar, Disney và cách áp dụng.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem một bộ phim Pixar — không chỉ câu chuyện kéo bạn vào mà cả màu sắc cũng dẫn dắt cảm xúc. Inside Out: mỗi cảm xúc một màu; Up: chuyển từ ấm áp gia đình sang xám lạnh khi cô đơn; Coco: chuyển từ trần thế thường sang Land of the Dead rực rỡ. Đằng sau những chuyển này là Color Script — kế hoạch màu sắc của cả phim.</p>
  <p>Color Script là pipeline standard trong studio animation cao cấp. Hiểu color script giúp art director, concept artist, color stylist plan màu sắc hệ thống — thay vì để màu phát triển ngẫu nhiên qua từng cảnh.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Color Script là gì?</h2>
  <p>Color Script là tài liệu visual tổng thể đặt ra kế hoạch màu sắc cho toàn bộ một bộ phim, game hoặc dự án narrative dài. Trình bày dưới dạng chuỗi thumbnail nhỏ — mỗi thumbnail đại diện cho một scene/sequence với màu chủ đạo, lighting mood của cảnh đó. Khi nhìn cả script một lúc, bạn thấy được &quot;ngôn ngữ màu&quot; xuyên suốt phim — emotional arc thị giác.</p>
  <p>Concept được Pixar phát triển và phổ biến từ phim đầu tiên (Toy Story 1995). Mỗi production có Color Stylist hoặc Art Director làm color script trong giai đoạn pre-production — trước khi animation thực sự bắt đầu.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Color = Storytelling</span>
    <p>Pixar nổi tiếng với câu &quot;Color is a character&quot;. Trong Up, màu chuyển từ ấm sang lạnh đại diện cho hành trình cảm xúc của Carl. Inside Out: mỗi emotion một màu riêng. Inside Out 2: thêm 4 emotion = 4 màu mới. Color không chỉ trang trí — color kể chuyện.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Thumbnail</strong> — phác thảo nhỏ mỗi scene với color/lighting chủ đạo</li>
    <li><strong>Color Key</strong> — version chi tiết hơn của một moment quan trọng</li>
    <li><strong>Emotional Arc</strong> — đường cong cảm xúc thị giác qua phim</li>
    <li><strong>Color Stylist</strong> — vai trò chuyên biệt làm color script trong studio</li>
    <li><strong>Sequence</strong> — đơn vị color script — một chuỗi scene cùng mood</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"pixar color script film up coco inside out"</span>
    </div>
    <p class="arc-image-caption">Color script Pixar — chuỗi thumbnail với mood màu thay đổi theo arc cảm xúc</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Quy trình làm Color Script</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Phân tích script &amp; emotional arc</summary>
      <div class="arc-card-body">
        <p>Color stylist đọc script, identify các beat cảm xúc chính: opening, conflict, climax, resolution. Mỗi beat có mood — happy, melancholic, tense, triumphant.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Thumbnail tổng thể</summary>
      <div class="arc-card-body">
        <p>Vẽ chuỗi thumbnail nhỏ (50-200 thumbnail tùy độ dài phim), mỗi cái đại diện 1 scene hoặc 1 sequence. Tập trung vào value structure và color temperature, không chi tiết.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Color key chi tiết</summary>
      <div class="arc-card-body">
        <p>Cho các moment then chốt (key scenes), vẽ color key chi tiết hơn — không chỉ palette, mà composition gần với cảnh thật.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Review &amp; iterate với director</summary>
      <div class="arc-card-body">
        <p>Color script được review nhiều vòng với director, production designer, DP. Đảm bảo color arc phù hợp với storytelling.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Áp dụng vào pipeline production</summary>
      <div class="arc-card-body">
        <p>Khi production bắt đầu, từng department (lighting, environment, character color) tham chiếu color script. Đảm bảo consistency và mood đúng intent.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Color Script trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation Studio</h3>
    <ul class="arc-list">
      <li>Pipeline standard ở Pixar, Disney, DreamWorks, Studio Ghibli</li>
      <li>Color Stylist là role chuyên — Lou Romano (Pixar), Lorelay Bové (Disney)</li>
      <li>Một phim feature có 3-6 tháng làm color script trong pre-production</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Studio</h3>
    <ul class="arc-list">
      <li>Game narrative-driven (The Last of Us, God of War) có color script cho narrative beat</li>
      <li>Open-world game cũng có color planning cho từng biome/region</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim Live-Action</h3>
    <ul class="arc-list">
      <li>Wes Anderson nổi tiếng có color script chi tiết cho mỗi phim</li>
      <li>DOP và production designer làm color planning trong pre-production</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Indie / Short Film</h3>
    <ul class="arc-list">
      <li>Solo creator vẫn nên có color script đơn giản — 5-10 thumbnail cho short film</li>
      <li>Giúp tránh &quot;mỗi cảnh một look&quot; mất nhất quán</li>
    </ul>
  </div>
</section>
`,
  },

  // 03. Color spill
  {
    id: "3ac4b0f4-25a2-4670-bf21-4a2ebbecf9f3",
    tieu_de: "Color Spill",
    tieu_de_viet: "Tràn màu phông xanh (Color Spill)",
    tom_tat:
      "Color Spill là hiện tượng màu phông (xanh/xanh dương) phản xạ lên chủ thể khi quay greenscreen — gây khó khăn cho keying và composite. Vấn đề kỹ thuật cần xử lý ở cả khâu quay và post.",
    meta_title: "Color Spill là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Color Spill là hiện tượng tràn màu phông khi quay greenscreen. Tìm hiểu nguyên nhân và cách xử lý spill ở khâu quay và post-production VFX.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn quay diễn viên trước phông xanh, key xong rồi composite vào background mới — nhưng nhìn kỹ thấy mép tóc, viền áo của diễn viên có dải xanh nhẹ &quot;ám&quot;. Đó là color spill — kẻ thù số một của mọi compositor làm việc với greenscreen. Hiểu spill và cách xử lý là kỹ năng then chốt cho VFX work chuyên nghiệp.</p>
  <p>Color Spill là vấn đề kỹ thuật phổ biến mà mọi VFX artist, compositor và đoàn quay greenscreen đều phải đối mặt. Phòng tránh ở khâu quay tốt hơn fix ở post — nhưng cũng cần biết tool xử lý spill khi đã xảy ra.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Color Spill là gì?</h2>
  <p>Color Spill (tràn màu phông) là hiện tượng ánh sáng phản xạ từ phông màu (thường green hoặc blue) lên các bề mặt của chủ thể — đặc biệt là viền tóc, da, quần áo sáng màu, các bề mặt bóng. Kết quả: chủ thể bị &quot;ám&quot; màu phông, làm cho key/composite trông không tự nhiên.</p>
  <p>Spill rất khó tránh hoàn toàn — bất kỳ phông màu nào lit lên đều phản xạ photon ra môi trường xung quanh. Tuy nhiên có thể giảm đáng kể bằng setup quay đúng (subject xa phông, light đúng) và xử lý ở post với despill tool.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Tại sao thường dùng Green Screen mà không Blue?</span>
    <p>Green screen phổ biến hơn vì: (1) skin tone không có nhiều green nên dễ key, (2) sensor digital camera nhạy với green nhất, ít noise. <strong>Blue screen</strong> dùng cho cảnh có nhiều green (cây cối) hoặc subject mặc green. Cả hai đều gây color spill — chỉ khác màu.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Subject Distance</strong> — chủ thể càng xa phông, spill càng ít</li>
    <li><strong>Despill</strong> — xử lý spill ở post-production</li>
    <li><strong>Color Suppression</strong> — kỹ thuật despill phổ biến</li>
    <li><strong>Light Wrap</strong> — kỹ thuật tạo viền sáng từ background mới, che spill</li>
    <li><strong>Edge Cleanup</strong> — xử lý mép detail của subject</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"green screen color spill before after VFX despill"</span>
    </div>
    <p class="arc-image-caption">Color spill ở viền tóc và da — trước và sau khi despill</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Phòng tránh Color Spill ở khâu quay</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Khoảng cách subject-phông</summary>
      <div class="arc-card-body">
        <p>Subject cách phông ít nhất 3-5m (10-15 feet). Spill yếu đi theo bình phương khoảng cách — chỉ cần lùi xa hơn đã giảm spill đáng kể.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Light phông đều, không quá mạnh</summary>
      <div class="arc-card-body">
        <p>Phông cần lit đều (không có hot spot) để key sạch. Nhưng đừng lit phông quá sáng — càng sáng càng spill nhiều. Phông bằng intensity với subject là sweet spot.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Backlight subject với màu opposite</summary>
      <div class="arc-card-body">
        <p>Cho green screen: backlight nhẹ với màu magenta/pink — counter spill xanh. Hoặc dùng polarized light, gobos để control spill.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Tránh subject có vùng phản xạ mạnh</summary>
      <div class="arc-card-body">
        <p>Áo trắng, kính, đồ kim loại bóng phản xạ spill mạnh nhất. Coordinate với costume/prop để tránh nếu có thể.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Chọn green/blue tùy subject</summary>
      <div class="arc-card-body">
        <p>Subject có nhiều green (mặc green, vegetation) → dùng blue screen. Subject có nhiều blue (jeans, mắt xanh) → dùng green screen. Pick phông màu nào subject ít có nhất.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Xử lý Color Spill ở post-production</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Nuke (chuẩn VFX professional)</h3>
    <ul class="arc-list">
      <li>Keying node (Primatte, Keylight, IBK) có despill tích hợp</li>
      <li>Dedicated Despill node — subtract green channel từ overall color</li>
      <li>HueShift node cho fine control</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">DaVinci Resolve Fusion</h3>
    <ul class="arc-list">
      <li>Delta Keyer + DespillSuppress tools</li>
      <li>Tích hợp tốt với color grading nodes</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">After Effects</h3>
    <ul class="arc-list">
      <li>Keylight (chuẩn AE) có Despill Bias setting</li>
      <li>Plugin Primatte Keyer, Boris FX dùng nhiều</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Light Wrap — kỹ thuật bonus</h3>
    <ul class="arc-list">
      <li>Sau key, thêm light wrap (blur background mới + apply ngoài rìa subject)</li>
      <li>Giả lập ánh sáng từ background &quot;wrap&quot; quanh subject — composite tự nhiên hơn, ẩn được spill còn sót</li>
    </ul>
  </div>
</section>
`,
  },

  // 04. Color Theory
  {
    id: "8ca9ca05-c501-4d30-88c9-e75e905773d2",
    tieu_de: "Color Theory",
    tieu_de_viet: "Lý thuyết màu sắc",
    tom_tat:
      "Color Theory là hệ thống nguyên tắc về cách màu sắc tương tác — bao gồm color wheel, harmony, contrast, psychology. Nền tảng kiến thức cho mọi quyết định màu trong thiết kế, hội họa, phim, UI.",
    meta_title: "Color Theory là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Color Theory là hệ thống nguyên tắc màu sắc. Tìm hiểu color wheel, harmony, contrast, psychology màu và ứng dụng trong design, painting, branding.",
    noi_dung: `
<section class="arc-intro">
  <p>Tại sao xanh dương cảm thấy &quot;tin cậy&quot;, đỏ cảm thấy &quot;khẩn cấp&quot;? Tại sao một số palette &quot;đẹp&quot; còn một số &quot;chói mắt&quot;? Tại sao designer chọn complementary colors cho CTA button? Tất cả đều có cơ sở khoa học và thẩm mỹ — đó là Color Theory.</p>
  <p>Color Theory là kiến thức nền tảng nhất cho mọi creative — designer, painter, photographer, motion designer, UI/UX. Hiểu color theory không chỉ giúp chọn palette đẹp mà còn defend được quyết định, communicate với client và tránh được nhiều &quot;cuộc tranh cãi&quot; cảm tính.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Color Theory là gì?</h2>
  <p>Color Theory (Lý thuyết màu sắc) là hệ thống kiến thức về cách màu sắc tương tác với nhau và ảnh hưởng đến cảm thụ thị giác/tâm lý của con người. Bao gồm các chủ đề: color wheel (bánh xe màu), color models (RGB, CMYK, HSB), color harmony (hòa sắc), contrast, color temperature, color psychology, và mối quan hệ giữa màu với văn hóa.</p>
  <p>Lý thuyết được phát triển từ thế kỷ 17 (Newton phát hiện ra phổ ánh sáng), được hoàn thiện qua Goethe, Itten, Albers. Mỗi giai đoạn thêm vào hiểu biết mới — đặc biệt với sự phát triển của neuroscience hiện đại tìm hiểu não bộ xử lý màu thế nào.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Color Theory không phải quy tắc — là tham chiếu</span>
    <p>Nhiều người nghĩ color theory là &quot;phải tuân thủ&quot;. Thực ra là &quot;framework để hiểu màu&quot;. Master color theory xong, bạn biết khi nào nên dùng, khi nào nên phá để có hiệu ứng mạnh. Picasso và Matisse phá rule rất nhiều — nhưng họ master rule trước.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Color Wheel</strong> — 12 màu chính sắp xếp tròn</li>
    <li><strong>Primary, Secondary, Tertiary</strong> — phân loại màu</li>
    <li><strong>Hue, Saturation, Value/Brightness</strong> — 3 thuộc tính cốt lõi</li>
    <li><strong>Warm vs Cool colors</strong> — nhiệt độ màu</li>
    <li><strong>Color Harmony</strong> — schemes phối màu cân bằng</li>
    <li><strong>Color Psychology</strong> — màu ảnh hưởng đến cảm xúc, hành vi</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"color theory wheel hue saturation value diagram"</span>
    </div>
    <p class="arc-image-caption">Color Theory fundamentals — wheel, attributes, harmony schemes</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các khái niệm cốt lõi</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Color Wheel — bánh xe màu</summary>
      <div class="arc-card-body">
        <p><strong>Primary</strong>: Đỏ, Vàng, Xanh dương (không pha được từ màu khác). <strong>Secondary</strong>: Cam, Tím, Xanh lá (mỗi cái là pha 2 primary). <strong>Tertiary</strong>: 6 màu giữa primary và secondary. Tổng 12 màu chính trên wheel hiện đại.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>HSB / HSL — 3 thuộc tính của màu</summary>
      <div class="arc-card-body">
        <p><strong>Hue (H)</strong>: vị trí trên wheel. <strong>Saturation (S)</strong>: độ rực rỡ (0 = xám). <strong>Brightness/Value (B/V)</strong>: độ sáng (0 = đen, 100 = trắng). Mọi màu có thể được mô tả bằng 3 thông số này.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Harmony — phối màu cân bằng</summary>
      <div class="arc-card-body">
        <p>Complementary (đối diện), Analogous (kế nhau), Triadic (3 cách đều), Split-complementary, Tetradic, Monochromatic. Mỗi scheme tạo cảm xúc khác nhau.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Temperature — nhiệt độ màu</summary>
      <div class="arc-card-body">
        <p>Warm (đỏ, cam, vàng): energetic, gần. Cool (xanh dương, xanh lá, tím): calm, xa. Warm/cool contrast tạo độ sâu trong painting và photo.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Psychology &amp; Văn hóa</summary>
      <div class="arc-card-body">
        <p>Đỏ: passion, danger, attention (cũng có thể luck ở Trung Quốc). Xanh dương: trust, calm. Vàng: optimism (cũng có thể caution). Cảm xúc gắn với màu có cả phần universal (sinh học) và phần văn hóa (học được).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Contrast — nhiều loại</summary>
      <div class="arc-card-body">
        <p>Itten phân 7 loại contrast: hue, light/dark, warm/cool, complementary, simultaneous, saturation, extension (proportion). Mỗi loại tạo hiệu ứng thị giác khác.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Color Theory trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Graphic Design &amp; Branding</h3>
    <ul class="arc-list">
      <li>Brand color dựa trên psychology + harmony</li>
      <li>CTA button thường complementary để &quot;pop&quot; ra</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">UI/UX</h3>
    <ul class="arc-list">
      <li>Accessibility: contrast ratio chuẩn WCAG cho người yếu thị giác</li>
      <li>Color hierarchy: primary action màu rực, secondary nhạt hơn</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Painting &amp; Illustration</h3>
    <ul class="arc-list">
      <li>Hue shift theo lighting (warm light → cool shadow)</li>
      <li>Limited palette training: 3-5 màu, hiểu sâu mối quan hệ</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photography &amp; Cinematography</h3>
    <ul class="arc-list">
      <li>Color grading dựa trên harmony — teal &amp; orange là complementary</li>
      <li>White balance theo nhiệt độ ánh sáng</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Interior &amp; Fashion</h3>
    <ul class="arc-list">
      <li>Phòng/outfit theo harmony scheme tạo cảm giác chuyên nghiệp</li>
      <li>Season palette dựa trên color theory + cultural trend</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Học Color Theory hiệu quả</h2>
  <ul class="arc-list">
    <li><strong>Bắt đầu với HSB</strong> — hiểu hue, saturation, value rồi mới qua harmony</li>
    <li><strong>Value structure first</strong> — paint greyscale trước khi add color</li>
    <li><strong>Limited palette exercise</strong> — paint với 3 màu, hiểu sâu mối quan hệ</li>
    <li><strong>Study masters</strong> — Sargent, Sorolla cho painting; Bouguereau, Frazetta cho illustration</li>
    <li><strong>Books</strong> — &quot;Interaction of Color&quot; (Albers), &quot;Color and Light&quot; (James Gurney)</li>
    <li><strong>Practice với real world</strong> — chụp ảnh cùng cảnh ở các lighting khác, study color shift</li>
  </ul>
</section>
`,
  },

  // 05. Compositing
  {
    id: "36157506-54f0-4dd9-b748-be2e68335032",
    tieu_de: "Compositing",
    tieu_de_viet: "Tổng hợp hình ảnh (Compositing)",
    tom_tat:
      "Compositing là kỹ thuật kết hợp nhiều element hình ảnh từ nhiều nguồn (CG, footage, matte painting) thành một frame duy nhất trông như cùng một cảnh. Bước cuối quyết định chất lượng VFX.",
    meta_title: "Compositing là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Compositing kết hợp nhiều element thành một frame VFX. Tìm hiểu workflow Nuke, AE và kỹ thuật keying, tracking, color matching, light wrap.",
    noi_dung: `
<section class="arc-intro">
  <p>Cảnh phim Marvel: diễn viên đứng trước phông xanh, robot CG sau lưng, thành phố matte painting xa hơn, particle khói lửa khắp nơi. Tất cả ban đầu là các layer rời rạc — đến tay compositor, chúng được &quot;merge&quot; lại thành một frame duy nhất trông như cùng quay tại địa điểm thật. Đây là sức mạnh của compositing.</p>
  <p>Compositing là bước hoàn thiện cuối cùng của VFX — nơi mọi element được hợp nhất. Hiểu compositing giúp VFX artist communicate hiệu quả với compositor, deliver element đúng quy chuẩn, và tránh các vấn đề thường gặp khi merge nhiều source khác nhau.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Compositing là gì?</h2>
  <p>Compositing là quá trình kết hợp nhiều element hình ảnh từ các nguồn khác nhau — live-action footage, CG render, matte painting, particle, hiệu ứng — thành một frame duy nhất trông như tất cả cùng tồn tại trong một cảnh thực (cùng góc quay, ánh sáng, màu sắc, chiều sâu).</p>
  <p>Compositing nằm cuối pipeline VFX — sau modeling, animation, lighting, simulation. Một compositor giỏi không chỉ &quot;merge&quot; element mà còn balance chúng — match exposure, color, motion blur, grain để tạo cảm giác photoreal hoặc style đồng nhất.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Compositing ≠ Editing</span>
    <p><strong>Editing</strong>: ghép clip theo timeline để kể chuyện (Premiere, Resolve). <strong>Compositing</strong>: kết hợp element <em>trong</em> một shot. Editor làm việc với hàng trăm shot; compositor làm việc với hàng chục element của một shot. Editor xử lý 5-10 phút phim/ngày; compositor có thể mất 1-2 tuần cho một shot phức tạp.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Layer</strong> — mỗi element trong composite (footage, CG, mask)</li>
    <li><strong>Keying</strong> — extract subject từ greenscreen/bluescreen</li>
    <li><strong>Roto</strong> — tracing object thủ công khi keying không work</li>
    <li><strong>Tracking</strong> — bám camera/object movement cho element CG</li>
    <li><strong>Color Match</strong> — tune màu element để match plate</li>
    <li><strong>Grain &amp; Motion Blur</strong> — thêm grain và blur để CG khớp với footage</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"vfx compositing nuke node tree layers"</span>
    </div>
    <p class="arc-image-caption">Compositing trong Nuke — node tree kết hợp nhiều element thành frame cuối</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Tools &amp; Workflow Compositing</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Nuke (Foundry) — chuẩn industry VFX</summary>
      <div class="arc-card-body">
        <p>Node-based — graph với từng node một operation. Mọi VFX studio AAA dùng Nuke. Mạnh nhất cho 3D-aware composite (deep, point cloud, projection).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>After Effects — chuẩn motion graphics</summary>
      <div class="arc-card-body">
        <p>Layer-based — dễ học hơn Nuke nhưng kém power cho VFX phức tạp. Phổ biến cho motion graphics, simple compositing, TVC, YouTube.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Fusion (DaVinci Resolve)</summary>
      <div class="arc-card-body">
        <p>Node-based như Nuke nhưng built-in trong Resolve — đặc biệt mạnh cho indie filmmaker. Free tier mạnh.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Flame &amp; Smoke (Autodesk)</summary>
      <div class="arc-card-body">
        <p>High-end TVC và film finishing. Realtime workflow nhưng đắt. Phổ biến ở studio post commercial.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Các kỹ thuật Compositing</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Keying — tách subject từ phông</h3>
    <ul class="arc-list">
      <li>Greenscreen/Bluescreen keying — Keylight, Primatte, IBK</li>
      <li>Despill: remove color spill từ phông</li>
      <li>Edge matte: clean viền tóc, detail nhỏ</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Rotoscoping — tracing thủ công</h3>
    <ul class="arc-list">
      <li>Khi keying không work (không có phông), roto từng frame</li>
      <li>Silhouette, Mocha — tool roto chuyên dụng</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Tracking &amp; Matchmoving</h3>
    <ul class="arc-list">
      <li>2D tracking: bám element vào frame movement</li>
      <li>3D matchmove: rebuild camera 3D từ footage để place CG element accurate</li>
      <li>Tool: PFTrack, 3DEqualizer, SynthEyes, Nuke 3D tracker</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Color Match &amp; Integration</h3>
    <ul class="arc-list">
      <li>Match exposure, white balance, color cast của CG với plate</li>
      <li>Add grain (matching plate grain) để CG không &quot;sạch&quot; quá</li>
      <li>Add motion blur, depth of field hợp với plate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Light Wrap, Edge Blend</h3>
    <ul class="arc-list">
      <li>Light wrap: background color &quot;wrap&quot; quanh subject — composite tự nhiên hơn</li>
      <li>Edge blend: làm mềm viền key, hide hard edges</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Compositing trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX Phim &amp; TV</h3>
    <ul class="arc-list">
      <li>Studio ILM, MPC, WETA — Nuke pipeline</li>
      <li>Một shot phức tạp có 30-100 layer, mỗi layer setup riêng</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Graphics &amp; TVC</h3>
    <ul class="arc-list">
      <li>After Effects pipeline cho 2D compositing</li>
      <li>Element 3D, Cinema 4D + AE workflow</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Music Video</h3>
    <ul class="arc-list">
      <li>Composite tạo hiệu ứng visual stylized</li>
      <li>Mix live-action + CG + 2D animation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">YouTube / Indie Filmmaker</h3>
    <ul class="arc-list">
      <li>Resolve Fusion hoặc AE — entry-level VFX</li>
      <li>Greenscreen DIY + composite simple background</li>
    </ul>
  </div>
</section>
`,
  },

  // 06. Concept art
  {
    id: "ab4159b4-4f9d-4bb8-bc47-2e5c0d2a74cb",
    tieu_de: "Concept Art",
    tieu_de_viet: "Nghệ thuật tạo hình ý tưởng (Concept Art)",
    tom_tat:
      "Concept Art là hình ảnh phác thảo định hướng thị giác cho nhân vật, môi trường, props trước khi production. Cầu nối giữa script và thực tế trong game, phim, animation.",
    meta_title: "Concept Art là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Concept Art định hướng thị giác cho game, phim, animation. Tìm hiểu role concept artist, workflow và cách trở thành concept artist chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Trước khi Avatar có chiếc Pandora đẹp mê hồn, trước khi The Last of Us có Joel và Ellie, trước khi Star Wars có Death Star — tất cả đều xuất phát từ những trang concept art. Mỗi bộ phim/game lớn có hàng nghìn bản concept ở mọi stage — từ thumbnail nhỏ đến painting final chi tiết. Đây là &quot;ngôn ngữ&quot; mà toàn team production dùng để hiểu vision chung.</p>
  <p>Concept Art là nghề mơ ước của nhiều người yêu vẽ và yêu game/phim. Hiểu concept art workflow giúp những ai muốn theo nghề biết được kỹ năng cần phát triển, và team production biết cách brief concept artist hiệu quả.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Concept Art là gì?</h2>
  <p>Concept Art là nghệ thuật thị giác có mục đích cụ thể: tạo ra hình ảnh tham chiếu cho nhân vật, môi trường, props, vũ khí, vehicle, vũ trụ trong một dự án sáng tạo trước khi sản xuất chính thức. Khác với illustration nghệ thuật (đứng riêng), concept art phục vụ production — là nguyên liệu cho team 3D modeler, animator, VFX artist xây dựng final.</p>
  <p>Concept artist không chỉ &quot;vẽ đẹp&quot; — họ giải quyết vấn đề thiết kế. Một concept không chỉ trông cool mà còn phải <strong>functional</strong>: nhân vật cử động được, vũ khí cầm được, môi trường lit được, vehicle vận hành được. Đó là sự khác biệt giữa concept art chuyên nghiệp và fan art.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Concept Art ≠ Final Art</span>
    <p>Concept art là tham chiếu, không phải sản phẩm cuối. Khi player thấy nhân vật trong game, đó đã qua quá trình 3D modeling, texturing, rigging, animating, render. Concept artist chuẩn bị &quot;blueprint&quot; — quality của concept dựa vào việc nó <em>guide</em> production tốt thế nào, không phải nó đẹp như painting gallery hay không.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Character Concept</strong> — design nhân vật, costume, accessories</li>
    <li><strong>Environment Concept</strong> — design môi trường, location, set</li>
    <li><strong>Props Concept</strong> — vũ khí, đồ vật, vehicle</li>
    <li><strong>Keyframe Painting</strong> — moment quan trọng của cảnh</li>
    <li><strong>Mood Painting</strong> — visualize tone, atmosphere của cảnh</li>
    <li><strong>Visual Development (Vis Dev)</strong> — overall visual style của dự án</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"concept art game film environment character design"</span>
    </div>
    <p class="arc-image-caption">Concept art điển hình — environment painting với chi tiết và mood cho production</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các nhánh chính của Concept Art</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Character Concept Artist</summary>
      <div class="arc-card-body">
        <p>Design nhân vật từ đầu đến chân: face, body, costume, accessories. Cần hiểu anatomy, costume history, character personality. Output: turnaround + callout sheet + variation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Environment Concept Artist</summary>
      <div class="arc-card-body">
        <p>Design môi trường, level, world. Cần hiểu architecture, perspective, lighting, composition. Output: keyframe painting, environment sheet.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Props &amp; Vehicle Concept Artist</summary>
      <div class="arc-card-body">
        <p>Design vũ khí, đồ vật, vehicle (xe, máy bay, tàu vũ trụ). Cần hiểu industrial design, engineering basic. Output: orthographic view + render.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Visual Development (Vis Dev) Artist</summary>
      <div class="arc-card-body">
        <p>Define overall visual style của dự án — color script, art direction, mood. Senior role, gần với Art Director.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Storyboard Artist</summary>
      <div class="arc-card-body">
        <p>Related field — vẽ panel theo script. Phổ biến hơn ở phim/animation; game cũng dùng cho cutscene.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Concept Art trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game</h3>
    <ul class="arc-list">
      <li>Một game AAA có 100-500+ concept piece — character, environment, weapon, UI</li>
      <li>Studio: Naughty Dog, Riot, Blizzard, CD Projekt Red có concept team lớn</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim &amp; Animation</h3>
    <ul class="arc-list">
      <li>Pixar, Disney, Marvel có concept team mạnh nhất</li>
      <li>Pre-production concept là 1-2 năm trước phim release</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">TV / Streaming</h3>
    <ul class="arc-list">
      <li>Game of Thrones, Stranger Things đầu tư concept art lớn</li>
      <li>Adult Swim, Cartoon Network cho animated series</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VR / AR / Theme Park</h3>
    <ul class="arc-list">
      <li>Disney Imagineering — concept cho theme park rides</li>
      <li>VR game concept đặc biệt focus vào spatial design</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Kỹ năng cần thiết để trở thành Concept Artist</h2>
  <ul class="arc-list">
    <li><strong>Foundation Drawing</strong> — perspective, anatomy, gesture</li>
    <li><strong>Digital Painting</strong> — Photoshop, Procreate, Krita mastery</li>
    <li><strong>Color &amp; Light Theory</strong> — hiểu cách màu và ánh sáng tương tác</li>
    <li><strong>Design Sense</strong> — không chỉ vẽ đẹp, design phải solve problem</li>
    <li><strong>Reference Skills</strong> — biết tìm và áp dụng reference hiệu quả</li>
    <li><strong>3D Tools (bonus)</strong> — Blender, ZBrush cho basemesh trước paint</li>
    <li><strong>Communication</strong> — present idea, take feedback constructively</li>
    <li><strong>Portfolio</strong> — 10-15 piece chất lượng cao, thể hiện được range &amp; depth</li>
  </ul>
</section>
`,
  },

  // 07. Constraint
  {
    id: "a7040835-046b-48e9-ab43-3f4adb3e657c",
    tieu_de: "Constraint",
    tieu_de_viet: "Ràng buộc (Constraint - 3D Rigging)",
    tom_tat:
      "Constraint là thiết lập ràng buộc chuyển động giữa hai hoặc nhiều object trong phần mềm 3D — point, parent, aim, orient — nền tảng của character rigging và animation.",
    meta_title: "Constraint là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Constraint trong 3D ràng buộc chuyển động giữa các object. Tìm hiểu point, parent, aim, orient constraint và ứng dụng trong rigging, animation.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn rig một nhân vật 3D — muốn mắt luôn nhìn về phía một target chuyển động (camera, một object). Animate từng frame thủ công thì mỗi cảnh tốn nhiều giờ. Setup một Aim Constraint — mắt sẽ tự động xoay theo target ở mọi frame, animator chỉ cần move target. Đây là một trong nhiều &quot;magic&quot; của constraint.</p>
  <p>Constraint là kỹ thuật cốt lõi trong 3D rigging và animation. Hiểu constraint giúp rigger setup rig linh hoạt, animator làm việc nhanh và hiệu quả — không phải animate thủ công những thứ máy có thể tự xử lý.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Constraint là gì?</h2>
  <p>Constraint là một thiết lập trong phần mềm 3D (Maya, Blender, 3ds Max, Houdini) ràng buộc một hoặc nhiều thuộc tính chuyển động (vị trí, xoay, tỷ lệ) của một object — gọi là <strong>constrained object</strong> — theo một hoặc nhiều object khác — gọi là <strong>target</strong>. Khi target di chuyển, constrained object tự động phản ứng theo quy tắc đã set.</p>
  <p>Constraint khác với parenting đơn thuần. Parenting: object con kế thừa hoàn toàn từ parent (mọi transform). Constraint: chọn lọc — chỉ position, chỉ rotation, chỉ aim direction. Linh hoạt và mạnh hơn cho rigging phức tạp.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Constraint = nền tảng của Rig</span>
    <p>Một character rig có thể có hàng chục constraint: foot follows ground (point), eye looks at target (aim), shoulder rotates with arm (orient), hand sticks to weapon (parent + scale). Không có constraint, mỗi chuyển động phải animate thủ công — không khả thi cho project lớn.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Point Constraint</strong> — constrained object follows position của target</li>
    <li><strong>Orient Constraint</strong> — follows rotation của target</li>
    <li><strong>Parent Constraint</strong> — follows cả position + rotation (như parenting)</li>
    <li><strong>Aim Constraint</strong> — rotate để &quot;nhìn&quot; về target</li>
    <li><strong>Scale Constraint</strong> — follows scale của target</li>
    <li><strong>Pole Vector Constraint</strong> — control direction của IK chain</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"maya constraint rigging types parent aim point"</span>
    </div>
    <p class="arc-image-caption">Các loại constraint phổ biến trong rigging — point, parent, aim, orient</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Constraint chi tiết</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Point Constraint — follow vị trí</summary>
      <div class="arc-card-body">
        <p>Object A bám theo vị trí của object B. B move, A move theo — nhưng A vẫn rotate độc lập. Phổ biến cho: weapon follow hand mà weapon có rotation riêng.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Orient Constraint — follow rotation</summary>
      <div class="arc-card-body">
        <p>Object A rotate theo object B nhưng vị trí independent. Dùng cho: head rotate theo controller mà position fixed; gimbal mechanics.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Parent Constraint — full follow</summary>
      <div class="arc-card-body">
        <p>Tương đương với việc parent thực sự — follow cả position + rotation. Lợi thế hơn parenting: có thể turn on/off, blend giữa nhiều parent (space switch). Phổ biến nhất trong rigging.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Aim Constraint — &quot;look at&quot;</summary>
      <div class="arc-card-body">
        <p>Object xoay sao cho axis cụ thể luôn point về target. Use cases: eye follow target, camera follow subject, sun-aware leaves rotate.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pole Vector Constraint — IK control</summary>
      <div class="arc-card-body">
        <p>Trong IK chain (arm/leg), pole vector quy định direction của joint trung gian (knee/elbow). Locator pole vector di chuyển → knee point theo. Quan trọng cho character rigging.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Path / Motion Path Constraint</summary>
      <div class="arc-card-body">
        <p>Object follow một curve path qua thời gian. Phổ biến cho: xe follow đường, camera fly through, particle flow.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Constraint trong từng phần mềm</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Maya</h3>
    <ul class="arc-list">
      <li>Constraint menu trong Rigging shelf</li>
      <li>Có weight blending: 2 parent với weight 0.5 mỗi → object &quot;giữa&quot; 2 parent</li>
      <li>Space switching workflow rất mạnh — animator switch giữa parent space (world, hand, hip)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Blender</h3>
    <ul class="arc-list">
      <li>Constraint panel cho mỗi object — Properties → Object Constraints</li>
      <li>Tương đương với Maya nhưng workflow khác</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3ds Max</h3>
    <ul class="arc-list">
      <li>Animation menu → Constraints</li>
      <li>Same concepts, slightly different naming</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Houdini</h3>
    <ul class="arc-list">
      <li>CHOPS network cho complex constraint logic</li>
      <li>Hoặc Object-level constraint trong scene</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Constraint trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Character Rigging</h3>
    <ul class="arc-list">
      <li>Mỗi joint trong rig có nhiều constraint — IK/FK switch, space switching, eye aim</li>
      <li>Rigger pro xây custom constraint system cho production</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Mechanical Animation</h3>
    <ul class="arc-list">
      <li>Robot, vehicle: aim constraint cho gun follow target, orient cho wheel rotate</li>
      <li>Animatable rigging riêng cho industrial animation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Camera Animation</h3>
    <ul class="arc-list">
      <li>Camera aim constraint follow subject — track shot tự động</li>
      <li>Path constraint cho dolly move precise</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game (cùng concept khác triển khai)</h3>
    <ul class="arc-list">
      <li>Game engine có constraint tương đương: Look-at, Follow Target trong Unity/Unreal</li>
      <li>Game rigging vẫn dùng constraint nhưng triển khai khác offline</li>
    </ul>
  </div>
</section>
`,
  },

  // 08. Content-Aware Fill
  {
    id: "18b3fea2-6365-4f72-a912-48aafbda77e8",
    tieu_de: "Content-Aware Fill",
    tieu_de_viet: "Lấp đầy thông minh (Content-Aware Fill)",
    tom_tat:
      "Content-Aware Fill là công cụ AI trong Photoshop tự động loại bỏ đối tượng và điền vào vùng thiếu — bằng cách phân tích surrounding pixels. Một trong những tính năng &quot;magic&quot; nhất của Photoshop.",
    meta_title: "Content-Aware Fill là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Content-Aware Fill xóa object thông minh trong Photoshop và After Effects. Tìm hiểu cách dùng, ứng dụng và lỗi thường gặp khi xử lý ảnh, video.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn chụp ảnh phong cảnh đẹp nhưng có người lạ đứng trong khung. Trước 2010, để xóa người đó phải dùng Clone Stamp tediously hàng giờ — và kết quả thường không tự nhiên. Content-Aware Fill ra mắt Photoshop CS5 — chọn vùng, một click, và người biến mất, background tự &quot;điền vào&quot;. Đây là một trong những bước tiến lớn nhất của Photoshop trong thập kỷ qua.</p>
  <p>Content-Aware Fill là kỹ năng cơ bản cho photographer, retoucher, video editor. Hiểu cách hoạt động và khi nào dùng giúp tiết kiệm hàng giờ retouch tediously — đặc biệt với việc xóa object không mong muốn khỏi ảnh/video.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Content-Aware Fill là gì?</h2>
  <p>Content-Aware Fill là tính năng trong Photoshop (và sau này After Effects) sử dụng thuật toán AI/machine learning để phân tích pixels xung quanh một vùng đã chọn, sau đó tự động sinh ra pixels &quot;phù hợp&quot; để điền vào vùng đó. Kết quả thường tự nhiên đến mức không nhận ra có sự can thiệp.</p>
  <p>Adobe đã liên tục cải thiện thuật toán qua các năm — Content-Aware Fill 2024 vượt xa version 2010 cả về quality và control. Đặc biệt với việc tích hợp Adobe Sensei (AI) và Firefly (generative AI), giờ đây có thể xóa object phức tạp với background cực kỳ tự nhiên.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Content-Aware Fill vs Generative Fill</span>
    <p><strong>Content-Aware Fill</strong>: thuật toán phân tích surrounding pixels, sample và composite. <strong>Generative Fill</strong> (Photoshop 2023+): AI generative thực sự — có thể tạo content mới hoàn toàn dựa trên prompt text. Cả hai bổ sung nhau — Content-Aware nhanh cho remove đơn giản, Generative tạo được thứ hoàn toàn mới.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Sampling Area</strong> — vùng surrounding mà thuật toán sample</li>
    <li><strong>Color Adaptation</strong> — adjust color cho match vùng surrounding</li>
    <li><strong>Rotation Adaptation</strong> — content có thể rotate để fit</li>
    <li><strong>Scale Adaptation</strong> — scale cho content match</li>
    <li><strong>Output Settings</strong> — current layer, new layer, hoặc duplicate</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"photoshop content aware fill before after remove object"</span>
    </div>
    <p class="arc-image-caption">Content-Aware Fill — chọn object cần xóa, một click, object biến mất, background tự nhiên</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Cách sử dụng Content-Aware Fill</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Photoshop — basic workflow</summary>
      <div class="arc-card-body">
        <p>1. Chọn vùng cần xóa (Lasso, Quick Selection, Object Selection). 2. Edit → Content-Aware Fill (hoặc Shift+F5 → Content-Aware). 3. Adjust sampling area trong workspace — exclude vùng không muốn sample (mặt người khác trong ảnh).</p>
        <p>4. Preview kết quả live. 5. Output to new layer (recommended) để có thể tweak.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Spot Healing Brush — quick fix</summary>
      <div class="arc-card-body">
        <p>Cho object nhỏ — Spot Healing Brush với option &quot;Content-Aware&quot;. Click một lần lên object → biến mất. Nhanh nhưng kém control.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Patch Tool — Content-Aware mode</summary>
      <div class="arc-card-body">
        <p>Vẽ vùng cần thay → kéo sang vùng tham chiếu. Photoshop blend smartly. Phù hợp cho patches có texture cụ thể (skin, fabric).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>After Effects — Content-Aware Fill for video</summary>
      <div class="arc-card-body">
        <p>AE 2019+ có Content-Aware Fill cho video. Mask object cần xóa, set Reference Frame, AE process theo timeline. Powerful nhưng tốn time render.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Generative Fill (PS 2023+)</summary>
      <div class="arc-card-body">
        <p>Chọn vùng → click Generative Fill → có thể nhập text prompt hoặc để trống. AI generate content mới. Mạnh hơn nhiều, đặc biệt cho thay object hoàn toàn.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Content-Aware Fill trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photography &amp; Retouch</h3>
    <ul class="arc-list">
      <li>Xóa tourist, vật cản khỏi ảnh landscape</li>
      <li>Remove dust, scratch, blemish trên skin</li>
      <li>Extend background cho thiếu canvas</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX &amp; Video Edit</h3>
    <ul class="arc-list">
      <li>Remove rigging wire, support structure khỏi cảnh quay</li>
      <li>Erase boom mic, light stand vô tình lọt vào frame</li>
      <li>Clean plate generation cho VFX work</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Architecture &amp; Real Estate</h3>
    <ul class="arc-list">
      <li>Clean property photo — xóa người, xe, đồ cá nhân khỏi listing</li>
      <li>Remove cars, signs khỏi exterior shot</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">E-commerce</h3>
    <ul class="arc-list">
      <li>Clean product photo — xóa imperfection, dust trên product</li>
      <li>Extend canvas for square crop social media</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Pattern repeat — thấy được object đã xóa lặp lại</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> sampling area chứa pattern dễ recognize.</p>
        <p><strong>Cách fix:</strong> trong Content-Aware Fill workspace, exclude vùng có pattern recognizable. Hoặc dùng Clone Stamp manually cho phần khó.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Background không tự nhiên ở vùng phức tạp</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> background có pattern phức tạp (kiến trúc, người đông) — thuật toán khó &quot;đoán&quot;.</p>
        <p><strong>Cách fix:</strong> chia object thành nhiều part nhỏ, fill từng phần. Hoặc dùng Generative Fill với prompt cụ thể.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Result blur / mất detail</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> Content-Aware Fill có thể soft hơn original.</p>
        <p><strong>Cách fix:</strong> output to new layer, set blend mode &quot;Pass Through&quot;, có thể sharpen layer riêng nếu cần.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 09. Control rig
  {
    id: "56c1500b-6b88-46b6-94e1-d51309e8c08e",
    tieu_de: "Control Rig",
    tieu_de_viet: "Hệ thống điều khiển (Control Rig)",
    tom_tat:
      "Control Rig là tập hợp các bộ điều khiển trực quan (curve, NURBS handles) giúp animator dễ dàng thao tác với hệ thống xương 3D phức tạp. Lớp abstraction giữa skeleton phức tạp và animator workflow.",
    meta_title: "Control Rig là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Control Rig là hệ điều khiển trực quan cho animator. Tìm hiểu cách build control rig, IK/FK, picker và workflow rigging chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn nhìn skeleton của một nhân vật 3D — hàng trăm joint nhỏ, tên kỹ thuật khó hiểu (LeftArm_3, Spine_Joint_2). Animator phải select joint nào để rotate cánh tay? Đây là lúc Control Rig vào việc — thay vì select joint, animator thao tác trên các shape lớn trực quan (vòng tròn tại cổ tay, vuông tại đầu, mũi tên tại bàn chân).</p>
  <p>Control Rig là kỹ năng then chốt cho rigger và là lớp abstraction quan trọng cho animator. Hiểu control rig giúp rigger build hệ thống thân thiện cho animator, và animator hiểu vì sao control rig được set up như vậy — leverage tốt nhất feature của rig.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Control Rig là gì?</h2>
  <p>Control Rig là tập hợp các đối tượng trực quan (thường là NURBS curve dạng shape — vòng tròn, vuông, mũi tên) được sắp xếp xung quanh nhân vật 3D để animator dùng làm &quot;handle&quot; điều khiển skeleton bên dưới. Khi animator move/rotate một control, một hoặc nhiều joint bên dưới phản ứng theo qua hệ thống constraint, IK chain, hoặc driven keys.</p>
  <p>Control rig là lớp <strong>abstraction</strong> giữa skeleton (raw, kỹ thuật) và animator workflow (creative, intuitive). Animator không cần biết tên joint, không thấy bone structure — chỉ thao tác với các shape trực quan đã có sẵn.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Control vs Joint vs Bone</span>
    <p><strong>Bone/Joint</strong>: xương trong skeleton, drive skin deformation. <strong>Control</strong>: shape trực quan animator thao tác. Một control có thể drive nhiều joint (IK chain). Animator chỉ thấy/dùng control, không touch joint directly.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Control Curve</strong> — shape NURBS visible cho animator</li>
    <li><strong>FK Control</strong> — direct rotation control của joint</li>
    <li><strong>IK Control</strong> — control endpoint của chain (tay, chân)</li>
    <li><strong>Pole Vector</strong> — control direction của joint giữa (knee, elbow)</li>
    <li><strong>Master Control</strong> — control toàn bộ rig (root, COG)</li>
    <li><strong>Picker</strong> — UI tool quick-select controls</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"3D character control rig maya curves animator"</span>
    </div>
    <p class="arc-image-caption">Control rig — các NURBS curves shapes là handle animator dùng để rotate/move</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các thành phần của Control Rig</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>FK Controls — Forward Kinematic</summary>
      <div class="arc-card-body">
        <p>Direct rotation control của từng joint theo chain — rotate shoulder, elbow follows, wrist follows. Animator control từng joint riêng. Phù hợp cho hand wave, complex arm gestures.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>IK Controls — Inverse Kinematic</summary>
      <div class="arc-card-body">
        <p>Move endpoint (wrist, ankle), entire chain auto-adjust (shoulder, elbow). Phù hợp cho hand-on-table, foot-on-ground. IK/FK Switch cho animator chuyển giữa hai mode.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pole Vector Controls</summary>
      <div class="arc-card-body">
        <p>Cho IK chain (arm, leg), pole vector control direction của joint giữa (knee/elbow). Move pole vector → knee rotates accordingly.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Face Controls</summary>
      <div class="arc-card-body">
        <p>Driven keys / blend shapes cho facial animation. Slider control eyebrow, mouth corner, eye blink. Có thể là 1D slider hoặc 2D widget trên mặt.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Master/Global Controls</summary>
      <div class="arc-card-body">
        <p>Root control — move toàn nhân vật trong scene. Center of Gravity (COG) — main hip control. Visibility controls — show/hide IK, FK, layers.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Custom Attributes</summary>
      <div class="arc-card-body">
        <p>Slider/checkbox trên control: IK/FK switch, stretchy arm on/off, fingers curl. Cho animator quick toggle những behavior phức tạp.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Control Rig trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation Studio</h3>
    <ul class="arc-list">
      <li>Custom rig cho mỗi character (Pixar, Disney có rigging team chuyên)</li>
      <li>Auto-rig tools cho production speed (Advanced Skeleton, mGear)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Cinematic</h3>
    <ul class="arc-list">
      <li>Naughty Dog, Insomniac có rig system cao cấp cho cinematic</li>
      <li>Hybrid: simplified rig cho real-time + complex rig cho pre-rendered cutscene</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Real-time</h3>
    <ul class="arc-list">
      <li>Unreal Control Rig (UE5) — runtime control rig system</li>
      <li>Cho animator iterate trong engine real-time, không phải re-import từ Maya</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Indie / Tutorial Animation</h3>
    <ul class="arc-list">
      <li>Free rigs có sẵn: Stewart, Mery, BlueBird (Maya); Rain rig (Blender)</li>
      <li>Auto-rigging Blender Rigify cho prototype nhanh</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Build Control Rig Tips</h2>
  <ul class="arc-list">
    <li><strong>Animator-friendly</strong> — control shape rõ, color-coded (red = right, blue = left)</li>
    <li><strong>Visibility hierarchy</strong> — show/hide layer (IK, FK, face controls)</li>
    <li><strong>IK/FK Match</strong> — switch giữa IK và FK seamless, không pop</li>
    <li><strong>Limits &amp; Locks</strong> — lock unused channels, prevent accidental tweak</li>
    <li><strong>Test với animator</strong> — feedback từ user thực sự tốt hơn assume</li>
    <li><strong>Documentation</strong> — diagram explain controls cho team mới</li>
  </ul>
</section>
`,
  },

  // 10. CPU và GPU
  {
    id: "3ce22ead-6355-4d0e-aea5-ec4114448c20",
    tieu_de: "CPU và GPU",
    tieu_de_viet: "CPU và GPU",
    tom_tat:
      "CPU và GPU là hai loại chip xử lý cốt lõi — CPU mạnh ở tác vụ tuần tự phức tạp, GPU mạnh ở xử lý song song. Cả hai đều quan trọng trong creative work — rendering, video editing, AI.",
    meta_title: "CPU và GPU là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "CPU và GPU — chip xử lý cho creative work. Tìm hiểu khác biệt, cách chọn build cho rendering, video editing, AI và workflow chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn build máy mới cho làm việc 3D — nên đầu tư mạnh vào CPU hay GPU? Câu trả lời tùy phần mềm bạn dùng. Render V-Ray CPU-based: cần CPU mạnh. Render Redshift GPU-based: cần GPU mạnh. Video edit DaVinci Resolve: GPU dominates. Hiểu khác biệt cốt lõi giữa CPU và GPU là kiến thức nền tảng cho mọi creative chọn được hardware phù hợp.</p>
  <p>CPU và GPU là kiến thức kỹ thuật cơ bản cho mọi 3D artist, video editor, motion designer. Hiểu khi nào CPU bottleneck, khi nào GPU bottleneck giúp đầu tư hardware đúng chỗ và optimize workflow cho phần mềm cụ thể.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>CPU và GPU là gì?</h2>
  <p><strong>CPU (Central Processing Unit — Bộ xử lý trung tâm)</strong> là chip thực thi mọi tác vụ chính của máy tính: chạy OS, app, logic complex. Có ít core (8-64) nhưng mỗi core mạnh và linh hoạt, xử lý tốt tác vụ tuần tự phức tạp.</p>
  <p><strong>GPU (Graphics Processing Unit — Bộ xử lý đồ họa)</strong> ban đầu thiết kế cho render đồ họa 3D — vẽ hàng triệu pixel cùng lúc. Có hàng nghìn core nhỏ, mỗi core đơn giản, xử lý tốt tác vụ song song (parallel). Sau này còn được dùng cho AI, machine learning, scientific computing.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Sự khác biệt cốt lõi</span>
    <p><strong>CPU</strong>: ít core, mạnh, linh hoạt — như một đầu bếp giỏi làm nhiều món phức tạp tuần tự. <strong>GPU</strong>: nhiều core nhỏ, đơn giản — như đội 1000 nhân viên cùng làm task lặp lại đơn giản. Cùng task có thể nhanh trên CPU hay GPU tùy bản chất task — parallel friendly hay không.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Core / Thread</strong> — đơn vị xử lý CPU</li>
    <li><strong>CUDA Core / Stream Processor</strong> — đơn vị xử lý GPU (NVIDIA / AMD)</li>
    <li><strong>VRAM</strong> — RAM của GPU (8GB, 16GB, 24GB)</li>
    <li><strong>Clock Speed (GHz)</strong> — tốc độ mỗi core</li>
    <li><strong>Cache</strong> — memory siêu nhanh sát core</li>
    <li><strong>TDP</strong> — Thermal Design Power, mức điện/nhiệt tiêu thụ</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"CPU GPU comparison cores architecture diagram"</span>
    </div>
    <p class="arc-image-caption">CPU vs GPU — CPU ít core mạnh, GPU nhiều core nhỏ xử lý song song</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Khi nào CPU, khi nào GPU quan trọng?</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>CPU-Intensive Tasks</summary>
      <div class="arc-card-body">
        <ul class="arc-list">
          <li>Simulation: cloth, fluid, particle (Houdini, RealFlow)</li>
          <li>Render CPU-based: V-Ray, Arnold, Corona, Mental Ray</li>
          <li>Code compile, programming workflows</li>
          <li>OS, browser, multitasking general</li>
          <li>Encoding video CPU (HandBrake software encoder)</li>
        </ul>
      </div>
    </details>
    <details class="arc-card">
      <summary>GPU-Intensive Tasks</summary>
      <div class="arc-card-body">
        <ul class="arc-list">
          <li>Render GPU: Redshift, Octane, Cycles (Blender), Iray</li>
          <li>Video editing &amp; color grading: DaVinci Resolve, Premiere</li>
          <li>Real-time rendering: Unreal, Unity, viewport preview</li>
          <li>AI: Stable Diffusion, ChatGPT inference, training</li>
          <li>Hardware video encoding: NVENC, AMD AMF, Intel QuickSync</li>
        </ul>
      </div>
    </details>
    <details class="arc-card">
      <summary>Both — hybrid workflows</summary>
      <div class="arc-card-body">
        <ul class="arc-list">
          <li>VFX pipeline: simulation (CPU) + render (GPU)</li>
          <li>Editing video heavy: import (CPU) + grade (GPU) + export (GPU encode)</li>
          <li>3D animation: rigging deform (CPU) + viewport (GPU)</li>
        </ul>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Chọn build cho từng loại công việc</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">3D Animation/Modeling (Maya, Blender)</h3>
    <ul class="arc-list">
      <li>CPU: mid-high (Ryzen 7 7800X / Intel i7-14700) cho viewport, rigging</li>
      <li>GPU: high VRAM (RTX 4070 16GB+) cho viewport, GPU render</li>
      <li>RAM: 32-64GB cho scene phức tạp</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">CPU Render (V-Ray, Arnold)</h3>
    <ul class="arc-list">
      <li>CPU: high core count (Threadripper, Ryzen 9, Xeon)</li>
      <li>GPU: mid (cho viewport, không phải render)</li>
      <li>RAM: 64-128GB</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">GPU Render (Redshift, Octane, Cycles)</h3>
    <ul class="arc-list">
      <li>CPU: mid (đủ cho workflow general)</li>
      <li>GPU: highest VRAM bạn afford (RTX 4090 24GB lý tưởng)</li>
      <li>Multi-GPU setup tăng render speed gần linear</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Video Editing &amp; Color Grading</h3>
    <ul class="arc-list">
      <li>CPU: high single-core (Intel i9 hoặc Ryzen 9)</li>
      <li>GPU: high VRAM (RTX 4070 12GB+)</li>
      <li>Storage: NVMe SSD critical cho 4K/8K workflow</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">AI / ML Workflow</h3>
    <ul class="arc-list">
      <li>GPU: VRAM lớn nhất có thể (Stable Diffusion XL cần 12GB+)</li>
      <li>NVIDIA dominates vì CUDA support</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Bottleneck &amp; Optimization</h2>
  <ul class="arc-list">
    <li><strong>Identify bottleneck</strong> — Task Manager khi work: CPU 100% hay GPU 100%? Đầu tư vào cái đang bottleneck.</li>
    <li><strong>Balance build</strong> — đừng mua RTX 4090 ghép với Ryzen 5 entry — CPU bottleneck GPU</li>
    <li><strong>Cooling matters</strong> — CPU/GPU throttle khi quá nóng. Investment vào cooling = sustained performance</li>
    <li><strong>VRAM more important than core count</strong> — GPU 8GB không render được scene 12GB regardless of core count</li>
    <li><strong>Future-proof</strong> — RAM, storage dễ upgrade sau; CPU/GPU thường gắn liền với main board generation</li>
  </ul>
</section>
`,
  },
];

console.log(`\n── Bắt đầu chạy ${items.length} bài keyword đợt 1.6 ──\n`);

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
