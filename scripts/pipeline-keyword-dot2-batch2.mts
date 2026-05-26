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
  // 01. Keying / Chroma Key
  {
    id: "5628ee2f-2102-4082-97d5-ce992b28e8a2",
    tieu_de: "Keying (Chroma Key)",
    tieu_de_viet: "Kỹ thuật keying VFX",
    tom_tat:
      "Keying (Chroma Key) là quá trình loại bỏ một màu cụ thể khỏi hình ảnh — thường xanh lá hoặc xanh dương — để tách subject khỏi nền, foundation của VFX hiện đại.",
    meta_title: "Keying là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Keying tách subject khỏi nền trong VFX. Tìm hiểu chroma key, luma key, Keylight và workflow keying chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Mọi cảnh CGI trong Marvel, Star Wars, mọi weather report trên TV — đều dùng <strong>keying</strong>. Diễn viên đứng trước nền xanh, post-production tách nền ra, thay bằng cảnh khác. Keying là một trong những kỹ thuật cốt lõi của VFX hiện đại — không thể thiếu cho bất kỳ phim hành động blockbuster nào.</p>
  <p>Keying là kỹ năng cơ bản cho VFX artist, compositor, video editor. Hiểu cách key clean — không có edge xanh, không lose chi tiết tóc, không noise — phân biệt amateur và pro work. Đầu tư học keying là one of best ROI kỹ năng cho video professional.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Keying là gì?</h2>
  <p>Keying (hoặc Chroma Key) là kỹ thuật loại bỏ một <strong>màu cụ thể</strong> trong hình ảnh để tách foreground (subject) ra khỏi background. Phổ biến nhất: <strong>green screen</strong> (xanh lá) và <strong>blue screen</strong> (xanh dương). Sau khi key, subject standalone trên transparent background, có thể composite với background mới — CGI environment, virtual set, hoặc footage khác.</p>
  <p>Nguyên lý: chọn color cần remove → algorithm so sánh mỗi pixel với target color → pixel matching → transparent. Modern keying software phức tạp hơn — không chỉ pure pixel match mà chuyên xử lý edge, spill, semi-transparent (hair, smoke, glass).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Chroma Key vs Luma Key vs Difference Key</span>
    <p><strong>Chroma Key</strong>: key out specific color (green/blue). <strong>Luma Key</strong>: key out specific luminance (white text on black). <strong>Difference Key</strong>: compare hai frames (locked camera), extract movement. Chroma chuẩn cho actor work; luma cho graphic, smoke.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Chroma Key</strong> — key based on color</li>
    <li><strong>Matte</strong> — alpha mask sau key</li>
    <li><strong>Spill</strong> — green reflect lên subject</li>
    <li><strong>Garbage Matte</strong> — rough mask remove non-key area</li>
    <li><strong>Choke</strong> — shrink matte edge</li>
    <li><strong>Despill</strong> — neutralize green spill on subject</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"keying chroma key green screen VFX nuke after effects"</span>
    </div>
    <p class="arc-image-caption">Keying — tách subject khỏi green screen, composite với background mới</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Phần mềm Keying chuyên nghiệp</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Adobe After Effects — Keylight</summary>
      <div class="arc-card-body">
        <p>Plugin Keylight (The Foundry) built-in trong AE. Industry standard cho motion graphics, web video. Eyedropper green → settings tune. Easy enough cho beginner, capable cho pro.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Nuke — IBK / Primatte</summary>
      <div class="arc-card-body">
        <p>Film/TV chuẩn industry. IBK (Image Based Keyer) cho key challenging. Primatte plugin cũng. Top studios sử dụng. Node-based workflow flexible.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>DaVinci Resolve — Qualifier &amp; Delta Keyer</summary>
      <div class="arc-card-body">
        <p>Fusion page (Resolve) có chroma key tools. Studio version có Delta Keyer mạnh hơn. Free tier OK cho hobbyist.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Premiere Pro — Ultra Key</summary>
      <div class="arc-card-body">
        <p>Built-in Premiere. Simple, fast. Suitable cho quick edit, not best quality. Pro work usually move sang AE.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mocha Pro — Planar Tracker + Roto</summary>
      <div class="arc-card-body">
        <p>Specialty cho tracking + roto. Hỗ trợ keying khi green screen không possible — roto manual matte. Used với AE/Nuke.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Keying</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Initial Key</h3>
    <ul class="arc-list">
      <li>Apply Keylight (AE) / Primatte (Nuke) / Ultra Key (Premiere)</li>
      <li>Click eyedropper on green to set key color</li>
      <li>Initial result preview</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Garbage Matte</h3>
    <ul class="arc-list">
      <li>Rough mask cut out non-key area (light stand, edge of screen)</li>
      <li>Mask follow camera move nếu cần (animate)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Refine Matte</h3>
    <ul class="arc-list">
      <li>Adjust Screen Gain, Screen Balance — get clean matte</li>
      <li>Choke / Shrink matte slightly cho avoid green edge</li>
      <li>Edge softness cho natural blend</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Hair Detail</h3>
    <ul class="arc-list">
      <li>Hair edges most challenging — fine detail, semi-transparent</li>
      <li>Separate matte cho hair với softer settings</li>
      <li>Roto Brush (AE) cho complex hair edge</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Spill Suppression</h3>
    <ul class="arc-list">
      <li>Despill tool neutralize green tint trên subject</li>
      <li>Restore original color where green absorbed</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Composite</h3>
    <ul class="arc-list">
      <li>Place new background behind subject</li>
      <li>Color match — adjust subject to fit BG light</li>
      <li>Edge integration — slight blur, atmospheric</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi Keying thường gặp</h2>
  <ul class="arc-list">
    <li><strong>Green edge</strong> — visible color halo around subject. Choke matte slightly, despill</li>
    <li><strong>Subject &quot;cutout&quot; look</strong> — too sharp edge. Soften edge slightly, motion blur match</li>
    <li><strong>Hair detail loss</strong> — fine hair becomes blocky. Separate hair matte, lower threshold</li>
    <li><strong>Uneven key</strong> — green screen lit unevenly → can&apos;t key cleanly. Fix in pre-production lighting</li>
    <li><strong>Noise in matte</strong> — low quality source = noisy key. Denoise source first, key second</li>
    <li><strong>Subject wearing green</strong> — clothing keyed out. Roto + mask manually</li>
  </ul>
</section>
`,
  },

  // 02. Kitbashing
  {
    id: "7d84025e-defc-4c7d-9e16-028f32464560",
    tieu_de: "Kitbashing",
    tieu_de_viet: "Kỹ thuật ghép mảnh (Kitbashing)",
    tom_tat:
      "Kitbashing là kỹ thuật lắp ghép các mesh/model có sẵn để tạo thiết kế mới — phổ biến trong concept art, 3D modeling sci-fi để thử nghiệm ý tưởng nhanh hoặc tạo design phức tạp.",
    meta_title:
      "Kitbashing là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Kitbashing ghép mesh có sẵn tạo design mới. Tìm hiểu workflow, kit phổ biến và ứng dụng concept art, 3D sci-fi.",
    noi_dung: `
<section class="arc-intro">
  <p>Star Wars Millennium Falcon — model gốc 1977 được build từ scrap parts model kit airplane, tank, ship. ILM modeler ghép panel, antenna, mechanical detail từ nhiều kit khác nhau → tạo iconic spaceship. Đây là <strong>kitbashing</strong> — kỹ thuật cổ điển vẫn relevant trong 3D modern. Concept artist 2024 dùng kit Kitbash3D để pre-vis sci-fi city trong ngày, không phải tuần.</p>
  <p>Kitbashing là kỹ thuật accelerate cho concept artist, 3D modeler. Hiểu cách kitbash hiệu quả giúp tạo design phức tạp nhanh — đặc biệt cho sci-fi, mechanical, environment. Productivity multiplier cho freelance, deadline-driven project.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Kitbashing là gì?</h2>
  <p>Kitbashing là kỹ thuật <strong>kết hợp parts từ multiple sources</strong> để tạo design mới. Originally từ model maker — disassemble multiple plastic kit (airplane, tank), combine parts để build custom model. Trong digital era, áp dụng cho 3D modeling — combine mesh assets có sẵn (greeble, panel, mechanical detail) thành new design.</p>
  <p>Tại sao kitbashing hiệu quả? (1) <strong>Speed</strong>: complex design trong hours thay vì weeks. (2) <strong>Detail richness</strong>: kit có pre-modeled fine detail. (3) <strong>Iteration</strong>: swap parts nhanh để test variations. (4) <strong>Style consistency</strong>: kit từ same artist có visual cohesion. Limitation: original-look mesh khó. Kitbash3D, Greeble plugin phổ biến.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Kitbashing — Cheating hay Smart Workflow?</span>
    <p>Some traditional artists dismiss kitbashing là &quot;cheating&quot;. Reality: pro studios (ILM, Weta) dùng kitbashing từ decades — Star Wars Death Star, Blade Runner buildings, Avengers tech. Smart artists biết khi nào kitbash (rapid concept, mechanical detail) và khi nào model from scratch (hero asset cần unique).</p>
  </div>

  <ul class="arc-list">
    <li><strong>Kit</strong> — collection of reusable parts/meshes</li>
    <li><strong>Greeble</strong> — small mechanical detail (panel, pipe, antenna)</li>
    <li><strong>Hero Asset</strong> — main, custom-modeled</li>
    <li><strong>Filler</strong> — kitbash parts cho background detail</li>
    <li><strong>Modular</strong> — parts designed to combine</li>
    <li><strong>Spline / Array Modifier</strong> — automate parts placement</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"kitbashing 3D model sci-fi spaceship concept art parts"</span>
    </div>
    <p class="arc-image-caption">Kitbashing — combine parts có sẵn tạo design phức tạp nhanh</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Sources Kit phổ biến</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Kitbash3D</summary>
      <div class="arc-card-body">
        <p>Top kit provider — sci-fi city, fantasy castle, mech kit. High quality, USD/FBX/Blend format. $99-299/kit. Used by Marvel, Industrial Light &amp; Magic. Industry standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Kitbash3D Cargo</summary>
      <div class="arc-card-body">
        <p>Subscription service từ Kitbash3D — access all kits monthly fee. Better cho heavy users.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Gumroad Indie Artists</summary>
      <div class="arc-card-body">
        <p>Many indie artists sell custom kits — affordable $5-50. Niche kit (cyberpunk, steampunk, organic).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Quixel Megascans</summary>
      <div class="arc-card-body">
        <p>Free với Unreal Engine — environment asset library. Combine cho environment kitbash.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender Market / TurboSquid</summary>
      <div class="arc-card-body">
        <p>Asset marketplace. Mixed quality. Search kit-style asset.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Free / Open Source</summary>
      <div class="arc-card-body">
        <p>Sketchfab CC-license, Blendswap, Free3D. Good cho practice, smaller project.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Kitbashing</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Concept &amp; Reference</h3>
    <ul class="arc-list">
      <li>Sketch rough silhouette trước</li>
      <li>Reference image cho detail style</li>
      <li>Don&apos;t skip planning — kitbash random = chaos</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Block Major Forms</h3>
    <ul class="arc-list">
      <li>Primary shape — main body, large component</li>
      <li>Use simple primitive hoặc large kit parts</li>
      <li>Get overall silhouette right first</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Layer Detail</h3>
    <ul class="arc-list">
      <li>Add medium parts — panel, hatches</li>
      <li>Then small greeble — antenna, pipe, bolts</li>
      <li>Vary scale cho visual interest</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Composition &amp; Focal Point</h3>
    <ul class="arc-list">
      <li>Don&apos;t bash uniformly — high detail near focal point</li>
      <li>Rest of model less detail</li>
      <li>Eye guidance</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Unify với Material</h3>
    <ul class="arc-list">
      <li>Same material cho all kitbashed parts</li>
      <li>Wear, weathering cohesive cross piece</li>
      <li>Substance Painter để unify look</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Custom Hero Detail</h3>
    <ul class="arc-list">
      <li>Add 1-2 custom modeled hero element</li>
      <li>Original signature feature</li>
      <li>Avoid &quot;100% kitbash&quot; look</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Ứng dụng Kitbashing</h2>
  <ul class="arc-list">
    <li><strong>Concept Art</strong> — sci-fi vehicle, city, mech rapid pre-vis</li>
    <li><strong>Environment Background</strong> — non-hero buildings, props</li>
    <li><strong>Film VFX</strong> — destruction debris, spaceship fleet</li>
    <li><strong>Game Asset</strong> — modular building generator</li>
    <li><strong>Architectural Viz</strong> — instant urban scene populate</li>
    <li><strong>Personal Portfolio</strong> — quick impressive piece</li>
  </ul>
</section>
`,
  },

  // 03. Layer Mask
  {
    id: "4759ad35-385d-49a3-ba6f-342c700a1cb5",
    tieu_de: "Layer Mask",
    tieu_de_viet: "Mặt nạ lớp (Layer Mask)",
    tom_tat:
      "Layer Mask là công cụ ẩn/hiện vùng cụ thể của layer bằng cách vẽ đen/trắng lên mask — non-destructive, cho phép chỉnh sửa linh hoạt không mất dữ liệu. Foundation của Photoshop, Procreate workflow.",
    meta_title:
      "Layer Mask là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Layer Mask trong Photoshop ẩn/hiện vùng layer. Tìm hiểu cách dùng, vector mask và best practice non-destructive editing.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn cut người khỏi photo background — erase tool trực tiếp = mất pixel forever, sai phải undo. Hoặc dùng <strong>Layer Mask</strong> — mask phần background ra, original photo intact. Sau này muốn unmask hoặc adjust edge — chỉ paint trên mask, không mất gì. Đây là <strong>non-destructive editing</strong> — nguyên tắc cơ bản của Photoshop workflow.</p>
  <p>Layer Mask là kỹ năng cơ bản cho mọi digital artist — Photoshop, Procreate, After Effects, Illustrator đều có. Hiểu mask thành thạo phân biệt amateur (erase trực tiếp) và pro (mask non-destructive). Đầu tư học mask sớm là one of best investment cho career.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Layer Mask là gì?</h2>
  <p>Layer Mask là grayscale image attached vào layer — controlled <strong>visibility</strong> của từng pixel theo grayscale value. <strong>White (255)</strong>: pixel visible 100%. <strong>Black (0)</strong>: pixel invisible 100%. <strong>Gray (128)</strong>: pixel 50% transparent. Edit mask = paint black/white/gray. Layer underlying không bị touch — original intact.</p>
  <p>Workflow: add Layer Mask → mask auto white (everything visible) → paint black on mask để hide area → paint white để restore. Brush soft cho gradient transition. Mask area = preserved data, có thể restore anytime. Compare with Eraser tool — destroy pixel forever, no recovery.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Layer Mask vs Vector Mask vs Clipping Mask</span>
    <p><strong>Layer Mask</strong>: pixel-based mask, painted với brush. <strong>Vector Mask</strong>: path-based mask, edited với Pen Tool. Crisp edges. <strong>Clipping Mask</strong>: layer below clip layer above. Use case: text với image content. Mỗi loại có use case riêng — layer mask phổ biến nhất.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Layer Mask</strong> — grayscale image, pixel-based</li>
    <li><strong>Vector Mask</strong> — path-based, vector</li>
    <li><strong>Clipping Mask</strong> — layer clip vào layer dưới</li>
    <li><strong>Quick Mask</strong> — temporary mask painting selection</li>
    <li><strong>Channel Mask</strong> — based on color channel</li>
    <li><strong>Smart Filter Mask</strong> — mask filter trên smart object</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"layer mask photoshop non-destructive editing black white"</span>
    </div>
    <p class="arc-image-caption">Layer Mask — paint black ẩn, white hiện, gray semi-transparent</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Use Cases Layer Mask</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Background Removal</summary>
      <div class="arc-card-body">
        <p>Cut subject khỏi background. Select Subject → Add Mask. Hiện chỉ subject, background hidden. Refine edge với brush. Non-destructive vs erase.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Compositing Multiple Images</summary>
      <div class="arc-card-body">
        <p>Blend nhiều ảnh thành composite. Mỗi layer có mask hide/reveal area. Sky replacement, double exposure, photomanipulation — all dùng mask.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Selective Color Correction</summary>
      <div class="arc-card-body">
        <p>Adjustment layer (Curves, Hue/Sat) với mask — affect only specific area. Brighten subject without affect background.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Soft Transition</summary>
      <div class="arc-card-body">
        <p>Gradient mask cho smooth fade — overlay text fade out, image blend smooth. Soft brush hoặc gradient tool trên mask.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Reveal Animation</summary>
      <div class="arc-card-body">
        <p>After Effects mask animation — text reveal, image wipe in. Mask shape animate over time.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Photo Retouching</summary>
      <div class="arc-card-body">
        <p>Retouch on separate layer + mask. Skin smoothing, color shift selective. Can dial back if too much.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Layer Mask</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Add Mask</h3>
    <ul class="arc-list">
      <li>Select layer → click Add Layer Mask icon (rectangle với circle) ở Layers panel</li>
      <li>Mask trắng appear next to layer thumbnail</li>
      <li>Alt+click icon = mask black (everything hidden initially)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Paint trên Mask</h3>
    <ul class="arc-list">
      <li>Click mask thumbnail (border highlights)</li>
      <li>Brush tool, black foreground</li>
      <li>Paint trên image — area hide</li>
      <li>Switch foreground white để restore (X key swap)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Refine</h3>
    <ul class="arc-list">
      <li>Soft brush cho gradual transition</li>
      <li>Opacity brush cho subtle adjustment</li>
      <li>Refine Mask dialog cho hair detail</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. View Mask</h3>
    <ul class="arc-list">
      <li>Alt+click mask thumbnail = view mask as image</li>
      <li>Shift+click = toggle mask on/off</li>
      <li>Useful for debugging</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Convert Selection to Mask</h3>
    <ul class="arc-list">
      <li>Make selection → Add Mask</li>
      <li>Selection auto convert to mask</li>
      <li>Workflow: Select Subject + Mask = quick cutout</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Mask Adjustment</h3>
    <ul class="arc-list">
      <li>Right-click mask → Refine Mask Edge</li>
      <li>Feather, Contrast adjust</li>
      <li>Density &amp; Feather sliders trong Properties</li>
    </ul>
  </div>
</section>
`,
  },

  // 04. Layer-based
  {
    id: "ea434472-7276-4843-aa84-c2e4e95c70a4",
    tieu_de: "Layer-based Editing",
    tieu_de_viet: "Chỉnh sửa theo lớp (Layer-based)",
    tom_tat:
      "Layer-based là phương pháp tổ chức composition trong phần mềm đồ họa bằng nhiều lớp chồng lên nhau — mỗi layer chứa nội dung riêng, có thể edit, hide, blend mode khác nhau.",
    meta_title:
      "Layer-based là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Layer-based editing trong Photoshop, AE. Tìm hiểu blend mode, organization và best practice non-destructive workflow.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn mở Photoshop project chuyên nghiệp — Layers panel có 50+ layer, organized vào group, named clear. Mỗi element ở layer riêng — background, subject, text, adjustment. Modify một part không affect others. Đây là <strong>layer-based workflow</strong> — foundation của mọi digital design software modern.</p>
  <p>Layer-based thinking là kỹ năng cơ bản nhất cho mọi digital artist. Hiểu layer hierarchy, blend mode, organization là one of first things học khi bắt đầu Photoshop, Illustrator, After Effects. Pro workflow phụ thuộc heavily vào layer discipline.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Layer-based là gì?</h2>
  <p>Layer-based editing là phương pháp tổ chức composition bằng cách chia nội dung thành nhiều <strong>layer (lớp) xếp chồng</strong>. Mỗi layer là một &quot;tờ giấy trong suốt&quot; chứa pixel hoặc vector, các layer phía trên hiển thị trên các layer dưới. Order quyết định hiển thị — top of stack visible most. Layer có thể: visible/hidden, opacity, blend mode, mask, effect.</p>
  <p>Layer concept introduced bởi Photoshop 3.0 (1994) — revolutionary at the time. Trước đó: tất cả pixel trên cùng canvas, edit destructive. Sau Photoshop 3.0: separated layers, non-destructive workflow. Modern software (Illustrator, AE, Procreate, Figma, Krita) đều layer-based.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Layer-based vs Node-based</span>
    <p><strong>Layer-based</strong>: stack layers top-down, blend mode kết hợp. Intuitive, visual. Photoshop, AE chuẩn. <strong>Node-based</strong>: graph network nodes (Nuke, Houdini, Substance Designer). Flexibility cao hơn, harder learning curve. Compositor pro biết cả hai.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Layer Stack</strong> — order từ bottom đến top</li>
    <li><strong>Opacity</strong> — transparency từ 0-100%</li>
    <li><strong>Blend Mode</strong> — cách layer interact với layer dưới</li>
    <li><strong>Layer Group</strong> — folder organize layers</li>
    <li><strong>Adjustment Layer</strong> — effect không chứa pixel</li>
    <li><strong>Smart Object</strong> — encapsulated layer non-destructive</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"layer based editing photoshop layers panel organization"</span>
    </div>
    <p class="arc-image-caption">Layer-based — composition tổ chức bằng nhiều lớp xếp chồng</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Blend Modes</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Normal Group</summary>
      <div class="arc-card-body">
        <p><strong>Normal</strong>: default, no blending. <strong>Dissolve</strong>: random pixel based on opacity.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Darken Group</summary>
      <div class="arc-card-body">
        <p><strong>Darken</strong>: pick darker pixel. <strong>Multiply</strong>: most useful — darken result, shadow effect. <strong>Color Burn</strong>: strong darken with contrast.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lighten Group</summary>
      <div class="arc-card-body">
        <p><strong>Lighten</strong>: pick lighter pixel. <strong>Screen</strong>: lighten result, light effect, double exposure. <strong>Color Dodge</strong>: strong lighten.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Contrast Group</summary>
      <div class="arc-card-body">
        <p><strong>Overlay</strong>: combine darken+lighten, increase contrast. <strong>Soft Light</strong>: subtle. <strong>Hard Light</strong>: strong.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Difference Group</summary>
      <div class="arc-card-body">
        <p><strong>Difference</strong>: absolute value of difference. <strong>Exclusion</strong>: similar but lower contrast. Used for special effect, identical layer comparison.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Group</summary>
      <div class="arc-card-body">
        <p><strong>Hue</strong>: blend hue only. <strong>Saturation</strong>: blend saturation. <strong>Color</strong>: blend hue + saturation. <strong>Luminosity</strong>: blend lightness only. Use for color grading.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Layer Organization Best Practice</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Naming Convention</h3>
    <ul class="arc-list">
      <li>Name every layer clearly</li>
      <li>Hierarchy: BG, Subject, Effects, Text</li>
      <li>Avoid &quot;Layer 1&quot;, &quot;Copy 2&quot;</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Group Related Layers</h3>
    <ul class="arc-list">
      <li>Folder cho character, BG, text, FX</li>
      <li>Color code group cho quick recognition</li>
      <li>Collapse group khi không edit</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Non-Destructive Workflow</h3>
    <ul class="arc-list">
      <li>Smart Object cho big edit</li>
      <li>Adjustment Layer thay vì destructive adjustment</li>
      <li>Layer Mask thay vì erase</li>
      <li>Duplicate trước radical change</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Performance</h3>
    <ul class="arc-list">
      <li>Merge layers không edit nữa</li>
      <li>Smart Object cho heavy layer</li>
      <li>Hide invisible layer</li>
      <li>Optimize layer order trong AE</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Collaboration</h3>
    <ul class="arc-list">
      <li>Clear naming cho team member</li>
      <li>Color code per artist</li>
      <li>Comment / note trong file</li>
    </ul>
  </div>
</section>
`,
  },

  // 05. Leading, Tracking & Kerning
  {
    id: "a50d8454-f1e3-411c-8a72-b208b3c5382c",
    tieu_de: "Leading, Tracking &amp; Kerning",
    tieu_de_viet: "Ba khái niệm typography cơ bản",
    tom_tat:
      "Leading (khoảng cách dòng), Tracking (khoảng cách đều ký tự), Kerning (khoảng cách giữa 2 ký tự cụ thể) — 3 control typography cơ bản quyết định readability và aesthetic của text.",
    meta_title:
      "Leading, Tracking, Kerning là gì? Ý nghĩa và ứng dụng | CINS",
    meta_description:
      "Leading, Tracking, Kerning là 3 control typography. Tìm hiểu khi nào dùng, cách điều chỉnh trong Illustrator, Photoshop, web CSS.",
    noi_dung: `
<section class="arc-intro">
  <p>Hai poster — cùng font, cùng size, cùng màu. Một cái nhìn &quot;đẹp&quot;, professional. Một cái nhìn &quot;off&quot;, amateur. Khác biệt? Designer pro đã tinh chỉnh <strong>Leading, Tracking, Kerning</strong> — 3 control typography invisible nhưng critical. Đây là details mà casual viewer không nhận ra nhưng feel — &quot;quality&quot; vs &quot;cheap&quot; design.</p>
  <p>3 concept này là kỹ năng cơ bản cho mọi designer — graphic, web, UI/UX, motion. Mặc dù typography software handle auto-spacing decent, master designer biết khi nào override defaults cho perfect typesetting.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>3 Khái niệm là gì?</h2>
  <p><strong>Leading</strong> (vần &quot;ledding&quot;, từ &quot;lead&quot; chì): khoảng cách giữa <strong>các dòng văn bản</strong> (line spacing). Đo từ baseline dòng này đến baseline dòng tiếp. <strong>Tracking</strong>: khoảng cách đều giữa <strong>tất cả ký tự</strong> trong một đoạn — letter-spacing global. <strong>Kerning</strong>: khoảng cách giữa <strong>hai ký tự cụ thể</strong> — micro-adjustment cho character pair specific.</p>
  <p>Hierarchy quan trọng theo scope: Leading (paragraph) → Tracking (word/line) → Kerning (specific pair). Mỗi level fix vấn đề ở scale khác. Beginner adjust Tracking; pro adjust Kerning pair-by-pair cho headline luxury.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Why 3 controls?</span>
    <p>Different problems cần different solution. Long paragraph khó đọc? Adjust Leading. Headline trông &quot;crowded&quot;? Increase Tracking. Logo có &quot;AV&quot; pair với weird gap? Manual Kerning. Each control essential cho specific use case.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Leading</strong> — line spacing (baseline to baseline)</li>
    <li><strong>Tracking</strong> — letter-spacing đều cho range</li>
    <li><strong>Kerning</strong> — spacing giữa 2 ký tự cụ thể</li>
    <li><strong>Baseline</strong> — đường ngang character đứng</li>
    <li><strong>Cap Height</strong> — chiều cao uppercase</li>
    <li><strong>X-Height</strong> — chiều cao lowercase letter &apos;x&apos;</li>
    <li><strong>Optical vs Metric Kerning</strong> — auto kerning methods</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"leading tracking kerning typography spacing illustrator"</span>
    </div>
    <p class="arc-image-caption">Leading (line), Tracking (đều), Kerning (pair-specific) — 3 control typography</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Leading — Line Spacing</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Nguyên tắc</h3>
    <ul class="arc-list">
      <li>Default leading thường = 120% font size</li>
      <li>Body text: 1.4-1.6× font size (readability)</li>
      <li>Headline: 1.0-1.2× (tighter, impact)</li>
      <li>Caption nhỏ: 1.2-1.3×</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Use Case</h3>
    <ul class="arc-list">
      <li>Long-form article: increase leading cho easy reading</li>
      <li>Headline poster: tight leading cho block feel</li>
      <li>UI text: medium leading cho scanning</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Trong Software</h3>
    <ul class="arc-list">
      <li><strong>Illustrator/Photoshop</strong>: Character panel, Leading dropdown</li>
      <li><strong>CSS</strong>: line-height property (1.5, 1.6 standard cho body)</li>
      <li><strong>InDesign</strong>: Character panel với detailed control</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Tracking — Letter Spacing</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Nguyên tắc</h3>
    <ul class="arc-list">
      <li>0 = default font spacing</li>
      <li>Positive: spread letters apart</li>
      <li>Negative: tighten letters</li>
      <li>Body text: 0 to slight positive (+10 to +20)</li>
      <li>Headline large: slight negative (-20 to -50)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Use Case</h3>
    <ul class="arc-list">
      <li>Large headline tightening (looks too spread at big size)</li>
      <li>Caps text loosening (uppercase looks crowded)</li>
      <li>Letterspacing for stylistic — luxury, fashion brand</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Trong Software</h3>
    <ul class="arc-list">
      <li><strong>Illustrator</strong>: Character panel, Tracking value</li>
      <li><strong>CSS</strong>: letter-spacing (0.1em, 0.2em values)</li>
      <li><strong>Figma</strong>: Letter Spacing input</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Kerning — Pair Spacing</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Nguyên tắc</h3>
    <ul class="arc-list">
      <li>Adjust khoảng cách giữa 2 ký tự cụ thể</li>
      <li>Problematic pairs: AV, AW, WA, Av, To, Tr</li>
      <li>Visual evenness > mathematical evenness</li>
      <li>Critical cho logo, headline, large display text</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Auto Kerning Modes</h3>
    <ul class="arc-list">
      <li><strong>Metric</strong>: use font built-in kerning data — good quality font OK</li>
      <li><strong>Optical</strong>: software analyzes shape automatically — better cho mixed fonts</li>
      <li><strong>Manual</strong>: artist set pair-by-pair — best quality, time-consuming</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Use Case</h3>
    <ul class="arc-list">
      <li>Logo typography — kern pair-by-pair</li>
      <li>Large headline cho magazine cover</li>
      <li>Wedding invitation, luxury branding</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Lỗi thường gặp</h3>
    <ul class="arc-list">
      <li><strong>&quot;A V&quot;</strong> looks too spread — kern tighter</li>
      <li><strong>&quot;T o&quot;</strong> overlap không đẹp — kern looser</li>
      <li>Apostrophe trong &quot;don&apos;t&quot; — adjust around it</li>
      <li>Number paired với letter — often needs kern</li>
    </ul>
  </div>
</section>
`,
  },

  // 06. Lens Distortion
  {
    id: "b628fb6e-2132-415d-9d5a-c27a3a5e2680",
    tieu_de: "Lens Distortion",
    tieu_de_viet: "Méo ống kính (Lens Distortion)",
    tom_tat:
      "Lens Distortion là biến dạng hình ảnh do ống kính máy ảnh — barrel, pincushion, fisheye. Có thể là artifact (correct trong post) hoặc effect nghệ thuật (add intentional cho cinematic).",
    meta_title:
      "Lens Distortion là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Lens Distortion là méo ống kính. Tìm hiểu barrel, pincushion, fisheye và cách correct hoặc add trong post-production.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn chụp ảnh kiến trúc với wide-angle lens — building thẳng đứng bị bend ra ngoài như cong. Hoặc xem GoPro footage — line straight bị curve. Đây là <strong>lens distortion</strong> — artifact tự nhiên của ống kính, đặc biệt wide-angle. Có thể correct trong post hoặc add intentionally cho cinematic effect.</p>
  <p>Lens Distortion là kiến thức quan trọng cho photographer, video editor, VFX compositor. Hiểu các loại distortion và cách correct/add giúp output professional — clean architecture photo, integrated CGI vào real footage, cinematic lens look.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Lens Distortion là gì?</h2>
  <p>Lens Distortion là biến dạng hình ảnh do <strong>characteristics của ống kính</strong> camera. Light bend khi đi qua glass element, không hoàn toàn straight. Result: straight line trong reality bị curve trong image. Mức độ distortion phụ thuộc focal length (wide-angle distort nhiều, telephoto ít) và quality ống kính (premium lens distort ít hơn cheap).</p>
  <p>Có 3 loại chính: <strong>Barrel Distortion</strong> (bend outward, lines curve outward — wide-angle, fisheye); <strong>Pincushion Distortion</strong> (bend inward, lines curve inward — telephoto); <strong>Mustache Distortion</strong> (mix cả hai, complex curve — modern complex lens).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Distortion intentional vs unintentional</span>
    <p><strong>Unintentional</strong>: artifact lens, correct trong post cho clean architectural photo, product shot. <strong>Intentional</strong>: add distortion cho cinematic look — anamorphic lens, fisheye action camera. Modern phim heavily use anamorphic — wide aspect ratio + slight distortion characteristic.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Barrel Distortion</strong> — lines curve outward (wide-angle)</li>
    <li><strong>Pincushion</strong> — lines curve inward (telephoto)</li>
    <li><strong>Mustache</strong> — complex mix</li>
    <li><strong>Chromatic Aberration</strong> — color fringing (related)</li>
    <li><strong>Vignetting</strong> — corner darker (related)</li>
    <li><strong>Anamorphic Distortion</strong> — horizontal squeeze (cinematic)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"lens distortion barrel pincushion fisheye correction"</span>
    </div>
    <p class="arc-image-caption">Lens Distortion — barrel (wide), pincushion (tele), mustache (complex)</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Loại Lens Distortion</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Barrel Distortion</summary>
      <div class="arc-card-body">
        <p>Lines curve outward like barrel sides. Caused by wide-angle lens — light bend more at edges. GoPro extreme barrel. Architectural photo cần correct.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pincushion Distortion</summary>
      <div class="arc-card-body">
        <p>Lines curve inward like pincushion. Caused by telephoto lens. Less common, less noticeable. Portrait long lens slight pincushion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mustache Distortion</summary>
      <div class="arc-card-body">
        <p>Complex curve — barrel ở center, pincushion ở edge. Modern zoom lens với multiple element. Hardest to correct.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Fisheye</summary>
      <div class="arc-card-body">
        <p>Extreme barrel — 180° field of view, intentional stylization. Sport, action, creative photo. Lens specific dedicated cho fisheye.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Anamorphic Distortion</summary>
      <div class="arc-card-body">
        <p>Horizontal compression — cinema anamorphic lens. Iconic bokeh oval, flare horizontal. Used cho cinematic wide aspect ratio.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Correct Lens Distortion</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Lightroom / Camera Raw</h3>
    <ul class="arc-list">
      <li>Lens Corrections panel</li>
      <li>Profile-based — auto correct nếu lens được hỗ trợ</li>
      <li>Manual sliders cho fine adjust</li>
      <li>Enable Profile Corrections checkbox</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photoshop</h3>
    <ul class="arc-list">
      <li>Filter → Lens Correction</li>
      <li>Auto Correction tab (profile-based)</li>
      <li>Custom tab cho manual control</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">DaVinci Resolve / Premiere</h3>
    <ul class="arc-list">
      <li>Lens Distortion effect trong Effects panel</li>
      <li>Slider cho distortion amount</li>
      <li>Useful cho match CGI vào lens-distorted footage</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX (Nuke)</h3>
    <ul class="arc-list">
      <li>LensDistortion node</li>
      <li>Workflow: undistort plate → comp CGI → redistort</li>
      <li>Critical cho seamless CGI integration</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Add Lens Distortion (Effect)</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">After Effects</h3>
    <ul class="arc-list">
      <li>Effect → Distort → Optics Compensation</li>
      <li>Field of View, Reverse Lens Distortion sliders</li>
      <li>Combine với Chromatic Aberration cho realistic lens look</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Premiere / Resolve</h3>
    <ul class="arc-list">
      <li>Lens Distortion effect</li>
      <li>Apply slight barrel cho &quot;handheld&quot; feel</li>
      <li>Heavy distortion cho stylized music video</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cinematic Style Trends</h3>
    <ul class="arc-list">
      <li>Anamorphic emulation: slight barrel + horizontal lens flare</li>
      <li>Vintage lens emulation: subtle distortion + chromatic aberration</li>
      <li>Sci-fi / dystopian: heavy distortion + glow</li>
    </ul>
  </div>
</section>
`,
  },

  // 07. Lens Flare
  {
    id: "2c820cfb-0701-4df9-a624-ce41da1e4bf6",
    tieu_de: "Lens Flare",
    tieu_de_viet: "Lóa ống kính (Lens Flare)",
    tom_tat:
      "Lens Flare là hiệu ứng ánh sáng tán xạ qua ống kính tạo vòng sáng, tia sáng — có thể là artifact không mong muốn hoặc add có chủ đích để tăng cảm giác thực và cinematic.",
    meta_title:
      "Lens Flare là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Lens Flare là lóa sáng qua ống kính. Tìm hiểu loại flare, J.J. Abrams style và cách add lens flare trong post-production.",
    noi_dung: `
<section class="arc-intro">
  <p>Star Trek (2009) J.J. Abrams — lens flare khắp nơi, dramatic, đặc trưng. Photographer cố tránh flare; J.J. embrace như signature style. Lens flare từ &quot;mistake&quot; trở thành &quot;effect&quot; — một trong những visual element được dùng nhiều nhất trong cinematic media hiện đại.</p>
  <p>Lens Flare là kiến thức quan trọng cho video editor, motion designer, VFX artist. Hiểu cơ chế vật lý flare và cách add tinh tế giúp tạo footage cinematic — tránh overused fake-looking flare amateur.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Lens Flare là gì?</h2>
  <p>Lens Flare là hiệu ứng quang học xảy ra khi ánh sáng mạnh (mặt trời, đèn) chiếu trực tiếp vào ống kính — light bounce giữa các element kính bên trong, tán xạ tạo thành <strong>vòng sáng, tia sáng, ghost image</strong> trong frame. Mức độ flare phụ thuộc lens design — modern lens với coating reduce flare, vintage lens flare easily.</p>
  <p>Photographer truyền thống tránh flare (lens hood, reposition). Modern filmmaker often embrace flare — adds &quot;realism&quot;, energy, cinematic feel. Star Trek (2009), Wonder Woman, Marvel phim đều heavy use lens flare. Anamorphic lens flare horizontal stripe iconic trong sci-fi cinematic.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Real Flare vs Fake Flare</span>
    <p><strong>Real flare</strong>: capture in-camera, authentic — react with lighting, distance, focus. <strong>Fake flare (post-production)</strong>: added trong AE, Resolve — easier but often look obviously fake nếu overdone. Best: capture real flare in-camera; subtle augment post nếu needed.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Ghost Image</strong> — internal reflection của light source</li>
    <li><strong>Veiling Flare</strong> — overall haze reducing contrast</li>
    <li><strong>Streak</strong> — line of light qua frame</li>
    <li><strong>Anamorphic Flare</strong> — horizontal streak từ anamorphic lens</li>
    <li><strong>Aperture Shape</strong> — hexagon/circle ghost based on aperture blade</li>
    <li><strong>Coating</strong> — modern lens coating reduces flare</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"lens flare cinematic JJ Abrams anamorphic streak sun"</span>
    </div>
    <p class="arc-image-caption">Lens Flare — light scatter qua lens tạo ghost, streak, haze cinematic</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Lens Flare</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Anamorphic Flare</summary>
      <div class="arc-card-body">
        <p>Horizontal streak từ anamorphic cinema lens. Blue tint typical. Iconic cho sci-fi (Star Trek, Star Wars), thriller modern. Premium look — pseudo anamorphic plugin available cho non-anamorphic footage.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ghost Image</summary>
      <div class="arc-card-body">
        <p>Internal reflection giữa lens element — line of small circle/hexagon trên frame. Aperture blade shape visible. Vintage lens tendency.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Veiling Flare / Haze</summary>
      <div class="arc-card-body">
        <p>Overall lift trong shadow, reduce contrast. Dreamy, soft feel. Anamorphic, vintage lens. Faked easily với fog overlay.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Streak Flare</summary>
      <div class="arc-card-body">
        <p>Line of light qua frame — straight or curved. From point light source. Anamorphic has horizontal; spherical lens has radial.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bokeh Flare</summary>
      <div class="arc-card-body">
        <p>Out-of-focus highlight aperture shape. Soft, dreamy. Not technically &quot;flare&quot; nhưng related effect.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Chromatic Flare</summary>
      <div class="arc-card-body">
        <p>Color separation trong flare — rainbow, prism effect. Vintage uncoated lens. Cinematic stylization.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Add Lens Flare trong Post</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">After Effects</h3>
    <ul class="arc-list">
      <li>Effect → Generate → Lens Flare (built-in)</li>
      <li>Optical Flares plugin (Video Copilot) — chuẩn industry, vast preset</li>
      <li>Knoll Light Factory — alternative premium plugin</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Premiere / Resolve</h3>
    <ul class="arc-list">
      <li>Lens Flare effect built-in</li>
      <li>Plugin Boris FX BCC Lens Flare</li>
      <li>Overlay PNG/Video flare từ marketplace</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Overlay Footage</h3>
    <ul class="arc-list">
      <li>Stock footage lens flare overlay (4K black BG, screen blend mode)</li>
      <li>RocketStock, Triune Digital provide</li>
      <li>Easiest to integrate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3D Software</h3>
    <ul class="arc-list">
      <li>Blender Compositor Lens Flare node</li>
      <li>Maya/Houdini render pass cho flare</li>
      <li>Add cho CGI scene cho cinematic feel</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Best Practices &amp; Lỗi thường gặp</h2>
  <ul class="arc-list">
    <li><strong>Subtle is better</strong> — heavy flare looks fake, distracting</li>
    <li><strong>Match light source</strong> — flare must come from where light should be</li>
    <li><strong>Track flare với camera move</strong> — static flare on moving camera obvious fake</li>
    <li><strong>Anamorphic flare cho widescreen aspect</strong> — match aspect ratio</li>
    <li><strong>Don&apos;t use cho every shot</strong> — only when motivated by light source</li>
    <li><strong>Real flare in-camera always best</strong> — only fake when impossible</li>
    <li><strong>Plugin warning: Knoll/Optical Flares overuse</strong> — many cliché preset, customize</li>
  </ul>
</section>
`,
  },

  // 08. Level of Detail (LOD)
  {
    id: "cae67a10-a879-404f-b724-e361b4b03644",
    tieu_de: "Level of Detail (LOD)",
    tieu_de_viet: "Mức chi tiết mô hình (LOD)",
    tom_tat:
      "LOD (Level of Detail) là kỹ thuật thay đổi độ phức tạp của mô hình 3D dựa trên khoảng cách camera — far away dùng low-poly, near dùng high-poly, giảm tải xử lý đồ họa hiệu quả.",
    meta_title: "LOD là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "LOD tối ưu hiệu suất game 3D. Tìm hiểu LOD0, LOD1, LOD2 và workflow tạo LOD chains cho game asset.",
    noi_dung: `
<section class="arc-intro">
  <p>Trong Cyberpunk 2077 open world — bạn thấy character building distant 1km. Render full detail mỗi character? GPU melt. Game engine swap đến low-poly version từ xa — bạn không nhận ra vì pixel size nhỏ. Đây là <strong>LOD</strong> (Level of Detail) — kỹ thuật optimization critical cho mọi game open world, environment lớn.</p>
  <p>LOD là kiến thức quan trọng cho 3D artist, technical artist game. Hiểu workflow tạo LOD chain, automation tool và LOD bias setting giúp game asset performant — đặc biệt cho open world, VR, mobile game khi performance budget hạn chế.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>LOD là gì?</h2>
  <p>Level of Detail (LOD) là kỹ thuật trong 3D rendering — <strong>switch giữa multiple versions</strong> của cùng một model với <strong>polygon count khác nhau</strong> dựa trên distance từ camera. Model gần camera → high-poly (LOD0); model xa → low-poly (LOD1, LOD2, LOD3...). Vì pixel chiếm screen ít khi xa, detail bị mất visually không noticeable.</p>
  <p>Result: game engine không phải render 100,000 polygon cho object xa chỉ chiếm 10 pixel screen. Massive performance gain — modern open world game (GTA, Witcher, Cyberpunk) impossible without LOD. Mobile game đặc biệt heavy reliance.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">LOD vs Imposter vs Billboard</span>
    <p><strong>LOD</strong>: full 3D mesh với poly reduction. <strong>Imposter</strong>: 2D image captured từ multiple angle, swap based on viewing angle. Cheaper than LOD3. <strong>Billboard</strong>: 2D image always faces camera. Cheapest, dùng cho grass, foliage distant. Pipeline tốt mix cả ba.</p>
  </div>

  <ul class="arc-list">
    <li><strong>LOD0</strong> — highest detail, close-up view</li>
    <li><strong>LOD1, LOD2, LOD3</strong> — progressively lower detail</li>
    <li><strong>LOD Bias</strong> — distance threshold switch LOD</li>
    <li><strong>Hysteresis</strong> — prevent oscillation between LOD</li>
    <li><strong>Imposter</strong> — 2D billboard từ rendered angles</li>
    <li><strong>Auto LOD</strong> — engine tự generate (Unreal Nanite, Unity AutoLOD)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"LOD level of detail 3D mesh game optimization polygon"</span>
    </div>
    <p class="arc-image-caption">LOD chain — multiple model resolution swap by distance</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Workflow Tạo LOD</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. LOD0 — Hero Detail</summary>
      <div class="arc-card-body">
        <p>Original high-detail mesh — 10K-100K polygon character, 5K-50K props. Detail visible khi close-up gameplay.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. LOD1 — 50-70% Poly</summary>
      <div class="arc-card-body">
        <p>Reduce 30-50% polygon. Manual cleanup hoặc auto retopo. Visible at medium distance — still recognizable.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. LOD2 — 25-35% Poly</summary>
      <div class="arc-card-body">
        <p>Aggressive reduction. Silhouette preserved, detail simplified. Distant view — silhouette matters most.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. LOD3 — 10-15% Poly</summary>
      <div class="arc-card-body">
        <p>Extreme low-poly. Very distant. Often last LOD before imposter/billboard. Texture bake critical to preserve appearance.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Imposter / Billboard</summary>
      <div class="arc-card-body">
        <p>2D image at maximum distance. Cheapest render. Background tree, distant building.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Set LOD Distances</summary>
      <div class="arc-card-body">
        <p>Engine config: LOD0 → 0-20m, LOD1 → 20-50m, LOD2 → 50-150m. Adjust based on game requirements, view density.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Tools tạo LOD</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Manual</h3>
    <ul class="arc-list">
      <li>Maya, 3ds Max, Blender — manual retopo per LOD</li>
      <li>ZBrush ZRemesher cho auto LOD generation</li>
      <li>Best quality, time-consuming</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Auto-LOD Software</h3>
    <ul class="arc-list">
      <li>Simplygon — chuẩn industry cho auto LOD generation</li>
      <li>InstaLOD — alternative</li>
      <li>Unity AutoLOD — built-in</li>
      <li>Unreal Engine 5 Nanite — virtualized geometry, replaces LOD largely</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Engine-side Tools</h3>
    <ul class="arc-list">
      <li>Unreal Engine LOD settings per asset</li>
      <li>Unity LOD Group component</li>
      <li>Set distance threshold, hysteresis</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Unreal Nanite (Future)</h3>
    <ul class="arc-list">
      <li>UE5 feature — automatic streaming detail</li>
      <li>No need manual LOD chain cho geometry</li>
      <li>Game-changer cho open world</li>
      <li>Still có limitations (cloth, foliage)</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Best Practices</h2>
  <ul class="arc-list">
    <li><strong>Preserve silhouette</strong> — most important for distant view</li>
    <li><strong>Texture bake</strong> — high-poly detail bake vào normal map, apply LOD1+ for fake detail</li>
    <li><strong>Avoid sudden LOD pop</strong> — set hysteresis prevent oscillation</li>
    <li><strong>Test trong game context</strong> — LOD look OK in viewport có thể bad in-game</li>
    <li><strong>LOD distance based on screen size</strong> — small object close = larger pixel coverage than large object far</li>
    <li><strong>Mobile aggressive LOD</strong> — performance critical, LOD swap earlier</li>
  </ul>
</section>
`,
  },

  // 09. Light Leaks
  {
    id: "28870384-2720-4e62-8106-7e3c9ee210ce",
    tieu_de: "Light Leaks",
    tieu_de_viet: "Ánh sáng rò rỉ (Light Leaks)",
    tom_tat:
      "Light Leaks là hiệu ứng ánh sáng rò rỉ vào film/sensor tạo vệt sáng màu ấm — trong hậu kỳ được dùng như overlay để tạo cảm giác vintage, analog, ấm áp cho footage.",
    meta_title:
      "Light Leaks là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Light Leaks tạo cảm giác vintage cho video. Tìm hiểu cách add light leak overlay, blend mode và best practice trong post.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem music video indie — ánh vàng orange spread across frame, dreamy feel, retro vibe. Hoặc wedding video — golden leak adds warmth. Đây là <strong>Light Leaks</strong> — &quot;defect&quot; của analog film trở thành effect aesthetic được dùng heavily trong modern digital video. Đặc trưng của Wes Anderson, indie filmmaker, wedding videographer.</p>
  <p>Light Leaks là kỹ thuật quick win cho video editor. Hiểu cách add light leak overlay tinh tế giúp footage có cảm giác cinematic, vintage, ấm áp — boost production value đáng kể chỉ với một few clicks.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Light Leaks là gì?</h2>
  <p>Light Leaks là hiện tượng <strong>ánh sáng không mong muốn xâm nhập vào film camera</strong> qua gap trong camera body, hỏng seal, hoặc film canister hở. Result: vệt sáng warm (đỏ, cam, vàng) trên frame, often soft edge, organic shape. Originally là &quot;defect&quot; — photographer cố tránh.</p>
  <p>Modern era: light leaks trở thành intentional aesthetic. Lomography movement (camera analog cheap, &quot;flaws as feature&quot;) phổ biến hóa light leak look 2000s. Instagram filter follow trend. Modern video editor add light leak overlay digitally — recreate analog feel cho digital footage.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Real Light Leak vs Faked</span>
    <p><strong>Real light leak</strong>: captured in analog film camera với deliberate light expose. Unique, unpredictable. <strong>Faked light leak</strong>: post-production overlay, stock footage. Repeatable, controllable. Most modern usage là faked. Real ones có authenticity nhưng require analog camera workflow.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Warm Tones</strong> — yellow, orange, red typical</li>
    <li><strong>Soft Edge</strong> — gradient không sharp</li>
    <li><strong>Organic Shape</strong> — random, not perfect geometry</li>
    <li><strong>Screen Blend Mode</strong> — phổ biến cho overlay</li>
    <li><strong>Source Footage</strong> — black BG với colored leak</li>
    <li><strong>Animated</strong> — leak moves/pulses subtly</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"light leaks overlay video vintage warm orange film"</span>
    </div>
    <p class="arc-image-caption">Light Leaks — warm orange leak overlay tạo vintage, dreamy feel</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Workflow Add Light Leaks</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Download Light Leak Pack</summary>
      <div class="arc-card-body">
        <p>Stock pack: RocketStock, Triune Digital, Motion Array. Free options: YouTube creator pack. Quality 4K, prores codec ideal. Multiple variations (subtle, intense, color).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Import into NLE</summary>
      <div class="arc-card-body">
        <p>Drag leak footage vào timeline ABOVE main footage. Position layer phía trên video.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Set Blend Mode = Screen</summary>
      <div class="arc-card-body">
        <p>Most leak footage có black BG. Screen blend mode = black transparent, leak visible. Other blend mode: Add, Lighten possibilities. Test which look best.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Adjust Opacity</summary>
      <div class="arc-card-body">
        <p>50-80% typical for subtle. Lower opacity (30-50%) cho less obvious. 100% rarely.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Trim &amp; Time</summary>
      <div class="arc-card-body">
        <p>Trim leak to match scene length. Time the brightest part of leak với emotional moment trong scene.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Color Match</summary>
      <div class="arc-card-body">
        <p>If leak too saturated, reduce saturation. Match warmth level to overall grade. Hue shift if needed.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Ứng dụng Light Leaks</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Wedding Video</h3>
    <ul class="arc-list">
      <li>Romantic, warm feeling</li>
      <li>Golden hour moment enhanced</li>
      <li>Industry standard wedding videographer</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Music Video Indie</h3>
    <ul class="arc-list">
      <li>Dreamy, nostalgic vibe</li>
      <li>Pair với film grain cho analog feel</li>
      <li>Hipster aesthetic 2010s-2020s</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Vlog &amp; Travel</h3>
    <ul class="arc-list">
      <li>Memory feel — &quot;like film&quot;</li>
      <li>YouTube travel vlog phổ biến</li>
      <li>Add cho B-roll, transition</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Commercial</h3>
    <ul class="arc-list">
      <li>Lifestyle brand — Levi&apos;s, fashion</li>
      <li>Coffee, restaurant — warm comfort</li>
      <li>Anti-corporate, &quot;authentic&quot; vibe</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Film &amp; Short Films</h3>
    <ul class="arc-list">
      <li>Coming-of-age genre</li>
      <li>Wes Anderson aesthetic</li>
      <li>Period piece — &quot;feels like the 70s&quot;</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Lỗi thường gặp</h2>
  <ul class="arc-list">
    <li><strong>Don&apos;t overuse</strong> — 80% scene with leak = annoying. Save for key moments</li>
    <li><strong>Match light direction</strong> — leak from right side, scene lit from right</li>
    <li><strong>Avoid cliché preset</strong> — same VashiVisuals pack used everywhere, find unique sources</li>
    <li><strong>Subtle is better</strong> — viewer should feel mood, not notice leak</li>
    <li><strong>Pair với film grain</strong> — leak alone often looks fake; with grain authentic</li>
    <li><strong>Cool tones available</strong> — blue/teal leaks for sci-fi, horror — break from warm cliché</li>
  </ul>
</section>
`,
  },

  // 10. Light Setup
  {
    id: "0d26add5-ef13-48ae-b259-9af978677ad0",
    tieu_de: "Light Setup (3D)",
    tieu_de_viet: "Bố trí ánh sáng 3D",
    tom_tat:
      "Light Setup là quá trình sắp xếp và điều chỉnh các nguồn sáng trong cảnh 3D — tạo mood, dimension, focus cho subject. Three-point lighting là setup phổ biến nhất.",
    meta_title: "Light Setup 3D là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Light Setup trong 3D định hình mood, dimension. Tìm hiểu three-point lighting, HDRI, area light và best practice lighting 3D.",
    noi_dung: `
<section class="arc-intro">
  <p>Cùng một character model trong Blender — flat lighting default look amateur. Sau khi setup key light + fill + rim correctly, character look professional, có dimension, có mood. Lighting không phải afterthought — nó là 50% của final image quality. Master lighting = master 3D.</p>
  <p>Light Setup là kỹ năng cốt lõi cho mọi 3D artist — lighting TD, environment artist, product viz. Hiểu nguyên tắc lighting, các loại light, và setup pattern phổ biến giúp tạo render quality professional — phân biệt amateur và pro work rõ rệt nhất qua lighting.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Light Setup là gì?</h2>
  <p>Light Setup là quá trình sắp xếp và điều chỉnh các <strong>nguồn sáng (light)</strong> trong scene 3D — quyết định mood, dimension, focal point. Bao gồm: chọn loại light (point, spot, area, directional, environment), position, intensity, color, shadow softness. Goal: định hình audience emotional response và highlight subject của scene.</p>
  <p>Concept transfer từ traditional photography và film lighting — three-point lighting (key, fill, rim) là pattern cơ bản, áp dụng cho cả real-world và CGI. 3D lighting có thêm flexibility — physically impossible setup trong real world possible in 3D (rim light cùng key light direction).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Lighting Quality = Render Quality</span>
    <p>Same model với good vs bad lighting: difference between &quot;CGI&quot; vs &quot;photograph&quot;. Detail lighting carry through entire frame — material, atmosphere, depth. Junior 3D artist often skip lighting, output looks flat. Pro spend significant time on lighting iteration.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Key Light</strong> — main light source, brightest</li>
    <li><strong>Fill Light</strong> — softer light reduce shadow contrast</li>
    <li><strong>Rim/Back Light</strong> — separate subject từ background</li>
    <li><strong>Ambient / Environment</strong> — overall scene light</li>
    <li><strong>HDRI</strong> — image-based lighting cho realistic</li>
    <li><strong>Area Light</strong> — soft light với size</li>
    <li><strong>Point Light</strong> — omnidirectional</li>
    <li><strong>Spot Light</strong> — cone of light</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"3D light setup three point lighting key fill rim"</span>
    </div>
    <p class="arc-image-caption">Three-point lighting — key, fill, rim — setup chuẩn cho subject</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Light trong 3D</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Point Light</summary>
      <div class="arc-card-body">
        <p>Emit ánh sáng đều mọi direction từ một point. Light bulb, fire. Hard shadow point source. Limit: small light don&apos;t have size = sharp shadow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Spot Light</summary>
      <div class="arc-card-body">
        <p>Cone of light from direction. Spotlight, flashlight, theatrical. Inner/outer cone angle. Common cho focused light effect.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Area Light</summary>
      <div class="arc-card-body">
        <p>Light với size (rectangle, disk, sphere). Soft shadow natural. Studio softbox, window light. Most realistic, recommended cho most use case.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Directional Light (Distant/Sun)</summary>
      <div class="arc-card-body">
        <p>Parallel rays, infinite distance. Sun simulation. Single direction, không có position-based intensity. Outdoor scene chuẩn.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Environment / HDRI Light</summary>
      <div class="arc-card-body">
        <p>360° spherical image used as light source. Realistic ambient — sky, clouds, environment provide light color và direction. Polyhaven, HDRI Haven free libraries.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mesh Light / Emissive</summary>
      <div class="arc-card-body">
        <p>Any geometry emit light. TV screen, neon sign, complex luminaire. Use carefully — expensive compute.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Volumetric Light</summary>
      <div class="arc-card-body">
        <p>Light interact với fog/atmosphere — visible light beam. God rays, atmospheric scattering. Render expensive nhưng dramatic.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Three-Point Lighting</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Key Light (Primary)</h3>
    <ul class="arc-list">
      <li>Main light, brightest source</li>
      <li>Position 45° từ subject front, slight above eye level</li>
      <li>Define overall mood — sunlight outdoor, lamp indoor</li>
      <li>Hard or soft based on character type</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Fill Light (Secondary)</h3>
    <ul class="arc-list">
      <li>Opposite side của key, lower intensity (25-50% of key)</li>
      <li>Reduce shadow contrast — fill in dark area</li>
      <li>Softer than key (area light)</li>
      <li>Cooler color often (contrast với warm key)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Rim/Back Light</h3>
    <ul class="arc-list">
      <li>Behind subject, opposite camera</li>
      <li>Create edge highlight — separate subject từ BG</li>
      <li>High position, narrow cone</li>
      <li>Strong intensity cho dramatic effect</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Variations</h3>
    <ul class="arc-list">
      <li><strong>High Key</strong>: bright, low contrast — comedy, fashion</li>
      <li><strong>Low Key</strong>: dark, high contrast — drama, horror</li>
      <li><strong>Two-Point</strong>: key + rim only — moody, minimal</li>
      <li><strong>Four+ Point</strong>: add hair light, kicker, BG light</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Light Setup</h2>
  <ul class="arc-list">
    <li><strong>Start với HDRI</strong> cho overall ambient, add specific light layer on top</li>
    <li><strong>Color contrast</strong> — warm key + cool fill = visual interest</li>
    <li><strong>Area light vì soft shadow</strong> — more realistic than point light</li>
    <li><strong>Light direction tell story</strong> — top light = dramatic, bottom light = sinister, side = portrait</li>
    <li><strong>Test render frequently</strong> — lighting in viewport ≠ final render</li>
    <li><strong>Reference real photography</strong> — study how photographers light, replicate trong 3D</li>
    <li><strong>Don&apos;t over-light</strong> — single strong key + subtle fill often better than 10 lights</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 2 · Batch 2 — chạy ${items.length} bài keyword (I → P) ──\n`,
);

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
  `SELECT COUNT(*) AS con_lai_dot2
FROM article_bai_viet
WHERE loai_bai_viet = 'keyword'
  AND (noi_dung IS NULL OR noi_dung = '')
  AND tieu_de >= 'I' AND tieu_de < 'Q'`,
  "read",
);
const conLai = remain.rows?.[0]?.con_lai_dot2;

console.log(`\nCòn lại đợt 2: ${conLai} bài.`);
