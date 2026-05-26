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
  // 01. Prototype
  {
    id: "921a2627-7db0-4b43-bf4a-ac789a229066",
    tieu_de: "Prototype",
    tieu_de_viet: "Bản mẫu thử nghiệm (Prototype)",
    tom_tat:
      "Prototype là phiên bản thử nghiệm ban đầu của sản phẩm hoặc thiết kế — trong UX/UI dùng để test ý tưởng với người dùng, trong game dùng để kiểm tra gameplay trước khi production.",
    meta_title: "Prototype là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Prototype trong UX/UI, game design, product. Tìm hiểu fidelity level, tools Figma, Unity và workflow validate idea.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn UX designer thiết kế mobile app — design Figma đẹp. Trước khi development tốn $50K-200K, làm gì? <strong>Prototype</strong> — interactive Figma version test với 5-10 user, find usability issue, adjust. Game designer cùng workflow — paper prototype, gray-box level test fun gameplay trước khi commit asset production. Prototype = validation cheap, before expensive.</p>
  <p>Prototype là kỹ thuật critical cho mọi creative profession — UX designer, game designer, product designer, animator. Hiểu fidelity level, tools, validation methodology giúp test idea fast, iterate cheap — distinguish successful project và expensive failure.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Prototype là gì?</h2>
  <p>Prototype là <strong>early test version</strong> của product, design, or concept — built quickly để validate idea, test với user/audience, find problem before investment in full production. Fidelity range from <strong>paper sketch</strong> (lowest) đến <strong>polished interactive demo</strong> (high). Lower fidelity = faster, cheaper iteration. Higher fidelity = better signal but more cost.</p>
  <p>Cross-discipline application: <strong>UX/UI</strong> (Figma interactive), <strong>Game Design</strong> (paper, gray-box), <strong>Product Design</strong> (3D printed, CAD), <strong>Service Design</strong> (role-play, wireframe), <strong>Animation</strong> (animatic), <strong>Music</strong> (demo recording). Common principle: cheap version first, expensive version after validation.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Prototype Fidelity Levels</span>
    <p><strong>Low-Fi</strong>: paper sketch, wireframe. Hours to make. Test concept. <strong>Mid-Fi</strong>: clickable Figma, basic gameplay. Days. Test flow. <strong>High-Fi</strong>: polished interactive, vertical slice. Weeks. Test polish, performance, marketing. Pick fidelity matching question being answered.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Paper Prototype</strong> — sketch lowest fi</li>
    <li><strong>Wireframe</strong> — basic layout</li>
    <li><strong>Mockup</strong> — visual design no interaction</li>
    <li><strong>Interactive Prototype</strong> — clickable</li>
    <li><strong>Vertical Slice</strong> — game polished section</li>
    <li><strong>MVP</strong> — Minimum Viable Product</li>
    <li><strong>POC</strong> — Proof of Concept</li>
    <li><strong>User Testing</strong> — validate với real user</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"prototype design figma interactive UX game development"</span>
    </div>
    <p class="arc-image-caption">Prototype — early test version, validate idea cheap before expensive</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Prototype Per Discipline</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>UX / UI Prototype</summary>
      <div class="arc-card-body">
        <p>Figma, Adobe XD interactive. Click flow through screen. User test 5-10 user. Find usability issue. Standard before development.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Game Prototype</summary>
      <div class="arc-card-body">
        <p>Paper prototype (board game card test), gray-box (untextured 3D level), playable demo. Test &quot;is game fun?&quot; before commit asset.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Vertical Slice (Game)</summary>
      <div class="arc-card-body">
        <p>One polished section. Final quality. Marketing material, investor pitch, team alignment. 3-6 month effort.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Product Prototype</summary>
      <div class="arc-card-body">
        <p>Physical product — 3D printed, CNC machined, hand-built. Test ergonomic, function. Multiple iteration.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>App MVP</summary>
      <div class="arc-card-body">
        <p>Minimum Viable Product. Functional but minimal feature. Launch to gather user feedback. Lean Startup methodology.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Animation Animatic</summary>
      <div class="arc-card-body">
        <p>Storyboard with timing — rough animation test. Pacing assessment before expensive full animation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Code Proof of Concept</summary>
      <div class="arc-card-body">
        <p>Programming POC — test if technology approach works. Throw-away code typically. Engineering validation.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Prototyping Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Define Question</h3>
    <ul class="arc-list">
      <li>What do you want to validate?</li>
      <li>Usability? Engagement? Technical feasibility?</li>
      <li>Different question = different prototype</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Choose Fidelity</h3>
    <ul class="arc-list">
      <li>Low-fi cho concept exploration</li>
      <li>High-fi cho polish, marketing</li>
      <li>Match to question</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Build Quickly</h3>
    <ul class="arc-list">
      <li>Throwaway code/asset OK</li>
      <li>Don&apos;t polish unnecessarily</li>
      <li>Time-box: day, week, month max</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Test với User</h3>
    <ul class="arc-list">
      <li>5-10 user usability test</li>
      <li>Game: playtester</li>
      <li>Observe behavior, not just opinion</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Analyze</h3>
    <ul class="arc-list">
      <li>Where users struggle?</li>
      <li>What works well?</li>
      <li>Quantitative + qualitative</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Iterate or Pivot</h3>
    <ul class="arc-list">
      <li>Adjust prototype based on learning</li>
      <li>Major issue → pivot direction</li>
      <li>Or commit production</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Production Hand-Off</h3>
    <ul class="arc-list">
      <li>Validated prototype → spec for production</li>
      <li>Development team build real version</li>
      <li>Confidence based on prototype validation</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>UX</strong>: Figma, Adobe XD, Sketch, ProtoPie, Framer</li>
    <li><strong>Game prototype</strong>: Unity (gray-box), GameMaker, paper card</li>
    <li><strong>Animation</strong>: Storyboard Pro, Toon Boom animatic</li>
    <li><strong>3D Print</strong>: Bambu Lab, Prusa cho physical prototype</li>
    <li><strong>Code POC</strong>: Jupyter notebook, quick script</li>
    <li><strong>Tip</strong>: prototype is disposable — don&apos;t emotional attached</li>
    <li><strong>Tip</strong>: test với target user, not friend/family</li>
    <li><strong>Tip</strong>: leading question bias result — neutral language</li>
    <li><strong>Tip</strong>: more prototype iteration = better final product</li>
    <li><strong>Lean Startup</strong> methodology — build-measure-learn loop</li>
  </ul>
</section>
`,
  },

  // 02. Proxy
  {
    id: "5e88f731-5c38-4065-b83c-7daccbd5be9a",
    tieu_de: "Proxy",
    tieu_de_viet: "Proxy (File chất lượng thấp)",
    tom_tat:
      "Proxy là phiên bản chất lượng thấp hơn của footage dùng trong editing để tăng tốc độ làm việc — phần mềm dựng phim tự động link lại với file gốc khi export.",
    meta_title: "Proxy là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Proxy workflow Premiere, DaVinci Resolve. Tìm hiểu cách tạo proxy, format ProRes Proxy và workflow chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn editor 4K wedding video — 100GB raw footage. Mở Premiere, drag clip vào timeline. Lag mạnh — playback choppy, scrubbing impossible. Solution: <strong>Proxy</strong> — generate low-resolution version of clip, edit smooth. Final export auto-links back to original 4K. Standard workflow cho modern video editor working với high-resolution source.</p>
  <p>Proxy là kỹ thuật essential cho video editor working với high-resolution footage (4K, 6K, 8K, RAW). Hiểu workflow, format, software-specific implementation giúp edit smooth ngay trên modest computer — distinguish efficient pro vs slow workflow.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Proxy là gì?</h2>
  <p>Proxy là <strong>lower-quality version</strong> của video file dùng trong editing để improve performance. Original file remains untouched at full quality. NLE (Premiere, DaVinci Resolve, FCP) link clip to proxy during edit, automatically swap back to original at export. Result: smooth editing experience even on modest hardware với heavy footage.</p>
  <p>Why needed: <strong>4K footage</strong> requires significant processing — decoding H.264/H.265 4K real-time taxes CPU/GPU. <strong>RAW footage</strong> (BRAW, REDcode) extreme. <strong>Multicam edit</strong> multiple streams. Proxy at 720p ProRes Proxy plays smooth on laptop. Workflow universal across pro editor.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Proxy Format Standard</span>
    <p><strong>ProRes Proxy</strong>: Apple standard, fast decode, decent quality. <strong>DNxHD/HR</strong>: Avid standard equivalent. <strong>H.264 low-bitrate</strong>: smallest size, sometimes slower decode. <strong>Cineform</strong>: GoPro Cineform good balance. ProRes Proxy most common cho cross-platform compatibility.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Original Media</strong> — full quality untouched</li>
    <li><strong>Proxy Media</strong> — low-res copy</li>
    <li><strong>Auto Link</strong> — software switch automatically</li>
    <li><strong>ProRes Proxy</strong> — common format</li>
    <li><strong>Toggle Proxy</strong> — switch on/off in editor</li>
    <li><strong>Render Time</strong> — initial proxy creation</li>
    <li><strong>Storage</strong> — proxy adds ~10-20% extra storage</li>
    <li><strong>Color Reference</strong> — proxy approximate color, final at original</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"proxy workflow premiere DaVinci 4K editing video"</span>
    </div>
    <p class="arc-image-caption">Proxy — low-res edit copy, smooth performance on heavy footage</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Proxy Workflow Per Software</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Adobe Premiere Pro</summary>
      <div class="arc-card-body">
        <p>Built-in Ingest Settings → Create Proxies. Auto-generate khi import. Toggle proxy button trong Source/Program monitor. Standard cho most video editor.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>DaVinci Resolve</summary>
      <div class="arc-card-body">
        <p>Generate Optimized Media. Or use Camera RAW with debayer at lower quality. Render at full quality. Native proxy command + dedicated workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Final Cut Pro</summary>
      <div class="arc-card-body">
        <p>Optimized Media (ProRes 422) hoặc Proxy Media (ProRes Proxy). Auto-generate option. Easy toggle View menu.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Avid Media Composer</summary>
      <div class="arc-card-body">
        <p>DNxHD/HR proxy. Industry standard broadcast. Dynamic Media Folder workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>After Effects</summary>
      <div class="arc-card-body">
        <p>Create Proxy command in Footage menu. Less common than NLE workflow. Pre-render heavy comp instead.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>EditReady / Shutter Encoder</summary>
      <div class="arc-card-body">
        <p>External proxy creation tools. Batch convert before import. Sometimes faster than in-NLE creation.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Steps</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Import Media</h3>
    <ul class="arc-list">
      <li>Original 4K/RAW footage</li>
      <li>Enable proxy ingest option</li>
      <li>Choose proxy format</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Generate Proxy</h3>
    <ul class="arc-list">
      <li>Background process</li>
      <li>Time depends footage volume</li>
      <li>Can continue editing while generate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Edit with Proxy</h3>
    <ul class="arc-list">
      <li>Toggle proxy on</li>
      <li>Edit smoothly</li>
      <li>Multiple stream playback</li>
      <li>Real-time scrubbing</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Color Reference Original</h3>
    <ul class="arc-list">
      <li>Color grade often need original quality</li>
      <li>Toggle off proxy cho grade</li>
      <li>Then back to proxy for cut work</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Lock Edit</h3>
    <ul class="arc-list">
      <li>Picture lock</li>
      <li>Switch to original for final review</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Export</h3>
    <ul class="arc-list">
      <li>Software auto-uses original</li>
      <li>Full quality output</li>
      <li>Proxy ignored</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Archive</h3>
    <ul class="arc-list">
      <li>Original stored long-term</li>
      <li>Proxy may delete to save space</li>
      <li>Can regenerate if needed</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Best Practices</h2>
  <ul class="arc-list">
    <li><strong>Storage planning</strong> — proxy adds ~10-30% extra</li>
    <li><strong>Generate overnight</strong> — large project, run generation overnight</li>
    <li><strong>SSD external</strong> — proxy on SSD = faster than internal HDD</li>
    <li><strong>Multicam edit</strong> — proxy essential cho multiple stream</li>
    <li><strong>RAW footage</strong> — proxy almost mandatory</li>
    <li><strong>Toggle test</strong> — verify original linked correctly before export</li>
    <li><strong>Naming convention</strong> — keep original và proxy organized</li>
    <li><strong>Don&apos;t color grade on proxy</strong> — color shift possible</li>
    <li><strong>Free up storage</strong> — delete proxy after project complete</li>
    <li><strong>Cloud collaboration</strong> — Frame.io proxy upload cho remote review</li>
  </ul>
</section>
`,
  },

  // 03. Proxy Model
  {
    id: "49f7beac-f91e-4fa2-b345-115bc9f153da",
    tieu_de: "Proxy Model",
    tieu_de_viet: "Proxy Model trong 3D",
    tom_tat:
      "Proxy Model là mô hình 3D đơn giản hóa với polygon count thấp hơn nhiều so với mô hình gốc — dùng để tăng tốc xử lý và xem trước trong viewport các cảnh phức tạp.",
    meta_title: "Proxy Model là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Proxy Model trong 3D modeling. Tìm hiểu workflow Maya, V-Ray Proxy, Render Proxy và optimization heavy scene.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn archviz artist build interior scene — 50 chair, 30 table, hundreds plant. Each model 100K-1M polygon. Scene total: hundreds of million polygon. Maya/3ds Max crash trying load. Solution: <strong>Proxy Model</strong> — display low-poly version trong viewport, render full quality at render time. Workflow essential cho complex scene.</p>
  <p>Proxy Model là kỹ thuật essential cho 3D artist working complex scene — archviz, environment art, VFX. Hiểu workflow, render engine specific implementation giúp work efficiently với heavy scene without crash. Critical productivity cho production.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Proxy Model là gì?</h2>
  <p>Proxy Model là <strong>lightweight representation</strong> của heavy 3D asset trong viewport. Original high-poly model stored on disk hoặc unloaded từ memory. Viewport displays low-poly proxy hoặc bounding box. At render time, render engine loads original high-poly model. Result: viewport stays responsive, heavy scene possible.</p>
  <p>Different from <strong>LOD (Level of Detail)</strong> — LOD swap based on distance at runtime (game-focused). Proxy specifically for production scene management. Common cho: <strong>Foliage</strong> (thousands tree), <strong>Furniture library</strong> (heavy archviz asset), <strong>Crowd</strong> (many character), <strong>Detail asset</strong> (intricate decorative).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Proxy Model vs LOD vs Instance</span>
    <p><strong>Proxy</strong>: viewport low-poly, render full. Production workflow. <strong>LOD</strong>: multiple version, runtime swap by distance. Game workflow. <strong>Instance</strong>: same model used multiple time, share data. Memory optimization. All three combined cho complex production scene.</p>
  </div>

  <ul class="arc-list">
    <li><strong>V-Ray Proxy</strong> — Chaos Group render engine</li>
    <li><strong>Arnold Procedural</strong> — Maya, Houdini</li>
    <li><strong>Redshift Proxy</strong> — Redshift renderer</li>
    <li><strong>Maya Reference</strong> — load on demand</li>
    <li><strong>Blender Linked Library</strong> — external file</li>
    <li><strong>Houdini Packed Primitive</strong></li>
    <li><strong>Bounding Box Display</strong> — simplest proxy</li>
    <li><strong>Instance</strong> — share original data</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"proxy model 3D archviz vray render heavy scene optimization"</span>
    </div>
    <p class="arc-image-caption">Proxy Model — lightweight viewport, render full quality</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Proxy Per Software</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>V-Ray Proxy (.vrmesh)</summary>
      <div class="arc-card-body">
        <p>Chaos Group standard. Convert mesh to .vrmesh file. Display low-poly preview viewport, render full. Archviz standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Arnold Standin / Procedural</summary>
      <div class="arc-card-body">
        <p>Maya/3ds Max Arnold proxy. .ass file. Render-time load. Used VFX, animation production.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Redshift Proxy</summary>
      <div class="arc-card-body">
        <p>Redshift renderer proxy format. Fast load. Modern GPU renderer workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Maya Reference</summary>
      <div class="arc-card-body">
        <p>Maya built-in. Reference external .ma/.mb file. Load on demand. Can show low-poly proxy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3ds Max XRef</summary>
      <div class="arc-card-body">
        <p>External reference. Heavy asset external file. Memory efficient.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender Linked Library</summary>
      <div class="arc-card-body">
        <p>Link to external .blend file. Object instance shared. Memory efficient. Free workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Houdini Packed Primitive</summary>
      <div class="arc-card-body">
        <p>Pack complex geometry into single primitive. Light viewport, full at render. Procedural workflow integration.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>USD (Universal Scene Description)</summary>
      <div class="arc-card-body">
        <p>Pixar open standard. Layered scene. Asset can be proxied via USD. Modern pipeline.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Use Cases &amp; Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Archviz Interior</h3>
    <ul class="arc-list">
      <li>Furniture library proxied</li>
      <li>Plant, vegetation proxied</li>
      <li>Repeating asset instance</li>
      <li>Heavy scene possible</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX Environment</h3>
    <ul class="arc-list">
      <li>Forest with thousands tree</li>
      <li>City with hundreds building detail</li>
      <li>Battle scene with crowd</li>
      <li>All via proxy</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Foliage Scatter</h3>
    <ul class="arc-list">
      <li>Grass, weed, flower scatter</li>
      <li>Each instance = proxy</li>
      <li>Render millions of element</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Workflow Create Proxy</h3>
    <ul class="arc-list">
      <li>Build high-poly model</li>
      <li>Right-click → Convert to Proxy / Export Proxy</li>
      <li>Choose location for proxy file</li>
      <li>Original file stays, proxy reference replaces</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Library Management</h3>
    <ul class="arc-list">
      <li>Studio maintain proxy library</li>
      <li>Categorized — furniture, vegetation, props</li>
      <li>Reusable across project</li>
      <li>Standardized naming</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Render Setup</h3>
    <ul class="arc-list">
      <li>Render engine loads proxy original</li>
      <li>Full poly detail at render time</li>
      <li>Memory carefully managed</li>
      <li>Multi-pass render for very heavy</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Best Practices</h2>
  <ul class="arc-list">
    <li><strong>Use proxy early</strong> — don&apos;t wait til crash</li>
    <li><strong>Naming convention</strong> — track proxy files clearly</li>
    <li><strong>Material on proxy</strong> — assign during proxy creation</li>
    <li><strong>Display mode</strong> — choose between bounding box, low-poly preview based on need</li>
    <li><strong>Texture path</strong> — ensure proxy texture path correct</li>
    <li><strong>RAM management</strong> — render time RAM still need</li>
    <li><strong>Network rendering</strong> — proxy file accessible to render nodes</li>
    <li><strong>Backup original</strong> — proxy file should not be only copy</li>
    <li><strong>Test render</strong> — verify proxy renders correctly before final</li>
    <li><strong>Library building</strong> — invest in good proxy library = long-term productivity</li>
  </ul>
</section>
`,
  },

  // 04. Puppet
  {
    id: "990985d2-07c4-4a39-a4f0-aa1436652c67",
    tieu_de: "Puppet Tool (After Effects)",
    tieu_de_viet: "Công cụ Puppet trong After Effects",
    tom_tat:
      "Puppet là công cụ trong After Effects cho phép deform và animate ảnh phẳng bằng cách đặt pin và kéo mesh — tạo chuyển động organic cho nhân vật 2D mà không cần rigging phức tạp.",
    meta_title:
      "Puppet Tool là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Puppet Tool After Effects. Tìm hiểu Puppet Pin, Advanced, Starch, Overlap và workflow rig character 2D nhanh.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn motion designer cần animate character 2D đơn giản — character đứng wave hand. Method 1: traditional frame-by-frame animation (tedious). Method 2: Duik / Joysticks rigging (complex). Method 3: <strong>Puppet Tool</strong> — place pin trên hand, joint, head — drag để animate. 10x faster than alternatives cho simple character animation. AE built-in essential tool.</p>
  <p>Puppet Tool là kỹ thuật essential cho motion designer working with character animation, illustration, infographic. Hiểu các Puppet Pin type (Position, Starch, Overlap, Bend, Advanced) và workflow giúp animate 2D character efficiently — distinguish quick productivity vs slow keyframe animation.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Puppet Tool là gì?</h2>
  <p>Puppet Tool là <strong>built-in After Effects tool</strong> cho deform và animate static image. Workflow: place <strong>Puppet Pin</strong> on key point (joint, anchor) → AE auto-create mesh under image → drag pin to deform mesh → animate pin position over time = animation. Result: organic motion impossible với traditional keyframe transformation.</p>
  <p>Multiple Puppet Pin types: <strong>Puppet Position Pin</strong> (most common, basic deform), <strong>Puppet Starch Pin</strong> (stiffen area resist deform), <strong>Puppet Overlap Pin</strong> (control which area in front when overlap), <strong>Puppet Bend Pin</strong> (rotate, scale), <strong>Puppet Advanced Pin</strong> (recent — rotate, scale, position combine). AE 2018+ Advanced Pin most powerful.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Puppet vs Bone Rig vs Frame-by-Frame</span>
    <p><strong>Puppet</strong>: pin-based mesh deform. Fast setup, less control. <strong>Bone Rig (Duik)</strong>: proper rigging, more control, more setup time. <strong>Frame-by-Frame</strong>: hand-drawn animation. Most artistic, slowest. Choose based on complexity và time. Puppet for simple character, Duik for complex.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Puppet Position Pin</strong> — basic deform</li>
    <li><strong>Puppet Starch Pin</strong> — stiffen area</li>
    <li><strong>Puppet Overlap Pin</strong> — Z order control</li>
    <li><strong>Puppet Bend Pin</strong> — rotate/scale</li>
    <li><strong>Puppet Advanced Pin</strong> — all-in-one modern</li>
    <li><strong>Mesh</strong> — auto-generated below image</li>
    <li><strong>Expansion</strong> — mesh boundary control</li>
    <li><strong>Mesh Triangles</strong> — density of deform mesh</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"puppet tool after effects character 2D animation pin"</span>
    </div>
    <p class="arc-image-caption">Puppet Tool — pin-based deform, organic 2D character animation</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Puppet Pin Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Puppet Position Pin</summary>
      <div class="arc-card-body">
        <p>Most basic. Place pin → drag to deform. Each pin acts as anchor for mesh. Multiple pin needed cho controlled animation. Foundation Puppet Tool.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Puppet Starch Pin</summary>
      <div class="arc-card-body">
        <p>Stiffens area — prevent deform. Use on rigid parts (head, prop). Combine với Position Pin cho controlled deformation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Puppet Overlap Pin</summary>
      <div class="arc-card-body">
        <p>Controls which area appears in front when overlap. Cho arm cross body, hand in front. Z-depth illusion in 2D.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Puppet Bend Pin</summary>
      <div class="arc-card-body">
        <p>Rotate, scale at pin point. Adds joint-like behavior. Pre-Advanced Pin (CC 2018), less used now.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Puppet Advanced Pin (CC 2018+)</summary>
      <div class="arc-card-body">
        <p>Combines Position + Rotation + Scale in single pin. Hold Alt as place pin = Advanced. Most powerful modern option. Use cho joint character animation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mesh Settings</summary>
      <div class="arc-card-body">
        <p>Triangles count — higher = smoother deform, slower performance. Expansion — extend mesh beyond image edge to prevent clipping at deform.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Animate Character</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Prepare Layer</h3>
    <ul class="arc-list">
      <li>Import character illustration (PSD, AI)</li>
      <li>Separate body parts on different layers cho complex character</li>
      <li>Single layer for simple character</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Apply Puppet Tool</h3>
    <ul class="arc-list">
      <li>Select layer</li>
      <li>Press Ctrl+P (Puppet Tool)</li>
      <li>Click on image to place pin</li>
      <li>Mesh auto-generated</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Place Pin Strategically</h3>
    <ul class="arc-list">
      <li>Joint location (shoulder, elbow, wrist)</li>
      <li>Anchor point — neck connect body</li>
      <li>Hand, foot extremity</li>
      <li>5-10 pin typical character</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Test Deformation</h3>
    <ul class="arc-list">
      <li>Drag pin to see deform</li>
      <li>Add Starch Pin if area deforms unwantedly</li>
      <li>Add more pin for control</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Set Initial Pose Keyframe</h3>
    <ul class="arc-list">
      <li>Move time to frame 0</li>
      <li>Each pin position keyframe</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Animate</h3>
    <ul class="arc-list">
      <li>Move time forward</li>
      <li>Drag pin to new position</li>
      <li>Keyframe automatically</li>
      <li>Build animation pose-to-pose</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Refine với Easing</h3>
    <ul class="arc-list">
      <li>Apply ease in/out</li>
      <li>Smooth motion natural</li>
      <li>Avoid linear robotic feel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Loop / Cycle</h3>
    <ul class="arc-list">
      <li>For walk cycle, match first frame at end</li>
      <li>Loop expressions</li>
      <li>Reusable animation</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Best Practices</h2>
  <ul class="arc-list">
    <li><strong>Anchor pin first</strong> — stationary part (hips, neck) before moving part</li>
    <li><strong>Starch sparingly</strong> — overuse stiff unnatural</li>
    <li><strong>Expansion higher</strong> — prevent clipping at deform edge</li>
    <li><strong>Advanced Pin modern</strong> — use over basic Position Pin when possible</li>
    <li><strong>Test cho intended motion</strong> — drag pin to validate before animate</li>
    <li><strong>Separate layer cho complex</strong> — body parts on own layer, each puppet separate</li>
    <li><strong>Combine với traditional</strong> — Position transform + Puppet detail</li>
    <li><strong>Overlapping action</strong> — secondary motion (cloth, hair) via expressions</li>
    <li><strong>Performance heavy</strong> — many puppet pin slow viewport — pre-render</li>
    <li><strong>Plugin extend</strong>: Joysticks &apos;n Sliders (paid) — make puppet rig with controller</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 2 · Batch 10 (CUỐI) — chạy ${items.length} bài keyword (I → P) ──\n`,
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
  `SELECT COUNT(*) AS con_lai_dot2
FROM article_bai_viet
WHERE loai_bai_viet = 'keyword'
  AND (noi_dung IS NULL OR noi_dung = '')
  AND tieu_de >= 'I' AND tieu_de < 'Q'`,
  "read",
);
const conLai = remain.rows?.[0]?.con_lai_dot2;

console.log(`\nCòn lại đợt 2: ${conLai} bài.`);

if (conLai === "0" || conLai === 0) {
  console.log("\n🎉 HOÀN THÀNH ĐỢT 2 (I → P)!\n");
}
