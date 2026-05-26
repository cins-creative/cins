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
  // 01. Game Mechanics
  {
    id: "955e4490-662a-4caf-a0e3-34d19722cba4",
    tieu_de: "Game Mechanics",
    tieu_de_viet: "Cơ chế game (Game Mechanics)",
    tom_tat:
      "Game Mechanics là các quy tắc, hệ thống và phương thức người chơi tương tác với game — định hình lối chơi và quyết định game fun hay không. Core loop, progression, combat đều là mechanics.",
    meta_title:
      "Game Mechanics là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Game Mechanics là các quy tắc tạo nên gameplay. Tìm hiểu core loop, progression, combat và cách thiết kế mechanics hấp dẫn.",
    noi_dung: `
<section class="arc-intro">
  <p>Tại sao Tetris vẫn còn fun sau 40 năm? Tại sao Among Us viral trong COVID? Tại sao Wordle gây sốt khắp thế giới? Không phải vì graphics đẹp hay budget khủng — mà vì <strong>game mechanics</strong> well-designed. Mechanic là DNA của game — quyết định game có addictive, có replayable, có meaningful không.</p>
  <p>Game Mechanics là kiến thức cốt lõi cho game designer. Hiểu mechanics fundamentals và cách design loop, progression, feedback loop là kỹ năng phân biệt designer junior và senior — và là cốt lõi của game success/failure.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Game Mechanics là gì?</h2>
  <p>Game Mechanics là các <strong>rules, systems, và interactions</strong> trong game định hình cách người chơi engage với game world. Bao gồm: rules (luật chơi), actions player có thể làm (jump, attack, build), consequences của actions, feedback loops (reward, punishment), progression systems (level up, unlock), economy (resource, currency).</p>
  <p>Mechanics tốt làm player vào &quot;flow state&quot; — thử thách phù hợp với skill, feedback rõ ràng, choice meaningful. Mechanics tệ frustrating, repetitive, không reward. Game design fundamentally là craft of designing mechanics — story và graphics chỉ là vehicle để delivery mechanics.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Mechanics vs Dynamics vs Aesthetics (MDA Framework)</span>
    <p>Framework nổi tiếng của Hunicke, LeBlanc, Zubek. <strong>Mechanics</strong>: rules và systems designer write. <strong>Dynamics</strong>: behavior emerge khi player interact với mechanics. <strong>Aesthetics</strong>: emotional response — fun, challenge, fellowship. Designer design mechanics, but ultimately deliver aesthetics.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Core Loop</strong> — basic action repeat tạo gameplay</li>
    <li><strong>Progression</strong> — XP, levels, unlocks</li>
    <li><strong>Combat</strong> — attack, defense, special abilities</li>
    <li><strong>Economy</strong> — resources, crafting, trade</li>
    <li><strong>Movement</strong> — locomotion (jump, dash, fly)</li>
    <li><strong>Risk-Reward</strong> — risk taking với potential reward</li>
    <li><strong>Choice &amp; Consequence</strong> — meaningful decisions</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"game mechanics design core loop progression combat"</span>
    </div>
    <p class="arc-image-caption">Game Mechanics — rules, systems, interactions tạo gameplay</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Mechanics chính</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Core Loop</summary>
      <div class="arc-card-body">
        <p>Action repeat tạo gameplay foundation. Tetris: drop block → clear line → score. Stardew Valley: farm → harvest → sell → buy seeds. Minecraft: gather → build → explore.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Combat Mechanics</summary>
      <div class="arc-card-body">
        <p>Attack, defense, dodge. Stamina system (Dark Souls), combo (Devil May Cry), turn-based (Final Fantasy). Mỗi style có aesthetic riêng.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Progression Systems</summary>
      <div class="arc-card-body">
        <p>XP, level, skill tree, unlocks. Long-term motivation. RPG depend on progression deeply. Risk: too slow = boring, too fast = no satisfaction.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Economy &amp; Resources</summary>
      <div class="arc-card-body">
        <p>Currency, materials, crafting. Strategy game heavy economy. F2P game core economy = monetization.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Movement &amp; Traversal</summary>
      <div class="arc-card-body">
        <p>Walking, running, jumping, dashing, flying, climbing. Spider-Man swing, Breath of the Wild climbing, Mario jumping — movement IS the game đôi khi.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Risk-Reward Mechanics</summary>
      <div class="arc-card-body">
        <p>Higher risk = higher reward. Permadeath (roguelike), high-stakes betting (poker), Dark Souls bonfire choice. Tension và excitement.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Choice &amp; Consequence</summary>
      <div class="arc-card-body">
        <p>Decision affect game world. Mass Effect dialog, Witcher 3 quest outcomes. Replayability từ multiple paths.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Puzzle Mechanics</summary>
      <div class="arc-card-body">
        <p>Logic, spatial reasoning, pattern recognition. Portal portals, The Witness puzzles. Cognitive reward khi solve.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Principles thiết kế Mechanics tốt</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Easy to Learn, Hard to Master</h3>
    <ul class="arc-list">
      <li>Player hiểu basic trong 30 giây</li>
      <li>Master takes years (Chess, Go, StarCraft)</li>
      <li>Depth comes from mechanic interaction, không từ complexity</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Feedback Loops</h3>
    <ul class="arc-list">
      <li>Player action → clear consequence visible/audible</li>
      <li>Reward immediate (Mario coin sound) + long-term (level up)</li>
      <li>Punishment fair (death from skill issue, not unfair RNG)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Meaningful Choices</h3>
    <ul class="arc-list">
      <li>Every choice should matter</li>
      <li>No &quot;objectively best&quot; option (trade-offs)</li>
      <li>Player feel agency</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Iterate &amp; Playtest</h3>
    <ul class="arc-list">
      <li>Paper prototype trước digital implement</li>
      <li>Test mechanic alone trước polish</li>
      <li>Watch player play — không hint, see what they do</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">One Strong Hook</h3>
    <ul class="arc-list">
      <li>One signature mechanic memorable</li>
      <li>Portal = portals, Braid = time rewind, Katana ZERO = slow-mo</li>
      <li>Don&apos;t cram nhiều mechanics — pick best</li>
    </ul>
  </div>
</section>
`,
  },

  // 02. Game Testing
  {
    id: "85e77bee-2996-4a09-810b-0e6fec6e2081",
    tieu_de: "Game Testing",
    tieu_de_viet: "Kiểm thử game (Game Testing)",
    tom_tat:
      "Game Testing là quá trình kiểm tra game tìm bug, vấn đề balance, và đánh giá fun factor — bao gồm QA testing kỹ thuật (technical bugs) và playtesting (user experience).",
    meta_title: "Game Testing là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Game Testing kiểm tra bug, balance, UX. Tìm hiểu QA testing, playtesting và career path trong game testing professional.",
    noi_dung: `
<section class="arc-intro">
  <p>Cyberpunk 2077 launch 2020 — bug khắp nơi, performance khủng khiếp, player refund mass. Reputation damage cho CD Projekt Red kéo dài 2 năm. Đây là consequence của game testing không adequate. Game testing là một trong những phase critical nhất của game development — bỏ qua = disaster.</p>
  <p>Game Testing là chuyên môn quan trọng, là entry point cho nhiều career trong game industry. Hiểu các loại testing, methodology và pathway từ QA tester lên game designer giúp aspiring game dev biết career trajectory và contribute hiệu quả.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Game Testing là gì?</h2>
  <p>Game Testing là quá trình kiểm tra game ở nhiều khía cạnh: <strong>functionality</strong> (mọi feature work), <strong>bugs</strong> (crash, glitch, exploit), <strong>balance</strong> (gameplay fair, fun), <strong>compatibility</strong> (work trên target hardware), <strong>performance</strong> (FPS, loading time), <strong>localization</strong> (text/voice ngôn ngữ khác đúng), <strong>UX</strong> (interface intuitive). Là phase quan trọng nhất trước launch — bug shipped = reputation damage.</p>
  <p>Có 2 nhánh chính: <strong>QA Testing</strong> (technical) — tester systematic tìm bug, file report, test fix. <strong>Playtesting</strong> (UX/design) — player target watch play, designer observe để identify pain point, fun gap. AAA dùng cả 2, indie thường skip QA dedicated.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">QA Tester vs Playtester — phân biệt</span>
    <p><strong>QA Tester</strong>: focus technical — find bugs, edge cases, regression. Systematic approach, report bugs detailed. Background technical knowledge. <strong>Playtester</strong>: focus UX — &quot;is it fun?&quot;, &quot;is it confusing?&quot;. Different player types target audience. Studio thường có cả hai — QA in-house, playtest external recruit.</p>
  </div>

  <ul class="arc-list">
    <li><strong>QA Tester</strong> — technical bug hunter</li>
    <li><strong>Playtester</strong> — UX observer</li>
    <li><strong>Regression Testing</strong> — retest sau fix</li>
    <li><strong>Beta Testing</strong> — broader player audience</li>
    <li><strong>Compatibility Testing</strong> — hardware/OS variations</li>
    <li><strong>Localization Testing</strong> — language version</li>
    <li><strong>Performance Testing</strong> — FPS, memory, load</li>
    <li><strong>Bug Report</strong> — document để dev fix</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"game testing QA tester bug report playtesting"</span>
    </div>
    <p class="arc-image-caption">Game Testing — QA technical bug hunt + Playtesting UX evaluation</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Game Testing</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Functionality Testing</summary>
      <div class="arc-card-body">
        <p>Mọi feature work as designed. Each button do correct action, menus navigate đúng, save/load functional. Most basic level QA.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bug Hunting</summary>
      <div class="arc-card-body">
        <p>Find crashes, glitches, exploit. Try weird input combination, edge cases. &quot;What happens if I do X while Y is loading?&quot;. Methodical approach.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Balance Testing</summary>
      <div class="arc-card-body">
        <p>Multiplayer game critical — character/weapon balance fair? Strategy too dominant? Data collection key.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Compatibility Testing</summary>
      <div class="arc-card-body">
        <p>Test trên min spec hardware, multiple OS version, various GPU. Especially PC game wide hardware range.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Performance Testing</summary>
      <div class="arc-card-body">
        <p>FPS consistent? Memory leak? Loading time acceptable? Monitor profiler data, stress test scenarios.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Localization Testing</summary>
      <div class="arc-card-body">
        <p>Multi-language version — text overflow, font issue, cultural reference. Native speaker review.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Playtest / Usability</summary>
      <div class="arc-card-body">
        <p>Watch target players play. Where confused? Where bored? Where excited? Observation > opinion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Beta Testing</summary>
      <div class="arc-card-body">
        <p>Public beta — wide audience test pre-launch. Stress test servers, identify niche bugs, marketing buzz.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Career Path Game Testing</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">QA Tester (Entry Level)</h3>
    <ul class="arc-list">
      <li>Salary $30-50K (US, entry)</li>
      <li>No degree required, passion for games</li>
      <li>Document bugs detailed</li>
      <li>Entry point vào ngành game</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Senior QA / Lead Tester</h3>
    <ul class="arc-list">
      <li>$50-80K</li>
      <li>Manage QA team</li>
      <li>Design test plan, methodology</li>
      <li>Communication với dev team</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">QA Manager / Director</h3>
    <ul class="arc-list">
      <li>$80-150K</li>
      <li>Strategy QA cho entire project</li>
      <li>Hiring, training</li>
      <li>Cross-team coordination</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Transition Path</h3>
    <ul class="arc-list">
      <li>QA → Game Designer (common)</li>
      <li>QA → Producer/Project Manager</li>
      <li>QA → Programmer (less common)</li>
      <li>Knowing entire game inside out là asset cho many roles</li>
    </ul>
  </div>
</section>
`,
  },

  // 03. Geometry Nodes
  {
    id: "3e5ca25e-9af0-49e7-af5d-1b91c271e53a",
    tieu_de: "Geometry Nodes",
    tieu_de_viet: "Geometry Nodes (Blender)",
    tom_tat:
      "Geometry Nodes là hệ thống procedural trong Blender cho phép tạo và chỉnh sửa hình học 3D bằng node graph — linh hoạt và non-destructive, phù hợp cho scatter, modeling phức tạp, VFX.",
    meta_title:
      "Geometry Nodes là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Geometry Nodes Blender procedural modeling. Tìm hiểu node-based workflow, scatter system và alternative cho Houdini.",
    noi_dung: `
<section class="arc-intro">
  <p>Houdini đã dominate procedural 3D suốt 30 năm. Modeller dùng Houdini cho scatter forest, generate city, complex VFX. Nhưng Houdini đắt và khó học. <strong>Geometry Nodes</strong> trong Blender (introduced 2021) bring procedural power vào ecosystem free — &quot;Houdini-like&quot; capabilities cho indie và freelance.</p>
  <p>Geometry Nodes là tool revolutionary cho Blender artist. Hiểu Geometry Nodes mở ra workflow procedural mới — scatter, parametric modeling, simulation — kỹ năng nâng cao cho 3D artist serious về Blender.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Geometry Nodes là gì?</h2>
  <p>Geometry Nodes là <strong>procedural geometry modification system</strong> trong Blender (introduced 2.92, mature trong 3.0+). Cho phép artist tạo và modify mesh, curves, point clouds bằng visual node graph — không destruct mesh gốc. Output là một &quot;modifier&quot; — non-destructive, có thể tweak parameter realtime.</p>
  <p>Inspired bởi Houdini SOP (Surface Operator) system. Blender bring concept procedural vào mainstream — free, easier learning curve than Houdini. Modern Blender pipeline heavily use Geometry Nodes cho asset variations, scatter, parametric design.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Geometry Nodes vs Houdini</span>
    <p><strong>Geometry Nodes</strong>: free trong Blender, easier UI, less features. Phù hợp indie, freelance. <strong>Houdini</strong>: industry standard cho VFX cao cấp, $4,500 commercial license. Có solver phức tạp (fluid, pyro, RBD) mà Blender chưa có. Studio film big dùng Houdini. Indie/personal dùng Geometry Nodes.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Node Graph</strong> — visual programming với connected nodes</li>
    <li><strong>Geometry</strong> — input mesh/curve/point</li>
    <li><strong>Modifier-based</strong> — non-destructive, attach to object</li>
    <li><strong>Attributes</strong> — custom data per vertex/face/point</li>
    <li><strong>Field</strong> — generalized attribute concept</li>
    <li><strong>Simulation Nodes</strong> — newer feature cho dynamic</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"geometry nodes blender procedural modeling node graph"</span>
    </div>
    <p class="arc-image-caption">Geometry Nodes — node graph cho procedural geometry modification</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Use Cases Geometry Nodes</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Scatter / Distribute Objects</summary>
      <div class="arc-card-body">
        <p>Scatter tree trên terrain, rock random, grass blade. Distribute Points on Faces node + Instance node = scatter forest trong 5 minutes.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Parametric Modeling</summary>
      <div class="arc-card-body">
        <p>Build asset với parameter — building generator (floor count, window count adjustable), gear (teeth count, size). Reusable across project.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Procedural Detail</summary>
      <div class="arc-card-body">
        <p>Add boulders trên cliff face, debris trên ground, weathering edge. Random variation tự nhiên.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hair / Fur</summary>
      <div class="arc-card-body">
        <p>Modern Blender hair system based on Geometry Nodes. Curve-based hair với clumping, frizz, length variation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Simulation</summary>
      <div class="arc-card-body">
        <p>Simulation Nodes (Blender 3.6+) — particle simulation, custom physics. Future replace traditional particle system.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Motion Graphics</summary>
      <div class="arc-card-body">
        <p>Procedural motion graphics — abstract shape animation, parametric design. Cinema 4D-like workflow trong Blender free.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Geometry Nodes cơ bản</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Add Geometry Nodes Modifier</h3>
    <ul class="arc-list">
      <li>Select object, add Geometry Nodes modifier</li>
      <li>Switch sang Geometry Nodes editor</li>
      <li>Default node tree: Input → Output</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Build Node Graph</h3>
    <ul class="arc-list">
      <li>Drag nodes từ Add menu</li>
      <li>Connect socket → socket</li>
      <li>Common nodes: Distribute Points, Instance on Points, Transform</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Expose Parameters</h3>
    <ul class="arc-list">
      <li>Click socket → make input cho modifier panel</li>
      <li>Artist tweak parameter trong Modifier panel (no need open node)</li>
      <li>Make node group asset reusable</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Iterate</h3>
    <ul class="arc-list">
      <li>Realtime feedback — change → see immediate</li>
      <li>Non-destructive — tweak anytime</li>
      <li>Save node group, share giữa project</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Resources học Geometry Nodes</h2>
  <ul class="arc-list">
    <li><strong>Blender official docs</strong> — Geometry Nodes section</li>
    <li><strong>YouTube</strong>: Erindale, Bradley Animation, Ducky 3D — masters tutorial</li>
    <li><strong>Blender Studio</strong> — official courses</li>
    <li><strong>Blender Market</strong> — premium Geometry Nodes assets</li>
    <li><strong>Reddit r/blender</strong> — community examples</li>
  </ul>
</section>
`,
  },

  // 04. Giải phẫu
  {
    id: "ea4ae4fc-505a-4d9c-9cb4-0a7590dd6604",
    tieu_de: "Giải phẫu (Anatomy)",
    tieu_de_viet: "Giải phẫu (Anatomy) cho artist",
    tom_tat:
      "Giải phẫu là môn học nghiên cứu cấu trúc cơ thể người và động vật — kiến thức nền tảng quan trọng cho character artist, 3D modeler, animator để tạo nhân vật realistic và believable.",
    meta_title: "Giải phẫu (Anatomy) là gì? Ý nghĩa và ứng dụng | CINS",
    meta_description:
      "Anatomy cho artist là kiến thức cơ thể người. Tìm hiểu skeleton, muscle, proportion và resources học anatomy cho character artist.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Avatar — Na&apos;vi character anatomy mặc dù alien nhưng based on human structure (skeleton, muscle), nên feel believable. Nếu Na&apos;vi có 6 fingers random hoặc joint sai vị trí — uncanny valley. <strong>Anatomy</strong> là một trong những kiến thức &quot;invisible&quot; nhưng critical — khán giả không nhận ra khi đúng, nhưng feel &quot;off&quot; khi sai.</p>
  <p>Anatomy là kiến thức cơ bản cho character artist, 3D modeler, animator, illustrator. Đầu tư học anatomy là long-term investment — kỹ năng không lỗi thời, transfer giữa medium (2D, 3D, animation), tạo nhân vật believable foundation.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Anatomy cho Artist là gì?</h2>
  <p>Anatomy cho artist là môn học cấu trúc cơ thể — <strong>skeleton</strong> (xương), <strong>muscles</strong> (cơ), <strong>proportions</strong> (tỷ lệ), <strong>landmarks</strong> (điểm tham chiếu surface anatomy) — của human và animal. Khác với medical anatomy (cực kỳ chi tiết, mọi nerve, vessel), artist anatomy focus vào những gì <strong>nhìn thấy từ surface</strong> và ảnh hưởng đến form, pose.</p>
  <p>Có 3 layer kiến thức artist cần: (1) <strong>Skeletal anatomy</strong> — xương define proportion, joint range; (2) <strong>Muscle anatomy</strong> — define surface form, bulk, vector; (3) <strong>Surface anatomy</strong> — skin landmark thấy được qua cloth, fat distribution.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Why Anatomy &gt; Reference Photo?</span>
    <p>Reference photo helps but không thay anatomy knowledge. Photo show specific pose, specific lighting, specific person. Anatomy knowledge cho phép draw any pose, any lighting, any body type — vì hiểu underlying structure. Reference + anatomy = master.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Skeletal Anatomy</strong> — bones, proportions, joints</li>
    <li><strong>Myology</strong> — muscle anatomy</li>
    <li><strong>Proportions</strong> — 8-head ideal figure</li>
    <li><strong>Gesture</strong> — pose, weight, balance</li>
    <li><strong>Surface Anatomy</strong> — landmarks visible</li>
    <li><strong>Foreshortening</strong> — pose viewed at angle</li>
    <li><strong>Comparative Anatomy</strong> — animal vs human</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"anatomy artist drawing skeleton muscle reference loomis"</span>
    </div>
    <p class="arc-image-caption">Anatomy cho artist — skeleton, muscle, surface landmark cho realistic character</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Anatomy trong từng lĩnh vực</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Character Modeling (3D)</summary>
      <div class="arc-card-body">
        <p>ZBrush sculpting bắt đầu từ anatomy. Wrong proportion = uncanny valley. ZBrush có anatomy reference brush, asset.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Character Design / Illustration</summary>
      <div class="arc-card-body">
        <p>2D character — even stylized cartoon based on anatomy. Mickey Mouse 8-head proportion, just simplified.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Animation</summary>
      <div class="arc-card-body">
        <p>Animator move body parts — must know joint range, muscle action. Bad anatomy animation = unconvincing motion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Concept Art</summary>
      <div class="arc-card-body">
        <p>Creature design start với anatomy understanding. Hybrid creature (dragon, alien) feel real khi anatomy logical — bone structure, muscle attachment.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Comics &amp; Manga</summary>
      <div class="arc-card-body">
        <p>Dynamic pose, foreshortening — anatomy intensive. Top mangaka spend years studying anatomy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Medical Illustration</summary>
      <div class="arc-card-body">
        <p>Specialized field combining art + medical knowledge. Extreme precision required.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Resources học Anatomy</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Classic Books</h3>
    <ul class="arc-list">
      <li><strong>Bridgman&apos;s Complete Guide to Drawing from Life</strong> — bible of figure drawing</li>
      <li><strong>Andrew Loomis - Figure Drawing for All It&apos;s Worth</strong> — proportions</li>
      <li><strong>Anatomy for Sculptors</strong> — Uldis Zarins (modern, visual)</li>
      <li><strong>Constructive Anatomy</strong> — George B. Bridgman</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Video Courses</h3>
    <ul class="arc-list">
      <li><strong>Proko.com</strong> — Stan Prokopenko, best video anatomy course</li>
      <li><strong>New Masters Academy</strong> — comprehensive online classical art</li>
      <li><strong>Marc Brunet Art School</strong> — character design + anatomy</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Life Drawing</h3>
    <ul class="arc-list">
      <li>Local life drawing class — best learning</li>
      <li>Online: Quickposes, Line of Action — reference photo</li>
      <li>Practice daily 30 phút gesture sketching</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3D Anatomy Apps</h3>
    <ul class="arc-list">
      <li><strong>Z-Anatomy</strong> — free 3D anatomy explorer</li>
      <li><strong>Complete Anatomy</strong> — paid app, comprehensive</li>
      <li><strong>Anatomy 360</strong> — photo reference 360 pose</li>
    </ul>
  </div>
</section>
`,
  },

  // 05. Glitch
  {
    id: "51cbd099-d715-4b19-939c-b17a7fc20a66",
    tieu_de: "Glitch Art",
    tieu_de_viet: "Nghệ thuật lỗi kỹ thuật số (Glitch)",
    tom_tat:
      "Glitch là hiệu ứng mô phỏng lỗi kỹ thuật số — nhiễu pixel, dịch chuyển màu, artifacts — được dùng có chủ đích trong motion graphics, design, music như phong cách thẩm mỹ.",
    meta_title: "Glitch là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Glitch effect mô phỏng lỗi kỹ thuật số. Tìm hiểu cách tạo glitch trong After Effects, Photoshop và ứng dụng motion graphics.",
    noi_dung: `
<section class="arc-intro">
  <p>Mr. Robot intro — title text bị glitch, RGB shift, scan line. Cyberpunk game UI — &quot;hacking&quot; effect với pixel sort, digital artifacts. Music video Aphex Twin — visual broken, distorted. Glitch art chuyển từ &quot;system error&quot; thành <strong>aesthetic intentional</strong> — dòng nghệ thuật riêng biệt trong digital age.</p>
  <p>Glitch là kỹ thuật quan trọng cho motion designer và VFX artist. Hiểu cách tạo glitch convincing và biết khi nào dùng giúp design contemporary aesthetic, đặc biệt cho cyberpunk, tech brand, music video, game UI.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Glitch Art là gì?</h2>
  <p>Glitch Art là <strong>aesthetic style</strong> mô phỏng hoặc khai thác lỗi kỹ thuật số — pixel sort, color shift (RGB split), data bending, scanlines, digital artifacts, distortion. Bắt nguồn từ thực tế: phim cũ trầy xước, VHS warp, TV antenna sai, JPEG compression artifact. Nghệ sĩ glitch khai thác những &quot;errors&quot; này có chủ đích như aesthetic — biểu hiện của technology imperfection, decay digital, anxiety contemporary.</p>
  <p>Glitch xuất hiện từ early digital art 1990s (Cory Arcangel), explode trong 2010s với hipster aesthetic, social media remix culture. Modern usage trong cyberpunk media (Cyberpunk 2077, Watch Dogs), tech-focused music video, brand contemporary (Apple privacy ad có glitch element), horror genre (glitch evoke unease).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Glitch &quot;Real&quot; vs Faked</span>
    <p><strong>Real glitch</strong>: corrupt file intentional (databending JPEG), feedback loop hardware. Authentic but uncontrollable. <strong>Faked glitch</strong>: simulate với software effect (AE plugin, Photoshop filter). Controllable, repeatable cho production. Most commercial work fake glitch — real glitch art lives more trong niche art community.</p>
  </div>

  <ul class="arc-list">
    <li><strong>RGB Split / Chromatic Aberration</strong> — color channel offset</li>
    <li><strong>Pixel Sort</strong> — sort pixel theo brightness, color</li>
    <li><strong>Scan Lines</strong> — horizontal lines CRT TV</li>
    <li><strong>Datamoshing</strong> — corrupt video file</li>
    <li><strong>Compression Artifacts</strong> — exaggerated JPEG/MPEG noise</li>
    <li><strong>Bit Crush</strong> — reduce color depth</li>
    <li><strong>Tracking Error</strong> — VHS-style horizontal distortion</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"glitch art digital aesthetic rgb split pixel sort cyberpunk"</span>
    </div>
    <p class="arc-image-caption">Glitch art — digital error như aesthetic style cho motion, design, music</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Cách tạo Glitch</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>In After Effects</summary>
      <div class="arc-card-body">
        <p>Native effects: <strong>Channel Shift</strong> (RGB offset), <strong>Bad TV</strong>, <strong>Mosaic</strong>. Premium plugin: <strong>Red Giant Universe Glitch</strong>, <strong>Sapphire Glitch</strong>, <strong>Plexus</strong>. Tutorial YouTube nhiều.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>In Photoshop</summary>
      <div class="arc-card-body">
        <p>Channel Split (R, G, B layer separate, offset different position). Add Noise. Mosaic Pixelate selectively. Glitch action presets dễ buy/free.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>In DaVinci Resolve / Premiere</summary>
      <div class="arc-card-body">
        <p>Lumetri Color RGB curves shift. Bad TV filter, scan lines plugin. Native effects + 3rd party plugins.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Real Glitch (Databending)</summary>
      <div class="arc-card-body">
        <p>Open JPEG/PNG trong text editor, corrupt random bytes. Save → open as image → glitch effect. Cool but unpredictable. JPEG corruption đặc trưng.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pixel Sorting Tools</summary>
      <div class="arc-card-body">
        <p>Asdf Pixel Sort (Processing), online tools (pixelsorter.org). Sort pixel along axis by brightness/hue tạo signature look.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>VHS Look</summary>
      <div class="arc-card-body">
        <p>Specific subset of glitch — VHS warp, tracking line, color bleed, scan line. Plugin: TVPixel, VHS Glitch Generator AE.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Glitch trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Title Sequence / Branding</h3>
    <ul class="arc-list">
      <li>Mr. Robot, Black Mirror — iconic glitch title</li>
      <li>Cyberpunk 2077 game UI — heavy glitch aesthetic</li>
      <li>Brand cyberpunk, tech edgy</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Music Video</h3>
    <ul class="arc-list">
      <li>Aphex Twin, Squarepusher — IDM/electronic glitch foundational</li>
      <li>Music video alternative rock, indie often use glitch</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Horror Genre</h3>
    <ul class="arc-list">
      <li>Glitch tạo unease — wrong, broken, alien</li>
      <li>Found footage horror dùng VHS glitch</li>
      <li>Game horror (P.T., Resident Evil) glitch jump scare</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Album Cover &amp; Poster</h3>
    <ul class="arc-list">
      <li>Indie album, electronic music phổ biến</li>
      <li>Cyberpunk/dystopian movie poster</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Social Media Aesthetic</h3>
    <ul class="arc-list">
      <li>Vaporwave, retrowave aesthetic dùng glitch</li>
      <li>Instagram, TikTok edit với glitch transition</li>
    </ul>
  </div>
</section>
`,
  },

  // 06. Global Illumination
  {
    id: "9943279f-a366-4b51-a61b-8a6b9181c638",
    tieu_de: "Global Illumination (GI)",
    tieu_de_viet: "Global Illumination — Chiếu sáng toàn cục",
    tom_tat:
      "Global Illumination (GI) là kỹ thuật dựng hình mô phỏng ánh sáng gián tiếp — ánh sáng phản xạ giữa các bề mặt — tạo hiệu ứng ánh sáng chân thực, color bleeding, ambient lighting.",
    meta_title: "Global Illumination là gì? Ý nghĩa và ứng dụng | CINS",
    meta_description:
      "Global Illumination tạo ánh sáng chân thực trong 3D. Tìm hiểu path tracing, ray tracing, baked GI và Lumen của Unreal Engine 5.",
    noi_dung: `
<section class="arc-intro">
  <p>Trong một phòng có cửa sổ — ánh sáng từ cửa hắt vào tường, tường phản chiếu nhẹ vào sàn, sàn lại bounce lên trần. Color của tường vàng tô nhẹ lên sàn trắng — &quot;color bleeding&quot;. Đây là <strong>indirect lighting</strong> — ánh sáng gián tiếp. CGI old chỉ tính direct light → flat, unnatural. <strong>Global Illumination (GI)</strong> simulate ánh sáng bounce → realistic, photographic.</p>
  <p>Global Illumination là kiến thức quan trọng cho 3D artist, lighting artist. Hiểu GI methods, khi nào dùng cái nào (baked, real-time, path tracing) giúp lighting realistic và efficient — trade-off quality vs performance critical cho project AAA và indie.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Global Illumination là gì?</h2>
  <p>Global Illumination (GI) là kỹ thuật rendering mô phỏng <strong>tất cả ánh sáng</strong> trong scene — bao gồm cả <strong>direct light</strong> (từ source thẳng đến surface) và <strong>indirect light</strong> (ánh sáng bounce giữa surfaces). Trong real world, ánh sáng bounce vô số lần cho đến khi tan biến — GI simulate này computationally.</p>
  <p>Trước GI (1990s), CGI dùng &quot;ambient light&quot; — uniform background light fake — flat, không realistic. GI mathematically simulate light transport — Monte Carlo path tracing, photon mapping, radiosity. Mỗi method có trade-off quality vs speed.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Direct vs Indirect Light</span>
    <p><strong>Direct light</strong>: từ light source đến surface trực tiếp. Easy compute. <strong>Indirect light</strong>: ánh sáng bounce — wall to floor to character. Expensive compute (recursive). GI quan trọng cho indirect — chiếm 30-70% lighting trong scene real.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Path Tracing</strong> — Monte Carlo brute force, highest quality</li>
    <li><strong>Photon Mapping</strong> — emit photon từ light, trace</li>
    <li><strong>Radiosity</strong> — diffuse only, fast for architecture</li>
    <li><strong>Light Baking</strong> — pre-compute, store in texture</li>
    <li><strong>Real-time GI</strong> — game engine modern (Lumen, voxel)</li>
    <li><strong>Color Bleeding</strong> — tinted reflection từ bề mặt màu</li>
    <li><strong>Caustics</strong> — focused light qua refraction</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"global illumination path tracing color bleeding indirect light"</span>
    </div>
    <p class="arc-image-caption">Global Illumination — ánh sáng bounce giữa surfaces tạo lighting chân thực</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Methods Global Illumination</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Path Tracing</summary>
      <div class="arc-card-body">
        <p>Highest quality, brute force. Trace ray từ camera, bounce nhiều lần. Monte Carlo sampling. Slow but photoreal. Render engines: Arnold, V-Ray, Octane, Cycles (Blender).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Photon Mapping</summary>
      <div class="arc-card-body">
        <p>Emit photon từ light, trace bounce, store in photon map. Then trace từ camera lookup map. Fast cho caustics. Mental Ray, Maxwell.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Radiosity</summary>
      <div class="arc-card-body">
        <p>Solve light energy giữa patches surface. Diffuse-only — không reflection sharp. Pre-compute, then realtime preview. Old method, less used modern.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Light Baking</summary>
      <div class="arc-card-body">
        <p>Pre-compute GI lưu vào texture (lightmap). Game engine traditional (Unity, Unreal). Fast runtime, fixed lighting. Modern game still use cho static lighting.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Voxel GI (VXGI)</summary>
      <div class="arc-card-body">
        <p>Voxelize scene, propagate light qua voxels. Real-time, dynamic lighting. NVIDIA VXGI, CryEngine SVOGI.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Screen-Space GI (SSGI)</summary>
      <div class="arc-card-body">
        <p>Approximate GI using screen-space info. Fast but only what camera see. Limited but common cho game.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lumen (Unreal Engine 5)</summary>
      <div class="arc-card-body">
        <p>Hybrid system — distance field tracing + screen-space + cards. Dynamic GI realtime. Game-changer cho Unreal 5. Even mid-range PC handle.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>GI trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Film &amp; VFX (Offline)</h3>
    <ul class="arc-list">
      <li>Path tracing chuẩn — Arnold, V-Ray, RenderMan</li>
      <li>Bounces 4-10+ cho realism</li>
      <li>Long render time (hours per frame) acceptable</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Architectural Viz</h3>
    <ul class="arc-list">
      <li>V-Ray, Corona — chuẩn cho architecture</li>
      <li>GI critical cho interior realistic</li>
      <li>Light baking cho still image cao quality</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game (Real-time)</h3>
    <ul class="arc-list">
      <li>Older: baked lightmap chuẩn</li>
      <li>Modern: Lumen (UE5), Enlighten, Voxel GI</li>
      <li>Ray tracing hardware (RTX) — RT GI true</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation Studio</h3>
    <ul class="arc-list">
      <li>Pixar RenderMan, Solaris/Karma (Houdini)</li>
      <li>Path tracing for film quality</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Product Viz / Advertising</h3>
    <ul class="arc-list">
      <li>Octane, Redshift GPU-accelerated path tracing</li>
      <li>Fast iteration cho commercial work</li>
    </ul>
  </div>
</section>
`,
  },

  // 07. Gradient
  {
    id: "5266ec40-bf41-4c4c-93ea-6771d64053d1",
    tieu_de: "Gradient",
    tieu_de_viet: "Chuyển màu (Gradient)",
    tom_tat:
      "Gradient là chuyển tiếp màu sắc mượt mà giữa hai hoặc nhiều màu — kỹ thuật cơ bản trong design tạo depth, mood, và visual interest. Linear, radial, conic là các loại gradient phổ biến.",
    meta_title: "Gradient là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Gradient chuyển màu mượt trong design. Tìm hiểu các loại gradient, color theory và ứng dụng trong UI, branding, motion graphics.",
    noi_dung: `
<section class="arc-intro">
  <p>Instagram logo — gradient purple to pink to orange. Stripe — gradient blue gradient nature. Apple iOS — subtle gradient khắp UI. Design 2020s trở lại trend gradient — replacing flat design previous decade. Gradient không chỉ aesthetic — nó tạo <strong>depth</strong>, <strong>mood</strong>, <strong>energy</strong> cho design.</p>
  <p>Gradient là kỹ thuật cơ bản cho mọi designer. Hiểu các loại gradient, color theory và cách dùng intentional giúp designer tạo design modern, professional — không phải &quot;flat&quot; cliché.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Gradient là gì?</h2>
  <p>Gradient là <strong>chuyển tiếp dần</strong> giữa hai (hoặc nhiều) màu trong không gian visual. Thay vì sharp boundary (color block), gradient blend smoothly từ color A sang color B — tạo cảm giác mượt, organic, dynamic. Mathematically: linear interpolation giữa color values theo position.</p>
  <p>Trong design, gradient có nhiều forms: <strong>linear</strong> (direction thẳng), <strong>radial</strong> (tỏa từ center), <strong>conic</strong> (vòng quanh point), <strong>mesh</strong> (multi-point custom). Mỗi loại có use case và mood khác. Gradient trend cyclical — flat (2010s) → gradient (2020s) → có thể flat lại tương lai.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Color Theory cho Gradient</span>
    <p>Gradient đẹp không random. Color pairs theo color theory: <strong>analogous</strong> (gần nhau wheel — blue to teal); <strong>complementary</strong> (đối nhau — blue to orange), tricky balance; <strong>monochromatic</strong> (light to dark same hue); <strong>warm-to-cool</strong> shift. Avoid clashing hue without intentional purpose.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Linear Gradient</strong> — đường thẳng từ A sang B</li>
    <li><strong>Radial Gradient</strong> — center outward</li>
    <li><strong>Conic Gradient</strong> — circle around point</li>
    <li><strong>Mesh Gradient</strong> — multi-point control</li>
    <li><strong>Color Stops</strong> — point định nghĩa color, position</li>
    <li><strong>Color Space</strong> — RGB, HSL, LAB blend khác nhau</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"gradient design linear radial conic mesh examples"</span>
    </div>
    <p class="arc-image-caption">Gradient types — linear, radial, conic, mesh — variation cho design modern</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Gradient</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Linear Gradient</summary>
      <div class="arc-card-body">
        <p>Most common. Color chuyển dọc theo line (angle định nghĩa direction). Vertical = sky to ground feel. Horizontal = depth. Diagonal = energy, movement.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Radial Gradient</summary>
      <div class="arc-card-body">
        <p>Center → outward. Tạo &quot;glow&quot; effect, spotlight, depth. Common cho background, button highlight. Sun, light source simulation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Conic Gradient</summary>
      <div class="arc-card-body">
        <p>Around a point (like clock hands rotating). Pie chart, color wheel, abstract logo. CSS conic-gradient newer browser support.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mesh Gradient</summary>
      <div class="arc-card-body">
        <p>Multi-point control với complex blend. Stripe, Apple use heavily. Adobe Illustrator Mesh Tool. Modern aesthetic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Noise Gradient</summary>
      <div class="arc-card-body">
        <p>Gradient với noise texture overlay — eliminate banding, add organic feel. Modern design trend.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Duotone</summary>
      <div class="arc-card-body">
        <p>Special gradient — image converted to 2 color gradient. Spotify branded look. Apply to photo for stylization.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Gradient trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Branding &amp; Logo</h3>
    <ul class="arc-list">
      <li>Instagram, Stripe, Asana — gradient logo phổ biến 2020s</li>
      <li>Tạo modern, energetic feel</li>
      <li>Trade-off: less printable on single color, more complex</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">UI/UX Design</h3>
    <ul class="arc-list">
      <li>Subtle gradient cho depth (vs flat)</li>
      <li>Hero section background</li>
      <li>Button highlight, glow effect</li>
      <li>Dark mode gradient phổ biến</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Graphics</h3>
    <ul class="arc-list">
      <li>Animated gradient background</li>
      <li>Color cycling cho dynamic feel</li>
      <li>Stripe-style hero animation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Poster &amp; Print</h3>
    <ul class="arc-list">
      <li>Music festival poster — vivid gradient</li>
      <li>Album cover (Tame Impala &quot;Currents&quot; iconic gradient)</li>
      <li>Editorial design modern</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3D &amp; Render</h3>
    <ul class="arc-list">
      <li>Sky gradient cho realistic atmosphere</li>
      <li>Background gradient cho product shot</li>
      <li>Lighting setup with gradient backdrop</li>
    </ul>
  </div>
</section>
`,
  },

  // 08. Graph Editor
  {
    id: "e1e60085-6bb4-4ec5-9381-0ceff7c96cd8",
    tieu_de: "Graph Editor",
    tieu_de_viet: "Trình chỉnh sửa đồ thị (Graph Editor)",
    tom_tat:
      "Graph Editor là công cụ trong phần mềm animation hiển thị giá trị property qua thời gian dưới dạng curve — cho phép animator tinh chỉnh curve để control gia tốc, smoothing, timing nâng cao.",
    meta_title: "Graph Editor là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Graph Editor chỉnh sửa curve animation. Tìm hiểu cách dùng Graph Editor trong Maya, AE, Blender và principle ease in/out.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn animate ball bouncing — keyframe pose chính rồi play. Ball moves but feel &quot;robotic&quot;, không có life. Lỗi không phải pose — mà <strong>spacing</strong> và <strong>timing curve</strong> giữa các pose. Để fix, mở <strong>Graph Editor</strong> — chỉnh curve để ball có ease in/out, gravity natural. Đây là tool quyết định animation amateur vs pro.</p>
  <p>Graph Editor là tool advanced cho mọi animator — 3D, motion graphics, character. Hiểu cách đọc và edit curves là kỹ năng phân biệt animator junior và senior. Mất thời gian học nhưng ROI cực kỳ cao cho quality output.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Graph Editor là gì?</h2>
  <p>Graph Editor (còn gọi Curve Editor, Function Curve Editor) là tool trong phần mềm animation hiển thị <strong>giá trị của property qua thời gian dưới dạng curve</strong>. Trục ngang = time (frame), trục dọc = value (position X, rotation, opacity). Keyframe = point trên curve; line giữa keys = interpolation curve.</p>
  <p>Edit curve trong Graph Editor cho phép control <strong>tốc độ thay đổi value</strong> — flat curve = constant speed, steep curve = fast change, S-curve = ease in/out (slow start, fast middle, slow end — natural motion). Phân biệt animator giỏi là master Graph Editor — không chỉ keyframe pose, mà polish curve.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Graph Editor vs Dope Sheet</span>
    <p><strong>Dope Sheet</strong>: keyframe position trên timeline. Use case: move keyframe theo time, adjust timing macro. <strong>Graph Editor</strong>: value curve qua time. Use case: tune interpolation (ease in/out), fix arc, polish motion. Hai tool complement — animator dùng cả hai trong workflow.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Keyframe</strong> — point trên curve</li>
    <li><strong>Tangent</strong> — handle define curve shape vào/ra keyframe</li>
    <li><strong>Linear</strong> — straight line giữa keys (constant speed)</li>
    <li><strong>Stepped</strong> — instant snap (no interpolation)</li>
    <li><strong>Bezier / Auto</strong> — smooth curve (ease in/out)</li>
    <li><strong>Ease In/Out</strong> — slow start, slow end</li>
    <li><strong>Overshoot</strong> — value pass target then return</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"graph editor animation curve maya after effects bezier"</span>
    </div>
    <p class="arc-image-caption">Graph Editor — curve hiển thị value qua time, control gia tốc và smoothing</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Curves &amp; Tangents</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Linear</summary>
      <div class="arc-card-body">
        <p>Straight line giữa 2 keys. Constant velocity. Use case: mechanical motion, light animation, no easing needed.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Stepped (Step)</summary>
      <div class="arc-card-body">
        <p>No interpolation — value held until next key, then snap. Use case: blocking animation, sprite animation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bezier (Auto/Smooth)</summary>
      <div class="arc-card-body">
        <p>Smooth S-curve giữa keys. Default cho most animation — natural feel. Tangent handle adjustable cho fine control.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ease In</summary>
      <div class="arc-card-body">
        <p>Slow start, accelerate. Tangent flat → steep. Use case: object start moving from rest, anticipation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ease Out</summary>
      <div class="arc-card-body">
        <p>Fast start, slow end. Tangent steep → flat. Use case: object decelerate to rest, follow-through.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ease In-Out</summary>
      <div class="arc-card-body">
        <p>Slow-fast-slow. Most natural motion. Use case: bouncing ball arc, character action, camera move.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Overshoot</summary>
      <div class="arc-card-body">
        <p>Value passes target, returns. Cartoony, bouncy feel. Use case: text/logo animation, character snappy reaction.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hold (Constant)</summary>
      <div class="arc-card-body">
        <p>Value held cho đến next key. No interpolation. Use case: visibility toggle, discrete state change.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Graph Editor trong từng phần mềm</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Maya — Graph Editor</h3>
    <ul class="arc-list">
      <li>Windows → Animation Editors → Graph Editor</li>
      <li>Hotkey: tab in Outliner</li>
      <li>Modern Tangent Manipulator UI</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Blender — Graph Editor</h3>
    <ul class="arc-list">
      <li>Default Animation workspace tab</li>
      <li>Tight integration với Dope Sheet</li>
      <li>Drivers tab cho expression-based</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">After Effects</h3>
    <ul class="arc-list">
      <li>Click stopwatch icon trong timeline → Graph Editor button</li>
      <li>Value graph + Speed graph modes</li>
      <li>Ease in/out hotkey: F9</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3ds Max — Curve Editor</h3>
    <ul class="arc-list">
      <li>Right-click track view → Curve Editor mode</li>
      <li>Tangent type set per key</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cinema 4D — Timeline F-Curve</h3>
    <ul class="arc-list">
      <li>Window → Timeline → F-Curve mode</li>
      <li>Bezier handles cho fine control</li>
    </ul>
  </div>
</section>
`,
  },

  // 09. Grease Pencil
  {
    id: "b7ae64f7-2fec-4d56-82f8-70105cbae186",
    tieu_de: "Grease Pencil",
    tieu_de_viet: "Grease Pencil (Blender 2D-in-3D)",
    tom_tat:
      "Grease Pencil là công cụ trong Blender cho phép vẽ 2D trực tiếp trong không gian 3D — kết hợp animation truyền thống và 3D, dùng cho storyboard, animation 2D, hiệu ứng đặc biệt.",
    meta_title: "Grease Pencil là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Grease Pencil Blender vẽ 2D trong 3D space. Tìm hiểu workflow animation 2D, storyboard và hiệu ứng kết hợp 2D-3D.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn muốn animate 2D character như anime nhưng tận dụng được 3D camera, lighting? Hoặc làm storyboard với pose ngay trong scene 3D? <strong>Grease Pencil</strong> trong Blender solve điều này — vẽ 2D trực tiếp trong không gian 3D. Đây là feature unique của Blender không software khác có — cho phép hybrid 2D-3D workflow mới.</p>
  <p>Grease Pencil là tool độc đáo cho 2D animator và Blender artist. Hiểu Grease Pencil mở ra workflow mới — animation 2D với 3D camera flexibility, hybrid project, storyboard chuyên nghiệp trong Blender free.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Grease Pencil là gì?</h2>
  <p>Grease Pencil là tool trong Blender cho phép tạo và animate <strong>stroke 2D trong không gian 3D</strong>. Thay vì vẽ trên flat canvas, bạn vẽ trực tiếp trong 3D scene — có thể view từ any angle, lighting affect stroke, camera move dynamic. Originally created cho annotation trên 3D scene, evolved thành full 2D animation system trong Blender 2.8+.</p>
  <p>Result: bạn có thể combine 2D drawn character với 3D environment (Disney-style), hoặc 2D special effect overlay trên 3D footage, hoặc pure 2D animation với 3D camera benefits. Unique selling point của Blender — feature này không tồn tại trong Maya, 3ds Max.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Grease Pencil vs Traditional 2D</span>
    <p><strong>Traditional 2D</strong> (TVPaint, Toon Boom): flat canvas, mỗi frame riêng. <strong>Grease Pencil</strong>: 2D trong 3D space — same drawing seen from multiple angle, camera move 3D, lighting affect. Workflow hybrid mới — power của 3D với aesthetic 2D.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Stroke</strong> — line vẽ trong 3D space</li>
    <li><strong>Drawing Plane</strong> — surface 2D vẽ lên (front, side, view)</li>
    <li><strong>Layer</strong> — organize stroke (foreground, background)</li>
    <li><strong>Onion Skin</strong> — see previous frame</li>
    <li><strong>Material</strong> — color, stroke style, fill</li>
    <li><strong>Modifier</strong> — non-destructive edit (tint, hue shift)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"grease pencil blender 2D animation 3D space"</span>
    </div>
    <p class="arc-image-caption">Grease Pencil — vẽ 2D trong không gian 3D, hybrid workflow unique</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Use Cases Grease Pencil</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>2D Animation pure</summary>
      <div class="arc-card-body">
        <p>Animate 2D character với 3D camera flexibility. View change angle without redraw. Modern workflow indie 2D animator.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Storyboard / Animatic</summary>
      <div class="arc-card-body">
        <p>Vẽ storyboard trực tiếp trong scene 3D. Camera setup, blocking pose. Iterate fast trước animate final.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2D Character trong 3D World</summary>
      <div class="arc-card-body">
        <p>Spider-Verse style hybrid — 2D character interact với 3D environment. Disney-style 2D over 3D background.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Special Effects 2D over 3D</summary>
      <div class="arc-card-body">
        <p>Add 2D smoke, fire, magic effect trên 3D render. Anime-style effect trong 3D scene.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Annotation &amp; Notes</summary>
      <div class="arc-card-body">
        <p>Original purpose — annotate 3D scene cho team. Mark area to fix, communicate idea visually.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Concept &amp; Visdev</summary>
      <div class="arc-card-body">
        <p>Quick sketch over 3D blockout — paint over concept. Iterative design workflow.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Famous Works với Grease Pencil</h2>
  <ul class="arc-list">
    <li><strong>&quot;Hero&quot;</strong> — Blender Studio short, showcased Grease Pencil 2D animation</li>
    <li><strong>&quot;Sprite Fright&quot;</strong> — Blender Studio short, 2D effect over 3D</li>
    <li><strong>Indie 2D animators</strong> — growing community on YouTube, Twitter</li>
    <li><strong>Animation festival entries</strong> — many indie short use Blender Grease Pencil</li>
  </ul>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Workflow Grease Pencil cơ bản</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Add Grease Pencil Object</h3>
    <ul class="arc-list">
      <li>Shift+A → Grease Pencil → Stroke / Blank / Scene</li>
      <li>Switch sang Draw mode</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Set Drawing Plane</h3>
    <ul class="arc-list">
      <li>Choose View (vẽ on screen plane), Front, Side</li>
      <li>Cursor mode để vẽ trên specific position 3D</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Draw &amp; Animate</h3>
    <ul class="arc-list">
      <li>Use pen tablet (Wacom, Intuos)</li>
      <li>Insert keyframe (I key)</li>
      <li>Onion skin (alt+O) — see previous/next frames</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Material &amp; Modifier</h3>
    <ul class="arc-list">
      <li>Set color, stroke style</li>
      <li>Add modifier: Tint, Outline, Multiply Strokes</li>
    </ul>
  </div>
</section>
`,
  },

  // 10. Green Screen
  {
    id: "0e9860ac-12d5-456d-95e6-20c8c73c3213",
    tieu_de: "Green Screen (Chroma Key)",
    tieu_de_viet: "Nền xanh (Green Screen)",
    tom_tat:
      "Green Screen là kỹ thuật quay trước nền xanh lá để tách subject ra khỏi nền trong hậu kỳ — nền tảng của VFX hiện đại cho phép ghép người thật vào môi trường kỹ thuật số.",
    meta_title:
      "Green Screen là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Green Screen (Chroma Key) tách subject khỏi nền. Tìm hiểu setup, lighting tips và workflow keying chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Mọi cảnh trong Marvel phim — actor đứng trước nền xanh lớn. Spider-Man swinging giữa NYC — green screen. Star Wars Tatooine — green screen. Đây là <strong>Green Screen</strong> — kỹ thuật cốt lõi của VFX hiện đại, cho phép kết hợp diễn viên thật với môi trường digital impossible to film in real world.</p>
  <p>Green Screen là kỹ thuật quan trọng cho mọi VFX artist, video editor, content creator. Hiểu setup, lighting và keying workflow giúp tạo composite tự nhiên — không có &quot;green edge&quot; cliché của amateur work.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Green Screen là gì?</h2>
  <p>Green Screen (hoặc Chroma Key) là kỹ thuật quay subject (actor, object) trước nền màu xanh lá đậm (hoặc xanh dương), rồi trong post-production tách màu nền ra để thay bằng background khác — 3D environment, stock footage, animation. Cho phép ghép subject vào bất kỳ environment nào — fantasy, sci-fi, dangerous location.</p>
  <p>Tại sao xanh lá? Vì màu da con người không có nhiều green (mostly red, blue components) → easy tách green mà không affect skin. Blue screen alternative cho subject có green clothing/hair. Modern digital camera blue cũng work, nhưng green dominant vì sensor camera digital responsive hơn với green.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Chroma Key vs Luma Key vs Difference Key</span>
    <p><strong>Chroma Key</strong>: key out specific color (green/blue). <strong>Luma Key</strong>: key out specific luminance (black background bright object). <strong>Difference Key</strong>: compare 2 frames (locked camera) to extract movement. Chroma Key dominant cho actor work; luma cho graphic, smoke.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Even Lighting</strong> — green screen lit uniformly</li>
    <li><strong>Subject Lighting</strong> — separate, match target environment</li>
    <li><strong>Distance from Screen</strong> — 6-10 feet để avoid spill</li>
    <li><strong>Spill</strong> — green reflect lên subject (especially light hair, white clothes)</li>
    <li><strong>Keying Software</strong> — Keylight, Primatte, Roto Brush</li>
    <li><strong>Garbage Matte</strong> — rough mask rough remove non-key area</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"green screen vfx chroma key actor compositing"</span>
    </div>
    <p class="arc-image-caption">Green Screen — actor trước nền xanh, replace với CG environment trong post</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Setup Green Screen tốt</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Green Screen Material</summary>
      <div class="arc-card-body">
        <p>Muslin cloth (wrinkles bad), paint (best — even surface), portable popup screen. Chuẩn green color: chroma green/Rosco DigiComp Green. Avoid neon green wrong shade.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Lighting Green Screen</summary>
      <div class="arc-card-body">
        <p>2 soft light hai bên nền — even illumination. Avoid hot spot, shadow. Light meter check uniformity (within 1 stop). Underlit = key noisy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Subject Lighting</summary>
      <div class="arc-card-body">
        <p>Separate lighting cho subject — match intended environment. Backlight để separate from green. Avoid green spill bằng cách subject distance from screen.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Subject Distance</summary>
      <div class="arc-card-body">
        <p>6-10 feet (2-3m) from screen — minimize spill. Closer = green light bounce lên subject. Far = better key.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Avoid Green in Subject</summary>
      <div class="arc-card-body">
        <p>Subject không mặc green clothing — sẽ bị keyed out. Hair có green tint? Light hair pick green spill — careful.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Camera Settings</summary>
      <div class="arc-card-body">
        <p>Highest quality codec available (ProRes, RAW). 4K + better detail. Sharp focus. Lock white balance.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Keying Workflow trong Post</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Initial Key</h3>
    <ul class="arc-list">
      <li>Apply Keylight (AE) / Primatte (Nuke) / Resolve Qualifier</li>
      <li>Click eyedropper on green to set key color</li>
      <li>Adjust tolerance, softness</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Garbage Matte</h3>
    <ul class="arc-list">
      <li>Rough mask cut out non-key area (light stand, edge of screen)</li>
      <li>Animate if camera move</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Refine Edge</h3>
    <ul class="arc-list">
      <li>Choke matte if green spill (shrink edge slightly)</li>
      <li>Soft edge cho natural blend</li>
      <li>Hair detail — Roto Brush, hair separately handle</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Spill Suppression</h3>
    <ul class="arc-list">
      <li>Reduce green tint on subject edge</li>
      <li>Built-in trong Keylight, plugin like Spill Killer</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Composite</h3>
    <ul class="arc-list">
      <li>Add new background behind</li>
      <li>Color match — adjust subject color to fit environment</li>
      <li>Lighting match — shadow direction consistent</li>
      <li>Edge integration — slight blur edge</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Final Polish</h3>
    <ul class="arc-list">
      <li>Color grade unified scene</li>
      <li>Add grain match (subject vs BG)</li>
      <li>Atmospheric effect (haze, fog) cho integration</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips cho Beginner</h2>
  <ul class="arc-list">
    <li><strong>Even lighting most important</strong> — fix khó nhất trong post</li>
    <li><strong>Don&apos;t over-key</strong> — keep some edge softness cho natural</li>
    <li><strong>Match BG lighting</strong> — composite chỉ tốt khi lighting subject match BG</li>
    <li><strong>Test trước shoot full</strong> — quick key test ngay tại set</li>
    <li><strong>Virtual production alternative</strong> — LED wall (Mandalorian, Avatar 2) replace green screen ở high-end</li>
  </ul>
</section>
`,
  },
];

console.log(`\n── Bắt đầu chạy ${items.length} bài keyword đợt 1.12 ──\n`);

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
