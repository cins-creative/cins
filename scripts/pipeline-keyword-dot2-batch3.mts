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
  // 01. Light Table
  {
    id: "c6f69453-6638-41a5-a34e-0b1694f84da5",
    tieu_de: "Light Table",
    tieu_de_viet: "Bàn đèn (Light Table) — Animation",
    tom_tat:
      "Light Table là bàn có đèn chiếu từ dưới trong animation truyền thống — nhìn xuyên qua nhiều tờ giấy để kiểm tra chuyển động giữa frame. Trong digital tương đương onion skin.",
    meta_title:
      "Light Table là gì? Ý nghĩa và ứng dụng trong animation | CINS",
    meta_description:
      "Light Table trong animation 2D. Tìm hiểu workflow traditional và digital equivalent (onion skin) trong TVPaint, Toon Boom.",
    noi_dung: `
<section class="arc-intro">
  <p>Trong studio Disney 1940s — animator ngồi bàn lớn có lighting bên dưới. Chồng 5-6 tờ giấy với pose nhân vật khác nhau, ánh sáng xuyên qua cho thấy frame trước trong suốt. Animator vẽ frame mới trên cùng, tham chiếu motion smooth từ frame trước. Đây là <strong>Light Table</strong> — tool foundational của 2D animation traditional.</p>
  <p>Light Table là kiến thức historical nhưng vẫn relevant với 2D animator modern. Digital equivalent (onion skin) trong TVPaint, Toon Boom, Procreate Dreams kế thừa concept. Hiểu light table giúp grasp workflow inbetweening — core skill cho mọi 2D animator.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Light Table là gì?</h2>
  <p>Light Table là bàn vẽ có <strong>panel kính frosted</strong> với đèn fluorescent/LED chiếu sáng từ bên dưới. Animator đặt nhiều tờ giấy (drawing paper, animation paper với punch hole) chồng lên nhau — ánh sáng xuyên qua giúp nhìn thấy drawing bên dưới qua giấy trên. Use case chính: <strong>inbetweening</strong> (vẽ frame giữa) và <strong>tweening</strong> (smooth motion check).</p>
  <p>Animator key vẽ pose chính (extreme). Inbetweener đặt giấy extreme trên light table, đặt giấy trắng phía trên, vẽ pose giữa dựa trên reference visible qua giấy. Result: smooth motion between key poses. Workflow này đã được dùng từ 1920s đến 2000s — Disney golden age, anime industry, Studio Ghibli.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Light Table → Onion Skin (Digital)</span>
    <p>Digital era: <strong>Onion Skin</strong> trong software (TVPaint, Toon Boom, Procreate, Adobe Animate) replicate concept. Software hiển thị frame trước/sau as semi-transparent ghost dưới frame hiện tại. Animator có thể adjust opacity, color, range. More flexible than physical light table — turn on/off, multiple frame ahead/behind.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Animation Paper</strong> — giấy có punch hole standard</li>
    <li><strong>Peg Bar</strong> — bar giữ giấy alignment</li>
    <li><strong>Onion Skin</strong> — digital equivalent</li>
    <li><strong>Inbetweening</strong> — vẽ frame giữa extremes</li>
    <li><strong>Cleanup</strong> — final clean line over rough</li>
    <li><strong>Frame Count</strong> — số frames per second (12, 24)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"light table 2D animation traditional Disney inbetween onion skin"</span>
    </div>
    <p class="arc-image-caption">Light Table — đèn chiếu từ dưới giúp xem qua nhiều tờ giấy animation</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Workflow Light Table</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Key Pose Drawing</summary>
      <div class="arc-card-body">
        <p>Senior animator vẽ extreme pose chính (key frame). Mark frame number, intent. Pass đến cleanup hoặc inbetween team.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Inbetween với Light Table</summary>
      <div class="arc-card-body">
        <p>Inbetweener đặt key drawings on peg bar, blank paper on top. Light table on → thấy keys qua paper. Vẽ inbetween pose halfway between extremes.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Multiple Frame Check</summary>
      <div class="arc-card-body">
        <p>Animator flip rapid giữa frames — &quot;flipping&quot; — kiểm tra timing, smoothness. Light table giúp see-through.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Cleanup Line</summary>
      <div class="arc-card-body">
        <p>Clean drawing artist trace rough line với clean final line. Place rough below clean paper, light table show through.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Ink &amp; Paint (Historical)</summary>
      <div class="arc-card-body">
        <p>Traditional: transfer line drawings to cel (transparent celluloid), paint background. Multi-layer composite. Digital workflow skip cel — paint directly digital.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Modern Digital</summary>
      <div class="arc-card-body">
        <p>TVPaint, Toon Boom Harmony, Procreate Dreams — software replicate light table workflow digitally. Tablet Wacom Cintiq emulate physical drawing experience.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Digital Equivalent — Onion Skin</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">TVPaint</h3>
    <ul class="arc-list">
      <li>Industry standard 2D digital animation</li>
      <li>Configurable onion skin 1-5 frames before/after</li>
      <li>Custom color per frame</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Toon Boom Harmony</h3>
    <ul class="arc-list">
      <li>Studio standard cho animation series</li>
      <li>Onion skin với customization</li>
      <li>Use cho TV animation production</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Procreate Dreams</h3>
    <ul class="arc-list">
      <li>Mobile/iPad animation app</li>
      <li>Onion skin built-in</li>
      <li>Accessible cho beginner</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Adobe Animate (Flash)</h3>
    <ul class="arc-list">
      <li>Vector animation</li>
      <li>Onion skin với multi-frame view</li>
      <li>Web animation legacy</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Krita / OpenToonz</h3>
    <ul class="arc-list">
      <li>Free open-source alternatives</li>
      <li>Onion skin functional</li>
      <li>Suitable indie animator</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Heritage</h2>
  <ul class="arc-list">
    <li><strong>Physical light table still used</strong> — Studio Ghibli, Toon Boom team mix traditional + digital</li>
    <li><strong>Onion skin discipline</strong> — show only 1-2 frames each side, avoid clutter</li>
    <li><strong>Color code frame</strong> — past frames blue, future frames red</li>
    <li><strong>Flip frames frequently</strong> — verify motion smooth</li>
    <li><strong>Reference traditional masters</strong> — Disney&apos;s &quot;Illusion of Life&quot; book teach 2D animation foundation</li>
    <li><strong>Wacom Cintiq</strong> — best digital emulation of paper feel</li>
  </ul>
</section>
`,
  },

  // 02. Lighting Plan
  {
    id: "53a82b5e-4893-4a61-8fcb-6a830d8ea62d",
    tieu_de: "Lighting Plan",
    tieu_de_viet: "Kế hoạch chiếu sáng (Lighting Plan)",
    tom_tat:
      "Lighting Plan là bản kế hoạch chi tiết về cách bố trí và sử dụng ánh sáng trong cảnh quay — top-down view với vị trí đèn, gel, modifier để đạt được hiệu ứng hình ảnh mong muốn.",
    meta_title:
      "Lighting Plan là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Lighting Plan setup pre-production. Tìm hiểu cách vẽ lighting diagram, ký hiệu chuẩn và ứng dụng cho film, photography.",
    noi_dung: `
<section class="arc-intro">
  <p>Đạo diễn hình ảnh (DP) lên set ngày shooting — đèn light stand đến vị trí chính xác trong vài phút. Why? Vì DP đã pre-plan <strong>Lighting Plan</strong> — top-down diagram show exact position từng đèn, gel color, modifier, intensity. Nếu không có plan: setup lighting có thể tốn nửa ngày trial-and-error, lãng phí thời gian crew expensive.</p>
  <p>Lighting Plan là document quan trọng cho DP, gaffer, photographer, studio lighting. Hiểu cách vẽ lighting plan diagram giúp communicate với team, save time setup, và create reproducible lighting setup cho consistent quality across shoot.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Lighting Plan là gì?</h2>
  <p>Lighting Plan (hoặc Lighting Diagram) là <strong>bản vẽ top-down view</strong> của lighting setup — show vị trí của các yếu tố: subject, camera, light source, modifier (softbox, reflector), background. Mỗi element có icon/symbol chuẩn, ghi chú color gel, intensity, modifier. Pre-production tool — DP plan trước khi go to set.</p>
  <p>Use case chính: (1) communicate setup với gaffer và team; (2) reference cho recreate setup ngày khác; (3) teach lighting cho student; (4) document cho client breakdown. Pro DP có lighting plan book reference cho different scene type — interview, action, beauty shot, product.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Lighting Plan trong Pre-production</span>
    <p>Pre-production phase, DP study script → identify scene → research reference → sketch lighting plan trong notebook hoặc software (lighting diagram apps: Set.a.Light, Lighting Diagram Creator, Sylights). Discussion với director, producer. Plan adjust trên set theo reality nhưng baseline established.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Top-down View</strong> — bird&apos;s eye perspective</li>
    <li><strong>Subject Position</strong> — center reference point</li>
    <li><strong>Camera Position</strong> — angle, distance</li>
    <li><strong>Key/Fill/Rim</strong> — three-point standard</li>
    <li><strong>Modifier</strong> — softbox, umbrella, beauty dish</li>
    <li><strong>Gel</strong> — color filter on light</li>
    <li><strong>Flag / Cutter</strong> — block light from area</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"lighting plan diagram top down photography film DP set"</span>
    </div>
    <p class="arc-image-caption">Lighting Plan — top-down diagram show light position, modifier, gel</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Elements của Lighting Plan</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Subject &amp; Camera</summary>
      <div class="arc-card-body">
        <p>Center: subject icon (stick figure). Camera position indicate by camera icon, arrow shows direction.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Light Sources</summary>
      <div class="arc-card-body">
        <p>Icon cho từng loại — strobe, continuous, sun, practical light. Position, angle from subject. Label name (Key, Fill, Rim, Hair).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Modifier</summary>
      <div class="arc-card-body">
        <p>Softbox rectangle/octagon shape. Umbrella shape. Beauty dish round. Modifier soft light, control direction.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Reflector</summary>
      <div class="arc-card-body">
        <p>Reflect light back into shadow — silver, white, gold color. Position opposite key. Common cho fill without additional light.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Flag / Cutter / Negative Fill</summary>
      <div class="arc-card-body">
        <p>Black panel block unwanted light. Negative fill — darken side opposite key for moody portrait. Show as black bar in plan.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Background &amp; Elements</summary>
      <div class="arc-card-body">
        <p>Backdrop color, props, set piece. Quick sketch. Indicate ambient light direction (window, lamp).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Annotations</summary>
      <div class="arc-card-body">
        <p>Notes: light wattage, gel color, modifier size, distance to subject. Critical detail.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Lighting Plan Examples</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Interview Setup</h3>
    <ul class="arc-list">
      <li>Subject seated, slight angle to camera</li>
      <li>Key: softbox 45° camera left, eye level</li>
      <li>Fill: bounce reflector camera right (no separate light)</li>
      <li>Rim/Hair: softbox high behind subject</li>
      <li>BG: separate light cho background separation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Portrait Beauty Shot</h3>
    <ul class="arc-list">
      <li>Subject facing camera</li>
      <li>Key: beauty dish above camera, 30° down</li>
      <li>Fill: white reflector below face (clamshell)</li>
      <li>Rim: optional strip light each side</li>
      <li>BG: gradient gray to white</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cinematic Drama</h3>
    <ul class="arc-list">
      <li>Subject lit dramatically — chiaroscuro</li>
      <li>Key: hard light side, high contrast</li>
      <li>No fill (or minimal) — deep shadow</li>
      <li>Practical light (lamp) trong frame</li>
      <li>Rim: subtle for outline</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Product Photography</h3>
    <ul class="arc-list">
      <li>Product on backdrop</li>
      <li>Key: large softbox 45° side</li>
      <li>Fill: white card opposite</li>
      <li>Reflector below to lift dark area</li>
      <li>BG: separate light cho seamless backdrop</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools tạo Lighting Plan</h2>
  <ul class="arc-list">
    <li><strong>Hand sketch</strong> — sketchbook + pen, fastest cho rough plan</li>
    <li><strong>Set.a.Light 3D</strong> — software simulate lighting setup 3D, photorealistic preview</li>
    <li><strong>Lighting Diagram Creator</strong> — free web tool, drag-drop icons</li>
    <li><strong>Sylights</strong> — online lighting diagram tool</li>
    <li><strong>Photoshop / Illustrator</strong> — manual diagram với custom icon</li>
    <li><strong>Strobox app</strong> — mobile diagram creator</li>
  </ul>
</section>
`,
  },

  // 03. Location Scouting
  {
    id: "c3c3dcca-3fc5-49a5-a649-27e61985b42b",
    tieu_de: "Location Scouting",
    tieu_de_viet: "Khảo sát địa điểm quay",
    tom_tat:
      "Location Scouting là quá trình tìm kiếm và lựa chọn địa điểm quay phim — thường được thực hiện bởi đội ngũ sản xuất để tìm bối cảnh phù hợp với script, budget, logistics.",
    meta_title:
      "Location Scouting là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Location Scouting tìm bối cảnh quay phim. Tìm hiểu workflow, checklist và best practice cho scout, photo recce.",
    noi_dung: `
<section class="arc-intro">
  <p>Phim Mad Max: Fury Road được quay ở Namibia chứ không phải Hollywood — vì location scouter tìm được sa mạc impossible to recreate trong studio. Phim Game of Thrones Westeros = Croatia, Iceland, Northern Ireland — không phải fantasy CGI mà real location. Đây là công lao của <strong>Location Scout</strong> — người tìm bối cảnh perfect cho story.</p>
  <p>Location Scouting là khâu critical trong pre-production. Hiểu workflow scouting, checklist tốt và pitfall thường gặp giúp producer/director identify location phù hợp về aesthetic, logistic, budget — quyết định directly mood phim và production feasibility.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Location Scouting là gì?</h2>
  <p>Location Scouting là quá trình <strong>tìm kiếm và đánh giá địa điểm quay phim</strong> cho project. Bao gồm: (1) <strong>Identify potential locations</strong> dựa trên script requirement (urban, rural, historical, modern); (2) <strong>Visit và photograph</strong>; (3) <strong>Evaluate</strong> aesthetic, logistic, permit, cost; (4) <strong>Negotiate</strong> permission, fee; (5) <strong>Lock in</strong> location cho shoot.</p>
  <p>Done by Location Manager + Scout team. Director, DP review photo, video recce trước commit. Process có thể nhanh (1 tuần local indie) hoặc dài (months cho big film cần exotic location, government permit). Marvel film thường scout 6-12 months trước shoot.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Scout vs Recce</span>
    <p><strong>Scout</strong>: initial search, broad survey of possibilities. Photo, brief evaluation. <strong>Recce</strong> (reconnaissance): detail visit với full team (DP, AD, director) sau scout. Plan exact camera angle, lighting, logistic. Recce closer to shoot.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Location Manager</strong> — head of location department</li>
    <li><strong>Location Scout</strong> — researcher/finder</li>
    <li><strong>Recce</strong> — detailed location visit</li>
    <li><strong>Permit</strong> — legal permission to shoot</li>
    <li><strong>Location Release</strong> — signed agreement với owner</li>
    <li><strong>Logistics</strong> — access, parking, power, catering</li>
    <li><strong>Tax Incentive</strong> — region offers incentive cho production</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"location scouting film production cinematography pre-production"</span>
    </div>
    <p class="arc-image-caption">Location Scouting — tìm bối cảnh perfect cho story, evaluate aesthetic + logistic</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Quy trình Location Scouting</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Script Breakdown</summary>
      <div class="arc-card-body">
        <p>Read script, list mỗi location needed. Indoor/outdoor, time of day, weather. Compile location requirements document.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Research</summary>
      <div class="arc-card-body">
        <p>Online research — Google Maps, location library, photo database. Local connection — film commission, scout network. Identify candidate.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Initial Visit</summary>
      <div class="arc-card-body">
        <p>Scout visit candidate, photograph from multiple angle, time of day. Different lighting condition. Detail interior/exterior.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Photo Package</summary>
      <div class="arc-card-body">
        <p>Compile photos, video, map. Present cho director, DP, producer. Get feedback shortlist.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Tech Recce</summary>
      <div class="arc-card-body">
        <p>Director + DP + crew visit top candidate. Plan camera angle, lighting, blocking. Identify problem (sound, access).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Permit &amp; Contract</summary>
      <div class="arc-card-body">
        <p>Negotiate fee, permission. Public location often need city permit. Private property need owner contract. Liability insurance.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>7. Lock In</summary>
      <div class="arc-card-body">
        <p>Final confirmation. Coordinate logistic — power source, parking, catering area. Backup location nếu primary fail.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Checklist Đánh giá Location</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Aesthetic</h3>
    <ul class="arc-list">
      <li>Match script requirement</li>
      <li>Architecture, period appropriate</li>
      <li>Color, mood feel right</li>
      <li>Photo direction (multiple angle)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Logistic</h3>
    <ul class="arc-list">
      <li>Access — truck, equipment</li>
      <li>Parking cho crew, talent</li>
      <li>Power source (generator nếu cần)</li>
      <li>Restroom, water</li>
      <li>Catering space</li>
      <li>Distance từ base / hotel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Technical</h3>
    <ul class="arc-list">
      <li>Sound — traffic, neighbor noise</li>
      <li>Light direction at shooting time</li>
      <li>Window position, natural light</li>
      <li>Ceiling height (cho equipment)</li>
      <li>Floor type (cho dolly, support)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Legal &amp; Financial</h3>
    <ul class="arc-list">
      <li>Permit cost &amp; process</li>
      <li>Location fee</li>
      <li>Owner cooperation</li>
      <li>Insurance requirement</li>
      <li>Time restriction (school day, business hour)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Safety</h3>
    <ul class="arc-list">
      <li>Fire exit</li>
      <li>Hazard (slip, height, electrical)</li>
      <li>Crowd control nếu public</li>
      <li>Weather contingency</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips từ Pro</h2>
  <ul class="arc-list">
    <li><strong>Visit at shooting time</strong> — light, traffic, sound different hourly</li>
    <li><strong>Multiple weather check</strong> — sun, rain, overcast affect look</li>
    <li><strong>Build relationship với owner</strong> — return for future project</li>
    <li><strong>Document thoroughly</strong> — photo, video, sketch, dimension</li>
    <li><strong>Backup location always</strong> — primary may fail (weather, dispute)</li>
    <li><strong>Local film commission</strong> — free help finding location, permit</li>
    <li><strong>Tax incentive regions</strong> — Georgia US, Toronto, Czech offer big incentive</li>
  </ul>
</section>
`,
  },

  // 04. Log (Camera Log)
  {
    id: "b48c7801-b07a-41fb-aef4-078dda357b86",
    tieu_de: "Log (Camera Log Gamma)",
    tieu_de_viet: "Log gamma trong quay phim",
    tom_tat:
      "Log là định dạng ghi hình với đường cong gamma phẳng — lưu nhiều thông tin highlight và shadow hơn profile thông thường, cho phép linh hoạt tối đa trong color grading hậu kỳ.",
    meta_title:
      "Log là gì? Ý nghĩa và ứng dụng trong quay phim chuyên nghiệp | CINS",
    meta_description:
      "Log gamma giúp lưu nhiều dynamic range. Tìm hiểu S-Log, C-Log, V-Log, BRAW và workflow color grading từ log footage.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem RAW footage Log Sony FX3 — màu sắc nhạt nhòa, contrast thấp, look &quot;ugly&quot;. Apply LUT → đẹp như phim. Tại sao quay log không đẹp? Vì log giữ tối đa thông tin highlight và shadow — &quot;preserve dynamic range&quot; cho colorist tạo final look. Log là <strong>standard quay phim chuyên nghiệp</strong> hiện đại.</p>
  <p>Log là kiến thức essential cho cinematographer, color grader, video editor pro. Hiểu khái niệm log gamma, các loại log (S-Log, C-Log, V-Log) và workflow grading giúp leverage tối đa flexibility hậu kỳ — output cinematic quality không phải fast amateur.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Log là gì?</h2>
  <p>Log (logarithmic) gamma là <strong>cách encode</strong> footage với đường cong gamma phẳng — distribute equally tonal range across the dynamic range available. Camera sensor capture ~14 stops dynamic range; log gamma encode tất cả 14 stops vào 8-bit/10-bit container. Result: log footage looks flat, low contrast — BUT preserve detail trong highlight và shadow tốt hơn rec.709 (standard gamma).</p>
  <p>Mỗi manufacturer có log variant: Sony S-Log2/S-Log3, Canon C-Log/C-Log2/C-Log3, Panasonic V-Log/V-Log L, Blackmagic Film/Generation 5, Fujifilm F-Log, RED REDLogFilm. Each có characteristics khác nhau — workflow knowledge per camera essential.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Log vs Rec.709 vs RAW</span>
    <p><strong>Rec.709</strong>: standard gamma, contrasty, ready to view. Limited dynamic range. <strong>Log</strong>: flat gamma, preserve dynamic range, need grading. <strong>RAW</strong>: unprocessed sensor data, max flexibility, huge file. Log là sweet spot — quality cao, file size manageable, workflow standard.</p>
  </div>

  <ul class="arc-list">
    <li><strong>S-Log3</strong> — Sony, ~14 stops</li>
    <li><strong>C-Log3</strong> — Canon</li>
    <li><strong>V-Log L</strong> — Panasonic</li>
    <li><strong>BRAW</strong> — Blackmagic RAW</li>
    <li><strong>F-Log</strong> — Fujifilm</li>
    <li><strong>RedLog</strong> — RED Camera</li>
    <li><strong>Color Space</strong> — Rec.2020, Rec.709 target</li>
    <li><strong>LUT</strong> — convert log to rec.709 quickly</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"log gamma camera footage flat color grading cinematography"</span>
    </div>
    <p class="arc-image-caption">Log gamma — flat, low contrast, preserve dynamic range cho grading</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Tại sao quay Log?</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Maximum Dynamic Range</summary>
      <div class="arc-card-body">
        <p>Camera sensor 14-15 stops capture, log preserve. Rec.709 chỉ ~6 stops. High contrast scene (sunlit window + dark interior) chỉ log handle được.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Grading Flexibility</summary>
      <div class="arc-card-body">
        <p>Flat log data = wide latitude cho grading. Colorist push exposure +2 stops, shift color drastically without artifact. Rec.709 push = quickly break.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Highlight Detail Recovery</summary>
      <div class="arc-card-body">
        <p>Log preserve highlight nuance — clouds, white shirt, sun light. Rec.709 clip white quickly. Critical cho high-key scene, outdoor.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Shadow Detail</summary>
      <div class="arc-card-body">
        <p>Log preserve shadow texture — dark hair, black clothing detail. Rec.709 crush black. Critical cho low-key scene, drama.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Future-Proofing</summary>
      <div class="arc-card-body">
        <p>HDR display trending. Rec.709 limited 8-bit can&apos;t support HDR. Log footage convertible to HDR easily — re-deliver project future.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cinematic Look</summary>
      <div class="arc-card-body">
        <p>Color grade với log = cinematic feel. Rec.709 = TV news look. Pro production heavily use log.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Log Footage</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Set Camera Log</h3>
    <ul class="arc-list">
      <li>Menu setting: Picture Profile → Log</li>
      <li>Sony S-Log3 + S-Gamut3.Cine</li>
      <li>Canon C-Log3 + Cinema Gamut</li>
      <li>Panasonic V-Log L</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Expose +1 to +2 Stops</h3>
    <ul class="arc-list">
      <li>Log under-expose easily — noise in shadow</li>
      <li>Expose to right (ETTR) — over-expose 1-2 stops</li>
      <li>Use false color, zebra cho monitor</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Apply Monitor LUT</h3>
    <ul class="arc-list">
      <li>External monitor (Atomos, SmallHD) apply LUT cho viewing</li>
      <li>Log looks normal trên monitor</li>
      <li>Recording still log</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Import vào NLE</h3>
    <ul class="arc-list">
      <li>Premiere, Resolve, FCP — set color space project</li>
      <li>Log clip recognized auto</li>
      <li>Initial color management (Resolve color management)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Color Grading</h3>
    <ul class="arc-list">
      <li>Apply technical LUT log → rec.709 conversion</li>
      <li>Primary grade — exposure, white balance</li>
      <li>Secondary grade — selective color, look</li>
      <li>Creative LUT cho final cinematic look</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Export</h3>
    <ul class="arc-list">
      <li>Rec.709 cho web, broadcast</li>
      <li>Rec.2020 / HDR cho streaming, cinema</li>
      <li>ProRes 4444 cho archive</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp</h2>
  <ul class="arc-list">
    <li><strong>Under-exposed log</strong> → noise heavy trong shadow. Expose +1 stop minimum</li>
    <li><strong>8-bit log codec</strong> → banding visible. 10-bit minimum cho log</li>
    <li><strong>Skip color management</strong> → grade incorrectly. Use Resolve color management</li>
    <li><strong>Generic LUT cho all scene</strong> → look mismatch. Custom grade per scene</li>
    <li><strong>Recording cheap codec</strong> → log + 4:2:0 8-bit = bad. Use 10-bit 4:2:2 codec</li>
  </ul>
</section>
`,
  },

  // 05. Look Development (Look Dev)
  {
    id: "1685e70d-8bb1-44b8-87ae-7b72658a9733",
    tieu_de: "Look Development",
    tieu_de_viet: "Phát triển look (Look Dev)",
    tom_tat:
      "Look Development là giai đoạn phát triển giao diện hình ảnh của asset 3D — vật liệu (material), texture, lighting interaction, fur/cloth properties, cho đến khi đạt được visual goal.",
    meta_title:
      "Look Development là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Look Development trong VFX và 3D animation. Tìm hiểu workflow material, texture, shader setup và look approval pipeline.",
    noi_dung: `
<section class="arc-intro">
  <p>Pixar character có skin look softer than other studio. Marvel Iron Man suit có metallic feel particular. ILM dragon trong Dune có scale realistic. Đây không phải coincidence — đây là <strong>Look Development</strong> (Look Dev), giai đoạn dedicated trong VFX/animation pipeline cho mỗi hero asset có visual identity unique. Look dev artist spend weeks per character/asset perfecting material, texture, light response.</p>
  <p>Look Development là specialization cao cấp cho 3D artist với eye cho material, lighting. Hiểu look dev workflow, tools (Substance, Mari, Houdini) và approval process là requirement cho senior position trong VFX studio và animation studio top tier.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Look Development là gì?</h2>
  <p>Look Development (Look Dev) là giai đoạn trong 3D pipeline — develop <strong>visual appearance</strong> của asset (character, prop, environment) qua: <strong>material</strong> (shader), <strong>texture</strong> (color, normal, displacement maps), <strong>fur/hair/cloth</strong> properties, <strong>lighting interaction</strong> tests. Mục đích: arrive tại final look approved by director, ready cho production rendering.</p>
  <p>Look dev artist work on isolated asset trong lookdev rig — standardized lighting setup (lookdev sphere, gray ball, chrome ball, HDRI variations). Test material under multiple lighting condition để verify look hold across film&apos;s lighting situations. Once approved, asset ready cho production scene.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Look Dev vs Texturing vs Shading</span>
    <p><strong>Texturing</strong>: paint maps (color, roughness, normal). Tool: Substance Painter, Mari. <strong>Shading</strong>: build shader network combining maps. Tool: Hypershade (Maya), Karma (Houdini), Arnold/V-Ray. <strong>Look Dev</strong>: combine everything + lighting test + iteration. Encompasses texturing và shading plus more.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Material / Shader</strong> — surface property definition</li>
    <li><strong>Texture Map</strong> — color, normal, roughness, displacement</li>
    <li><strong>BRDF</strong> — Bidirectional Reflectance Distribution Function</li>
    <li><strong>SSS (Subsurface Scattering)</strong> — skin, wax, marble</li>
    <li><strong>Look Dev Rig</strong> — standard lighting test environment</li>
    <li><strong>HDRI Test</strong> — multiple HDRI for verification</li>
    <li><strong>Turntable</strong> — 360° rotation showing all angle</li>
    <li><strong>Approval</strong> — director, supervisor signoff</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"look development 3D VFX character material shader pixar"</span>
    </div>
    <p class="arc-image-caption">Look Dev — develop material, texture, lighting interaction cho hero asset</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Workflow Look Development</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Concept &amp; Reference</summary>
      <div class="arc-card-body">
        <p>Receive concept art, reference photo, director&apos;s intent. Study material — skin, fabric, metal, wood. Photo reference of real-world similar material.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. UV &amp; Asset Prep</summary>
      <div class="arc-card-body">
        <p>Asset model UV-unwrapped clean. Texturing artist prep PBR maps. Look dev artist receive model + texture pack.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Initial Shader Setup</summary>
      <div class="arc-card-body">
        <p>Build shader network — base color, roughness, metallic, normal, SSS layers. Connect to material slots. Initial render check.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Lookdev Rig Test</summary>
      <div class="arc-card-body">
        <p>Place asset trong lookdev environment — gray sphere, chrome ball, HDRI variations. Render under each HDRI để verify look consistent.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Iterate</summary>
      <div class="arc-card-body">
        <p>Compare với reference. Adjust shader values, texture intensity, SSS. Multiple iteration với director feedback.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Hair / Fur / Cloth</summary>
      <div class="arc-card-body">
        <p>If applicable: hair shader (Marschner), fur grooming, cloth simulation test. Separate look dev pass.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>7. Turntable &amp; Approval</summary>
      <div class="arc-card-body">
        <p>Final turntable render — 360° rotation under standard lighting. Submit cho director. Approval = ready for production scene.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>8. Production Handoff</summary>
      <div class="arc-card-body">
        <p>Document shader, settings. Hand off cho lighting team production scene. Look dev artist available cho scene-specific tweak.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Tools &amp; Software</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Texture Painting</h3>
    <ul class="arc-list">
      <li><strong>Substance Painter</strong> — chuẩn industry, PBR workflow</li>
      <li><strong>Mari</strong> — Foundry, film-quality, UV layout flexible</li>
      <li><strong>3D-Coat</strong> — alternative, painting + voxel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Procedural Texture</h3>
    <ul class="arc-list">
      <li><strong>Substance Designer</strong> — node-based procedural texture creation</li>
      <li><strong>Houdini COPS</strong> — texture trong Houdini</li>
      <li><strong>Quixel Mixer</strong> — material blend từ Megascans</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Shading &amp; Rendering</h3>
    <ul class="arc-list">
      <li><strong>Arnold</strong> — film standard renderer</li>
      <li><strong>V-Ray</strong> — VFX và arch viz</li>
      <li><strong>RenderMan</strong> — Pixar in-house</li>
      <li><strong>Karma</strong> — Houdini native</li>
      <li><strong>Cycles / OctaneRender</strong> — Blender / alternatives</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Look Dev Specific</h3>
    <ul class="arc-list">
      <li><strong>Maya Hypershade</strong> — node graph shader editor</li>
      <li><strong>Lookdevx</strong> — Maya look dev environment</li>
      <li><strong>OCIO</strong> — color management essential</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Look Dev Career Path</h2>
  <ul class="arc-list">
    <li><strong>Junior Texture Artist</strong> — paint texture maps, learn UV, software</li>
    <li><strong>Look Dev Artist</strong> — combine texture với shader, full ownership asset look</li>
    <li><strong>Senior Look Dev / Shader TD</strong> — develop custom shader, R&amp;D, complex material (skin, fur)</li>
    <li><strong>Look Dev Supervisor</strong> — manage team, art direction, consistent style cho film</li>
    <li><strong>Studio</strong>: ILM, Weta, Pixar, DNEG, Framestore, MPC, Sony Imageworks</li>
    <li><strong>Salary</strong>: junior $60K, senior $120K-180K, supervisor $150K+</li>
  </ul>
</section>
`,
  },

  // 06. Lower Thirds
  {
    id: "92940274-a63b-42b6-8b87-7e78ca04c2fd",
    tieu_de: "Lower Thirds",
    tieu_de_viet: "Đồ họa thông tin (Lower Thirds)",
    tom_tat:
      "Lower Thirds là đồ họa thông tin xuất hiện ở phần ba dưới màn hình video — tên, chức danh, địa điểm — thiết kế không che khuất nội dung chính nhưng vẫn dễ đọc.",
    meta_title:
      "Lower Thirds là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Lower Thirds trong news, interview, documentary. Tìm hiểu thiết kế, animation và workflow tạo trong After Effects, Premiere.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem CNN news — tên reporter, location ở góc dưới screen. Documentary Netflix — tên interviewee, occupation appear khi họ nói lần đầu. YouTube video tutorial — instructor name + handle. Đây là <strong>Lower Thirds</strong> — invisible-but-essential element giúp viewer identify ai đang nói mà không miss video content.</p>
  <p>Lower Thirds là kỹ năng cơ bản cho video editor, motion designer. Mỗi documentary, interview, news, tutorial cần. Hiểu nguyên tắc design, animation style và workflow tạo nhanh giúp output professional cho client như news outlet, podcast video, corporate content.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Lower Thirds là gì?</h2>
  <p>Lower Thirds là <strong>đồ họa text overlay</strong> xuất hiện ở phần ba dưới (bottom-third area) của video frame — typically chứa: <strong>name</strong> (tên person), <strong>title/role</strong> (chức danh, occupation), occasionally <strong>location</strong>, <strong>timestamp</strong>, hoặc <strong>tagline</strong>. Position bottom third vì human eye attention focus ở top two-thirds; bottom third &quot;safe zone&quot; không interfere với main visual.</p>
  <p>Animation typical: slide in từ left/bottom, hold visible 5-8 giây, slide out. Smooth easing. Color, font consistent với brand. Modern designs minimalist — simple text + line. Older 2000s news heavy graphic, gradient, dropshadow.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Lower Thirds — Why Important?</span>
    <p>Studies show viewer often watch with sound off (social media, public space). Lower thirds provide critical context — who, what, where — without audio. Also helpful cho hearing-impaired viewer. SEO benefit too — text on screen = OCR readable cho search engine.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Bottom Third</strong> — position area</li>
    <li><strong>Title Card</strong> — full-screen text version</li>
    <li><strong>Bug</strong> — small persistent graphic (channel logo)</li>
    <li><strong>Chyron</strong> — generic news graphic term</li>
    <li><strong>Safe Zone</strong> — area visible across TV models</li>
    <li><strong>Animation In/Out</strong> — transition style</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"lower thirds video graphic title interview documentary"</span>
    </div>
    <p class="arc-image-caption">Lower Thirds — text overlay bottom screen, name/title, không che main content</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Lower Thirds</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Minimal Modern</summary>
      <div class="arc-card-body">
        <p>Clean typography, simple line, no background bar. Apple, Netflix style. Sophisticated, contemporary. Most popular hiện đại.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>News Broadcast Style</summary>
      <div class="arc-card-body">
        <p>Background bar, channel-branded color, large bold name + smaller title. CNN, BBC standard. Information-heavy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Documentary Style</summary>
      <div class="arc-card-body">
        <p>Typewriter font, no graphic background, light animation. Authentic feel. Subtle, doesn&apos;t distract from emotional moment.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Reality TV Style</summary>
      <div class="arc-card-body">
        <p>Color background, bold font, dynamic animation, sometimes social media handle. Casting personality. Big Brother, MTV style.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Corporate</summary>
      <div class="arc-card-body">
        <p>Brand color palette, restrained design, clean. Subtle motion. Polished corporate feel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Vlogger / YouTube</summary>
      <div class="arc-card-body">
        <p>Casual, custom designed. Sometimes handles social media. Match channel branding.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Design Principles</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Readability</h3>
    <ul class="arc-list">
      <li>Font readable at smallest device (mobile)</li>
      <li>Contrast với footage behind</li>
      <li>Outline/shadow nếu BG varies</li>
      <li>Avoid thin font on busy BG</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Hierarchy</h3>
    <ul class="arc-list">
      <li>Name = largest, boldest</li>
      <li>Title = smaller, secondary</li>
      <li>Optional location = smallest</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation</h3>
    <ul class="arc-list">
      <li>Smooth ease, not abrupt</li>
      <li>Duration 0.5-1.5s in/out</li>
      <li>Hold time 5-8s visible</li>
      <li>Avoid distracting motion</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Safe Zone</h3>
    <ul class="arc-list">
      <li>Bottom 1/3 area, not too close to edge</li>
      <li>Left or center, follow brand convention</li>
      <li>Action safe area cho TV broadcast</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Brand Consistency</h3>
    <ul class="arc-list">
      <li>Same lower thirds throughout project</li>
      <li>Brand color, font</li>
      <li>Template trong AE/Premiere</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Workflow tạo Lower Thirds</h2>
  <ul class="arc-list">
    <li><strong>After Effects</strong> — custom design, Essential Graphics export cho Premiere</li>
    <li><strong>Premiere — Essential Graphics</strong> — Motion Graphics Template (.mogrt) drag-drop editable</li>
    <li><strong>Premiere — Type Tool</strong> — simple text với pre-built animation</li>
    <li><strong>Template marketplace</strong> — Motion Array, RocketStock, Videohive ($10-50 packs)</li>
    <li><strong>Reuse across project</strong> — template once, type each interviewee&apos;s name</li>
    <li><strong>Batch processing</strong> — script automate cho many interviewee</li>
  </ul>
</section>
`,
  },

  // 07. Luma Key
  {
    id: "561c0894-8837-4dec-86f8-ede25aea2274",
    tieu_de: "Luma Key",
    tieu_de_viet: "Tách phông theo độ sáng (Luma Key)",
    tom_tat:
      "Luma Key là kỹ thuật ghép lớp hình ảnh bằng cách sử dụng độ sáng (luminance) làm kênh alpha — thường dùng cho footage có high contrast như white text trên black, smoke, lightning.",
    meta_title: "Luma Key là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Luma Key tách dựa vào độ sáng. Tìm hiểu khi dùng luma key vs chroma key, workflow trong AE, Premiere, Resolve.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn có footage smoke trên nền đen — muốn add smoke vào scene khác. Chroma key (green screen) không applicable. <strong>Luma Key</strong> là solution — sử dụng độ sáng làm alpha. Smoke white = visible; BG black = transparent. Simple, elegant cho specific use case — VFX element library, fire, smoke, fire, electricity, text reveal.</p>
  <p>Luma Key là kỹ thuật complement với chroma key trong VFX. Hiểu khi nào dùng luma vs chroma, workflow tune luma key trong software giúp work với element stock library efficient — element provider thường provide footage trên black BG ready cho luma key.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Luma Key là gì?</h2>
  <p>Luma Key là kỹ thuật <strong>tạo alpha channel dựa trên luminance</strong> (độ sáng) của pixel — không dựa vào color như chroma key. Set threshold: pixel sáng hơn threshold → visible (alpha=1); pixel tối hơn → transparent (alpha=0). Smooth transition ở threshold cho soft edge. Useful cho footage với high contrast — bright element trên dark BG hoặc vice versa.</p>
  <p>Cách hoạt động: software analyze luminance value mỗi pixel (0-255 grayscale). Apply threshold curve — adjust black point, white point, gamma cho fine control over transparency. Result: clean matte cho composite. Often combined với screen/add blend mode cho hiệu quả.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Luma Key vs Chroma Key</span>
    <p><strong>Chroma Key</strong>: use color (green/blue) → remove. Use case: actor cutout. <strong>Luma Key</strong>: use luminance → remove dark hoặc bright area. Use case: smoke, fire, lightning, text, particle. Different problem, different solution. VFX work uses both depending on element.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Luma Threshold</strong> — sáng level above visible</li>
    <li><strong>Luma Tolerance</strong> — soft edge range</li>
    <li><strong>Inverted Luma Key</strong> — dark visible, light transparent</li>
    <li><strong>Screen Blend Mode</strong> — alternative cho luma key</li>
    <li><strong>Add Blend Mode</strong> — alternative khác</li>
    <li><strong>Stock Footage</strong> — element thường provided trên black BG</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"luma key luminance compositing VFX smoke fire element"</span>
    </div>
    <p class="arc-image-caption">Luma Key — alpha dựa trên độ sáng, ideal cho smoke, fire, lightning element</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Use Cases Luma Key</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Smoke / Fire Element</summary>
      <div class="arc-card-body">
        <p>Stock smoke footage on black BG. Luma key drop black, smoke composite vào scene. ActionVFX, VideoCopilot popular libraries.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lightning / Electricity</summary>
      <div class="arc-card-body">
        <p>Bright lightning bolt trên dark sky → luma key extract. Add vào scene.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Text Reveal / Title</summary>
      <div class="arc-card-body">
        <p>White text trên black animated → luma key extract → place over footage. Classic title intro reveal.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Particle / Sparks</summary>
      <div class="arc-card-body">
        <p>Sparks trên dark BG element. Luma key clean composite vào action scene.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Light Leaks Overlay</summary>
      <div class="arc-card-body">
        <p>Light leak footage trên black. Luma key OR screen blend mode achieves similar.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Glow / Halo</summary>
      <div class="arc-card-body">
        <p>Glow effect rendered trên black BG → luma key composite vào shot.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>White Text Animation</summary>
      <div class="arc-card-body">
        <p>Reveal text khi reverse luma key — dark text visible.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Luma Key Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">After Effects</h3>
    <ul class="arc-list">
      <li>Effect → Keying → Luma Key</li>
      <li>Adjust Threshold (white point cutoff)</li>
      <li>Tolerance (soft edge)</li>
      <li>Key Type: Above Threshold / Below Threshold</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Premiere Pro</h3>
    <ul class="arc-list">
      <li>Effect → Keying → Luma Key</li>
      <li>Threshold + Cutoff sliders</li>
      <li>Real-time preview</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">DaVinci Resolve / Fusion</h3>
    <ul class="arc-list">
      <li>Fusion Luma Keyer node</li>
      <li>Resolve Color page Qualifier (luma)</li>
      <li>Robust control</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Alternative — Blend Modes</h3>
    <ul class="arc-list">
      <li><strong>Screen</strong>: black BG transparent, easier than luma key cho many element</li>
      <li><strong>Add</strong>: brighten everything below, good cho fire/light</li>
      <li>Blend mode faster, simpler than dedicated luma keyer</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Tips</h3>
    <ul class="arc-list">
      <li>Start với Screen blend mode — often sufficient</li>
      <li>Luma Key cho fine control khi blend mode không enough</li>
      <li>Multiple luma key chain cho complex element</li>
      <li>Color correction trước luma key cho cleaner result</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp</h2>
  <ul class="arc-list">
    <li><strong>Edge halo</strong> — element có edge dark/light boundary. Adjust threshold, soft</li>
    <li><strong>Element vẫn dim sau composite</strong> — luma key kéo down brightness. Use Add blend mode thay vì regular composite</li>
    <li><strong>BG không hoàn toàn black</strong> — minor noise. Lower threshold, accept some artifact</li>
    <li><strong>Element semi-transparent area lost</strong> — smoke wisp thin. Reduce threshold, accept some black</li>
    <li><strong>Stock element wrong BG</strong> — không black/white. Need chroma key instead</li>
  </ul>
</section>
`,
  },

  // 08. Lumetri Color
  {
    id: "3712ae7e-43b6-4c2f-9e88-30a02f0ea8a0",
    tieu_de: "Lumetri Color",
    tieu_de_viet: "Lumetri Color (Adobe)",
    tom_tat:
      "Lumetri Color là workspace và bộ công cụ chỉnh màu toàn diện tích hợp trong Adobe Premiere Pro và After Effects — từ primary correction đến creative grading, hỗ trợ LUT và color wheel.",
    meta_title:
      "Lumetri Color là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Lumetri Color trong Premiere Pro. Tìm hiểu Basic, Creative, Curves, Color Wheels, HSL Secondary và workflow color grading.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn editor làm việc trong Premiere — cần color correct và grade footage. Trước đây phải export sang DaVinci Resolve, grade, import back. Adobe introduce <strong>Lumetri Color</strong> — full color grading toolkit ngay trong Premiere. Không cần leave Adobe ecosystem. Result: workflow nhanh hơn, đặc biệt cho commercial, social media, YouTube content.</p>
  <p>Lumetri Color là tool essential cho mọi Premiere editor, motion designer Adobe. Hiểu cách dùng từng panel — Basic, Creative, Curves, Color Wheels, HSL Secondary, Vignette — giúp grade footage professional mà không cần thoát Premiere. Critical cho production speed.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Lumetri Color là gì?</h2>
  <p>Lumetri Color là <strong>workspace và panel toolkit</strong> cho color grading trong Adobe Premiere Pro (và limited version trong After Effects). Introduced Premiere CC 2015, dramatically improved every release. Comprehensive: from primary correction (white balance, exposure) đến creative grading (look, LUT) đến advanced (HSL secondary, mask). Replace SpeedGrade legacy.</p>
  <p>Architecture: Lumetri là <strong>effect</strong> applied to clip — multiple Lumetri effects stack on single clip. Each Lumetri có 6 sections: Basic, Creative, Curves, Color Wheels &amp; Match, HSL Secondary, Vignette. Adjust trong Lumetri Color panel, see preview real-time.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Lumetri vs DaVinci Resolve</span>
    <p><strong>Lumetri</strong>: integrated Premiere, convenient cho simple-to-mid grading. <strong>DaVinci Resolve</strong>: industry-standard professional color grading. Node-based, more powerful, deeper toolset. Pro colorist use Resolve; editor color-correcting own work use Lumetri. Resolve free tier capable too.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Basic Correction</strong> — white balance, exposure, contrast</li>
    <li><strong>Creative</strong> — LUT application, faded film look</li>
    <li><strong>Curves</strong> — RGB curves, hue/sat curves</li>
    <li><strong>Color Wheels</strong> — shadow/midtone/highlight wheels</li>
    <li><strong>HSL Secondary</strong> — select range tune</li>
    <li><strong>Vignette</strong> — edge darkening</li>
    <li><strong>Lumetri Scopes</strong> — waveform, vector, histogram</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"lumetri color premiere pro grading panel adobe"</span>
    </div>
    <p class="arc-image-caption">Lumetri Color panel — full color grading toolkit trong Premiere Pro</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>6 Section của Lumetri Color</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Basic Correction</summary>
      <div class="arc-card-body">
        <p>Primary correction — fix lighting issue. <strong>White Balance</strong>: temp, tint sliders hoặc eyedropper. <strong>Tone</strong>: exposure, contrast, highlights, shadows, whites, blacks. <strong>Saturation</strong>: overall sat. Foundation step.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Creative</summary>
      <div class="arc-card-body">
        <p>Creative look. <strong>Look dropdown</strong>: built-in Adobe Looks (cinematic style). <strong>Faded Film, Sharpen, Vibrance</strong>. <strong>Shadow Tint, Highlight Tint</strong>: split toning. Quick stylish look.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Curves</summary>
      <div class="arc-card-body">
        <p>Fine-tune via curves. <strong>RGB Curves</strong>: tone curve per channel. <strong>Hue Saturation Curves</strong>: select hue range, adjust saturation/luminance/hue. Powerful cho selective color.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Wheels &amp; Match</summary>
      <div class="arc-card-body">
        <p><strong>Shadow / Midtone / Highlight</strong> wheels — adjust color cast per tonal range. Cinematic teal/orange grade typical. <strong>Color Match</strong>: AI match color across two clips.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>HSL Secondary</summary>
      <div class="arc-card-body">
        <p>Select specific color range (Hue/Sat/Luma) → adjust only that range. Skin tone enhance, sky deepen. Eyedropper select, refine mask. Powerful targeted grading.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Vignette</summary>
      <div class="arc-card-body">
        <p>Darken edges của frame. Amount, midpoint, roundness, feather. Add focus to center subject. Subtle vignette adds polish.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Color Grading Workflow trong Premiere</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Open Color Workspace</h3>
    <ul class="arc-list">
      <li>Window → Workspaces → Color</li>
      <li>Lumetri Color panel visible right side</li>
      <li>Scopes panel visible cho analysis</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Basic Correction</h3>
    <ul class="arc-list">
      <li>Set white balance — neutral white object</li>
      <li>Adjust exposure cho proper brightness</li>
      <li>Contrast for punch</li>
      <li>Recover blown highlights, lift shadows</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Apply LUT (Optional)</h3>
    <ul class="arc-list">
      <li>Creative tab → Look dropdown → select LUT</li>
      <li>If log footage → apply technical LUT (log to rec.709)</li>
      <li>Creative LUT cho look</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Color Wheels</h3>
    <ul class="arc-list">
      <li>Shadow toward teal cho cinematic</li>
      <li>Highlight toward orange/yellow</li>
      <li>Midtone subtle warm</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. HSL Secondary — Skin Tone</h3>
    <ul class="arc-list">
      <li>Select skin range (eyedropper)</li>
      <li>Adjust saturation, luminance cho natural skin</li>
      <li>Vector scope verify skin on skin line</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Add Vignette</h3>
    <ul class="arc-list">
      <li>Amount -1 to -2</li>
      <li>Feather high cho smooth</li>
      <li>Subtle, not heavy</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Copy Lumetri to Clip Multiple</h3>
    <ul class="arc-list">
      <li>Copy paste effect cho similar clip</li>
      <li>Adjustment layer cho global grade</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Best Practice</h2>
  <ul class="arc-list">
    <li><strong>Use scopes always</strong> — eye unreliable, scope objective</li>
    <li><strong>Multiple Lumetri layers</strong> — stack effects cho complex grade, easy disable</li>
    <li><strong>Adjustment Layer</strong> — global grade affect all clip below</li>
    <li><strong>Bookmark looks</strong> — save creative Lumetri as preset</li>
    <li><strong>Calibrated monitor essential</strong> — uncalibrated = grade wrong</li>
    <li><strong>Reference shot</strong> — match clips against hero shot for consistency</li>
    <li><strong>Don&apos;t over-grade</strong> — heavy grade looks amateur, subtle pro</li>
  </ul>
</section>
`,
  },

  // 09. Lumetri Scopes
  {
    id: "878fab89-c6ff-4634-b301-bfa78f3ca130",
    tieu_de: "Lumetri Scopes",
    tieu_de_viet: "Biểu đồ Lumetri (Lumetri Scopes)",
    tom_tat:
      "Lumetri Scopes là các biểu đồ khoa học phân tích độ sáng và màu sắc của video — waveform, vectorscope, parade, histogram — giúp colorist grade khách quan, không phụ thuộc màn hình.",
    meta_title:
      "Lumetri Scopes là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Lumetri Scopes phân tích video chính xác. Tìm hiểu Waveform, Vectorscope, RGB Parade và cách đọc scope.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn grade video — color trên monitor &quot;đẹp&quot;, exposure &quot;ok&quot;. Export, xem trên TV khác — quá sáng, skin orange. Vấn đề: trust monitor eye. Pro colorist không trust monitor — trust <strong>Lumetri Scopes</strong> — biểu đồ khoa học analyze video chính xác. Scope objective, không lệ thuộc monitor calibration, ambient light, eye fatigue.</p>
  <p>Lumetri Scopes là kỹ năng essential cho mọi colorist, video editor pro. Hiểu cách đọc waveform, vectorscope, parade phân biệt amateur (eye-based) và pro (scope-based) grading. Đầu tư học scopes là best investment cho color skill development.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Lumetri Scopes là gì?</h2>
  <p>Lumetri Scopes là <strong>collection of biểu đồ scientific</strong> trong Premiere Pro analyze pixel data của video — display luminance, chrominance, color distribution as graph. Multiple scope types: <strong>Waveform</strong> (vertical luminance), <strong>Vectorscope</strong> (color circle), <strong>RGB Parade</strong> (3 channels), <strong>Histogram</strong> (tonal distribution). Each scope reveal different aspect of image.</p>
  <p>Why scopes? Human vision unreliable: monitor calibration vary, room lighting affect perception, eye fatigue. Scope = numerical/graphical truth — same data regardless of how display look. Pro grade với scopes primary, monitor secondary check.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Scopes Trong Lumetri Color Panel</span>
    <p>Premiere Pro: Window → Lumetri Scopes (separate panel). Display multiple scope simultaneous. Right-click panel: choose which scope show, scope settings, IRE 8-bit/10-bit. Color workspace include scope panel by default.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Waveform Monitor</strong> — luminance levels across image</li>
    <li><strong>Vectorscope</strong> — color saturation và hue distribution</li>
    <li><strong>RGB Parade</strong> — red, green, blue channel separated</li>
    <li><strong>Histogram</strong> — tonal pixel count</li>
    <li><strong>YUV Parade</strong> — luma + chroma channels</li>
    <li><strong>HLS</strong> — Hue, Luminance, Saturation</li>
    <li><strong>IRE</strong> — measurement unit (0-100 broadcast)</li>
    <li><strong>Skin Tone Line</strong> — diagonal line vectorscope</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"lumetri scopes waveform vectorscope premiere color grading"</span>
    </div>
    <p class="arc-image-caption">Lumetri Scopes — waveform, vectorscope, parade — analyze video objective</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Scope &amp; Cách đọc</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Waveform Monitor (Luminance)</summary>
      <div class="arc-card-body">
        <p>Vertical axis = brightness (0-100 IRE). Horizontal = image position. Reading: top of waveform = highlights, bottom = shadows. Goal: distributed evenly, không clip top/bottom. Broadcast safe: 7-100 IRE typically.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>RGB Parade</summary>
      <div class="arc-card-body">
        <p>3 columns side-by-side — R, G, B channel separately. Check white balance: highlights should all 3 channel same height (white = equal RGB). Tilt indicates color cast.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Vectorscope (YUV)</summary>
      <div class="arc-card-body">
        <p>Circular plot of color. Center = no saturation (gray). Distance from center = saturation. Direction = hue. Skin tone falls on specific diagonal line (between R và yellow). Saturation push toward edge.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Histogram</summary>
      <div class="arc-card-body">
        <p>Bar chart of pixel count per tonal value. Horizontal = brightness 0-255. Vertical = pixel count. Reading: left peak = dark image (low key), right peak = bright (high key). Avoid clipping at edges.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>HLS Scope</summary>
      <div class="arc-card-body">
        <p>Hue Lightness Saturation. Show distribution across hue spectrum. Useful cho selective grading verification.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Practical Uses</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">White Balance Check</h3>
    <ul class="arc-list">
      <li>RGB Parade: top 3 channel equal height = neutral white</li>
      <li>Tilt right = warm cast, left = cool cast</li>
      <li>Eyedropper + RGB Parade for precise WB</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Exposure Check</h3>
    <ul class="arc-list">
      <li>Waveform: spread 0-100 IRE = good exposure</li>
      <li>Clipping at 100 = blown highlight, lower exposure</li>
      <li>Crushed at 0 = lost shadow, lift</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Skin Tone Verification</h3>
    <ul class="arc-list">
      <li>Vectorscope: skin should fall on diagonal line (between R và yellow)</li>
      <li>Off-line = unnatural skin tone</li>
      <li>Adjust HSL Secondary cho fix</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Broadcast Safe</h3>
    <ul class="arc-list">
      <li>Waveform: keep within 7-100 IRE</li>
      <li>Vectorscope: stay within outer circle (saturation legal)</li>
      <li>Some broadcast: 0-100 acceptable</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Shot Matching</h3>
    <ul class="arc-list">
      <li>Compare scope giữa 2 clip cần match</li>
      <li>Match luminance distribution waveform</li>
      <li>Match color cast RGB Parade</li>
      <li>Match saturation vectorscope</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cinematic Grade Verify</h3>
    <ul class="arc-list">
      <li>Teal/orange grade: vectorscope shadow toward cyan/blue, highlight toward orange</li>
      <li>Crushed black bottom waveform = cinematic</li>
      <li>Verify creative intent achieved</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Sử dụng Scopes</h2>
  <ul class="arc-list">
    <li><strong>Trust scope over eye</strong> — eye lies, scope doesn&apos;t</li>
    <li><strong>Multiple scope simultaneously</strong> — Waveform + Vectorscope minimum</li>
    <li><strong>RGB Parade cho color cast</strong> — best for white balance</li>
    <li><strong>Vectorscope cho saturation</strong> — best for color intensity</li>
    <li><strong>Histogram cho tonal distribution</strong> — exposure overview</li>
    <li><strong>Skin tone diagonal line</strong> — memorize on vectorscope</li>
    <li><strong>8-bit vs 10-bit setting</strong> — match project bit depth</li>
  </ul>
</section>
`,
  },

  // 10. LUT
  {
    id: "9c607120-4dd4-4f82-921c-5b4b2de91e7b",
    tieu_de: "LUT (Look-up Table)",
    tieu_de_viet: "LUT — bảng màu",
    tom_tat:
      "LUT (Look-Up Table) là bảng màu định sẵn dùng để apply style màu cho video/ảnh — tiết kiệm thời gian color grade, có 2 loại: Technical LUT (log to rec.709) và Creative LUT (cinematic look).",
    meta_title: "LUT là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "LUT là Look-Up Table chỉnh màu nhanh. Tìm hiểu Technical vs Creative LUT, cách apply trong Premiere, Resolve và best practice.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn quay video Sony S-Log3 — màu flat, ugly. Drag-drop một LUT file (.cube) vào clip — instant cinematic look đẹp như Hollywood film. Đây là magic của <strong>LUT</strong> — pre-defined color transformation áp dụng cho video nhanh chóng. LUT đã democratize color grading — anyone với laptop và LUT pack có thể achieve professional-looking grade.</p>
  <p>LUT là kỹ năng cơ bản cho mọi video editor, colorist. Hiểu các loại LUT, cách apply, và limitation — đặc biệt khi nào dùng LUT vs custom grade — giúp output professional cinematic content nhanh chóng. Essential cho YouTuber, commercial, indie filmmaker.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>LUT là gì?</h2>
  <p>LUT (Look-Up Table) là <strong>bảng mathematical mapping</strong> từ input color values → output color values. Apply LUT = transform every pixel color theo bảng. Vd: input red (255,0,0) → output (220,30,30). Apply across entire image = consistent color shift. LUT file format: .cube, .3dl, .look. Smaller (.cube ~1KB) hoặc 3D LUT (.3dl ~MB).</p>
  <p>Có 2 loại chính: <strong>Technical LUT</strong> (transform log to rec.709, color space convert) — necessary cho normalize log footage; <strong>Creative LUT</strong> (apply cinematic look — teal/orange, vintage film, etc.) — style choice. Pro workflow: apply technical LUT first, then creative LUT on top, fine-tune manually.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">LUT vs Filter vs Preset</span>
    <p><strong>LUT</strong>: precise mathematical color transformation. Universal format (.cube), cross-software. <strong>Filter</strong>: software-specific effect (Instagram filter). <strong>Preset</strong>: software-specific saved settings. LUT more standardized, professional.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Technical LUT</strong> — log to rec.709 conversion</li>
    <li><strong>Creative LUT</strong> — stylized look</li>
    <li><strong>Camera LUT</strong> — manufacturer-provided</li>
    <li><strong>Film Emulation LUT</strong> — Kodak, Fuji film stock look</li>
    <li><strong>1D LUT</strong> — simple gamma/luma curve</li>
    <li><strong>3D LUT</strong> — complex color transformation</li>
    <li><strong>.cube Format</strong> — most common LUT format</li>
    <li><strong>LUT Application</strong> — Lumetri Creative, Resolve Node</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"LUT color grading cinematic film teal orange premiere"</span>
    </div>
    <p class="arc-image-caption">LUT — bảng mapping color, apply để transform video color nhanh</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại LUT</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Technical / Conversion LUT</summary>
      <div class="arc-card-body">
        <p>Transform log → rec.709. Camera-manufacturer provided. Sony S-Log3 to Rec.709 LUT, Canon C-Log to Rec.709. Foundation step cho log footage workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Creative Look LUT</summary>
      <div class="arc-card-body">
        <p>Stylized — teal/orange cinematic, faded vintage, high contrast dramatic. Marketplace LUT pack: Vision Color, Lutify.me, Filmic Worldwide, Color Grading Central. $20-200/pack.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Film Emulation</summary>
      <div class="arc-card-body">
        <p>Recreate look của analog film stock — Kodak Vision3, Fuji Eterna, Cinestill. FilmConvert plugin, Dehancer. Authentic film aesthetic without shooting on film.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Space LUT</summary>
      <div class="arc-card-body">
        <p>Convert giữa color spaces — sRGB to Rec.2020, DCI-P3 to Rec.709. Technical cho deliver to different display.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Camera-Specific LUT</summary>
      <div class="arc-card-body">
        <p>Provided by manufacturer. Sony Catalyst, Canon Cinema Picture Style. Officially-supported workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Look-Match LUT</summary>
      <div class="arc-card-body">
        <p>Custom LUT generated to match reference image. AI tools (Magic Bullet Looks, Color Match) auto generate.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Apply LUT Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Premiere — Lumetri Creative</h3>
    <ul class="arc-list">
      <li>Lumetri Color panel → Creative tab</li>
      <li>Look dropdown → Browse... → select .cube file</li>
      <li>Intensity slider control strength 0-100%</li>
      <li>Add multiple Lumetri layers cho stacking</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Premiere — Lumetri Basic Input LUT</h3>
    <ul class="arc-list">
      <li>Basic Correction tab → Input LUT</li>
      <li>Apply technical LUT first (log to 709)</li>
      <li>Then Creative LUT on top</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">DaVinci Resolve</h3>
    <ul class="arc-list">
      <li>Color page → Node panel → Right-click → LUT → Browse</li>
      <li>LUT applied as node — flexible position in node graph</li>
      <li>Resolve LUT library extensive</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">After Effects</h3>
    <ul class="arc-list">
      <li>Effect → Utility → Apply Color LUT</li>
      <li>Lumetri Color effect also available trong AE</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">FCP X</h3>
    <ul class="arc-list">
      <li>Effects → Color → Custom LUT</li>
      <li>Drag LUT to clip</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>LUT Best Practice &amp; Pitfall</h2>
  <ul class="arc-list">
    <li><strong>LUT không phải one-click grade</strong> — base + tweak, không apply blindly</li>
    <li><strong>Footage exposure correct first</strong> — LUT applied to over/under-exposed footage = ugly result</li>
    <li><strong>Lower intensity</strong> — 100% LUT often too heavy, 50-80% better</li>
    <li><strong>Per-scene tweak</strong> — same LUT look different cross scenes, adjust each</li>
    <li><strong>Color space match</strong> — LUT designed for specific input color space</li>
    <li><strong>Skin tone check</strong> — many LUT distort skin, verify vectorscope</li>
    <li><strong>Stack LUT carefully</strong> — multiple LUT can blow out, monitor scope</li>
    <li><strong>Free LUT often basic</strong> — pro pack invest worthwhile cho commercial work</li>
    <li><strong>Custom LUT khả thi</strong> — DaVinci Resolve export custom grade as LUT cho reuse</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 2 · Batch 3 — chạy ${items.length} bài keyword (I → P) ──\n`,
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
