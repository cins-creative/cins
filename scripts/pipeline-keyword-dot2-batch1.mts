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
  // 01. IK FK
  {
    id: "0e184637-207c-466d-aea6-20c78fe3e30d",
    tieu_de: "IK &amp; FK",
    tieu_de_viet: "IK và FK — Hai phương pháp rigging",
    tom_tat:
      "IK (Inverse Kinematics) và FK (Forward Kinematics) là hai phương pháp cơ bản để điều khiển chuỗi xương trong rigging 3D — FK xoay từng joint từ gốc, IK di chuyển end-effector và auto-tính joint.",
    meta_title:
      "IK FK là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "IK và FK là hai phương pháp rigging 3D. Tìm hiểu Inverse Kinematics, Forward Kinematics, IK/FK switch và khi nào dùng cái nào.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn animate character đi bộ — chân chạm đất phải plant cứng, không trượt. Hoặc character vẫy tay tự do — không bị stuck một chỗ. Hai action này cần hai cách điều khiển skeleton hoàn toàn khác — đó là <strong>IK</strong> và <strong>FK</strong>, hai nguyên lý cơ bản nhất của rigging 3D.</p>
  <p>IK và FK là kiến thức nền tảng cho 3D animator, character TD. Hiểu khi nào nên dùng IK, khi nào nên dùng FK, và cách switch giữa hai là kỹ năng phân biệt animator junior và pro — quyết định trực tiếp đến motion quality.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>IK &amp; FK là gì?</h2>
  <p><strong>Forward Kinematics (FK)</strong>: animator xoay từng joint trong chuỗi từ root đến tip. Vd cánh tay: rotate shoulder → elbow → wrist sequentially. Joint con kế thừa transform của joint cha. <strong>Inverse Kinematics (IK)</strong>: animator di chuyển end-effector (tay, chân), engine tự tính toán góc xoay cho tất cả joint trong chuỗi để end-effector đến vị trí đó.</p>
  <p>Bản chất là hai cách giải bài toán khác nhau. FK đi xuôi: cho input góc xoay → output vị trí end. IK đi ngược: cho input vị trí end → output góc xoay từng joint. IK technically khó hơn — phải solve hệ phương trình mỗi frame. FK đơn giản nhưng tedious.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Khi nào FK, khi nào IK?</span>
    <p><strong>FK</strong> cho motion arc tự nhiên — vẫy tay, lắc đầu, motion không có end-point cố định. Animator có control hoàn toàn. <strong>IK</strong> khi end-point cần fixed/anchored — chân khi đứng (plant ground), tay khi cầm vật cố định, climbing rope. Hand reach object specific position.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Joint Chain</strong> — chuỗi joint nối tiếp</li>
    <li><strong>Root / End-Effector</strong> — gốc / điểm cuối chuỗi</li>
    <li><strong>IK Handle</strong> — controller animator di chuyển</li>
    <li><strong>Pole Vector</strong> — define hướng bend của elbow/knee</li>
    <li><strong>IK Solver</strong> — algorithm tính góc (Rotate-Plane, Spline)</li>
    <li><strong>IK/FK Switch</strong> — blend giữa hai mode trong rig</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"IK FK rigging 3D character maya inverse forward kinematics"</span>
    </div>
    <p class="arc-image-caption">IK vs FK — IK move end-point, FK rotate joints sequentially</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>FK trong từng tình huống</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Vẫy tay, gesture tự do</summary>
      <div class="arc-card-body">
        <p>Arm motion không có end-point fixed → FK ideal. Animator rotate shoulder rồi elbow rồi wrist. Natural arc, full control.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Spine / cột sống animation</summary>
      <div class="arc-card-body">
        <p>Spine multi-joint chain, FK control mỗi vertebra rotation. Bend, twist body. IK spine có nhưng FK phổ biến hơn.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cartoon overshoot</summary>
      <div class="arc-card-body">
        <p>Cartoon animation cần exaggeration — overshoot, follow-through. FK cho phép artist tweak từng joint riêng cho perfect cartoon arc.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tail, antenna, secondary motion</summary>
      <div class="arc-card-body">
        <p>Multi-joint chain cần follow main motion với delay. FK + Dynamics/Spring tốt cho secondary motion.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>IK trong từng tình huống</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Leg planting / walking</summary>
      <div class="arc-card-body">
        <p>Foot plant trên ground không trượt = critical. IK foot control fix vị trí, hip move freely. Standard cho mọi character locomotion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Climbing, hanging</summary>
      <div class="arc-card-body">
        <p>Hand gripping rope, ledge — hand position fixed. IK arm với hand control attached to grip point.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Object interaction</summary>
      <div class="arc-card-body">
        <p>Character pick up cup, table interaction — hand reach specific position. IK arm dễ hơn FK.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Push-up, weight bearing</summary>
      <div class="arc-card-body">
        <p>Hands on ground, body lower/raise. IK arm với hand fixed, shoulder/spine move. Convincing weight feeling.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>IK/FK Switch — Best of Both</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Tại sao cần switch?</h3>
    <ul class="arc-list">
      <li>Cùng cảnh có lúc cần FK (gesture), lúc cần IK (object grab)</li>
      <li>Pro rig phải có IK/FK switchable trên mỗi limb</li>
      <li>Animator chọn mode phù hợp với shot</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Implementation</h3>
    <ul class="arc-list">
      <li>Rig có 2 set joint: IK skeleton + FK skeleton</li>
      <li>Bind skeleton là blend của hai</li>
      <li>Switch attribute (0=FK, 1=IK) trên controller</li>
      <li>Matching pose khi switch để tránh pop</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Lỗi thường gặp</h3>
    <ul class="arc-list">
      <li><strong>Pop khi switch</strong> — IK/FK pose không match → snap khó chịu. Use match feature trước switch</li>
      <li><strong>IK chân bị flip</strong> — pole vector setup sai. Aim pole vector forward khi character standing</li>
      <li><strong>FK quá tedious</strong> — không có shortcut copy/paste pose</li>
    </ul>
  </div>
</section>
`,
  },

  // 02. Illustration
  {
    id: "273b537a-d86b-45b3-8d1d-27ddd81b8f6f",
    tieu_de: "Illustration",
    tieu_de_viet: "Minh họa (Illustration)",
    tom_tat:
      "Illustration là nghệ thuật tạo hình ảnh để truyền đạt ý tưởng, kể chuyện, minh họa nội dung — vẽ tay, kỹ thuật số, vector — ứng dụng từ sách thiếu nhi đến concept art, editorial, branding.",
    meta_title:
      "Illustration là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Illustration là minh họa hình ảnh truyền đạt ý tưởng. Tìm hiểu các style, ứng dụng trong sách, web, advertising và career path.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn nhìn một cuốn sách trẻ em — illustration đầy màu sắc kể câu chuyện. Một bài The New York Times — editorial illustration kèm article. Logo của một startup tech — illustration làm logo có character. Illustration ở khắp nơi — đôi khi không nhận ra, nhưng định hình cảm xúc và message của visual content.</p>
  <p>Illustration là career path lâu đời nhất nhưng vẫn relevant trong digital age. Hiểu các style, market segment và pricing giúp aspiring illustrator chọn niche phù hợp, build portfolio đúng hướng và monetize talent qua nhiều kênh — book, editorial, branding, NFT.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Illustration là gì?</h2>
  <p>Illustration là <strong>hình ảnh được tạo ra để truyền đạt ý tưởng, kể chuyện, hoặc bổ trợ nội dung text</strong>. Khác với fine art (nghệ thuật vì giá trị tự thân) và photography (capture reality), illustration <strong>được commission</strong> để serve specific purpose — minh họa cho article, sách, packaging, advertising, web. Có thể vẽ tay (traditional medium: ink, watercolor, gouache) hoặc digital (Photoshop, Procreate, Illustrator).</p>
  <p>Lịch sử lâu đời — từ illuminated manuscripts trung cổ, đến golden age illustrator (Norman Rockwell, J.C. Leyendecker), đến modern digital era. Digital tools democratize illustration — anyone với iPad + Procreate có thể tạo professional work. Nhưng vẫn cần years of practice cho mastery.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Illustration vs Fine Art vs Graphic Design</span>
    <p><strong>Illustration</strong>: serve specific purpose, commissioned, communicate content. <strong>Fine Art</strong>: tự thân giá trị thẩm mỹ, self-expression. <strong>Graphic Design</strong>: visual communication với typography và composition là chính, illustration có thể là một phần. Overlap tồn tại — book cover thường mix illustration + design.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Editorial Illustration</strong> — minh họa cho báo, tạp chí</li>
    <li><strong>Book Illustration</strong> — children book, novel cover</li>
    <li><strong>Concept Art</strong> — game, film visual development</li>
    <li><strong>Packaging Illustration</strong> — bao bì sản phẩm</li>
    <li><strong>Advertising Illustration</strong> — quảng cáo</li>
    <li><strong>Web Illustration</strong> — landing page, blog</li>
    <li><strong>Medical / Scientific</strong> — chuyên biệt accurate</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"illustration art editorial book children digital procreate"</span>
    </div>
    <p class="arc-image-caption">Illustration — hình ảnh được commission để truyền đạt ý tưởng, kể chuyện</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các phong cách Illustration phổ biến</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Flat Illustration</summary>
      <div class="arc-card-body">
        <p>Phẳng, simplified, geometric. Phổ biến cho web, app onboarding (Slack, Dropbox 2010s). Easy scalable, modern feel. Tool: Illustrator vector.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Children Book Illustration</summary>
      <div class="arc-card-body">
        <p>Whimsical, colorful, character-driven. Watercolor traditional hoặc digital. Eric Carle, Maurice Sendak classic. Modern: Oliver Jeffers.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Editorial Illustration</summary>
      <div class="arc-card-body">
        <p>Concept-heavy, often metaphorical. The New Yorker, Time Magazine cover. Strong concept &gt; technical perfection. Tighter deadline, smarter ideas.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Digital Painting</summary>
      <div class="arc-card-body">
        <p>Photoshop, Procreate. Realistic hoặc stylized. Concept art game/film. Painterly brushwork. Top artists: Craig Mullins, Sparth.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Vector Illustration</summary>
      <div class="arc-card-body">
        <p>Adobe Illustrator, Figma. Clean lines, scalable. Logo, icon, infographic. Geometric or organic vector.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hand-drawn / Traditional</summary>
      <div class="arc-card-body">
        <p>Ink, watercolor, gouache, pencil. Authentic feel. Often scanned then digital enhance. Premium luxury market.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3D Illustration</summary>
      <div class="arc-card-body">
        <p>Cinema 4D, Blender. Modern aesthetic — Apple, Stripe sử dụng heavy. Render-based illustration.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Comic / Manga Style</summary>
      <div class="arc-card-body">
        <p>Sequential storytelling. Inking, screentone (manga). Cel-shaded color. Clip Studio Paint chuẩn.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Career Path Illustrator</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Editorial Illustrator</h3>
    <ul class="arc-list">
      <li>Magazine, newspaper, online media</li>
      <li>$300-$3,000/illustration depending on outlet</li>
      <li>Tight deadline (24-72h), concept-heavy</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Book Illustrator (Children)</h3>
    <ul class="arc-list">
      <li>Picture book full illustration (20-32 spreads)</li>
      <li>Advance $5-50K + royalty</li>
      <li>Long timeline (6-12 months/book)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Concept Artist (Game/Film)</h3>
    <ul class="arc-list">
      <li>In-house studio salary $60-150K</li>
      <li>Freelance $100-300/hour</li>
      <li>Heavy technical skill (perspective, anatomy)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Commercial / Branding Illustrator</h3>
    <ul class="arc-list">
      <li>Branding illustration, product packaging</li>
      <li>$2K-50K per project</li>
      <li>Long-term client relationships</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Webcomic / Indie Artist</h3>
    <ul class="arc-list">
      <li>Patreon, Substack, Webtoon</li>
      <li>Self-direct income — variable $$$</li>
      <li>Build audience over years</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Stock Illustration</h3>
    <ul class="arc-list">
      <li>Adobe Stock, Shutterstock</li>
      <li>Passive income, lower per-sale</li>
      <li>Volume game — hundreds/thousands of pieces</li>
    </ul>
  </div>
</section>
`,
  },

  // 03. Image Sequences
  {
    id: "2500b376-00be-4e55-a5f8-024024d7593b",
    tieu_de: "Image Sequences",
    tieu_de_viet: "Chuỗi ảnh (Image Sequences)",
    tom_tat:
      "Image Sequences là chuỗi ảnh tĩnh liên tiếp đại diện cho từng frame của video — format xuất phổ biến trong VFX, animation vì cho phép render song song và dễ phục hồi khi gián đoạn.",
    meta_title:
      "Image Sequences là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Image Sequences format render VFX, animation. Tìm hiểu PNG, EXR sequence, naming convention và workflow render farm.",
    noi_dung: `
<section class="arc-intro">
  <p>Studio film render 1 cảnh CGI dài 100 frames — chia thành 100 file PNG riêng biệt thay vì 1 file video. Tại sao? Vì khi frame 50 fail, restart chỉ frame 50, không phải toàn bộ. Vì render farm có thể chạy song song mỗi frame trên một máy khác nhau. Đây là <strong>Image Sequences</strong> — workflow chuẩn cho VFX, animation production.</p>
  <p>Image Sequences là kiến thức cơ bản cho VFX artist, 3D animator, compositor. Hiểu lý do dùng image sequence vs video, naming convention, format choice giúp workflow chuyên nghiệp — đặc biệt cho project lớn render farm.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Image Sequences là gì?</h2>
  <p>Image Sequence là <strong>chuỗi nhiều file ảnh tĩnh liên tiếp</strong>, mỗi file đại diện cho một frame của video/animation. Vd cảnh 10 giây 24fps = 240 file ảnh riêng (frame.0001.png, frame.0002.png, ..., frame.0240.png). Khi import vào software (After Effects, Nuke, Premiere) lại tự ghép thành video continuous.</p>
  <p>Đây là format chuẩn cho VFX và animation production — khác với video file (MP4, MOV) đóng gói tất cả trong một file. Image sequence có nhiều ưu điểm cho production pipeline phức tạp: parallel rendering, fault tolerance, easy resume, no compression artifacts trong source.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Image Sequence vs Video File</span>
    <p><strong>Image Sequence</strong>: nhiều file riêng, lossless, large size, ideal cho production. <strong>Video File</strong> (MP4, MOV): single file, compressed, smaller, ideal cho delivery. Workflow: render image sequence cho production, encode thành video MP4 cho final delivery. Image sequence là &quot;source of truth&quot;, video file là &quot;output&quot;.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Naming Convention</strong> — frame.0001.png chuẩn padding 4 digit</li>
    <li><strong>PNG Sequence</strong> — lossless với alpha, phổ biến motion graphics</li>
    <li><strong>EXR Sequence</strong> — HDR floating point, chuẩn VFX film</li>
    <li><strong>TIFF/TGA Sequence</strong> — legacy lossless options</li>
    <li><strong>JPEG Sequence</strong> — lossy, smaller size, preview only</li>
    <li><strong>Frame Padding</strong> — số chữ số (0001 vs 0000001)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"image sequence VFX render PNG EXR frame folder"</span>
    </div>
    <p class="arc-image-caption">Image Sequence — nhiều file ảnh liên tiếp, mỗi file một frame</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Ưu điểm Image Sequences</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Parallel Rendering</summary>
      <div class="arc-card-body">
        <p>Render farm 100 máy có thể render 100 frame song song — mỗi máy 1 frame. Nếu render video file, 1 máy phải render sequential. Tăng tốc độ 100x.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Fault Tolerance</summary>
      <div class="arc-card-body">
        <p>Máy render frame 50 crash → restart chỉ frame 50, không mất 49 frame trước. Critical cho overnight render. Video file crash = mất hết.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Easy Re-render</summary>
      <div class="arc-card-body">
        <p>Director request fix shot frame 30-40 → re-render chỉ 10 frame đó. Replace files trong sequence. Video file phải re-render toàn bộ.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lossless Quality</summary>
      <div class="arc-card-body">
        <p>PNG/EXR lossless, no compression artifact. Compositor work với pristine source. Video codec compress = degrade quality.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Alpha Channel</summary>
      <div class="arc-card-body">
        <p>PNG/TIFF/EXR support alpha. Composite layers without matte. Most video codec không support alpha hoặc support limited.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>HDR Color (EXR)</summary>
      <div class="arc-card-body">
        <p>EXR floating point cho HDR — wider color range than 8/10-bit. Necessary cho film VFX. Video codec rarely support full HDR float.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Format Image Sequence</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">PNG Sequence</h3>
    <ul class="arc-list">
      <li>Lossless, 8 or 16-bit per channel</li>
      <li>Alpha channel support</li>
      <li>Phổ biến cho motion graphics, animation</li>
      <li>File size moderate (vài MB/frame)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">EXR (OpenEXR) Sequence</h3>
    <ul class="arc-list">
      <li>Floating point HDR, 16-bit half hoặc 32-bit full</li>
      <li>Multiple channel: RGB + alpha + depth + ID + arbitrary AOV</li>
      <li>Chuẩn cho VFX film professional</li>
      <li>File size lớn (10-100MB/frame)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">TIFF Sequence</h3>
    <ul class="arc-list">
      <li>Legacy lossless format</li>
      <li>16-bit support</li>
      <li>Photography heavy still</li>
      <li>Less common modern VFX</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">JPEG Sequence</h3>
    <ul class="arc-list">
      <li>Lossy compression, small size</li>
      <li>Preview, animatic only</li>
      <li>Không dùng cho final delivery</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">DPX Sequence</h3>
    <ul class="arc-list">
      <li>Cinema standard, 10-bit log</li>
      <li>Film scan, telecine</li>
      <li>Legacy nhưng still used</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Best Practices</h2>
  <ul class="arc-list">
    <li><strong>Naming convention strict</strong> — shot_pass_v01.0001.exr (project_shot_version_frame.ext)</li>
    <li><strong>Frame padding consistent</strong> — 4 digit chuẩn (0001-9999), 6 digit cho project dài</li>
    <li><strong>Start frame</strong> — 1001 thay vì 0001 cho buffer (Tom Cruise sliding effect)</li>
    <li><strong>Folder structure</strong> — mỗi version trong folder riêng</li>
    <li><strong>Backup essential</strong> — render lâu, không mất</li>
    <li><strong>EXR cho film, PNG cho web</strong> — chọn format theo deliverable</li>
  </ul>
</section>
`,
  },

  // 04. Image Trace
  {
    id: "c618b688-942f-4997-a724-7d79b0fa2d4f",
    tieu_de: "Image Trace",
    tieu_de_viet: "Image Trace (Illustrator)",
    tom_tat:
      "Image Trace là chức năng tự động chuyển ảnh bitmap (raster) sang vector trong Adobe Illustrator — cho phép designer scale, edit, color shift logo và artwork mà không loss quality.",
    meta_title:
      "Image Trace là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Image Trace Illustrator chuyển raster sang vector. Tìm hiểu workflow, settings và khi nào nên dùng Image Trace vs vẽ tay.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn có một sketch logo trên giấy — scan vào computer là JPEG. Cần làm logo vector để in name card, dán xe, scale lên billboard. Vẽ lại từ đầu trong Illustrator? Tốn giờ. <strong>Image Trace</strong> trong Adobe Illustrator giúp bạn — auto convert raster image thành vector chỉ vài click.</p>
  <p>Image Trace là tool cơ bản cho graphic designer. Hiểu cách dùng Image Trace hiệu quả, settings phù hợp và khi nào nên tin auto-trace vs vẽ tay giúp workflow nhanh và quality cao — đặc biệt cho logo, illustration vectorization.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Image Trace là gì?</h2>
  <p>Image Trace là chức năng trong Adobe Illustrator (trước đây gọi &quot;Live Trace&quot;) tự động chuyển đổi hình ảnh bitmap (raster — JPG, PNG, BMP) thành vector (path, anchor point). Result là vector artwork có thể scale vô hạn không lose quality, edit color, modify path — flexibility vector cho source ảnh bitmap.</p>
  <p>Algorithm: Illustrator analyze pixel color, edge, contrast → generate path closely matching original. Có nhiều preset (High Fidelity Photo, Low Fidelity Photo, 3 Colors, Black and White Logo, Sketched Art, Line Art) cho different use case. Result quality phụ thuộc rất nhiều vào source image quality và settings.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Image Trace vs Hand-traced</span>
    <p><strong>Image Trace (auto)</strong>: fast (seconds), good cho simple shape, logo. Path đôi khi messy (nhiều unnecessary anchor). Result phụ thuộc source quality. <strong>Hand-traced (Pen Tool)</strong>: tedious (hours), clean path, full control. Pro for complex illustration. Workflow tốt: Image Trace cho rough, clean up bằng Pen Tool.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Preset</strong> — pre-configured settings cho common use case</li>
    <li><strong>Threshold</strong> — control black/white split</li>
    <li><strong>Paths</strong> — number of paths created</li>
    <li><strong>Corners</strong> — sharpness của corner</li>
    <li><strong>Noise</strong> — ignore small detail</li>
    <li><strong>Expand</strong> — convert trace result thành editable path</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"image trace illustrator vector logo bitmap conversion"</span>
    </div>
    <p class="arc-image-caption">Image Trace — convert raster image thành editable vector path</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Workflow Image Trace</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Prep Source Image</summary>
      <div class="arc-card-body">
        <p>High resolution scan/photo. Clean background — black logo trên white background ideal. Increase contrast nếu source flat. Photoshop cleanup trước import: levels, threshold, denoise.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Place Image trong Illustrator</summary>
      <div class="arc-card-body">
        <p>File → Place → select image. Position, resize trên canvas. Image vẫn là raster — chưa vector.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Open Image Trace</summary>
      <div class="arc-card-body">
        <p>Window → Image Trace. Select image, click &quot;Image Trace&quot; button hoặc choose preset. Preview shows tracing result.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Choose Preset / Adjust Settings</summary>
      <div class="arc-card-body">
        <p>Black and White Logo cho logo đơn giản. 3-6 Colors cho artwork với few colors. High Fidelity Photo cho photo realistic. Adjust Threshold, Paths, Corners để tune.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Expand</summary>
      <div class="arc-card-body">
        <p>Object → Expand. Convert trace result thành editable path. Có thể click vào individual path, edit anchor point.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Clean Up</summary>
      <div class="arc-card-body">
        <p>Object → Path → Simplify (reduce anchor count). Manual fix path nếu cần. Adjust color. Group related path. Final clean vector ready.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Use Cases &amp; Tips</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Logo Vectorization</h3>
    <ul class="arc-list">
      <li>Client gửi logo dạng JPG → cần vector</li>
      <li>Preset: Black and White Logo</li>
      <li>Threshold tune đến edge clean</li>
      <li>Manual touch-up curves</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Sketch / Hand Drawing</h3>
    <ul class="arc-list">
      <li>Scan pencil sketch → vector outline</li>
      <li>Preset: Sketched Art hoặc Line Art</li>
      <li>Erase background, keep line work</li>
      <li>Add color khi vector</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photo to Illustration</h3>
    <ul class="arc-list">
      <li>Pop art style portrait</li>
      <li>Preset: 6 Colors, 16 Colors</li>
      <li>Posterize effect mạnh, stylized</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Typography Vectorization</h3>
    <ul class="arc-list">
      <li>Hand-lettered text scan</li>
      <li>Black and White Logo preset</li>
      <li>High threshold cho letter shape clean</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Lỗi thường gặp</h3>
    <ul class="arc-list">
      <li><strong>Source quality kém</strong> → result messy. Tăng resolution scan, denoise trong Photoshop trước</li>
      <li><strong>Quá nhiều anchor point</strong> → file lớn, edit khó. Simplify path sau expand</li>
      <li><strong>Color quá nhiều</strong> → preset 3-6 colors thay vì photo preset</li>
      <li><strong>Curves jagged</strong> → tăng Corners, giảm Noise threshold</li>
    </ul>
  </div>
</section>
`,
  },

  // 05. Infographics
  {
    id: "212cb941-a665-4b45-8657-3bffdb644ca4",
    tieu_de: "Infographics",
    tieu_de_viet: "Đồ họa thông tin (Infographics)",
    tom_tat:
      "Infographics là trực quan hóa dữ liệu và thông tin phức tạp thành hình ảnh dễ hiểu — kết hợp thiết kế đồ họa, illustration, data visualization để truyền đạt thông tin hiệu quả.",
    meta_title:
      "Infographics là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Infographics trực quan hóa data. Tìm hiểu nguyên tắc thiết kế, các loại infographic và workflow tạo infographic chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn cần truyền đạt &quot;COVID lây lan trên thế giới&quot; — viết article 2,000 từ ai cũng skip. Tạo infographic với map, chart, icon — 30 giây đã hiểu. Trong age of attention scarcity, infographic là format quan trọng nhất để communicate complex data — viral trên social media, hiệu quả trong report, sticky trong memory.</p>
  <p>Infographics là kỹ năng có demand cao cho graphic designer, content marketer, data analyst. Hiểu nguyên tắc design infographic — clarity, hierarchy, storytelling — giúp tạo content viral và effective cho client từ corporate report đến social campaign.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Infographics là gì?</h2>
  <p>Infographics (information graphics) là <strong>biểu diễn trực quan của thông tin, data, kiến thức</strong> — kết hợp text, illustration, chart, icon để truyền đạt nội dung phức tạp một cách clear, engaging. Mục đích: turn data abstract thành visual concrete brain dễ process. &quot;A picture is worth 1,000 words&quot; — infographic theo nguyên tắc này.</p>
  <p>Lịch sử có từ Florence Nightingale&apos;s &quot;rose chart&quot; (1858) showing cause of death. Modern era explode với social media — infographic được share rộng vì compact, scannable, shareable. Modern brand sử dụng infographic cho marketing, annual report, educational content.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Infographic vs Data Visualization</span>
    <p><strong>Data Visualization</strong>: focus vào data — chart, graph accurate. Use case: dashboard, analytics. <strong>Infographic</strong>: data + narrative + design. Tell story, có hook, có conclusion. Marketing piece thường. Overlap large — infographic include data viz, plus narrative design.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Statistical Infographic</strong> — focus vào số liệu, chart</li>
    <li><strong>Informational Infographic</strong> — explain process, concept</li>
    <li><strong>Timeline Infographic</strong> — chronological events</li>
    <li><strong>Process Infographic</strong> — step-by-step workflow</li>
    <li><strong>Comparison Infographic</strong> — A vs B</li>
    <li><strong>Geographic Infographic</strong> — map-based data</li>
    <li><strong>Hierarchical Infographic</strong> — pyramid, tree structure</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"infographic design data visualization statistics illustration"</span>
    </div>
    <p class="arc-image-caption">Infographic — visual storytelling kết hợp data, illustration, design</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Nguyên tắc Design Infographic</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Clarity First</summary>
      <div class="arc-card-body">
        <p>Thông tin phải clear instantly. Reader hiểu trong 30s không cần đọc kỹ. Avoid clutter, decoration không thêm value.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Visual Hierarchy</summary>
      <div class="arc-card-body">
        <p>Quan trọng nhất → biggest, boldest. Subordinate info → smaller, secondary. Reader&apos;s eye flow follow hierarchy. Use size, color, position.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Storytelling</summary>
      <div class="arc-card-body">
        <p>Infographic có narrative — beginning (hook), middle (data), end (conclusion/CTA). Reader follow story not just collect facts.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Honest Data</summary>
      <div class="arc-card-body">
        <p>Chart accurate scale. Avoid misleading axis. Cite source. Trust = credibility.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Consistent Style</summary>
      <div class="arc-card-body">
        <p>Color palette (3-5 colors max), icon style consistent, font 2-3 max. Brand-aligned. Cohesive feel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mobile-friendly</summary>
      <div class="arc-card-body">
        <p>Modern: most reader xem mobile. Vertical layout, big text, readable nhỏ screen. Test trên phone trước publish.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Tạo Infographic</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Define Goal &amp; Audience</h3>
    <ul class="arc-list">
      <li>What message? Who reads? Where published?</li>
      <li>1 main takeaway per infographic — focused</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Gather &amp; Validate Data</h3>
    <ul class="arc-list">
      <li>Source reliable (Statista, government data, academic)</li>
      <li>Cite source</li>
      <li>Cross-check critical numbers</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Outline &amp; Wireframe</h3>
    <ul class="arc-list">
      <li>Story flow — beginning to end</li>
      <li>Sketch rough layout</li>
      <li>Hierarchy plan</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Choose Chart Types</h3>
    <ul class="arc-list">
      <li>Bar chart cho comparison</li>
      <li>Pie chart cho proportion (max 5-6 slices)</li>
      <li>Line chart cho trend over time</li>
      <li>Map cho geographic data</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Design &amp; Iterate</h3>
    <ul class="arc-list">
      <li>Tool: Illustrator, Figma, Canva (template)</li>
      <li>Iterate với feedback</li>
      <li>Test trên different screen size</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Export &amp; Distribute</h3>
    <ul class="arc-list">
      <li>PNG cho social media</li>
      <li>PDF cho print, report</li>
      <li>SVG cho web (scalable)</li>
      <li>Interactive infographic — Tableau, Datawrapper</li>
    </ul>
  </div>
</section>
`,
  },

  // 06. Intro
  {
    id: "7ee1013e-e8f0-4766-938b-6222c1ff238f",
    tieu_de: "Intro (Video)",
    tieu_de_viet: "Đoạn mở đầu video (Intro)",
    tom_tat:
      "Intro là đoạn mở đầu video ngắn (3-10 giây) giới thiệu kênh, brand, series — thường có logo animation và nhạc hiệu, tạo nhận diện nhất quán cho content.",
    meta_title: "Intro là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Intro video tạo brand identity. Tìm hiểu yếu tố intro tốt, examples và workflow tạo intro trong After Effects.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn click vào YouTube video — 5 giây đầu tiên có animation logo creator, music hiệu rồi vào content chính. Hoặc TV show Netflix — title sequence 30 giây iconic. Đây là <strong>Intro</strong> — branding signature cho content. Intro tốt làm viewer recognize ngay channel/show, intro tệ làm viewer skip.</p>
  <p>Intro design là chuyên môn quan trọng cho motion designer, video editor. Hiểu yếu tố intro tốt — concise, branded, memorable — giúp tạo intro impactful cho YouTuber, brand, podcast video. Skill có demand cao, project quick turnaround.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Intro Video là gì?</h2>
  <p>Intro là <strong>đoạn mở đầu ngắn</strong> (typically 3-10 giây) của video giới thiệu thương hiệu, kênh, hoặc series. Mục đích: (1) <strong>Brand recognition</strong> — viewer biết đây là content của ai; (2) <strong>Consistency</strong> — mọi video có intro giống tạo unified brand; (3) <strong>Mood setting</strong> — establish tone của content sắp đến; (4) <strong>Polish</strong> — pro feel signal quality content.</p>
  <p>Modern intro shorter than older — TV show 30s title sequence ngày càng hiếm (Netflix skip intro button cho thấy nhu cầu thay đổi). YouTube intro recommended 3-5s vì attention span giảm. Brand commercial intro 5-10s tạo identity nhưng không lãng phí viewer time.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Intro tốt — quy tắc 5 giây</span>
    <p>Modern guideline: intro không nên dài quá 5 giây cho YouTube. Reason: viewer impatience, retention metric. Long intro = drop-off. Exception: established brand (Marvel, Pixar) có intro iconic mọi người love → 10-15s acceptable. Indie creator nên focused 3-5s.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Logo Animation</strong> — animated brand mark</li>
    <li><strong>Sound Logo</strong> — audio signature (Netflix &quot;tu-dum&quot;)</li>
    <li><strong>Tagline</strong> — short brand message</li>
    <li><strong>Color Branding</strong> — brand colors</li>
    <li><strong>Music Sting</strong> — short music phrase</li>
    <li><strong>Transition</strong> — flow vào content chính</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"video intro logo animation youtube channel branding"</span>
    </div>
    <p class="arc-image-caption">Intro — logo animation, music sting, 3-10s tạo brand identity</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Intro</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Logo Reveal</summary>
      <div class="arc-card-body">
        <p>Phổ biến nhất. Logo animate in — bounce, particle, reveal effect. 2-5s. Suitable cho brand corporate, YouTuber.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Title Sequence (TV/Film)</summary>
      <div class="arc-card-body">
        <p>Longer 30-90s. Cinematic, storytelling. Game of Thrones map, Mad Men silhouette, True Detective double exposure. Production cost cao.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Podcast Video Intro</summary>
      <div class="arc-card-body">
        <p>Music + host name + episode topic. 5-10s. Consistent format mỗi episode.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Vlogger Intro</summary>
      <div class="arc-card-body">
        <p>Personality-driven — quick montage, name reveal, signature catch phrase. 3-5s. Casual feel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Game Streamer Intro</summary>
      <div class="arc-card-body">
        <p>Gaming aesthetic — neon, glitch, energetic music. Twitch streamer brand identity.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Corporate Intro</summary>
      <div class="arc-card-body">
        <p>Professional, restrained. Logo + tagline + subtle music. Avoid flashy, focus reliability vibe.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Yếu tố Intro tốt</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Short &amp; Punchy</h3>
    <ul class="arc-list">
      <li>3-5s YouTube, 5-10s commercial</li>
      <li>Get to the point fast</li>
      <li>Skip-button-resistant</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">On-Brand</h3>
    <ul class="arc-list">
      <li>Brand color palette</li>
      <li>Brand typography</li>
      <li>Consistent với other brand asset</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Memorable Sound Design</h3>
    <ul class="arc-list">
      <li>Iconic music sting (Netflix &quot;tu-dum&quot;, THX, MGM lion)</li>
      <li>Audio brain remember better than visual</li>
      <li>Original sound investment worth</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Smooth Transition</h3>
    <ul class="arc-list">
      <li>Flow vào content chính seamless</li>
      <li>Don&apos;t abrupt jump</li>
      <li>Music fade out, transition shot</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Set Mood</h3>
    <ul class="arc-list">
      <li>Comedy channel — playful intro</li>
      <li>News channel — serious, authoritative</li>
      <li>Music channel — rhythmic</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tạo Intro trong After Effects</h2>
  <ul class="arc-list">
    <li><strong>Template marketplace</strong> — VideoHive, Motion Array, AEJuice ($10-100/template)</li>
    <li><strong>Logo prep</strong> — vector AI/SVG cho clean scale</li>
    <li><strong>Animation principles</strong> — anticipation, follow-through cho intro feel professional</li>
    <li><strong>Music license</strong> — Epidemic Sound, AudioJungle hoặc royalty-free</li>
    <li><strong>Render</strong> — H.264 MP4, 1080p hoặc 4K tùy platform target</li>
    <li><strong>Iterate</strong> — versions A/B test với audience</li>
  </ul>
</section>
`,
  },

  // 07. Inverse Kinematics
  {
    id: "63856de0-d66e-4c5e-8489-7d294f6832e1",
    tieu_de: "Inverse Kinematics",
    tieu_de_viet: "Động học ngược (IK)",
    tom_tat:
      "Inverse Kinematics (IK) là phương pháp tính toán góc khớp ngược từ vị trí end-effector — animator di chuyển bàn tay/chân, hệ thống tự tính toán toàn bộ chuỗi xương để đạt position đó.",
    meta_title:
      "Inverse Kinematics là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Inverse Kinematics tính góc joint từ end position. Tìm hiểu IK solver, pole vector và ứng dụng trong rigging, robotics.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn muốn character chạm tay vào tường thay vì xoay từng joint shoulder → elbow → wrist từng frame. Hoặc chân plant ground khi character đi bộ không trượt. <strong>Inverse Kinematics (IK)</strong> solve điều đó — bạn move end-point, engine tự tính toán góc xoay cho cả chuỗi xương.</p>
  <p>Inverse Kinematics là kiến thức cốt lõi cho 3D animator, technical director, game programmer. Hiểu IK solver, pole vector setup và limitation giúp tạo character animation realistic — đặc biệt cho game realtime và film production hiện đại.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Inverse Kinematics là gì?</h2>
  <p>Inverse Kinematics (IK) là phương pháp toán học và rigging trong 3D — cho input <strong>vị trí end-effector</strong> (bàn tay, bàn chân) và <strong>orientation</strong> nó, hệ thống tự tính toán <strong>góc xoay của tất cả joint</strong> trong chuỗi (shoulder, elbow, wrist) để end-effector đạt đến position đó. Ngược với Forward Kinematics (input góc, output vị trí).</p>
  <p>Math behind: solve system equations với nhiều unknowns (joint angles), thường có multiple solutions. IK solver chọn solution &quot;natural&quot; — ưu tiên bend tự nhiên không quá overdraw. Pole Vector control hướng bend (elbow point ra sau, không trước).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">IK Solver Types</span>
    <p><strong>Rotate-Plane IK</strong>: chuẩn cho arm, leg 2-bone chain. Fast, predictable. <strong>Spline IK</strong>: chuỗi nhiều joint follow curve. Tốt cho tail, spine, snake. <strong>Single-Chain IK</strong>: simple 1-joint solve. <strong>CCD (Cyclic Coordinate Descent)</strong>: iterative, slow nhưng flexible cho long chain.</p>
  </div>

  <ul class="arc-list">
    <li><strong>End-Effector</strong> — điểm cuối (tay, chân) animator control</li>
    <li><strong>IK Handle</strong> — controller di chuyển end-effector</li>
    <li><strong>Pole Vector</strong> — define hướng bend (knee forward, elbow back)</li>
    <li><strong>Solver</strong> — algorithm tính góc</li>
    <li><strong>IK Goal</strong> — target position end-effector</li>
    <li><strong>Constraint</strong> — limit joint range (knee không bend backward)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"inverse kinematics IK rigging character maya pole vector"</span>
    </div>
    <p class="arc-image-caption">IK — input end-effector position, output joint angles tự động</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Ứng dụng IK</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Character Animation</summary>
      <div class="arc-card-body">
        <p>Foot plant trên ground không trượt. Hand reach object specific position. Character climb, hang. IK essential cho realistic locomotion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Game Procedural Animation</summary>
      <div class="arc-card-body">
        <p>Foot IK trong game engine — foot adapt theo terrain uneven. Real-time IK solver. Unity Final IK, Unreal Control Rig phổ biến.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Robotics</summary>
      <div class="arc-card-body">
        <p>Robot arm reach specific position. Industrial robot painting, welding. IK foundational cho robotics control.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>VR Avatar</summary>
      <div class="arc-card-body">
        <p>VR user&apos;s hand position tracked, IK solve arm pose. Avatar mirror user motion realistic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Motion Capture Cleanup</summary>
      <div class="arc-card-body">
        <p>Mocap data có jitter, foot slide. IK constraint clean up — anchor foot, smooth joint.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mechanical Animation</summary>
      <div class="arc-card-body">
        <p>Excavator arm, robot, mechanical contraption. Multiple joint chain follow IK target.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Setup IK trong Maya</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Create Joint Chain</h3>
    <ul class="arc-list">
      <li>Create &gt; Joints &gt; Joint Tool</li>
      <li>Place joint sequence — shoulder, elbow, wrist (arm example)</li>
      <li>Pose default — slightly bent elbow để IK biết hướng bend</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Create IK Handle</h3>
    <ul class="arc-list">
      <li>Skeleton &gt; Create IK Handle</li>
      <li>Click root joint (shoulder), click end joint (wrist)</li>
      <li>IK Handle created — handle attached to wrist</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Pole Vector</h3>
    <ul class="arc-list">
      <li>Create locator/controller behind elbow</li>
      <li>Select IK Handle, then locator</li>
      <li>Constrain &gt; Pole Vector</li>
      <li>Elbow now points toward locator</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Test &amp; Refine</h3>
    <ul class="arc-list">
      <li>Move IK Handle — arm bend naturally</li>
      <li>Pole Vector controls elbow direction</li>
      <li>Adjust joint limit (rotation constraint)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Wrap Up</h3>
    <ul class="arc-list">
      <li>Create NURBS curve controller cho IK Handle, parent</li>
      <li>Add attributes for animator (twist, stretch)</li>
      <li>Lock/hide unwanted attributes</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp</h2>
  <ul class="arc-list">
    <li><strong>Elbow flip</strong> — pole vector position uncontrolled, elbow snap back/forth. Place pole vector clearly behind elbow, far enough</li>
    <li><strong>Joint không bend đúng hướng</strong> — joint chain dạng straight line (180°), IK confused. Pre-bend joint slightly trước create IK</li>
    <li><strong>Stretchy không control</strong> — IK target xa hơn arm reach, joint stretch hoặc detach. Add stretch limit</li>
    <li><strong>Pop khi switch IK/FK</strong> — pose không match. Implement IK/FK match feature</li>
    <li><strong>Game performance</strong> — too many IK chains expensive. Limit IK character chính</li>
  </ul>
</section>
`,
  },

  // 08. Javascript
  {
    id: "618b636d-5b96-4291-b5f2-2a60da172d0a",
    tieu_de: "JavaScript",
    tieu_de_viet: "JavaScript (ngôn ngữ web)",
    tom_tat:
      "JavaScript là ngôn ngữ lập trình của web — nền tảng của web tương tác, animation web, và nhiều công cụ sáng tạo kỹ thuật số như Three.js (3D), p5.js (creative coding), GSAP (animation).",
    meta_title:
      "JavaScript là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "JavaScript là ngôn ngữ web phổ biến. Tìm hiểu Three.js, p5.js, GSAP và ứng dụng JavaScript trong sáng tạo, motion graphics, web 3D.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem website Stripe — animation card trượt mượt, parallax đẹp. Apple website — 3D iPhone xoay khi scroll. Game web Three.js. Tất cả đều dùng <strong>JavaScript</strong> — ngôn ngữ lập trình của web, kết nối creative và technical world. JS không chỉ cho web dev — modern creative artist cũng cần JS knowledge.</p>
  <p>JavaScript là kỹ năng nâng cao cho creative artist muốn vượt khỏi traditional tool. Hiểu JS basics và creative library (Three.js, p5.js, GSAP) mở ra opportunity mới: interactive web, creative coding, generative art, NFT, immersive experience.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>JavaScript là gì?</h2>
  <p>JavaScript (JS) là ngôn ngữ lập trình chạy <strong>directly trong browser</strong> — không cần install, mỗi browser modern (Chrome, Safari, Firefox) có JS engine built-in. Originally created 1995 cho add interactivity vào webpage. Ngày nay là ngôn ngữ phổ biến nhất world — chạy frontend (web) và backend (Node.js), mobile app (React Native), desktop (Electron), even game (Phaser).</p>
  <p>Cho creative artist, JS quan trọng vì là <strong>ngôn ngữ duy nhất chạy trong browser</strong> — nơi billion người consume content. Modern web creative experience (interactive ad, generative art, web 3D, music visualizer) đều requires JS. Adobe ExtendScript dialect của JS cho After Effects scripting.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">JavaScript vs Python cho Creative Coding</span>
    <p><strong>JavaScript</strong>: native web, browser deployment, real-time interaction. Library: Three.js, p5.js, GSAP. <strong>Python</strong>: ML/AI, data viz, scripting Adobe/Blender. Library: Processing, Pygame, numpy. Cả hai có overlap. Creative web → JS. Creative data/AI → Python. Adobe scripting → JS (ExtendScript).</p>
  </div>

  <ul class="arc-list">
    <li><strong>ES6+ (Modern JS)</strong> — modern syntax (let, const, arrow functions, async/await)</li>
    <li><strong>DOM (Document Object Model)</strong> — HTML element manipulation</li>
    <li><strong>Three.js</strong> — 3D library, WebGL wrapper</li>
    <li><strong>p5.js</strong> — creative coding, Processing in JS</li>
    <li><strong>GSAP</strong> — animation library, industry standard</li>
    <li><strong>Canvas API</strong> — 2D drawing native browser</li>
    <li><strong>WebGL</strong> — GPU graphics trong browser</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"javascript creative coding three.js p5.js generative art"</span>
    </div>
    <p class="arc-image-caption">JavaScript creative — Three.js 3D, p5.js, GSAP cho web interactive</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>JS Libraries cho Creative</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Three.js — 3D trên web</summary>
      <div class="arc-card-body">
        <p>Library 3D phổ biến nhất, WebGL wrapper. Tạo 3D scene, character, animation, VR/AR trong browser. Apple, Bruno Simon (bruno-simon.com) showcase. Learning curve moderate, community huge.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>p5.js — Creative Coding</summary>
      <div class="arc-card-body">
        <p>Made by Casey Reas, accessible cho artist không code background. Generative art, interactive sketch. Coding Train YouTube channel (Daniel Shiffman) teach excellently. Free, beginner-friendly.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>GSAP (GreenSock)</summary>
      <div class="arc-card-body">
        <p>Industry standard animation library. Smooth, performant, robust. Used by 11M+ websites. ScrollTrigger plugin cho scroll-based animation. Awwwards site creators heavily use.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lottie / Bodymovin</summary>
      <div class="arc-card-body">
        <p>Export After Effects animation thành JSON → render với Lottie trên web/mobile. Vector animation tiny file size. Airbnb developed, free.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>D3.js — Data Visualization</summary>
      <div class="arc-card-body">
        <p>Data visualization library. NYTimes, FT visualizations powered by D3. Steeper learning curve but unmatched flexibility cho data art.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tone.js — Web Audio</summary>
      <div class="arc-card-body">
        <p>Music/sound trong browser. Synth, sampler, sequencer. Music app, generative music project. Built on Web Audio API.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>React Three Fiber</summary>
      <div class="arc-card-body">
        <p>Three.js + React. Declarative 3D scene. Modern web dev workflow. Drei companion library cho common 3D component.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>JS cho từng Creative Career</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Designer</h3>
    <ul class="arc-list">
      <li>Lottie cho After Effects animation deploy web</li>
      <li>GSAP cho web animation custom</li>
      <li>ExtendScript automate AE workflow</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Web Designer</h3>
    <ul class="arc-list">
      <li>JS interactive element — hover, scroll, click animation</li>
      <li>GSAP, Three.js cho premium portfolio</li>
      <li>Awwwards-level site uses heavy JS</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Generative Artist</h3>
    <ul class="arc-list">
      <li>p5.js, processing.js cho generative art</li>
      <li>NFT art generation</li>
      <li>Art Blocks, Foundation platform</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3D Web Artist</h3>
    <ul class="arc-list">
      <li>Three.js portfolio (Bruno Simon, Lusion)</li>
      <li>WebXR cho AR/VR web</li>
      <li>Interactive 3D product showcase</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Developer (Indie)</h3>
    <ul class="arc-list">
      <li>Phaser cho 2D web game</li>
      <li>PlayCanvas, Babylon.js cho 3D web game</li>
      <li>itch.io publishing web game</li>
    </ul>
  </div>
</section>
`,
  },

  // 09. Joint
  {
    id: "4069b57d-9ef7-4431-8bea-14975cc1e5af",
    tieu_de: "Joint (3D Rigging)",
    tieu_de_viet: "Joint (khớp xương 3D)",
    tom_tat:
      "Joint là điểm nối hoặc khớp trong hệ thống xương 3D — mô phỏng khớp xương sinh học, là building block của character rigging. Mỗi joint có pivot, orientation, parent-child hierarchy.",
    meta_title: "Joint 3D là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Joint trong 3D rigging tạo skeleton character. Tìm hiểu joint orientation, hierarchy, skinning và workflow rigging chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn modeling character 3D đẹp, nhưng làm sao nó di chuyển? Cần một &quot;skeleton&quot; dưới skin — gồm các <strong>joint</strong> nối nhau như xương người thật. Mỗi joint là một pivot point character có thể rotate. Joint shoulder → upper arm rotate; joint elbow → forearm rotate; joint wrist → hand rotate. Đây là foundation của character rigging.</p>
  <p>Joint là kiến thức cơ bản cho mọi 3D character artist, technical director. Hiểu joint placement, orientation, hierarchy là kỹ năng nền tảng — quyết định direct chất lượng rig và animation quality. Sai joint = sai rig = sai animation.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Joint là gì?</h2>
  <p>Joint là điểm pivot trong skeleton 3D — vị trí mà children object xoay quanh. Trong character rigging, joint mô phỏng khớp xương sinh học: shoulder, elbow, wrist, hip, knee, ankle, spine. Joint connect với nhau tạo <strong>hierarchy</strong> — root (pelvis) → spine joints → shoulder → upper arm → forearm → hand → finger joints. Khi parent joint xoay, children joint follow.</p>
  <p>Mỗi joint có: <strong>position</strong> (đặt ở đâu), <strong>orientation</strong> (rotation axis local), <strong>name</strong> (rõ ràng quan trọng cho team), <strong>parent</strong> (joint cha). Animation = changing joint rotation values qua time. Skinning = bind mesh vertices đến joints với weights.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Joint vs Bone — phân biệt</span>
    <p><strong>Joint</strong> (Maya term): điểm pivot. Một joint = một pivot point. <strong>Bone</strong> (Blender, 3ds Max term): rod connecting hai joint. Visualization difference, technically same. Maya hiển thị joint as small spheres connected by lines. Blender hiển thị bone as elongated octahedron.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Root Joint</strong> — top of hierarchy, master pivot</li>
    <li><strong>Joint Hierarchy</strong> — parent-child relationship</li>
    <li><strong>Joint Orientation</strong> — local rotation axes</li>
    <li><strong>Joint Chain</strong> — sequential joints (arm = shoulder+elbow+wrist)</li>
    <li><strong>End Joint</strong> — last joint, no children</li>
    <li><strong>Skinning</strong> — bind mesh vertices to joints</li>
    <li><strong>Weight Painting</strong> — control vertex influence per joint</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"joint 3D rigging character skeleton maya hierarchy"</span>
    </div>
    <p class="arc-image-caption">Joint — pivot point trong skeleton 3D, nền tảng character rigging</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Joint trong Workflow Rigging</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Joint Placement</summary>
      <div class="arc-card-body">
        <p>Place joint at anatomically correct position — center của joint, không offset. Reference: skeleton image. Critical: knee, elbow joint phải align với mesh deformation point.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Joint Naming</summary>
      <div class="arc-card-body">
        <p>Naming convention strict — vd: pelvis, spine_01, spine_02, shoulder_L, arm_upper_L, arm_lower_L, hand_L. Suffix _L/_R cho left/right. Critical cho mirror, team collaboration.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Joint Orientation</summary>
      <div class="arc-card-body">
        <p>Orient joint axes consistent — primary axis pointing down chain (toward child), secondary aim up/back. Inconsistent orientation = animation rotation chaos. Maya Skeleton &gt; Orient Joint Tool.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Hierarchy Setup</summary>
      <div class="arc-card-body">
        <p>Build parent-child correctly. Root (pelvis) → spine → neck → head. Arm chain branch từ shoulder. Leg chain branch từ pelvis. Modify wrong hierarchy = re-rig.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Skinning (Bind)</summary>
      <div class="arc-card-body">
        <p>Bind mesh to skeleton. Initial weight auto từ heat map / proximity. Result rough — cần weight paint refine.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Weight Painting</summary>
      <div class="arc-card-body">
        <p>Manual paint weight per joint — vertices near elbow nên 100% elbow joint when bent. Smooth weight transition để no harsh deformation. Critical cho quality rig.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>7. Controller Setup</summary>
      <div class="arc-card-body">
        <p>Add NURBS curve controller for animator (don&apos;t select joint directly). Constraint controller to joint. Animator-friendly UI.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Joint Standard cho Character</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Biped (Human-like)</h3>
    <ul class="arc-list">
      <li>Pelvis (root)</li>
      <li>Spine 3-5 joint</li>
      <li>Neck + head</li>
      <li>Each arm: clavicle, shoulder, elbow, wrist</li>
      <li>Each hand: 5 fingers × 3-4 joints</li>
      <li>Each leg: hip, knee, ankle, ball, toe</li>
      <li>Total: ~50-80 joints typical character</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Quadruped (Animal)</h3>
    <ul class="arc-list">
      <li>Pelvis + chest hai region</li>
      <li>Spine longer, tail</li>
      <li>4 legs, mỗi leg đặc thù theo animal</li>
      <li>Ears, jaw additional</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Facial</h3>
    <ul class="arc-list">
      <li>Jaw, eye joints standard</li>
      <li>Optional: cheek, brow, lip joints</li>
      <li>Modern often blendshape thay joint cho face</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Mecha / Robot</h3>
    <ul class="arc-list">
      <li>Mechanical pivot — clean rotation axis</li>
      <li>Less smooth deformation needed</li>
      <li>Hierarchy follow mechanical logic</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp</h2>
  <ul class="arc-list">
    <li><strong>Joint orientation inconsistent</strong> — primary axis từng joint khác hướng → animator confused. Always orient consistent</li>
    <li><strong>Joint pivot off-center</strong> — không ở giữa joint mesh → rotation lệch. Place precisely</li>
    <li><strong>Quá nhiều joint</strong> — face với 100+ joint khó animate. Optimal vs over-engineered</li>
    <li><strong>Quá ít joint</strong> — deformation cứng. Add intermediate joint cho smooth bend</li>
    <li><strong>Skin weight overflow</strong> — vertex influenced by &gt;4 joints (game limit) → engine error. Limit max influence</li>
  </ul>
</section>
`,
  },

  // 10. Keyframe
  {
    id: "59f3134b-f8c9-4124-adb8-b31d356d1a7c",
    tieu_de: "Keyframe",
    tieu_de_viet: "Khung hình chính (Keyframe)",
    tom_tat:
      "Keyframe (khung hình chính) là một khung hình quan trọng xác định trạng thái cụ thể của đối tượng tại thời điểm đó — animator đặt keyframe ở các pose chính, computer tự interpolate frame giữa.",
    meta_title: "Keyframe là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Keyframe định nghĩa pose chính trong animation. Tìm hiểu các loại keyframe, interpolation và workflow keyframing chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Disney animator vẽ ball bouncing — không vẽ từng frame mà chỉ vẽ &quot;ball trên không&quot;, &quot;ball chạm đất&quot;, &quot;ball nảy lên&quot;. Đây là <strong>keyframe</strong> — pose chính animator define. Frame giữa được junior animator (inbetweener) hoặc computer tự sinh ra. Concept này từ traditional 2D animation, ngày nay là foundation của mọi animation pipeline modern.</p>
  <p>Keyframe là kiến thức cơ bản cho mọi animator — 3D, 2D, motion graphics, game. Hiểu nguyên lý keyframe, các loại tangent và principle keyframing là kỹ năng nền tảng — distinguish junior và senior animator.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Keyframe là gì?</h2>
  <p>Keyframe là <strong>frame chỉ định trạng thái cụ thể</strong> (pose, position, rotation, color, etc.) của object tại một time point cụ thể. Animator set keyframe ở các thời điểm chính (pose quan trọng), software interpolate values giữa keyframes để tạo animation continuous. Mỗi property có thể có keyframe riêng — character có thể keyframe position, rotation, scale, opacity separately.</p>
  <p>Concept bắt nguồn từ traditional 2D animation — &quot;key&quot; animator vẽ pose chính, &quot;in-between&quot; animator vẽ frames nối tiếp. Digital animation kế thừa concept nhưng computer làm in-betweening tự động via interpolation. Modern term &quot;keyframe&quot; ám chỉ &quot;keyed value at specific time&quot; trong software.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Keyframe vs Inbetween</span>
    <p><strong>Keyframe</strong>: pose chính animator define — start, key moments, end. <strong>Inbetween (or tween)</strong>: frames nối giữa keyframes. Traditional: junior animator vẽ. Digital: computer interpolate tự động. Animator focus keyframes; inbetweens auto handle.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Property</strong> — value being animated (position X, rotation, opacity)</li>
    <li><strong>Time Position</strong> — frame number của keyframe</li>
    <li><strong>Value</strong> — giá trị của property tại keyframe</li>
    <li><strong>Tangent / Interpolation</strong> — curve giữa keyframes</li>
    <li><strong>Linear</strong> — straight line interpolation</li>
    <li><strong>Bezier / Auto</strong> — smooth curve</li>
    <li><strong>Stepped</strong> — no interpolation, snap</li>
    <li><strong>Hold</strong> — value held until next keyframe</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"keyframe animation 3D maya after effects timeline pose"</span>
    </div>
    <p class="arc-image-caption">Keyframe — pose chính, computer interpolate frames giữa tự động</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Keyframe</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Pose Keys (Extreme)</summary>
      <div class="arc-card-body">
        <p>Extreme pose — start, end, mid-action. Bouncing ball: top of bounce, bottom hit ground. Most important keys, animator focus here first.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Breakdown Keys</summary>
      <div class="arc-card-body">
        <p>Intermediate pose giữa extremes. Define curve, anticipation, overshoot. Add cho richness motion. Senior animator giỏi với breakdowns.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hold Keys</summary>
      <div class="arc-card-body">
        <p>Pose held cho duration — character pause, idle. Multiple keys same value. Important for moment of stillness.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Anticipation Key</summary>
      <div class="arc-card-body">
        <p>Pose chuẩn bị action — character lean back trước nhảy. Slight pose opposite to main action. Powerful cho impact.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Follow-through Key</summary>
      <div class="arc-card-body">
        <p>After main action — overshoot, settle. Cape continue moving after character stop. Adds weight, realism.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Tangent Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Linear</summary>
      <div class="arc-card-body">
        <p>Constant velocity giữa keys. Mechanical motion. Use for steady machine movement, no easing needed.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bezier / Auto</summary>
      <div class="arc-card-body">
        <p>Smooth S-curve. Natural easing. Default cho most organic motion. Computer chọn tangent best fit.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Stepped</summary>
      <div class="arc-card-body">
        <p>No interpolation, snap to next value. Use cho blocking animation — see pose changes only, no in-between confusion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Spline / Clamped</summary>
      <div class="arc-card-body">
        <p>Maya specific. Spline = smooth curve. Clamped = smooth but doesn&apos;t overshoot. Avoid value overshoot in animation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ease In / Ease Out / Ease In-Out</summary>
      <div class="arc-card-body">
        <p>Slow start (in), slow end (out), or both (in-out). Most natural. Standard cho character action, camera move.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Keyframe Workflow Animation</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Block (Pose to Pose)</h3>
    <ul class="arc-list">
      <li>Set keyframes ở extreme pose chính</li>
      <li>Stepped tangent cho clear pose visualization</li>
      <li>Check timing, adjust pose</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Breakdown</h3>
    <ul class="arc-list">
      <li>Add breakdown key giữa extremes</li>
      <li>Define curve, anticipation, overshoot</li>
      <li>Still stepped tangent</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Spline / Refine</h3>
    <ul class="arc-list">
      <li>Switch sang Bezier tangent</li>
      <li>Now interpolation smooth — see real motion</li>
      <li>Fix problems exposed by spline</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Polish</h3>
    <ul class="arc-list">
      <li>Fine-tune curves trong Graph Editor</li>
      <li>Adjust timing, ease</li>
      <li>Add subtle keys cho personality</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Tips</h3>
    <ul class="arc-list">
      <li><strong>Less keys = smoother</strong> — chỉ add key cần thiết</li>
      <li><strong>Avoid uniform spacing</strong> — vary timing cho life</li>
      <li><strong>Hold pose</strong> — character không move all the time, anchor pose</li>
      <li><strong>Reference video</strong> — film yourself acting cho timing</li>
    </ul>
  </div>
</section>
`,
  },
];

console.log(
  `\n── Đợt 2 · Batch 1 — chạy ${items.length} bài keyword (I → P) ──\n`,
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
