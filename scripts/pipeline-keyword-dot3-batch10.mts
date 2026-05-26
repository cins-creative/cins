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
  // 01. World Building
  {
    id: "32d0db3a-1902-4df2-b3a4-014369dec96e",
    tieu_de: "World Building",
    tieu_de_viet: "World Building (Xây dựng thế giới)",
    tom_tat:
      "World Building là quá trình tạo ra một thế giới hư cấu hoàn chỉnh và chi tiết — bao gồm lịch sử, địa lý, văn hóa và quy tắc vận hành — foundation cho film, game, novel epic.",
    meta_title:
      "World Building là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "World Building cho film, game, novel. Tìm hiểu workflow của Tolkien, GRR Martin, sci-fi creator và career worldbuilder.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn đọc Lord of the Rings — Middle-earth feel real, languages, history, geography đầy đủ. Game of Thrones — Westeros chi tiết hơn nhiều historical novel. Star Wars — galaxy với planet thousand species. Đó là <strong>World Building</strong> — craft of creating fictional world. Foundation cho epic narrative. Master worldbuilder = legendary creator như Tolkien, GRR Martin, George Lucas.</p>
  <p>World Building là kỹ năng essential cho novelist, screenwriter, game designer, concept artist. Hiểu geography, history, culture, magic/tech system, language design giúp craft compelling fictional universe. Foundation cho career writer creative industry.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>World Building là gì?</h2>
  <p>World Building là <strong>process of constructing detailed fictional world</strong> as setting cho story (novel, film, game, TTRPG). Includes: <strong>Geography / Map</strong>, <strong>History / Timeline</strong>, <strong>Culture / Society</strong>, <strong>Religion / Belief</strong>, <strong>Language</strong>, <strong>Magic / Technology System</strong>, <strong>Political Structure</strong>, <strong>Economy</strong>, <strong>Flora / Fauna</strong>. Depth varies: light worldbuilding sufficient story-focused, deep cho epic fantasy/sci-fi.</p>
  <p>Approach: <strong>Top-Down</strong> (broad concept first, fill detail) vs <strong>Bottom-Up</strong> (start small, expand outward). Tolkien language-first. GRR Martin character-first. Brandon Sanderson magic-system-first. Each work different. Common pitfall: <strong>over-worldbuild without story</strong> — endless detail no narrative purpose. Balance: build what story need + immersive depth.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Worldbuilders Legendary</span>
    <p><strong>JRR Tolkien</strong>: Middle-earth, Elvish language. Decade-long craft. <strong>GRR Martin</strong>: Westeros political. <strong>Frank Herbert</strong>: Dune universe. <strong>Brandon Sanderson</strong>: Cosmere, hard magic. <strong>George Lucas</strong>: Star Wars galaxy. Each distinct approach mastery.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Geography / Map</strong> — physical</li>
    <li><strong>History / Timeline</strong> — temporal</li>
    <li><strong>Culture / Society</strong> — people</li>
    <li><strong>Magic / Tech System</strong> — rule</li>
    <li><strong>Language (Conlang)</strong> — speech</li>
    <li><strong>Religion / Belief</strong> — meaning</li>
    <li><strong>Politics / Power</strong> — structure</li>
    <li><strong>Economy / Trade</strong> — exchange</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"world building fantasy map middle earth tolkien fictional"</span>
    </div>
    <p class="arc-image-caption">World Building — fictional universe craft, foundation epic narrative</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Components</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Geography &amp; Map</summary>
      <div class="arc-card-body">
        <p>Continent, mountain, river. Sketch map first. Influence culture (coastal seafaring vs mountain mining).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>History / Timeline</summary>
      <div class="arc-card-body">
        <p>Major event, war, founding. Past influence present. 500-1000 year typical fantasy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Culture / Society</summary>
      <div class="arc-card-body">
        <p>Custom, value, food, fashion. Multiple culture conflict, trade. Diversity make rich.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Magic / Tech System</summary>
      <div class="arc-card-body">
        <p>Rule of magic / tech. Hard magic explicit rule (Sanderson). Soft magic vague mystery (Tolkien).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Language (Conlang)</summary>
      <div class="arc-card-body">
        <p>Tolkien Elvish, Klingon, Dothraki. Tolkien linguistics expert. Add depth, immersion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Religion / Belief</summary>
      <div class="arc-card-body">
        <p>Pantheon, mythology. Meaning cho character. Conflict driver. Cultural identity.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Political Structure</summary>
      <div class="arc-card-body">
        <p>Monarchy, democracy, council. Power dynamic. Conflict source. GRR Martin specialty.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Economy / Trade</summary>
      <div class="arc-card-body">
        <p>Currency, trade route, resource. Economic conflict source. Realism foundation.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Concept Pitch</h3>
    <ul class="arc-list">
      <li>What if scenario</li>
      <li>Unique premise</li>
      <li>Differentiate market</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Sketch Map</h3>
    <ul class="arc-list">
      <li>Geography first</li>
      <li>Tectonic logic</li>
      <li>Climate zone</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. History Timeline</h3>
    <ul class="arc-list">
      <li>Major event</li>
      <li>Era structure</li>
      <li>Pre-story past</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Culture Develop</h3>
    <ul class="arc-list">
      <li>Multiple distinct culture</li>
      <li>Conflict + cooperation</li>
      <li>Custom unique</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Magic / Tech Rule</h3>
    <ul class="arc-list">
      <li>Define limit clearly</li>
      <li>Cost / consequence</li>
      <li>Avoid deus ex machina</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Character / People</h3>
    <ul class="arc-list">
      <li>Notable historical figure</li>
      <li>Story protagonist place</li>
      <li>World shape character</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Bible / Wiki Document</h3>
    <ul class="arc-list">
      <li>Worldbuilding bible</li>
      <li>Reference document</li>
      <li>Team consistency</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Show, Don&apos;t Dump</h3>
    <ul class="arc-list">
      <li>Reveal world through story</li>
      <li>Avoid info dump</li>
      <li>Hint mystery</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; Resource</h2>
  <ul class="arc-list">
    <li><strong>Novelist</strong> — Tolkien, Sanderson, Martin</li>
    <li><strong>Screenwriter</strong> — Star Wars, Lord Rings</li>
    <li><strong>Game Designer</strong> — Skyrim, Witcher, Elden Ring</li>
    <li><strong>TTRPG Designer</strong> — D&amp;D, Pathfinder</li>
    <li><strong>Concept Artist</strong> — visualize world</li>
    <li><strong>Tool</strong>: World Anvil, Inkarnate map</li>
    <li><strong>Sanderson lecture YouTube</strong> — free masterclass</li>
    <li><strong>Career Worldbuilder</strong> — niche specialty $80K-200K</li>
    <li><strong>Story Lead game</strong> $100K-300K</li>
    <li><strong>Foundation</strong>: read widely, study masters</li>
  </ul>
</section>
`,
  },

  // 02. Z-depth
  {
    id: "95330acc-1283-4080-9b2a-84b9f26effb3",
    tieu_de: "Z-Depth (Depth Pass)",
    tieu_de_viet: "Z-Depth (Bản đồ độ sâu)",
    tom_tat:
      "Z-Depth là kênh render chứa thông tin khoảng cách từ camera đến từng pixel trong cảnh — dùng trong compositing để thêm depth of field, fog, hoặc tách vật thể theo chiều sâu.",
    meta_title: "Z-Depth là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Z-Depth pass trong compositing. Tìm hiểu cách tạo, normalize và sử dụng trong Nuke, After Effects cho DoF, fog.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn render 3D scene — clean image. Trong post production, muốn add depth of field, atmospheric fog selective. Solution: <strong>Z-Depth pass</strong> — separate render channel storing distance from camera per pixel. Use trong compositing to control depth-based effect post-render. Foundation skill cho compositor, VFX artist. Save expensive re-render.</p>
  <p>Z-Depth là kỹ năng essential cho compositor, VFX artist. Hiểu generate, normalize, apply trong Nuke/After Effects giúp craft cinematic depth effect efficient. Foundation cho post-production workflow.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Z-Depth là gì?</h2>
  <p>Z-Depth là <strong>render pass / channel containing distance information</strong> — each pixel value represent distance từ camera đến surface visible at that pixel. Typically grayscale image: <strong>black = far from camera</strong>, <strong>white = close to camera</strong> (hoặc opposite). Range depend on scene scale. Foundation cho post-processing depth-dependent effect.</p>
  <p>Output: <strong>32-bit EXR</strong> (high precision float) standard. Format support sub-pixel depth value. JPG/PNG 8-bit lose precision. Use cases: <strong>Depth of Field</strong> (blur background, foreground sharp), <strong>Atmospheric Fog</strong> (distance fog), <strong>Object Separation</strong> (matte specific depth range), <strong>Position-Based Effect</strong> (snow on top surface only).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Z-Depth Formats</span>
    <p><strong>EXR 32-bit Float</strong>: pro standard. Full precision. <strong>PNG 16-bit</strong>: alternative. <strong>8-bit grayscale</strong>: lose precision, không recommend. <strong>Normalized 0-1</strong> remap for visualization. <strong>Linear distance</strong> raw — most useful compositing.</p>
  </div>

  <ul class="arc-list">
    <li><strong>32-bit EXR</strong> — pro format</li>
    <li><strong>Linear Distance</strong> — raw</li>
    <li><strong>Normalize</strong> — 0-1 range</li>
    <li><strong>DoF Application</strong> — focal blur</li>
    <li><strong>Fog Application</strong> — distance</li>
    <li><strong>Matte Extract</strong> — separate</li>
    <li><strong>Antialiased Edge</strong> — issue</li>
    <li><strong>Multi-Sample</strong> — accurate</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"z-depth pass render compositing depth of field nuke 3D"</span>
    </div>
    <p class="arc-image-caption">Z-Depth — distance pass, foundation post-production depth effect</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Use Cases</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Depth of Field (DoF)</summary>
      <div class="arc-card-body">
        <p>Apply blur based on Z-Depth distance. Background blur, foreground sharp. Cinematic look. Adjust focal distance post.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Atmospheric Fog</summary>
      <div class="arc-card-body">
        <p>Fade color toward atmosphere based on distance. Mountain hazier far. Cinematic depth feel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Object Separation</summary>
      <div class="arc-card-body">
        <p>Matte specific depth range. Isolate foreground/background. Color grade differently.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Volumetric Light Approximation</summary>
      <div class="arc-card-body">
        <p>Fake god rays using depth + light position. Cheaper than full volumetric.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Rim Light Enhancement</summary>
      <div class="arc-card-body">
        <p>Use depth gradient to add rim light effect. Edge detect via depth derivative.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Snow / Top Surface</summary>
      <div class="arc-card-body">
        <p>World position pass — snow on upward-facing surface. Procedural effect post.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Grade Depth</summary>
      <div class="arc-card-body">
        <p>Warm foreground, cool background. Common color grade tool. Depth-based.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2D Re-Projection</summary>
      <div class="arc-card-body">
        <p>Project 2D image onto depth — fake 3D camera move. Nuke camera-tracked technique.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Enable Z-Depth Output</h3>
    <ul class="arc-list">
      <li>Render setting → AOV / passes</li>
      <li>Enable Z / depth pass</li>
      <li>Output 32-bit EXR</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Render Multi-Pass EXR</h3>
    <ul class="arc-list">
      <li>Beauty + Z together</li>
      <li>Multi-layer EXR</li>
      <li>Single file convenient</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Import Compositing</h3>
    <ul class="arc-list">
      <li>Nuke industry standard</li>
      <li>After Effects EXtractoR plugin</li>
      <li>Access depth channel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Visualize / Normalize</h3>
    <ul class="arc-list">
      <li>Linear depth often look dark</li>
      <li>Remap 0-1 visualize</li>
      <li>Verify accurate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Apply DoF</h3>
    <ul class="arc-list">
      <li>Nuke ZDefocus node</li>
      <li>Set focal distance</li>
      <li>Aperture amount blur</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Apply Fog</h3>
    <ul class="arc-list">
      <li>Color tint based depth</li>
      <li>White haze far distance</li>
      <li>Blend mode</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Refine Antialiasing</h3>
    <ul class="arc-list">
      <li>Common issue depth edge</li>
      <li>Multi-sample render help</li>
      <li>Edge cleanup post</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Final Composite</h3>
    <ul class="arc-list">
      <li>Combine effect</li>
      <li>Beauty + DoF + fog</li>
      <li>Match plate hero</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Z-Depth</h2>
  <ul class="arc-list">
    <li><strong>32-bit EXR mandatory</strong> — precision</li>
    <li><strong>Multi-pass EXR convenient</strong> — single file</li>
    <li><strong>Edge antialias issue</strong> — known limitation</li>
    <li><strong>Multi-sample depth fix</strong> — anti-alias edge</li>
    <li><strong>Nuke ZDefocus best</strong> — pro DoF</li>
    <li><strong>AE EXtractoR plugin</strong> — access EXR</li>
    <li><strong>Combine ID matte</strong> — object separation precise</li>
    <li><strong>Volumetric fake</strong> — cheap effect</li>
    <li><strong>Color grade depth-driven</strong> — pro look</li>
    <li><strong>Career Compositor</strong> — Z-depth mastery essential</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 3 · Batch 10 (CUỐI) — chạy ${items.length} bài keyword (Q → Z) ──\n`,
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

if (Number(conLai) === 0) {
  console.log(`\n🎉 Đợt 3 HOÀN TẤT! Đã viết xong toàn bộ keyword từ Q → Z.`);
}
