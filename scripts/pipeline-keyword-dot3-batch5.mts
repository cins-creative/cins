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
  // 01. Speed Graph
  {
    id: "c85653df-95e6-4af9-8431-308c766878f0",
    tieu_de: "Speed Graph",
    tieu_de_viet: "Speed Graph trong Animation",
    tom_tat:
      "Speed Graph là đồ thị hiển thị tốc độ thay đổi của giá trị theo thời gian trong animation — điều chỉnh giúp tạo ease in/out tự nhiên và kiểm soát cảm giác chuyển động.",
    meta_title:
      "Speed Graph là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Speed Graph trong AE, Maya animation. Tìm hiểu ease in/out, motion curve, bezier control và workflow polish animation.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn animator set 2 keyframe — start position, end position. Default interpolation: linear motion — robotic, unnatural. Open <strong>Speed Graph</strong> — adjust curve, ease in/out, object accelerate then decelerate. Suddenly motion feels alive, like real-world physics. Speed Graph = tool master animator use control quality motion. Foundation skill differentiate amateur vs pro.</p>
  <p>Speed Graph là kỹ năng essential cho mọi animator — 3D, motion graphics, video editor. Hiểu graph editor, bezier handle, ease type giúp craft motion that feels natural. Critical cho polish phase animation. Distinguish stiff robotic motion vs lifelike.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Speed Graph là gì?</h2>
  <p>Speed Graph (còn gọi <strong>Graph Editor, Curve Editor</strong>) là <strong>visualization tool</strong> in animation software showing how value changes over time. X-axis: time. Y-axis: value (position, rotation, opacity). Curve shape between keyframe defines interpolation. <strong>Linear curve</strong>: constant speed (robotic). <strong>Bezier curve</strong>: variable speed (natural ease in/out).</p>
  <p>Two views typical: <strong>Value Graph</strong> shows value over time (vertical = position). <strong>Speed Graph</strong> shows velocity (rate of change). Both editable. Master animator manipulate Bezier handle adjust ease character. Smooth start ease in, quick decel ease out — slow in/out classic principle. Foundation 12 principles of animation.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Curve Types</span>
    <p><strong>Linear</strong>: constant velocity, mechanical. <strong>Bezier (Ease)</strong>: smooth accel/decel, natural. <strong>Hold / Step</strong>: no interpolation, stepped. <strong>Auto Bezier</strong>: software auto-smooth. <strong>Custom</strong>: animator hand-craft. Choose based on intent.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Linear</strong> — constant speed</li>
    <li><strong>Ease In</strong> — slow start</li>
    <li><strong>Ease Out</strong> — slow end</li>
    <li><strong>Ease In/Out</strong> — both</li>
    <li><strong>Bezier Handle</strong> — control curve</li>
    <li><strong>Spline</strong> — smooth curve</li>
    <li><strong>Stepped</strong> — no interpolation</li>
    <li><strong>Value vs Speed Graph</strong> — view mode</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"speed graph curve editor animation bezier ease in out"</span>
    </div>
    <p class="arc-image-caption">Speed Graph — control motion curve, natural ease</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Ease Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Linear</summary>
      <div class="arc-card-body">
        <p>Constant speed. Y = mx + b straight line. Mechanical feel. Use cho elevator, machine motion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ease In (Slow Start)</summary>
      <div class="arc-card-body">
        <p>Slow start, fast end. Object accelerate. Curve flat → steep. Drop motion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ease Out (Slow End)</summary>
      <div class="arc-card-body">
        <p>Fast start, slow end. Object decelerate. Steep → flat curve. Settle into position.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ease In/Out</summary>
      <div class="arc-card-body">
        <p>Slow start, fast middle, slow end. Most natural cho organic motion. S-curve shape. Animation standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bounce</summary>
      <div class="arc-card-body">
        <p>Multiple ease segments — primary motion + small bounces. Physical realism. Ball drop.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Elastic / Spring</summary>
      <div class="arc-card-body">
        <p>Overshoot, oscillate, settle. Spring physical behavior. UI element entrance.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cubic / Quadratic / Sine</summary>
      <div class="arc-card-body">
        <p>Math curve types. Different acceleration profile. Common easing function CSS, motion design.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hold / Stepped</summary>
      <div class="arc-card-body">
        <p>No interpolation, jump value at keyframe. Use blocking phase animation. Or hard cuts.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Speed Graph</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Block Out với Linear</h3>
    <ul class="arc-list">
      <li>Set timing với linear interpolation</li>
      <li>Focus on key pose first</li>
      <li>Stepped for animation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Switch to Spline</h3>
    <ul class="arc-list">
      <li>After approval blocking</li>
      <li>Apply bezier interpolation</li>
      <li>Auto ease in/out</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Open Graph Editor</h3>
    <ul class="arc-list">
      <li>Maya Graph Editor</li>
      <li>AE Graph Editor</li>
      <li>Blender F-Curve</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Adjust Bezier Handle</h3>
    <ul class="arc-list">
      <li>Drag handle change curve</li>
      <li>Sharp ease tight handle</li>
      <li>Soft ease wide handle</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Match Intent</h3>
    <ul class="arc-list">
      <li>Heavy object: more ease out (settle)</li>
      <li>Energetic: anticipation + overshoot</li>
      <li>Subtle: mild ease</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Watch Repeatedly</h3>
    <ul class="arc-list">
      <li>Playback test</li>
      <li>Does it feel right?</li>
      <li>Iterate curve</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Check Velocity Spike</h3>
    <ul class="arc-list">
      <li>Speed graph view</li>
      <li>Unnatural acceleration</li>
      <li>Smooth curve typically better</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Final Polish</h3>
    <ul class="arc-list">
      <li>Subtle overshoot</li>
      <li>Anticipation add</li>
      <li>Settle resolve</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Speed Graph</h2>
  <ul class="arc-list">
    <li><strong>Disney slow in/slow out principle</strong> — fundamental</li>
    <li><strong>Heavier object = more ease out</strong> — physics intuition</li>
    <li><strong>Lighter = quicker motion</strong> — feather vs bowling ball</li>
    <li><strong>Anticipation</strong> — slight reverse before motion</li>
    <li><strong>Overshoot</strong> — pass target then return</li>
    <li><strong>Don&apos;t over-ease</strong> — make sluggish</li>
    <li><strong>Speed graph reveal</strong> hidden problem</li>
    <li><strong>Easing function CSS</strong>: easing.net reference</li>
    <li><strong>Cascading delay</strong> — element offset timing</li>
    <li><strong>Career Motion Designer</strong> — curve mastery essential</li>
  </ul>
</section>
`,
  },

  // 02. Splash Art
  {
    id: "9d40ae76-432a-4d81-9d12-8e80ad7d97e0",
    tieu_de: "Splash Art",
    tieu_de_viet: "Splash Art (Tranh giới thiệu)",
    tom_tat:
      "Splash Art là hình ảnh chính thức chất lượng cao thể hiện nhân vật, skin — thường dùng trong game để giới thiệu champion mới hoặc làm visual marketing.",
    meta_title:
      "Splash Art là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Splash Art game character. Tìm hiểu workflow concept, composition, painting, polish và career illustrator game industry.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn play League of Legends — every champion có gorgeous portrait artwork displayed loading screen. Hay Genshin Impact — beautiful character reveal art. Đó là <strong>Splash Art</strong> — premium illustration showcase character. Riot Games, miHoYo invest hundreds thousands per piece. High-skill illustration work. Career path lucrative cho talented digital artist.</p>
  <p>Splash Art là kỹ năng essential cho concept artist, illustrator working game industry. Hiểu workflow, composition, character branding, painting technique giúp produce industry-grade illustration. Foundation cho freelance game illustrator career.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Splash Art là gì?</h2>
  <p>Splash Art là <strong>high-quality character illustration</strong> serving as official portrait cho character/skin trong game. Used cho marketing material, loading screen, character select screen, store display. Industry standard high-resolution (4K+), polished painting, professional illustration quality. Different from concept art (rougher, exploration) — splash art is <strong>final marketing-ready artwork</strong>.</p>
  <p>Famous studio: <strong>Riot Games</strong> (League of Legends, hundreds of splash art per champion), <strong>miHoYo</strong> (Genshin Impact stunning character art), <strong>Blizzard</strong> (Overwatch hero), <strong>Marvel Snap</strong>. Specialized illustrator role. Process: concept → composition → render → polish. Multi-week per illustration. $5K-50K per piece for freelance.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Splash Art vs Concept Art</span>
    <p><strong>Concept Art</strong>: design phase, exploration, rough. Multiple variation. <strong>Splash Art</strong>: final illustration, marketing-ready, single hero composition. Sometimes same artist, often specialized illustrators.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Character Pose</strong> — dynamic, story</li>
    <li><strong>Composition</strong> — hero shot</li>
    <li><strong>Color Palette</strong> — match brand</li>
    <li><strong>Polish Level</strong> — production-quality</li>
    <li><strong>Resolution</strong> — 4K+ standard</li>
    <li><strong>Background</strong> — environment context</li>
    <li><strong>Lighting Drama</strong> — cinematic</li>
    <li><strong>Detail Focus</strong> — character primary</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"splash art character illustration league legends genshin"</span>
    </div>
    <p class="arc-image-caption">Splash Art — premium character illustration, marketing-ready</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Splash Art Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Hero Character</summary>
      <div class="arc-card-body">
        <p>Single character centerpiece. Dynamic pose. Heroic moment. Most common. LoL champion classic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Skin Variant</summary>
      <div class="arc-card-body">
        <p>Same character different skin theme. Cosmetic showcase. Same pose alternate art. Common LoL.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Group / Team</summary>
      <div class="arc-card-body">
        <p>Multiple character single artwork. Team composition. Marvel Snap, hero group shot.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cinematic Moment</summary>
      <div class="arc-card-body">
        <p>Story moment captured. Narrative-driven. Genshin character story page.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Marketing Banner</summary>
      <div class="arc-card-body">
        <p>Promotional artwork — new patch, event. Wider aspect. Multiple element composition.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Card Game Art</summary>
      <div class="arc-card-body">
        <p>Hearthstone, MTG card illustration. Smaller crop but high detail. Hundreds per set.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mobile Game Loading</summary>
      <div class="arc-card-body">
        <p>Mobile game frequent splash art per level/character. Often outsourced studio.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Anime / Stylized</summary>
      <div class="arc-card-body">
        <p>Anime-style character art. Genshin, Honkai Star Rail. Specific aesthetic.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Splash Art</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Brief Receive</h3>
    <ul class="arc-list">
      <li>Character description</li>
      <li>Theme, story</li>
      <li>Reference từ studio</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Thumbnail Composition</h3>
    <ul class="arc-list">
      <li>5-10 small thumbnail explore</li>
      <li>Composition strong</li>
      <li>Hero pose selection</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Detailed Sketch</h3>
    <ul class="arc-list">
      <li>Refined drawing selected thumbnail</li>
      <li>Character anatomy</li>
      <li>Costume detail</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Color Block</h3>
    <ul class="arc-list">
      <li>Local color paint</li>
      <li>Lighting establish</li>
      <li>Brand color palette</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Render Form</h3>
    <ul class="arc-list">
      <li>Detailed painting</li>
      <li>Light, shadow, form</li>
      <li>Material rendering</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Background &amp; FX</h3>
    <ul class="arc-list">
      <li>Environment context</li>
      <li>Magic effect, particle</li>
      <li>Don&apos;t overpower character</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Polish &amp; Detail</h3>
    <ul class="arc-list">
      <li>Final detail pass</li>
      <li>Hair strand, eye sparkle</li>
      <li>Texture nuance</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Color Grade &amp; Deliver</h3>
    <ul class="arc-list">
      <li>Final color treatment</li>
      <li>High-res PSD</li>
      <li>Format per studio requirement</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; Tools</h2>
  <ul class="arc-list">
    <li><strong>Photoshop</strong> — industry standard painting</li>
    <li><strong>Procreate</strong> — iPad option, sketch + paint</li>
    <li><strong>Clip Studio Paint</strong> — anime-style focused</li>
    <li><strong>Krita</strong> — free alternative</li>
    <li><strong>ArtStation portfolio</strong> — industry-standard showcase</li>
    <li><strong>Career Concept / Illustrator</strong> — $60K-150K studio salary</li>
    <li><strong>Freelance per piece</strong>: $2K-50K depending</li>
    <li><strong>Famous artist</strong>: Bayard Wu, Wlop, Zeronis (LoL)</li>
    <li><strong>Studio</strong>: Riot Games, miHoYo, Blizzard, NetEase</li>
    <li><strong>Schools</strong>: Gnomon, Concept Design Academy, FZD School</li>
  </ul>
</section>
`,
  },

  // 03. Spot UV
  {
    id: "6f82d17b-0b3c-400b-b991-a50ddb3f29d0",
    tieu_de: "Spot UV",
    tieu_de_viet: "Spot UV (In phủ bóng cục bộ)",
    tom_tat:
      "Spot UV là lớp phủ bóng hoặc mờ được áp dụng lên khu vực cụ thể trên bao bì hoặc namecard — tạo độ tương phản và nổi bật cho thiết kế print.",
    meta_title: "Spot UV là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Spot UV trong print design. Tìm hiểu kỹ thuật, file setup, prepress workflow và best practice cho business card cao cấp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn print designer làm business card high-end. Plain print = boring. Apply <strong>Spot UV</strong> coating chỉ trên logo — shiny gloss layer, contrast với matte surrounding. Tactile feel premium, visual standout. Used Apple packaging, premium brand, luxury business card. Industry-standard print finish cho upscale design.</p>
  <p>Spot UV là kỹ thuật essential cho print designer, prepress artist, packaging designer. Hiểu cách setup file, dieline, spot color separation giúp work với print vendor effectively. Foundation cho premium print job, packaging, brand collateral.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Spot UV là gì?</h2>
  <p>Spot UV (Spot Ultra-Violet) là <strong>print finishing technique</strong> applying clear gloss (or matte) coating to specific area of printed material. UV-cured liquid layer applied through silkscreen process, then UV light cure. Result: <strong>contrast between glossy and matte areas</strong>. Premium tactile, visual effect. Used business card, packaging, book cover, brochure.</p>
  <p>Spot UV files require special prep — separate layer specify which area get UV. Typically saved as <strong>spot color</strong> trong Illustrator/InDesign. Print vendor use this layer create silkscreen mask. Common variant: <strong>Matte Spot UV</strong> (opposite — matte coating on glossy paper), <strong>Raised UV</strong> (3D effect with thicker coating), <strong>Glitter Spot UV</strong> (sparkly).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Spot UV Variants</span>
    <p><strong>Standard Glossy</strong>: clear shiny coating. Most common. <strong>Matte Spot UV</strong>: matte on glossy, opposite contrast. <strong>Raised UV</strong>: thicker, tactile 3D feel. <strong>Glitter UV</strong>: sparkle finish. <strong>Colored UV</strong>: less common, colored coating. Choose based on design intent.</p>
  </div>

  <ul class="arc-list">
    <li><strong>UV Coating</strong> — protective layer</li>
    <li><strong>Spot Coating</strong> — selective area</li>
    <li><strong>Flood Coating</strong> — entire surface</li>
    <li><strong>Silkscreen Process</strong> — apply method</li>
    <li><strong>UV-Cured</strong> — light hardens</li>
    <li><strong>Spot Color</strong> — file separation</li>
    <li><strong>Bleed / Trim</strong> — print specs</li>
    <li><strong>Dieline</strong> — packaging template</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"spot UV print business card packaging gloss finish design"</span>
    </div>
    <p class="arc-image-caption">Spot UV — gloss coating selective area, premium print finish</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Common Applications</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Business Card</summary>
      <div class="arc-card-body">
        <p>Most common application. Logo gloss, matte background. Premium professional impression. ~$0.50-$2.00 per card.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Packaging</summary>
      <div class="arc-card-body">
        <p>Product box, luxury packaging. Brand logo highlighted. Apple iPhone box example. Premium retail.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Book Cover</summary>
      <div class="arc-card-body">
        <p>Title text glossy, image matte. Or vice versa. High-end novel, art book.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Brochure</summary>
      <div class="arc-card-body">
        <p>Cover key visual gloss. Interior matte. Premium catalog feel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Invitation / Wedding</summary>
      <div class="arc-card-body">
        <p>Names, key text gloss. Special occasion. Luxury wedding invite.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Postcard / Direct Mail</summary>
      <div class="arc-card-body">
        <p>Eye-catching coat. Marketing impact. Stand out mail.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Label / Sticker</summary>
      <div class="arc-card-body">
        <p>Wine bottle, premium product label. Tactile, visual.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Foil Stamping Combination</summary>
      <div class="arc-card-body">
        <p>Spot UV + foil stamping = ultra premium. Wedding, luxury brand.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>File Setup Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Design Standard</h3>
    <ul class="arc-list">
      <li>Design business card normal way</li>
      <li>CMYK color</li>
      <li>300dpi resolution</li>
      <li>0.125&quot; bleed</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Identify UV Area</h3>
    <ul class="arc-list">
      <li>Logo, key text</li>
      <li>Important visual</li>
      <li>Where contrast desired</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Create UV Layer</h3>
    <ul class="arc-list">
      <li>New layer trong AI/ID</li>
      <li>Name &quot;Spot UV&quot;</li>
      <li>100% K (black) shape match UV area</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Spot Color Setup</h3>
    <ul class="arc-list">
      <li>New Swatch &quot;Spot UV&quot;</li>
      <li>Color Type: Spot Color</li>
      <li>Color: any (used as mask)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Set Overprint</h3>
    <ul class="arc-list">
      <li>UV layer Overprint Fill enabled</li>
      <li>Prevents knocking out underneath</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Vendor Specs</h3>
    <ul class="arc-list">
      <li>Check vendor requirement</li>
      <li>Spot color name specific</li>
      <li>File format PDF</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Export PDF</h3>
    <ul class="arc-list">
      <li>PDF/X-1a or vendor preset</li>
      <li>Preserve spot color</li>
      <li>Embed font</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Proof Verify</h3>
    <ul class="arc-list">
      <li>Vendor send proof</li>
      <li>Confirm UV area correct</li>
      <li>Approve before print</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Spot UV</h2>
  <ul class="arc-list">
    <li><strong>Contrast critical</strong> — gloss vs matte more visible</li>
    <li><strong>Don&apos;t over-use</strong> — selective area, not everywhere</li>
    <li><strong>Min size</strong> — small text/thin line may not work</li>
    <li><strong>Vendor specific</strong> — check spec each printer</li>
    <li><strong>Cost premium</strong> — adds 20-50% to print cost</li>
    <li><strong>Pair với matte stock</strong> — gloss UV stand out</li>
    <li><strong>Test print first</strong> — proof before run</li>
    <li><strong>Different than full lamination</strong> — selective only</li>
    <li><strong>Foil + Spot UV combo</strong> — luxury combination</li>
    <li><strong>Recyclability concern</strong> — UV coating environmental</li>
  </ul>
</section>
`,
  },

  // 04. Sprite
  {
    id: "9dc495cd-fc5e-4605-b14e-d007d25a931d",
    tieu_de: "Sprite",
    tieu_de_viet: "Sprite trong 2D Game",
    tom_tat:
      "Sprite là hình ảnh 2D hoặc sprite sheet dùng trong game 2D và UI — texture chứa nhiều frame animation của nhân vật hoặc object, game engine đọc từng frame để tạo chuyển động.",
    meta_title: "Sprite là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Sprite trong 2D game development. Tìm hiểu sprite sheet, animation, atlas, Unity/Godot workflow và pixel art technique.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn play Stardew Valley, Hollow Knight, Hades — 2D game with beautiful character animation. Behind scene mỗi character = <strong>Sprite</strong> 2D image. Animation = sprite sheet containing multiple frames. Game engine display frame sequentially → motion. Foundation 2D game graphics. Pokemon, Mario, Sonic — all built sprite. Foundation knowledge cho 2D game dev.</p>
  <p>Sprite là kỹ năng essential cho 2D game artist, indie developer, mobile game dev. Hiểu sprite sheet, animation, atlas optimization, workflow tools giúp build 2D game efficient. Foundation cho indie game career, mobile game pipeline.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Sprite là gì?</h2>
  <p>Sprite là <strong>2D image used in game</strong> — character, enemy, item, UI element. Originally referred to hardware-accelerated 2D graphics in old consoles (NES, SNES) — &quot;sprite&quot; was discrete graphical object overlaid on background. Modern: any 2D image game asset. Stored as image file (PNG, WEBP), loaded by engine, drawn each frame.</p>
  <p>Animation sprite: <strong>Sprite Sheet</strong> — multiple frame single texture. Walk cycle 8 frames laid out grid 8×1 or 4×2. Engine reads frame coordinate sequentially, displays at intervals (12-24 fps typical). Performance optimization — load single image instead of 8. Standard 2D game architecture.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Sprite Types</span>
    <p><strong>Single Sprite</strong>: static image. <strong>Sprite Sheet</strong>: multiple frames in grid. <strong>Sprite Atlas</strong>: many sprite packed efficient texture. <strong>9-Slice Sprite</strong>: resizable UI element. Each use case different.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Sprite Sheet</strong> — frames grid</li>
    <li><strong>Sprite Atlas</strong> — packed optimization</li>
    <li><strong>Pixel Art Sprite</strong> — retro style</li>
    <li><strong>Tile / Tileset</strong> — environment</li>
    <li><strong>9-Slice</strong> — UI resizable</li>
    <li><strong>Sprite Animation</strong> — frame sequence</li>
    <li><strong>Layered Sprite</strong> — body parts</li>
    <li><strong>Sprite Renderer</strong> — engine component</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"sprite sheet 2D game character animation pixel art"</span>
    </div>
    <p class="arc-image-caption">Sprite — 2D game image, sprite sheet animation foundation</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Sprite Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Character Sprite</summary>
      <div class="arc-card-body">
        <p>Player character, NPC. Multiple animation state — idle, walk, run, attack, death. Hundreds frame per character pro game.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tile Sprite</summary>
      <div class="arc-card-body">
        <p>Environment tile — grass, stone, wall. Composed into level. Tiled software industry standard map editor.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UI Sprite</summary>
      <div class="arc-card-body">
        <p>Button, icon, panel. 9-slice often (resizable). HUD element.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Effect Sprite</summary>
      <div class="arc-card-body">
        <p>Explosion, hit effect, particle. Animation frame. VFX in 2D game.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Background Sprite</summary>
      <div class="arc-card-body">
        <p>Parallax background layer. Sky, mountain, foreground tree. Scrolling effect.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Item / Pickup</summary>
      <div class="arc-card-body">
        <p>Collectible item. Animated idle (bounce, spin). Coin, gem, potion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Projectile</summary>
      <div class="arc-card-body">
        <p>Bullet, arrow, magic. Animated motion. Hit effect on impact.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pixel Art vs HD</summary>
      <div class="arc-card-body">
        <p>Pixel art: 16×16, 32×32 retro style (Stardew). HD: high-res hand-drawn (Hollow Knight). Different aesthetic, both popular.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Sprite Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Design Style</h3>
    <ul class="arc-list">
      <li>Pixel art vs HD</li>
      <li>Resolution per sprite</li>
      <li>Color palette</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Create Frame</h3>
    <ul class="arc-list">
      <li>Aseprite pixel art</li>
      <li>Photoshop HD</li>
      <li>Krita free option</li>
      <li>Frame by frame draw</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Animation Cycle</h3>
    <ul class="arc-list">
      <li>Walk: 6-8 frame</li>
      <li>Idle: 2-4 frame</li>
      <li>Attack: 3-6 frame</li>
      <li>Loop seamless</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Export Sprite Sheet</h3>
    <ul class="arc-list">
      <li>Aseprite export sheet</li>
      <li>Grid layout</li>
      <li>JSON metadata frame coordinate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Pack Atlas</h3>
    <ul class="arc-list">
      <li>TexturePacker tool</li>
      <li>Combine many sprite</li>
      <li>Reduce draw call</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Engine Import</h3>
    <ul class="arc-list">
      <li>Unity Sprite Renderer</li>
      <li>Godot AnimatedSprite</li>
      <li>Set animation property</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Animation State Machine</h3>
    <ul class="arc-list">
      <li>Idle → Walk transition</li>
      <li>Walk → Attack</li>
      <li>Animator controller setup</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Optimization</h3>
    <ul class="arc-list">
      <li>Atlas pack efficient</li>
      <li>Texture compression</li>
      <li>Sprite size match resolution</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Engine</h2>
  <ul class="arc-list">
    <li><strong>Aseprite</strong> — pixel art industry standard ($20)</li>
    <li><strong>Photoshop</strong> — HD sprite, frame animation</li>
    <li><strong>Krita</strong> — free, capable</li>
    <li><strong>Procreate</strong> — iPad option</li>
    <li><strong>Spine / DragonBones</strong> — 2D skeletal animation</li>
    <li><strong>TexturePacker</strong> — atlas creation</li>
    <li><strong>Unity 2D</strong> — comprehensive 2D workflow</li>
    <li><strong>Godot</strong> — free, indie-friendly</li>
    <li><strong>Construct 3</strong> — visual scripting 2D</li>
    <li><strong>Famous</strong>: Stardew Valley, Hollow Knight, Celeste — sprite-based</li>
  </ul>
</section>
`,
  },

  // 05. Squash and Stretch
  {
    id: "f80621c7-9b03-49e3-ad78-e35df6d91001",
    tieu_de: "Squash and Stretch",
    tieu_de_viet: "Nguyên tắc Squash and Stretch",
    tom_tat:
      "Squash and Stretch là một trong 12 nguyên tắc hoạt hình — biến dạng hình dạng vật thể để trông mềm mại, linh hoạt và sống động hơn — foundation animation principle.",
    meta_title:
      "Squash and Stretch là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Squash and Stretch animation principle. Tìm hiểu cách áp dụng cho ball bounce, character, mass và workflow polish animation.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn animator ball bouncing — keep rigid sphere, motion looks robotic, lifeless. Apply <strong>Squash and Stretch</strong> — ball squash flat on impact, stretch elongated mid-air. Suddenly ball feels alive, has weight, mass. Đó là power Squash and Stretch — fundamental animation principle. Disney legacy. Foundation cho character animation, motion graphics polish.</p>
  <p>Squash and Stretch là kỹ năng essential cho mọi animator — 2D, 3D, motion graphics. Hiểu principle, when to apply, how much giúp inject life vào animation. Distinguish lifeless robotic motion vs cartoony alive feel. Foundation Disney 12 principles.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Squash and Stretch là gì?</h2>
  <p>Squash and Stretch là <strong>foundational animation principle</strong> — deforming object during motion để convey weight, mass, flexibility, energy. <strong>Squash</strong>: compress on impact, deceleration. <strong>Stretch</strong>: elongate during fast motion, anticipation. Volume conservation key — object squash wider as it shorter. Disney pioneered principle, codified trong &quot;Illusion of Life&quot; book by Frank Thomas, Ollie Johnston.</p>
  <p>Application: <strong>Ball bounce</strong> classic example. Ball stretches falling fast, squash flat on ground impact, stretch up rebounding. <strong>Character face</strong>: cheek squash on impact, lip stretch on yell. <strong>Cartoon style</strong>: extreme squash/stretch exaggeration. <strong>Realistic</strong>: subtle, almost imperceptible. Different intensity per art style.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Volume Conservation</span>
    <p>Critical principle: <strong>maintain volume</strong> during squash/stretch. Ball squash wide and short — total volume same. Cheek squash horizontally, lengthen vertically same time. Without conservation = unrealistic, balloons inflate/deflate. Disney master this.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Squash</strong> — compress</li>
    <li><strong>Stretch</strong> — elongate</li>
    <li><strong>Volume Conservation</strong> — same total</li>
    <li><strong>Mass Sense</strong> — heavy vs light</li>
    <li><strong>Flexibility</strong> — soft material</li>
    <li><strong>Impact Squash</strong> — landing flat</li>
    <li><strong>Anticipation Stretch</strong> — before move</li>
    <li><strong>Exaggeration</strong> — cartoony</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"squash and stretch animation principle ball bounce Disney"</span>
    </div>
    <p class="arc-image-caption">Squash and Stretch — deform for life, mass, energy</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Applications</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Ball Bounce</summary>
      <div class="arc-card-body">
        <p>Classic teaching exercise. Stretch fall, squash impact, stretch rebound. Foundation exercise cho animator. Master before character.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Character Face</summary>
      <div class="arc-card-body">
        <p>Cheek squash chewing. Lip stretch yelling. Eye stretch widen surprised. Face expression livens with squash/stretch.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Body Pose</summary>
      <div class="arc-card-body">
        <p>Anticipation squat — squash before jump. Landing — squash on impact. Stretch reaching, leaping.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mass Indication</summary>
      <div class="arc-card-body">
        <p>Heavy character: more squash, less stretch. Light character: more stretch, less squash. Differentiate mass.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cartoon Take</summary>
      <div class="arc-card-body">
        <p>Extreme stretch — eyes pop out, jaw drop. Looney Tunes style. Exaggerated for comedy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Realistic Subtle</summary>
      <div class="arc-card-body">
        <p>Pixar realistic: subtle squash on landing, slight stretch on reach. Almost imperceptible but adds life.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Soft Object Motion</summary>
      <div class="arc-card-body">
        <p>Water balloon, jelly. Heavy squash/stretch shows flexibility. Material property convey.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UI Motion Graphics</summary>
      <div class="arc-card-body">
        <p>Subtle squash on button click. Stretch on swipe. Liveliness UI animation.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>How to Apply</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Identify Impact Moment</h3>
    <ul class="arc-list">
      <li>Landing, hit, stop</li>
      <li>Critical squash frame</li>
      <li>Maximum compression</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Identify Fast Motion</h3>
    <ul class="arc-list">
      <li>Mid-jump, fast throw</li>
      <li>Maximum stretch</li>
      <li>Direction of motion</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Volume Conservation</h3>
    <ul class="arc-list">
      <li>Squash wide × short = same volume</li>
      <li>Stretch tall × narrow = same</li>
      <li>Don&apos;t violate physics</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Subtle vs Exaggerated</h3>
    <ul class="arc-list">
      <li>Realistic: 10-15% deformation</li>
      <li>Cartoony: 50%+ extreme</li>
      <li>Match art style</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Direction</h3>
    <ul class="arc-list">
      <li>Squash perpendicular to motion</li>
      <li>Stretch along motion direction</li>
      <li>Physical accuracy</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Quick Recovery</h3>
    <ul class="arc-list">
      <li>Squash brief — 1-2 frame</li>
      <li>Then recover shape</li>
      <li>Quick = energetic</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Apply Anatomy</h3>
    <ul class="arc-list">
      <li>Soft area squash more</li>
      <li>Bone area minimal</li>
      <li>Cheek vs forehead</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Iterate</h3>
    <ul class="arc-list">
      <li>Test motion</li>
      <li>Too much? Reduce</li>
      <li>Too little? Increase</li>
      <li>Find right amount</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Squash and Stretch</h2>
  <ul class="arc-list">
    <li><strong>Disney 12 Principles</strong> — Squash and Stretch #1</li>
    <li><strong>&quot;The Illusion of Life&quot; book</strong> — Thomas, Johnston, essential reading</li>
    <li><strong>Ball bounce exercise</strong> — first thing animator learn</li>
    <li><strong>Volume = mass</strong> — preserve physics</li>
    <li><strong>Don&apos;t over-do</strong> — subtle realistic, extreme stylized</li>
    <li><strong>Match art style</strong> — Pixar subtle, Looney Tunes extreme</li>
    <li><strong>Apply to face</strong> — cheek, lip, eye expressive</li>
    <li><strong>2D vs 3D</strong> — easier 2D (drawn shape), 3D requires deformer/rig</li>
    <li><strong>Anim curve editor</strong> — control timing of stretch</li>
    <li><strong>Career Animator</strong> — Squash and Stretch master required</li>
  </ul>
</section>
`,
  },

  // 06. Stereoscopic 3D
  {
    id: "95540023-9458-4eec-bbe9-0715ee757a83",
    tieu_de: "Stereoscopic 3D",
    tieu_de_viet: "Stereoscopic 3D (Hình ảnh nổi)",
    tom_tat:
      "Stereoscopic 3D là kỹ thuật tạo ảo giác chiều sâu 3D bằng cách hiển thị hai góc nhìn hơi khác nhau cho mỗi mắt — dùng trong cinema 3D, VR, màn hình chuyên dụng.",
    meta_title:
      "Stereoscopic 3D là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Stereoscopic 3D trong cinema, VR. Tìm hiểu IPD, parallax, convergence, workflow shoot stereo và post production.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Avatar 2009 trong cinema 3D — fish swim out of screen, mountain depth dramatic. Hay use Meta Quest VR headset — feel actually in virtual world. Đó là <strong>Stereoscopic 3D</strong> — display two slightly different images per eye, brain combine = depth perception. Foundation cho 3D cinema, VR, AR. Reproduces how human eye see world.</p>
  <p>Stereoscopic 3D là kỹ năng essential cho VR developer, 3D cinema specialist, AR designer. Hiểu IPD, parallax, convergence, workflow shoot và post giúp produce comfortable, effective 3D experience. Critical cho immersive media production.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Stereoscopic 3D là gì?</h2>
  <p>Stereoscopic 3D là <strong>technique creating depth illusion</strong> by presenting <strong>two slightly different images</strong> to viewer&apos;s eyes. Each eye sees angle ~63mm different — average inter-pupillary distance (IPD). Brain process two image, fuse = depth perception. Reproduces natural binocular vision. Technology dates 1830s stereoscope, modern revived Avatar (2009), VR boom 2016+.</p>
  <p>Implementation: <strong>Anaglyph</strong> (red-cyan glasses, simple but low quality), <strong>Polarized</strong> (cinema IMAX), <strong>Active Shutter</strong> (LCD glasses sync với screen), <strong>VR Headset</strong> (two separate display), <strong>Lenticular Display</strong> (glasses-free, niche). VR is current dominant — natural extension, head tracking adds full immersion.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Key Parameters</span>
    <p><strong>IPD (Inter-Pupillary Distance)</strong>: 63mm average, varies person. <strong>Parallax</strong>: difference between eye view. <strong>Convergence</strong>: angle eyes converge at depth. <strong>Disparity</strong>: pixel offset between left/right. <strong>Comfort</strong>: balance these = no eye strain.</p>
  </div>

  <ul class="arc-list">
    <li><strong>IPD</strong> — eye spacing</li>
    <li><strong>Parallax</strong> — depth cue</li>
    <li><strong>Convergence</strong> — focus depth</li>
    <li><strong>Disparity</strong> — pixel offset</li>
    <li><strong>Anaglyph</strong> — red-cyan</li>
    <li><strong>Polarized</strong> — IMAX cinema</li>
    <li><strong>Active Shutter</strong> — LCD sync</li>
    <li><strong>VR Stereo</strong> — separate display</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"stereoscopic 3D VR cinema two eye view depth perception"</span>
    </div>
    <p class="arc-image-caption">Stereoscopic 3D — two image per eye, depth illusion</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Stereoscopic Technologies</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Anaglyph (Red-Cyan)</summary>
      <div class="arc-card-body">
        <p>Cheap red-cyan glasses. Print magazine, free. Quality low — color compromised. Educational, novelty use.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Polarized (Cinema)</summary>
      <div class="arc-card-body">
        <p>IMAX 3D cinema. Two projector, polarized differently. Glasses match polarization. Quality good, full color.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Active Shutter (Home 3D TV)</summary>
      <div class="arc-card-body">
        <p>LCD glasses sync với TV, alternate left/right at 120Hz. Each eye see half frames. Now declining market.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>VR Headset</summary>
      <div class="arc-card-body">
        <p>Two separate display per eye. Highest quality stereo. Meta Quest, Vive, PSVR. Combined với head tracking = immersion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>AR Glasses (HoloLens)</summary>
      <div class="arc-card-body">
        <p>Transparent display overlay digital. Lower stereo intensity. Specialized industrial enterprise.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lenticular (Glasses-Free)</summary>
      <div class="arc-card-body">
        <p>3DS handheld, some monitor. Lenticular lens direct image per eye. Limited viewing angle. Niche.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Holography (Future)</summary>
      <div class="arc-card-body">
        <p>True 3D image, no glasses. Looking Glass Factory experimental. Light field display. Future tech.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Apple Vision Pro</summary>
      <div class="arc-card-body">
        <p>2024 premium spatial computer. High-res per eye stereo. Spatial video, premium experience.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Shooting Stereo</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Native Stereo Rig</h3>
    <ul class="arc-list">
      <li>Two camera fixed parallel</li>
      <li>Inter-axial distance match IPD</li>
      <li>Avatar Cameron pioneer</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Convergence Setup</h3>
    <ul class="arc-list">
      <li>Cameras converge at distance</li>
      <li>Or parallel với post adjustment</li>
      <li>Director artistic decision</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Post Conversion</h3>
    <ul class="arc-list">
      <li>2D → 3D conversion in post</li>
      <li>Synthesize parallax</li>
      <li>Cheaper than native, lower quality</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">CG Rendering</h3>
    <ul class="arc-list">
      <li>Two virtual camera offset</li>
      <li>Render left + right pass</li>
      <li>2x render time</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VR Recording</h3>
    <ul class="arc-list">
      <li>Stereo 360 rig</li>
      <li>Insta360 Pro, Z-Cam</li>
      <li>Equirectangular stereo</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Comfort Considerations</h3>
    <ul class="arc-list">
      <li>Avoid extreme parallax</li>
      <li>Don&apos;t cross-eye viewer</li>
      <li>Long take ease eye</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Stereoscopic</h2>
  <ul class="arc-list">
    <li><strong>Comfort priority</strong> — extreme parallax = eye strain, headache</li>
    <li><strong>VR Standard 2x rendering</strong> — plan computing budget</li>
    <li><strong>Avoid edge violation</strong> — object near edge in 3D problematic</li>
    <li><strong>Focus matter</strong> — viewer eye need converge specific depth</li>
    <li><strong>Cinema 3D declining</strong> — fad 2010-15, niche now</li>
    <li><strong>VR growing</strong> — Meta Quest, Vision Pro</li>
    <li><strong>Apple Vision Pro</strong> — spatial computing future</li>
    <li><strong>Avatar Way of Water</strong> — modern reference stereo film</li>
    <li><strong>Convergence direction</strong>: positive (behind screen), negative (front)</li>
    <li><strong>Career VR Developer</strong> — stereo understanding required</li>
  </ul>
</section>
`,
  },

  // 07. Stop-motion
  {
    id: "c274a7e6-b14a-49d2-8264-b914f6365527",
    tieu_de: "Stop-motion",
    tieu_de_viet: "Stop-motion (Hoạt hình tĩnh vật)",
    tom_tat:
      "Stop-motion là kỹ thuật làm phim hoạt hình bằng cách chụp ảnh các vật thể tĩnh ở từng bước chuyển động nhỏ rồi ghép lại thành một chuỗi liên tục.",
    meta_title:
      "Stop-motion là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Stop-motion animation. Tìm hiểu workflow, claymation, puppet, brick animation và studios như Aardman, Laika.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Wallace &amp; Gromit, Coraline, Isle of Dogs — magical animation feel handcrafted. Behind scene: <strong>Stop-motion</strong> — animator move puppet/clay slightly, take photo. Move slightly more, another photo. 24 photos = 1 second screen. Months crafting single minute. Most labor-intensive animation form. Distinctive look. Foundation cho indie auteur animation.</p>
  <p>Stop-motion là kỹ năng essential cho stop motion animator, indie filmmaker. Hiểu workflow puppet design, rigging, lighting, camera giúp produce stunning stop motion. Niche but respected career path — Laika, Aardman premier studio.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Stop-motion là gì?</h2>
  <p>Stop-motion là <strong>animation technique</strong> photographing physical objects frame-by-frame, slightly moving between each photo. Photos played sequentially = illusion of motion. 24 fps cinema standard — animator pose 24 times per second of film. Extremely labor-intensive — feature film 4-5 years production. Distinctive tactile look impossible to replicate digitally.</p>
  <p>Types: <strong>Claymation</strong> (clay character, Wallace &amp; Gromit), <strong>Puppet</strong> (Coraline, Isle of Dogs, ball-and-socket rig), <strong>Cutout</strong> (paper cut, South Park original), <strong>Pixilation</strong> (real human as puppet, A Town Called Panic), <strong>Brick Animation</strong> (Lego, popular YouTube). Each different aesthetic, technique. Pioneered: Ray Harryhausen creature, Tim Burton Nightmare Before Christmas.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Stop-motion Studios</span>
    <p><strong>Laika</strong>: US, premium stop motion — Coraline, ParaNorman, Kubo, Missing Link. <strong>Aardman</strong>: UK, claymation legends — Wallace &amp; Gromit, Chicken Run, Shaun the Sheep. <strong>Travis Knight</strong>: Laika director, son of Phil Knight Nike. Industry small, specialized.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Frame-by-Frame</strong> — incremental</li>
    <li><strong>Puppet</strong> — rigged figure</li>
    <li><strong>Clay (Plasticine)</strong> — sculptable</li>
    <li><strong>Armature</strong> — internal skeleton</li>
    <li><strong>Replacement Animation</strong> — multiple head</li>
    <li><strong>Onion Skin</strong> — see previous frame</li>
    <li><strong>Dragonframe</strong> — capture software</li>
    <li><strong>24 Frames per Second</strong> — typical</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"stop motion animation puppet clay laika aardman behind scenes"</span>
    </div>
    <p class="arc-image-caption">Stop-motion — handcrafted frame-by-frame, magical tactile</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Types Stop-motion</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Claymation</summary>
      <div class="arc-card-body">
        <p>Plasticine clay character. Sculptable each frame. Aardman Wallace &amp; Gromit, Chicken Run. Distinctive squash/stretch ability.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Puppet Animation</summary>
      <div class="arc-card-body">
        <p>Rigid puppet với ball-and-socket armature. Replaceable parts (head, hand). Coraline, Nightmare Before Christmas, Isle of Dogs.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Replacement Animation</summary>
      <div class="arc-card-body">
        <p>3D-printed head per expression. Laika modern technique. Coraline 200,000+ faces printed. Smooth expression.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cutout</summary>
      <div class="arc-card-body">
        <p>Paper cut figure animate flat. South Park original, Terry Gilliam Monty Python. Simpler workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pixilation</summary>
      <div class="arc-card-body">
        <p>Real human as puppet — pose per frame. Surreal, hybrid feel. A Town Called Panic, Norman McLaren classic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Brick / Lego</summary>
      <div class="arc-card-body">
        <p>Lego figure animate. Lego Movie use CGI imitate stop motion. YouTube subgenre popular.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Object Animation</summary>
      <div class="arc-card-body">
        <p>Everyday object animated. Pencil, fruit, household item. Indie / artistic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Silhouette / Shadow</summary>
      <div class="arc-card-body">
        <p>Paper silhouette backlit. Lotte Reiniger classic. Historic technique.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Stop-motion</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Story / Storyboard</h3>
    <ul class="arc-list">
      <li>Plan shot</li>
      <li>Animatic timing</li>
      <li>Pre-production phase</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Puppet Design</h3>
    <ul class="arc-list">
      <li>Character design</li>
      <li>Armature inside skeleton</li>
      <li>Wardrobe, hair</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Set Construction</h3>
    <ul class="arc-list">
      <li>Miniature set</li>
      <li>Lighting installed</li>
      <li>Camera fixed position</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Capture Software</h3>
    <ul class="arc-list">
      <li>Dragonframe industry standard</li>
      <li>Live capture, onion skin</li>
      <li>Frame-by-frame photo</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Animate Frame-by-Frame</h3>
    <ul class="arc-list">
      <li>Pose puppet</li>
      <li>Take photo</li>
      <li>Pose slightly more</li>
      <li>Take next photo</li>
      <li>Hour per second screen</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Lip Sync</h3>
    <ul class="arc-list">
      <li>Replacement head per phoneme</li>
      <li>Or clay shape change</li>
      <li>Tedious, expressive</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Effects (VFX Hybrid)</h3>
    <ul class="arc-list">
      <li>Rig removal post</li>
      <li>Digital effect added</li>
      <li>Smoke, fire CGI</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Edit &amp; Final</h3>
    <ul class="arc-list">
      <li>Composite shot</li>
      <li>Color grade</li>
      <li>Sound, music add</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Studios &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Laika</strong> — premium Coraline, Kubo, Missing Link</li>
    <li><strong>Aardman</strong> — Wallace &amp; Gromit, Chicken Run</li>
    <li><strong>Dragonframe</strong> — stop motion software standard</li>
    <li><strong>Tim Burton</strong> — Nightmare Before Christmas, Corpse Bride</li>
    <li><strong>Wes Anderson</strong> — Isle of Dogs, Fantastic Mr Fox</li>
    <li><strong>Indie filmmaker</strong> — Phil Tippett, accessible from home</li>
    <li><strong>Career Stop-motion Animator</strong> — $50K-100K studio</li>
    <li><strong>Self-tape Yann Tiersen YouTube</strong> — indie viable platform</li>
    <li><strong>Camera</strong>: DSLR with Dragonframe</li>
    <li><strong>Time investment</strong>: 4-5 second per day animation</li>
  </ul>
</section>
`,
  },

  // 08. Storyboard
  {
    id: "c5f16681-ee8b-43bb-b390-6063e5c72ae1",
    tieu_de: "Storyboard",
    tieu_de_viet: "Storyboard trong làm phim",
    tom_tat:
      "Storyboard là bản phác thảo ý tưởng trình bày chi tiết góc quay, chuyển động nhân vật, bố cục khung hình — giúp đội ngũ hiểu rõ câu chuyện trước khi shoot.",
    meta_title: "Storyboard là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Storyboard trong film, animation. Tìm hiểu workflow, shot composition, camera angle và career storyboard artist.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn đạo diễn film có ý tưởng scene phức tạp — chase sequence, multiple character, fast cut. Without plan = chaos on set. <strong>Storyboard</strong> = visual roadmap mỗi shot trước shoot. Pixar, Marvel, advertising — all use storyboard. Save thousands $$$, prevent reshoot. Foundation pre-production cho film, animation, commercial. Career-defining skill cho storyboard artist.</p>
  <p>Storyboard là kỹ năng essential cho film maker, animator, commercial director. Hiểu workflow, composition, shot type, software giúp visualize before shoot. Critical pre-production skill. Career path cho storyboard artist trong film/animation industry.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Storyboard là gì?</h2>
  <p>Storyboard là <strong>visual representation of sequence shot</strong> — drawings illustrating each frame of film. Series of panels (comic-like), each panel = one camera shot. Shows: <strong>composition</strong> (what in frame), <strong>character action</strong>, <strong>camera angle / movement</strong>, <strong>dialog</strong>, <strong>FX notes</strong>. Pre-production tool, drawn before shoot. Director, DOP, animator reference.</p>
  <p>Used film, TV, animation, commercial, music video, AAA game cinematic. Disney pioneered for animated film 1930s — &quot;Three Little Pigs&quot; first major storyboarded film. Now ubiquitous. Modern: <strong>animatic</strong> = storyboard with timing, voice, music — moving storyboard. Test pacing before expensive production.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Storyboard vs Animatic</span>
    <p><strong>Storyboard</strong>: static drawings, panel grid. Plan shot. <strong>Animatic</strong>: storyboard + timing + scratch audio. Time test sequence. Pacing-validate. Both pre-production. Animatic step after storyboard.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Shot</strong> — single camera setup</li>
    <li><strong>Panel</strong> — storyboard drawing</li>
    <li><strong>Composition</strong> — frame arrangement</li>
    <li><strong>Camera Angle</strong> — perspective</li>
    <li><strong>Camera Movement</strong> — pan, tilt</li>
    <li><strong>Cut Type</strong> — between shot</li>
    <li><strong>Animatic</strong> — timed storyboard</li>
    <li><strong>Shotlist</strong> — text list shot</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"storyboard film animation drawing panel pre-production"</span>
    </div>
    <p class="arc-image-caption">Storyboard — visual plan shot, foundation pre-production</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Storyboard Elements</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Frame Composition</summary>
      <div class="arc-card-body">
        <p>What in frame — character, environment, prop. Use rule of thirds. Foreground, midground, background. Visual storytelling.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Shot Types</summary>
      <div class="arc-card-body">
        <p>Wide shot, medium, close-up, extreme close-up. Storytelling tool — emotional intensity correlate close-up.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Camera Angle</summary>
      <div class="arc-card-body">
        <p>High angle (looking down, vulnerable), low angle (looking up, powerful), Dutch angle (tilted, unease), eye level (neutral).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Camera Movement</summary>
      <div class="arc-card-body">
        <p>Pan, tilt, dolly, track, crane. Arrow indication on panel. Notes describe.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Action Note</summary>
      <div class="arc-card-body">
        <p>Character action description. Movement arrow. Beat / timing note.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Dialog</summary>
      <div class="arc-card-body">
        <p>Text below panel. Character speaking. Voice over indicated.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Transition</summary>
      <div class="arc-card-body">
        <p>Cut, dissolve, fade. Between panel marker. Editorial intent.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>FX / SFX Note</summary>
      <div class="arc-card-body">
        <p>Special effect, sound. Annotation. Pre-plan for VFX team.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Storyboard</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Read Script</h3>
    <ul class="arc-list">
      <li>Understand scene</li>
      <li>Identify shot moment</li>
      <li>Discuss với director vision</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Thumbnail Loose</h3>
    <ul class="arc-list">
      <li>Quick sketch each shot</li>
      <li>Try multiple option</li>
      <li>Composition exploration</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Director Review</h3>
    <ul class="arc-list">
      <li>Show thumbnails</li>
      <li>Feedback per shot</li>
      <li>Iterate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Refined Panel</h3>
    <ul class="arc-list">
      <li>Cleaner drawing</li>
      <li>Detail composition</li>
      <li>Camera angle clear</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Action / Camera Notes</h3>
    <ul class="arc-list">
      <li>Movement arrow</li>
      <li>Camera direction</li>
      <li>Text annotation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Animatic Build (Optional)</h3>
    <ul class="arc-list">
      <li>Time storyboard</li>
      <li>Voice scratch</li>
      <li>Music temp</li>
      <li>Validate pacing</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Final Storyboard Pack</h3>
    <ul class="arc-list">
      <li>Complete sequence</li>
      <li>PDF deliverable</li>
      <li>Production reference</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Use On Set / In Animation</h3>
    <ul class="arc-list">
      <li>DP reference cho shot</li>
      <li>Animator key pose match</li>
      <li>Continuity check</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Storyboard Pro (Toon Boom)</strong> — industry standard animation</li>
    <li><strong>Photoshop</strong> — common drawing tool</li>
    <li><strong>Procreate iPad</strong> — modern accessible</li>
    <li><strong>Boords / Boords Pro</strong> — collaborative cloud</li>
    <li><strong>FrameForge 3D</strong> — 3D pre-vis</li>
    <li><strong>Career Storyboard Artist</strong> — film/animation $50K-150K, top $200K+</li>
    <li><strong>Storyboard Supervisor</strong> — Pixar senior</li>
    <li><strong>Freelance commercial</strong> — $1000-5000 per board</li>
    <li><strong>Skills</strong>: drawing, composition, cinematic eye, fast</li>
    <li><strong>Schools</strong>: CalArts, Sheridan, Gobelins</li>
  </ul>
</section>
`,
  },

  // 09. Storytelling
  {
    id: "d27d1214-d460-4e00-a4a4-a5bbd8f53abf",
    tieu_de: "Storytelling",
    tieu_de_viet: "Storytelling (Nghệ thuật kể chuyện)",
    tom_tat:
      "Storytelling là nghệ thuật và kỹ năng truyền đạt câu chuyện — xây dựng cốt truyện, nhân vật, bối cảnh — foundation cho phim, game, marketing, brand.",
    meta_title:
      "Storytelling là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Storytelling cho film, marketing, brand. Tìm hiểu cấu trúc 3 act, hero journey, character arc và technique cuốn hút.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Pixar film — touched emotional, Apple commercial — feel inspired buy product, brand video — remember company forever. Câu hỏi: differentiator? Đáp án: <strong>Storytelling</strong>. Story engage emotionally, drive memory, motivate action. Foundation human communication 50,000+ year. Modern: film, game, marketing, brand all leverage. Universal skill cho creative.</p>
  <p>Storytelling là kỹ năng essential cho mọi creative — filmmaker, writer, marketer, brand strategist, game designer. Hiểu structure, character development, emotional arc giúp create work resonate audience. Foundation cho impactful creative work. Distinguish forgettable vs unforgettable.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Storytelling là gì?</h2>
  <p>Storytelling là <strong>art of conveying narrative</strong> — through words, images, video, interactive media. Communicate ideas, emotion, information memorable engaging way. Foundation: <strong>character</strong> (audience care about), <strong>conflict</strong> (challenge to overcome), <strong>resolution</strong> (transformation). Universal across cultures, history. Aristotle&apos;s &quot;Poetics&quot; codified 2400 năm trước still relevant.</p>
  <p>Structure most famous: <strong>3-Act Structure</strong> — Setup (establish), Confrontation (conflict), Resolution (outcome). <strong>Hero&apos;s Journey</strong> (Joseph Campbell) — call, crossing threshold, trial, transformation, return. <strong>Save the Cat</strong> (Blake Snyder) — modern Hollywood beat sheet. Each framework guides narrative construction.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Story Elements</span>
    <p><strong>Character</strong>: protagonist, antagonist, supporting. <strong>Setting</strong>: world. <strong>Conflict</strong>: external (vs villain) hoặc internal (self). <strong>Plot</strong>: sequence event. <strong>Theme</strong>: deeper meaning. <strong>Arc</strong>: character transformation. Combine create memorable story.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Character Arc</strong> — transformation</li>
    <li><strong>3-Act Structure</strong> — classic</li>
    <li><strong>Hero&apos;s Journey</strong> — Campbell</li>
    <li><strong>Conflict</strong> — driver</li>
    <li><strong>Stakes</strong> — what matter</li>
    <li><strong>Theme</strong> — deeper meaning</li>
    <li><strong>Show Don&apos;t Tell</strong> — visual</li>
    <li><strong>Pacing</strong> — rhythm</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"storytelling narrative structure character arc film writing"</span>
    </div>
    <p class="arc-image-caption">Storytelling — universal communication, emotional engagement</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Story Frameworks</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>3-Act Structure</summary>
      <div class="arc-card-body">
        <p>Act 1 Setup (25%): establish world, character. Act 2 Confrontation (50%): conflict, challenge. Act 3 Resolution (25%): climax, outcome. Foundation Hollywood film.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hero&apos;s Journey</summary>
      <div class="arc-card-body">
        <p>Joseph Campbell &quot;Hero with a Thousand Faces&quot;. 17 stage — Ordinary World, Call, Refusal, Mentor, Crossing, Test, Approach, Ordeal, Reward, Road Back, Resurrection, Return. Star Wars classic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Save the Cat Beat Sheet</summary>
      <div class="arc-card-body">
        <p>Blake Snyder modern Hollywood. 15 beat over film. Page count specified. Most modern blockbuster follow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pixar Story Spine</summary>
      <div class="arc-card-body">
        <p>&quot;Once upon a time... Every day... One day... Because of that... Until finally...&quot;. Simple yet powerful structure.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Snowflake Method</summary>
      <div class="arc-card-body">
        <p>Randy Ingermanson novelist approach. Start single sentence, expand iteratively. Outline first.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Story Circle (Dan Harmon)</summary>
      <div class="arc-card-body">
        <p>Rick &amp; Morty creator&apos;s 8-step circle: comfort, need, unfamiliar situation, adapt, get, pay price, return, change. Modern accessible.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Kishōtenketsu</summary>
      <div class="arc-card-body">
        <p>Japanese 4-act — Introduction, Development, Twist, Reconciliation. No central conflict required. Anime, slice-of-life.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>StoryBrand (Marketing)</summary>
      <div class="arc-card-body">
        <p>Donald Miller, brand storytelling. Customer = hero, brand = guide. Marketing storytelling.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Storytelling Skills</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Character Development</h3>
    <ul class="arc-list">
      <li>Protagonist relatable goal</li>
      <li>Antagonist credible</li>
      <li>Flaw and growth</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Conflict Creation</h3>
    <ul class="arc-list">
      <li>External vs internal</li>
      <li>Stakes meaningful</li>
      <li>Escalate over time</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Show Don&apos;t Tell</h3>
    <ul class="arc-list">
      <li>Visual storytelling</li>
      <li>Action reveal character</li>
      <li>Avoid expository dialogue</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Pacing</h3>
    <ul class="arc-list">
      <li>Rhythm scene</li>
      <li>Fast / slow</li>
      <li>Tension build</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Dialog</h3>
    <ul class="arc-list">
      <li>Reveal character through speech</li>
      <li>Subtext underneath</li>
      <li>Natural cadence</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Emotional Arc</h3>
    <ul class="arc-list">
      <li>Audience feel journey</li>
      <li>Highs and lows</li>
      <li>Cathartic ending</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Theme</h3>
    <ul class="arc-list">
      <li>Deeper meaning</li>
      <li>Universal truth</li>
      <li>Subtle reveal</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Revision</h3>
    <ul class="arc-list">
      <li>First draft → rewrite</li>
      <li>Feedback workshop</li>
      <li>Refine, refine, refine</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career Applications</h2>
  <ul class="arc-list">
    <li><strong>Screenwriter / Novelist</strong> — story core</li>
    <li><strong>Film Director</strong> — visual storytelling</li>
    <li><strong>Animator</strong> — story through motion</li>
    <li><strong>Game Designer</strong> — interactive narrative</li>
    <li><strong>Marketing / Brand</strong> — brand storytelling</li>
    <li><strong>Content Creator</strong> — YouTube, TikTok narrative</li>
    <li><strong>Journalist</strong> — investigative narrative</li>
    <li><strong>Public Speaker</strong> — TED talk storytelling</li>
    <li><strong>Books</strong>: &quot;Story&quot; Robert McKee, &quot;Save the Cat&quot; Blake Snyder, &quot;Hero with a Thousand Faces&quot;</li>
    <li><strong>Best Storyteller</strong>: Pixar, Studio Ghibli, Christopher Nolan, HBO Game of Thrones</li>
  </ul>
</section>
`,
  },

  // 10. StreamLine
  {
    id: "ff408008-fa0c-47a1-8639-62d45c8dc971",
    tieu_de: "StreamLine (Stabilizer Vẽ)",
    tieu_de_viet: "StreamLine trong vẽ kỹ thuật số",
    tom_tat:
      "StreamLine là chức năng trong phần mềm vẽ kỹ thuật số tự động làm mượt các nét vẽ tay — tạo đường thẳng hoặc đường cong đều hơn — foundation cho digital painting clean line.",
    meta_title:
      "StreamLine là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "StreamLine stabilizer trong digital painting. Tìm hiểu cách dùng Procreate, Photoshop, Krita và best practice clean line.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn digital artist drawing trên iPad — hand shake, line wobbly. Result: amateurish. Solution: enable <strong>StreamLine</strong> / Stabilizer — software auto-smooth your stroke. Wobbly hand input → clean curve output. Pro illustrator depend on this. Foundation skill cho clean line art, comic, manga, illustration. Distinguish polished work vs amateur.</p>
  <p>StreamLine là kỹ thuật essential cho mọi digital artist — illustrator, comic artist, concept artist. Hiểu setting, when use, when avoid giúp control line quality. Foundation skill across Procreate, Photoshop, Krita, Clip Studio Paint, Procreate Dreams.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>StreamLine là gì?</h2>
  <p>StreamLine (còn gọi <strong>Stabilizer, Smoothing, Path Smoothing</strong>) là <strong>software feature</strong> trong digital painting app smooth out brush stroke. Filter input từ stylus — instead of recording exact pen path (including hand jitter), software <strong>average / smooth</strong> stroke producing cleaner line. Result: confident-looking line từ shaky hand. Critical cho clean line art.</p>
  <p>Methods: <strong>Lazy Mouse / Pull String</strong> (stroke trail behind cursor, smoother), <strong>Stabilization Buffer</strong> (delay stroke render, smooth in real-time), <strong>Post-Process Smoothing</strong> (smooth after stroke complete). Different software different name. Adjustable intensity — low cho responsive, high cho ultra-smooth. Foundation feature digital art.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Stabilizer Types</span>
    <p><strong>Lazy / Pull</strong>: cursor &quot;pulls&quot; line behind, like rope. <strong>Buffer</strong>: software averages last N points. <strong>Predictive</strong>: AI predict ideal curve. <strong>Post-Smooth</strong>: smooth after stroke. Each different feel. Try preferences.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Stabilizer</strong> — common name</li>
    <li><strong>Lazy Mouse</strong> — Krita term</li>
    <li><strong>Smoothing</strong> — generic</li>
    <li><strong>Path Smoothing</strong> — Photoshop</li>
    <li><strong>StreamLine</strong> — Procreate Dreams</li>
    <li><strong>Predictive Stroke</strong> — Procreate</li>
    <li><strong>Stabilization Strength</strong> — 0-100</li>
    <li><strong>Buffer</strong> — frame delay</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"streamline stabilizer digital drawing smooth line illustration"</span>
    </div>
    <p class="arc-image-caption">StreamLine — smooth stroke, clean professional line</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Software StreamLine</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Procreate (iPad)</summary>
      <div class="arc-card-body">
        <p>StreamLine slider per brush. 0-100% adjust. Predictive Stroke 2024 update — AI smoothing. iPad pro illustrator standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Photoshop</summary>
      <div class="arc-card-body">
        <p>Smoothing setting per brush 0-100%. Top toolbar. Modern version include path smoothing intelligent.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Krita</summary>
      <div class="arc-card-body">
        <p>Stabilizer settings — Distance, Basic, Smooth Pen mode. Lazy Mouse feature. Free, capable.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Clip Studio Paint</summary>
      <div class="arc-card-body">
        <p>Comic, manga focused. Stabilization 0-100. Brush-specific. Industry standard cho comic art.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Procreate Dreams (Animation)</summary>
      <div class="arc-card-body">
        <p>StreamLine renamed feature. Animation-specific stabilization. iPad animation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Affinity Designer / Photo</summary>
      <div class="arc-card-body">
        <p>Stabilization in pencil tool. Adjustable. One-time purchase alternative Photoshop.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sketchbook</summary>
      <div class="arc-card-body">
        <p>Steady Stroke feature — stabilizer. Free now.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Painter (Corel)</summary>
      <div class="arc-card-body">
        <p>Smoothing per brush. Natural media simulation pro tool.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>When to Use</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Line Art (High Smoothing)</h3>
    <ul class="arc-list">
      <li>Comic, manga ink</li>
      <li>Logo design</li>
      <li>Clean illustration</li>
      <li>StreamLine 60-100%</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Sketching (Low Smoothing)</h3>
    <ul class="arc-list">
      <li>Initial sketch</li>
      <li>Want natural pencil feel</li>
      <li>StreamLine 0-20%</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Painting (Medium)</h3>
    <ul class="arc-list">
      <li>Digital painting</li>
      <li>Color brushwork</li>
      <li>StreamLine 20-40%</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Calligraphy / Hand Lettering</h3>
    <ul class="arc-list">
      <li>Beautiful curve</li>
      <li>High smoothing 70-90%</li>
      <li>Smooth confident line</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation Cleanup</h3>
    <ul class="arc-list">
      <li>Frame-by-frame ink</li>
      <li>Clean line per frame</li>
      <li>Medium smoothing</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Don&apos;t Over-Smooth</h3>
    <ul class="arc-list">
      <li>100% = no responsiveness</li>
      <li>Feels disconnected</li>
      <li>Lag between hand-line</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips StreamLine</h2>
  <ul class="arc-list">
    <li><strong>Procreate StreamLine default</strong> — typically 50% nice balance</li>
    <li><strong>High smoothing for clean line</strong> — 70-90% comic ink</li>
    <li><strong>Low smoothing sketch</strong> — natural pencil feel preserve</li>
    <li><strong>Per brush setting</strong> — different brush, different need</li>
    <li><strong>Pen tablet helps</strong> — Wacom, iPad Pro pressure sensitivity</li>
    <li><strong>Don&apos;t rely 100%</strong> — develop hand control too</li>
    <li><strong>Practice without stabilizer</strong> — improves underlying skill</li>
    <li><strong>Predictive Stroke Procreate</strong> — AI version 2024</li>
    <li><strong>Photoshop Path Smoothing</strong> — modern intelligent smoothing</li>
    <li><strong>Animation</strong>: high smoothing each frame consistent</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 3 · Batch 5 — chạy ${items.length} bài keyword (Q → Z) ──\n`,
);

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
    ) as { do_dai?: string | number } | undefined;
    const doDai =
      typeof row?.do_dai === "string" ? Number(row.do_dai) : row?.do_dai;
    if (typeof doDai === "number" && doDai > 800) {
      console.log(`✓ ${it.tieu_de} — ${doDai} ký tự`);
    } else {
      console.log(`⚠ ${it.tieu_de} — do_dai = ${doDai} (cần > 800)`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`✗ ${it.tieu_de} — ${msg}`);
  }
}

const remain = await runAdminSql(
  `SELECT COUNT(*) AS con_lai_dot3
FROM article_bai_viet
WHERE loai_bai_viet = 'keyword'
  AND (noi_dung IS NULL OR noi_dung = '')
  AND tieu_de >= 'Q'`,
  "read",
);
const conLai = remain.rows?.[0]?.con_lai_dot3;

console.log(`\nCòn lại đợt 3: ${conLai} bài.`);
