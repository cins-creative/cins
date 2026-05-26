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
  // 01. Creature Design
  {
    id: "91f699d1-4b8b-4172-b470-6be91f0265c4",
    tieu_de: "Creature Design",
    tieu_de_viet: "Thiết kế sinh vật (Creature Design)",
    tom_tat:
      "Creature Design là nghệ thuật thiết kế sinh vật hư cấu — quái vật, alien, sinh vật giả tưởng — kết hợp anatomy, behavior, world-building để tạo creature đáng tin cậy. Một trong những nhánh khó nhất của concept art.",
    meta_title: "Creature Design là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Creature Design là nghệ thuật thiết kế sinh vật hư cấu. Tìm hiểu quy trình, anatomy nền tảng và ứng dụng trong game, phim, fantasy world.",
    noi_dung: `
<section class="arc-intro">
  <p>Xenomorph trong Alien, Ridley trong Metroid, Trico trong The Last Guardian — những sinh vật để lại ấn tượng sâu sắc đến mức ăn sâu vào pop culture. Đằng sau mỗi creature đó là creature designer — nghệ sĩ phải kết hợp imagination với khoa học để tạo ra sinh vật &quot;không có thật&quot; nhưng nhìn vẫn &quot;tin được&quot;.</p>
  <p>Creature Design là một trong những nhánh khó nhất của concept art — không chỉ vẽ đẹp mà còn phải design có logic. Hiểu workflow và principles của creature design giúp những ai muốn theo nghề định hướng kỹ năng cần phát triển: anatomy, biology, design thinking.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Creature Design là gì?</h2>
  <p>Creature Design là quá trình thiết kế các sinh vật hư cấu (fictional creatures) cho phim, game, animation, illustration. Bao gồm visual design (hình dáng, anatomy, texture) và conceptual design (behavior, ecology, role trong world). Mục tiêu: tạo ra creature unique nhưng credible — đủ lạ để hấp dẫn, đủ logic để người xem tin.</p>
  <p>Creature designer thường phải vẽ creature ở nhiều stage: thumbnail nhanh để explore, refined sketch để show team, final concept với chi tiết và lighting. Một creature design tốt = sự kết hợp giữa anatomy thật (mượn từ động vật existing), trí tưởng tượng, và functional design phù hợp với role của creature trong câu chuyện.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Credible design = thuyết phục người xem</span>
    <p>Xenomorph &quot;đáng sợ&quot; vì design có logic — mỗi bộ phận có vẻ có chức năng (đầu lưỡi cắn, tay claw, đuôi đâm). Creature trong B-movie kém ấn tượng vì design tùy tiện — không có logic ecology, anatomy lộn xộn. &quot;Suspend disbelief&quot; là mục tiêu của mọi creature designer.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Silhouette</strong> — hình silhouette nhận diện được</li>
    <li><strong>Anatomy</strong> — cấu trúc cơ thể logic, có skeleton</li>
    <li><strong>Functional Design</strong> — mỗi bộ phận có purpose</li>
    <li><strong>Behavior &amp; Personality</strong> — design phản ánh cách creature hoạt động</li>
    <li><strong>Ecology</strong> — creature sống ở đâu, ăn gì, săn mồi hay con mồi</li>
    <li><strong>Reference (real world)</strong> — mượn từ động vật/insect/plant thật</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"creature design concept art monster fantasy"</span>
    </div>
    <p class="arc-image-caption">Creature design — anatomy logic, silhouette mạnh, kết hợp reference thật</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Quy trình Creature Design</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Brief &amp; Research</summary>
      <div class="arc-card-body">
        <p>Đọc brief: creature role (villain, ally), environment, scale, behavior. Research reference từ động vật thật — đặc biệt loại creature inspired (deep sea creature cho underwater alien, insect cho hostile).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Thumbnail Silhouette</summary>
      <div class="arc-card-body">
        <p>Vẽ 20-50 thumbnail silhouette đen — focus vào shape readable, unique. Test &quot;5-second recognition&quot; — designer khác nhìn 5 giây phải remember.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Anatomy Sketch</summary>
      <div class="arc-card-body">
        <p>Chọn 3-5 thumbnail tốt nhất, phát triển anatomy. Vẽ skeleton structure first — đảm bảo creature có thể move logical. Add muscle, organ placement.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Refined Design</summary>
      <div class="arc-card-body">
        <p>Top 1-2 anatomy được refine với chi tiết surface (skin, fur, scale, texture). Add color study, lighting. Show movement potential, expression.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Final Render &amp; Turnaround</summary>
      <div class="arc-card-body">
        <p>Final painting với background, lighting cinematic. Turnaround (front, side, back) để 3D modeler reference.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Creature Design trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim &amp; VFX</h3>
    <ul class="arc-list">
      <li>Studio: WETA (Lord of the Rings, Avatar), ILM (Star Wars creatures), MPC</li>
      <li>Process: concept art → 3D sculpt → animation rig → VFX integration</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game</h3>
    <ul class="arc-list">
      <li>Studio: From Software (Dark Souls boss design), Blizzard (WoW creatures), Riot (LoL champions/monsters)</li>
      <li>Variety: 10-100+ creature variations cho một game RPG</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation</h3>
    <ul class="arc-list">
      <li>Pixar, DreamWorks: stylized creatures (Monsters Inc, How to Train Your Dragon)</li>
      <li>Anime: Studio Ghibli (Totoro, No-Face) iconic creature design</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Tabletop &amp; Card Games</h3>
    <ul class="arc-list">
      <li>D&amp;D Monster Manual, Magic: The Gathering creature cards</li>
      <li>Pathfinder, Warhammer — design huge variety of creatures</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips để trở thành Creature Designer</h2>
  <ul class="arc-list">
    <li><strong>Study real animals</strong> — anatomy của lion, eagle, octopus, mantis là vàng cho design</li>
    <li><strong>Visit zoo, aquarium</strong> — sketch sinh vật thật, hiểu chuyển động</li>
    <li><strong>Anatomy book</strong> — Bridgman, Hampton cho human; Vilppu cho gesture</li>
    <li><strong>Practice silhouette daily</strong> — 20 thumbnail/ngày, train shape recognition</li>
    <li><strong>Watch documentary</strong> — David Attenborough, Blue Planet — reference behavior</li>
    <li><strong>Study masters</strong> — Aaron Sims, Carlos Huante, Wayne Barlowe, Iain McCaig</li>
    <li><strong>3D as a tool</strong> — ZBrush cho sculpt explore form, paint over digital</li>
  </ul>
</section>
`,
  },

  // 02. Crowd Simulation
  {
    id: "5bf14821-ec6a-42df-886b-31197a51f2b2",
    tieu_de: "Crowd Simulation",
    tieu_de_viet: "Mô phỏng đám đông",
    tom_tat:
      "Crowd Simulation là kỹ thuật mô phỏng hàng trăm đến hàng triệu nhân vật cùng lúc với hành vi tự động — agent-based AI quyết định mỗi cá thể di chuyển. Công nghệ nền cho cảnh chiến trận, đám đông phim bom tấn.",
    meta_title: "Crowd Simulation là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Crowd Simulation mô phỏng hàng triệu nhân vật cùng lúc. Tìm hiểu Massive, Houdini Crowd, Golaem và ứng dụng trong phim bom tấn và game.",
    noi_dung: `
<section class="arc-intro">
  <p>Trong Lord of the Rings, cảnh chiến trận Pelennor Fields có 200,000+ binh lính cả hai bên đánh nhau. Không thể quay live với chừng đó người. Mỗi orc, mỗi kỵ binh được mô phỏng bằng AI agent — tự đi đường mình, đánh nhau với địch gần nhất, ngã khi bị giết. Đây là crowd simulation — công nghệ cho phép epic scale impossible trước đó.</p>
  <p>Crowd Simulation là một nhánh chuyên môn cao của VFX và game development. Hiểu khái niệm và tools phổ biến giúp VFX artist biết khi nào nên dùng crowd sim (vs hand-animate) và team production biết để budget hợp lý.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Crowd Simulation là gì?</h2>
  <p>Crowd Simulation là kỹ thuật mô phỏng hành vi và chuyển động của một đám đông lớn (hàng trăm đến hàng triệu) các nhân vật/agent thông qua AI và physics. Mỗi agent có một &quot;brain&quot; nhỏ — quyết định hành động (đi, chạy, đánh, ngã) dựa trên environment và agent khác xung quanh.</p>
  <p>Khác với animation thủ công (animator dựng từng character), crowd sim là <strong>emergent behavior</strong> — không ai dựng từng frame, hành vi đám đông &quot;tự nhiên xuất hiện&quot; từ rule của individual agent. Cùng simulation chạy lần thứ 2 sẽ ra kết quả hơi khác — đó là tính ngẫu nhiên có kiểm soát.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Agent-Based AI là gì?</span>
    <p>Mỗi agent (cá thể trong đám đông) có behavior tree hoặc state machine riêng. Rule đơn giản: &quot;tìm enemy gần nhất&quot;, &quot;giữ khoảng cách an toàn với agent khác&quot;, &quot;tránh chướng ngại&quot;, &quot;nếu HP &lt; 0 thì ngã&quot;. Hàng nghìn agent với cùng rule tương tác → emergent chaos giống thật.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Agent</strong> — một cá thể trong đám đông</li>
    <li><strong>Behavior</strong> — rule điều khiển agent</li>
    <li><strong>Path Finding</strong> — agent tìm đường tới đích (A*, navmesh)</li>
    <li><strong>Collision Avoidance</strong> — không đi xuyên qua nhau</li>
    <li><strong>State Machine</strong> — agent chuyển state (idle, walk, fight, dead)</li>
    <li><strong>LOD (Level of Detail)</strong> — agent xa simplified để save performance</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"crowd simulation battle film massive software vfx"</span>
    </div>
    <p class="arc-image-caption">Crowd simulation — hàng nghìn agent với AI riêng tạo cảnh chiến trận epic</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các phần mềm Crowd Simulation</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Massive — pioneer cho crowd simulation</summary>
      <div class="arc-card-body">
        <p>Built cho Lord of the Rings — đầu tiên dùng AI agent thực sự cho VFX. Mỗi orc có brain riêng. Stand-alone software, integration với Maya/Houdini. Phổ biến cho film cao cấp.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Houdini Crowd Tools</summary>
      <div class="arc-card-body">
        <p>Built-in trong Houdini từ version 16. Procedural workflow, integration với mọi tool Houdini (FX, sim). Đối thủ chính của Massive, phổ biến cho commercial VFX.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Golaem — Maya crowd</summary>
      <div class="arc-card-body">
        <p>Crowd simulation plugin cho Maya. Behavioral editor visual, character library system. Phổ biến cho TVC và film mid-tier.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Miarmy</summary>
      <div class="arc-card-body">
        <p>Plugin Maya tương tự Golaem, ít expensive. Phù hợp studio nhỏ.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Game Engine — Unreal MASS, Unity Job System</summary>
      <div class="arc-card-body">
        <p>Real-time crowd cho game. Unreal 5 MASS framework optimize cho hàng nghìn NPC. ECS architecture cho mass entity processing.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Crowd Simulation trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim VFX</h3>
    <ul class="arc-list">
      <li>Cảnh chiến trận (LOTR, Avengers, Game of Thrones)</li>
      <li>Cảnh đám đông civilian (stadium, concert, protest)</li>
      <li>Disaster scene — người chạy khỏi alien, monster</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game</h3>
    <ul class="arc-list">
      <li>Total War series — hàng nghìn unit trên battlefield real-time</li>
      <li>Hitman, Assassin&apos;s Creed — crowd cho urban scene</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Architectural Visualization</h3>
    <ul class="arc-list">
      <li>Render building với người di chuyển — sense of scale, life</li>
      <li>Mass transit simulation: airport, station</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Scientific Research</h3>
    <ul class="arc-list">
      <li>Evacuation simulation cho building safety</li>
      <li>Pedestrian flow study cho urban planning</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Nature Documentary VFX</h3>
    <ul class="arc-list">
      <li>Migrating animal herds (BBC Planet Earth)</li>
      <li>Fish schools, bird flocks (boids algorithm classic)</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Pipeline Crowd Simulation cơ bản</h2>
  <ul class="arc-list">
    <li><strong>1. Asset prep</strong> — character variants (3-10), animation library (walk, run, attack, idle)</li>
    <li><strong>2. Agent setup</strong> — behavior tree, state machine, attributes (HP, speed)</li>
    <li><strong>3. Layout</strong> — paint agent placement, set group, faction</li>
    <li><strong>4. Simulate</strong> — chạy sim, agent tự move theo rule</li>
    <li><strong>5. Iterate</strong> — adjust behavior rules, randomization parameters</li>
    <li><strong>6. Cache &amp; Render</strong> — bake animation, render với LOD và crowd-friendly materials</li>
  </ul>
</section>
`,
  },

  // 03. CSS
  {
    id: "8297e417-874e-45a0-b205-fa6bcd189116",
    tieu_de: "CSS",
    tieu_de_viet: "CSS (Cascading Style Sheets)",
    tom_tat:
      "CSS là ngôn ngữ định dạng giao diện web — kiểm soát màu sắc, font, layout, animation. Không thể thiếu với Web Designer, UI Developer và bất kỳ ai làm website hoặc web app.",
    meta_title: "CSS là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "CSS là ngôn ngữ định dạng web. Tìm hiểu cú pháp cơ bản, Flexbox, Grid, animation và ứng dụng cho web designer và frontend developer.",
    noi_dung: `
<section class="arc-intro">
  <p>Trang HTML thuần không có CSS — chữ đen trên nền trắng, font Times New Roman, layout default browser, trông như web năm 1995. Thêm CSS — màu sắc đẹp, font tinh tế, layout responsive, animation mượt. CSS là cây cầu giữa &quot;thông tin&quot; (HTML) và &quot;trải nghiệm&quot; (UI/UX).</p>
  <p>CSS là kiến thức bắt buộc cho web designer, UI/UX designer, frontend developer. Hiểu CSS hiện đại (Flexbox, Grid, custom properties, container queries) giúp design biến thành code chất lượng cao mà không phải dựa hoàn toàn vào developer.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>CSS là gì?</h2>
  <p>CSS (Cascading Style Sheets) là ngôn ngữ stylesheet dùng để mô tả presentation (cách hiển thị) của tài liệu viết bằng HTML. Trong khi HTML định nghĩa <strong>cấu trúc</strong> (đây là tiêu đề, đây là đoạn văn, đây là button), CSS định nghĩa <strong>hình thức</strong> (tiêu đề màu xanh font 24px, đoạn văn line-height 1.6, button có bo tròn).</p>
  <p>CSS được phát triển từ năm 1996 và đã trải qua nhiều version. CSS3 (modular từ 2011) thêm động Flexbox, Grid, transitions, animations. CSS hiện đại còn có custom properties (CSS variables), container queries, has() selector — gần như đầy đủ tính năng cho mọi UI complex.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">CSS = Style; HTML = Structure; JavaScript = Behavior</span>
    <p>Web frontend dựa trên 3 ngôn ngữ. <strong>HTML</strong>: cấu trúc nội dung. <strong>CSS</strong>: hiển thị, animation. <strong>JavaScript</strong>: interactive behavior. Web designer chuyên CSS; frontend developer master cả 3. Hiểu rõ vai trò giúp collaborate hiệu quả.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Selector</strong> — chọn HTML element áp style (<code>.class</code>, <code>#id</code>, <code>div</code>)</li>
    <li><strong>Property</strong> — thuộc tính (color, font-size, padding)</li>
    <li><strong>Value</strong> — giá trị (red, 16px, 20px 30px)</li>
    <li><strong>Cascade</strong> — quy tắc &quot;cascade&quot; quyết định style nào win khi conflict</li>
    <li><strong>Specificity</strong> — độ &quot;mạnh&quot; của selector</li>
    <li><strong>Box Model</strong> — content + padding + border + margin</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"CSS code editor stylesheet web design"</span>
    </div>
    <p class="arc-image-caption">CSS code — selector, property, value, áp style cho HTML element</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>CSS Modern — các tính năng quan trọng</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Flexbox — layout 1 chiều</summary>
      <div class="arc-card-body">
        <p>Layout horizontal hoặc vertical với justify, align. Cách dễ nhất để center, distribute space đều. Học Flexbox = giải quyết 70% layout vấn đề.</p>
        <p><code>display: flex; justify-content: center; align-items: center;</code></p>
      </div>
    </details>
    <details class="arc-card">
      <summary>CSS Grid — layout 2 chiều</summary>
      <div class="arc-card-body">
        <p>Powerful nhất cho layout phức tạp — hàng + cột cùng lúc. Replace nhiều grid framework cũ. Magazine layout, card grid, dashboard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>CSS Variables (Custom Properties)</summary>
      <div class="arc-card-body">
        <p><code>--primary-color: #FF5733;</code> — tạo variable reuse. Đổi một chỗ, cập nhật toàn site. Nền tảng cho theming (dark mode), design system.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Animation &amp; Transition</summary>
      <div class="arc-card-body">
        <p><code>transition: all 0.3s ease;</code> cho hover effect. <code>@keyframes</code> cho animation phức tạp. Performance tốt hơn JavaScript animation cho property đơn giản.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Container Queries &amp; Subgrid</summary>
      <div class="arc-card-body">
        <p>Mới (2023+) — responsive theo container size thay vì viewport. Game changer cho component-based design. Subgrid cho nested grid match parent.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>:has() selector</summary>
      <div class="arc-card-body">
        <p>Parent selector! <code>.card:has(img)</code> — chọn .card nào chứa img. Mới (2023+), unlocks nhiều use case từng cần JavaScript.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>CSS trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Web Design</h3>
    <ul class="arc-list">
      <li>Convert mockup Figma thành code CSS — Web Designer cần biết CSS basic</li>
      <li>Webflow, Framer cho no-code nhưng vẫn dựa trên CSS</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">UI/UX Design</h3>
    <ul class="arc-list">
      <li>Hiểu CSS giúp design feasible (không thiết kế thứ CSS không làm được dễ dàng)</li>
      <li>Communicate với developer hiệu quả</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Frontend Development</h3>
    <ul class="arc-list">
      <li>Master CSS là core skill — Flexbox, Grid, custom properties</li>
      <li>Frameworks: Tailwind CSS, styled-components, CSS Modules</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Email Design</h3>
    <ul class="arc-list">
      <li>CSS cho email phải compatible với client cũ (Outlook 2007 vẫn dùng)</li>
      <li>Table-based layout, inline CSS — workaround</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Print to Web</h3>
    <ul class="arc-list">
      <li>CSS Paged Media cho print stylesheet</li>
      <li>Web-to-print: book, magazine generated từ CSS</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Học CSS hiệu quả</h2>
  <ul class="arc-list">
    <li><strong>Master Box Model</strong> — content, padding, border, margin. Hiểu sai = layout bug</li>
    <li><strong>Flexbox first, then Grid</strong> — Flexbox đủ cho hầu hết use case</li>
    <li><strong>CSS Tricks website</strong> — reference toàn diện</li>
    <li><strong>Frontend Mentor challenges</strong> — practice với real design</li>
    <li><strong>MDN docs</strong> — chính thức và chi tiết nhất</li>
    <li><strong>Build, don&apos;t just learn</strong> — clone Apple, Stripe, Linear; analyze CSS của họ</li>
  </ul>
</section>
`,
  },

  // 04. Curvature
  {
    id: "3bc0cd00-9c15-4020-af82-641cde5f1439",
    tieu_de: "Curvature",
    tieu_de_viet: "Bản đồ độ cong (Curvature Map)",
    tom_tat:
      "Curvature Map là bản đồ thể hiện độ cong của bề mặt 3D — vùng lồi (convex) và lõm (concave). Dùng trong texturing để mask edge wear, dirt, highlight tự nhiên.",
    meta_title: "Curvature là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Curvature Map xác định lồi/lõm bề mặt 3D. Tìm hiểu cách bake và dùng curvature cho edge wear, dirt mask trong Substance Painter, ZBrush.",
    noi_dung: `
<section class="arc-intro">
  <p>Một object 3D có sơn cũ — không phải toàn bộ bị bong, chỉ vùng cạnh sắc bị mòn lộ kim loại bên dưới. Vẽ thủ công từng cạnh thì tốn quá. Substance Painter dùng curvature map làm mask — chỉ cần một slider để wear xuất hiện đúng nơi cạnh sắc. Đây là power của curvature trong PBR texturing.</p>
  <p>Curvature Map là một trong những baked map cốt lõi của PBR workflow hiện đại. Hiểu curvature và cách dùng giúp 3D artist tạo material chuyên nghiệp nhanh — không cần paint từng chi tiết wear thủ công.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Curvature là gì?</h2>
  <p>Curvature Map là một bản đồ texture chứa thông tin về độ cong của bề mặt 3D tại mỗi pixel — phân biệt vùng <strong>convex</strong> (lồi, cạnh nhô ra) và <strong>concave</strong> (lõm, kẽ nứt, vết chìm). Trong Substance Painter, curvature thường được hiển thị grayscale: trắng = convex extreme, đen = concave extreme, gray = phẳng.</p>
  <p>Curvature được bake từ geometry của model — tool tính toán dot product giữa normal của vertex và normal của vertex neighbor. Vùng cạnh lồi có sự thay đổi normal lớn → bake thành white. Phẳng → gray. Lõm sâu → black.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Curvature ≠ AO</span>
    <p><strong>AO (Ambient Occlusion)</strong>: ánh sáng môi trường bị chặn ở vùng gần — chỉ darken các kẽ. <strong>Curvature</strong>: cả lồi và lõm — không liên quan ánh sáng, chỉ liên quan geometry. AO chỉ giúp tô đậm crevice; curvature cho mask edge wear (vùng lồi) và dirt buildup (vùng lõm).</p>
  </div>

  <ul class="arc-list">
    <li><strong>Convex</strong> — vùng cạnh lồi (white trong map)</li>
    <li><strong>Concave</strong> — vùng kẽ lõm (black trong map)</li>
    <li><strong>Pixel Curvature</strong> — bake per-pixel cho high resolution</li>
    <li><strong>Vertex Curvature</strong> — bake per-vertex, smooth hơn</li>
    <li><strong>Bake Distance</strong> — radius search để tính curvature</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"curvature map 3D PBR substance painter bake"</span>
    </div>
    <p class="arc-image-caption">Curvature map — trắng ở edge lồi, đen ở kẽ lõm, gray ở phẳng</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Cách sử dụng Curvature trong texturing</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Edge Wear Mask</summary>
      <div class="arc-card-body">
        <p>Cạnh sắc thực tế bị mòn trước tiên — sơn bong, lớp coating mất. Dùng curvature convex (white) làm mask layer wear: nơi nào trắng → áp material kim loại expose; nơi đen → giữ sơn nguyên.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Dirt &amp; Grime Accumulation</summary>
      <div class="arc-card-body">
        <p>Bụi và dirt tích lũy ở kẽ lõm. Dùng curvature concave (black, inverted thành white) làm mask cho dirt layer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cavity Detail Highlight</summary>
      <div class="arc-card-body">
        <p>Combine curvature với cavity map (high frequency curvature) để highlight chi tiết nhỏ — rivet, panel line. Sketch viewer hiển thị cavity sharp clear.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Stylized Edge Highlight</summary>
      <div class="arc-card-body">
        <p>Cho stylized art (cartoon, hand-painted), dùng curvature convex để paint white highlight tự động — fake light bouncing off edge.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Procedural Material Driver</summary>
      <div class="arc-card-body">
        <p>Smart materials trong Substance Painter dùng curvature làm input cho procedural texture. Drag &amp; drop material auto adapt theo geometry curvature.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Bake Curvature Map</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Substance Painter</h3>
    <ul class="arc-list">
      <li>Textures Set Settings → Bake Mesh Maps → Curvature</li>
      <li>Tùy chọn Pixel/Vertex, Smoothing Factor</li>
      <li>Bake với AO + Normal cùng lúc — standard workflow</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">xNormal (free, mạnh)</h3>
    <ul class="arc-list">
      <li>Dedicated tool cho bake map — chuẩn industry</li>
      <li>Support curvature, normal, AO, position, world space normal</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Marmoset Toolbag</h3>
    <ul class="arc-list">
      <li>Bake quality cao, real-time preview</li>
      <li>Phổ biến cho final asset bake</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Maya / Blender / 3ds Max</h3>
    <ul class="arc-list">
      <li>Built-in bake tools — không mạnh bằng dedicated tool</li>
      <li>Đủ cho quick test, prototype</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Curvature trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Asset Texturing</h3>
    <ul class="arc-list">
      <li>Mọi asset PBR có curvature bake cùng AO, normal</li>
      <li>Smart material Substance Painter mặc định dùng curvature</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX 3D</h3>
    <ul class="arc-list">
      <li>Asset photorealistic dùng curvature cho realistic wear</li>
      <li>Shader programmer build node graph dùng curvature input</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Stylized Hand-Painted</h3>
    <ul class="arc-list">
      <li>Game cartoon (Overwatch, Fortnite) dùng curvature highlight thay vẽ thủ công</li>
      <li>Save time đáng kể trong character production pipeline</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Architectural Vis</h3>
    <ul class="arc-list">
      <li>Material aging cho kiến trúc cũ — wear ở cạnh stone, brick</li>
    </ul>
  </div>
</section>
`,
  },

  // 05. Deformer
  {
    id: "807be737-bb42-4819-be8a-14e64bce4138",
    tieu_de: "Deformer",
    tieu_de_viet: "Bộ biến dạng (Deformer - 3D)",
    tom_tat:
      "Deformer là công cụ trong phần mềm 3D cho phép biến dạng mô hình mà không chỉnh từng vertex — bend, twist, squash, lattice, blend shapes. Nền tảng của character rigging và animation.",
    meta_title: "Deformer là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Deformer biến dạng mô hình 3D mà không sửa vertex thủ công. Tìm hiểu các loại deformer: bend, twist, lattice, blend shape, skinning.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn có một mô hình nhân vật 3D và muốn cho phần cánh tay uốn cong tự nhiên khi animate. Nếu di chuyển từng vertex thủ công, bạn cần sửa 1000 vertex cho mỗi frame — không khả thi. Deformer giải quyết — apply một bend deformer, cánh tay uốn cong tự nhiên qua một control đơn. Đây là một trong những kỹ thuật nền tảng nhất của 3D animation.</p>
  <p>Deformer là kiến thức cốt lõi cho rigger và 3D animator. Hiểu các loại deformer và cách combine giúp tạo rig linh hoạt, animation tự nhiên — và workflow nhanh hơn so với manual vertex manipulation.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Deformer là gì?</h2>
  <p>Deformer là các công cụ và nodes trong phần mềm 3D cho phép biến đổi (deform) hình dạng mesh thông qua quy tắc toán học hoặc control objects — thay vì phải chỉnh sửa từng vertex riêng lẻ. Deformer có thể bend, twist, squash, lattice, shrinkwrap, blend giữa nhiều shapes, hoặc bind mesh vào skeleton.</p>
  <p>Deformer hoạt động ở mức procedural — bạn áp deformer với parameters, mesh tự thay đổi theo. Có thể animate parameter của deformer để tạo chuyển động — đó là cách character animation hoạt động (skin bind to joint via skin deformer).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Deformer Order quan trọng</span>
    <p>Khi mesh có nhiều deformer, order áp dụng quyết định kết quả. Vd: skin first → bend after vs bend first → skin after cho output khác nhau. Maya có Deformer History, Blender có Modifier Stack — quản lý order là kỹ năng pro rigger.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Bend</strong> — uốn cong mesh theo axis</li>
    <li><strong>Twist</strong> — xoắn mesh theo axis</li>
    <li><strong>Squash &amp; Stretch</strong> — nén/kéo dài</li>
    <li><strong>Lattice</strong> — biến dạng qua lattice control points</li>
    <li><strong>Blend Shape (Morph Target)</strong> — interpolate giữa nhiều shape</li>
    <li><strong>Skin (Skinning)</strong> — bind mesh vào skeleton joint</li>
    <li><strong>Cluster</strong> — group vertex thành unit, transform together</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"3D deformer maya bend twist lattice character"</span>
    </div>
    <p class="arc-image-caption">Các loại deformer phổ biến — bend, twist, lattice, blend shape</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Deformer chi tiết</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Skin / Skinning — quan trọng nhất</summary>
      <div class="arc-card-body">
        <p>Bind mesh vertex vào skeleton joint với weight. Khi joint rotate/translate, vertex follow theo weight. Foundation của character animation. Smooth Skin (Maya), Subsurface Modifier (Blender). Skin weighting là kỹ năng chính của rigger.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blend Shape / Morph Target</summary>
      <div class="arc-card-body">
        <p>Có nhiều version của cùng một mesh (smile, frown, surprised). Slider blend giữa chúng. Nền tảng của facial animation, muscle bulge, prop morph. Pixar, Disney có hàng trăm blend shape cho face character.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lattice</summary>
      <div class="arc-card-body">
        <p>Box các vertex được chia thành grid (3×3×3, 4×4×4). Move control points → mesh inside deform. Phổ biến cho squash &amp; stretch, body shape adjust, prop deform.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bend / Twist / Taper</summary>
      <div class="arc-card-body">
        <p>Non-linear deformers — uốn cong, xoắn, hoặc thu nhỏ một đầu. Tower bending in wind, screw twisting, banana shape model.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cluster &amp; Soft Selection</summary>
      <div class="arc-card-body">
        <p>Group vertex thành unit có weight. Move cluster → vertex move theo weight. Soft selection riêng cho modeling nhanh.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Wrap, Shrinkwrap, Wire</summary>
      <div class="arc-card-body">
        <p><strong>Wrap</strong>: low-poly deforms high-poly. <strong>Shrinkwrap</strong>: mesh project lên surface. <strong>Wire</strong>: curve deform mesh. Specialized cho specific workflows.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sculpt-based Deformer</summary>
      <div class="arc-card-body">
        <p>Maya Sculpt Geometry, Blender Sculpt Mode — tool deform mesh procedurally như painting. Tốt cho organic shapes.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Deformer trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Character Animation</h3>
    <ul class="arc-list">
      <li>Skin: bind body vào skeleton</li>
      <li>Blend shape: facial expression, lip sync</li>
      <li>Wire/cluster: custom muscle deformation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Mechanical / Industrial</h3>
    <ul class="arc-list">
      <li>Bend cho ống, dây cáp</li>
      <li>Lattice cho object deformation under stress</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Graphics</h3>
    <ul class="arc-list">
      <li>Cinema 4D: Bend deformer cho logo, text animation</li>
      <li>Squash &amp; stretch cho cartoonish movement</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX Simulation</h3>
    <ul class="arc-list">
      <li>Cloth/soft body simulation kết hợp với rig deformer</li>
      <li>Muscle simulation overlay trên skin deformation</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Deformer order sai, mesh deform không đúng</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> Maya Deformer History order quan trọng — skin first vs after bend cho output khác.</p>
        <p><strong>Cách fix:</strong> reorder trong Channel Box → Edit → Deformer History. Hoặc Blender Modifier Stack drag-reorder.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Skin weight bad — &quot;candy wrapping&quot;</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> joint twist tạo mesh xoắn ốc lạ.</p>
        <p><strong>Cách fix:</strong> twist joint riêng + reduce influence của joint chính. Hoặc bSkin weight với explicit max influence per vertex (4 normal).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blend shape pop / discontinuity</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> blend shape có vertex order khác base.</p>
        <p><strong>Cách fix:</strong> đảm bảo blend shape duplicate từ base, không re-mesh. Order vertex giữ nguyên.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 06. Demo reel
  {
    id: "842a147a-f534-4b50-8b9b-a4e68b7ddddf",
    tieu_de: "Demo Reel",
    tieu_de_viet: "Demo Reel (Showreel)",
    tom_tat:
      "Demo Reel là video tổng hợp các tác phẩm tốt nhất của một creative — 1-2 phút, đặt phần ấn tượng nhất lên đầu. Công cụ tuyển dụng và portfolio chuẩn cho 3D artist, VFX artist, motion designer.",
    meta_title: "Demo Reel là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Demo Reel là portfolio video cho creative. Tìm hiểu cấu trúc, độ dài, music, breakdown và cách làm demo reel ấn tượng với nhà tuyển dụng.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn apply vào VFX studio mơ ước — họ nhận hàng trăm portfolio mỗi tuần. Recruiter dành 30 giây xem demo reel đầu tiên. Nếu không &quot;catch&quot; trong 5 giây đầu, họ qua reel tiếp theo. Đây là thực tế khắc nghiệt của tuyển dụng trong ngành creative — demo reel quyết định cơ hội bạn vào shortlist hay không.</p>
  <p>Demo Reel là công cụ portfolio chuẩn cho mọi creative làm việc với motion: 3D animator, VFX artist, motion designer, video editor, character artist. Hiểu cấu trúc demo reel hiệu quả là kỹ năng career bản chất — cùng skill kỹ thuật.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Demo Reel là gì?</h2>
  <p>Demo Reel (còn gọi Showreel) là video portfolio ngắn (thường 1-2 phút) tổng hợp các tác phẩm tốt nhất của một creative trong lĩnh vực motion — animation, VFX, motion graphics, editing. Mục đích: thể hiện kỹ năng, style và range của creator cho nhà tuyển dụng, client, hoặc collaborator tiềm năng.</p>
  <p>Khác với portfolio website (có nhiều project chi tiết, có thể browse), demo reel là &quot;quick pitch&quot; — recruiter xem được tổng quan trong 1-2 phút. Hai thứ bổ sung nhau — reel để impress, website để dive deep.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Quy tắc 5 giây vàng</span>
    <p>Recruiter quyết định xem tiếp hay không trong 5 giây đầu. Đặt clip tốt nhất, ấn tượng nhất ngay opening. Không có time cho intro logo dài, slow start. Best work first — không phải để build up.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Length</strong> — 1-2 phút lý tưởng; junior 60 giây, senior 2 phút</li>
    <li><strong>Opening Shot</strong> — best work in first 5 seconds</li>
    <li><strong>Variety</strong> — show range nhưng không lan man</li>
    <li><strong>Music</strong> — tempo phù hợp, không quá distract</li>
    <li><strong>Breakdown</strong> — version riêng giải thích từng shot</li>
    <li><strong>Credit Sheet</strong> — list shot, role của bạn trong từng project</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"demo reel showreel vfx animator portfolio video"</span>
    </div>
    <p class="arc-image-caption">Demo reel — chuỗi shot ấn tượng nhất, edit theo music, 1-2 phút</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Cấu trúc Demo Reel hiệu quả</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Opening (5-10s) — best shot</summary>
      <div class="arc-card-body">
        <p>Shot ấn tượng nhất, polish nhất ngay đầu. No logo intro dài — recruiter chỉ có 5 giây.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Body (45-90s) — variety + skill</summary>
      <div class="arc-card-body">
        <p>5-15 shot tùy độ phức tạp. Mix variety (character animation, FX, simulation) nhưng coherent với role apply. Pace nhanh, edit theo music beat.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Closing (5-10s) — strong ending</summary>
      <div class="arc-card-body">
        <p>Shot tốt thứ hai làm closing. Card cuối: tên, contact email, website. Đơn giản, nhanh đọc.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Breakdown reel (optional, riêng)</summary>
      <div class="arc-card-body">
        <p>Version đi kèm giải thích từng shot: wireframe → render passes → composite final. Show technical skill và problem-solving. Đặc biệt important cho VFX role.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Credit Sheet (PDF/Doc đính kèm)</summary>
      <div class="arc-card-body">
        <p>Document liệt kê: shot, project, role (modeled, animated, lit, rendered). Tránh credit gian dối — recruiter check ngược với supervisor previous.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Demo Reel cho từng role</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">3D Animator</h3>
    <ul class="arc-list">
      <li>Character animation: walk, run, dialogue, action, emotion</li>
      <li>Range: comedy, drama, fight scene</li>
      <li>1-2 đoạn dài để show storytelling, vs nhiều shot ngắn show variety</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX Artist (FX, Comp, Lighting)</h3>
    <ul class="arc-list">
      <li>FX: simulation (fire, water, destruction), particles</li>
      <li>Comp: keying, integration, color match</li>
      <li>Lighting: HDR, lookdev, material breakdown</li>
      <li>Always include breakdown reel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Designer</h3>
    <ul class="arc-list">
      <li>Logo animation, title sequence, explainer animation</li>
      <li>Variety style: corporate, playful, abstract</li>
      <li>Music sync quan trọng cho motion graphics reel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Video Editor</h3>
    <ul class="arc-list">
      <li>Demo từ commercial, documentary, narrative</li>
      <li>Storytelling capability — không chỉ technical edit</li>
      <li>Pace, rhythm, emotional arc qua edit</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Character Artist / Modeler</h3>
    <ul class="arc-list">
      <li>Turntable render của character — 360° rotation</li>
      <li>Wireframe + render + close-up detail</li>
      <li>Texture breakdown cho material work</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp khi làm Demo Reel</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Reel quá dài</summary>
      <div class="arc-card-body">
        <p><strong>Sai lầm:</strong> 5 phút reel để show &quot;tất cả&quot;.</p>
        <p><strong>Đúng:</strong> 1-2 phút, only best work. Quality over quantity. Junior 60s, senior 2 phút max.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mediocre work xen vào</summary>
      <div class="arc-card-body">
        <p><strong>Sai lầm:</strong> include &quot;ok&quot; shot vì sentimental hoặc &quot;mất công làm&quot;.</p>
        <p><strong>Đúng:</strong> nếu một shot không ấn tượng = remove. Reel weak link làm giảm impression toàn bộ.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Slow opening / nhiều logo intro</summary>
      <div class="arc-card-body">
        <p><strong>Sai lầm:</strong> 15 giây intro với logo cá nhân animated trước reel.</p>
        <p><strong>Đúng:</strong> 0 giây intro. Best work in frame 1. Logo intro chỉ làm waste 5 giây quý báu của recruiter.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Music không match content</summary>
      <div class="arc-card-body">
        <p><strong>Sai lầm:</strong> EDM mạnh cho character animation tinh tế.</p>
        <p><strong>Đúng:</strong> music tempo support content. VFX action = upbeat; character drama = subtle score.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Credit không rõ ràng</summary>
      <div class="arc-card-body">
        <p><strong>Sai lầm:</strong> show shot AAA studio mà không clarify role.</p>
        <p><strong>Đúng:</strong> credit sheet rõ &quot;modeled high-poly, baked, textured&quot;. Recruiter respect honesty.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 07. Depth of Field (depth-of-field-2)
  {
    id: "a5e1c912-d63c-48b3-9b2f-91e7349558e8",
    tieu_de: "Depth of Field (Phim/3D)",
    tieu_de_viet: "Độ sâu trường ảnh trong 3D",
    tom_tat:
      "Depth of Field (DOF) trong 3D mô phỏng đặc tính ống kính thật — vùng nét và vùng mờ — để tạo cảm giác điện ảnh và dẫn mắt vào chủ thể. Một trong những hiệu ứng quan trọng nhất của render 3D.",
    meta_title: "Depth of Field 3D là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Depth of Field trong 3D mô phỏng đặc tính lens thật. Tìm hiểu cách setup DOF trong V-Ray, Arnold, Octane và ứng dụng cinematic render.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn render một cảnh nội thất 3D đẹp — nhưng nhìn vẫn &quot;CG flat&quot;, mọi thứ cùng nét. Thêm Depth of Field — chủ thể nét, background mờ tự nhiên, ánh đèn xa thành bokeh balls. Cảnh ngay lập tức có chiều sâu cinematic và &quot;photoreal&quot; hơn. DOF là một trong những hiệu ứng &quot;magic&quot; nhất biến 3D render từ technical thành nghệ thuật.</p>
  <p>Depth of Field là kỹ năng thiết yếu cho 3D artist, đặc biệt làm product viz, archviz, character render. Hiểu DOF và setup đúng giúp render có &quot;cinematic look&quot; — không phải khoe complex geometry, mà tạo cảm xúc qua focus.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Depth of Field trong 3D là gì?</h2>
  <p>Depth of Field (DOF) trong 3D là hiệu ứng mô phỏng đặc tính quang học của ống kính máy ảnh thật — vùng &quot;trong tiêu cự&quot; (focus) nét rõ, vùng ngoài tiêu cự (phía trước hoặc sau focus plane) bị mờ. Mức độ mờ và độ rộng vùng focus phụ thuộc vào aperture (khẩu độ) và focal length của camera ảo.</p>
  <p>Khác với DOF trong photography (đến từ vật lý thực của lens), DOF trong 3D phải được simulated qua thuật toán render. Có hai cách chính: <strong>render-time DOF</strong> (ray tracing physically accurate) và <strong>post-process DOF</strong> (apply blur dựa trên z-depth pass sau khi render).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">DOF render-time vs Post-DOF</span>
    <p><strong>Render-time</strong>: physically accurate, bokeh ball đẹp, nhưng tốn render time. Camera ảo bắn nhiều ray qua aperture simulated. <strong>Post-DOF</strong>: nhanh, dùng z-depth pass blur trong comp. Kết quả không chính xác về vật lý (foreground không tách layer được). Trade-off speed vs quality.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Focal Distance</strong> — khoảng cách từ camera tới focus plane</li>
    <li><strong>F-Stop / Aperture</strong> — khẩu độ, càng nhỏ DOF càng shallow</li>
    <li><strong>Focal Length</strong> — tele lens (85mm+) DOF shallow hơn wide</li>
    <li><strong>Bokeh Shape</strong> — hình aperture blade (tròn vs đa giác)</li>
    <li><strong>Z-Depth Pass</strong> — depth information cho post-DOF</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"3D depth of field render bokeh octane vray product"</span>
    </div>
    <p class="arc-image-caption">DOF trong render 3D — chủ thể nét, background mờ với bokeh balls cinematic</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Setup DOF trong các phần mềm 3D</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>V-Ray (3ds Max, Maya)</summary>
      <div class="arc-card-body">
        <p>Trên VRayPhysicalCamera: tick &quot;Depth of Field&quot;, set f-number (f/2.8, f/4...), focal distance (pick target). Mọi setting tương đương camera thật.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Arnold (Maya)</summary>
      <div class="arc-card-body">
        <p>Camera attributes → Arnold → Enable DOF. Aperture Size, Focus Distance. Octagon hoặc circle aperture. Render time tăng đáng kể với DOF on.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Octane / Redshift — GPU renderers</summary>
      <div class="arc-card-body">
        <p>DOF tích hợp camera settings. GPU render rất nhanh ngay cả với DOF enabled.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cinema 4D + Octane / Redshift</summary>
      <div class="arc-card-body">
        <p>C4D Camera object: Lens tab → Depth of Field. Hoặc Octane Camera tag với aperture settings.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender Cycles / Eevee</summary>
      <div class="arc-card-body">
        <p>Camera Properties → Depth of Field. Aperture F-stop, Focus on Object hoặc Distance. Cycles render-time DOF; Eevee post-process.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>DOF trong từng lĩnh vực 3D</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Product Visualization</h3>
    <ul class="arc-list">
      <li>Macro-style DOF cho close-up: jewelry, watch, electronics</li>
      <li>F/2.8-f/4 thường cho subject nét, background creamy</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Architectural Visualization</h3>
    <ul class="arc-list">
      <li>Light DOF cho cảnh interior — tăng cinematic feel</li>
      <li>Sometimes off cho establishing shot show kiến trúc đầy đủ</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Character Render</h3>
    <ul class="arc-list">
      <li>Portrait-style DOF: face sharp, background mờ</li>
      <li>Tăng dramatic close-up</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation Cinematic</h3>
    <ul class="arc-list">
      <li>DOF dynamic — animate focus distance theo subject movement</li>
      <li>Rack focus effect: shift focus giữa near/far subject</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Real-Time DOF</h3>
    <ul class="arc-list">
      <li>Post-process DOF dùng z-depth — fast cho 60fps</li>
      <li>UE5, Unity post-process volume settings DOF on/off per scene</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips DOF hiệu quả</h2>
  <ul class="arc-list">
    <li><strong>Reference từ photography</strong> — không thể fake DOF cinematic mà không hiểu DOF thật</li>
    <li><strong>Don&apos;t over-blur</strong> — background quá mờ làm cảnh mất context</li>
    <li><strong>Bokeh shape matters</strong> — circle vs polygon ảnh hưởng cảm thụ chất lượng</li>
    <li><strong>Use long focal length cho shallow DOF</strong> — 85mm dễ tạo shallow hơn 35mm</li>
    <li><strong>Z-depth pass</strong> — always render z-depth pass cho post-flexibility, dù dùng render-time DOF</li>
    <li><strong>Test trước final render</strong> — DOF có thể tăng render time lên 2-5x</li>
  </ul>
</section>
`,
  },

  // 08. Depth of Field (depth-of-field)
  {
    id: "4ca55cd7-fe30-475c-9f69-4d9ff5a80140",
    tieu_de: "Depth of Field",
    tieu_de_viet: "Độ sâu trường ảnh (DOF)",
    tom_tat:
      "Depth of Field (DOF) là hiệu ứng quang học làm mờ vùng ngoài focus dựa trên khoảng cách tới camera — mô phỏng ống kính thật, tạo chiều sâu và dẫn hướng nhìn vào chủ thể.",
    meta_title: "Depth of Field là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Depth of Field là hiệu ứng mờ vùng ngoài focus. Tìm hiểu cơ chế lens, aperture, focal length và ứng dụng trong photography, video, 3D.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn nhìn một bức ảnh chân dung — gương mặt sắc nét, background tan vào một mảng mờ mềm mại. Hoặc một video cinematic — DOP rack focus từ subject foreground sang background. Đây đều là Depth of Field — hiệu ứng quang học quyết định visual storytelling qua focus.</p>
  <p>Depth of Field là kiến thức nền tảng cho photographer, videographer, 3D artist. Hiểu cơ chế của DOF — aperture, focal length, distance — giúp control hiệu quả thay vì &quot;may rủi&quot; khi shoot hoặc render.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Depth of Field là gì?</h2>
  <p>Depth of Field (DOF — độ sâu trường ảnh) là khoảng cách trong cảnh có hình ảnh nét chấp nhận được khi quan sát qua một ống kính. Vùng nằm trong DOF: nét; vùng ngoài (gần hơn hoặc xa hơn focus plane): mờ dần theo khoảng cách. Mức độ mờ phụ thuộc 3 yếu tố cốt lõi: aperture (khẩu độ), focal length (tiêu cự), và subject distance.</p>
  <p>DOF không phải feature digital — nó là đặc tính vật lý của lens optical. Khi ánh sáng đi qua lens không hoàn toàn parallel, chỉ một plane cụ thể được focus tuyệt đối. Plane khác hội tụ tạo &quot;circle of confusion&quot; — kích thước circle quyết định mức độ mờ.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">3 yếu tố quyết định DOF</span>
    <p><strong>Aperture (khẩu độ)</strong>: mở càng to (f-number càng nhỏ — f/1.4 vs f/8), DOF càng shallow. <strong>Focal Length</strong>: tele (85mm+) DOF shallow hơn wide (24mm). <strong>Subject Distance</strong>: gần subject + xa background = shallow DOF (background mờ nhiều).</p>
  </div>

  <ul class="arc-list">
    <li><strong>Focus Plane</strong> — vùng nét tuyệt đối</li>
    <li><strong>Shallow DOF</strong> — vùng nét hẹp, background mờ nhiều</li>
    <li><strong>Deep DOF</strong> — vùng nét rộng, nhiều thứ in focus</li>
    <li><strong>Circle of Confusion</strong> — mức blur ở point ngoài focus</li>
    <li><strong>Hyperfocal Distance</strong> — distance tối ưu để nhiều thứ in focus</li>
    <li><strong>Bokeh</strong> — chất lượng vùng mờ</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"depth of field photography shallow deep aperture comparison"</span>
    </div>
    <p class="arc-image-caption">DOF comparison — f/1.4 shallow vs f/8 deep, cùng subject</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Aperture &amp; F-Stop — yếu tố chính</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>F-stop scale (f/number)</summary>
      <div class="arc-card-body">
        <p>f/1.4, f/2, f/2.8, f/4, f/5.6, f/8, f/11, f/16 — mỗi stop double/halve lượng sáng. F-number nhỏ = aperture mở to = DOF shallow + background mờ nhiều.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Wide aperture (f/1.4 - f/2.8)</summary>
      <div class="arc-card-body">
        <p>DOF rất shallow (vài cm). Phổ biến cho chân dung — face nét, background tan thành bokeh. Ống kính &quot;fast&quot; mở được wide aperture (50mm f/1.4, 85mm f/1.2).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mid aperture (f/4 - f/5.6)</summary>
      <div class="arc-card-body">
        <p>DOF vừa phải. General photography, half-body portrait. Sharpest aperture của hầu hết lens (sweet spot).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Narrow aperture (f/8 - f/16)</summary>
      <div class="arc-card-body">
        <p>DOF rộng — landscape, architecture, group photo. Lưu ý f/22+ có thể bị diffraction softness.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>DOF trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Nhiếp ảnh chân dung</h3>
    <ul class="arc-list">
      <li>85mm f/1.4, 105mm f/1.4 cho shallow DOF cinematic</li>
      <li>Subject isolation từ background distracting</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Landscape Photography</h3>
    <ul class="arc-list">
      <li>f/8 - f/11 với hyperfocal distance cho foreground-background nét</li>
      <li>Tripod required cho slow shutter ở narrow aperture</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cinematography</h3>
    <ul class="arc-list">
      <li>Shallow DOF cho cinematic look — phim feature thường f/2.8-f/4</li>
      <li>Rack focus pull giữa subject foreground và background</li>
      <li>Sensor lớn (full frame, super 35) cho shallow DOF dễ hơn</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3D Rendering</h3>
    <ul class="arc-list">
      <li>Simulated trong V-Ray, Arnold, Octane camera</li>
      <li>Tăng render time nhưng quality cinematic</li>
      <li>Post-DOF dùng z-depth pass cho flexibility</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Smartphone Portrait Mode</h3>
    <ul class="arc-list">
      <li>Camera phone sensor nhỏ — DOF tự nhiên rất deep</li>
      <li>AI mô phỏng shallow DOF — &quot;Portrait Mode&quot; trên iPhone, Android</li>
      <li>Quality cải thiện đáng kể với multi-camera + AI 2023+</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips control DOF</h2>
  <ul class="arc-list">
    <li><strong>Sensor size matters</strong> — full frame DOF shallower hơn crop sensor cùng f/stop</li>
    <li><strong>Lens choice</strong> — 85mm f/1.4 = portrait king cho shallow DOF</li>
    <li><strong>Distance critical</strong> — gần subject + xa background = shallow nhiều</li>
    <li><strong>DOF calculator app</strong> — PhotoPills, DOFmaster cho precise calculation</li>
    <li><strong>Focus stacking</strong> — multiple shots ở focus khác, blend trong post cho extreme depth + sharp</li>
    <li><strong>Cinema lens vs photo lens</strong> — cine lens có aperture ring smooth cho rack focus video</li>
  </ul>
</section>
`,
  },

  // 09. Dialogue
  {
    id: "5f1891a4-5c97-48f7-8306-128a92674b85",
    tieu_de: "Dialogue (Animation)",
    tieu_de_viet: "Khẩu hình thoại (Dialogue Animation)",
    tom_tat:
      "Dialogue trong animation là quá trình làm khớp miệng nhân vật với lời thoại (lip sync) — một công đoạn đòi hỏi kỹ năng quan sát và timing cao. Một trong những thử thách lớn nhất của character animator.",
    meta_title: "Dialogue Animation là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Dialogue Animation là lip sync trong hoạt hình. Tìm hiểu phoneme, mouth shape, workflow animator và principles của lip sync chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Một nhân vật hoạt hình nói thoại — môi cử động khớp đến mức bạn quên rằng đó là animation, không phải diễn viên thật. Đó là lip sync chất lượng cao. Một nhân vật khác môi mở/đóng random không khớp giọng — bạn lập tức &quot;ra khỏi&quot; câu chuyện. Đây là tầm quan trọng của dialogue animation — kỹ thuật đòi hỏi kỹ năng cao nhất trong character animation.</p>
  <p>Dialogue Animation là thử thách lớn của character animator. Hiểu phoneme, mouth shape và workflow giúp tạo dialogue performance &quot;believable&quot; — đặc biệt cho animator làm hoạt hình, game cinematic, VFX with character work.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Dialogue Animation là gì?</h2>
  <p>Dialogue Animation (còn gọi Lip Sync Animation) là quá trình làm khớp chuyển động miệng và biểu cảm khuôn mặt của nhân vật với lời thoại được ghi sẵn. Animator nghe audio nhiều lần, identify từng âm tiết (phoneme), và đặt key pose cho mouth shape (viseme) tương ứng tại đúng thời điểm trên timeline.</p>
  <p>Dialogue animation không chỉ là &quot;khớp miệng&quot; — còn bao gồm body language, eye movement, facial expression. Một animator giỏi không chỉ làm môi cử động, mà toàn body acting để hỗ trợ dialogue — gesture của tay, thay đổi tư thế, eye dart.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Phoneme vs Viseme — khác nhau</span>
    <p><strong>Phoneme</strong>: âm tiết của ngôn ngữ (English có ~44 phoneme). <strong>Viseme</strong>: mouth shape tương ứng để phát phoneme đó. Nhiều phoneme cho cùng một viseme (b, m, p đều mouth khép). Animator chỉ cần làm 9-12 viseme chính, không phải mỗi phoneme một shape.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Phoneme</strong> — âm vị (sound unit) của ngôn ngữ</li>
    <li><strong>Viseme</strong> — mouth shape tương ứng phoneme</li>
    <li><strong>Mouth Shapes (9-12 chính)</strong> — A/I, O, U, M/B/P, F/V, L, E, neutral...</li>
    <li><strong>Timing</strong> — viseme phải hit đúng frame của audio</li>
    <li><strong>Anticipation</strong> — mouth bắt đầu shape vài frame trước sound</li>
    <li><strong>Body Acting</strong> — gesture, expression hỗ trợ dialogue</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"lip sync animation mouth shapes phoneme viseme chart"</span>
    </div>
    <p class="arc-image-caption">Mouth shape chart cho lip sync — 9-12 viseme chính cover most dialogue</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các Mouth Shapes (Viseme) chính</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>A/I — mouth mở rộng (open)</summary>
      <div class="arc-card-body">
        <p>Âm &quot;ah&quot;, &quot;eye&quot;, &quot;ay&quot;. Mouth mở rộng theo chiều ngang, hàm dưới hạ. Mạnh và rõ.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>O — mouth tròn (rounded)</summary>
      <div class="arc-card-body">
        <p>Âm &quot;oh&quot;, &quot;woo&quot;. Mouth pursed, lips push forward thành hình tròn. Width hẹp.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>U / W — small round</summary>
      <div class="arc-card-body">
        <p>Âm &quot;you&quot;, &quot;wood&quot;. Smaller hơn O, more pursed.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>M / B / P — mouth khép kín</summary>
      <div class="arc-card-body">
        <p>Âm &quot;mama&quot;, &quot;baby&quot;, &quot;papa&quot;. Lips touch fully. Critical shape — miss = animation looks wrong.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>F / V — răng cắn môi dưới</summary>
      <div class="arc-card-body">
        <p>Âm &quot;fish&quot;, &quot;very&quot;. Upper teeth touch lower lip. Distinctive shape.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>L / TH — tongue visible</summary>
      <div class="arc-card-body">
        <p>Âm &quot;love&quot;, &quot;think&quot;. Tongue tip visible giữa răng. Realistic animation cần show tongue.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>E / EE — mouth wide ngang</summary>
      <div class="arc-card-body">
        <p>Âm &quot;see&quot;, &quot;he&quot;. Smiling-like, wide horizontal stretch.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Neutral / Closed — rest shape</summary>
      <div class="arc-card-body">
        <p>Giữa các âm, hoặc end of dialogue. Mouth nhẹ closed, slightly open.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Quy trình Dialogue Animation</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Listen audio nhiều lần</summary>
      <div class="arc-card-body">
        <p>Nghe 5-10 lần — internalize timing, emotion, emphasis. Identify key word (stress) trong câu.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Mark phoneme trên timeline</summary>
      <div class="arc-card-body">
        <p>Mở audio waveform trong Maya/Blender. Mark frame của mỗi consonant chính. Vowel có timing rộng hơn.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Block out với viseme chính</summary>
      <div class="arc-card-body">
        <p>Set key pose cho viseme A/I, O, M, F (consonant chính). Stepped mode. Test playback.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Body acting layer</summary>
      <div class="arc-card-body">
        <p>Add body movement, head tilt, eye dart, hand gesture. Body action thường lead audio vài frame (anticipation).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Polish — secondary motion</summary>
      <div class="arc-card-body">
        <p>Refine mouth shape blending, jaw movement, tongue. Eye blink, eyebrow micro-movement. Don&apos;t lock too rigid — natural variation makes it alive.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Dialogue Animation chuyên nghiệp</h2>
  <ul class="arc-list">
    <li><strong>Less is more</strong> — không phải mỗi phoneme một mouth shape. Focus stressed syllable, ignore rest</li>
    <li><strong>Don&apos;t lip-read animation</strong> — exact lip-reading looks unnatural. Suggest mouth shape, not literal</li>
    <li><strong>Body first, mouth last</strong> — body movement support emotion; mouth follows</li>
    <li><strong>Anticipation</strong> — mouth bắt đầu shape 2-3 frame trước sound. Brain expects this.</li>
    <li><strong>Eye contact storytelling</strong> — character looks where they think. Eye dart timing tells story.</li>
    <li><strong>Reference video</strong> — quay bản thân nói lines, study mouth movement, body language</li>
    <li><strong>Less open mouth than expected</strong> — beginner over-opens mouth. Real life mouth movement subtle.</li>
  </ul>
</section>
`,
  },

  // 10. Dieline
  {
    id: "b32c82d8-5ff9-4867-8a1f-2003573f8333",
    tieu_de: "Dieline",
    tieu_de_viet: "Bản dieline (cấu trúc bao bì)",
    tom_tat:
      "Dieline là bản vẽ kỹ thuật thể hiện đường cắt, đường gấp, đường ép của bao bì hoặc tài liệu in — guide cho máy cắt và operator. Nền tảng của thiết kế packaging.",
    meta_title: "Dieline là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Dieline là bản vẽ kỹ thuật cho bao bì với đường cắt, gấp, ép. Tìm hiểu cách đọc dieline và workflow design packaging chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn thiết kế packaging cho một hộp mỹ phẩm — hộp khi mở ra phẳng có hình dạng phức tạp với hàng chục đường gấp và cắt. Làm sao máy cắt biết cắt ở đâu, gấp ở đâu, đục lỗ ở đâu? Câu trả lời là dieline — bản vẽ kỹ thuật mô tả mọi thao tác cần làm cho miếng giấy/bìa thành hộp hoàn chỉnh.</p>
  <p>Dieline là kiến thức cốt lõi cho designer làm packaging. Hiểu dieline và collaborate hiệu quả với printer/structural designer giúp tránh được nhiều lỗi nghiêm trọng có thể tốn hàng chục nghìn USD trong production run lớn.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Dieline là gì?</h2>
  <p>Dieline là bản vẽ kỹ thuật 2D thể hiện cấu trúc của bao bì hoặc ấn phẩm gấp khi unfold thành phẳng. Bao gồm các đường lệnh khác nhau cho máy cắt: <strong>cut line</strong> (đường cắt), <strong>crease/score line</strong> (đường gấp), <strong>perforation</strong> (đục lỗ), <strong>bleed</strong> (tràn lề), <strong>safe area</strong> (vùng an toàn). Mỗi loại đường có color code chuẩn để máy/operator nhận diện đúng.</p>
  <p>Dieline thường được cung cấp bởi nhà in (template có sẵn cho box size phổ biến) hoặc thiết kế custom bởi structural designer/packaging engineer. Designer sau đó &quot;dán&quot; artwork lên dieline để có file production-ready.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Dieline = Engineering + Design</span>
    <p>Dieline là điểm giao giữa engineering (cấu trúc, máy cắt) và design (artwork, branding). Designer thường không tự tạo dieline cho structure phức tạp — có structural designer hoặc xin từ nhà in. Designer master dieline = biết cách work within constraints structure.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Cut Line</strong> — đường cắt (thường đỏ hoặc đen)</li>
    <li><strong>Crease/Score Line</strong> — đường gấp (thường xanh hoặc tím)</li>
    <li><strong>Perforation</strong> — đục lỗ thưa cho xé (dashed line)</li>
    <li><strong>Bleed Area</strong> — vùng tràn 3-5mm</li>
    <li><strong>Safe Area</strong> — vùng nội dung an toàn</li>
    <li><strong>Glue Area</strong> — vùng dán keo (thường marked)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"dieline packaging box flat design illustrator template"</span>
    </div>
    <p class="arc-image-caption">Dieline điển hình — đường cắt, đường gấp, vùng glue, label rõ ràng</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại line trong Dieline</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Cut Line — đường cắt</summary>
      <div class="arc-card-body">
        <p>Đường máy cắt qua, tạo edge cuối của packaging. Thường color magenta hoặc spot color &quot;Cutter&quot;. Solid line continuous.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Crease / Score Line</summary>
      <div class="arc-card-body">
        <p>Đường máy ép tạo line gấp dễ. Không cắt qua, chỉ ép giấy. Thường color cyan hoặc spot color &quot;Crease&quot;. Solid line khác cut.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Perforation</summary>
      <div class="arc-card-body">
        <p>Đục lỗ thưa cho phép xé dễ. Dashed line. Phổ biến cho coupon, ticket, tear-off section.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bleed Line</summary>
      <div class="arc-card-body">
        <p>Đường tham chiếu ngoài cut line 3-5mm. Background phải kéo ra đến đây tránh viền trắng do sai số cắt.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Safe Area Line</summary>
      <div class="arc-card-body">
        <p>Đường trong cut line 3-5mm. Text, logo phải nằm trong safe area để không bị cắt sát.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Spot UV / Foil / Emboss Areas</summary>
      <div class="arc-card-body">
        <p>Vùng cần finishing đặc biệt — spot UV varnish, foil hot stamping, emboss/deboss. Mark với spot color rõ.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Dieline trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Packaging Product</h3>
    <ul class="arc-list">
      <li>Mỹ phẩm, food &amp; beverage, electronics</li>
      <li>Tube box, sleeve box, tuck-end box — mỗi loại có dieline template riêng</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Brochure Folded</h3>
    <ul class="arc-list">
      <li>Tri-fold, gate fold, accordion — dieline với crease line đúng vị trí</li>
      <li>Multi-page với perforation cho tear-off voucher</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Mail Pack / Direct Mail</h3>
    <ul class="arc-list">
      <li>Self-mailer với crease và perforation</li>
      <li>Envelope custom shape</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Luxury Packaging</h3>
    <ul class="arc-list">
      <li>Rigid box, magnet box — dieline rất chi tiết với multiple layer</li>
      <li>Foil, emboss area marking critical</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Point-of-Sale Display</h3>
    <ul class="arc-list">
      <li>Standee, shelf display — structural engineering</li>
      <li>Hanging tag, hang tab integration</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Workflow Design với Dieline</h2>
  <ul class="arc-list">
    <li><strong>1. Xin dieline từ nhà in</strong> — họ có template cho size chuẩn, hoặc custom design structural</li>
    <li><strong>2. Set up file Illustrator</strong> — dieline ở separate layer trên cùng, locked</li>
    <li><strong>3. Color code đúng</strong> — cut line magenta spot, crease cyan spot — quy ước nhà in</li>
    <li><strong>4. Design artwork</strong> — work trong cut + bleed area, text trong safe area</li>
    <li><strong>5. 3D mockup</strong> — Adobe Dimension, Boxshot, hoặc plugin C4D để visualize 3D</li>
    <li><strong>6. Proof check</strong> — print mockup nhỏ, fold thử bằng tay trước khi gửi production</li>
    <li><strong>7. Send to printer</strong> — export PDF với spot color, bleed, dieline preserved</li>
  </ul>
</section>
`,
  },
];

console.log(`\n── Bắt đầu chạy ${items.length} bài keyword đợt 1.7 ──\n`);

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
