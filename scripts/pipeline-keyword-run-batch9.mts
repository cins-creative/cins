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
  // 01. EQ
  {
    id: "0d873a54-0612-4ab5-93e4-30ced54789f8",
    tieu_de: "Equalization (EQ)",
    tieu_de_viet: "Cân chỉnh tần số (EQ)",
    tom_tat:
      "EQ (Equalization) là công cụ tăng/giảm các vùng tần số trong âm thanh — kỹ thuật cơ bản nhất trong mixing để làm âm thanh rõ ràng, cân bằng và &quot;ngồi&quot; đúng chỗ trong mix.",
    meta_title: "EQ (Equalization) là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "EQ tăng/giảm tần số trong âm thanh. Tìm hiểu các loại EQ, kỹ thuật cắt-tăng và workflow mixing chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn nghe một bài hát thu tự chế tại nhà — vocal &quot;đục&quot; khó nghe, drum kick nuốt cả bass. Producer chuyên nghiệp với cùng nguồn thô, sau khi mix lại, vocal rõ rành, mỗi nhạc cụ có vị trí riêng. Khác biệt lớn nhất: cách họ dùng EQ — &quot;cắt&quot; vùng tần số dư thừa và &quot;tăng&quot; vùng cần nổi bật.</p>
  <p>EQ là kỹ thuật mixing đầu tiên mọi audio engineer phải master. Hiểu các loại EQ, khái niệm tần số và workflow cut/boost giúp tạo mix sạch sẽ, professional — bước nền cho mọi kỹ thuật mixing nâng cao khác.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>EQ là gì?</h2>
  <p>Equalization (EQ) là quá trình điều chỉnh độ mạnh của các vùng tần số (frequency) trong tín hiệu âm thanh. Mỗi âm thanh là tổ hợp của nhiều tần số — từ bass thấp (20 Hz) đến treble cao (20,000 Hz). EQ cho phép tăng (boost) hoặc giảm (cut) các vùng tần số cụ thể để âm thanh tốt hơn về mặt tonal.</p>
  <p>Trong mixing, EQ có hai vai trò chính: (1) <strong>Corrective EQ</strong> — sửa vấn đề âm thanh (cắt mud 200-400 Hz, harshness 2-4 kHz); (2) <strong>Creative EQ</strong> — shape character của instrument cho thẩm mỹ (boost air 10 kHz cho vocal shine, scoop mid cho metal guitar).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Subtractive EQ vs Additive EQ</span>
    <p><strong>Subtractive (cut)</strong>: bớt frequency dư thừa — vd cắt 250 Hz cho ít mud. Approach mặc định cho pro engineer. <strong>Additive (boost)</strong>: thêm frequency cần thiết — vd boost 5 kHz cho vocal rõ. Cả hai đều cần thiết, nhưng cắt thường giải quyết vấn đề tốt hơn boost.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Frequency</strong> — tần số (Hz, kHz) — vị trí trong phổ âm thanh</li>
    <li><strong>Gain</strong> — độ tăng/giảm (dB) ở frequency đó</li>
    <li><strong>Q (Bandwidth)</strong> — độ rộng của vùng frequency bị tác động</li>
    <li><strong>Filter Type</strong> — Bell, High-pass, Low-pass, Shelf, Notch</li>
    <li><strong>Slope</strong> — độ dốc của filter (dB/oct) — 6, 12, 24, 48</li>
    <li><strong>Linear Phase vs Minimum Phase</strong> — cách EQ xử lý phase</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"parametric EQ frequency response curve audio mixing"</span>
    </div>
    <p class="arc-image-caption">Parametric EQ curve — frequency response với boost và cut</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại EQ filter</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Bell (Peaking) Filter</summary>
      <div class="arc-card-body">
        <p>Boost/cut quanh một frequency center, Q quyết định độ rộng. Phổ biến nhất — &quot;Q tight&quot; cho surgical cut, &quot;Q wide&quot; cho musical boost.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>High-Pass Filter (HPF)</summary>
      <div class="arc-card-body">
        <p>Cắt tần số dưới một cutoff. Bắt buộc cho vocal, hi-hat — cắt rumble dưới 80 Hz. Slope 12-24 dB/oct phổ biến.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Low-Pass Filter (LPF)</summary>
      <div class="arc-card-body">
        <p>Cắt tần số trên cutoff. Dùng cho dark sound, &quot;telephone effect&quot;. Bass thường cut trên 5-8 kHz vì sub-bass không có high content.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Shelf Filter (High-Shelf, Low-Shelf)</summary>
      <div class="arc-card-body">
        <p>Boost/cut toàn bộ frequency trên (high-shelf) hoặc dưới (low-shelf) một point. Musical, gentle — perfect cho mastering boost air, warmth.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Notch Filter</summary>
      <div class="arc-card-body">
        <p>Bell với Q rất tight (Q&gt;10). Surgical cut feedback, electrical hum 50/60 Hz, exact frequency problem.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>EQ cho từng loại nhạc cụ</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Vocal</h3>
    <ul class="arc-list">
      <li>HPF 80-100 Hz cắt rumble</li>
      <li>Cut 200-300 Hz cho ít mud</li>
      <li>Boost 3-5 kHz cho presence, intelligibility</li>
      <li>Boost 10-12 kHz cho air, breathiness</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Kick Drum</h3>
    <ul class="arc-list">
      <li>Boost 60-80 Hz cho thump</li>
      <li>Cut 250-400 Hz cho ít boxy</li>
      <li>Boost 3-5 kHz cho click/attack</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Snare</h3>
    <ul class="arc-list">
      <li>Boost 200 Hz cho body</li>
      <li>Cut 400-500 Hz cho ít boxy</li>
      <li>Boost 5-7 kHz cho crack</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Bass Guitar</h3>
    <ul class="arc-list">
      <li>HPF 30-40 Hz</li>
      <li>Cut 250-400 Hz cho ít mud (clash với guitar)</li>
      <li>Boost 800 Hz-1 kHz cho định nghĩa string</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Acoustic Guitar</h3>
    <ul class="arc-list">
      <li>HPF 80-100 Hz</li>
      <li>Cut 200 Hz cho ít boxy</li>
      <li>Boost 5-7 kHz cho sparkle, string detail</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips EQ chuyên nghiệp</h2>
  <ul class="arc-list">
    <li><strong>Subtract first, add later</strong> — cắt vấn đề trước khi boost cái cần</li>
    <li><strong>EQ in context</strong> — không EQ solo, listen trong full mix</li>
    <li><strong>Reference track</strong> — so sánh mix với commercial reference</li>
    <li><strong>Use spectrum analyzer</strong> — visual aid cho mắt, nhưng tai vẫn là final judge</li>
    <li><strong>Linear phase cho mastering</strong> — no phase shift, ideal cho master bus</li>
    <li><strong>Don&apos;t over-EQ</strong> — quá nhiều EQ destroy character source. Often less is more</li>
  </ul>
</section>
`,
  },

  // 02. Essential Graphic
  {
    id: "1f977e2d-f907-4770-a6a2-a6a1fcf79bac",
    tieu_de: "Essential Graphics",
    tieu_de_viet: "Bảng Essential Graphics (Premiere/AE)",
    tom_tat:
      "Essential Graphics là bảng trong Premiere Pro cho phép editor tùy chỉnh text, màu, kích thước của motion graphics template — không cần mở After Effects. Cầu nối quan trọng giữa AE designer và Premiere editor.",
    meta_title:
      "Essential Graphics là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Essential Graphics trong Premiere cho phép edit MOGRT template. Tìm hiểu workflow tạo template trong AE và sử dụng trong Premiere.",
    noi_dung: `
<section class="arc-intro">
  <p>Một editor Premiere thường xuyên cần thêm lower-third, title animation cho video — nhưng không phải ai cũng biết After Effects. Designer làm AE template, export ra MOGRT, editor dùng trong Premiere — chỉ cần đổi text, màu, vị trí. Đây là sức mạnh của Essential Graphics workflow.</p>
  <p>Essential Graphics là kiến thức kết nối Premiere editor và Motion Designer. Hiểu cách tạo MOGRT trong AE và sử dụng trong Premiere giúp team production hiệu quả — designer focus vào template quality, editor focus vào storytelling.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Essential Graphics là gì?</h2>
  <p>Essential Graphics Panel (EGP) là bảng trong Adobe Premiere Pro cho phép tạo, edit và quản lý motion graphics templates (MOGRT). Editor có thể tùy chỉnh các yếu tố như text, màu, kích thước, vị trí mà không cần mở After Effects. Đây là cầu nối quan trọng giữa workflow của Motion Designer (làm trong AE) và Video Editor (làm trong Premiere).</p>
  <p>Một template MOGRT thường được tạo trong After Effects với các parameter exposed (Slider Control, Color Control, Text). Designer export ra file .mogrt, editor import vào Premiere và sử dụng như preset — chỉnh các parameter qua Essential Graphics Panel.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">MOGRT format là gì?</span>
    <p>MOGRT (Motion Graphics Template) là file format Adobe — chứa pre-rendered AE composition kèm các parameter editable. File .mogrt có thể share giữa designers, dùng trong cả Premiere lẫn Rush. Một MOGRT có thể có 10-50+ parameter tùy template phức tạp.</p>
  </div>

  <ul class="arc-list">
    <li><strong>MOGRT file</strong> — Motion Graphics Template (.mogrt extension)</li>
    <li><strong>Essential Graphics Panel</strong> — bảng trong Premiere để control template</li>
    <li><strong>Master Properties</strong> — parameter exposed của template</li>
    <li><strong>Source Text</strong> — text editable trong Premiere</li>
    <li><strong>Slider Control / Color Control / Checkbox</strong> — các loại parameter</li>
    <li><strong>Adobe Stock Templates</strong> — thư viện MOGRT có sẵn (free + premium)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"essential graphics premiere pro motion graphics template"</span>
    </div>
    <p class="arc-image-caption">Essential Graphics Panel — control text, color, slider của MOGRT template</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Workflow tạo MOGRT trong After Effects</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Design animation trong AE</summary>
      <div class="arc-card-body">
        <p>Tạo composition với animation logic. Lower-third, title card, transition, callout — anything you want to template.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Open Essential Graphics Panel</summary>
      <div class="arc-card-body">
        <p>Window → Essential Graphics. Drag composition vào panel. AE biến comp thành template structure.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Expose parameters</summary>
      <div class="arc-card-body">
        <p>Drag từng property muốn expose (text source, color, slider) vào Essential Graphics. Đặt tên rõ ràng — &quot;Title Text&quot;, &quot;Background Color&quot;, &quot;Duration&quot;.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Organize parameters</summary>
      <div class="arc-card-body">
        <p>Group parameter theo logic, dùng heading. UX của template ảnh hưởng tốc độ làm việc của editor sau này.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Export MOGRT</summary>
      <div class="arc-card-body">
        <p>Click &quot;Export Motion Graphics Template&quot; → save .mogrt. Choose destination: Local (this computer) hoặc Adobe Creative Cloud Libraries (share team).</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Sử dụng MOGRT trong Premiere</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Import &amp; Apply</h3>
    <ul class="arc-list">
      <li>Window → Essential Graphics → Browse tab</li>
      <li>Search hoặc browse template available (local + Adobe Stock)</li>
      <li>Drag template vào timeline như clip thông thường</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Customize Parameter</h3>
    <ul class="arc-list">
      <li>Select clip MOGRT trong timeline</li>
      <li>Switch sang &quot;Edit&quot; tab của Essential Graphics</li>
      <li>Edit text, color, slider trực tiếp — không cần mở AE</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Adjust Timing</h3>
    <ul class="arc-list">
      <li>Trim clip MOGRT để dài/ngắn animation</li>
      <li>Move trong timeline như mọi clip</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Color &amp; Brand Update</h3>
    <ul class="arc-list">
      <li>Đổi brand color cho cả series video bằng cách edit MOGRT color slider</li>
      <li>Apply same template với different color cho different episode</li>
    </ul>
  </div>
</section>
`,
  },

  // 03. Essential Sound
  {
    id: "03b63b3d-3c1e-4d49-aea3-e60a0e1db2f6",
    tieu_de: "Essential Sound Panel",
    tieu_de_viet: "Bảng Essential Sound Premiere",
    tom_tat:
      "Essential Sound Panel trong Adobe Premiere Pro là bảng giúp editor chỉnh sửa âm thanh dễ dàng — phân loại track (Dialogue, Music, SFX, Ambience) và apply preset chuyên nghiệp không cần mở Audition.",
    meta_title:
      "Essential Sound Panel là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Essential Sound Panel Premiere cho phép edit audio dễ dàng. Tìm hiểu cách phân loại track và preset Dialogue, Music, SFX professional.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn vừa cut xong video phỏng vấn — dialogue track có level uneven, nhiều noise nền, không có air. Editor không phải sound engineer, mở Audition phức tạp quá. Adobe biết vấn đề này — Essential Sound Panel ra đời để editor có thể clean dialogue, balance music chỉ với vài click.</p>
  <p>Essential Sound Panel là tool quan trọng cho Premiere editor không chuyên audio. Hiểu workflow phân loại track và preset có sẵn giúp polish audio nhanh — đủ professional cho social content, vlog, doc — không cần expert audio.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Essential Sound Panel là gì?</h2>
  <p>Essential Sound Panel là bảng trong Adobe Premiere Pro được thiết kế cho video editor không chuyên audio — cho phép apply audio processing chất lượng pro chỉ qua dropdown và slider, không cần biết về EQ, compression, gain staging. Editor chỉ cần phân loại từng track (Dialogue, Music, SFX, Ambience), Premiere tự apply preset phù hợp.</p>
  <p>Mỗi loại track có preset khác nhau và tùy chọn riêng. Dialogue có Reduce Noise, EQ presence, DeEss. Music có Auto Match Loudness, Ducking (giảm volume khi có voice). SFX và Ambience có spatial control.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Essential Sound vs Audition full</span>
    <p><strong>Essential Sound</strong>: simplified, preset-based, dành cho editor. Quick fix, decent quality. <strong>Adobe Audition</strong>: full DAW, spectral editing, restoration mạnh, multi-track mixer. Cho audio post-production chuyên nghiệp. Workflow: rough trong Essential Sound trước, send to Audition nếu cần polish thêm.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Audio Type</strong> — Dialogue / Music / SFX / Ambience</li>
    <li><strong>Auto Match Loudness</strong> — auto level theo target (broadcast -23 LUFS)</li>
    <li><strong>Reduce Noise</strong> — denoise dialogue</li>
    <li><strong>Reduce Reverb</strong> — giảm echo phòng</li>
    <li><strong>EQ Presets</strong> — Boost Higher Frequencies, Vintage Radio</li>
    <li><strong>Ducking</strong> — auto giảm music khi voice</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"essential sound panel premiere pro dialogue music"</span>
    </div>
    <p class="arc-image-caption">Essential Sound Panel — phân loại track và apply audio preset chuyên nghiệp</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Workflow Essential Sound</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Phân loại track (Tag)</summary>
      <div class="arc-card-body">
        <p>Select clip audio → Essential Sound Panel → click một trong 4 categories: Dialogue, Music, SFX, Ambience. Premiere biến clip thành type đó với options phù hợp.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Dialogue processing</summary>
      <div class="arc-card-body">
        <p>Auto Match Loudness → đạt target level. Reduce Noise 4-8 dB → clean background. EQ Vocal Enhancement. DeEsser nếu có sibilance.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Music balancing</summary>
      <div class="arc-card-body">
        <p>Apply Music tag → Auto Match Loudness → tự balance với dialogue. Enable Ducking → music tự fade khi có voice.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. SFX positioning</summary>
      <div class="arc-card-body">
        <p>SFX tag → adjust loudness, pan (Creative tab) — vị trí trong stereo field.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Ambience</summary>
      <div class="arc-card-body">
        <p>Tag Ambience → low level, wide stereo. Tạo &quot;bed&quot; nền cho scene.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Send to Audition (nếu cần)</summary>
      <div class="arc-card-body">
        <p>Right-click → Edit Clip in Adobe Audition. Polish chi tiết hơn rồi save về Premiere.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Khi nào dùng Essential Sound</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phù hợp Essential Sound</h3>
    <ul class="arc-list">
      <li>YouTube vlog, talking head video</li>
      <li>Corporate video, training material</li>
      <li>Social media content quick turnaround</li>
      <li>Podcast video version</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cần Adobe Audition (hoặc DAW khác)</h3>
    <ul class="arc-list">
      <li>Phim, TV series (post-production audio chuyên)</li>
      <li>Documentary với complex audio (mix nhiều layer)</li>
      <li>Music video — mixing music professional</li>
      <li>ADR, foley, sound design heavy</li>
    </ul>
  </div>
</section>
`,
  },

  // 04. Explainer Videos
  {
    id: "7a7fa575-271b-42f0-8876-c97015d89c3b",
    tieu_de: "Explainer Videos",
    tieu_de_viet: "Video giải thích (Explainer Video)",
    tom_tat:
      "Explainer Video là video ngắn (30s-3 phút) giải thích sản phẩm, dịch vụ, khái niệm phức tạp bằng motion graphics và voiceover — phổ biến nhất cho marketing, onboarding, education.",
    meta_title:
      "Explainer Videos là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Explainer Video giải thích phức tạp bằng motion graphics. Tìm hiểu các style 2D, 3D, whiteboard và workflow tạo explainer chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn đang lên homepage một SaaS product — sản phẩm phức tạp về AI. Đọc 5 trang text khó hiểu. Nhưng 90 giây video animation với narrator rõ ràng, visual đơn giản — bạn hiểu ngay. Đây là sức mạnh của Explainer Video — format truyền tải thông tin phức tạp hiệu quả nhất trong digital marketing.</p>
  <p>Explainer Videos là một trong những content format value cao nhất cho freelance motion designer và animator. Hiểu cấu trúc, các style và workflow giúp tạo product/service explainer convert tốt — và biết charge giá phù hợp cho client.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Explainer Videos là gì?</h2>
  <p>Explainer Video là video ngắn (thường 30 giây đến 3 phút) được thiết kế để giải thích một sản phẩm, dịch vụ, hoặc khái niệm phức tạp một cách đơn giản, hấp dẫn. Sử dụng kết hợp visual (motion graphics, animation, illustration, footage) và audio (voiceover, music, SFX) để truyền tải thông điệp.</p>
  <p>Explainer phổ biến nhất trong marketing — đặt trên homepage, landing page, social ads. Người xem thường watch video 2-3 lần trước khi đọc text — explainer good chuyển skeptical visitor thành interested lead. Theo nhiều nghiên cứu, page có explainer video có conversion rate cao 80%+ so với page only text.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Cấu trúc &quot;Problem-Agitate-Solution&quot;</span>
    <p>Hầu hết explainer follow framework PAS: (1) <strong>Problem</strong> (0-20s): viewer&apos;s pain point. (2) <strong>Agitate</strong> (20-40s): show consequence nếu không fix. (3) <strong>Solution</strong> (40-90s): your product giải quyết. (4) <strong>CTA</strong> (90-100s): action tiếp theo. Đơn giản nhưng powerful — viewer engaged từ đầu vì recognize problem của họ.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Duration</strong> — 30 giây (short), 60-90 giây (sweet spot), 2-3 phút (deep dive)</li>
    <li><strong>Script first</strong> — visual follow script, không ngược lại</li>
    <li><strong>Voiceover</strong> — chuyên nghiệp critical, không tự thu</li>
    <li><strong>Music</strong> — set tone, không drown voice</li>
    <li><strong>Storyboard</strong> — every scene planned trước animate</li>
    <li><strong>CTA</strong> — clear call to action cuối</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"explainer video motion graphics 2d animation marketing"</span>
    </div>
    <p class="arc-image-caption">Explainer video — motion graphics, illustration, voiceover trong 60-90 giây</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các style Explainer phổ biến</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>2D Motion Graphics</summary>
      <div class="arc-card-body">
        <p>Style phổ biến nhất — flat illustration animated, simple character, infographic. Tool: After Effects. Examples: Dropbox, Spotify, Slack early explainer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Whiteboard Animation</summary>
      <div class="arc-card-body">
        <p>Hand-drawn style, ai đó vẽ trên whiteboard. Khariismatic, &quot;handcrafted feel&quot;. Tool: VideoScribe, Doodly. Phù hợp education, simple concept.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Character Animation</summary>
      <div class="arc-card-body">
        <p>Storytelling với character. Pixar-style narrative micro. Expensive nhưng emotional impact mạnh. Apple often dùng character animation cho product launch.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3D Animation</summary>
      <div class="arc-card-body">
        <p>Product demo, machinery explanation. Hardware, automotive, medical thường dùng 3D để show internal. Tool: Cinema 4D, Blender, Maya.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Screen Recording / Tutorial</summary>
      <div class="arc-card-body">
        <p>Software demo style — screen recording với annotation. Tool: Camtasia, ScreenFlow. Phù hợp SaaS, technical product.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Live Action + Motion Graphics</summary>
      <div class="arc-card-body">
        <p>Real people + animation overlay. Personal touch + flexibility của animation. Phổ biến cho service business, healthcare, tech-with-human-face.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Pipeline Production Explainer</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Pre-Production</h3>
    <ul class="arc-list">
      <li>Brief client — target audience, key message, brand</li>
      <li>Script writing (150 words/phút voiceover ≈ 60s explainer = 150 words)</li>
      <li>Storyboard mỗi key frame</li>
      <li>Style frames — define visual look</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Production</h3>
    <ul class="arc-list">
      <li>Voiceover recording (chuyên nghiệp talent)</li>
      <li>Illustration / asset creation (vector trong AI hoặc Sketch)</li>
      <li>Animation trong AE</li>
      <li>Sound design — music license + SFX</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Post-Production</h3>
    <ul class="arc-list">
      <li>Mix audio trong Audition/Premiere</li>
      <li>Color grade nếu có live action</li>
      <li>Render final với codec phù hợp platform target</li>
      <li>Subtitle/caption cho accessibility</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Pricing</h3>
    <ul class="arc-list">
      <li>Simple 30-60s 2D explainer: $1,000-3,000</li>
      <li>Standard 60-90s với character: $3,000-10,000</li>
      <li>High-end với 3D: $10,000-50,000+</li>
    </ul>
  </div>
</section>
`,
  },

  // 05. Expressions
  {
    id: "188e6cbf-f939-4a5d-a84a-07ff675d4f50",
    tieu_de: "Expressions (After Effects)",
    tieu_de_viet: "Expressions trong After Effects",
    tom_tat:
      "Expressions là đoạn mã JavaScript trong After Effects giúp tự động hóa animation — link property, tạo motion procedural, oscillate, wiggle — thay vì keyframe thủ công.",
    meta_title: "Expressions AE là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Expressions trong After Effects tự động animation bằng JavaScript. Tìm hiểu wiggle, loopOut, linkProperty và 6 expression thiết yếu.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn animate logo bounce 100 frame. Sau đó client request thêm bouncing element giống — bạn lại keyframe từ đầu. Hoặc bạn muốn camera rung tự nhiên 5 giây — keyframe từng frame một? Expressions giải quyết những bài toán đó — một dòng code thay 100 keyframe, scalable cho mọi project tương lai.</p>
  <p>Expressions là one of biggest power user feature của After Effects. Hiểu cơ bản expressions giúp motion designer scale workflow đáng kể — automate những việc lặp lại, tạo animation impossible bằng keyframe thường. Đầu tư học expressions là một trong những ROI cao nhất cho mograph artist.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Expressions là gì?</h2>
  <p>Expressions là đoạn mã JavaScript ngắn áp dụng cho property trong After Effects (position, rotation, scale, opacity, hoặc bất kỳ animatable property). Thay vì set keyframe cho property, expression compute value của property mỗi frame dựa trên logic code.</p>
  <p>Để add expression: Alt+click (Option+click trên Mac) vào stopwatch của property → expression text field hiện ra. Write JS code → property giờ controlled by expression thay vì keyframe.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Expression có thay thế keyframe?</span>
    <p>Không hoàn toàn — expression và keyframe complement. Workflow phổ biến: keyframe cho intentional animation (chính), expression cho automatic motion (wiggle, follow another layer). Một số animation hoàn toàn expression (procedural), một số hoàn toàn keyframe (character animation), most projects mix cả hai.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Property Link</strong> — property A control bởi property B</li>
    <li><strong>Wiggle</strong> — random motion tự nhiên</li>
    <li><strong>LoopOut</strong> — loop tự động keyframes</li>
    <li><strong>Time Variables</strong> — animate based on time</li>
    <li><strong>Math &amp; Logic</strong> — sin, cos, linear, ease</li>
    <li><strong>Layer References</strong> — access property của layer khác</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"after effects expression javascript wiggle loopOut"</span>
    </div>
    <p class="arc-image-caption">Expressions trong AE — JavaScript code thay thế hoặc bổ sung keyframe</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>6 Expressions thiết yếu</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. wiggle(frequency, amplitude)</summary>
      <div class="arc-card-body">
        <p><strong>Use case:</strong> rung lắc tự nhiên — camera shake, jittery text, organic motion. <strong>Ví dụ:</strong> wiggle(2, 50) = 2 lần/giây, biên độ 50 pixel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. loopOut(&quot;cycle&quot;)</summary>
      <div class="arc-card-body">
        <p><strong>Use case:</strong> loop animation infinitely. <strong>Ví dụ:</strong> set 2 keyframes, add loopOut() → animation lặp lại mãi. Variants: &quot;cycle&quot;, &quot;pingpong&quot;, &quot;offset&quot;, &quot;continue&quot;.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. time * speed</summary>
      <div class="arc-card-body">
        <p><strong>Use case:</strong> rotation continuous (gear, planet). <strong>Ví dụ:</strong> [time*100] cho rotation = quay 100 degree/second. Đơn giản nhưng powerful.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. linear(t, t1, t2, v1, v2)</summary>
      <div class="arc-card-body">
        <p><strong>Use case:</strong> remap value range — vd opacity 0-1 → scale 100-200. <strong>Ví dụ:</strong> linear(opacity, 0, 1, 100, 200). Math fundamental.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. pickwhip (link property)</summary>
      <div class="arc-card-body">
        <p><strong>Use case:</strong> link property A với property B. <strong>Cách:</strong> drag pick whip từ expression box vào target property. Property A giờ follow B. Cơ sở của character rigging trong AE.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. valueAtTime(time)</summary>
      <div class="arc-card-body">
        <p><strong>Use case:</strong> delay layer follow another với offset. <strong>Ví dụ:</strong> layer 2 follow layer 1 with 0.2s delay = thisComp.layer(1).transform.position.valueAtTime(time-0.2).</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Expressions trong từng workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Graphics</h3>
    <ul class="arc-list">
      <li>Wiggle cho organic motion, camera shake</li>
      <li>LoopOut cho infinite animation (loading, idle)</li>
      <li>Time-based rotation cho element decorative</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Character Animation</h3>
    <ul class="arc-list">
      <li>Joystick rig — slider control multiple property qua expressions</li>
      <li>Auto-follow body parts, IK approximation</li>
      <li>Eye blink random pattern</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Data-Driven Animation</h3>
    <ul class="arc-list">
      <li>Connect animation với JSON data (Lottie workflow)</li>
      <li>Infographic update khi data change</li>
      <li>Chart animation tự động từ value</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Logo &amp; Title Sequence</h3>
    <ul class="arc-list">
      <li>Bouncing logo (overshoot + settle)</li>
      <li>Text typewriter effect</li>
      <li>Camera shake cho intro impact</li>
    </ul>
  </div>
</section>
`,
  },

  // 06. Extended Reality
  {
    id: "5784c604-c591-4ad1-b817-586db168c8f7",
    tieu_de: "Extended Reality (XR)",
    tieu_de_viet: "Thực tế mở rộng (XR)",
    tom_tat:
      "Extended Reality (XR) là thuật ngữ tổng hợp cho AR, VR và MR — mọi công nghệ pha trộn hoặc thay thế thực tế bằng nội dung kỹ thuật số. Đang định hình tương lai của game, đào tạo, design.",
    meta_title: "Extended Reality (XR) là gì? Ý nghĩa và ứng dụng | CINS",
    meta_description:
      "XR (Extended Reality) bao gồm AR, VR, MR. Tìm hiểu ứng dụng XR trong gaming, training, design và career opportunity ngành sáng tạo.",
    noi_dung: `
<section class="arc-intro">
  <p>Apple Vision Pro 2024 ra mắt — &quot;spatial computing&quot;. Meta Quest 3 — &quot;mixed reality&quot;. Microsoft HoloLens — &quot;mixed reality enterprise&quot;. Pokemon GO — &quot;augmented reality&quot;. Nhiều thuật ngữ, nhưng tất cả thuộc về một umbrella term: XR — Extended Reality. Đây là frontier mới của ngành sáng tạo, mở ra opportunities chưa từng có cho artist và developer.</p>
  <p>XR là career path đang growing nhanh nhất hiện nay. Hiểu các loại XR (VR, AR, MR), use cases và tooling giúp artist sáng tạo position bản thân cho thị trường tương lai — vô số job mới trong design, animation, sound cho XR experience.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>XR là gì?</h2>
  <p>Extended Reality (XR) là thuật ngữ tổng hợp bao gồm mọi công nghệ pha trộn hoặc thay thế thực tế bằng nội dung kỹ thuật số. Bao gồm 3 nhánh chính: <strong>VR (Virtual Reality)</strong> — hoàn toàn thay thế thực tế bằng thế giới ảo; <strong>AR (Augmented Reality)</strong> — overlay digital content lên thực tế qua phone/glasses; <strong>MR (Mixed Reality)</strong> — digital content tương tác với thực tế.</p>
  <p>XR đang ở giai đoạn rapid growth — Apple Vision Pro, Meta Quest 3, Microsoft HoloLens 2, đẩy mạnh adoption consumer và enterprise. Theo Statista, XR market dự kiến đạt $100B+ năm 2030. Cơ hội cho artist, designer, developer cực lớn.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">VR vs AR vs MR — phân biệt nhanh</span>
    <p><strong>VR</strong>: full immersive, headset block view ngoài. Use case: gaming, training. <strong>AR</strong>: overlay simple, view qua phone screen hoặc clear glasses. Use case: Pokemon GO, IKEA Place, navigation. <strong>MR</strong>: digital object có physics tương tác với real world. Use case: HoloLens enterprise, Apple Vision Pro spatial computing.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Head-mounted Display (HMD)</strong> — headset chính cho VR/MR</li>
    <li><strong>AR Glasses</strong> — kính nhẹ cho AR (Ray-Ban Meta, future Apple)</li>
    <li><strong>Spatial Computing</strong> — Apple&apos;s term cho MR computing</li>
    <li><strong>6DoF (Six Degrees of Freedom)</strong> — full 3D movement tracking</li>
    <li><strong>Inside-out Tracking</strong> — camera trên headset track environment</li>
    <li><strong>Passthrough</strong> — view ngoài qua headset camera</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"extended reality XR VR AR MR headset future technology"</span>
    </div>
    <p class="arc-image-caption">XR — VR, AR, MR spectrum của reality-virtuality continuum</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Use Cases của XR</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Gaming &amp; Entertainment</summary>
      <div class="arc-card-body">
        <p>VR game (Half-Life Alyx, Beat Saber) — full immersive. AR mobile game (Pokemon GO). VR concerts (Travis Scott Fortnite), virtual events.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Training &amp; Education</summary>
      <div class="arc-card-body">
        <p>Surgery simulation, pilot training, dangerous job training. Walmart, UPS dùng VR cho employee training. Universities có VR labs cho engineering, medicine.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Design &amp; Architecture</summary>
      <div class="arc-card-body">
        <p>Architect walkthrough building trước khi build. Auto designer review concept car 1:1 scale VR. Furniture placement AR (IKEA Place).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Retail &amp; Commerce</summary>
      <div class="arc-card-body">
        <p>AR &quot;try-on&quot; makeup (Sephora, L&apos;Oréal), clothing (Snap, Warby Parker). Furniture placement preview. Virtual showroom (Audi, BMW).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Healthcare</summary>
      <div class="arc-card-body">
        <p>Surgery planning với patient CT scan trong 3D. Phobia therapy VR exposure. Pain management distraction. Medical imaging visualization.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Industrial &amp; Manufacturing</summary>
      <div class="arc-card-body">
        <p>Field worker với AR glasses (HoloLens) — schematic overlay khi sửa máy. Boeing dùng AR cho aircraft assembly — giảm error 90%.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Career trong XR cho artist</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">XR Environment Artist</h3>
    <ul class="arc-list">
      <li>Tạo 3D environment cho VR/MR game, experience</li>
      <li>Tool: Maya, Blender, Substance Painter, Unreal, Unity</li>
      <li>Optimization quan trọng — VR phải 90fps</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">XR Character/Asset Artist</h3>
    <ul class="arc-list">
      <li>Character cho VR game, avatar cho social VR (Meta Horizon, VRChat)</li>
      <li>Low-poly optimization, PBR texture</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">XR UX/UI Designer</h3>
    <ul class="arc-list">
      <li>Design interface cho 3D space — UX khác hoàn toàn 2D</li>
      <li>Tool: Figma, Adobe Aero, native Unreal/Unity</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">XR Animation &amp; Motion</h3>
    <ul class="arc-list">
      <li>Character animation cho VR — first/third person consideration</li>
      <li>Spatial transition, &quot;teleport&quot; effect, comfort consideration</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">XR Sound Designer</h3>
    <ul class="arc-list">
      <li>Spatial audio — 3D positioning critical cho immersion</li>
      <li>Sound design adaptive cho user position</li>
      <li>Tool: Wwise, FMOD, native engine spatial audio</li>
    </ul>
  </div>
</section>
`,
  },

  // 07. ExtendScript
  {
    id: "32da13e7-9f6d-4545-9667-8250e10f0630",
    tieu_de: "ExtendScript",
    tieu_de_viet: "ExtendScript (Adobe Scripting)",
    tom_tat:
      "ExtendScript là ngôn ngữ scripting dựa trên JavaScript cho phép tự động hóa các thao tác trong phần mềm Adobe — After Effects, Photoshop, Illustrator — tiết kiệm thời gian tác vụ lặp lại.",
    meta_title: "ExtendScript là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "ExtendScript tự động hóa Adobe software bằng JavaScript. Tìm hiểu cách viết script cho AE, Photoshop và build tool tăng năng suất.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn cần resize 200 ảnh trong Photoshop về chuẩn 1080×1080, save vào folder riêng. Manual = 2 giờ. Một script ExtendScript = 30 giây cho cả 200 ảnh. Hoặc trong After Effects, bạn cần tạo 50 composition giống nhau với 50 image khác. Script tự làm trong vài giây. Đây là power của ExtendScript — tự động hóa cho Adobe software.</p>
  <p>ExtendScript là tool cho power user của Adobe software — designer, motion artist muốn nâng cao năng suất. Hiểu cơ bản scripting mở ra possibility tự động hóa repetitive task, build tool riêng — đầu tư thời gian học có ROI cực kỳ cao.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>ExtendScript là gì?</h2>
  <p>ExtendScript là ngôn ngữ scripting của Adobe — dựa trên JavaScript (ECMAScript 3) với extension đặc thù cho Adobe software. Cho phép viết script tự động hóa hầu hết task có thể làm manually trong Adobe app: tạo/edit layer, apply effect, render, batch process, etc.</p>
  <p>Support phổ biến trên: After Effects, Photoshop, Illustrator, InDesign, Premiere Pro, Bridge. Script viết một lần dùng đi dùng lại, share giữa team — productivity multiplier khổng lồ cho heavy user.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">ExtendScript vs UXP (Unified Extensibility Platform)</span>
    <p>Adobe đang chuyển dần từ ExtendScript sang UXP — platform mới based on Node.js, modern JavaScript. Photoshop, InDesign mới prefer UXP. After Effects, Premiere vẫn chủ yếu ExtendScript. Học cả hai nếu plan develop tool cho Adobe stack dài hạn.</p>
  </div>

  <ul class="arc-list">
    <li><strong>.jsx file</strong> — ExtendScript file extension</li>
    <li><strong>ExtendScript Toolkit (ESTK)</strong> — IDE official (legacy)</li>
    <li><strong>VS Code + plugin</strong> — modern editor preferred</li>
    <li><strong>App Object Model</strong> — mỗi app có model riêng (app.project trong AE)</li>
    <li><strong>UI Panel (ScriptUI)</strong> — tạo panel UI cho script</li>
    <li><strong>Run via File → Scripts</strong> — execute script trong app</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"extendscript adobe after effects javascript automation"</span>
    </div>
    <p class="arc-image-caption">ExtendScript — JavaScript code tự động hóa Adobe app workflow</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Use Cases ExtendScript</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Batch Processing</summary>
      <div class="arc-card-body">
        <p>Xử lý hàng loạt file: resize, watermark, convert format. Photoshop batch action cho image, After Effects render multiple compositions. Việc 10 phút trở thành 10 giây.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Generate Compositions/Documents</summary>
      <div class="arc-card-body">
        <p>Tạo 50 composition giống nhau với 50 image khác (cho social media template). Hoặc 100 trang InDesign từ CSV data. Data-driven creation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Build Custom Panels</summary>
      <div class="arc-card-body">
        <p>UI panel với button, slider, dropdown control. Bán trên marketplace (aescripts, AEJuice). Một panel popular kiếm $5-50/user thousands user.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Animation Helpers</summary>
      <div class="arc-card-body">
        <p>Auto-rig, distribute layers, copy expression to multiple property. Save hours mỗi project.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Render Automation</summary>
      <div class="arc-card-body">
        <p>Setup render queue tự động, render farm coordination, post-render action (upload, notify).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pipeline Integration</summary>
      <div class="arc-card-body">
        <p>Connect AE với pipeline tool (Shotgun, ftrack), naming convention enforce, version control automation.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Học ExtendScript</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Resources</h3>
    <ul class="arc-list">
      <li>Adobe ExtendScript JavaScript Tools Guide (official)</li>
      <li>Adobe After Effects Scripting Guide</li>
      <li>aenhancers.com forum community</li>
      <li>Workbench by motion design YouTube creators</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Setup</h3>
    <ul class="arc-list">
      <li>VS Code + Adobe ExtendScript Debugger extension</li>
      <li>App version target — check API compat của AE/PS version</li>
      <li>Test trong app trước distribute</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">First Script Idea</h3>
    <ul class="arc-list">
      <li>Auto-naming layer theo convention team</li>
      <li>Distribute selected layers đều theo time</li>
      <li>Copy expression từ layer 1 sang multiple layers</li>
      <li>Export render queue as preset</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Monetization</h3>
    <ul class="arc-list">
      <li>aescripts.com — main marketplace</li>
      <li>Adobe Exchange — official Adobe</li>
      <li>Gumroad, own site — direct sales</li>
      <li>Popular tool: $5,000-50,000+ revenue/year</li>
    </ul>
  </div>
</section>
`,
  },

  // 08. Facial Capture
  {
    id: "e4ea2b9b-78b9-4977-8666-d00808585969",
    tieu_de: "Facial Capture",
    tieu_de_viet: "Bắt biểu cảm khuôn mặt (Facial Capture)",
    tom_tat:
      "Facial Capture là kỹ thuật ghi lại chuyển động và biểu cảm phức tạp của khuôn mặt diễn viên để áp dụng cho nhân vật 3D — tạo biểu cảm chân thực mà keyframe thủ công khó đạt được.",
    meta_title: "Facial Capture là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Facial Capture ghi biểu cảm diễn viên cho character 3D. Tìm hiểu marker-based, markerless, iPhone Face ID và workflow film, game.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem &quot;Avatar 2&quot; — Na&apos;vi character có biểu cảm khuôn mặt sâu sắc đến nỗi khán giả khóc theo họ. Hoặc Gollum trong &quot;Lord of the Rings&quot; — Andy Serkis face captured và transferred sang character CG. Đây là facial capture — kỹ thuật quan trọng nhất cho character realism trong film hiện đại.</p>
  <p>Facial Capture là kỹ thuật cao cấp cho character animator và VFX artist film. Hiểu workflow facial capture (marker-based, markerless, iPhone capture) giúp artist participate trong pipeline film hiện đại và game AAA — kỹ năng có demand cao và pay tốt.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Facial Capture là gì?</h2>
  <p>Facial Capture (hoặc Performance Capture cho face) là kỹ thuật ghi lại chuyển động và biểu cảm khuôn mặt của diễn viên thật bằng camera đặc biệt, sau đó transfer dữ liệu này lên nhân vật 3D. Cho phép tạo biểu cảm chân thực cho character CG mà animator keyframe thủ công khó đạt được — nuance của human emotion rất tinh tế, &quot;eye dart&quot; nhỏ, môi quirk subtle.</p>
  <p>Hai phương pháp chính: <strong>Marker-based</strong> — dán dot marker lên mặt actor, camera track marker; <strong>Markerless</strong> — AI/computer vision analyze actor face không cần marker (iPhone Face ID, recent ML-based system). Markerless ngày càng phổ biến vì convenience.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Tại sao facial capture quan trọng?</span>
    <p>Khuôn mặt human có 43 cơ chính tạo expression. Animator giỏi keyframe được, nhưng &quot;real human nuance&quot; cực khó replicate exactly. Capture từ actor giúp character feel real — audience response emotionally. Đây là lý do top film (Avatar, Planet of the Apes, Marvel) đều dùng facial capture cho CG character chính.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Marker-based</strong> — dot vẽ/dán lên face, camera track</li>
    <li><strong>Markerless</strong> — AI analyze face không marker</li>
    <li><strong>Head-mounted Camera</strong> — camera gắn helmet actor</li>
    <li><strong>FACS (Facial Action Coding System)</strong> — chuẩn coding expression của Paul Ekman</li>
    <li><strong>Blendshape</strong> — target shape cho expression</li>
    <li><strong>Retargeting</strong> — apply data từ actor lên character</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"facial capture motion performance actor marker helmet"</span>
    </div>
    <p class="arc-image-caption">Facial capture — actor với helmet camera capture biểu cảm cho character 3D</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Phương pháp Facial Capture</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Marker-based với Head-Mounted Camera</summary>
      <div class="arc-card-body">
        <p>Standard cho film. 60-100 marker vẽ lên face actor. Helmet với 1-2 camera capture mặt. Cao chất lượng nhất, expensive. Studios: Weta, ILM. Hệ thống: Cubic Motion, Faceware.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Markerless với Studio Camera</summary>
      <div class="arc-card-body">
        <p>Multiple camera HD/4K xung quanh face. AI/CV reconstruct geometry. No marker — nhanh setup, comfortable cho actor. Examples: Disguise Mocap.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>iPhone ARKit Face Tracking</summary>
      <div class="arc-card-body">
        <p>Revolutionary — iPhone 11+ track 52 blendshape real-time với TrueDepth camera. Apps: Live Link Face (Unreal), Face Cap, Faceware Mark IV. Quality đủ cho game cutscene, indie film.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Single Camera ML-based</summary>
      <div class="arc-card-body">
        <p>Modern ML analyze single video. Tool: Faceware Realtime, Move.ai. Convenience cao nhất nhưng quality less than dedicated system.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>MetaHuman Animator (Unreal)</summary>
      <div class="arc-card-body">
        <p>Epic&apos;s system — iPhone capture → MetaHuman character. Free, cao quality. Democratize facial capture cho indie game/film.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Facial Capture trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim VFX</h3>
    <ul class="arc-list">
      <li>Avatar series (Weta), Marvel — full performance capture</li>
      <li>Photoreal CG human (Rogue One Tarkin, Princess Leia)</li>
      <li>Cost: $millions cho setup, $10,000+/day session</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game AAA</h3>
    <ul class="arc-list">
      <li>The Last of Us 2, Death Stranding, God of War</li>
      <li>Cutscene cinematic với facial capture detail</li>
      <li>Hellblade Senua iPhone capture famous</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Virtual Production</h3>
    <ul class="arc-list">
      <li>Real-time facial capture cho virtual actor</li>
      <li>Live performance như Hatsune Miku concert</li>
      <li>VTuber industry — anime character driven bằng facial capture</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Indie Film &amp; Animation</h3>
    <ul class="arc-list">
      <li>iPhone facial capture cho indie project</li>
      <li>YouTube animation channel sử dụng facial capture</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Healthcare &amp; Education</h3>
    <ul class="arc-list">
      <li>Therapy training simulation</li>
      <li>Avatar communication cho người disability</li>
    </ul>
  </div>
</section>
`,
  },

  // 09. Facial Rigging
  {
    id: "30bd231a-f1bd-4bf1-adce-6902d876f6ca",
    tieu_de: "Facial Rigging",
    tieu_de_viet: "Rigging khuôn mặt 3D",
    tom_tat:
      "Facial Rigging là quá trình tạo hệ thống điều khiển (joint, blendshape, control) cho khuôn mặt nhân vật 3D — giúp animator tạo biểu cảm và chuyển động lip-sync dễ dàng.",
    meta_title: "Facial Rigging là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Facial Rigging tạo control biểu cảm cho character 3D. Tìm hiểu blendshape, joint-based rig, FACS và workflow rigging mặt chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn modeling một character 3D đẹp — nhưng làm sao nó cười, mếu, ngạc nhiên? Cần một &quot;rig&quot; — hệ thống điều khiển dưới mặt cho animator drive mặt như puppet. Facial rigging là một trong những technical phức tạp nhất trong 3D — nhưng cũng là kỹ năng tạo niche quý hiếm, well-paid.</p>
  <p>Facial Rigging là chuyên môn cao cấp cho 3D artist — đặc biệt cho character TD (Technical Director). Hiểu blendshape vs joint-based, FACS chuẩn và workflow rig chuyên nghiệp mở ra career path lương cao trong studio film/game lớn.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Facial Rigging là gì?</h2>
  <p>Facial Rigging là quá trình tạo hệ thống điều khiển (control system) cho khuôn mặt nhân vật 3D, cho phép animator hoặc facial capture data drive mặt một cách flexible và efficient. Rig phải đảm bảo: (1) deformation natural — mặt biến dạng realistic, (2) control intuitive — animator dễ tạo expression, (3) performance — tính toán nhanh cho real-time hoặc preview.</p>
  <p>Hai approach chính: <strong>Blendshape-based</strong> — mỗi expression là một mesh shape, animator blend giữa các shape; <strong>Joint-based</strong> — joint nhỏ dưới skin drive deformation. Modern rig thường combine cả hai — blendshape cho corrective + joint cho main deformation.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Blendshape vs Joint-based — đâu hơn?</span>
    <p><strong>Blendshape</strong>: precise control, sculpting tự do, easy retarget facial capture. Heavy file (mỗi shape = full mesh). <strong>Joint-based</strong>: efficient, dùng tốt cho game realtime. Khó sculpt subtle expression. <strong>Modern best practice</strong>: hybrid — joint chính + blendshape corrective cho detail.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Blendshape (Morph Target)</strong> — mesh shape variation</li>
    <li><strong>Joint-based</strong> — joint drive deformation</li>
    <li><strong>FACS Action Units</strong> — 43 muscle action codified</li>
    <li><strong>Controllers</strong> — visual handle cho animator</li>
    <li><strong>Constraints</strong> — link controller với joint/blendshape</li>
    <li><strong>SDK (Set Driven Key)</strong> — drive deformation theo controller</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"facial rig blendshape FACS character 3D maya"</span>
    </div>
    <p class="arc-image-caption">Facial rig — joint + blendshape + controller cho character expression</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Workflow Facial Rigging</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Reference &amp; Planning</summary>
      <div class="arc-card-body">
        <p>FACS reference image, expression study của actor real. List expression cần (sad, happy, anger, fear, disgust, surprise = 6 universal emotion).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Topology check</summary>
      <div class="arc-card-body">
        <p>Edge loop tròn miệng, mắt, mũi correct cho deformation. Lỗi topology = rig sai. Edge flow follow muscle direction.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Joint placement</summary>
      <div class="arc-card-body">
        <p>Joint chính: jaw, eyes, neck. Joint phụ: mỗi corner mouth, eyebrow, cheek. Skinning joint với weight smooth.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Blendshape sculpting</summary>
      <div class="arc-card-body">
        <p>Sculpt mỗi FACS action unit (AU1 inner brow raise, AU2 outer, etc.). Khoảng 40-60 blendshape cho production rig.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Corrective blendshapes</summary>
      <div class="arc-card-body">
        <p>Khi 2 blendshape combine có volume loss/intersection → sculpt corrective blendshape kick in lúc đó.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Controller setup</summary>
      <div class="arc-card-body">
        <p>NURBS curve làm visible handle. Slider bên mặt cho mỗi blendshape. Pose Editor hoặc Picker cho UX tốt hơn.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>7. Test &amp; iterate</summary>
      <div class="arc-card-body">
        <p>Animate test sentence (lip sync), full emotion range. Note vấn đề, fix. Multiple iteration với animator feedback.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Tools &amp; Tech</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Maya — chuẩn industry</h3>
    <ul class="arc-list">
      <li>Native blendshape, joint system</li>
      <li>Plugin: Advanced Skeleton, Studio Library</li>
      <li>Toolkit nội bộ ở studio film (proprietary)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Blender</h3>
    <ul class="arc-list">
      <li>Shape Keys (blendshape) + Bones</li>
      <li>Drivers cho automation</li>
      <li>Free, dùng được cho indie và game</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3ds Max</h3>
    <ul class="arc-list">
      <li>Morpher Modifier (blendshape)</li>
      <li>CAT, Biped cho body, custom rig face</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Unreal Engine MetaHuman</h3>
    <ul class="arc-list">
      <li>Photorealistic character với rig pre-built</li>
      <li>Workflow drag actor capture lên character ngay</li>
    </ul>
  </div>
</section>
`,
  },

  // 10. Fairlight
  {
    id: "57db5100-5088-4377-ae3f-b3c67980aeec",
    tieu_de: "Fairlight",
    tieu_de_viet: "Fairlight (DaVinci Resolve)",
    tom_tat:
      "Fairlight là bộ công cụ âm thanh chuyên nghiệp tích hợp trong DaVinci Resolve — mixer đa track, xử lý audio, ADR, Foley — cho phép làm toàn bộ post-production âm thanh trong một phần mềm.",
    meta_title: "Fairlight là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Fairlight trong DaVinci Resolve là DAW chuyên nghiệp tích hợp. Tìm hiểu mixer, audio post-production và workflow âm thanh cho film.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn dựng phim, color grade trong Resolve, rồi cần audio post — thường phải send sang Pro Tools, làm xong import back. Roundtrip complex, dễ lỗi. Blackmagic mua Fairlight và tích hợp vào Resolve — giờ bạn có thể edit, color, audio, và VFX (Fusion) hết trong một app duy nhất. Đó là power của Fairlight in Resolve.</p>
  <p>Fairlight là tool quan trọng cho video editor và filmmaker dùng DaVinci Resolve. Hiểu cơ bản Fairlight giúp workflow audio post production seamlessly — không cần invest Pro Tools, làm professional audio mix cho phim.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Fairlight là gì?</h2>
  <p>Fairlight là bộ công cụ âm thanh chuyên nghiệp được tích hợp trong DaVinci Resolve (Blackmagic Design). Trước khi Blackmagic acquire, Fairlight là DAW chuyên cho film/TV post-production từ những năm 1980. Hiện tại nó là một &quot;page&quot; trong Resolve — tab dành riêng cho audio editing và mixing.</p>
  <p>Fairlight có đầy đủ tính năng của một DAW chuyên nghiệp: mixer đa track (lên tới 1,000 track), inserts effect (EQ, compression, reverb), bus routing, ADR tools, Foley sync, sound design library, automation, audio editing. Đủ để làm toàn bộ post-production audio cho feature film mà không cần Pro Tools.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Fairlight vs Pro Tools</span>
    <p><strong>Pro Tools</strong>: chuẩn industry decades, ubiquitous trong studio film. Subscription expensive. <strong>Fairlight</strong>: free trong Resolve Free tier (basic) + Studio tier $295 (full). Newer, ít plugin third-party hơn, nhưng features chính có đủ. Resolve Studio one-time = cheaper than 1 năm Pro Tools.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Mixer Window</strong> — channel strip cho mỗi track</li>
    <li><strong>Bus / Aux</strong> — group track cho processing chung</li>
    <li><strong>Sound Library</strong> — built-in SFX, ambience</li>
    <li><strong>ADR Tools</strong> — automated dialogue replacement</li>
    <li><strong>Foley Editor</strong> — sync sound effect với picture</li>
    <li><strong>Loudness Meter</strong> — LUFS measurement cho broadcast compliance</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"fairlight davinci resolve audio mixer post production"</span>
    </div>
    <p class="arc-image-caption">Fairlight page trong Resolve — DAW chuyên nghiệp tích hợp với edit/color</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Tính năng Fairlight</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Multi-track Mixer</summary>
      <div class="arc-card-body">
        <p>1,000+ track support. Mỗi track full channel strip — EQ, dynamics, sends. Color coding, grouping cho organization.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Built-in Effects</summary>
      <div class="arc-card-body">
        <p>EQ, compressor, gate, expander, limiter, reverb, delay, modulation. FairlightFX bundle có 20+ plugin chuyên nghiệp. VST3, AU support thêm 3rd party.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Voice Isolation (AI)</summary>
      <div class="arc-card-body">
        <p>Studio tier feature — AI tách voice từ background. Tương đương iZotope RX cho noise reduction nhanh. Powerful cho dialogue cleanup.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Dialogue Leveler</summary>
      <div class="arc-card-body">
        <p>AI normalize dialogue level tự động — match volume across multiple clip. Time-saver cho doc, interview project.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Atmos &amp; Spatial Audio</summary>
      <div class="arc-card-body">
        <p>Resolve 18+ support Dolby Atmos mixing. Object-based positioning, render Atmos master. Cao cấp cho film modern.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sound Library</summary>
      <div class="arc-card-body">
        <p>Built-in SFX library searchable. Foley, ambience, transition. Save time vs license library bên ngoài.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>ADR Tools</summary>
      <div class="arc-card-body">
        <p>Workflow tự động cho re-recording dialogue. Cue, beep, record, sync với picture. Professional ADR pipeline.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Audio Post trong Fairlight</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Import &amp; Organize</h3>
    <ul class="arc-list">
      <li>Edit page xong → switch sang Fairlight</li>
      <li>Audio track từ edit auto-populate</li>
      <li>Color code track: Dialogue, Music, SFX, Ambience</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Dialogue Edit</h3>
    <ul class="arc-list">
      <li>Cleanup dialogue — remove breath, mouth noise</li>
      <li>Voice Isolation cho noise reduction</li>
      <li>Dialogue Leveler cho consistent volume</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Sound Design</h3>
    <ul class="arc-list">
      <li>Add SFX từ Sound Library hoặc imported</li>
      <li>Foley sync với action onscreen</li>
      <li>Ambience layer cho scene environment</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Music Edit</h3>
    <ul class="arc-list">
      <li>Place music cue, edit timing</li>
      <li>Ducking automation khi có dialogue</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Mix</h3>
    <ul class="arc-list">
      <li>EQ, compression mỗi track</li>
      <li>Bus routing — Dialogue bus, Music bus, SFX bus</li>
      <li>Final mix on master bus với limiter</li>
      <li>Check loudness meter — broadcast -23 LUFS, cinema -27 LKFS</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Deliver</h3>
    <ul class="arc-list">
      <li>Render audio stems hoặc full mix</li>
      <li>Export Pro Tools session (AAF) nếu cần collaboration</li>
      <li>Atmos master cho theatrical release</li>
    </ul>
  </div>
</section>
`,
  },
];

console.log(`\n── Bắt đầu chạy ${items.length} bài keyword đợt 1.9 ──\n`);

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
