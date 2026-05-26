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
  // 01. Frame by Frame
  {
    id: "60f32174-4316-4a20-baaf-824be92519d2",
    tieu_de: "Frame by Frame Animation",
    tieu_de_viet: "Hoạt hình vẽ từng khung",
    tom_tat:
      "Frame by Frame animation là phương pháp vẽ từng khung hình riêng lẻ — kỹ thuật truyền thống của hoạt hình 2D. Cho cảm giác hữu cơ, sống động đặc trưng khác với keyframe animation.",
    meta_title:
      "Frame by Frame là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Frame by Frame animation vẽ từng khung. Tìm hiểu kỹ thuật, công cụ TVPaint, Toon Boom và workflow hoạt hình 2D truyền thống.",
    noi_dung: `
<section class="arc-intro">
  <p>Disney&apos;s &quot;The Little Mermaid&quot;, Studio Ghibli&apos;s &quot;Spirited Away&quot;, anime &quot;Demon Slayer&quot; — tất cả đều dùng frame by frame animation. Mỗi giây 24 khung hình được vẽ tay (hoặc vẽ digital theo kỹ thuật cổ điển). Đây là một trong những craft đẹp nhất, đòi hỏi kiên nhẫn nhất trong ngành animation — và cũng tạo ra magic khán giả yêu mến qua nhiều thập kỷ.</p>
  <p>Frame by Frame Animation là kỹ năng cao quý cho 2D animator. Hiểu kỹ thuật, tooling và workflow giúp animator participate trong studio animation truyền thống — Disney, Ghibli, anime studios — career path uniquely creative và emotionally rewarding.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Frame by Frame Animation là gì?</h2>
  <p>Frame by Frame (FBF) là phương pháp animation vẽ <strong>từng khung hình riêng lẻ</strong> — animator vẽ frame 1, vẽ frame 2 với chuyển động nhỏ, vẽ frame 3, etc. Khi play với 12-24fps, các frame liên tiếp tạo cảm giác chuyển động. Đây là kỹ thuật animation cổ nhất — từ Walt Disney&apos;s đầu thế kỷ 20, đến anime Nhật Bản hiện đại.</p>
  <p>Khác với <strong>tween animation</strong> (computer tự sinh frame giữa 2 keyframe) hoặc <strong>rig animation</strong> (vẽ character một lần, animate puppet), FBF mỗi frame là một drawing hoàn toàn mới. Result: motion organic, có life, có character riêng. Trade-off: extremely time-consuming — 1 giây animation = 12-24 drawing.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Ones, Twos, Threes</span>
    <p>Khi animation 24fps không phải mỗi frame vẽ riêng. Standard: <strong>Twos</strong> (mỗi drawing hold 2 frame = 12 drawing/sec) — most film &amp; TV. <strong>Ones</strong> (mỗi frame một drawing = 24/sec) — fast action, fluid moment. <strong>Threes</strong> (8 drawing/sec) — slow moment, dialogue close-up. Mix tạo rhythm visual cho animation.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Keyframes</strong> — extreme pose chính</li>
    <li><strong>In-betweens (Inbetweens)</strong> — frame nối giữa keyframes</li>
    <li><strong>Breakdown</strong> — pose chuyển tiếp giữa keys</li>
    <li><strong>Hold</strong> — drawing same multiple frame</li>
    <li><strong>Light Box / Onion Skin</strong> — see previous frame khi vẽ</li>
    <li><strong>Cleanup</strong> — line cleanup từ rough animation</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"frame by frame animation 2D traditional drawing onion skin"</span>
    </div>
    <p class="arc-image-caption">Frame by Frame — mỗi khung được vẽ riêng, tạo cảm giác hữu cơ sống động</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Workflow Frame by Frame</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Story &amp; Storyboard</summary>
      <div class="arc-card-body">
        <p>Plan scene — what action, beat, timing. Storyboard rough thumbnails. Critical bước này để không waste effort animate scene sai.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Animatic</summary>
      <div class="arc-card-body">
        <p>Storyboard plus timing — slideshow với sound. Check timing trước animate chi tiết. 1 phút animation = nhiều tuần work, không waste.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Rough / Block Animation</summary>
      <div class="arc-card-body">
        <p>Vẽ keyframe pose chính — start, end, extreme. Rough drawing chỉ để check motion. Iterate cho đến khi timing và motion đúng.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. In-betweens</summary>
      <div class="arc-card-body">
        <p>Vẽ frame giữa keyframes. Junior animator (inbetweener) làm step này. Slow learning về timing &amp; spacing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Cleanup</summary>
      <div class="arc-card-body">
        <p>Final line art — clean, consistent line weight. Cleanup artist trace rough animation. Studio Disney có dedicated cleanup department.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Color &amp; Compositing</summary>
      <div class="arc-card-body">
        <p>Color mỗi frame, add background, composite layers. Final render frame to video.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Tools Frame by Frame</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Professional Software</h3>
    <ul class="arc-list">
      <li><strong>Toon Boom Harmony</strong> — industry standard cho TV animation (SpongeBob, Rick &amp; Morty)</li>
      <li><strong>TVPaint</strong> — chuẩn cho feature film (Studio Ghibli, indie)</li>
      <li><strong>OpenToonz</strong> — free, used by Studio Ghibli</li>
      <li><strong>CACANi</strong> — chuyên cho 2D production</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Accessible Tools</h3>
    <ul class="arc-list">
      <li><strong>Procreate Dreams</strong> — iPad, animator indie</li>
      <li><strong>Krita</strong> — free, có frame by frame</li>
      <li><strong>Adobe Animate (Flash legacy)</strong> — phổ biến web animation</li>
      <li><strong>Rough Animator</strong> — mobile/iPad app cho sketch animation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Traditional Tools</h3>
    <ul class="arc-list">
      <li>Animation paper (12-field, 16-field standard)</li>
      <li>Animation peg bar — align paper consistent</li>
      <li>Light box — see through to previous frame</li>
      <li>Camera stand — photograph frame</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Famous Frame by Frame Works</h2>
  <ul class="arc-list">
    <li><strong>Disney Golden Age</strong> — Snow White, Bambi, Sleeping Beauty (1930s-50s)</li>
    <li><strong>Studio Ghibli</strong> — Spirited Away, Princess Mononoke (Hayao Miyazaki)</li>
    <li><strong>Anime modern</strong> — Demon Slayer, Attack on Titan, One Piece</li>
    <li><strong>The Simpsons / Family Guy / Rick &amp; Morty</strong> — TV animation</li>
    <li><strong>SpongeBob SquarePants</strong> — Toon Boom production</li>
    <li><strong>Indie</strong> — &quot;The Boy and the Beast&quot;, &quot;Klaus&quot;, &quot;Wolfwalkers&quot;</li>
  </ul>
</section>
`,
  },

  // 02. Frame Rate
  {
    id: "0569e79d-3ce6-435d-bb9d-95397e145f70",
    tieu_de: "Frame Rate",
    tieu_de_viet: "Tần số khung hình (Frame Rate)",
    tom_tat:
      "Frame Rate (FPS — Frames Per Second) là số khung hình hiển thị trong một giây. Chọn frame rate ảnh hưởng đến cảm giác visual — 24fps cinematic, 60fps smooth, 120fps gaming.",
    meta_title: "Frame Rate là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Frame Rate (FPS) định nghĩa số khung hình/giây. Tìm hiểu 24fps cinema, 30fps web, 60fps gaming và cách chọn frame rate cho project.",
    noi_dung: `
<section class="arc-intro">
  <p>Frame rate là một trong những technical decision đầu tiên khi shoot video hoặc make animation. Nó định nghĩa &quot;look&quot; của project — phim cinema 24fps vs sports broadcast 60fps cảm giác hoàn toàn khác. Sai frame rate = entire project look &quot;wrong&quot; — không phải về quality mà về aesthetic feel.</p>
  <p>Frame Rate là kiến thức nền tảng cho mọi video maker, motion designer, game developer. Hiểu các standard FPS và khi nào dùng cái nào giúp chọn đúng cho project từ đầu — tránh re-shoot, re-render costly.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Frame Rate là gì?</h2>
  <p>Frame Rate (hoặc FPS — Frames Per Second, tốc độ khung hình) là số lượng khung hình tĩnh được hiển thị hoặc ghi lại trong một giây. Khi play các frame liên tiếp đủ nhanh (&gt;10fps), brain perceive motion liên tục — đây là nguyên lý của moving image từ Lumière brothers (1895) đến phim modern.</p>
  <p>Mỗi frame rate có character riêng do <strong>motion blur</strong> và <strong>temporal sampling</strong>. 24fps có inherent motion blur per frame — cảm giác &quot;dreamlike&quot;, cinematic. 60fps less blur per frame — clearer detail, cảm giác &quot;TV-like&quot;, smooth. Chọn FPS = chọn aesthetic.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Frame Rate vs Refresh Rate</span>
    <p><strong>Frame Rate</strong>: số frame video/game produce per second. <strong>Refresh Rate</strong> (Hz): số lần display update per second. Ideal: FPS ≤ Refresh Rate. 240Hz display chỉ show 240fps video — higher FPS waste. Mismatch = screen tearing, stutter — G-Sync/FreeSync solve.</p>
  </div>

  <ul class="arc-list">
    <li><strong>24fps</strong> — cinema, film aesthetic</li>
    <li><strong>25fps</strong> — PAL TV Europe</li>
    <li><strong>29.97/30fps</strong> — NTSC TV, web standard</li>
    <li><strong>50/60fps</strong> — sports, smooth gaming, broadcasting</li>
    <li><strong>120fps</strong> — high-end gaming, slow-motion source</li>
    <li><strong>240fps+</strong> — extreme slow-motion, competitive esports</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"frame rate comparison 24fps 60fps 120fps cinematic smooth"</span>
    </div>
    <p class="arc-image-caption">Frame Rate spectrum — 24fps cinematic to 120fps competitive gaming</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Tại sao Frame Rate ảnh hưởng cảm giác</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Motion Blur</summary>
      <div class="arc-card-body">
        <p>Lower FPS = nhiều motion blur per frame (shutter speed slower). 24fps có natural blur làm action feel weighted, dramatic. High FPS less blur — clearer detail, sharp.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Strobing Effect</summary>
      <div class="arc-card-body">
        <p>24fps fast horizontal pan tạo strobing (jerky). Cinematic but can be uncomfortable. Higher FPS smooth pan more.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Soap Opera Effect</summary>
      <div class="arc-card-body">
        <p>Phim 24fps shown at 60fps (TV motion interpolation enabled) tạo &quot;soap opera effect&quot; — quá smooth, không cinematic. Lý do nhiều người disable motion smoothing on TV.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Conditioning &amp; Expectation</summary>
      <div class="arc-card-body">
        <p>Brain conditioned 100+ năm: 24fps = phim, 30fps = TV, 60fps = sports. Đổi expectation tạo cảm giác &quot;off&quot; — Hobbit 48fps controversial vì viewers expect 24fps for film.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Action Clarity</summary>
      <div class="arc-card-body">
        <p>Fast action ở 24fps blurry — intentional, cinematic. Sport/game cần clarity, 60fps+ để follow action detailed.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Chọn Frame Rate cho Project</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim, Short Film</h3>
    <ul class="arc-list">
      <li>24fps (or 23.976) — cinema standard worldwide</li>
      <li>Quay slow-mo: 60-120fps, conform xuống 24fps</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Documentary, Interview</h3>
    <ul class="arc-list">
      <li>24fps cinematic feel</li>
      <li>30fps cho TV-style documentary</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Commercial, Music Video</h3>
    <ul class="arc-list">
      <li>24fps cho cinematic look</li>
      <li>30/60fps cho social media, energetic</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">YouTube, Vlog</h3>
    <ul class="arc-list">
      <li>30fps standard</li>
      <li>60fps cho action content (sports, gaming)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Sports Broadcasting</h3>
    <ul class="arc-list">
      <li>50/60fps minimum cho fluid</li>
      <li>Slow-mo: 240fps+ source</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation 2D</h3>
    <ul class="arc-list">
      <li>24fps standard, animate on twos (12 drawing/s)</li>
      <li>Anime đôi khi 8fps cho stylistic</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Gaming</h3>
    <ul class="arc-list">
      <li>30fps acceptable mobile/casual</li>
      <li>60fps target chuẩn PC/console modern</li>
      <li>120fps+ competitive esports</li>
      <li>VR mandatory 90fps</li>
    </ul>
  </div>
</section>
`,
  },

  // 03. Fresnel
  {
    id: "daac9898-8320-4a0b-b7fc-0527a51431b8",
    tieu_de: "Fresnel Effect",
    tieu_de_viet: "Hiệu ứng Fresnel (PBR)",
    tom_tat:
      "Fresnel là hiện tượng vật lý: bề mặt phản chiếu nhiều hơn khi nhìn ở góc nghiêng so với nhìn thẳng — hiệu ứng quan trọng trong PBR shading, tạo độ chân thực cho vật liệu 3D.",
    meta_title: "Fresnel là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Fresnel effect làm bề mặt phản chiếu mạnh ở góc nghiêng. Tìm hiểu công thức, ứng dụng trong PBR shader 3D và rim light technique.",
    noi_dung: `
<section class="arc-intro">
  <p>Nhìn xuống mặt hồ thẳng — thấy đáy hồ. Nhìn xa từ bờ — thấy bầu trời phản chiếu. Cùng mặt nước, nhưng góc nhìn khác → reflection khác. Đây là <strong>Fresnel Effect</strong> — hiện tượng quang học cơ bản nhưng ít người để ý. Trong 3D rendering, Fresnel là kiến thức core của PBR shading — không có nó, vật liệu look &quot;fake&quot;.</p>
  <p>Fresnel là kiến thức quan trọng cho 3D artist, technical artist làm material/shading. Hiểu Fresnel và cách apply trong shader giúp tạo vật liệu PBR realistic — water, glass, metal, fabric đều có Fresnel character riêng.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Fresnel Effect là gì?</h2>
  <p>Fresnel Effect (đặt tên theo Augustin-Jean Fresnel, 1788-1827) là hiện tượng vật lý: lượng ánh sáng <strong>phản xạ (reflection)</strong> từ một bề mặt thay đổi theo góc nhìn. Khi nhìn thẳng góc (normal/perpendicular), bề mặt phản xạ ít — ánh sáng chủ yếu xuyên qua (transmit) hoặc absorb. Khi nhìn glancing angle (gần parallel với surface), bề mặt phản xạ gần như 100%.</p>
  <p>Trong CGI rendering, Fresnel là thành phần critical của <strong>PBR (Physically-Based Rendering)</strong>. Mọi material — dielectric (gỗ, plastic) hay metal (vàng, sắt) — đều có Fresnel response. Sai Fresnel = material look &quot;CG fake&quot;. Đúng Fresnel = realistic, photographic.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Fresnel cho Dielectric vs Metal</span>
    <p><strong>Dielectric</strong> (non-metal): Fresnel reflection cao ở glancing angle (95%+), thấp ở normal angle (4% — F0 đặc trưng). Plastic, wood, water, glass đều dielectric. <strong>Metal</strong>: high reflection cả normal lẫn glancing. Color tinted (gold = yellow reflection). Đó là sự khác biệt cốt lõi giữa dielectric và conductor trong PBR.</p>
  </div>

  <ul class="arc-list">
    <li><strong>F0 (Base Reflectance)</strong> — reflection khi nhìn perpendicular</li>
    <li><strong>F90</strong> — reflection ở 90° (glancing angle) = nearly 100%</li>
    <li><strong>Schlick&apos;s Approximation</strong> — công thức xấp xỉ Fresnel phổ biến</li>
    <li><strong>IOR (Index of Refraction)</strong> — chỉ số khúc xạ, define F0</li>
    <li><strong>Edge Tint</strong> — màu reflection ở edge (cho metal)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"fresnel effect 3D shader PBR reflection grazing angle"</span>
    </div>
    <p class="arc-image-caption">Fresnel — reflection mạnh ở glancing angle, thấp khi nhìn thẳng</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Ứng dụng Fresnel trong 3D</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>PBR Material</summary>
      <div class="arc-card-body">
        <p>Mọi PBR shader (Principled BSDF Blender, Standard Surface Arnold) đều có Fresnel built-in dựa trên IOR hoặc Specular value. Artist không cần code thủ công — chỉ set IOR đúng.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Water &amp; Glass</summary>
      <div class="arc-card-body">
        <p>Water (IOR 1.33), Glass (IOR 1.5) — Fresnel mạnh ở edge. Lake từ angle thấp như mirror, từ trên xuống thấy đáy. Glass edge phản chiếu mạnh.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Rim Light Effect</summary>
      <div class="arc-card-body">
        <p>Apply Fresnel làm &quot;rim light&quot; — edge của object sáng lên. Stylized look anime, cartoon. Không vật lý chính xác nhưng aesthetic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Velvet / Fabric</summary>
      <div class="arc-card-body">
        <p>Velvet có &quot;back-scattering&quot; — edge sáng đặc trưng (inverse Fresnel hoặc Fresnel-like). Sheen layer trong PBR.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Skin Subsurface</summary>
      <div class="arc-card-body">
        <p>Skin có Fresnel reflection trên top (oil layer), cùng với subsurface scattering bên dưới. Both quan trọng cho realistic skin.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Stylized Shader (NPR)</summary>
      <div class="arc-card-body">
        <p>Toon shader, cartoon style dùng Fresnel cho stylized rim light, atmosphere depth.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Fresnel trong Software</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Blender</h3>
    <ul class="arc-list">
      <li>Principled BSDF có Specular slider (control F0)</li>
      <li>Fresnel node cho custom shader</li>
      <li>Layer Weight node cho mix shader theo angle</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Substance Painter / Designer</h3>
    <ul class="arc-list">
      <li>Smart materials auto-apply correct Fresnel</li>
      <li>Metallic vs Roughness workflow standardize Fresnel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Arnold / V-Ray / Redshift</h3>
    <ul class="arc-list">
      <li>Standard Surface shader Fresnel built-in (Arnold)</li>
      <li>VRayMtl có Fresnel checkbox + IOR</li>
      <li>Redshift Standard Material tương tự</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Unreal Engine / Unity</h3>
    <ul class="arc-list">
      <li>Material Editor có Fresnel node</li>
      <li>Shader Graph (Unity) Fresnel Effect node</li>
      <li>Common trong shader rim light, stylized</li>
    </ul>
  </div>
</section>
`,
  },

  // 04. G-Sync & FreeSync
  {
    id: "5eec1222-7cd5-4e25-a5a0-6305007a995a",
    tieu_de: "G-Sync &amp; FreeSync",
    tieu_de_viet: "Đồng bộ frame rate (G-Sync/FreeSync)",
    tom_tat:
      "G-Sync (NVIDIA) và FreeSync (AMD) là công nghệ đồng bộ tốc độ khung hình giữa GPU và màn hình — loại bỏ screen tearing và stuttering, cho experience gaming smooth.",
    meta_title:
      "G-Sync và FreeSync là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "G-Sync và FreeSync đồng bộ GPU với màn hình. Tìm hiểu cách hoạt động, khác biệt và lựa chọn monitor cho gaming, content creation.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn play game competitive — đột nhiên hình bị &quot;rách&quot; ngang giữa, hoặc &quot;giật&quot; (stutter) phá flow. Đó là <strong>screen tearing</strong> — khi GPU đẩy frame mới trước khi monitor refresh xong frame cũ. <strong>G-Sync và FreeSync</strong> là công nghệ solve vấn đề này — sync GPU với monitor cho experience smooth.</p>
  <p>G-Sync/FreeSync là kiến thức cho gamer, video editor, content creator chọn monitor. Hiểu khác biệt, compatibility và khi nào cần giúp đầu tư monitor đúng — saving hàng triệu đồng cho features không cần, hoặc compromise experience nếu skip features needed.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>G-Sync &amp; FreeSync là gì?</h2>
  <p>G-Sync (NVIDIA, 2013) và FreeSync (AMD, 2015) là công nghệ <strong>Variable Refresh Rate (VRR)</strong> — đồng bộ refresh rate của monitor với output frame rate của GPU. Khi GPU produce frame, monitor refresh ngay — không sớm hơn, không muộn hơn. Kết quả: eliminate screen tearing và minimize stuttering.</p>
  <p>Vấn đề mà chúng solve: <strong>Screen Tearing</strong> — visible &quot;rách&quot; ngang giữa khi GPU đẩy frame mới trong lúc monitor đang refresh frame cũ. <strong>V-Sync</strong> (traditional fix) lock GPU output bằng monitor refresh — solve tearing nhưng cause input lag và stutter khi FPS dưới refresh rate.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">G-Sync vs FreeSync — khác biệt</span>
    <p><strong>G-Sync</strong>: NVIDIA, đòi hỏi NVIDIA GPU + monitor có G-Sync module (đắt). G-Sync Compatible là chuẩn mở rộng tương thích FreeSync. <strong>FreeSync</strong>: AMD, open standard, miễn phí cho monitor manufacturer. Wider adoption, cheaper monitor. Cả hai tương đương về quality khi work properly. FreeSync popular hơn cho budget.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Variable Refresh Rate (VRR)</strong> — refresh rate adapt theo FPS</li>
    <li><strong>Screen Tearing</strong> — visible artifact khi GPU/monitor unsync</li>
    <li><strong>Stuttering</strong> — uneven motion từ inconsistent timing</li>
    <li><strong>V-Sync</strong> — traditional solution với input lag trade-off</li>
    <li><strong>HDMI 2.1 / DisplayPort 1.4</strong> — connector support VRR</li>
    <li><strong>LFC (Low Framerate Compensation)</strong> — VRR vẫn work dưới min FPS</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"g-sync freesync variable refresh rate gaming monitor"</span>
    </div>
    <p class="arc-image-caption">G-Sync &amp; FreeSync — sync GPU output với monitor refresh, no tearing</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các tier của G-Sync &amp; FreeSync</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>G-Sync Ultimate (NVIDIA)</summary>
      <div class="arc-card-body">
        <p>Highest tier — full G-Sync module trong monitor, HDR validated, factory color calibrated, variable overdrive. Expensive ($1,000+ monitor).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>G-Sync (Original)</summary>
      <div class="arc-card-body">
        <p>NVIDIA proprietary module. Best quality VRR. NVIDIA GPU only. Premium monitor.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>G-Sync Compatible</summary>
      <div class="arc-card-body">
        <p>NVIDIA validation cho FreeSync monitor — tested for tearing-free. NVIDIA GPU work với FreeSync monitor. Most affordable VRR option NVIDIA.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>FreeSync Premium Pro (AMD)</summary>
      <div class="arc-card-body">
        <p>Highest FreeSync tier — HDR 400 minimum, low framerate compensation, low latency. Equivalent G-Sync Ultimate.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>FreeSync Premium</summary>
      <div class="arc-card-body">
        <p>120Hz+ refresh rate, LFC support. Smooth gaming HD/QHD.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>FreeSync</summary>
      <div class="arc-card-body">
        <p>Basic tier — VRR support, any refresh rate. Affordable monitor entry.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Khi nào cần G-Sync/FreeSync</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cần</h3>
    <ul class="arc-list">
      <li>Competitive gaming — eliminate tearing, lower input lag</li>
      <li>Action game/FPS — fast camera movement</li>
      <li>Variable FPS workflow — game engine output không stable</li>
      <li>Console gaming — PS5/Xbox Series X support VRR</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Không cần</h3>
    <ul class="arc-list">
      <li>Pure video editing/color grading</li>
      <li>2D work, photo editing</li>
      <li>Office work, browsing</li>
      <li>Casual game với stable 60fps cap</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Pairing</h3>
    <ul class="arc-list">
      <li>NVIDIA GPU → G-Sync hoặc G-Sync Compatible monitor</li>
      <li>AMD GPU → FreeSync monitor</li>
      <li>NVIDIA GPU 1080+ → tương thích FreeSync monitor (G-Sync Compatible)</li>
      <li>Console — check VRR support trên monitor</li>
    </ul>
  </div>
</section>
`,
  },

  // 05. Game AAA
  {
    id: "49c272d0-440b-485b-90a0-d987c05d1b5e",
    tieu_de: "Game AAA",
    tieu_de_viet: "Game AAA (Triple-A)",
    tom_tat:
      "Game AAA (Triple-A) là game với kinh phí khổng lồ ($50M-500M+), team production lớn (vài trăm đến vài nghìn người), marketing budget lớn. GTA, Call of Duty, Cyberpunk là các ví dụ.",
    meta_title: "Game AAA là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Game AAA là blockbuster của ngành game. Tìm hiểu budget, production, career path trong AAA studio và ví dụ tiêu biểu.",
    noi_dung: `
<section class="arc-intro">
  <p>GTA V — chi phí phát triển $137 million, marketing $128 million. Total $265M cho một game. Doanh thu &gt; $8 billion. Đây là Game AAA — &quot;blockbuster&quot; của ngành game, scale tương đương Hollywood film. Cyberpunk 2077, Red Dead Redemption 2, The Last of Us 2 — tất cả đều là AAA. Đây là tier cao nhất của game industry.</p>
  <p>Game AAA là career destination ambition của nhiều game developer, artist. Hiểu AAA pipeline, scale, roles giúp aspiring game artist biết minimum requirements để vào, và sự khác biệt với indie hoặc mobile game development.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Game AAA là gì?</h2>
  <p>Game AAA (Triple-A) là thuật ngữ chỉ những game có <strong>budget production và marketing khổng lồ</strong> — typically $50M-500M+ tổng cost. Phát triển bởi major studios như Rockstar, EA, Activision, Ubisoft, CD Projekt Red, Sony Worldwide Studios. Đặc trưng: large team (200-2000+ people), production cycle 3-7 năm, high-fidelity graphics, full voice acting, motion capture, marketing campaign global.</p>
  <p>Term &quot;AAA&quot; được giới thiệu lần đầu late 1990s — referenced quality và investment level cao nhất, tương tự credit rating &quot;AAA&quot; (highest). Theo time, &quot;AAAA&quot; (Quad-A) emerged cho ultra-budget game ($100M+), nhưng definition mơ hồ.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">AAA vs Indie vs AA</span>
    <p><strong>AAA</strong>: $50M+ budget, major studio, blockbuster. <strong>AA (Double-A)</strong>: middle tier, $5-50M budget, mid-size studio (Larian Studios, FromSoftware). <strong>Indie</strong>: small team (1-30 people), $50K-5M budget. Lines blur — Baldur&apos;s Gate 3 (Larian) budget AAA nhưng studio nhỏ hơn major.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Budget</strong> — $50M-500M+ production + marketing</li>
    <li><strong>Team Size</strong> — 200-2000+ developers</li>
    <li><strong>Production</strong> — 3-7 năm cycle</li>
    <li><strong>Platforms</strong> — multi-platform (PC, PS, Xbox)</li>
    <li><strong>Quality</strong> — high-fidelity graphics, full voice acting</li>
    <li><strong>Marketing</strong> — global campaign, E3/Game Awards reveal</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"AAA game blockbuster GTA Red Dead Cyberpunk production"</span>
    </div>
    <p class="arc-image-caption">Game AAA — blockbuster game với budget khổng lồ, team lớn, high fidelity</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Pipeline AAA Production</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Concept &amp; Pitching (6-12 months)</summary>
      <div class="arc-card-body">
        <p>Game director + writer pitch concept với publisher/studio executive. Concept art, narrative outline. Approval = greenlight production.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Pre-Production (12-18 months)</summary>
      <div class="arc-card-body">
        <p>Vertical slice — playable 5-10 phút demo proving concept. Tech foundation, art style finalize, story bible. Team size 30-100 người.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Production (24-48 months)</summary>
      <div class="arc-card-body">
        <p>Full production — team scale lên 200-1000+. Asset creation, level design, quest implementation, gameplay programming. Most expensive phase.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Alpha (6-12 months trước launch)</summary>
      <div class="arc-card-body">
        <p>All systems functional, all content placeholder hoặc rough. Major bug fixing, balance, optimization start.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Beta (3-6 months trước launch)</summary>
      <div class="arc-card-body">
        <p>Content final, polish, QA intensive. Closed/Open beta testing. Marketing campaign ramp up.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Gold &amp; Launch</summary>
      <div class="arc-card-body">
        <p>Gold master sent to manufacturer/store. Day 1 patch usually. Launch global event, reviews, sales.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>7. Live Service Post-Launch</summary>
      <div class="arc-card-body">
        <p>Modern AAA = live service. DLC, season pass, multiplayer update, balance. Team smaller nhưng ongoing.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Roles trong AAA Studio</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Art Department</h3>
    <ul class="arc-list">
      <li>Concept Artist, Environment Artist, Character Artist</li>
      <li>Texture Artist, Material Artist</li>
      <li>Animator (Character, Cinematic, Combat)</li>
      <li>VFX Artist, Lighting Artist</li>
      <li>Art Director, Lead Artist</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Design</h3>
    <ul class="arc-list">
      <li>Game Designer, Level Designer, Combat Designer</li>
      <li>Narrative Designer, Quest Designer</li>
      <li>UX Designer, UI Designer</li>
      <li>Systems Designer, Economy Designer</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Engineering</h3>
    <ul class="arc-list">
      <li>Gameplay Programmer, Engine Programmer</li>
      <li>Graphics Programmer, Tools Programmer</li>
      <li>Network Programmer, AI Programmer</li>
      <li>Technical Director, Lead Engineer</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Audio</h3>
    <ul class="arc-list">
      <li>Sound Designer, Audio Programmer</li>
      <li>Composer, Audio Director</li>
      <li>Voice Director, Dialog Editor</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Production &amp; Support</h3>
    <ul class="arc-list">
      <li>Producer, Project Manager</li>
      <li>QA, Localization</li>
      <li>Community Manager, Marketing</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Top AAA Studios</h2>
  <ul class="arc-list">
    <li><strong>Rockstar Games</strong> — GTA, Red Dead Redemption</li>
    <li><strong>CD Projekt Red</strong> — The Witcher, Cyberpunk 2077</li>
    <li><strong>Naughty Dog</strong> — The Last of Us, Uncharted</li>
    <li><strong>FromSoftware</strong> — Dark Souls, Elden Ring</li>
    <li><strong>Ubisoft</strong> — Assassin&apos;s Creed, Far Cry</li>
    <li><strong>Bethesda</strong> — Elder Scrolls, Fallout</li>
    <li><strong>Sony Worldwide Studios</strong> — God of War, Spider-Man</li>
    <li><strong>Insomniac Games</strong> — Spider-Man, Ratchet &amp; Clank</li>
    <li><strong>BioWare</strong> — Mass Effect, Dragon Age</li>
  </ul>
</section>
`,
  },

  // 06. Game Assets
  {
    id: "5398dfbf-7170-4e40-8ed8-320758a993c8",
    tieu_de: "Game Assets",
    tieu_de_viet: "Tài nguyên game (Game Assets)",
    tom_tat:
      "Game Assets là toàn bộ tài nguyên kỹ thuật số tạo nên game — mesh 3D, texture, animation, âm thanh, UI — được tổ chức và tối ưu hóa để hoạt động hiệu quả trong game engine.",
    meta_title: "Game Assets là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Game Assets là 3D models, textures, animation cho game. Tìm hiểu các loại asset, optimization và pipeline tạo asset chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Một game AAA modern có thể có 10,000+ asset — mỗi character, tree, building, sound effect, UI button. Quản lý, tối ưu, organize asset là một trong những thách thức lớn nhất của game development. &quot;Asset&quot; là building block của mọi game — không có asset, không có game.</p>
  <p>Game Assets là kiến thức cơ bản cho mọi game artist, technical artist. Hiểu các loại asset (3D, texture, audio, animation), pipeline tạo asset và optimization principle giúp artist work hiệu quả với game engine và team production.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Game Assets là gì?</h2>
  <p>Game Assets là tất cả tài nguyên kỹ thuật số được tạo, organize và optimize để dùng trong game. Bao gồm: <strong>3D Models</strong> (mesh, geometry), <strong>Textures</strong> (color, normal, roughness maps), <strong>Materials/Shaders</strong>, <strong>Animations</strong> (skeletal, blend shapes), <strong>Audio</strong> (music, SFX, voice), <strong>UI elements</strong>, <strong>VFX</strong> (particle, decal), <strong>Lighting</strong> (lightmaps, baked).</p>
  <p>Khác với asset trong film/VFX (one-time render), game asset phải <strong>real-time</strong> — render 60+ fps trên hardware giới hạn. Vì vậy game asset có constraints riêng: poly count limit, texture size optimal, draw call efficiency, LOD (Level of Detail), proper UV unwrap.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Source Asset vs Engine Asset</span>
    <p><strong>Source Asset</strong>: file gốc tạo trong tool (Maya .ma, Photoshop .psd). Lưu trong art repo. <strong>Engine Asset</strong>: file format imported vào engine (.uasset Unreal, .prefab Unity). Optimized cho runtime. Workflow: source → export FBX/PNG → engine convert sang engine format.</p>
  </div>

  <ul class="arc-list">
    <li><strong>3D Models</strong> — mesh, geometry với UV</li>
    <li><strong>Textures</strong> — diffuse/albedo, normal, roughness, metallic, AO</li>
    <li><strong>Materials</strong> — shader + texture combination</li>
    <li><strong>Animations</strong> — keyframe data, blend shape</li>
    <li><strong>Rigs</strong> — skeleton/armature cho character</li>
    <li><strong>Audio</strong> — music, ambience, SFX</li>
    <li><strong>VFX</strong> — particle system, decal</li>
    <li><strong>UI</strong> — sprite, font, icon</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"game assets 3D models textures pipeline unreal unity"</span>
    </div>
    <p class="arc-image-caption">Game Assets — 3D models, textures, animations, audio organized trong engine</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Game Assets</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>3D Models</summary>
      <div class="arc-card-body">
        <p>Character, prop, environment, vehicle. Polycount tùy device: mobile 1-5K tris, console/PC 10K-100K+ tris per character. Tools: Maya, Blender, ZBrush, 3ds Max.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Textures</summary>
      <div class="arc-card-body">
        <p>PBR maps: Albedo, Normal, Roughness, Metallic, AO. Resolution 512-4096px tùy importance. Tool: Substance Painter, Photoshop, Mari.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Materials/Shaders</summary>
      <div class="arc-card-body">
        <p>Combine textures với logic shader. Material Editor trong engine. Master material + instance. Complex shader cho water, skin, hair.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Animations</summary>
      <div class="arc-card-body">
        <p>Keyframe animation cho character (idle, walk, run, attack). Animation tree blend giữa các state. Motion capture data cho realism. Tool: Maya, MotionBuilder.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>VFX</summary>
      <div class="arc-card-body">
        <p>Particle effect (fire, smoke, spell), decal (bullet hole, blood). Unreal Niagara, Unity Particle System/VFX Graph. Real-time GPU simulation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Audio</summary>
      <div class="arc-card-body">
        <p>Music track, ambient loop, SFX (footstep, gunshot, UI click), voice line. Format: WAV (uncompressed) hoặc OGG (compressed). Wwise, FMOD middleware.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UI Assets</summary>
      <div class="arc-card-body">
        <p>Sprite, icon, font, button graphic. Atlas (texture sheet) cho efficiency. Format: PNG với alpha.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Asset Pipeline</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Concept</h3>
    <ul class="arc-list">
      <li>Concept artist sketch/paint asset design</li>
      <li>Art Director approve</li>
      <li>Reference board, mood board</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Modeling (3D Asset)</h3>
    <ul class="arc-list">
      <li>Blockout — rough volume</li>
      <li>High-poly sculpt (ZBrush)</li>
      <li>Retopology — low-poly cho game</li>
      <li>UV unwrap</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Texturing</h3>
    <ul class="arc-list">
      <li>Bake maps từ high-poly sang low-poly</li>
      <li>Paint textures trong Substance Painter</li>
      <li>Export PBR maps</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Rigging &amp; Animation</h3>
    <ul class="arc-list">
      <li>Setup skeleton, skinning</li>
      <li>Animate keyframe hoặc mocap</li>
      <li>Export FBX</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Engine Import</h3>
    <ul class="arc-list">
      <li>Import FBX/PNG vào Unreal/Unity</li>
      <li>Setup material slot, shader</li>
      <li>Test in-game performance</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Optimization</h3>
    <ul class="arc-list">
      <li>LOD (Level of Detail) — multiple poly count versions</li>
      <li>Texture compression (BC, DXT, ASTC)</li>
      <li>Draw call reduction (atlasing)</li>
      <li>Occlusion culling setup</li>
    </ul>
  </div>
</section>
`,
  },

  // 07. Game Balance
  {
    id: "df789c70-85aa-4e39-9a1c-0e0e01d82f97",
    tieu_de: "Game Balance",
    tieu_de_viet: "Cân bằng game (Game Balance)",
    tom_tat:
      "Game Balance là quá trình tinh chỉnh các yếu tố trong game (độ khó, sức mạnh nhân vật, kinh tế, weapon damage) để tạo trải nghiệm công bằng, fun và challenging cho người chơi.",
    meta_title: "Game Balance là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Game Balance tinh chỉnh độ khó, character power trong game. Tìm hiểu kỹ thuật, metric và workflow balancing chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>League of Legends có 160+ champion — làm sao mỗi champion viable, không quá mạnh hay quá yếu? Counter-Strike có 30+ vũ khí — làm sao AK-47 không dominate mọi map? Đây là <strong>Game Balance</strong> — một trong những craft khó nhất và quan trọng nhất trong game design. Một game unbalanced fail nhanh chóng dù graphic và story tốt.</p>
  <p>Game Balance là chuyên môn quan trọng cho game designer, đặc biệt với competitive/multiplayer game. Hiểu nguyên tắc balance, metrics và testing methodology giúp designer tạo game có longevity — players engage lâu dài thay vì abandoned vì frustration.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Game Balance là gì?</h2>
  <p>Game Balance là nghệ thuật và khoa học tinh chỉnh các yếu tố trong game để tạo experience: (1) <strong>Fair</strong> — không có strategy/character &quot;broken&quot; dominate; (2) <strong>Fun</strong> — player có choice, không feel forced vào meta; (3) <strong>Challenging</strong> — đủ khó để engaging, không quá khó frustrating; (4) <strong>Diverse</strong> — multiple viable strategies, character, builds.</p>
  <p>Balance involve tuning <strong>numbers</strong> (damage, HP, cooldown, cost) và <strong>mechanics</strong> (counter system, scaling, win conditions). Process iterative — designer dự đoán, players play, data collected, designer tune lại. Game live service như League, Valorant có patch balance mỗi 1-2 tuần.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Symmetric vs Asymmetric Balance</span>
    <p><strong>Symmetric balance</strong>: tất cả player có same option (Chess, Go, Counter-Strike each round). Easy balance vì identical. <strong>Asymmetric balance</strong>: player có different option (League champion, Overwatch hero, Starcraft race). Hard balance vì variables nhiều, nhưng more interesting design space.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Power Level</strong> — character/item strength relative</li>
    <li><strong>Meta</strong> — current optimal strategy in community</li>
    <li><strong>Counter-play</strong> — mỗi strategy có counter</li>
    <li><strong>Risk-Reward</strong> — higher risk = higher reward</li>
    <li><strong>Pick Rate &amp; Win Rate</strong> — data metric core</li>
    <li><strong>Skill Ceiling/Floor</strong> — high/low entry barrier</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"game balance design metrics power level meta charts"</span>
    </div>
    <p class="arc-image-caption">Game Balance — tuning numbers, mechanics cho fair, fun, challenging gameplay</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Principles Game Balance</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Rock-Paper-Scissors</summary>
      <div class="arc-card-body">
        <p>Mỗi strategy có counter. Tank counters Assassin, Mage counters Tank, Assassin counters Mage. No single dominant option.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Strengths &amp; Weaknesses</summary>
      <div class="arc-card-body">
        <p>Character/item mạnh trong situation A phải yếu trong situation B. No &quot;all-rounder&quot; — buộc player choice.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Cost-Benefit</summary>
      <div class="arc-card-body">
        <p>Power mạnh hơn = cost cao hơn (money, time, opportunity). Damage cao = HP thấp, cooldown dài, mana cao.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Snowballing Control</summary>
      <div class="arc-card-body">
        <p>Early lead không guarantee win. Catch-up mechanic (League&apos;s comeback gold, Mario Kart blue shell). Game close until end.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Skill Expression</summary>
      <div class="arc-card-body">
        <p>Skilled player perform better — không random victory. Mechanic depth cho practice rewarded.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Accessibility</summary>
      <div class="arc-card-body">
        <p>New player có viable option mặc dù không optimal. Don&apos;t require encyclopedia knowledge để fun.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Process Balance</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Design Phase</h3>
    <ul class="arc-list">
      <li>Designer set initial values based on intuition + math</li>
      <li>Spreadsheet với damage, HP, cooldown formula</li>
      <li>Theoretical analysis — DPS, time-to-kill</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Internal Playtest</h3>
    <ul class="arc-list">
      <li>Team play, identify obvious issue</li>
      <li>Fix &quot;broken&quot; combination, glaring imbalance</li>
      <li>Iterate before public exposure</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Beta Testing</h3>
    <ul class="arc-list">
      <li>Closed beta với select community</li>
      <li>Collect feedback qualitative</li>
      <li>Patch nhanh based on response</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Launch &amp; Live Service</h3>
    <ul class="arc-list">
      <li>Collect data: pick rate, win rate, ban rate</li>
      <li>Identify outlier — too strong (nerf) hoặc too weak (buff)</li>
      <li>Weekly/bi-weekly patch balance</li>
      <li>Major balance pass mỗi season/expansion</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Pro Scene Feedback</h3>
    <ul class="arc-list">
      <li>Pro player exploit subtle imbalance casual player không thấy</li>
      <li>Watch tournament data — strategies, picks</li>
      <li>Balance cho pro vs casual khác nhau — hard challenge</li>
    </ul>
  </div>
</section>
`,
  },

  // 08. Game Design Document
  {
    id: "9fc60393-7e2d-4d76-8e6b-68d5cfb5782a",
    tieu_de: "Game Design Document (GDD)",
    tieu_de_viet: "Tài liệu thiết kế Game (GDD)",
    tom_tat:
      "Game Design Document (GDD) là tài liệu chi tiết mô tả mọi yếu tố của game — cơ chế, cốt truyện, nhân vật, UI, level. Là &quot;bible&quot; cho team production, đặc biệt critical cho project lớn.",
    meta_title: "Game Design Document là gì? Ý nghĩa và ứng dụng | CINS",
    meta_description:
      "GDD là tài liệu thiết kế game. Tìm hiểu cấu trúc, components và cách viết GDD chuyên nghiệp cho project game của bạn.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn có ý tưởng game tuyệt vời trong đầu. Bạn nói với 5 programmer, 3 artist, 2 designer. Mỗi người visualize game khác nhau. Khi build, ai cũng build &quot;version&quot; riêng. Kết quả: chaos. <strong>Game Design Document (GDD)</strong> giải quyết vấn đề này — single source of truth cho game. Đây là &quot;bible&quot; của project.</p>
  <p>GDD là kiến thức nền tảng cho game designer, project manager. Hiểu cách viết GDD effective giúp team alignment, save thời gian, tránh costly redesign mid-production. Đặc biệt critical cho indie team và team mới startup.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Game Design Document là gì?</h2>
  <p>Game Design Document (GDD) là tài liệu mô tả chi tiết mọi yếu tố của game: <strong>vision/concept</strong>, <strong>gameplay mechanics</strong>, <strong>story/narrative</strong>, <strong>characters</strong>, <strong>levels</strong>, <strong>UI/UX</strong>, <strong>art style</strong>, <strong>audio direction</strong>, <strong>technical requirements</strong>, <strong>monetization</strong>, <strong>marketing plan</strong>. Là reference document cho cả team — programmer, artist, designer đều consult GDD để align.</p>
  <p>Modern game development debate về độ &quot;heaviness&quot; của GDD. <strong>Traditional</strong>: 100-500 trang document detailed. <strong>Agile/Modern</strong>: lighter document, lots of small specs riêng cho mỗi feature, living wiki Notion/Confluence. Indie tend toward shorter GDD, AAA full document.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">GDD vs Pitch Document</span>
    <p><strong>Pitch Document</strong>: ngắn (5-20 trang), bán ý tưởng cho publisher, investor. Focus high-level vision, market opportunity. <strong>GDD</strong>: detailed (50-500 trang), guide production team. Implementation detail, asset list, technical spec. Pitch trước, GDD sau khi approved.</p>
  </div>

  <ul class="arc-list">
    <li><strong>One-pager / Concept</strong> — vision tóm tắt</li>
    <li><strong>Game Mechanics</strong> — rules, control, system</li>
    <li><strong>Narrative</strong> — story, dialogue, lore</li>
    <li><strong>Characters</strong> — protagonist, NPC, enemy</li>
    <li><strong>Levels</strong> — design, layout, progression</li>
    <li><strong>UI/UX</strong> — interface, menu flow</li>
    <li><strong>Technical</strong> — engine, target platform, performance</li>
    <li><strong>Asset List</strong> — required art, audio</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"game design document GDD template structure"</span>
    </div>
    <p class="arc-image-caption">Game Design Document — &quot;bible&quot; mô tả mọi yếu tố của game</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Cấu trúc GDD chuẩn</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Game Overview</summary>
      <div class="arc-card-body">
        <p>Title, genre, target platform, target audience, USP (Unique Selling Point). Pitch 1-2 paragraph elevator. &quot;Dark Souls meets Animal Crossing&quot; — quick concept.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Gameplay</summary>
      <div class="arc-card-body">
        <p>Core loop (what player does moment to moment). Mechanics list: movement, combat, inventory, progression. Win/lose conditions. Difficulty curve.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Story &amp; Narrative</summary>
      <div class="arc-card-body">
        <p>Synopsis, plot outline, character bios, world lore. Dialogue tone, narrative style (linear, branching, environmental).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Characters</summary>
      <div class="arc-card-body">
        <p>Protagonist details. NPC list với role. Enemy types, behavior. Character abilities, progression tree.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Levels &amp; World</summary>
      <div class="arc-card-body">
        <p>World map, level list with description. Pacing, progression. Setting, atmosphere mỗi level.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. UI/UX</summary>
      <div class="arc-card-body">
        <p>Menu flow diagram. HUD elements. Inventory layout. Controls scheme cho mỗi platform.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>7. Art Direction</summary>
      <div class="arc-card-body">
        <p>Style guide — realistic, stylized, pixel art. Color palette. Character/environment reference. Mood board.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>8. Audio Direction</summary>
      <div class="arc-card-body">
        <p>Music genre, tone. SFX style. Voice direction (full VO hay text only). Reference tracks.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>9. Technical</summary>
      <div class="arc-card-body">
        <p>Engine choice (Unreal, Unity, custom). Target platform spec. Network architecture (single/multi). Performance target (60fps 1080p).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>10. Monetization &amp; Marketing</summary>
      <div class="arc-card-body">
        <p>Premium ($X), F2P, subscription. DLC plan. Marketing channels, launch strategy.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Tips Viết GDD</h2>
  <ul class="arc-list">
    <li><strong>Start with one-pager</strong> — high-level vision trước detail</li>
    <li><strong>Use visuals</strong> — diagram, mockup, sketch better than wall of text</li>
    <li><strong>Living document</strong> — update suốt production, version control</li>
    <li><strong>Modular structure</strong> — section riêng cho feature, easy update</li>
    <li><strong>Clear ownership</strong> — designer riêng cho mỗi section</li>
    <li><strong>Don&apos;t over-design</strong> — gameplay test sớm, adjust based on real play</li>
    <li><strong>Tool</strong>: Notion, Confluence, Google Docs cho collaborative</li>
  </ul>
</section>
`,
  },

  // 09. Game Engine
  {
    id: "7b65b000-92e7-46ee-81eb-8fbc74a5f8f5",
    tieu_de: "Game Engine",
    tieu_de_viet: "Công cụ phát triển game (Game Engine)",
    tom_tat:
      "Game Engine là phần mềm framework cung cấp tools và systems cần thiết để tạo game — rendering, physics, audio, scripting, UI. Unreal Engine và Unity là 2 game engine phổ biến nhất hiện nay.",
    meta_title: "Game Engine là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Game Engine là framework phát triển game. Tìm hiểu Unreal Engine, Unity, Godot và cách chọn engine phù hợp cho project.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn muốn làm game. Tự code render engine, physics, audio system? Từ đầu? Mất 10 năm. Hoặc bạn dùng Unreal Engine — render world-class graphics, physics realistic, audio cinema-quality, networking, AI — đã built-in. Focus vào game design thay vì infrastructure. Đó là sức mạnh của <strong>Game Engine</strong> — democratize game development.</p>
  <p>Game Engine là kiến thức nền tảng cho mọi game developer, artist. Hiểu các engine chính (Unreal, Unity, Godot), strengths của từng cái và cách chọn engine phù hợp project quyết định success/failure của game indie và career trajectory của developer.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Game Engine là gì?</h2>
  <p>Game Engine là phần mềm framework cung cấp <strong>tools, systems, runtime</strong> cần thiết để phát triển và run game. Bao gồm: <strong>Rendering Engine</strong> (graphics, lighting, shadow), <strong>Physics Engine</strong> (collision, gravity), <strong>Audio Engine</strong>, <strong>AI System</strong>, <strong>Animation System</strong>, <strong>Scripting</strong> (gameplay code), <strong>UI System</strong>, <strong>Networking</strong> (multiplayer), <strong>Asset Pipeline</strong> (import, optimize).</p>
  <p>Modern game engine có <strong>editor tool</strong> — visual interface để designer/artist build game không cần code. Drag-drop asset, level design visual, blueprint visual scripting. Engine handle complex backend (memory management, GPU optimization) để developer focus content.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Engine vs Framework vs Library</span>
    <p><strong>Engine</strong>: full integrated environment với editor (Unreal, Unity). <strong>Framework</strong>: code library cần code framework (MonoGame, LibGDX, LÖVE). <strong>Library</strong>: specific functionality (SDL, OpenGL — render only). Engine fastest cho production, lowest control. Framework slower develop, higher control. Library lowest level.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Rendering</strong> — graphics, shader, lighting</li>
    <li><strong>Physics</strong> — collision, ragdoll, vehicle</li>
    <li><strong>Audio</strong> — spatial sound, music system</li>
    <li><strong>Scripting</strong> — gameplay code (C#, C++, GDScript)</li>
    <li><strong>Animation</strong> — skeletal, blendshape, state machine</li>
    <li><strong>Editor</strong> — visual world building tool</li>
    <li><strong>Asset Pipeline</strong> — import optimization</li>
    <li><strong>Build System</strong> — cross-platform packaging</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"game engine unreal unity godot comparison editor"</span>
    </div>
    <p class="arc-image-caption">Game Engine — framework cung cấp tools, systems cho phát triển game</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Top Game Engines</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Unreal Engine (Epic Games)</summary>
      <div class="arc-card-body">
        <p>Industry leader cho AAA. C++ + Blueprint visual scripting. Photorealistic graphics best-in-class (Lumen, Nanite). Free, 5% royalty after $1M revenue. Examples: Fortnite, Final Fantasy VII Remake, Hellblade.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Unity</summary>
      <div class="arc-card-body">
        <p>Most popular engine — 50%+ mobile game made in Unity. C# scripting. Easier learning curve than Unreal. Subscription model. Examples: Hollow Knight, Cuphead, Pokémon GO, Among Us.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Godot</summary>
      <div class="arc-card-body">
        <p>Open source, free completely. GDScript (Python-like) + C# + C++. Growing rapidly. Best cho 2D, decent 3D. Examples: indie 2D platformer growing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>GameMaker Studio</summary>
      <div class="arc-card-body">
        <p>2D specialist. GML language (custom). Cheap subscription. Examples: Undertale, Hyper Light Drifter, Hotline Miami.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>RPG Maker</summary>
      <div class="arc-card-body">
        <p>Specialized cho 2D RPG. Beginner-friendly, no code needed. Examples: To the Moon, Yume Nikki, OMORI.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Custom Engines (Proprietary)</summary>
      <div class="arc-card-body">
        <p>AAA studio có engine riêng — RAGE (Rockstar), Decima (Guerrilla), Frostbite (EA), REDengine (CD Projekt Red). Tailored cho game type của studio.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Cách chọn Game Engine</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Theo Genre</h3>
    <ul class="arc-list">
      <li><strong>AAA 3D action/FPS</strong>: Unreal Engine</li>
      <li><strong>Mobile 3D</strong>: Unity</li>
      <li><strong>2D indie</strong>: Godot, GameMaker, Unity</li>
      <li><strong>RPG retro</strong>: RPG Maker</li>
      <li><strong>VR/AR</strong>: Unity hoặc Unreal</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Theo Budget</h3>
    <ul class="arc-list">
      <li><strong>Zero budget</strong>: Godot (truly free)</li>
      <li><strong>Indie</strong>: Unity Personal (free under $200K revenue) hoặc Unreal (free, 5% royalty)</li>
      <li><strong>AAA</strong>: Unreal hoặc custom</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Theo Team Skill</h3>
    <ul class="arc-list">
      <li><strong>Beginner</strong>: GameMaker, RPG Maker, Construct</li>
      <li><strong>Designer-heavy</strong>: Unreal (Blueprint visual scripting)</li>
      <li><strong>Programmer-heavy</strong>: Unity (C#), Unreal (C++)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Theo Target Platform</h3>
    <ul class="arc-list">
      <li><strong>Console</strong>: Unreal hoặc Unity</li>
      <li><strong>Mobile</strong>: Unity (chuẩn)</li>
      <li><strong>Web</strong>: Godot, Unity WebGL</li>
      <li><strong>VR</strong>: Unity hoặc Unreal</li>
    </ul>
  </div>
</section>
`,
  },

  // 10. Game Indie
  {
    id: "3f81a8b2-5fd8-4411-9138-5601e2136de2",
    tieu_de: "Game Indie",
    tieu_de_viet: "Game Indie (Independent Game)",
    tom_tat:
      "Game Indie là game được phát triển bởi cá nhân hoặc team nhỏ không có publisher lớn — creative freedom cao, budget thấp, often innovative gameplay. Stardew Valley, Hollow Knight là ví dụ thành công.",
    meta_title: "Game Indie là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Game Indie là game phát triển bởi team nhỏ. Tìm hiểu lợi thế, thách thức và làm sao thành công với indie game development.",
    noi_dung: `
<section class="arc-intro">
  <p>Stardew Valley — một người (Eric Barone) phát triển trong 4 năm, doanh thu $300M+. Undertale — Toby Fox solo, $50M+ revenue. Hollow Knight, Hades, Vampire Survivors — small team, massive success. Đây là <strong>Game Indie</strong> — proof rằng AAA budget không phải prerequisite cho great game. Creative freedom + execution = magic.</p>
  <p>Game Indie là career path cho aspiring game developer với passion mạnh. Hiểu indie ecosystem, advantages, challenges và success patterns giúp aspiring developer set realistic expectation, plan effective path — và biết khi nào nên indie vs AAA.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Game Indie là gì?</h2>
  <p>Game Indie (Independent Game) là game được phát triển bởi <strong>cá nhân hoặc team nhỏ</strong> mà không có sự hỗ trợ tài chính từ publisher lớn. Team size: 1 (solo dev) đến 20-30 người. Budget: từ $0 (passion project) đến $5M. Time: 1-7 năm tùy scope. Quan trọng: <strong>creative control</strong> hoàn toàn ở developer, không bị publisher dictate.</p>
  <p>Indie không equal &quot;low quality&quot; — nhiều game indie top tier hơn AAA về innovation, art direction, narrative. AAA strong ở scope, fidelity. Indie strong ở creativity, focused vision. Steam, Itch.io, Nintendo Switch là platforms thân thiện indie. Indie boom 2010s với Minecraft, Super Meat Boy mở đường.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Indie vs AAA — không phải về quality</span>
    <p>Common misconception: indie = low quality, AAA = high quality. Reality: nhiều indie game (Hollow Knight, Hades, Disco Elysium) được rated cao hơn AAA blockbuster. Sự khác biệt thực: <strong>budget &amp; team scale</strong>, không phải quality. Indie sacrifice scope cho focused vision — kết quả maybe better cho specific audience.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Solo Dev</strong> — 1 người làm everything</li>
    <li><strong>Small Team</strong> — 2-10 người</li>
    <li><strong>Self-Published</strong> — release qua Steam, Itch direct</li>
    <li><strong>Crowdfunding</strong> — Kickstarter cho budget</li>
    <li><strong>Indie Publisher</strong> — Devolver, Annapurna, Raw Fury — boutique publisher</li>
    <li><strong>Engine Choice</strong> — thường Unity, Godot, GameMaker</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"indie game development stardew valley hollow knight team"</span>
    </div>
    <p class="arc-image-caption">Indie game — small team, creative freedom, focused vision</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Advantages của Indie Development</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Creative Freedom</summary>
      <div class="arc-card-body">
        <p>Không publisher dictate. Có thể experiment với genre, story controversial, art style unique. AAA không dám risk vì $100M+ budget.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Niche Markets</summary>
      <div class="arc-card-body">
        <p>AAA target mass market (10M+ sales). Indie có thể profitable với 50K-500K sales. Cho phép serve niche audience deeply.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Solo Vision</summary>
      <div class="arc-card-body">
        <p>Solo dev maintain pure vision — Undertale có thể quirky và personal vì Toby Fox không answer to anyone. AAA &quot;designed by committee&quot; thường lose edge.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Rapid Iteration</summary>
      <div class="arc-card-body">
        <p>Small team decision fast. Try idea, kill if not work, move on. AAA studio meeting tốn hàng tuần.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Career Ownership</summary>
      <div class="arc-card-body">
        <p>Own IP, own revenue 100% (after platform cut). AAA developer salary good but no equity in game success.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Challenges của Indie</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Limited Budget</summary>
      <div class="arc-card-body">
        <p>Bootstrap với own money hoặc Kickstarter $50K-500K. Compete với AAA $50M budget. Quality scope giới hạn.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Wear Many Hats</summary>
      <div class="arc-card-body">
        <p>Solo dev = programmer, artist, designer, marketer. Khó master tất cả. Burnout phổ biến.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Marketing Difficulty</summary>
      <div class="arc-card-body">
        <p>10,000+ game launch trên Steam mỗi năm. Discoverability cực khó. Marketing skill quan trọng như game design skill.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Financial Uncertainty</summary>
      <div class="arc-card-body">
        <p>Sống 2-5 năm không lương developing game. Save up hoặc part-time job. Game có thể fail = total loss.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Scope Creep</summary>
      <div class="arc-card-body">
        <p>&quot;Just one more feature&quot; — indie dev addict ý tưởng mới. Game never ship. Need discipline cut scope.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Indie Success Stories &amp; Tips</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Mega Hits</h3>
    <ul class="arc-list">
      <li><strong>Minecraft</strong> (Mojang, originally solo): $2.5B sale to Microsoft</li>
      <li><strong>Stardew Valley</strong> (Eric Barone solo): $300M+ revenue</li>
      <li><strong>Undertale</strong> (Toby Fox): $50M+ revenue</li>
      <li><strong>Hollow Knight</strong> (Team Cherry, 3 people): $40M+</li>
      <li><strong>Hades</strong> (Supergiant): 20-person team, multiple GOTY</li>
      <li><strong>Vampire Survivors</strong>: 1 dev, 1 năm, $100M+ revenue</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Success Pattern</h3>
    <ul class="arc-list">
      <li>Focus on one core gameplay loop perfect</li>
      <li>Unique art style memorable</li>
      <li>Marketing với community engagement (Twitter, Reddit, YouTube)</li>
      <li>Ship MVP, iterate based on player feedback</li>
      <li>Niche audience strong > mass appeal weak</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Avoid</h3>
    <ul class="arc-list">
      <li>Scope quá lớn cho team size — kill project</li>
      <li>Compete head-on với AAA genre</li>
      <li>Ignore marketing — &quot;build it and they will come&quot; rarely works</li>
      <li>Solo dev with no community feedback loop</li>
    </ul>
  </div>
</section>
`,
  },
];

console.log(`\n── Bắt đầu chạy ${items.length} bài keyword đợt 1.11 ──\n`);

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
