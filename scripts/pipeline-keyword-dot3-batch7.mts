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
  // 01. Three.js
  {
    id: "568e9041-9fe0-4e89-8e1b-056309b92777",
    tieu_de: "Three.js",
    tieu_de_viet: "Three.js (Web 3D JavaScript)",
    tom_tat:
      "Three.js là thư viện JavaScript cho phép tạo và hiển thị đồ họa 3D trực tiếp trên trình duyệt sử dụng WebGL — dùng cho web experience, portfolio 3D, data visualization.",
    meta_title: "Three.js là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Three.js JavaScript 3D library. Tìm hiểu workflow, WebGL, scene setup và case study portfolio cho web developer.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn visit Apple website — interactive 3D iPhone, rotate, zoom. Hoặc Nike trainer 3D viewer. Behind scene: <strong>Three.js</strong> — JavaScript library run 3D graphics in browser. No plugin needed. Web 3D democratized. Foundation cho interactive product viewer, immersive portfolio, data visualization, web games. Modern web design trend.</p>
  <p>Three.js là kỹ năng essential cho creative web developer, frontend developer interested in 3D. Hiểu workflow, WebGL fundamental, scene setup, integrate React giúp build impressive 3D web experience. Career boost — niche skill, valuable.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Three.js là gì?</h2>
  <p>Three.js là <strong>JavaScript library</strong> creating 3D graphics in browser using WebGL. Created by Mr.doob (Ricardo Cabello) 2010. Open source. Free. Most popular 3D web library — 100K+ GitHub stars. Foundation modern web 3D experience. Used Apple, Nike, Google, agency portfolio everywhere. No plugin install required — runs in standard browser.</p>
  <p>Components: <strong>Scene</strong> (container 3D world), <strong>Camera</strong> (viewpoint), <strong>Renderer</strong> (output to canvas), <strong>Mesh</strong> (geometry + material), <strong>Light</strong> (illuminate scene), <strong>Animation Loop</strong> (60fps update). Code 3D programmatically. GLTF model import. Physics integration (Cannon.js, Rapier).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Three.js vs Alternative</span>
    <p><strong>Three.js</strong>: most popular, mature. <strong>Babylon.js</strong>: Microsoft, more game-focused. <strong>PlayCanvas</strong>: cloud-based editor. <strong>react-three-fiber</strong>: React renderer cho Three.js, modern preferred. <strong>Unity WebGL</strong>: heavier, AAA capable. Three.js sweet spot for web.</p>
  </div>

  <ul class="arc-list">
    <li><strong>WebGL</strong> — browser 3D API</li>
    <li><strong>Scene</strong> — 3D world container</li>
    <li><strong>Camera</strong> — perspective/ortho</li>
    <li><strong>Renderer</strong> — output canvas</li>
    <li><strong>Mesh</strong> — geometry+material</li>
    <li><strong>Light</strong> — illumination</li>
    <li><strong>GLTF</strong> — 3D model format</li>
    <li><strong>React Three Fiber</strong> — React integration</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"three.js WebGL 3D web browser javascript graphics"</span>
    </div>
    <p class="arc-image-caption">Three.js — 3D in browser, modern web experience</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Use Cases</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Product Viewer 3D</summary>
      <div class="arc-card-body">
        <p>E-commerce 3D product. Customer rotate, zoom. Apple, Nike, Tesla. Increase engagement, conversion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Portfolio Site</summary>
      <div class="arc-card-body">
        <p>Designer/dev portfolio 3D interactive. Stand out. Awwwards site of the day candidates.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Data Visualization</summary>
      <div class="arc-card-body">
        <p>3D chart, network graph. Plotly, custom Three.js. Complex data dimensional.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Web Game</summary>
      <div class="arc-card-body">
        <p>Browser 3D game. Casual, indie. No download, instant play. .io game popular.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Educational Visualization</summary>
      <div class="arc-card-body">
        <p>3D anatomy, physics simulation, science. Interactive learning.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Architectural Walkthrough</summary>
      <div class="arc-card-body">
        <p>Real estate, building. Virtual tour. Interactive web alternative VR.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>WebVR / WebXR</summary>
      <div class="arc-card-body">
        <p>VR/AR in browser. Three.js with WebXR API. Meta Quest browser support.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Creative Coding Art</summary>
      <div class="arc-card-body">
        <p>Generative art, particle system. Tutorials, art-focused. Creative coding community.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Three.js Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Setup Scene</h3>
    <ul class="arc-list">
      <li>Create Scene</li>
      <li>Add Camera (PerspectiveCamera)</li>
      <li>Setup WebGLRenderer</li>
      <li>Append canvas to DOM</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Add Mesh</h3>
    <ul class="arc-list">
      <li>Create Geometry (BoxGeometry, SphereGeometry)</li>
      <li>Material (MeshStandardMaterial)</li>
      <li>Mesh combine both</li>
      <li>Add to scene</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Lighting</h3>
    <ul class="arc-list">
      <li>AmbientLight base</li>
      <li>DirectionalLight sun</li>
      <li>PointLight, SpotLight cho effect</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Load 3D Model</h3>
    <ul class="arc-list">
      <li>GLTFLoader cho .glb/.gltf</li>
      <li>Blender, Maya export</li>
      <li>Optimized format</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Animation Loop</h3>
    <ul class="arc-list">
      <li>requestAnimationFrame</li>
      <li>Update mesh rotation</li>
      <li>Render scene</li>
      <li>60fps target</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Camera Controls</h3>
    <ul class="arc-list">
      <li>OrbitControls drag rotate</li>
      <li>FlyControls free fly</li>
      <li>User interaction</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Post-Processing</h3>
    <ul class="arc-list">
      <li>EffectComposer</li>
      <li>Bloom, depth of field</li>
      <li>Cinematic look</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Optimize Performance</h3>
    <ul class="arc-list">
      <li>Reduce polygon count</li>
      <li>Texture compression</li>
      <li>Frustum culling</li>
      <li>Mobile consideration</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; Tools</h2>
  <ul class="arc-list">
    <li><strong>React Three Fiber</strong> — React-friendly modern Three.js</li>
    <li><strong>Drei</strong> — R3F helpers (camera control, lighting)</li>
    <li><strong>Blender</strong> — create 3D model export GLTF</li>
    <li><strong>Spline</strong> — visual 3D tool, easy</li>
    <li><strong>Three.js Journey</strong> — Bruno Simon course</li>
    <li><strong>Career Three.js Developer</strong> — $80K-160K niche skill</li>
    <li><strong>Bruno Simon portfolio</strong> — iconic Three.js example</li>
    <li><strong>Awwwards</strong> — Three.js sites recognized</li>
    <li><strong>Studio</strong>: Active Theory, FFFFFFFF, ManvsMachine</li>
    <li><strong>Web 3D growing</strong> — agency hire for premium project</li>
  </ul>
</section>
`,
  },

  // 02. Thumbnail
  {
    id: "d5f52da2-044a-4392-86cb-c0a11f1e551c",
    tieu_de: "Thumbnail",
    tieu_de_viet: "Thumbnail (Ảnh đại diện)",
    tom_tat:
      "Thumbnail là ảnh đại diện nhỏ cho video, sản phẩm, nội dung — trong YouTube và streaming là yếu tố quyết định tỷ lệ click, cần thiết kế nổi bật.",
    meta_title: "Thumbnail là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Thumbnail YouTube design. Tìm hiểu CTR, color psychology, face placement, text overlay và best practice cho content creator.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn YouTube creator upload video — content amazing, viewer count low. Diagnosis: thumbnail. <strong>Thumbnail</strong> = single image determine viewer click hay scroll past. Top YouTuber MrBeast invest thousands per thumbnail. CTR 5% vs 10% double view count. Foundation cho YouTube success, content creator economy. Critical skill 2026.</p>
  <p>Thumbnail là kỹ năng essential cho YouTuber, content creator, marketer, designer. Hiểu psychology, composition, color, face, text overlay giúp boost CTR. Foundation cho creator economy success. Difference success vs failure on YouTube.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Thumbnail là gì?</h2>
  <p>Thumbnail là <strong>small image preview</strong> representing video, content, product. Foundation YouTube: thumbnail + title decide whether viewer click. Modern YouTube algorithm prioritize CTR (Click-Through Rate). High CTR thumbnail = more views = more income. MrBeast invest $10K+ per thumbnail A/B testing. Critical investment for creator.</p>
  <p>Design principles: <strong>Bold composition</strong>, <strong>High contrast</strong>, <strong>Face với strong emotion</strong> (face attract eye), <strong>Text overlay</strong> (2-3 words, large readable), <strong>Bright color</strong> (stand out feed), <strong>Curiosity gap</strong> (provoke click), <strong>Brand consistency</strong> (recognizable creator). Combine = high CTR.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">YouTube Thumbnail Spec</span>
    <p><strong>Size</strong>: 1280×720 px (16:9 ratio). <strong>Min 640px wide</strong>. <strong>File size</strong>: under 2MB. <strong>Format</strong>: JPG, PNG, GIF. <strong>Custom thumbnail</strong>: requires verified YouTube channel. Mobile display very small — design legible at tiny size.</p>
  </div>

  <ul class="arc-list">
    <li><strong>CTR (Click-Through Rate)</strong> — engagement metric</li>
    <li><strong>Face Strong Emotion</strong> — eye magnet</li>
    <li><strong>Text Overlay</strong> — punchy</li>
    <li><strong>High Contrast</strong> — stand out</li>
    <li><strong>Color Psychology</strong> — red, yellow attention</li>
    <li><strong>Curiosity Gap</strong> — provoke</li>
    <li><strong>Brand Style</strong> — recognizable</li>
    <li><strong>A/B Testing</strong> — multiple variant</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"thumbnail youtube design CTR mrbeast face emotion"</span>
    </div>
    <p class="arc-image-caption">Thumbnail — first impression determine click, CTR critical</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Design Principles</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Face + Emotion</summary>
      <div class="arc-card-body">
        <p>Human face attract eye instinct. Strong emotion — shock, joy, fear — provoke curiosity. MrBeast formula. Eye contact ideal.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>High Contrast</summary>
      <div class="arc-card-body">
        <p>Bright vs dark. Stand out feed. Yellow on dark blue, red on white. Mobile feed test critical.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bold Text 2-3 Words</summary>
      <div class="arc-card-body">
        <p>Large font, readable mobile. 2-3 words max. Provocative, click-bait moderate.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Saturation</summary>
      <div class="arc-card-body">
        <p>Bright color attract. Red, yellow, orange. Saturated. Avoid muted, neutral.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Curiosity Gap</summary>
      <div class="arc-card-body">
        <p>Show partial info, viewer want know more. &quot;You won&apos;t believe what happens&quot;. Element of mystery.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Brand Consistency</summary>
      <div class="arc-card-body">
        <p>Same style across video. Viewer recognize creator. Logan Paul, MrBeast distinct style.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mobile-First</summary>
      <div class="arc-card-body">
        <p>80% YouTube mobile. Design legible at small size. Text large, face clear.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Genre Matching</summary>
      <div class="arc-card-body">
        <p>Different genre different style. Gaming = vibrant character. Tech = product close-up. Beauty = face perfect.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Concept</h3>
    <ul class="arc-list">
      <li>What story video tell?</li>
      <li>Hook viewer with concept</li>
      <li>Sketch idea</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Photo Capture</h3>
    <ul class="arc-list">
      <li>Photo session face/scene</li>
      <li>Multiple expression</li>
      <li>Good lighting</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Background</h3>
    <ul class="arc-list">
      <li>Bright color or related image</li>
      <li>Gradient often</li>
      <li>Avoid distracting</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Composition</h3>
    <ul class="arc-list">
      <li>Rule of thirds</li>
      <li>Face large, ⅓ frame</li>
      <li>Text balanced</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Text Add</h3>
    <ul class="arc-list">
      <li>Large bold font</li>
      <li>2-3 words punchy</li>
      <li>High contrast outline/stroke</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Color Adjust</h3>
    <ul class="arc-list">
      <li>Saturation boost</li>
      <li>Brightness pop</li>
      <li>Contrast strong</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Mobile Preview</h3>
    <ul class="arc-list">
      <li>Test small size</li>
      <li>Legible?</li>
      <li>Stand out feed</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. A/B Test</h3>
    <ul class="arc-list">
      <li>Multiple variant</li>
      <li>YouTube test feature</li>
      <li>Iterate based CTR</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Photoshop</strong> — industry standard</li>
    <li><strong>Canva</strong> — beginner-friendly template</li>
    <li><strong>Figma</strong> — collaborative</li>
    <li><strong>Affinity Photo</strong> — affordable alternative</li>
    <li><strong>VidIQ, TubeBuddy</strong> — analytics, A/B test</li>
    <li><strong>YouTube Studio</strong> — built-in thumbnail test</li>
    <li><strong>MrBeast formula</strong> — extreme expression, bright color</li>
    <li><strong>Career Thumbnail Designer</strong> — $50-500 per thumbnail freelance</li>
    <li><strong>Top thumbnail designer</strong> — $10K+/month MrBeast designer</li>
    <li><strong>YouTube creator</strong>: 80% success thumbnail + title</li>
  </ul>
</section>
`,
  },

  // 03. Tilemap
  {
    id: "8fcab009-1f18-472a-8f5f-e57587d2348b",
    tieu_de: "Tilemap",
    tieu_de_viet: "Tilemap (Bản đồ ô gạch)",
    tom_tat:
      "Tilemap là hệ thống cho phép nhà phát triển game xây dựng các cấp độ và thế giới game khổng lồ bằng cách lắp ghép hình ảnh nhỏ lặp lại (Tiles) như Lego.",
    meta_title: "Tilemap là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Tilemap trong 2D game development. Tìm hiểu workflow Tiled, Unity Tilemap, tileset design và level design best practice.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn play Stardew Valley, Terraria, Zelda — explore vast 2D world. Behind scene: <strong>Tilemap</strong> — 2D grid system built from small reusable tile. Designer arrange tiles like Lego pieces. Efficient: 16×16 px tile reused thousands time create huge map. Foundation 2D game level design. From Super Mario (1985) to modern indie — tilemap everywhere.</p>
  <p>Tilemap là kỹ năng essential cho indie game developer, level designer. Hiểu workflow Tiled software, Unity Tilemap, tileset design giúp build efficient 2D world. Foundation cho indie pixel-art game development. Career path 2D level designer.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Tilemap là gì?</h2>
  <p>Tilemap là <strong>grid-based 2D level system</strong> using small reusable images called <strong>tiles</strong>. Designer arrange tile on grid create level. Each tile có set size (16×16, 32×32, 64×64 pixel typically). Engine read grid, render tile per cell. Foundation 2D game memory-efficient — 1MB tileset render unlimited size level.</p>
  <p>Components: <strong>Tileset</strong> (collection of tile images), <strong>Tile Atlas</strong> (single image containing all tiles), <strong>Tilemap Data</strong> (grid array referencing tile by ID), <strong>Tilemap Editor</strong> (Tiled, Unity Tilemap, Godot TileMap). Multi-layer tilemap allow foreground, background, collision separately.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Tilemap Benefits</span>
    <p><strong>Memory efficient</strong>: small tileset, large level. <strong>Fast to design</strong>: reuse pattern. <strong>Easy edit</strong>: change tileset = update entire level. <strong>Collision built-in</strong>: per tile collision shape. <strong>Auto-tiling</strong>: smart placement edge correctly.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Tileset</strong> — tile collection</li>
    <li><strong>Tile Atlas</strong> — single texture</li>
    <li><strong>Tile ID</strong> — reference number</li>
    <li><strong>Tilemap Grid</strong> — placement array</li>
    <li><strong>Auto-Tiling</strong> — smart edge</li>
    <li><strong>Collision Layer</strong> — physical</li>
    <li><strong>Tiled Software</strong> — popular editor</li>
    <li><strong>Animated Tile</strong> — water flow</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"tilemap 2D game level design pixel art tileset"</span>
    </div>
    <p class="arc-image-caption">Tilemap — grid of reusable tile, foundation 2D level</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Tilemap Components</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Single Tile</summary>
      <div class="arc-card-body">
        <p>16×16 or 32×32 pixel image. One unit grid. Tile floor, wall, object. Foundation building block.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tileset / Tile Atlas</summary>
      <div class="arc-card-body">
        <p>Collection of tile single image. 256×256 atlas hold 256 16×16 tile. Memory efficient — load once.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tilemap Layer</summary>
      <div class="arc-card-body">
        <p>Multiple layer — background, midground, foreground. Each independent edit. Parallax effect possible.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Auto-Tile / Smart Tile</summary>
      <div class="arc-card-body">
        <p>Software detect neighbor tile, auto-select correct variant. Grass meets path = transition tile. Save time.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Animated Tile</summary>
      <div class="arc-card-body">
        <p>Tile cycles through frames. Water wave, fire flicker. Add life to environment.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Collision Tile</summary>
      <div class="arc-card-body">
        <p>Per-tile collision shape. Wall block player, floor walkable. Engine physics integration.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Isometric Tilemap</summary>
      <div class="arc-card-body">
        <p>Diamond grid not square. Fake 3D perspective. SimCity, Tactics Ogre style.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hexagonal Tilemap</summary>
      <div class="arc-card-body">
        <p>Six-sided tile. Civilization style. Strategy game common.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Tilemap</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Design Tileset</h3>
    <ul class="arc-list">
      <li>Aseprite pixel art</li>
      <li>16×16 grid common</li>
      <li>Edge tiles meet smooth</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Export Tileset</h3>
    <ul class="arc-list">
      <li>PNG with all tile</li>
      <li>Grid spaced</li>
      <li>Reference grid size</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Import to Editor</h3>
    <ul class="arc-list">
      <li>Tiled software</li>
      <li>Unity Tilemap Editor</li>
      <li>Godot TileMap node</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Paint Level</h3>
    <ul class="arc-list">
      <li>Select tile from palette</li>
      <li>Click grid place</li>
      <li>Build level visually</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Multi-Layer</h3>
    <ul class="arc-list">
      <li>Background layer (sky, distant)</li>
      <li>Mid layer (decoration)</li>
      <li>Collision layer (wall, floor)</li>
      <li>Foreground (overlay)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Auto-Tile Setup</h3>
    <ul class="arc-list">
      <li>Define rule based neighbor</li>
      <li>Save time</li>
      <li>Cleaner edge</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Collision Define</h3>
    <ul class="arc-list">
      <li>Per-tile collision shape</li>
      <li>Wall block, water swimmable</li>
      <li>Physics integration</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Export to Engine</h3>
    <ul class="arc-list">
      <li>Tiled TMX format</li>
      <li>Unity native Tilemap</li>
      <li>JSON data</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Engine</h2>
  <ul class="arc-list">
    <li><strong>Tiled</strong> — free, industry standard tilemap editor</li>
    <li><strong>Unity Tilemap</strong> — built-in 2D editor</li>
    <li><strong>Godot TileMap</strong> — built-in node</li>
    <li><strong>Aseprite</strong> — pixel art tileset creation</li>
    <li><strong>Pyxel Edit</strong> — pixel + tileset together</li>
    <li><strong>RPG Maker</strong> — visual tilemap-based game</li>
    <li><strong>Construct 3</strong> — visual scripting với tilemap</li>
    <li><strong>Famous</strong>: Stardew Valley, Hyper Light Drifter, Celeste</li>
    <li><strong>Free tileset</strong>: itch.io, OpenGameArt</li>
    <li><strong>Career 2D Level Designer</strong> — $50K-100K indie/studio</li>
  </ul>
</section>
`,
  },

  // 04. Time Expression
  {
    id: "08fa2db4-de08-4519-905c-571881e9100b",
    tieu_de: "Time Expression",
    tieu_de_viet: "Time Expression trong After Effects",
    tom_tat:
      "Time Expression là expression After Effects trả về thời gian hiện tại của composition — làm giá trị đầu vào tạo chuyển động tự động liên tục không cần keyframe.",
    meta_title:
      "Time Expression là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Time Expression After Effects. Tìm hiểu cách dùng time variable, math function tạo automatic animation không keyframe.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn motion designer animate background loading spinner — keyframe rotation every frame? Tedious. Solution: <strong>Time Expression</strong> <code>time * 360</code> — single line code = infinite rotation. AE evaluate expression mỗi frame, return time × 360 = continuous rotation. Foundation cho automated motion. Foundation skill cho pro motion designer.</p>
  <p>Time Expression là kỹ năng essential cho motion designer chuyên nghiệp. Hiểu time variable, math function, common pattern giúp tự động hóa repetitive motion. Critical cho infographic, mechanical animation, music visualizer.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Time Expression là gì?</h2>
  <p>Time Expression là <strong>After Effects expression</strong> using <code>time</code> variable — built-in return current composition time in seconds. Time at frame 1 = 0.04 (at 24fps). Time at 5 second mark = 5. Applied to property, value computed per frame based on time. Result: <strong>automatic animation without keyframe</strong>. Foundation cho mechanical, infinite, time-driven motion.</p>
  <p>Common patterns: <strong>time × speed</strong> (linear motion), <strong>Math.sin(time) × amplitude</strong> (pendulum oscillation), <strong>wiggle(freq, amp)</strong> (random based on time), <strong>linear(time, 0, 5, 0, 100)</strong> (interpolate over 5 sec). Combine với conditional logic — if/else — complex behavior single property.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Common Time Patterns</span>
    <p><strong>Rotation</strong>: <code>time * 360</code> = 1 rev/sec. <strong>Position</strong>: <code>[time * 100, 0]</code> = move right. <strong>Sin Wave</strong>: <code>Math.sin(time * 2) * 50</code> = oscillate. <strong>Linear ramp</strong>: <code>linear(time, 0, 5, 0, 100)</code> = 0→100 over 5 sec. Foundational tools.</p>
  </div>

  <ul class="arc-list">
    <li><strong>time variable</strong> — current sec</li>
    <li><strong>Math.sin / cos</strong> — wave</li>
    <li><strong>linear() interpolate</strong> — ramp</li>
    <li><strong>ease() interpolate</strong> — smooth</li>
    <li><strong>wiggle()</strong> — random</li>
    <li><strong>loopOut()</strong> — keyframe loop</li>
    <li><strong>thisComp.layer</strong> — reference other</li>
    <li><strong>if/else condition</strong> — logic</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"time expression after effects motion graphics code automate"</span>
    </div>
    <p class="arc-image-caption">Time Expression — automate motion via time variable</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Common Patterns</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Continuous Rotation</summary>
      <div class="arc-card-body">
        <p><code>time * 360</code> — 360° per second. <code>time * 720</code> = 2 rev/sec. Loading spinner classic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sine Pendulum</summary>
      <div class="arc-card-body">
        <p><code>Math.sin(time * 2) * 45</code> — oscillate ±45 degree, 2 cycle/sec. Clock pendulum, idle motion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Linear Position</summary>
      <div class="arc-card-body">
        <p><code>[time * 100, 0]</code> — move right 100px/sec. Scroll BG, parallax.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Wiggle (Random)</summary>
      <div class="arc-card-body">
        <p><code>wiggle(3, 20)</code> — random ±20, 3 change/sec. Camera shake, hand-held.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Linear Interpolation</summary>
      <div class="arc-card-body">
        <p><code>linear(time, 0, 5, 0, 100)</code> — 0 to 100 over 0-5 sec linearly. No keyframe needed.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ease Interpolation</summary>
      <div class="arc-card-body">
        <p><code>ease(time, 0, 5, 0, 100)</code> — same but smooth. Natural feel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Conditional Logic</summary>
      <div class="arc-card-body">
        <p><code>if (time &lt; 2) 0; else time * 100;</code> — wait 2 sec, then start animation. Sequencing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Time Offset</summary>
      <div class="arc-card-body">
        <p><code>(time + index * 0.1) * 360</code> — staggered start per layer index. Cascading animation.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Use Cases</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Loading Spinner</h3>
    <ul class="arc-list">
      <li>Infinite rotation</li>
      <li>time * speed</li>
      <li>Background loop</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Pendulum Clock</h3>
    <ul class="arc-list">
      <li>Sine wave swing</li>
      <li>Time-driven realistic</li>
      <li>No keyframe needed</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Subtle Idle Motion</h3>
    <ul class="arc-list">
      <li>Character breathing</li>
      <li>Wiggle small amplitude</li>
      <li>Living feel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Background Scroll</h3>
    <ul class="arc-list">
      <li>Endless scrolling BG</li>
      <li>Linear position</li>
      <li>Game UI, presentation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Audio Reactive (Custom)</h3>
    <ul class="arc-list">
      <li>Time-driven base + audio modify</li>
      <li>Music visualizer</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cascade Layer</h3>
    <ul class="arc-list">
      <li>Multiple layer offset</li>
      <li>Index-based staggered</li>
      <li>Particle-like motion</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Time Expression</h2>
  <ul class="arc-list">
    <li><strong>Use time</strong> instead of keyframe = automation</li>
    <li><strong>Degrees default</strong> AE expression</li>
    <li><strong>Math.PI</strong> — useful for radian convert</li>
    <li><strong>Combine multiple</strong> — <code>time * 360 + wiggle(2, 10)</code></li>
    <li><strong>Pre-comp performance</strong> — heavy expression slow preview</li>
    <li><strong>Bake to keyframe</strong> when need more control</li>
    <li><strong>Pick whip</strong> visual link expression to property</li>
    <li><strong>Comment</strong> code cho future self</li>
    <li><strong>Reusable preset</strong> — save expression</li>
    <li><strong>Career Motion Designer</strong> — expression mastery senior</li>
  </ul>
</section>
`,
  },

  // 05. Time remaping
  {
    id: "da4ca89e-8d1a-450d-b155-1d032577c4e1",
    tieu_de: "Time Remapping (Speed Ramp)",
    tieu_de_viet: "Time Remapping & Speed Ramp",
    tom_tat:
      "Time Remapping (Speed Ramp) là kỹ thuật chỉnh video để thay đổi tốc độ — tua nhanh, chậm, hoặc đảo ngược — giúp video sáng tạo, sinh động, thu hút.",
    meta_title:
      "Time Remapping là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Time Remapping speed ramp trong Premiere, After Effects. Tìm hiểu workflow, optical flow và best practice cho cinematic.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem music video — action moment slow mo dramatic, fast paced normal. Hoặc TikTok creator effect — pause, slow, speed up theo beat. Đó là <strong>Time Remapping</strong> (Speed Ramp) — change video speed dynamically within single clip. Cinematic technique trở thành mainstream với social media. Critical skill cho video editor 2026.</p>
  <p>Time Remapping là kỹ thuật essential cho video editor, music video editor, TikTok creator. Hiểu workflow Premiere/AE, optical flow, frame blending giúp create cinematic speed effect. Foundation cho modern video editing trend.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Time Remapping là gì?</h2>
  <p>Time Remapping là <strong>technique changing playback speed</strong> of video clip dynamically — speed up, slow down, freeze, reverse — within single clip. Speed Ramp specific: <strong>gradual speed change</strong> (e.g., normal → slow mo). Modern cinematic technique. Common Premiere Pro, After Effects, DaVinci Resolve. Mobile editors (CapCut) also support.</p>
  <p>Implementation: <strong>Keyframe time</strong> — graph speed over clip duration. Software interpolate between keyframe. Quality enhancement: <strong>Optical Flow</strong> — AI generate intermediate frame cho smooth slow mo. <strong>Frame Blending</strong> — average adjacent frame. Without — looks choppy. Quality differ between technique.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Speed Ramp Cinematic</span>
    <p><strong>Normal → Slow</strong>: dramatic effect at impact moment. <strong>Slow → Normal</strong>: emerge from dramatic. <strong>Freeze frame</strong>: pause for emphasis. <strong>Reverse</strong>: rewind effect. Combine with sound design = cinematic feel. TikTok signature.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Speed Ramp</strong> — gradual change</li>
    <li><strong>Freeze Frame</strong> — pause</li>
    <li><strong>Reverse</strong> — play backward</li>
    <li><strong>Optical Flow</strong> — AI interpolation</li>
    <li><strong>Frame Blending</strong> — average frame</li>
    <li><strong>Time Curve</strong> — speed graph</li>
    <li><strong>HFR Source</strong> — high frame rate</li>
    <li><strong>Twixtor</strong> — popular plugin</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"time remapping speed ramp video editing cinematic music video"</span>
    </div>
    <p class="arc-image-caption">Time Remapping — dynamic speed control, cinematic effect</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Effect Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Slow Motion</summary>
      <div class="arc-card-body">
        <p>Reduce speed 25-50%. Best when shot HFR. Otherwise software interpolation. Cinematic moment.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Speed Up / Fast Motion</summary>
      <div class="arc-card-body">
        <p>Increase 200-500%. Time-lapse, energetic pace. Action montage.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Speed Ramp Gradient</summary>
      <div class="arc-card-body">
        <p>Normal → slow mo at impact → back normal. Marvel signature. Action moment emphasis.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Freeze Frame</summary>
      <div class="arc-card-body">
        <p>Pause specific frame few seconds. Hero moment. Pose hold.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Reverse</summary>
      <div class="arc-card-body">
        <p>Play backward. Rewind effect. Surprise moment.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Stutter / Skip</summary>
      <div class="arc-card-body">
        <p>Skip frame intentionally. Glitch effect. Music video.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>TikTok Speed Effect</summary>
      <div class="arc-card-body">
        <p>Beat-sync speed change. CapCut built-in preset. Viral trend.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Time-Lapse Hyperlapse</summary>
      <div class="arc-card-body">
        <p>Extreme speed up 1000%+. Sunset, city, construction. Specialized capture often.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Premiere/AE</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Source Footage</h3>
    <ul class="arc-list">
      <li>Higher frame rate better slow mo</li>
      <li>120fps source → smooth 24p slow</li>
      <li>30fps source = limited slow</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Enable Time Remap</h3>
    <ul class="arc-list">
      <li>Premiere: right-click → Speed/Duration → Time Remapping</li>
      <li>AE: right-click → Enable Time Remapping</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Add Keyframe</h3>
    <ul class="arc-list">
      <li>Mark beginning, end of effect</li>
      <li>Set speed value</li>
      <li>Ease keyframe smooth</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Speed Ramp</h3>
    <ul class="arc-list">
      <li>Speed 100% → 25% → 100%</li>
      <li>Ramp on either side keyframe</li>
      <li>Smooth transition</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Enable Optical Flow</h3>
    <ul class="arc-list">
      <li>Smooth slow mo</li>
      <li>AI generate frame</li>
      <li>Render slower but quality</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Sound Sync</h3>
    <ul class="arc-list">
      <li>Audio time stretch</li>
      <li>Match visual</li>
      <li>Or design sound match speed</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Music Sync</h3>
    <ul class="arc-list">
      <li>Speed change on beat</li>
      <li>Hit music accent</li>
      <li>Editor rhythm</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Preview &amp; Iterate</h3>
    <ul class="arc-list">
      <li>Play full speed</li>
      <li>Adjust keyframe</li>
      <li>Test feel</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Tools</h2>
  <ul class="arc-list">
    <li><strong>Premiere Pro</strong> — Speed/Duration, Time Remapping</li>
    <li><strong>After Effects</strong> — Enable Time Remapping</li>
    <li><strong>DaVinci Resolve</strong> — Retime Controls</li>
    <li><strong>Twixtor (RE:Vision Effects)</strong> — pro plugin slow mo</li>
    <li><strong>CapCut</strong> — mobile speed ramp preset</li>
    <li><strong>Shoot HFR when possible</strong> — best slow mo quality</li>
    <li><strong>Optical Flow ON</strong> cho smooth slow mo</li>
    <li><strong>Music sync beat</strong> — speed change rhythm</li>
    <li><strong>Don&apos;t overuse</strong> — selective for impact</li>
    <li><strong>Career Video Editor</strong> — speed ramp common skill</li>
  </ul>
</section>
`,
  },

  // 06. Timecode Synchronization
  {
    id: "9bb28f47-a12c-4064-b479-c09002a6a272",
    tieu_de: "Timecode Synchronization",
    tieu_de_viet: "Timecode Synchronization (Đồng bộ TC)",
    tom_tat:
      "Timecode Synchronization là dùng timecode để căn chỉnh chính xác lời thoại với hình ảnh — foundation cho film/TV post-production multi-source workflow.",
    meta_title:
      "Timecode Synchronization là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Timecode sync SMPTE workflow. Tìm hiểu jam-sync, LTC, multi-cam, ADR sync và pro tools cho film post production.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn film studio shoot — 6 camera, 4 audio recorder, ADR session later. Without coordination = chaos sync hours. Solution: <strong>Timecode Synchronization</strong> — all device share precise timecode reference. Multi-cam auto-sync, audio dialog match picture instantly. Foundation modern film post. Save days. Critical for AAA production.</p>
  <p>Timecode Synchronization là kỹ năng essential cho on-set sound mixer, post audio engineer, video editor. Hiểu SMPTE timecode, jam-sync workflow, LTC, hardware sync tool giúp work efficient với multi-source. Industry standard cho pro film production.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Timecode Sync là gì?</h2>
  <p>Timecode Synchronization là <strong>process aligning multiple devices to common time reference</strong> via SMPTE timecode signal. SMPTE timecode = hours:minutes:seconds:frames (24fps standard) — universal sync standard since 1967. Each device share timecode = effectively share clock. Multi-camera + multi-audio all sync. Modern essential cho complex shoot.</p>
  <p>Implementation: <strong>Jam Sync</strong> — master TC generator (Tentacle Sync, TimeCode Buddy) jam timecode to camera + recorder. After jam, devices internal clock keep sync briefly (drift over hours). <strong>LTC</strong> (Linear Timecode) — audio signal carrying TC. <strong>VITC</strong> — embedded video signal. <strong>Word Clock</strong> — sample-level digital sync.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Timecode Format</span>
    <p><strong>SMPTE Timecode</strong>: HH:MM:SS:FF. 24fps cinema, 23.976 NTSC pull-down, 25fps PAL, 29.97 NTSC, 30fps. <strong>Drop-Frame vs Non-Drop-Frame</strong>: 29.97 dropping frame compensate. Choose match project standard.</p>
  </div>

  <ul class="arc-list">
    <li><strong>SMPTE Timecode</strong> — standard</li>
    <li><strong>LTC</strong> — audio TC signal</li>
    <li><strong>VITC</strong> — video embedded</li>
    <li><strong>Jam Sync</strong> — match clock</li>
    <li><strong>Drop Frame</strong> — 29.97 compensate</li>
    <li><strong>Word Clock</strong> — sample sync</li>
    <li><strong>Tentacle Sync</strong> — popular TC tool</li>
    <li><strong>Genlock</strong> — video sync</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"timecode synchronization SMPTE film production audio sync"</span>
    </div>
    <p class="arc-image-caption">Timecode Sync — multi-source alignment, foundation post production</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>TC Workflow</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Master TC Generator</summary>
      <div class="arc-card-body">
        <p>Hardware device generate continuous timecode. Battery-powered. Sync source all device.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tentacle Sync</summary>
      <div class="arc-card-body">
        <p>Affordable TC generator ~$300. Popular indie pro. Bluetooth phone app config. Multiple unit jam.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Camera TC In</summary>
      <div class="arc-card-body">
        <p>Pro camera (RED, ARRI) TC input. Jam from generator. Each frame timestamped.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Audio Recorder TC</summary>
      <div class="arc-card-body">
        <p>Sound Devices, Zoom F8 Pro TC in. Jam same generator. Audio file metadata embedded TC.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Jam Sync Procedure</summary>
      <div class="arc-card-body">
        <p>Touch device to generator. Press jam button. TC copied. Internal clock continue. Re-jam every 4 hours best.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>NLE Sync</summary>
      <div class="arc-card-body">
        <p>Premiere, Avid auto-sync clip by TC metadata. Multi-cam sequence instant. Save hours manual sync.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>ADR Match</summary>
      <div class="arc-card-body">
        <p>Studio ADR record reference original TC. Match shoot day TC. Sync to original picture.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Drift Correction</summary>
      <div class="arc-card-body">
        <p>Even pro generator drift over hour. Re-jam periodically. Long take check end frame.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>On-Set Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Start of Day Jam</h3>
    <ul class="arc-list">
      <li>All camera + audio jam master</li>
      <li>Verify timecode matched</li>
      <li>Standard practice</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Re-Jam Periodic</h3>
    <ul class="arc-list">
      <li>Every 4 hours recommended</li>
      <li>Lunch break good time</li>
      <li>Maintain drift</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Slate Backup</h3>
    <ul class="arc-list">
      <li>Visual slate still used</li>
      <li>Backup if TC fail</li>
      <li>Belt + suspender</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Production Sound Report</h3>
    <ul class="arc-list">
      <li>Note each take TC</li>
      <li>Camera roll, audio file</li>
      <li>Editor reference</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Multi-Cam Group</h3>
    <ul class="arc-list">
      <li>NLE create multi-cam clip</li>
      <li>TC auto-sync</li>
      <li>Switch angle effortless</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Post Audio Sync</h3>
    <ul class="arc-list">
      <li>Audio file dropped on TL</li>
      <li>Snap to camera audio TC</li>
      <li>Instant sync</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Tentacle Sync</strong> — affordable indie pro $300</li>
    <li><strong>Deity TC-1</strong> — alternative</li>
    <li><strong>Ambient Lockit</strong> — pro broadcast</li>
    <li><strong>Atomos Ninja</strong> — TC monitor recorder</li>
    <li><strong>Sound Devices 833, MixPre</strong> — TC capable recorder</li>
    <li><strong>iPhone TC apps</strong> — entry-level</li>
    <li><strong>Premiere multi-cam</strong> — TC auto-sync</li>
    <li><strong>DaVinci Resolve sync</strong> — modern alternative</li>
    <li><strong>Career Sound Mixer / Recordist</strong> — TC essential</li>
    <li><strong>Career Script Supervisor</strong> — log TC per take</li>
  </ul>
</section>
`,
  },

  // 07. Title Sequences
  {
    id: "4131effd-a65a-4af5-97b3-234274bef428",
    tieu_de: "Title Sequences",
    tieu_de_viet: "Title Sequences (Mở đầu phim)",
    tom_tat:
      "Title Sequences là đoạn phim ngắn ở đầu tác phẩm dùng đồ họa, âm thanh, hình ảnh để thiết lập tông màu — vừa truyền tải thông tin sản xuất vừa là tác phẩm nghệ thuật.",
    meta_title:
      "Title Sequences là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Title Sequences design. Tìm hiểu lịch sử, workflow Saul Bass, Kyle Cooper, motion designer cho film opening credit.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Stranger Things — opening sequence 80s synth, retro typography, gives immediate mood. Hoặc Game of Thrones — clockwork map, signature opener. Đó là <strong>Title Sequence</strong> — art form combining motion graphics, music, storytelling. From Saul Bass 1955 → modern Kyle Cooper, Imaginary Forces — celebrated craft. Career path lucrative cho motion designer.</p>
  <p>Title Sequences là kỹ năng essential cho motion designer, title sequence artist, brand designer. Hiểu history, workflow, software (AE, Cinema 4D), narrative approach giúp design memorable opening. Niche but respected career — top sequence design $100K+ commissions.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Title Sequences là gì?</h2>
  <p>Title Sequence là <strong>short film opening</strong> presenting movie/show title + production credit + setting mood/tone for upcoming story. Foundation visual hook. Modern title sequence sophisticated — full creative work integrate typography, motion graphics, photography, music, narrative. Standalone art piece — Emmy Award &quot;Best Main Title Design&quot; recognize craft.</p>
  <p>History: <strong>Saul Bass</strong> pioneered modern title 1955 (Man with the Golden Arm) — geometric abstraction, integration với film theme. <strong>Maurice Binder</strong> James Bond gun-barrel iconic. <strong>Kyle Cooper</strong> Se7en 1995 revolutionary. Modern: <strong>Imaginary Forces</strong>, <strong>Elastic</strong>, <strong>yU+co</strong> studios — Mad Men, Westworld, Game of Thrones notable.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Title Sequence vs End Credit</span>
    <p><strong>Opening Title</strong>: short, intro mood. Main creative effort. <strong>End Credit Roll</strong>: long, list everyone. Less creative typically. <strong>Bumper / Logo</strong>: studio identity intro. <strong>Animatic Sequence</strong>: pre-vis. Different role.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Main Title Sequence</strong> — opening</li>
    <li><strong>End Credits</strong> — closing</li>
    <li><strong>Typography Animation</strong> — kinetic</li>
    <li><strong>Music Sync</strong> — beat</li>
    <li><strong>Narrative Element</strong> — story</li>
    <li><strong>Logo Animation</strong> — studio intro</li>
    <li><strong>Saul Bass School</strong> — geometric</li>
    <li><strong>Modern Photoreal</strong> — Mad Men style</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"title sequence design motion graphics opening credit movie"</span>
    </div>
    <p class="arc-image-caption">Title Sequences — opening art, foundation cinematic mood</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Style Examples</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Geometric Abstract (Saul Bass)</summary>
      <div class="arc-card-body">
        <p>Bold shape, simple typography. Vertigo, North by Northwest. Foundation modern title.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Photoreal Narrative (Mad Men)</summary>
      <div class="arc-card-body">
        <p>Falling man silhouette. Photoreal CG. Brad Bird Pixar pioneer. Story in sequence.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Kinetic Typography</summary>
      <div class="arc-card-body">
        <p>Animated text storytelling. Catch Me If You Can, Lemony Snicket. Letter dance.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Retro Synthwave (Stranger Things)</summary>
      <div class="arc-card-body">
        <p>80s typography retro. Synth music. Imaginary Forces. Trend-setting modern.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mechanical 3D (Game of Thrones)</summary>
      <div class="arc-card-body">
        <p>Clockwork map, city build. Elastic studio. Iconic intro of modern era.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Live Action Composite</summary>
      <div class="arc-card-body">
        <p>James Bond gun-barrel. Live actor integrated graphic. Iconic franchise opener.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Documentary (Errol Morris)</summary>
      <div class="arc-card-body">
        <p>Minimalist text overlay. Document feel. Subtle.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Comedy / Light</summary>
      <div class="arc-card-body">
        <p>Cheeky animated icon, fun typography. Friends, Seinfeld theme. Comedic tone setup.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Title Design</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Brief Watching Film</h3>
    <ul class="arc-list">
      <li>Read script</li>
      <li>Watch rough cut</li>
      <li>Discuss director vision</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Concept Exploration</h3>
    <ul class="arc-list">
      <li>Mood board</li>
      <li>Multiple direction</li>
      <li>Pitch director</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Storyboard Sequence</h3>
    <ul class="arc-list">
      <li>Frame by frame plan</li>
      <li>Story arc within title</li>
      <li>30-90 sec typical</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Music Sync</h3>
    <ul class="arc-list">
      <li>Theme music select</li>
      <li>Cut to beat</li>
      <li>Emotional rhythm</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Animation Build</h3>
    <ul class="arc-list">
      <li>After Effects motion</li>
      <li>Cinema 4D 3D</li>
      <li>Typography animate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Photoreal CG</h3>
    <ul class="arc-list">
      <li>Heavy 3D render (GoT, Westworld)</li>
      <li>Render farm</li>
      <li>Weeks render time</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Composite &amp; Polish</h3>
    <ul class="arc-list">
      <li>Color grade</li>
      <li>VFX integration</li>
      <li>Sound design</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Approve &amp; Deliver</h3>
    <ul class="arc-list">
      <li>Director, producer approve</li>
      <li>Multiple format deliver</li>
      <li>Studio brand approval</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; Studios</h2>
  <ul class="arc-list">
    <li><strong>Imaginary Forces</strong> — Stranger Things, Westworld</li>
    <li><strong>Elastic</strong> — Game of Thrones, True Detective</li>
    <li><strong>yU+co</strong> — major studio title</li>
    <li><strong>Prologue Films</strong> — Avengers, Star Wars titles</li>
    <li><strong>Brand New School</strong> — major animation title</li>
    <li><strong>Saul Bass</strong> — pioneer historic</li>
    <li><strong>Kyle Cooper</strong> — Se7en, modern era</li>
    <li><strong>Career Title Designer</strong> — $80K-200K studio</li>
    <li><strong>Freelance per sequence</strong> — $50K-500K+</li>
    <li><strong>Software</strong>: AE, Cinema 4D, Houdini, Maya</li>
  </ul>
</section>
`,
  },

  // 08. Trang phục Mocap
  {
    id: "7f4b1b8d-7b0f-495b-9213-616e6feb5303",
    tieu_de: "Mocap Suit (Trang phục Mocap)",
    tieu_de_viet: "Trang phục Mocap (Mo-cap Suit)",
    tom_tat:
      "Mocap Suit là bộ trang phục gắn marker (điểm đánh dấu) được diễn viên mặc để hệ thống camera ghi lại chuyển động trong quá trình Motion Capture cho CGI character.",
    meta_title:
      "Mocap Suit là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Mocap Suit workflow. Tìm hiểu optical vs inertial, Vicon, OptiTrack, Rokoko Smartsuit và industry application.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Andy Serkis Gollum, Caesar Planet of Apes — character feel real because actor performance. Behind scene: actor wear <strong>Mocap Suit</strong> — tight bodysuit with reflective markers. Camera track marker position, record movement. Apply to 3D character — performance preserved digitally. Foundation cho modern CGI character. Marvel, Avatar, Disney+ all use mocap.</p>
  <p>Mocap Suit là kỹ năng essential cho VFX professional, animator, on-set mocap technician. Hiểu workflow optical vs inertial, calibration, common system giúp work với mocap pipeline. Career path technical animator, mocap supervisor — niche valuable.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Mocap Suit là gì?</h2>
  <p>Mocap Suit là <strong>specialized garment worn by actor</strong> during motion capture session. Two type: <strong>Optical Mocap Suit</strong> — tight bodysuit + reflective marker, camera array track position. Vicon, OptiTrack standard. <strong>Inertial Mocap Suit</strong> — IMU sensor (gyroscope, accelerometer) embedded in suit. Rokoko, Xsens standard. No camera needed — works outdoor location.</p>
  <p>Markers / sensors placed at <strong>joint position</strong> — wrist, elbow, shoulder, hip, knee, ankle. ~40 marker standard humanoid mocap. System triangulate marker position từ multiple camera angle → 3D skeleton motion. Data captured 60-240fps. Applied to digital character via retargeting. Modern mocap captures face, finger, all detail.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Optical vs Inertial</span>
    <p><strong>Optical (Vicon)</strong>: highest precision. Studio setup expensive. Marker on suit. Requires line-of-sight camera. <strong>Inertial (Rokoko)</strong>: portable, outdoor capable. Less precise than optical. Sensor on suit. No camera. Each different use case.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Optical Mocap</strong> — camera + marker</li>
    <li><strong>Inertial Mocap</strong> — IMU sensor</li>
    <li><strong>Reflective Marker</strong> — passive optical</li>
    <li><strong>Active Marker</strong> — LED powered</li>
    <li><strong>Mocap Volume</strong> — capture area</li>
    <li><strong>Calibration</strong> — system init</li>
    <li><strong>Retargeting</strong> — apply character</li>
    <li><strong>Face Mocap</strong> — facial capture</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"mocap suit motion capture actor marker vicon andy serkis"</span>
    </div>
    <p class="arc-image-caption">Mocap Suit — capture actor performance, foundation CGI character</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Mocap Systems</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Vicon (Optical Pro)</summary>
      <div class="arc-card-body">
        <p>Industry gold standard. Used Avatar, Marvel, Weta. 24-100+ camera. Sub-millimeter precision. Multi-million dollar setup.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>OptiTrack</summary>
      <div class="arc-card-body">
        <p>Pro optical alternative. Used Pixar, indie studio. Modular pricing. Mid-tier pro option.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Xsens (Inertial Pro)</summary>
      <div class="arc-card-body">
        <p>Industry standard inertial. MVN suit. Used film, game. Portable, outdoor capable. $10K+ system.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Rokoko Smartsuit Pro</summary>
      <div class="arc-card-body">
        <p>Affordable inertial $2-5K. Indie/freelance accessible. Quality good. Popular YouTube animator.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Manus (Glove)</summary>
      <div class="arc-card-body">
        <p>Specialized finger mocap glove. Combine với body suit. Detail hand capture.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Faceware (Face Mocap)</summary>
      <div class="arc-card-body">
        <p>Head-mounted camera + markers on face. Industry standard facial mocap. Andy Serkis Gollum era.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Move.ai (AI Markerless)</summary>
      <div class="arc-card-body">
        <p>Modern AI-based — no marker, no suit. Phone camera. Revolutionary indie accessibility 2024+.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>iPhone Face Capture</summary>
      <div class="arc-card-body">
        <p>iPhone TrueDepth camera + ARKit. Face mocap accessible. Studio quality limited but viable.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Mocap Session Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Calibrate System</h3>
    <ul class="arc-list">
      <li>Capture volume calibrate</li>
      <li>Camera position aware</li>
      <li>Daily standard</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Suit Up Actor</h3>
    <ul class="arc-list">
      <li>Actor wear suit</li>
      <li>Verify marker stuck</li>
      <li>Comfortable, range motion</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. T-Pose Capture</h3>
    <ul class="arc-list">
      <li>Initial reference pose</li>
      <li>Skeleton mapping</li>
      <li>Pre-record calibration</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Performance Capture</h3>
    <ul class="arc-list">
      <li>Director, actor work scene</li>
      <li>Multiple take</li>
      <li>30-60 minute typical</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Real-Time Preview</h3>
    <ul class="arc-list">
      <li>Modern: live retarget character</li>
      <li>Director see performance</li>
      <li>Adjust direction</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Clean Up Data</h3>
    <ul class="arc-list">
      <li>Mocap data cleanup</li>
      <li>Fix marker dropout</li>
      <li>MotionBuilder standard tool</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Retarget Character</h3>
    <ul class="arc-list">
      <li>Apply mocap to digital model</li>
      <li>Proportion adjustment</li>
      <li>Final animation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Animator Polish</h3>
    <ul class="arc-list">
      <li>Refine mocap output</li>
      <li>Add details mocap miss</li>
      <li>Finger, face often manual</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; Famous</h2>
  <ul class="arc-list">
    <li><strong>Andy Serkis</strong> — Gollum, Caesar mocap pioneer</li>
    <li><strong>Mocap Studio</strong>: Weta Digital, Imageworks, Centroid</li>
    <li><strong>Hollywood mocap</strong>: $10-50K/day session</li>
    <li><strong>Career Mocap Technician</strong> — $50K-100K</li>
    <li><strong>Career Mocap Supervisor</strong> — $80K-180K</li>
    <li><strong>Indie Rokoko</strong> $2-5K setup affordable</li>
    <li><strong>Move.ai markerless</strong> — phone, future accessible</li>
    <li><strong>Used film, game, VR</strong> — wide application</li>
    <li><strong>Volumetric capture growing</strong> — full body 3D</li>
    <li><strong>Mocap accessible 2024</strong> — Move.ai, iPhone</li>
  </ul>
</section>
`,
  },

  // 09. Transcoding
  {
    id: "6592d532-fe69-415c-b0ce-d92595d0d5ab",
    tieu_de: "Transcoding",
    tieu_de_viet: "Transcoding (Chuyển đổi codec)",
    tom_tat:
      "Transcoding là chuyển đổi file video từ codec và định dạng này sang codec và định dạng khác — cần thiết khi phân phối lên nhiều nền tảng với yêu cầu khác nhau.",
    meta_title:
      "Transcoding là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Transcoding workflow. Tìm hiểu codec H.264, ProRes, DNxHD, workflow streaming, FFmpeg và HandBrake.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn deliver client video — they request HD MP4 for web, 4K ProRes for archive, mobile MP4 lower bitrate. Same content, multiple format. Solution: <strong>Transcoding</strong> — convert between codec/format. Foundation cho modern video distribution. Netflix transcode single master into 100+ format per stream. Foundation knowledge cho video editor, content creator.</p>
  <p>Transcoding là kỹ năng essential cho video editor, post engineer, content creator. Hiểu codec, container, workflow HandBrake/FFmpeg/Adobe Media Encoder giúp deliver content effectively per platform. Critical cho modern video distribution.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Transcoding là gì?</h2>
  <p>Transcoding là <strong>process converting video file</strong> từ one codec/format to another. Source might be ProRes 4K, output need H.264 1080p web ready. Two component: <strong>Codec</strong> (encoding algorithm — H.264, H.265, ProRes, DNxHD), <strong>Container</strong> (file format wrapper — MP4, MOV, MKV). Transcoding handle both potentially.</p>
  <p>Why need: <strong>Platform requirement</strong> (YouTube prefer H.264 MP4), <strong>Editing format</strong> (ProRes proxy edit > final delivery H.264), <strong>Storage</strong> (HDR 4K huge → web lower bitrate), <strong>Compatibility</strong> (old device need older codec), <strong>Quality vs size trade-off</strong>. Critical step content delivery pipeline.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Codec Categories</span>
    <p><strong>Delivery</strong>: H.264, H.265 — small file, lossy. Web standard. <strong>Editing</strong>: ProRes, DNxHD — large file, lossless. Editing performance. <strong>Archive</strong>: ProRes 4444 XQ, DNxHR — highest quality. <strong>Streaming</strong>: HLS, DASH adaptive bitrate.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Codec</strong> — encode algorithm</li>
    <li><strong>Container</strong> — file format</li>
    <li><strong>Bitrate</strong> — data per second</li>
    <li><strong>CBR vs VBR</strong> — bitrate control</li>
    <li><strong>2-Pass Encoding</strong> — better quality</li>
    <li><strong>HEVC (H.265)</strong> — newer efficient</li>
    <li><strong>Proxy Edit</strong> — low-res edit</li>
    <li><strong>Adaptive Streaming</strong> — multi-bitrate</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"transcoding video codec h.264 prores ffmpeg workflow"</span>
    </div>
    <p class="arc-image-caption">Transcoding — convert codec, foundation video distribution</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Codec Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>H.264 (AVC)</summary>
      <div class="arc-card-body">
        <p>Most widely supported. YouTube, Netflix standard delivery. Good quality reasonable size. Ubiquitous.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>H.265 (HEVC)</summary>
      <div class="arc-card-body">
        <p>Newer, ~50% better compression than H.264. Apple devices preferred. 4K, HDR. Slow encode.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>AV1</summary>
      <div class="arc-card-body">
        <p>Open-source modern codec. Royalty-free. YouTube, Netflix adopt. Slow encode currently. Future standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>ProRes (Apple)</summary>
      <div class="arc-card-body">
        <p>Editing codec. Large file but fast playback. ProRes 422, ProRes 4444 different quality. Industry standard editing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>DNxHD / DNxHR (Avid)</summary>
      <div class="arc-card-body">
        <p>Avid Media Composer editing codec. Similar role ProRes. Industry standard broadcast.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>RAW Codecs</summary>
      <div class="arc-card-body">
        <p>BRAW (Blackmagic), RED RAW, ARRI RAW. Camera raw recording. Highest quality post flexibility.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>MP4 Container</summary>
      <div class="arc-card-body">
        <p>Wrapper standard delivery. Holds H.264, H.265, AV1 typically. Universal compatibility.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>MOV Container</summary>
      <div class="arc-card-body">
        <p>QuickTime wrapper. Common Mac, professional. Holds ProRes, H.264.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Transcoding</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Identify Target</h3>
    <ul class="arc-list">
      <li>Platform delivery requirement</li>
      <li>YouTube vs Netflix vs broadcast</li>
      <li>Resolution, bitrate spec</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Choose Codec</h3>
    <ul class="arc-list">
      <li>Match platform requirement</li>
      <li>H.264 generic web</li>
      <li>H.265 modern device</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Set Bitrate</h3>
    <ul class="arc-list">
      <li>YouTube 1080p: 8 Mbps recommend</li>
      <li>4K: 35-45 Mbps</li>
      <li>VBR 2-pass better quality</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Resolution Scale</h3>
    <ul class="arc-list">
      <li>4K → 1080p downscale common</li>
      <li>Lanczos algorithm best quality</li>
      <li>Preserve aspect ratio</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Audio Codec</h3>
    <ul class="arc-list">
      <li>AAC standard MP4</li>
      <li>192 kbps sufficient stereo</li>
      <li>Surround AC3 different</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Color Space</h3>
    <ul class="arc-list">
      <li>Rec.709 standard web</li>
      <li>Rec.2020 HDR</li>
      <li>Match source</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Batch Encode</h3>
    <ul class="arc-list">
      <li>Multiple format same time</li>
      <li>Adobe Media Encoder queue</li>
      <li>Overnight render</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. QC Output</h3>
    <ul class="arc-list">
      <li>Verify quality acceptable</li>
      <li>Check audio sync</li>
      <li>Format compliance</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>Adobe Media Encoder</strong> — Premiere integrated</li>
    <li><strong>HandBrake</strong> — free, capable, easy</li>
    <li><strong>FFmpeg</strong> — command-line, ultimate flexibility</li>
    <li><strong>DaVinci Resolve</strong> — render queue</li>
    <li><strong>Apple Compressor</strong> — Final Cut companion</li>
    <li><strong>NVIDIA NVENC</strong> — GPU encoding faster</li>
    <li><strong>VBR 2-pass</strong> — better quality than CBR same size</li>
    <li><strong>Proxy workflow</strong> — edit low-res, conform high</li>
    <li><strong>Don&apos;t re-encode unnecessarily</strong> — quality degrade</li>
    <li><strong>Career Video Editor / Post Engineer</strong> — transcoding daily</li>
  </ul>
</section>
`,
  },

  // 10. Transition
  {
    id: "09346134-b74b-485c-b47b-49a56fed87df",
    tieu_de: "Transition (Chuyển cảnh)",
    tieu_de_viet: "Transition trong Video Editing",
    tom_tat:
      "Transition (chuyển cảnh) là cách làm cho các cảnh trong video, phim, hay tranh số đổi qua lại mượt mà, tự nhiên — foundation cho video editing pacing.",
    meta_title:
      "Transition là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Transition video editing Premiere. Tìm hiểu cut, dissolve, wipe, creative transition và best practice cho editor.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn edit video — cut hard giữa scene = jarring. Dissolve smooth = passage time. Wipe = energetic. Whoosh transition = TikTok style. <strong>Transition</strong> = critical editing tool. Choose wrong → break flow. Choose right → seamless storytelling. Foundation cho video editor. From classic cinema dissolve đến TikTok creative transition.</p>
  <p>Transition là kỹ năng essential cho video editor, filmmaker, content creator. Hiểu different transition type, when to use, software workflow giúp craft pacing rhythm. Foundation cho video editing — distinguish amateur hard-cut vs polished pro.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Transition là gì?</h2>
  <p>Transition là <strong>visual technique connecting two video clip</strong>. Most common: <strong>Cut</strong> — instant switch (90%+ all transition in film). <strong>Dissolve</strong> — gradual fade between clip. <strong>Wipe</strong> — line sweep one clip onto other. <strong>Fade</strong> — to black/white. Modern: <strong>Effects-based</strong> — whoosh, glitch, zoom, slide. TikTok creative transition.</p>
  <p>Editing principle: <strong>cut most invisible</strong> — best transition not noticed. Effects-based draw attention — only when artistic intent. Foundation cinema 100 năm cut. Modern social media diversify với creative effect. Pacing rhythm crucial — fast cut energetic, long take contemplative.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Transition Function</span>
    <p><strong>Cut</strong>: continuity, action. <strong>Dissolve</strong>: passage time, dreamy. <strong>Wipe</strong>: clear scene change, energetic. <strong>Fade to Black</strong>: scene/chapter end. <strong>Match Cut</strong>: visual rhyme. <strong>Whoosh</strong>: motion-driven energy. Choose match story intent.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Cut</strong> — instant</li>
    <li><strong>Dissolve / Crossfade</strong> — gradual</li>
    <li><strong>Wipe</strong> — sweep</li>
    <li><strong>Fade In/Out</strong> — to black</li>
    <li><strong>Match Cut</strong> — visual rhyme</li>
    <li><strong>Jump Cut</strong> — same subject</li>
    <li><strong>Whoosh</strong> — sound + motion</li>
    <li><strong>Glitch</strong> — modern style</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"transition video editing premiere cut dissolve wipe creative"</span>
    </div>
    <p class="arc-image-caption">Transition — bridge scene, foundation editing rhythm</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Transition Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Cut (Standard)</summary>
      <div class="arc-card-body">
        <p>Instant switch frame. Foundation editing. 90%+ all transition. Invisible when timing right. Continuity, action follow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Dissolve / Cross-Dissolve</summary>
      <div class="arc-card-body">
        <p>Gradual fade between two clip. 1-2 sec typical. Passage of time, dreamy. Classic technique.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Fade to Black</summary>
      <div class="arc-card-body">
        <p>Fade out to black screen. Scene/act end. Chapter break. Classic cinematic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Fade from Black</summary>
      <div class="arc-card-body">
        <p>Open scene from black. Beginning. Wake up moment.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Wipe</summary>
      <div class="arc-card-body">
        <p>Line sweep across frame. Star Wars iconic. Older style. Energetic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Match Cut</summary>
      <div class="arc-card-body">
        <p>Match visual element between scene. 2001 Space Odyssey bone → satellite. Sophisticated.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Jump Cut</summary>
      <div class="arc-card-body">
        <p>Same subject, different position/time. YouTuber speaking technique. Modern editing convention.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>L-Cut / J-Cut</summary>
      <div class="arc-card-body">
        <p>Audio lead/lag visual. Sound continue while picture cut. Dialog overlap. Pro editor technique.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Whoosh / Sound-Driven</summary>
      <div class="arc-card-body">
        <p>Motion blur + whoosh SFX. TikTok modern. Energetic feel.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>When to Use</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cut (Default)</h3>
    <ul class="arc-list">
      <li>Action continuity</li>
      <li>Conversation</li>
      <li>Most edit invisible</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Dissolve</h3>
    <ul class="arc-list">
      <li>Passage of time</li>
      <li>Memory flashback</li>
      <li>Slow scene change</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Fade to Black</h3>
    <ul class="arc-list">
      <li>Act / chapter end</li>
      <li>Emotional pause</li>
      <li>Sleep / unconscious</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Wipe</h3>
    <ul class="arc-list">
      <li>Stylized, retro</li>
      <li>Energetic transition</li>
      <li>Use sparingly</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Match Cut</h3>
    <ul class="arc-list">
      <li>Visual rhyme</li>
      <li>Thematic connection</li>
      <li>Sophisticated</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Whoosh Effect</h3>
    <ul class="arc-list">
      <li>Modern social media</li>
      <li>Music video</li>
      <li>Energetic content</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>Premiere Pro</strong> — Effects panel transition</li>
    <li><strong>Final Cut Pro</strong> — built-in transition</li>
    <li><strong>DaVinci Resolve</strong> — capable</li>
    <li><strong>CapCut mobile</strong> — preset modern</li>
    <li><strong>Motion Array, Envato</strong> — transition pack</li>
    <li><strong>Cut 90% of time</strong> — over-transition amateur tell</li>
    <li><strong>Match audio</strong> — L/J cut pro</li>
    <li><strong>Don&apos;t use cheesy</strong> — page peel, star wipe</li>
    <li><strong>Custom whoosh</strong> — sound design matter</li>
    <li><strong>Career Editor</strong> — transition mastery basic skill</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 3 · Batch 7 — chạy ${items.length} bài keyword (Q → Z) ──\n`,
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
