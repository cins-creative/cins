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
  // 01. Structural Design
  {
    id: "2a503f4c-208f-4166-a53e-8a3ad4809fa5",
    tieu_de: "Structural Design (Packaging)",
    tieu_de_viet: "Thiết kế kết cấu bao bì",
    tom_tat:
      "Structural Design là quá trình thiết kế hình dạng và cấu trúc của bao bì — đảm bảo tính năng sử dụng, bảo vệ sản phẩm, branding và unboxing experience.",
    meta_title:
      "Structural Design là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Structural Design packaging. Tìm hiểu dieline, prototype, material, ergonomics và workflow cho packaging designer.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn unbox iPhone — package open precisely, foam fit perfect, accessory arranged elegantly. Đó là <strong>Structural Design</strong> — engineering and design của packaging form, beyond chỉ graphic. Brand experience starts unboxing. Apple, Tiffany &amp; Co invest millions structural design. Foundation cho premium product perception. Career cho packaging designer, industrial designer.</p>
  <p>Structural Design là kỹ năng essential cho packaging designer, industrial designer. Hiểu dieline, prototype, material choice, ergonomics giúp create functional beautiful package. Critical cho retail, e-commerce, premium brand. Distinguish ordinary vs memorable unboxing.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Structural Design là gì?</h2>
  <p>Structural Design trong packaging là <strong>3D form engineering of package</strong> — shape, material, opening mechanism, internal compartment. Different from <strong>Graphic Design</strong> (2D printed surface design). Structural focus on physical functionality, protection, manufacturing, sustainability. Combined với graphic design = complete package design.</p>
  <p>Considerations: <strong>Product Protection</strong> (no damage shipping), <strong>Manufacturing Feasibility</strong> (cost, machine), <strong>Material Sustainability</strong> (eco-friendly), <strong>Brand Experience</strong> (unboxing moment), <strong>Ergonomics</strong> (easy to open, hold), <strong>Shipping Efficiency</strong> (palette pack), <strong>Shelf Appeal</strong> (retail visibility). Balance trade-off.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Structural Design Roles</span>
    <p><strong>Packaging Designer</strong>: graphic + structural usually. <strong>Industrial Designer</strong>: more structural focused. <strong>Structural Engineer</strong>: material physics, function. <strong>Sustainability Specialist</strong>: eco material. Multi-discipline combine cho complete package.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Dieline</strong> — flat unfolded shape</li>
    <li><strong>Folding Carton</strong> — common form</li>
    <li><strong>Corrugated Box</strong> — shipping</li>
    <li><strong>Rigid Box</strong> — premium luxury</li>
    <li><strong>Flute</strong> — corrugated layer</li>
    <li><strong>Prototype</strong> — physical test</li>
    <li><strong>Material Sustainable</strong> — eco</li>
    <li><strong>Unboxing Experience</strong> — brand moment</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"structural design packaging dieline prototype unboxing"</span>
    </div>
    <p class="arc-image-caption">Structural Design — 3D engineering của packaging, beyond graphic</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Package Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Folding Carton</summary>
      <div class="arc-card-body">
        <p>Single-piece cardboard fold. Cereal box, makeup box. Most common. Affordable, recyclable, easy print.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Corrugated Box</summary>
      <div class="arc-card-body">
        <p>Cardboard với fluted layer. Shipping box. Sturdy. Multi-wall cho heavy. Amazon staple.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Rigid Box (Luxury)</summary>
      <div class="arc-card-body">
        <p>Premium boxes — Apple, Tiffany. Heavyweight, cloth-wrapped. Lift-off lid common. Expensive but premium feel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pouch / Bag</summary>
      <div class="arc-card-body">
        <p>Flexible — coffee, snack. Stand-up pouch, zipper close. Modern food packaging.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blister Pack</summary>
      <div class="arc-card-body">
        <p>Plastic dome on cardboard. Medication, small item. Visibility + protection.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bottle / Container</summary>
      <div class="arc-card-body">
        <p>Beverage, cosmetic, supplement. Plastic, glass, metal. Specialized design per product.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sleeve / Wrap</summary>
      <div class="arc-card-body">
        <p>Outer wrap around container. Branding layer. Easily remove cho recycling.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Custom Form</summary>
      <div class="arc-card-body">
        <p>Unique shape — perfume bottle, designer luxury. Custom mold expensive but distinctive.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Brief / Requirement</h3>
    <ul class="arc-list">
      <li>Product spec — size, weight</li>
      <li>Target audience</li>
      <li>Budget, material constraint</li>
      <li>Shipping requirement</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Concept Sketch</h3>
    <ul class="arc-list">
      <li>Hand sketch multiple form</li>
      <li>Various opening</li>
      <li>Aesthetic exploration</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Dieline (CAD)</h3>
    <ul class="arc-list">
      <li>Illustrator dieline draft</li>
      <li>Cut, fold, glue line</li>
      <li>Bleed area</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Prototype Physical</h3>
    <ul class="arc-list">
      <li>Print dieline, cut by hand</li>
      <li>Or 3D print</li>
      <li>Test fit product</li>
      <li>Test open/close</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Iterate</h3>
    <ul class="arc-list">
      <li>Revise based prototype</li>
      <li>Multiple round refine</li>
      <li>User test if possible</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Material Selection</h3>
    <ul class="arc-list">
      <li>Paperboard weight</li>
      <li>Recycled vs virgin</li>
      <li>Finish (gloss, matte)</li>
      <li>Sustainable option</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Graphic Apply</h3>
    <ul class="arc-list">
      <li>Graphic designer apply branding</li>
      <li>Print color, text</li>
      <li>Combine structural + graphic</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Production Mfg</h3>
    <ul class="arc-list">
      <li>Vendor production prototype</li>
      <li>Quality check</li>
      <li>Run mass production</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Illustrator</strong> — dieline standard tool</li>
    <li><strong>Esko ArtiosCAD</strong> — packaging-specific software</li>
    <li><strong>SolidWorks / Rhino</strong> — 3D rigid container</li>
    <li><strong>3D printer</strong> — rapid prototyping</li>
    <li><strong>Cricut / cutting plotter</strong> — paper prototype</li>
    <li><strong>FSC / PEFC certified</strong> — sustainable wood</li>
    <li><strong>Recycled material</strong> — eco-conscious</li>
    <li><strong>Career Packaging Designer</strong> — $55K-130K</li>
    <li><strong>Studio</strong>: Pearlfisher, Turner Duckworth, Pentagram</li>
    <li><strong>Sustainability growing</strong> — eco packaging hot field</li>
  </ul>
</section>
`,
  },

  // 02. Stylized
  {
    id: "6ff50e07-6a10-464c-adb1-5c52ace6e869",
    tieu_de: "Stylized Art",
    tieu_de_viet: "Phong cách Stylized",
    tom_tat:
      "Stylized là phong cách thiết kế 2D/3D simplify, exaggerate hoặc biến dạng yếu tố để tạo hiệu ứng thị giác độc đáo — cartoon, anime, painterly đối lập với realistic.",
    meta_title:
      "Stylized là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Stylized art trong animation, game. Tìm hiểu cartoon, anime, painterly, low-poly style và workflow cho artist.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Pixar — character stylized: large head, big eye, simplified body. Genshin Impact — anime-stylized character beautiful. League of Legends — exaggerated proportion warrior. Đó là <strong>Stylized</strong> — intentional departure từ realism cho artistic effect. Define studio identity. Foundation cho animation, game art, illustration. Distinct artistic choice.</p>
  <p>Stylized là kiến thức essential cho concept artist, character designer, animator. Hiểu different style, principles, when to use giúp develop personal art voice. Career path — Pixar, Riot, Studio Ghibli all stylized — distinguish từ realistic VFX work.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Stylized là gì?</h2>
  <p>Stylized là <strong>artistic approach</strong> intentionally simplifying, exaggerating, or distorting visual element to achieve unique aesthetic. Departure from photorealism. Designer make conscious choice — what to simplify, what to emphasize. Foundation cho cartoon, anime, illustration, video game art. Allow artistic personality stand out from realistic crowd.</p>
  <p>Spectrum: <strong>Highly Realistic</strong> (VFX film) → <strong>Semi-Stylized</strong> (Overwatch) → <strong>Heavily Stylized</strong> (Adventure Time) → <strong>Abstract</strong> (modern art). Each studio chose point on spectrum match brand. Pixar middle, Disney 2D más stylized, Studio Ghibli unique balance. League of Legends evolved more stylized over time.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Stylized Categories</span>
    <p><strong>Cartoon</strong>: simplified shape, exaggerated. <strong>Anime / Manga</strong>: Japanese aesthetic. <strong>Painterly</strong>: brushstroke visible (Disenchantment). <strong>Low Poly</strong>: geometric simplicity. <strong>Cel-Shaded</strong>: hard edge shading (Borderlands). <strong>Hand-Drawn</strong>: classic 2D feel. Each different vibe.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Simplification</strong> — reduce detail</li>
    <li><strong>Exaggeration</strong> — amplify feature</li>
    <li><strong>Caricature</strong> — extreme exaggerate</li>
    <li><strong>Cel Shading</strong> — hard edge</li>
    <li><strong>Painterly</strong> — brushstroke</li>
    <li><strong>Low Poly</strong> — geometric</li>
    <li><strong>Color Palette</strong> — limited vibrant</li>
    <li><strong>Silhouette Strong</strong> — readable shape</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"stylized art cartoon anime game character illustration"</span>
    </div>
    <p class="arc-image-caption">Stylized — artistic departure from real, unique aesthetic</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Stylized Styles</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Cartoon (Western)</summary>
      <div class="arc-card-body">
        <p>Simplified, exaggerated. Looney Tunes, Adventure Time, Steven Universe. Big eye, expressive feature. Comedy-friendly.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Anime / Manga</summary>
      <div class="arc-card-body">
        <p>Japanese style — large eye, slim body, vibrant hair. Studio Ghibli, Pokemon, Genshin Impact. Distinct convention.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pixar / 3D CG</summary>
      <div class="arc-card-body">
        <p>3D stylized — Toy Story, Up. Simplified anatomy but render realistic. Mid-stylized signature look.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Painterly</summary>
      <div class="arc-card-body">
        <p>Brushstroke visible. Disenchantment, hand-painted texture game. Spider-Verse use painterly look.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cel-Shaded</summary>
      <div class="arc-card-body">
        <p>Hard-edge shading mimic 2D. Borderlands, Jet Set Radio, Genshin Impact. Toon shader.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Low Poly</summary>
      <div class="arc-card-body">
        <p>Geometric simplicity. Monument Valley, indie game. Faceted look, charming.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pixel Art</summary>
      <div class="arc-card-body">
        <p>Retro pixelated. Stardew Valley, Celeste, Octopath Traveler HD-2D. Nostalgic, indie favorite.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Realistic-Stylized</summary>
      <div class="arc-card-body">
        <p>Subtle stylization on realistic base. Last of Us, Cyberpunk 2077. AAA modern trend.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Design Principles</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Simplification</h3>
    <ul class="arc-list">
      <li>Remove unnecessary detail</li>
      <li>Essential feature emphasize</li>
      <li>Easier read silhouette</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Exaggeration</h3>
    <ul class="arc-list">
      <li>Amplify what important</li>
      <li>Big eye character read</li>
      <li>Strong silhouette</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Shape Language</h3>
    <ul class="arc-list">
      <li>Round = friendly</li>
      <li>Square = stable, strong</li>
      <li>Triangle = dynamic, danger</li>
      <li>Convey personality</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Color Palette</h3>
    <ul class="arc-list">
      <li>Limited often</li>
      <li>Vibrant cho cartoony</li>
      <li>Muted cho painterly</li>
      <li>Brand-specific</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Proportions</h3>
    <ul class="arc-list">
      <li>Head bigger character</li>
      <li>Smaller body</li>
      <li>Chibi extreme</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Line Quality</h3>
    <ul class="arc-list">
      <li>Outline emphasize 2D</li>
      <li>Or no outline painterly</li>
      <li>Style choice</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Consistency</h3>
    <ul class="arc-list">
      <li>All character match style</li>
      <li>Environment match</li>
      <li>Cohesive world</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Emotion First</h3>
    <ul class="arc-list">
      <li>Stylized convey emotion</li>
      <li>Realism convey accuracy</li>
      <li>Different priority</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career Studios</h2>
  <ul class="arc-list">
    <li><strong>Pixar</strong> — 3D stylized, family</li>
    <li><strong>Disney Animation</strong> — 2D historic, 3D modern</li>
    <li><strong>Studio Ghibli</strong> — anime, unique</li>
    <li><strong>Riot Games</strong> — League of Legends stylized</li>
    <li><strong>Blizzard</strong> — Overwatch, World of Warcraft</li>
    <li><strong>Cartoon Network</strong> — TV animation</li>
    <li><strong>Career Stylized Artist</strong> — $50K-150K</li>
    <li><strong>Personal style</strong> = competitive advantage</li>
    <li><strong>School</strong>: CalArts, Sheridan, Gobelins</li>
    <li><strong>Portfolio</strong> ArtStation showcase</li>
  </ul>
</section>
`,
  },

  // 03. Surround Sound
  {
    id: "ce092f2e-5b42-4485-9a7d-1105952789d4",
    tieu_de: "Surround Sound",
    tieu_de_viet: "Surround Sound (Âm thanh vòm)",
    tom_tat:
      "Surround Sound là hệ thống âm thanh sử dụng nhiều loa được bố trí xung quanh người nghe để tạo hiệu ứng không gian và sống động — 5.1, 7.1, Dolby Atmos.",
    meta_title:
      "Surround Sound là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Surround Sound 5.1, 7.1, Atmos. Tìm hiểu speaker arrangement, mix workflow, cinema và home theater setup.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn watch movie cinema — explosion behind you, dialogue front center, helicopter fly over head. Đó là <strong>Surround Sound</strong> — multiple speaker around listener create 3D audio experience. Foundation cho cinematic immersion. From 5.1 (1990s cinema) đến Dolby Atmos (modern), surround sound evolved tremendously. Critical cho film, TV, gaming, VR audio.</p>
  <p>Surround Sound là kiến thức essential cho audio engineer, sound designer, film mixer. Hiểu format (5.1, 7.1, Atmos), speaker arrangement, mixing workflow giúp produce industry-standard mix. Foundation cho theatrical, streaming premium, home theater design.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Surround Sound là gì?</h2>
  <p>Surround Sound là <strong>multi-channel audio system</strong> — multiple speaker placed around listener tạo immersive 3D sound. Naming: <strong>X.Y</strong> format. X = main channel (full-range speaker), Y = LFE (Low-Frequency Effects, subwoofer). <strong>5.1</strong>: 5 speaker + 1 sub. <strong>7.1</strong>: 7 speaker + 1 sub. <strong>Atmos</strong>: object-based với height channel.</p>
  <p>Foundation: <strong>5.1</strong> standard cinema từ 1990s (Star Wars Episode I first 5.1 release widely). Speakers: Front L, Center, Front R, Surround L, Surround R, LFE. <strong>7.1</strong> add Side Surround L, R. <strong>9.1, 11.1</strong> extreme home theater. <strong>Dolby Atmos</strong> radical — object-based, sound positioned in 3D space, height speaker.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Surround Format Hierarchy</span>
    <p><strong>Stereo (2.0)</strong>: 2 channel basic. <strong>5.1</strong>: cinema standard 20 năm. <strong>7.1</strong>: more surround. <strong>Atmos</strong>: object-based, height. Streaming Netflix Atmos support. Modern home theater Atmos becoming standard.</p>
  </div>

  <ul class="arc-list">
    <li><strong>5.1 Surround</strong> — 5 + sub standard</li>
    <li><strong>7.1 Surround</strong> — more surround</li>
    <li><strong>Dolby Atmos</strong> — object-based</li>
    <li><strong>DTS:X</strong> — DTS object-based</li>
    <li><strong>Center Channel</strong> — dialog</li>
    <li><strong>LFE</strong> — sub bass</li>
    <li><strong>Surround Channel</strong> — rear/side</li>
    <li><strong>Bed vs Object</strong> — Atmos terms</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"surround sound 5.1 7.1 dolby atmos speaker arrangement cinema"</span>
    </div>
    <p class="arc-image-caption">Surround Sound — multi-speaker 3D audio immersion</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Format Detail</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>2.0 Stereo</summary>
      <div class="arc-card-body">
        <p>L + R basic. Headphone, smartphone, TV basic. No surround. Foundation 70+ year audio.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2.1 (Stereo + Sub)</summary>
      <div class="arc-card-body">
        <p>2 channel + subwoofer. Basic home theater. Computer speaker often.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5.1 Surround</summary>
      <div class="arc-card-body">
        <p>Cinema standard. Front L/C/R + Surround L/R + LFE. Dolby Digital, DTS. DVD, Blu-ray, streaming standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>7.1 Surround</summary>
      <div class="arc-card-body">
        <p>5.1 + Side Surround L/R. More precise rear sound. Premium home theater. Pixar Toy Story 3 first 7.1.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>9.1, 11.1</summary>
      <div class="arc-card-body">
        <p>Extreme home theater. Front wide channel, height channel. Rare consumer, custom installation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Dolby Atmos</summary>
      <div class="arc-card-body">
        <p>Object-based. Sound positioned in 3D space. Up to 128 audio object. Height channel critical — sound from above. Streaming, modern cinema.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>DTS:X</summary>
      <div class="arc-card-body">
        <p>DTS competitor Atmos. Object-based. Less market share. Cinema, some streaming.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Auro 3D</summary>
      <div class="arc-card-body">
        <p>European competitor. Layer-based not object. Less adopted.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Mixing Surround</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Center Channel — Dialog</h3>
    <ul class="arc-list">
      <li>Voice/dialog primary</li>
      <li>Anchor to screen</li>
      <li>Most cinema audio center</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Front L/R — Music, SFX</h3>
    <ul class="arc-list">
      <li>Stereo music image</li>
      <li>On-screen SFX</li>
      <li>Phantom image strong</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Surround — Ambience, Effect</h3>
    <ul class="arc-list">
      <li>Background ambience</li>
      <li>Behind-camera SFX</li>
      <li>Sense of space</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">LFE — Bass Impact</h3>
    <ul class="arc-list">
      <li>Explosion rumble</li>
      <li>Sub frequency 20-120Hz</li>
      <li>Felt more than heard</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Atmos Height — Above</h3>
    <ul class="arc-list">
      <li>Helicopter, rain</li>
      <li>Atmosphere from above</li>
      <li>Distinct sense of dimension</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Pan Movement</h3>
    <ul class="arc-list">
      <li>Car drive across screen</li>
      <li>Pan smoothly Front L → Front R</li>
      <li>Or surround for off-screen</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Dialog Anchor</h3>
    <ul class="arc-list">
      <li>Even off-screen dialog often center</li>
      <li>Subtle pan if visible direction</li>
      <li>Avoid distract</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Calibration</h3>
    <ul class="arc-list">
      <li>Reference 85dB SPL standard</li>
      <li>Calibrated room</li>
      <li>Match cinema standard</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Setup</h2>
  <ul class="arc-list">
    <li><strong>Pro Tools HDX</strong> — industry standard surround mix</li>
    <li><strong>Nuendo</strong> — alternative Steinberg</li>
    <li><strong>DaVinci Resolve Fairlight</strong> — Atmos support</li>
    <li><strong>Dolby Atmos Renderer</strong> — official Atmos mixing</li>
    <li><strong>5.1 / 7.1 monitor</strong> — Genelec, Neumann pro</li>
    <li><strong>Atmos studio</strong> — 9.1.4 minimum setup</li>
    <li><strong>Cinema certification</strong> — Dolby approve theater</li>
    <li><strong>Home theater install</strong> — $5K-100K+ depending</li>
    <li><strong>Netflix, Apple TV+, Disney+</strong> — Atmos content</li>
    <li><strong>Career Re-Recording Mixer</strong> — $80K-300K Atmos specialty</li>
  </ul>
</section>
`,
  },

  // 04. Sustainable Packaging
  {
    id: "a2bbdeaa-c416-4895-aa55-18e808cd045b",
    tieu_de: "Sustainable Packaging",
    tieu_de_viet: "Bao bì bền vững",
    tom_tat:
      "Sustainable Packaging là bao bì được thiết kế từ vật liệu thân thiện môi trường, có khả năng tái chế hoặc phân hủy sinh học — xu hướng toàn cầu hiện đại.",
    meta_title:
      "Sustainable Packaging là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Sustainable Packaging trends. Tìm hiểu material eco, recyclable, compostable, workflow design và brand premium green.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn shop ở Whole Foods — package compostable, brand emphasize sustainable. EU plastic ban 2030, brand globally racing eco-friendly. <strong>Sustainable Packaging</strong> đã từ niche → mainstream business imperative. Apple commit carbon-neutral packaging. Consumer demand: 73% willing pay more sustainable. Foundation cho modern packaging design career.</p>
  <p>Sustainable Packaging là kỹ năng essential cho packaging designer, brand strategist, sustainability specialist. Hiểu material option, certification, workflow design, business case giúp design eco-conscious package. Critical skill cho modern brand environmental responsibility.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Sustainable Packaging là gì?</h2>
  <p>Sustainable Packaging là <strong>packaging design minimizing environmental impact</strong> through material choice, manufacturing, end-of-life. Principles: <strong>Reduce</strong> (less material), <strong>Reuse</strong> (refillable), <strong>Recycle</strong> (recyclable post-use), <strong>Renewable</strong> (bio-based material), <strong>Compostable</strong> (decompose). Foundation cho circular economy packaging.</p>
  <p>Driver: <strong>Regulation</strong> (EU Plastic Ban 2030, single-use ban many countries), <strong>Consumer Demand</strong> (Gen Z 73% pay more sustainable), <strong>Brand Commitment</strong> (Apple, Unilever, Patagonia carbon-neutral pledge), <strong>Cost</strong> (sometimes cheaper long-term), <strong>Climate Crisis</strong> (urgent). Brand không transition risk irrelevance.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Sustainable Strategies</span>
    <p><strong>Reduce</strong>: less material per pack, lighter weight. <strong>Reuse</strong>: refillable container, returnable. <strong>Recycle</strong>: PCR (post-consumer recycled) content. <strong>Renewable</strong>: bio-based plastic, paper. <strong>Compostable</strong>: PLA, mycelium. Combine multiple = greatest impact.</p>
  </div>

  <ul class="arc-list">
    <li><strong>PCR</strong> — post-consumer recycled</li>
    <li><strong>Compostable</strong> — biodegradable</li>
    <li><strong>FSC Certified</strong> — sustainable wood</li>
    <li><strong>Bio-Based Plastic</strong> — plant material</li>
    <li><strong>Mycelium</strong> — mushroom-based</li>
    <li><strong>Mono-Material</strong> — single material recyclable</li>
    <li><strong>Lightweighting</strong> — less material</li>
    <li><strong>Circular Economy</strong> — closed loop</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"sustainable packaging eco friendly compostable recyclable design"</span>
    </div>
    <p class="arc-image-caption">Sustainable Packaging — eco-friendly, future of packaging</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Material Options</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Recycled Paperboard (FSC)</summary>
      <div class="arc-card-body">
        <p>100% recycled content paperboard. FSC certified sustainably forest. Common cho carton, box. Widely recyclable.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>PCR Plastic</summary>
      <div class="arc-card-body">
        <p>Post-Consumer Recycled plastic. Bottle made from old bottle. Reduce virgin plastic. 25-100% PCR content available.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Compostable PLA</summary>
      <div class="arc-card-body">
        <p>Polylactic Acid from corn starch. Compostable industrial facility. Cups, food container, mailer. Not home compostable.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mycelium</summary>
      <div class="arc-card-body">
        <p>Mushroom root material. Grow into shape. Replace styrofoam. Ecovative pioneer. Dell, IKEA adopt.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bagasse (Sugarcane)</summary>
      <div class="arc-card-body">
        <p>Sugarcane fiber waste. Bowl, plate, container. Compostable. Common food service.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Seaweed Packaging</summary>
      <div class="arc-card-body">
        <p>Notpla company. Edible water sachet. Biodegradable. Emerging tech.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Glass Reusable</summary>
      <div class="arc-card-body">
        <p>Refillable glass jar. Cosmetic, food. Premium feel. Heavy ship cost.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Metal (Aluminum, Tin)</summary>
      <div class="arc-card-body">
        <p>Highly recyclable. Beverage can, premium luxury. Reusable container option.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Sustainable Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Sustainability Goal Set</h3>
    <ul class="arc-list">
      <li>Brand commit % recycled</li>
      <li>Carbon target</li>
      <li>End-of-life plan</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Material Audit Current</h3>
    <ul class="arc-list">
      <li>What current package uses</li>
      <li>Identify replacement opportunity</li>
      <li>Quick win</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Material Sourcing</h3>
    <ul class="arc-list">
      <li>Vendor sustainable material</li>
      <li>Cost comparison</li>
      <li>Availability check</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Design Lightweight</h3>
    <ul class="arc-list">
      <li>Reduce material amount</li>
      <li>Stronger thinner</li>
      <li>Less = greener</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Mono-Material</h3>
    <ul class="arc-list">
      <li>Single material = easy recycle</li>
      <li>Avoid mixed layer</li>
      <li>Consumer recycle correctly</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. End-of-Life Plan</h3>
    <ul class="arc-list">
      <li>Recyclable curbside?</li>
      <li>Compostable industrial?</li>
      <li>Communicate to consumer</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Certifications</h3>
    <ul class="arc-list">
      <li>FSC paperboard</li>
      <li>BPI compostable</li>
      <li>How2Recycle label</li>
      <li>Communicate eco credential</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Consumer Education</h3>
    <ul class="arc-list">
      <li>Communicate via package</li>
      <li>&quot;Recyclable&quot; clearly</li>
      <li>Compost where</li>
      <li>Brand story tell</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Brand</h2>
  <ul class="arc-list">
    <li><strong>How2Recycle label</strong> — standardize consumer guide</li>
    <li><strong>FSC certified</strong> — sustainable forest wood</li>
    <li><strong>EU regulations 2030</strong> — plastic ban driving change</li>
    <li><strong>Avoid greenwashing</strong> — substantive claim only</li>
    <li><strong>Mycelium replace styrofoam</strong> — innovative</li>
    <li><strong>PCR content target</strong> — 30-50% achievable</li>
    <li><strong>Compostable ≠ recyclable</strong> — different stream</li>
    <li><strong>Brand pioneer</strong>: Patagonia, Allbirds, Lush</li>
    <li><strong>Career Sustainable Packaging Specialist</strong> — growing field $70K-150K</li>
    <li><strong>Cost premium</strong> — sometimes pricier but margin compress</li>
  </ul>
</section>
`,
  },

  // 05. SVG
  {
    id: "a5ff07e3-762e-496b-bfdd-a3adb69251f8",
    tieu_de: "SVG",
    tieu_de_viet: "SVG (Scalable Vector Graphics)",
    tom_tat:
      "SVG là định dạng đồ họa vector dạng XML cho web — scale vô hạn không vỡ nét, nhẹ hơn raster, animate được bằng CSS hoặc JavaScript.",
    meta_title: "SVG là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "SVG vector graphics. Tìm hiểu cách tạo, optimize, animate trong CSS, JS và workflow Illustrator, Figma export.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn web designer cần logo công ty hiển thị crisp trên mọi device — phone, tablet, 4K monitor. JPG/PNG = pixelated at large size. Solution: <strong>SVG</strong> — vector format scale infinitely. Plus animate với CSS, customize color via code, file size nhỏ. Modern web standard. Foundation kiến thức cho web designer, frontend developer.</p>
  <p>SVG là kỹ năng essential cho web designer, frontend developer, UI/UX designer. Hiểu format, workflow Illustrator/Figma export, optimization, animation giúp produce performant beautiful web. Foundation cho modern web graphics, icon system, brand asset.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>SVG là gì?</h2>
  <p>SVG (Scalable Vector Graphics) là <strong>vector image format</strong> based on XML. Defines graphics via mathematical path, shape, color — instead of pixel grid. Infinitely scalable without quality loss. Text-based file (editable in code editor). W3C standard, supported all modern browser. Foundation modern web graphics.</p>
  <p>Advantages over raster (JPG, PNG): <strong>Scale infinite</strong> (no pixelation), <strong>Small file size</strong> (text-based, compressible), <strong>Editable</strong> (open in Illustrator hoặc text editor), <strong>Animatable</strong> (CSS, JS, SMIL), <strong>Accessible</strong> (text searchable), <strong>Interactive</strong> (click, hover). Foundation modern UI design.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">SVG vs Raster</span>
    <p><strong>SVG (vector)</strong>: logo, icon, illustration. Scale infinite. Small file. <strong>JPG (raster)</strong>: photo. Lossy compression. Fixed resolution. <strong>PNG (raster)</strong>: graphic with transparency. Lossless. Fixed res. <strong>WebP (raster)</strong>: modern raster. Choose based on content type.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Vector Format</strong> — path-based</li>
    <li><strong>XML-Based</strong> — text file</li>
    <li><strong>Infinite Scale</strong> — no pixelation</li>
    <li><strong>Small File</strong> — text compressible</li>
    <li><strong>CSS Animation</strong> — animate</li>
    <li><strong>JavaScript Control</strong> — interactive</li>
    <li><strong>Inline SVG</strong> — embed in HTML</li>
    <li><strong>SVG Sprite</strong> — icon system</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"SVG vector graphics web design illustrator scalable"</span>
    </div>
    <p class="arc-image-caption">SVG — vector web standard, infinite scale</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>SVG Use Cases</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Logo</summary>
      <div class="arc-card-body">
        <p>Brand logo SVG standard. Scale từ favicon (16x16) to billboard. Single file all use. Sharp every size.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Icon System</summary>
      <div class="arc-card-body">
        <p>UI icon set. SVG sprite combine many icon single file. CSS class control. Heroicons, Font Awesome standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Illustration</summary>
      <div class="arc-card-body">
        <p>Flat illustration web — undraw.co, unDraw. Hero section, blog illustration. Scale beautiful.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Animation</summary>
      <div class="arc-card-body">
        <p>SVG path animate. Lottie alternative cho simple animation. Loading spinner, transition.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Charts / Data Viz</summary>
      <div class="arc-card-body">
        <p>D3.js generate SVG chart. Interactive data visualization. Web standard for chart.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UI Element</summary>
      <div class="arc-card-body">
        <p>Button background pattern, decorative shape. Lightweight, themeable.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Favicon</summary>
      <div class="arc-card-body">
        <p>Modern browser support SVG favicon. Scale better than ICO.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Map Interactive</summary>
      <div class="arc-card-body">
        <p>SVG country map clickable. World map, region selector. Interactive UI.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>SVG Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Design in Illustrator/Figma</h3>
    <ul class="arc-list">
      <li>Vector design</li>
      <li>Keep simple path</li>
      <li>Minimize anchor point</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Export as SVG</h3>
    <ul class="arc-list">
      <li>Illustrator File → Export → SVG</li>
      <li>Figma right click → Copy SVG</li>
      <li>Multiple option setting</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Optimize</h3>
    <ul class="arc-list">
      <li>SVGO tool / online optimizer</li>
      <li>Remove unnecessary metadata</li>
      <li>Reduce file size 50-90%</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Inline vs External</h3>
    <ul class="arc-list">
      <li>Inline: CSS/JS control</li>
      <li>External: cached, simpler HTML</li>
      <li>Choose based use case</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Style với CSS</h3>
    <ul class="arc-list">
      <li>fill, stroke color</li>
      <li>currentColor inherit text color</li>
      <li>Hover state</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Animate</h3>
    <ul class="arc-list">
      <li>CSS transition, animation</li>
      <li>JS GSAP control</li>
      <li>SMIL (older, decline)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Accessibility</h3>
    <ul class="arc-list">
      <li>title element for screen reader</li>
      <li>desc element description</li>
      <li>aria-label</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Sprite Combine</h3>
    <ul class="arc-list">
      <li>Multi icons single SVG file</li>
      <li>use href reference</li>
      <li>Reduce request</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>Illustrator</strong> — industry standard vector design</li>
    <li><strong>Figma</strong> — modern UI design, SVG export</li>
    <li><strong>Inkscape</strong> — free alternative Illustrator</li>
    <li><strong>SVGO</strong> — command-line optimizer</li>
    <li><strong>SVGOMG</strong> — web GUI optimizer</li>
    <li><strong>D3.js</strong> — JS data visualization</li>
    <li><strong>GSAP</strong> — SVG animation library</li>
    <li><strong>Lottie</strong> — alternative complex animation</li>
    <li><strong>Iconify, Heroicons</strong> — SVG icon library</li>
    <li><strong>Career Web Designer</strong> — SVG mastery essential modern</li>
  </ul>
</section>
`,
  },

  // 06. Swatches
  {
    id: "a701c289-6e9c-4bf3-ba13-2579aae48d20",
    tieu_de: "Color Swatches",
    tieu_de_viet: "Color Swatches trong Design",
    tom_tat:
      "Color Swatches là bảng lưu trữ mẫu màu, hoa văn, gradient — giúp designer dễ dàng quản lý và sử dụng màu sắc nhất quán trong các dự án.",
    meta_title:
      "Color Swatches là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Color Swatches Illustrator, Photoshop. Tìm hiểu cách tạo, manage, brand palette, Pantone và workflow chuẩn.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn designer làm 50 page brand book — same color used everywhere. Type hex code mỗi lần? Tedious, error-prone. Solution: <strong>Color Swatches</strong> — save brand color trong panel, click apply. Consistent brand color. Critical cho design system, brand asset, multi-document project. Foundation skill cho mọi Adobe user, Figma user.</p>
  <p>Color Swatches là kỹ năng essential cho graphic designer, brand designer, UI designer. Hiểu workflow tạo, organize, share swatch library, Pantone, brand palette giúp work efficient consistent. Foundation cho design system cohesive.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Color Swatches là gì?</h2>
  <p>Color Swatches là <strong>library of saved color, pattern, gradient</strong> trong design application. Stored trong <strong>Swatches Panel</strong>. Click apply to selected object. Centralize color management — change swatch definition, all instance update automatically. Foundation cho brand consistency, design system.</p>
  <p>Types: <strong>Process Color</strong> (CMYK or RGB, mathematical mix), <strong>Spot Color</strong> (Pantone exact, pre-mixed ink), <strong>Global Color</strong> (Illustrator, update everywhere when change), <strong>Gradient Swatch</strong> (saved gradient), <strong>Pattern Swatch</strong> (repeating pattern). Each different use case.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Swatch Type</span>
    <p><strong>Process (CMYK/RGB)</strong>: standard mix. <strong>Spot (Pantone)</strong>: pre-mixed ink, exact match. <strong>Global</strong>: update everywhere. <strong>Tint</strong>: percentage of color. <strong>Gradient</strong>: saved gradient. <strong>Pattern</strong>: repeating fill. Different for different need.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Process Color</strong> — CMYK mix</li>
    <li><strong>Spot Color</strong> — Pantone</li>
    <li><strong>Global Swatch</strong> — update all</li>
    <li><strong>Tint</strong> — % of color</li>
    <li><strong>Gradient Swatch</strong> — saved</li>
    <li><strong>Pattern Swatch</strong> — fill</li>
    <li><strong>Swatch Library</strong> — share file</li>
    <li><strong>Color Group</strong> — organize</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"color swatches illustrator photoshop palette brand design"</span>
    </div>
    <p class="arc-image-caption">Color Swatches — manage palette, brand consistency</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Swatch Use Cases</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Brand Palette</summary>
      <div class="arc-card-body">
        <p>Primary brand color, secondary, accent. Save as swatch group. Apply consistently across material.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pantone Spot Color</summary>
      <div class="arc-card-body">
        <p>Brand color exact via Pantone. Save spot swatch. Print accurate match. Logo, official material.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UI Color System</summary>
      <div class="arc-card-body">
        <p>UI design palette — primary, surface, error, success. Material Design, Apple HIG defines. Figma color style.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Theme Variant</summary>
      <div class="arc-card-body">
        <p>Light vs dark theme. Save both swatch group. Toggle for theme.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pattern Library</summary>
      <div class="arc-card-body">
        <p>Branded pattern. Background. Click apply. Reusable visual asset.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Gradient Library</summary>
      <div class="arc-card-body">
        <p>Brand gradient. Consistent reproduction. Hero section.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Scheme</summary>
      <div class="arc-card-body">
        <p>Complementary, analogous color scheme. Saved together. Easy switching during exploration.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Industry Standard</summary>
      <div class="arc-card-body">
        <p>Web safe color, Pantone Solid Coated. Pre-loaded library. Reference.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Swatches</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Define Brand Color</h3>
    <ul class="arc-list">
      <li>Primary, secondary, accent</li>
      <li>Hex, RGB, CMYK, Pantone</li>
      <li>Brand guideline document</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Create Swatch</h3>
    <ul class="arc-list">
      <li>Illustrator: Swatch Panel + button</li>
      <li>Photoshop: Swatch Panel new</li>
      <li>Set color type Global if AI</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Name Swatch</h3>
    <ul class="arc-list">
      <li>&quot;Brand Primary Blue&quot;</li>
      <li>Hex code for clarity</li>
      <li>Consistent naming</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Organize Group</h3>
    <ul class="arc-list">
      <li>Brand group folder</li>
      <li>UI group separate</li>
      <li>Pattern group</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Save Library</h3>
    <ul class="arc-list">
      <li>Illustrator save .ai swatch library</li>
      <li>Adobe CC Library share</li>
      <li>Team access</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Apply trong Project</h3>
    <ul class="arc-list">
      <li>Select object</li>
      <li>Click swatch apply</li>
      <li>Consistent</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Update Global</h3>
    <ul class="arc-list">
      <li>Edit global swatch definition</li>
      <li>All instance auto-update</li>
      <li>Rebrand color change once</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Figma Color Style</h3>
    <ul class="arc-list">
      <li>Figma equivalent — Color Style</li>
      <li>Component connection</li>
      <li>Design system foundation</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Swatches</h2>
  <ul class="arc-list">
    <li><strong>Global swatch Illustrator</strong> — update all instance</li>
    <li><strong>Spot color Pantone</strong> — printing exact</li>
    <li><strong>CMYK for print</strong>, RGB for screen</li>
    <li><strong>Name descriptively</strong> — &quot;Primary Brand Blue&quot;</li>
    <li><strong>CC Library</strong> share across Adobe apps</li>
    <li><strong>Figma Color Style</strong> — modern team workflow</li>
    <li><strong>Coolors.co</strong> — palette generator</li>
    <li><strong>Adobe Color</strong> — palette extraction từ photo</li>
    <li><strong>Brand book</strong> document swatch values</li>
    <li><strong>Career Designer</strong> — swatch mastery basic professional</li>
  </ul>
</section>
`,
  },

  // 07. Techvis
  {
    id: "0fa5bcc8-56ef-4baa-bd33-0d4e3f194d11",
    tieu_de: "Techvis",
    tieu_de_viet: "Techvis (Technical Visualization)",
    tom_tat:
      "Techvis là quá trình tiền sản xuất giúp đạo diễn hình dung và lên kế hoạch các cảnh quay phức tạp bằng hình ảnh 3D trước khi quay thực tế.",
    meta_title: "Techvis là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Techvis pre-production. Tìm hiểu workflow 3D, camera plan, lighting setup và software cho blockbuster shoot.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn đạo diễn Marvel film — complex VFX scene, hundreds of crew, expensive day. Without plan = chaos. <strong>Techvis</strong> (Technical Visualization) — 3D simulate cảnh trước khi shoot: camera placement, actor blocking, lighting position, crane move. Director, DP, VFX coordinate. Save millions, prevent reshoot. Foundation modern blockbuster production.</p>
  <p>Techvis là kỹ năng essential cho VFX supervisor, on-set coordinator, virtual production specialist. Hiểu workflow, software (Maya, Unreal), integration với production giúp execute complex shot efficiently. Critical cho AAA film, virtual production career.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Techvis là gì?</h2>
  <p>Techvis là <strong>3D pre-production tool</strong> simulating complex shoot before actual film. Different from <strong>Previs</strong> (story-focused, animatic): Techvis is technically precise — exact camera focal length, lens, crane movement, lighting position. Goal: plan logistics. Director, DP, VFX supervisor all reference techvis on-set. Avoid surprise during expensive shoot day.</p>
  <p>Workflow: <strong>1. 3D model environment</strong> from set design. <strong>2. Match camera</strong> specific lens, angle. <strong>3. Plan crane / dolly movement</strong>. <strong>4. Mark actor blocking</strong>. <strong>5. Verify VFX integration</strong> green screen, CGI element. <strong>6. Schedule</strong> shoot order optimize. Modern: virtual production blur line techvis / shoot, real-time render LED wall.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Pre-Production Visualization Spectrum</span>
    <p><strong>Storyboard</strong>: drawing, story. <strong>Animatic</strong>: timed storyboard. <strong>Previs</strong>: 3D story. <strong>Techvis</strong>: 3D technical, exact camera. <strong>Postvis</strong>: post-shoot temp VFX. <strong>Virtual Production</strong>: real-time on-set integration. Each phase build on previous.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Previs</strong> — story 3D</li>
    <li><strong>Techvis</strong> — technical 3D</li>
    <li><strong>Camera Plan</strong> — exact lens, position</li>
    <li><strong>Crane / Dolly Sim</strong> — movement</li>
    <li><strong>Actor Blocking</strong> — performance position</li>
    <li><strong>Lighting Plan</strong> — light position</li>
    <li><strong>VFX Plate</strong> — green screen integration</li>
    <li><strong>Virtual Production</strong> — modern</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"techvis pre-production 3D visualization film camera blocking"</span>
    </div>
    <p class="arc-image-caption">Techvis — 3D simulate cảnh, plan logistics, save reshoot</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Techvis Workflow</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>3D Environment Build</summary>
      <div class="arc-card-body">
        <p>Model set, location accurate. Architect blueprint or scan. Match real proportion. Foundation cho all plan.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Camera Setup</summary>
      <div class="arc-card-body">
        <p>Match real camera — RED Komodo, ARRI Alexa. Sensor size, focal length specific. Match real lens behavior.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Crane / Dolly Animation</summary>
      <div class="arc-card-body">
        <p>Plan camera move. Crane reach, dolly speed. Verify achievable physical. Avoid impossible camera.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Actor Blocking</summary>
      <div class="arc-card-body">
        <p>Digital actor stand-in. Position throughout scene. Coordinate với camera move. Mark performance.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lighting Plan</summary>
      <div class="arc-card-body">
        <p>Position light source. Sun direction. Practical light position. Pre-visualize lighting setup.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>VFX Integration</summary>
      <div class="arc-card-body">
        <p>Green screen area mark. CG element position. Verify VFX feasibility. Coordinate post.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Schedule Optimization</summary>
      <div class="arc-card-body">
        <p>Shoot order minimize move. Set up similar groups. Save day cost.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Virtual Production Convergence</summary>
      <div class="arc-card-body">
        <p>Modern: Unreal Engine LED wall. Techvis become live shoot environment. Mandalorian pioneer.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Use Cases</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Complex Action Sequence</h3>
    <ul class="arc-list">
      <li>Chase scene</li>
      <li>Multi-camera shoot</li>
      <li>Coordinate timing</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX Heavy Shot</h3>
    <ul class="arc-list">
      <li>Green screen with CGI</li>
      <li>Plan plate composition</li>
      <li>Coordinate VFX vendor</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Crane / Drone Move</h3>
    <ul class="arc-list">
      <li>Pre-visualize sweep</li>
      <li>Verify reach achievable</li>
      <li>Safety check</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Stunt Coordination</h3>
    <ul class="arc-list">
      <li>Plan stunt move</li>
      <li>Camera position safe</li>
      <li>Stunt coordinator review</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Location Scout Virtual</h3>
    <ul class="arc-list">
      <li>Test camera at virtual location</li>
      <li>Before physical scout</li>
      <li>Pre-decide feasibility</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cost Optimization</h3>
    <ul class="arc-list">
      <li>Reduce reshoot</li>
      <li>Efficient day plan</li>
      <li>Save millions blockbuster</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Maya</strong> — industry standard techvis</li>
    <li><strong>Unreal Engine</strong> — modern virtual production</li>
    <li><strong>Cinema 4D</strong> — alternative</li>
    <li><strong>FrameForge</strong> — specialized pre-vis</li>
    <li><strong>Shot Designer</strong> — iOS planning</li>
    <li><strong>Marvel, Star Wars</strong> — heavy techvis user</li>
    <li><strong>The Mandalorian</strong> — virtual production milestone</li>
    <li><strong>Career Techvis Artist</strong> — $70K-150K</li>
    <li><strong>Virtual Production Specialist</strong> — growing $80K-200K</li>
    <li><strong>Studio</strong>: Halon, Day for Nite, Proof</li>
  </ul>
</section>
`,
  },

  // 08. Template
  {
    id: "6ace2d0f-56de-4ab3-82da-cf6444b3d01c",
    tieu_de: "Template",
    tieu_de_viet: "Template (Mẫu thiết kế sẵn)",
    tom_tat:
      "Template là file thiết kế sẵn hoặc video gồm nhiều layout khác nhau được tạo sẵn — hỗ trợ người dùng không chuyên tạo sản phẩm chuyên nghiệp nhanh chóng.",
    meta_title: "Template là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Template design, video. Tìm hiểu Canva, Envato, AE template, Figma và best practice cho freelance, marketing.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn small business cần social media post. Designer cost $100 per post. Solution: <strong>Template</strong> Canva — drag drop, replace text, instant professional. Hoặc YouTuber cần intro animation: AE template, swap logo, done. Templates democratize design. Foundation cho non-designer create pro-looking work, designer save time productive.</p>
  <p>Template là kỹ năng essential cho marketer, content creator, freelance designer. Hiểu where find quality template, how customize, when to use vs custom giúp work efficient. Foundation cho modern marketing workflow, social media content.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Template là gì?</h2>
  <p>Template là <strong>pre-designed file</strong> serving as starting point. User customize — replace text, swap image, adjust color — produce final work without designing from scratch. Categories: <strong>Design template</strong> (Canva poster, social media), <strong>Video template</strong> (After Effects intro, transition), <strong>Document template</strong> (Word resume, presentation), <strong>Web template</strong> (WordPress theme, HTML).</p>
  <p>Source: <strong>Free</strong> (Canva, Adobe Express, Pixabay), <strong>Paid Marketplace</strong> (Envato Elements $16/month, VideoHive, Creative Market, GraphicRiver), <strong>Bundle</strong> (DesignBundle, ThemeForest), <strong>Subscription</strong> (Adobe Stock template, Motion Array). Quality vary. Top template can professional grade.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Template Categories</span>
    <p><strong>Social Media</strong>: Instagram post, FB cover. <strong>Print</strong>: poster, business card. <strong>Video</strong>: AE intro, lower-third, transition. <strong>Web</strong>: WordPress theme. <strong>Document</strong>: resume, presentation. <strong>Branding</strong>: logo template (controversial). Different need.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Design Template</strong> — graphic</li>
    <li><strong>Video Template</strong> — motion</li>
    <li><strong>Web Template</strong> — site</li>
    <li><strong>Document Template</strong> — resume</li>
    <li><strong>Branding Template</strong> — logo</li>
    <li><strong>Mockup</strong> — product visualization</li>
    <li><strong>License Type</strong> — personal vs commercial</li>
    <li><strong>Customization</strong> — replace text, image</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"template canva envato design social media video"</span>
    </div>
    <p class="arc-image-caption">Template — pre-designed starting point, democratize design</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Template Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Canva Template</summary>
      <div class="arc-card-body">
        <p>Web-based drag-drop. Thousands free template. Social media, presentation, document. Beginner friendly. Pro $12.99/month.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Envato Elements</summary>
      <div class="arc-card-body">
        <p>Subscription $16/month. Unlimited download — AE, Photoshop, stock photo, music, font. Industry favorite.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>VideoHive (Envato Market)</summary>
      <div class="arc-card-body">
        <p>Pay-per-template AE projects. Single $15-50. Specific use case.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Creative Market</summary>
      <div class="arc-card-body">
        <p>Indie designer marketplace. Premium font, template, mockup. Single purchase. Quality high.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Adobe Stock Template</summary>
      <div class="arc-card-body">
        <p>Adobe Stock subscription. Premiere, AE, Photoshop template. Integrate workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Motion Array</summary>
      <div class="arc-card-body">
        <p>Video template subscription. AE, Premiere, DaVinci. Music, sound effects bundled.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>WordPress Theme</summary>
      <div class="arc-card-body">
        <p>ThemeForest, Studiopress. WordPress website template. Customize content, ready site.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Figma Community Template</summary>
      <div class="arc-card-body">
        <p>UI design template. App template, dashboard. Free community shared. Quality vary.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Template Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Identify Need</h3>
    <ul class="arc-list">
      <li>Use case — social, print, video</li>
      <li>Time constraint</li>
      <li>Budget</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Source Selection</h3>
    <ul class="arc-list">
      <li>Free vs paid</li>
      <li>Match quality need</li>
      <li>License commercial</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Browse / Search</h3>
    <ul class="arc-list">
      <li>Filter by category</li>
      <li>Preview thumbnail</li>
      <li>Pick best match</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Customize Content</h3>
    <ul class="arc-list">
      <li>Replace text</li>
      <li>Swap image</li>
      <li>Brand color</li>
      <li>Font match brand</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Brand Adapt</h3>
    <ul class="arc-list">
      <li>Match brand identity</li>
      <li>Color scheme</li>
      <li>Logo integration</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Polish</h3>
    <ul class="arc-list">
      <li>Verify quality</li>
      <li>Check spelling</li>
      <li>Adjust if needed</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Export Final</h3>
    <ul class="arc-list">
      <li>Format per platform</li>
      <li>Resolution appropriate</li>
      <li>File size optimize</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Customize Further</h3>
    <ul class="arc-list">
      <li>Differentiate from default</li>
      <li>Don&apos;t look templated</li>
      <li>Personalize</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Customize, don&apos;t blindly use</strong> — avoid generic look</li>
    <li><strong>Commercial license check</strong> — most marketplace require</li>
    <li><strong>Canva Pro</strong> — premium template unlocked</li>
    <li><strong>Envato Elements</strong> — subscription value high</li>
    <li><strong>Sell template</strong> — passive income stream</li>
    <li><strong>Designer create template</strong> sell on Envato, Creative Market</li>
    <li><strong>Top template creator</strong> — $10K+/month passive</li>
    <li><strong>Brand book</strong> — own template internal</li>
    <li><strong>Career Template Creator</strong> — niche but lucrative</li>
    <li><strong>Time investment</strong> — quality template hour+ create</li>
  </ul>
</section>
`,
  },

  // 09. Tempo Adjustment
  {
    id: "809809f5-a37f-444f-908d-bbe98006bbe4",
    tieu_de: "Tempo Adjustment",
    tieu_de_viet: "Điều chỉnh nhịp độ nhạc",
    tom_tat:
      "Tempo Adjustment là điều chỉnh nhịp độ nhạc để phù hợp với cảnh — kỹ thuật essential trong music edit, film scoring, post-production audio.",
    meta_title:
      "Tempo Adjustment là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Tempo Adjustment audio. Tìm hiểu time stretching, BPM matching, workflow Pro Tools, Logic, DaVinci cho music edit.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn music editor working film. Scene cần music nhưng available track 120 BPM, scene rhythm needs 110 BPM. Old method: re-record. Modern: <strong>Tempo Adjustment</strong> — time stretch software adjust BPM preserve pitch. Critical tool cho music editor, film composer, post engineer. Foundation modern audio workflow.</p>
  <p>Tempo Adjustment là kỹ năng essential cho music editor, video editor, audio post engineer. Hiểu time stretching algorithm, workflow, software (Pro Tools, Logic, DaVinci) giúp manipulate music timing without pitch change. Critical cho film, video, podcast pacing.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Tempo Adjustment là gì?</h2>
  <p>Tempo Adjustment là <strong>process altering speed of audio</strong> without changing pitch. Achieved via <strong>time stretching</strong> algorithm. Different from playback speed change (also alters pitch). Modern DAW có sophisticated algorithm preserve audio quality during stretch. Critical tool cho film scoring (music match scene timing), podcast (fit duration), music remix (BPM match).</p>
  <p>Algorithm types: <strong>Time-Domain</strong> (granular, SOLA), <strong>Frequency-Domain</strong> (phase vocoder), <strong>Hybrid</strong> (modern, best quality). Each different trade-off. <strong>Élastique Pro</strong> (Steinberg), <strong>Rubber Band</strong> (open source), <strong>iZotope Radius</strong>, <strong>Pro Tools Elastic Audio</strong> — pro algorithms. Extreme stretch artifact appears, modest 5-20% sounds transparent.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Tempo vs Pitch Concept</span>
    <p>Original audio: 120 BPM, pitch G. <strong>Speed up audio</strong>: 140 BPM but pitch goes UP. <strong>Tempo adjust</strong>: 140 BPM but pitch STAYS G. Magic of modern algorithm. Without — chipmunk effect (pitch shift with speed).</p>
  </div>

  <ul class="arc-list">
    <li><strong>Time Stretching</strong> — speed without pitch</li>
    <li><strong>Pitch Shift</strong> — pitch without speed</li>
    <li><strong>BPM Match</strong> — sync tempo</li>
    <li><strong>Élastique Pro</strong> — Steinberg algo</li>
    <li><strong>Rubber Band</strong> — open source</li>
    <li><strong>Tempo Map</strong> — variable tempo</li>
    <li><strong>Beat Detection</strong> — find BPM</li>
    <li><strong>Quantize</strong> — snap to grid</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"tempo adjustment time stretch audio music DAW pro tools"</span>
    </div>
    <p class="arc-image-caption">Tempo Adjustment — change speed preserve pitch, modern audio essential</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Use Cases</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Film Scoring Music Match</summary>
      <div class="arc-card-body">
        <p>Library music 120 BPM, scene needs 110 BPM. Stretch slow. Tempo match scene cuts. Music editor daily.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Podcast Length Fit</summary>
      <div class="arc-card-body">
        <p>Podcast 32 min, need 30. Slight stretch reduce. Or interview adjust. Subtle, not noticeable.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Music Remix BPM Match</summary>
      <div class="arc-card-body">
        <p>Mix two song different BPM. Adjust one match other. DJ technique. Producer remix.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Variable Tempo Score</summary>
      <div class="arc-card-body">
        <p>Music slow down on emotional moment, speed up action. Tempo map variable. Match cinematic rhythm.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Loop Fit</summary>
      <div class="arc-card-body">
        <p>Sample loop 4 sec, need 3.5. Stretch fit. Music production sampling.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Trailer Audio</summary>
      <div class="arc-card-body">
        <p>Sync music hit với visual cut. Tempo adjust precise match.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Audiobook Speed</summary>
      <div class="arc-card-body">
        <p>Reader speed up dialog. Listener choice. Different from real tempo.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Vocal Pitch Correct</summary>
      <div class="arc-card-body">
        <p>Time stretch related — tighten vocal timing without affect pitch.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Identify Source BPM</h3>
    <ul class="arc-list">
      <li>Detect tempo audio</li>
      <li>DAW beat detect</li>
      <li>Manual tap tempo</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Determine Target</h3>
    <ul class="arc-list">
      <li>Target BPM scene need</li>
      <li>Match other audio</li>
      <li>Or fit duration</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Choose Algorithm</h3>
    <ul class="arc-list">
      <li>Élastique Pro best quality</li>
      <li>Rubber Band good free</li>
      <li>Pro Tools Elastic Audio</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Apply Time Stretch</h3>
    <ul class="arc-list">
      <li>DAW time stretch tool</li>
      <li>Drag clip edge resize</li>
      <li>Or precise percentage</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Listen Artifact</h3>
    <ul class="arc-list">
      <li>Heavy stretch = audible artifact</li>
      <li>Phasing, smearing</li>
      <li>Test before commit</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Tempo Map Variable</h3>
    <ul class="arc-list">
      <li>If tempo changes through clip</li>
      <li>Map tempo per section</li>
      <li>Smooth transition</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Quantize / Lock</h3>
    <ul class="arc-list">
      <li>Snap to grid</li>
      <li>Match precise beat</li>
      <li>Tighten timing</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Final Bounce</h3>
    <ul class="arc-list">
      <li>Render adjusted audio</li>
      <li>Confirm sound quality</li>
      <li>Replace original</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>Pro Tools Elastic Audio</strong> — industry standard</li>
    <li><strong>Logic Flex Time</strong> — Apple alternative</li>
    <li><strong>Ableton Warp</strong> — DJ/producer favorite</li>
    <li><strong>DaVinci Resolve Fairlight</strong> — integrated</li>
    <li><strong>iZotope RX</strong> — pro time stretch</li>
    <li><strong>Modest stretch transparent</strong> — 5-20% acceptable</li>
    <li><strong>Extreme stretch artifact</strong> — &gt;30% audible degradation</li>
    <li><strong>Test multiple algorithm</strong> — different material different best</li>
    <li><strong>Vocal monophonic</strong> easier stretch than polyphonic</li>
    <li><strong>Career Music Editor</strong> — tempo adjust daily essential</li>
  </ul>
</section>
`,
  },

  // 10. Texture Map
  {
    id: "a35b6c98-6633-4a54-9fcd-27c63bfc0c70",
    tieu_de: "Texture Map",
    tieu_de_viet: "Texture Map trong 3D",
    tom_tat:
      "Texture Map là tấm ảnh quy ước tính chất vật liệu 3D — màu sắc, độ bóng, lồi lõm — kết hợp nhiều map có thể tạo vật liệu 3D phức tạp realistic.",
    meta_title:
      "Texture Map là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Texture Map trong 3D rendering. Tìm hiểu Diffuse, Normal, Roughness, Metallic, AO và workflow PBR Substance Painter.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem AAA game — character realistic, surface look detailed, material lifelike. Behind scene: <strong>Texture Map</strong> — 2D image applied trên 3D model define visual property. Mỗi pixel encode information: color, normal, roughness, specular. Multiple map combine = sophisticated material. Foundation cho mọi 3D rendering modern. Critical knowledge cho 3D artist.</p>
  <p>Texture Map là kỹ năng essential cho 3D texture artist, environment artist, character artist. Hiểu PBR maps (Diffuse, Normal, Roughness, etc.), workflow Substance Painter, baking giúp produce realistic 3D asset. Foundation cho game, film, VR rendering.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Texture Map là gì?</h2>
  <p>Texture Map là <strong>2D image applied to 3D model surface</strong>, defining material property. Each pixel correspond to point on model (via UV coordinate). Different map type encode different information — color, surface detail, reflectance, roughness. Modern PBR workflow uses multiple map combined cho realistic material rendering.</p>
  <p>Foundation PBR maps: <strong>Diffuse / Albedo</strong> (base color), <strong>Normal</strong> (surface detail without geometry), <strong>Roughness</strong> (smooth vs rough surface), <strong>Metallic</strong> (binary metal vs dielectric), <strong>AO (Ambient Occlusion)</strong> (crevice shadow), <strong>Height / Displacement</strong> (geometric detail). Bake từ high-poly to low-poly cho production.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">PBR Map Set</span>
    <p><strong>Diffuse / Albedo</strong>: pure base color. <strong>Normal</strong>: per-pixel surface direction. <strong>Roughness</strong>: surface smoothness. <strong>Metallic</strong>: metal/non-metal. <strong>AO</strong>: shadow crevice. <strong>Height</strong>: depth (optional). 5-6 maps combine = realistic material.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Diffuse / Albedo Map</strong> — color</li>
    <li><strong>Normal Map</strong> — surface detail</li>
    <li><strong>Roughness Map</strong> — smoothness</li>
    <li><strong>Metallic Map</strong> — metal flag</li>
    <li><strong>AO Map</strong> — occlusion</li>
    <li><strong>Height / Displacement</strong> — depth</li>
    <li><strong>Emissive Map</strong> — glow</li>
    <li><strong>Opacity Map</strong> — transparency</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"texture map 3D PBR diffuse normal roughness substance painter"</span>
    </div>
    <p class="arc-image-caption">Texture Map — 2D image define 3D material property</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Map Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Diffuse / Albedo</summary>
      <div class="arc-card-body">
        <p>Pure base color. RGB. No lighting baked in. Foundation map. Modern PBR &quot;Albedo&quot; preferred term.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Normal Map</summary>
      <div class="arc-card-body">
        <p>RGB encoding surface direction per pixel. Adds detail without geometry. Bake từ high-poly. Bluish purple typical color.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Roughness Map</summary>
      <div class="arc-card-body">
        <p>Grayscale. White = rough (diffused light), black = smooth (sharp reflection). Foundation PBR.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Metallic Map</summary>
      <div class="arc-card-body">
        <p>Grayscale. White = metal, black = non-metal (dielectric). Mostly 0 or 1 binary. Mixed material map.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>AO (Ambient Occlusion)</summary>
      <div class="arc-card-body">
        <p>Grayscale. Shadow crevice naturally. Bake từ geometry. Add depth, realism.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Height / Displacement</summary>
      <div class="arc-card-body">
        <p>Grayscale. Subdivide geometry, displace per pixel. Or parallax effect. More expensive than normal map.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Emissive Map</summary>
      <div class="arc-card-body">
        <p>RGB. Self-illuminate areas. LED, screen, glow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Opacity / Alpha</summary>
      <div class="arc-card-body">
        <p>Grayscale. Transparency areas. White = opaque, black = transparent. Hair card, leaf.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Texturing Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. High-Poly Model</h3>
    <ul class="arc-list">
      <li>Sculpt detail ZBrush</li>
      <li>Millions polygon</li>
      <li>Decimate for baking</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Low-Poly Retopo</h3>
    <ul class="arc-list">
      <li>Clean topology</li>
      <li>Game-ready polycount</li>
      <li>Same shape as high-poly</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. UV Unwrap</h3>
    <ul class="arc-list">
      <li>Flatten 3D to 2D</li>
      <li>Efficient layout</li>
      <li>Seam hidden</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Bake Maps</h3>
    <ul class="arc-list">
      <li>Normal map từ high-poly</li>
      <li>AO map</li>
      <li>Curvature map</li>
      <li>xNormal, Substance Painter</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Substance Painter</h3>
    <ul class="arc-list">
      <li>Import baked maps</li>
      <li>Paint material per area</li>
      <li>Smart material library</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Layer Detail</h3>
    <ul class="arc-list">
      <li>Base material</li>
      <li>Wear, dirt overlay</li>
      <li>Edge highlight</li>
      <li>Stenciled detail</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Export Map Set</h3>
    <ul class="arc-list">
      <li>Diffuse, Normal, Roughness, Metallic, AO</li>
      <li>PNG/TGA per channel</li>
      <li>Engine-specific preset</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Engine Assignment</h3>
    <ul class="arc-list">
      <li>Plug map into shader slot</li>
      <li>Test rendering</li>
      <li>Match preview</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Substance Painter</strong> — industry standard texture authoring</li>
    <li><strong>Substance Designer</strong> — procedural material</li>
    <li><strong>Mari</strong> — VFX industry pro tool</li>
    <li><strong>Photoshop</strong> — texture editing</li>
    <li><strong>xNormal</strong> — free baking</li>
    <li><strong>Quixel Megascans</strong> — massive PBR library</li>
    <li><strong>Texture.com, Poliigon</strong> — texture libraries</li>
    <li><strong>UDIM workflow</strong> — multi-tile film VFX</li>
    <li><strong>Career Texture Artist</strong> — $55K-130K</li>
    <li><strong>Senior / Lead Texture Artist</strong> — $130K-200K</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 3 · Batch 6 — chạy ${items.length} bài keyword (Q → Z) ──\n`,
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
