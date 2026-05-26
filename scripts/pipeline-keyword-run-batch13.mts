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
  // 01. Grooming Simulation
  {
    id: "a1d5aab1-723b-49aa-beac-8f8d6baa4ef9",
    tieu_de: "Grooming Simulation",
    tieu_de_viet: "Tạo kiểu &amp; mô phỏng tóc/lông",
    tom_tat:
      "Grooming Simulation là mô phỏng và tạo kiểu tóc, lông, cỏ trong 3D — kết hợp tạo hình ban đầu (grooming) và vật lý simulation khi chuyển động. Critical cho character realistic và creature animal.",
    meta_title:
      "Grooming Simulation là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Grooming Simulation tạo và mô phỏng tóc, lông 3D. Tìm hiểu XGen, Yeti, Ornatrix và workflow grooming cho character realistic.",
    noi_dung: `
<section class="arc-intro">
  <p>Trong &quot;Lion King&quot; remake (2019), mỗi con sư tử có hàng triệu sợi lông được simulate riêng — chuyển động trong gió, ướt khi gặp nước, tự bend khi sư tử nằm. Trong &quot;Disney&apos;s Tangled&quot;, Rapunzel hair là 100,000+ strand individually animated. Đây là <strong>Grooming Simulation</strong> — một trong những technical đỉnh cao của 3D character pipeline.</p>
  <p>Grooming Simulation là chuyên môn quý hiếm trong VFX/animation industry. Hiểu workflow grooming + simulation giúp artist transition vào character TD role — well-paid niche với demand cao tại studio film, game AAA.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Grooming Simulation là gì?</h2>
  <p>Grooming Simulation là quá trình 2 bước: (1) <strong>Grooming</strong> — tạo hình và style tóc/lông/cỏ ban đầu trên character/object 3D; (2) <strong>Simulation</strong> — apply vật lý cho strand di chuyển realistic khi character animate (gravity, wind, character motion). Cho phép tạo hair/fur character realistic mà keyframe thủ công không thể.</p>
  <p>Bao gồm: character hair (long hair Rapunzel, short hair human), animal fur (Lion King sư tử, dog character), feather (chim, monster), grass (environment field), thread (cloth detail). Mỗi loại có challenges riêng — long hair physics complex, dense fur expensive compute, feather layering.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Grooming vs Hair Card</span>
    <p><strong>Grooming (curves-based)</strong>: mỗi strand là một curve geometry. Realistic, simulate physics. Heavy compute. Film, AAA game cinematic. <strong>Hair Card (plane-based)</strong>: plane geometry với hair texture. Cheap, real-time game. Game realtime mostly use cards; cinema curves.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Guide Curves</strong> — primary curves define overall flow</li>
    <li><strong>Density</strong> — strand count per area</li>
    <li><strong>Clumping</strong> — strands stick together group</li>
    <li><strong>Frizz / Noise</strong> — variation per strand</li>
    <li><strong>Roots / Tips</strong> — color, thickness variation along length</li>
    <li><strong>Wind / Collision Dynamics</strong> — simulation parameter</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"grooming simulation hair fur character XGen yeti 3D"</span>
    </div>
    <p class="arc-image-caption">Grooming Simulation — guide curves, density, simulation cho hair/fur realistic</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Tools Grooming</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Maya XGen</summary>
      <div class="arc-card-body">
        <p>Native trong Maya. Industry standard cho character hair film. Workflow: guide curves → interactive scatter → modifier (clump, noise) → simulation via nHair/nCloth.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Yeti (Peregrine Labs)</summary>
      <div class="arc-card-body">
        <p>Maya plugin chuyên cho hair/fur. Node-based, very flexible. Popular tại MPC, Animal Logic, ILM. Strong cho creature fur.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ornatrix</summary>
      <div class="arc-card-body">
        <p>Available cho Max, Maya, C4D. Node-based workflow. Good balance giữa power và usability. Popular cho freelance VFX.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender Hair (Geometry Nodes)</summary>
      <div class="arc-card-body">
        <p>Modern Blender hair system based on Geometry Nodes (4.0+). Free, powerful. Indie/personal project.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Houdini Hair</summary>
      <div class="arc-card-body">
        <p>Native Houdini hair tools. Strong simulation (Vellum cho hair physics). Procedural approach unique.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Unreal Engine Groom System</summary>
      <div class="arc-card-body">
        <p>Real-time hair trong UE. Import .abc curves from XGen/Yeti. Realtime simulation. Used in MetaHuman.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Pipeline Grooming</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Reference</h3>
    <ul class="arc-list">
      <li>Photo reference hair type — straight, wavy, curly</li>
      <li>Real hair length, density</li>
      <li>Animal fur reference photo, video</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Guide Curves</h3>
    <ul class="arc-list">
      <li>Place guide curves trên scalp/body</li>
      <li>Define direction flow, length variation</li>
      <li>50-200 guide curves điển hình cho character</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Interactive Grooming</h3>
    <ul class="arc-list">
      <li>Tools brush hair like real hair stylist</li>
      <li>Comb, length adjust, density control</li>
      <li>Iterate với art director</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Modifiers</h3>
    <ul class="arc-list">
      <li>Clump: strands stick together</li>
      <li>Frizz: random offset variation</li>
      <li>Curl: spiral pattern</li>
      <li>Cut/length variation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Simulation</h3>
    <ul class="arc-list">
      <li>Setup physics: stiffness, damping, mass</li>
      <li>Collision với character body</li>
      <li>Wind force, gravity</li>
      <li>Cache simulation result</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Render</h3>
    <ul class="arc-list">
      <li>Hair shader — anisotropic specular, subsurface</li>
      <li>Marschner hair model chuẩn cho realistic</li>
      <li>Render heavy — millions of curves</li>
    </ul>
  </div>
</section>
`,
  },

  // 02. HDR
  {
    id: "263f1722-95d0-41f0-8388-16414160cda9",
    tieu_de: "HDR (High Dynamic Range)",
    tieu_de_viet: "Dải nhạy sáng cao (HDR)",
    tom_tat:
      "HDR (High Dynamic Range) là công nghệ mở rộng phạm vi độ sáng và màu sắc — hiển thị chi tiết đồng thời ở vùng rất tối và rất sáng. Chuẩn cho TV/monitor cao cấp, phim, photography modern.",
    meta_title: "HDR là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "HDR mở rộng dải sáng video, ảnh. Tìm hiểu HDR10, Dolby Vision và workflow grading HDR cho content modern.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem cùng cảnh hoàng hôn trên TV cũ và TV HDR mới — TV cũ thấy sun trắng cháy, sky flat; TV HDR thấy sun rực sáng với chi tiết, sky có gradient phong phú, foreground shadow vẫn có detail. Đây là HDR — High Dynamic Range — một trong những advance lớn nhất của display technology decade 2010s.</p>
  <p>HDR là kiến thức quan trọng cho colorist, DOP, photographer modern. Hiểu HDR vs SDR, các chuẩn (HDR10, Dolby Vision), workflow grading giúp content creator deliver cho platform yêu cầu — Netflix, Apple, streaming cao cấp.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>HDR là gì?</h2>
  <p>HDR (High Dynamic Range) là công nghệ video/photo cho phép hiển thị <strong>phạm vi độ sáng (luminance) rộng hơn nhiều</strong> so với SDR (Standard Dynamic Range) truyền thống. SDR: 100 nits peak brightness, 8-bit color (16.7M colors). HDR: up to 10,000 nits peak, 10-12 bit color (1 billion+ colors). Kết quả: highlight rực rỡ, shadow sâu, mid-tone phong phú đồng thời.</p>
  <p>HDR yêu cầu cả <strong>content</strong> (capture/grade trong HDR), <strong>delivery format</strong> (HDR10, Dolby Vision, HDR10+), <strong>display</strong> (TV/monitor HDR-capable). Thiếu bất kỳ link nào, viewer không có HDR experience. Modern streaming (Netflix, Apple TV+, Disney+) push hard cho HDR content premium.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">HDR Photography vs HDR Video</span>
    <p><strong>HDR Photography</strong>: technique combine multiple exposure (bracketing) để tăng dynamic range trong single image. Common từ 2000s. <strong>HDR Video</strong>: display technology cho phép hiển thị wider range — needs HDR display. Hai concept different nhưng same goal: wider dynamic range.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Nits</strong> — đơn vị độ sáng (cd/m²)</li>
    <li><strong>Peak Brightness</strong> — max luminance display có thể</li>
    <li><strong>10-bit / 12-bit Color</strong> — bit depth màu cao</li>
    <li><strong>Wide Color Gamut</strong> — Rec.2020 vs Rec.709 (SDR)</li>
    <li><strong>PQ (Perceptual Quantizer)</strong> — HDR10 transfer function</li>
    <li><strong>HLG (Hybrid Log-Gamma)</strong> — broadcast HDR</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"HDR vs SDR comparison high dynamic range video display"</span>
    </div>
    <p class="arc-image-caption">HDR — phạm vi sáng rộng, color phong phú so với SDR truyền thống</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Chuẩn HDR phổ biến</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>HDR10 (Open Standard)</summary>
      <div class="arc-card-body">
        <p>Open, không license phí. Static metadata (cho toàn phim). 10-bit color, 1000 nits typical. Phổ biến nhất — most HDR TV support.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>HDR10+ (Samsung-led)</summary>
      <div class="arc-card-body">
        <p>Open extension HDR10 với dynamic metadata (per-scene tuning). Free alternative to Dolby Vision. Adoption growing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Dolby Vision (Premium)</summary>
      <div class="arc-card-body">
        <p>License-based, dynamic metadata, 12-bit color, up to 10,000 nits. Highest quality. Premium tier Netflix, Apple TV+, Disney+. Cinema premium tier.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>HLG (Hybrid Log-Gamma)</summary>
      <div class="arc-card-body">
        <p>BBC + NHK developed cho broadcast — backwards compatible với SDR. Live TV friendly. Less popular cho streaming.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>HDR trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Streaming &amp; Film</h3>
    <ul class="arc-list">
      <li>Netflix, Disney+, Apple TV+ — premium content HDR</li>
      <li>Cinema Dolby Cinema theatres</li>
      <li>Modern blockbusters mastered HDR</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photography</h3>
    <ul class="arc-list">
      <li>HDR photo blending bracketed exposures</li>
      <li>iPhone HDR auto since iPhone 4</li>
      <li>Lightroom, Photoshop HDR Merge feature</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Gaming</h3>
    <ul class="arc-list">
      <li>PS5, Xbox Series X|S native HDR output</li>
      <li>HDR-capable game (Horizon, God of War, Forza)</li>
      <li>Game engine modern (UE5, Unity HDRP) support HDR</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Mobile Content</h3>
    <ul class="arc-list">
      <li>iPhone 12+ quay Dolby Vision native</li>
      <li>Easy HDR content creation cho social media</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Reference Monitor</h3>
    <ul class="arc-list">
      <li>Sony BVM-HX310 ($30K) — colorist reference</li>
      <li>FSI XM310K — alternative</li>
      <li>Mid-range: Apple Pro Display XDR</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>HDR Workflow Grading</h2>
  <ul class="arc-list">
    <li><strong>Quay log/RAW</strong> — wide dynamic range source</li>
    <li><strong>HDR reference monitor</strong> — Sony, FSI, Apple XDR minimum</li>
    <li><strong>Grade trong DaVinci Resolve / Baselight</strong> — chuyên cho HDR</li>
    <li><strong>Target 1000-4000 nits</strong> — depend on deliverable</li>
    <li><strong>Trim Pass</strong> — Dolby Vision tune cho display variants</li>
    <li><strong>QC trên multiple display</strong> — TV consumer khác reference</li>
  </ul>
</section>
`,
  },

  // 03. Histogram
  {
    id: "8e0b8bb1-fe22-4d62-bbec-95ffa0e588c0",
    tieu_de: "Histogram",
    tieu_de_viet: "Biểu đồ Histogram",
    tom_tat:
      "Histogram là biểu đồ hiển thị sự phân bố tông màu của hình ảnh/video — cho biết mức độ sáng tối và độ tương phản. Công cụ cơ bản nhất cho photographer, video colorist.",
    meta_title: "Histogram là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Histogram phân tích tông màu ảnh, video. Tìm hiểu cách đọc histogram và ứng dụng trong photo editing, color grading.",
    noi_dung: `
<section class="arc-intro">
  <p>Photographer pro nhìn ảnh không tin mắt — họ check <strong>histogram</strong>. Vì màn hình laptop khác monitor calibrated, mắt fatigued sau giờ làm việc. Histogram tell sự thật khách quan — &quot;ảnh có bị underexposed?&quot;, &quot;highlight có clip?&quot;, &quot;contrast đủ chưa?&quot;. Đây là một trong những tool basic nhất nhưng power nhất.</p>
  <p>Histogram là kiến thức cơ bản cho photographer, video colorist, designer. Hiểu cách đọc histogram và sử dụng cho exposure correction giúp output chuyên nghiệp — không dependent on subjective monitor calibration.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Histogram là gì?</h2>
  <p>Histogram là biểu đồ thống kê <strong>phân bố tông sáng (luminance)</strong> của hình ảnh hoặc video. Trục ngang: shadows (đen) bên trái → midtones (xám) giữa → highlights (trắng) bên phải. Trục dọc: số pixel ở mỗi tonal value. Histogram cho biết ảnh có balanced exposure, có blown out (highlights cháy), có crushed (shadows đen tuyền) hay không.</p>
  <p>Có nhiều loại histogram: <strong>Luminance histogram</strong> (tổng brightness), <strong>RGB histogram</strong> (separate red, green, blue), <strong>Waveform</strong> (signal video display ngang), <strong>Vectorscope</strong> (color hue và saturation). Mỗi tool cho insight khác — pro dùng đa scope simultaneously.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Histogram cho ảnh &quot;đẹp&quot; trông như thế nào?</span>
    <p>Không có &quot;perfect histogram&quot; — depends on subject. <strong>Daytime portrait</strong>: bell curve, midtone-heavy. <strong>Low-key dark photo</strong>: data tập trung left side, intentional. <strong>High-key bright</strong>: data tập trung right. Quan trọng: avoid clipping (data chạm hoàn toàn left/right edge → loss detail), trừ khi intentional.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Shadows</strong> — left side (0-25%)</li>
    <li><strong>Midtones</strong> — middle (25-75%)</li>
    <li><strong>Highlights</strong> — right side (75-100%)</li>
    <li><strong>Clipping</strong> — data spike at edge — loss detail</li>
    <li><strong>RGB Histogram</strong> — separate channels</li>
    <li><strong>Waveform</strong> — alternative scope for video</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"histogram photography lightroom photoshop tonal distribution"</span>
    </div>
    <p class="arc-image-caption">Histogram — phân bố pixel từ shadow (left) đến highlight (right)</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Cách đọc Histogram</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Balanced Exposure</summary>
      <div class="arc-card-body">
        <p>Data spread đều across range, không clipping at edges. Bell curve hoặc plateau shape. &quot;Good exposure&quot; cho most subject.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Underexposed</summary>
      <div class="arc-card-body">
        <p>Data heavy bên trái, ít bên phải. Shadows clip → black detail mất. Ảnh tổng thể tối, thiếu sáng. Tăng exposure.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Overexposed</summary>
      <div class="arc-card-body">
        <p>Data heavy bên phải, clip at white edge. Highlights blown out — sky trắng tuyền, hết detail. Giảm exposure.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Low Contrast</summary>
      <div class="arc-card-body">
        <p>Data tập trung giữa, không reach to edges. Ảnh flat, gray. Tăng contrast (S-curve).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>High Contrast</summary>
      <div class="arc-card-body">
        <p>Data spread to both edges, valley ở middle. Dramatic, sometimes too much. Reduce contrast nếu lose subtle midtone.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Cast (RGB Histogram)</summary>
      <div class="arc-card-body">
        <p>One channel shifted noticeably khác hai channel kia → color cast. White balance issue. Correct trong post.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Histogram trong từng phần mềm</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Camera (Live)</h3>
    <ul class="arc-list">
      <li>Most DSLR/Mirrorless show histogram trong playback</li>
      <li>Live histogram trên EVF (mirrorless) — exposure check real-time</li>
      <li>Quan trọng nhất vì check trên field</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Lightroom</h3>
    <ul class="arc-list">
      <li>Histogram corner trên</li>
      <li>Drag region directly để adjust exposure</li>
      <li>Clipping warning (red, blue indicator)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photoshop</h3>
    <ul class="arc-list">
      <li>Window → Histogram</li>
      <li>Curves, Levels adjustment với histogram visible</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">DaVinci Resolve / Premiere</h3>
    <ul class="arc-list">
      <li>Color page (Resolve) — histogram + waveform + vectorscope</li>
      <li>Lumetri Scopes (Premiere) — multiple scope display</li>
      <li>Standard cho color grading</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Capture One, Affinity, GIMP</h3>
    <ul class="arc-list">
      <li>Tất cả professional photo software có histogram</li>
      <li>Free GIMP cũng có</li>
    </ul>
  </div>
</section>
`,
  },

  // 04. HRTF
  {
    id: "fb1192e3-71fd-44c6-9bb6-9b9ba75f65ac",
    tieu_de: "HRTF (Head-Related Transfer Function)",
    tieu_de_viet: "HRTF — Hàm truyền đầu",
    tom_tat:
      "HRTF (Head-Related Transfer Function) là hàm toán mô tả cách tai và đầu con người thay đổi sóng âm — dùng để tạo hiệu ứng âm thanh 3D sống động cho VR, gaming, music binaural.",
    meta_title: "HRTF là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "HRTF tạo âm thanh 3D cho headphone. Tìm hiểu cơ chế, ứng dụng trong VR, game audio, binaural music recording.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn nghe ASMR binaural recording — tiếng người đi vòng quanh đầu, vô cùng realistic. Hoặc play VR game với audio — nghe enemy approach từ phía sau bên trái chính xác. Trên tai nghe stereo thường (chỉ 2 channel), làm sao &quot;hear&quot; 3D? Câu trả lời: <strong>HRTF</strong> — Head-Related Transfer Function. Một trong những công nghệ thú vị nhất của audio modern.</p>
  <p>HRTF là kiến thức quan trọng cho sound designer VR, game audio engineer, binaural music producer. Hiểu HRTF mở khả năng tạo audio 3D realistic trên headphone — critical cho VR experience, gaming immersive.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>HRTF là gì?</h2>
  <p>HRTF (Head-Related Transfer Function) là hàm toán học mô tả cách <strong>sóng âm thay đổi</strong> khi đi từ nguồn âm đến tai trong (eardrum), do tương tác với đầu, vai, tai ngoài (pinna). Mỗi person có HRTF riêng — vì shape đầu/tai khác. HRTF cho phép não localize sound trong 3D — &quot;from front, back, left, right, above&quot;.</p>
  <p>Trong audio 3D: encode HRTF vào mono sound source → output binaural stereo trên headphone, brain perceive sound từ direction định trước trong 3D space. Magic không cần loa surround — chỉ 2 channel headphone. Foundation cho VR audio, game spatial audio (Dolby Atmos for Headphones, Sony Tempest 3D), Apple AirPods Spatial Audio.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Generic vs Personalized HRTF</span>
    <p><strong>Generic HRTF</strong>: average measurement từ multiple subjects (KEMAR dummy head). Work tốt cho most users. <strong>Personalized HRTF</strong>: measure individual ear shape (photo, scan). Apple AirPods Pro 2 + iPhone scan ear cho personalized. Quality dramatically better cho user — exact match.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Pinna</strong> — outer ear, ảnh hưởng most đến HRTF</li>
    <li><strong>ITD (Interaural Time Difference)</strong> — sound arrive ear trái vs phải khác thời gian</li>
    <li><strong>ILD (Interaural Level Difference)</strong> — volume difference giữa hai tai</li>
    <li><strong>Pinna Filtering</strong> — outer ear filter frequencies based on angle</li>
    <li><strong>Binaural Recording</strong> — record với dummy head có HRTF built-in</li>
    <li><strong>Convolution</strong> — math process apply HRTF lên audio</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"HRTF head related transfer function 3D audio binaural"</span>
    </div>
    <p class="arc-image-caption">HRTF — math function cho phép âm thanh 3D realistic trên headphone</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>HRTF trong từng lĩnh vực</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>VR Audio</summary>
      <div class="arc-card-body">
        <p>Critical cho VR immersion — wrong audio direction = motion sickness. Meta Quest, Apple Vision Pro, PSVR2 đều dùng HRTF audio system. Audio &quot;sells&quot; presence cho VR.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Game Spatial Audio</summary>
      <div class="arc-card-body">
        <p>FPS competitive — hear enemy position critical. Dolby Atmos for Headphones, Windows Sonic, Tempest 3D (PS5), Apple Spatial Audio (Vision Pro/AirPods). HRTF-based.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Binaural Music &amp; ASMR</summary>
      <div class="arc-card-body">
        <p>Record với dummy head (Neumann KU100) có HRTF natural. Music album binaural recording trend. ASMR YouTube creator với binaural mic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Apple Spatial Audio</summary>
      <div class="arc-card-body">
        <p>Apple Music tracks mastered Dolby Atmos → render binaural via HRTF cho AirPods. Personalized HRTF qua iPhone scan ear.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Film Post Headphone Mix</summary>
      <div class="arc-card-body">
        <p>Phim mix Dolby Atmos cinema → render headphone mix với HRTF cho streaming consumption.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Accessibility &amp; Therapy</summary>
      <div class="arc-card-body">
        <p>Audio cho visually impaired — spatial cue with HRTF help navigation. Sound therapy với spatial sound design.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Tools HRTF</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Engine Audio</h3>
    <ul class="arc-list">
      <li>Unreal Engine Steam Audio plugin</li>
      <li>Unity Steam Audio, Resonance Audio</li>
      <li>Wwise có HRTF spatializer</li>
      <li>FMOD Studio HRTF support</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">DAW Plugins</h3>
    <ul class="arc-list">
      <li>Dear Reality dearVR Pro — chuẩn cho VR audio</li>
      <li>Waves Nx — binaural rendering</li>
      <li>IEM Plugin Suite (free, open source)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Recording (Binaural)</h3>
    <ul class="arc-list">
      <li>Neumann KU100 dummy head — chuẩn industry</li>
      <li>3Dio Free Space Pro — affordable</li>
      <li>Roland CS-10EM in-ear binaural mic</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">HRTF Database (cho research/custom)</h3>
    <ul class="arc-list">
      <li>CIPIC HRTF Database — academic standard</li>
      <li>MIT KEMAR HRTF data — free</li>
      <li>Sound Lab UC Davis — research database</li>
    </ul>
  </div>
</section>
`,
  },

  // 05. HUD
  {
    id: "8534a31b-799c-4fe4-9380-3fea0cb09cbc",
    tieu_de: "HUD (Heads-Up Display)",
    tieu_de_viet: "Giao diện hiển thị HUD",
    tom_tat:
      "HUD (Heads-Up Display) là khu vực hiển thị thông tin quan trọng trong game (HP, đạn, mini-map) trên màn hình — cho phép player không cần nhìn đi nơi khác. Là tâm điểm của UI/UX game design.",
    meta_title: "HUD là gì? Ý nghĩa và ứng dụng trong thiết kế game | CINS",
    meta_description:
      "HUD trong game hiển thị HP, ammo, map. Tìm hiểu nguyên tắc thiết kế HUD chuyên nghiệp, examples và best practices UX.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn play FPS — corner trên trái có HP bar, corner dưới phải có ammo count, giữa có crosshair, top có mini-map. Player nhìn 0.1s là biết toàn bộ tình hình. Đây là <strong>HUD</strong> — UI critical của game. HUD tốt invisible (player không &quot;notice&quot; nó nhưng đọc info instinct). HUD tệ distract, confuse, ruin experience.</p>
  <p>HUD design là chuyên môn quan trọng cho game UI/UX designer. Hiểu principles, examples và workflow giúp design HUD intuitive cho game — yếu tố ảnh hưởng trực tiếp đến game feel và player satisfaction.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>HUD là gì?</h2>
  <p>HUD (Heads-Up Display) là phần UI hiển thị thông tin gameplay critical trên màn hình mà không che obstruct view chính của player. Nguồn gốc từ aviation — fighter pilot có HUD trên kính windshield để check tốc độ, altitude không nhìn xuống dashboard. Game adopt concept này từ early arcade — Pac-Man score, Pong score.</p>
  <p>Common HUD elements: <strong>health/HP bar</strong>, <strong>ammo count</strong>, <strong>mini-map</strong>, <strong>objective indicator</strong>, <strong>crosshair</strong>, <strong>compass</strong>, <strong>buff/debuff icons</strong>, <strong>cooldown timer</strong>, <strong>chat (multiplayer)</strong>. Mỗi game genre có HUD pattern riêng — FPS, MMORPG, MOBA, strategy đều unique.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Diegetic vs Non-Diegetic HUD</span>
    <p><strong>Diegetic HUD</strong>: in-world UI — character thấy được. Iron Man helmet HUD, Dead Space health on suit, Mirror&apos;s Edge intrinsic visual cue. Immersive nhưng harder design. <strong>Non-Diegetic HUD</strong>: floating UI ngoài game world. Most game dùng — easier read, faster process. Modern game đôi khi mix cả hai.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Health/HP Bar</strong> — vitality indicator</li>
    <li><strong>Ammo / Resource Count</strong> — equipment status</li>
    <li><strong>Mini-Map / Compass</strong> — spatial awareness</li>
    <li><strong>Crosshair / Reticle</strong> — aim indicator (FPS/TPS)</li>
    <li><strong>Quest / Objective Marker</strong> — goal direction</li>
    <li><strong>Buff/Debuff Icons</strong> — status effect</li>
    <li><strong>Cooldown Timer</strong> — ability availability</li>
    <li><strong>Chat / Comms</strong> — multiplayer communication</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"HUD game design FPS RPG UI UX heads up display"</span>
    </div>
    <p class="arc-image-caption">HUD — critical info hiển thị trên màn hình, không gián đoạn gameplay</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>HUD trong từng Game Genre</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>FPS (Counter-Strike, COD, Valorant)</summary>
      <div class="arc-card-body">
        <p>Minimal HUD — crosshair center, HP/armor bottom-left, ammo bottom-right. Focus vào aiming. Map M-key full overlay vs minimap corner.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>RPG (Skyrim, Witcher, FF)</summary>
      <div class="arc-card-body">
        <p>Heavy HUD — HP/MP bar, mini-map, compass, quest objective, buffs, hotbar. Complex but informative. Skyrim minimalist style.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>MOBA (League, Dota 2)</summary>
      <div class="arc-card-body">
        <p>Bottom large UI — abilities, items, stats. Mini-map huge corner. Health bar over each hero. Score top.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>MMORPG (WoW, FF14)</summary>
      <div class="arc-card-body">
        <p>Dense — multiple hotbars, party frame, chat, quest tracker, raid frame. Customizable critical. Heavy UI mod ecosystem.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Strategy (Starcraft, Civ)</summary>
      <div class="arc-card-body">
        <p>Resource bar top, mini-map corner, command panel bottom. Heavy info density. Top-down view less HUD obstructive.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Racing (Forza, Gran Turismo)</summary>
      <div class="arc-card-body">
        <p>Speed gauge, rev meter, mini-map track, position. Diegetic style với in-car dashboard. Customizable HUD.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Simulation (Flight, Cities)</summary>
      <div class="arc-card-body">
        <p>Realistic style — replicate real cockpit, city dashboard. Detail-heavy cho enthusiast.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Principles thiết kế HUD tốt</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Minimal &amp; Necessary</h3>
    <ul class="arc-list">
      <li>Chỉ show info player cần real-time</li>
      <li>Hide info trong menu/inventory cho detail</li>
      <li>Less is more — declutter</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Position theo Priority</h3>
    <ul class="arc-list">
      <li>Most critical (HP, ammo) — corner easy glance</li>
      <li>Center for active interaction (crosshair)</li>
      <li>Avoid blocking center view</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Consistent Visual Language</h3>
    <ul class="arc-list">
      <li>Color code consistent — red = damage, green = heal, blue = mana</li>
      <li>Icons immediately recognizable</li>
      <li>Match game art style</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Responsive Feedback</h3>
    <ul class="arc-list">
      <li>HP bar shake when take damage</li>
      <li>Ammo flash when low</li>
      <li>Animation provide feedback meaningful</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Accessibility</h3>
    <ul class="arc-list">
      <li>Colorblind option</li>
      <li>Text size adjustable</li>
      <li>HUD scale option cho different screen</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Customizable (when complex)</h3>
    <ul class="arc-list">
      <li>RPG/MMO — let player reposition elements</li>
      <li>Hide certain HUD player don&apos;t need</li>
      <li>Empower advanced player</li>
    </ul>
  </div>
</section>
`,
  },

  // 06. Hypershade
  {
    id: "1d25d55e-62ee-4ceb-b2e5-a21d271fa920",
    tieu_de: "Hypershade",
    tieu_de_viet: "Hypershade (Maya Material Editor)",
    tom_tat:
      "Hypershade là cửa sổ trong Autodesk Maya cho phép tạo, chỉnh sửa và quản lý mọi vật liệu, texture, lighting node trong scene — node-based editor cho shading workflow chuyên nghiệp.",
    meta_title: "Hypershade là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Hypershade Maya cho phép tạo material 3D. Tìm hiểu node-based shading, Standard Surface và workflow texturing chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn modeling character trong Maya — giờ cần apply texture, set up material. Mở <strong>Hypershade</strong> — visual node editor cho shading. Connect file texture node → Standard Surface shader → assign to mesh. Đây là material workflow chuẩn industry — Maya Hypershade là gold standard cho 30 năm.</p>
  <p>Hypershade là tool cơ bản cho mọi Maya artist — modeler, texture artist, lighting TD. Hiểu node-based shading trong Hypershade là kỹ năng nền tảng — transfer được sang Houdini, Substance Designer, Unreal Material Editor.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Hypershade là gì?</h2>
  <p>Hypershade là cửa sổ trong Autodesk Maya dành cho <strong>tạo và chỉnh sửa material, texture, lighting, render node</strong>. Là node-based editor — mỗi node represents một function (color, math operation, texture file, shader), connect bằng line. Visual programming cho shading — artist build complex material không cần code.</p>
  <p>Hypershade có 4 area chính: (1) <strong>Browser</strong> top-left — list all material trong scene; (2) <strong>Create panel</strong> left — node library; (3) <strong>Work area</strong> center — node graph editor; (4) <strong>Property editor</strong> right — adjust selected node values. Workflow: drag node from Create → connect → tweak property → assign material to mesh.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Standard Surface — PBR shader chuẩn</span>
    <p>Standard Surface (Maya 2020+) là PBR shader chuẩn — replace older aiStandardSurface, Blinn, Phong. Tích hợp Arnold renderer. Cùng concept với Principled BSDF (Blender), Standard PBR (V-Ray). Set base color (albedo), specular, roughness, metallic, IOR — physically-based result.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Shader Node</strong> — material core (Standard Surface, Lambert, Blinn)</li>
    <li><strong>Texture Node</strong> — file texture, procedural texture</li>
    <li><strong>Utility Node</strong> — math, color correction, ramp</li>
    <li><strong>Connection</strong> — line giữa output → input</li>
    <li><strong>Hypershade Bin</strong> — folder organize materials</li>
    <li><strong>Material Assignment</strong> — link material lên mesh</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"hypershade maya material editor node based shader"</span>
    </div>
    <p class="arc-image-caption">Hypershade — node-based material editor trong Maya, chuẩn industry</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Hypershade Workflow</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Create Material</summary>
      <div class="arc-card-body">
        <p>Hypershade → Create → Surface → Standard Surface (or aiStandardSurface for Arnold). Material xuất hiện trong Browser.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Setup Base Color</summary>
      <div class="arc-card-body">
        <p>Click Standard Surface, drag file texture node → input Base Color. Browse to albedo texture file (.exr, .tx, .png).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Connect Roughness, Metallic, Normal</summary>
      <div class="arc-card-body">
        <p>Drag file texture node cho mỗi map (roughness, metallic, normal). Connect đến corresponding input của Standard Surface. Set color space đúng (Raw cho non-color maps).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Normal Map Setup</summary>
      <div class="arc-card-body">
        <p>Normal map cần aiNormalMap node giữa file và Standard Surface. Tangent-space normal map standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Assign Material to Mesh</summary>
      <div class="arc-card-body">
        <p>Select mesh trong viewport, right-click material trong Hypershade → Assign Material to Selection. Hoặc middle-mouse drag material onto mesh.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Test Render</summary>
      <div class="arc-card-body">
        <p>Render preview trong viewport (Viewport 2.0) hoặc full render Arnold. Tweak property based on result.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Common Nodes trong Hypershade</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Shaders (Surface)</h3>
    <ul class="arc-list">
      <li><strong>Standard Surface / aiStandardSurface</strong> — PBR shader modern</li>
      <li><strong>Lambert</strong> — diffuse only, simple matte</li>
      <li><strong>Blinn/Phong</strong> — legacy, specular shader</li>
      <li><strong>aiToon</strong> — cartoon/cel shader</li>
      <li><strong>aiHair</strong> — character hair shader</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Texture Nodes</h3>
    <ul class="arc-list">
      <li><strong>File</strong> — load texture từ disk</li>
      <li><strong>Checker</strong> — procedural checker pattern</li>
      <li><strong>Noise</strong> — procedural noise (perlin, voronoi)</li>
      <li><strong>Ramp</strong> — gradient màu</li>
      <li><strong>Place2dTexture</strong> — UV coordinate transform</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Utility Nodes</h3>
    <ul class="arc-list">
      <li><strong>Multiply Divide</strong> — math operation</li>
      <li><strong>Color Math</strong> — blend, mix color</li>
      <li><strong>Reverse</strong> — invert value</li>
      <li><strong>aiUserDataColor</strong> — per-object/face color data</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Specialized</h3>
    <ul class="arc-list">
      <li><strong>aiNormalMap</strong> — convert RGB texture to normal</li>
      <li><strong>aiBump2d</strong> — bump from height texture</li>
      <li><strong>aiCarPaint</strong> — multi-layer car paint shader</li>
      <li><strong>Displacement</strong> — height map cho real geometry displacement</li>
    </ul>
  </div>
</section>
`,
  },
];

console.log(`\n── Bắt đầu chạy ${items.length} bài keyword đợt 1.13 (CUỐI) ──\n`);

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

if (Number(conLai) === 0) {
  console.log("\n🎉 HOÀN THÀNH ĐỢT 1 — Tất cả 116 bài keyword A-H đã được viết.");
}
