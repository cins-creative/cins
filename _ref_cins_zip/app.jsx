/* CINs Homepage — main app component */
const { useState } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "heroVariant": "mascot",
  "accentColor": "yellow",
  "density": "comfortable",
  "showStudentSpotlight": true
}/*EDITMODE-END*/;

const MASCOTS = [
  { id: 'artist', name: 'Artist', role: 'Vẽ · Concept · Illustration', img: 'assets/mascot-artist.png', color: 'var(--cins-yellow)' },
  { id: 'tech', name: 'Technical Artist', role: 'Code · Tools · Pipeline', img: 'assets/mascot-technical-artist.png', color: 'var(--cins-violet)' },
  { id: 'manager', name: 'Manager', role: 'Producer · Lead · Strategy', img: 'assets/mascot-manager.png', color: 'var(--cins-orange)' },
  { id: 'supporter', name: 'Supporter', role: 'Coordinator · QA · Ops', img: 'assets/mascot-supporter.png', color: 'var(--cins-mint)' },
];

const FIELDS = [
  { name: 'Phim & Điện ảnh', count: '24 nghề', img: 'assets/career-illustration-1.png', tint: 'var(--cins-orange-soft)' },
  { name: 'Game', count: '32 nghề', img: 'assets/career-illustration-2.png', tint: 'var(--cins-yellow-soft)' },
  { name: 'Hoạt hình', count: '18 nghề', img: 'assets/career-illustration-3.png', tint: 'var(--cins-mint-soft)' },
  { name: 'Kiến trúc & Nội thất', count: '12 nghề', img: 'assets/career-illustration-4.png', tint: 'var(--cins-violet-soft)' },
  { name: 'Thời trang & Thiết kế', count: '34 nghề', img: 'assets/illustration-gamepad.png', tint: 'var(--cins-blue-soft)' },
];

const JOBS = [
  { name: 'UI/UX Designer', tag: 'Thiết kế', desc: 'Thiết kế giao diện và trải nghiệm cho app, web và sản phẩm digital.', skills: ['Figma', 'Research', 'Prototype'], img: 'assets/career-illustration-1.png', tint: 'var(--cins-violet-soft)' },
  { name: '3D Animator', tag: 'Hoạt hình', desc: 'Thổi hồn vào nhân vật trong phim, game và hoạt hình ngắn.', skills: ['Blender', 'Maya', 'Rigging'], img: 'assets/career-illustration-2.png', tint: 'var(--cins-mint-soft)' },
  { name: 'Concept Artist', tag: 'Game', desc: 'Định hình thế giới, nhân vật và phong cách cho game và phim.', skills: ['Procreate', 'PS', 'Narrative'], img: 'assets/career-illustration-3.png', tint: 'var(--cins-orange-soft)' },
  { name: 'Game Designer', tag: 'Game', desc: 'Xây dựng cơ chế, gameplay và trải nghiệm chơi cho game.', skills: ['Unity', 'Balance', 'Level'], img: 'assets/career-illustration-4.png', tint: 'var(--cins-yellow-soft)' },
];

const QUIZ_MAP = {
  'Vẽ & thiết kế': ['UI/UX Designer', 'Graphic Designer', 'Illustrator', 'Concept Artist'],
  'Xem phim': ['Director', 'Editor', 'Cinematographer', 'Storyboard Artist'],
  'Chơi game': ['Game Designer', 'Concept Artist', '3D Animator', 'Level Designer'],
  'Chụp ảnh': ['Photographer', 'Art Director', 'Visual Designer'],
  'Lập trình': ['Technical Artist', 'Creative Tech', 'WebGL Dev'],
  'Âm nhạc': ['Sound Designer', 'Composer', 'Audio Engineer'],
};

const UNIS = [
  { code: 'KTS', name: 'ĐH Kiến trúc TP.HCM', type: 'cong-lap', city: 'hcm', cover: 'linear-gradient(135deg,#1B4F72,#2874A6)' },
  { code: 'MTS', name: 'ĐH Mỹ thuật TP.HCM', type: 'cong-lap', city: 'hcm', cover: 'linear-gradient(135deg,#8B1A1A,#C0392B)' },
  { code: 'VLU', name: 'ĐH Văn Lang', type: 'dan-lap', city: 'hcm', cover: 'linear-gradient(135deg,#6B2C8E,#9B59B6)' },
  { code: 'HSU', name: 'ĐH Hoa Sen', type: 'dan-lap', city: 'hcm', cover: 'linear-gradient(135deg,#C75300,#E67E22)' },
  { code: 'DKC', name: 'ĐH Công nghệ TP.HCM', type: 'dan-lap', city: 'hcm', cover: 'linear-gradient(135deg,#1565C0,#3498DB)' },
  { code: 'DHB', name: 'ĐH Quốc tế Hồng Bàng', type: 'dan-lap', city: 'hcm', cover: 'linear-gradient(135deg,#922B21,#C0392B)' },
  { code: 'RMT', name: 'RMIT University Vietnam', type: 'quoc-te', city: 'hcm', cover: 'linear-gradient(135deg,#0B1F3D,#1F74C9)' },
  { code: 'UAH', name: 'ĐH Kiến trúc Hà Nội', type: 'cong-lap', city: 'hn', cover: 'linear-gradient(135deg,#1B5E20,#2ECC71)' },
  { code: 'MTHN', name: 'ĐH Mỹ thuật Hà Nội', type: 'cong-lap', city: 'hn', cover: 'linear-gradient(135deg,#4A148C,#8E44AD)' },
  { code: 'SKĐK', name: 'ĐH Sân khấu – Điện ảnh HN', type: 'cong-lap', city: 'hn', cover: 'linear-gradient(135deg,#BF360C,#E67E22)' },
  { code: 'FPT', name: 'ĐH FPT', type: 'dan-lap', city: 'hcm', cover: 'linear-gradient(135deg,#E65100,#F39C12)' },
  { code: 'UEF', name: 'ĐH Kinh tế Tài chính', type: 'dan-lap', city: 'hcm', cover: 'linear-gradient(135deg,#006064,#16A085)' },
];

const VOCATIONAL = [
  { code: 'ARENA', name: 'Arena Multimedia', short: 'Arena', loc: 'Toàn quốc', city: 'all', dur: '2.5 năm', tag: 'Đa phương tiện', specs: ['Graphic Design','3D Animation','Filmmaking'], cover: 'linear-gradient(135deg,#E63946,#F77F00)', highlight: true },
  { code: 'KEYFRAME', name: 'Keyframe Training', short: 'KF', loc: 'TP.HCM', city: 'hcm', dur: '6-12 tháng', tag: '3D & VFX', specs: ['Maya','Houdini','Nuke'], cover: 'linear-gradient(135deg,#2C3E50,#4A6FA5)' },
  { code: 'MAAC', name: 'MAAC Vietnam', short: 'MAAC', loc: 'TP.HCM · Hà Nội', city: 'all', dur: '1-3 năm', tag: 'Animation', specs: ['Animation','VFX','Game Art'], cover: 'linear-gradient(135deg,#6B0F8E,#B83DC9)' },
  { code: 'COLOR', name: 'Color Me', short: 'CM', loc: 'TP.HCM', city: 'hcm', dur: '3-6 tháng', tag: 'Design', specs: ['Photoshop','Illustrator','UI Basics'], cover: 'linear-gradient(135deg,#FF6B6B,#FFA07A)' },
  { code: 'GREEN', name: 'GreenAcademy', short: 'GA', loc: 'TP.HCM', city: 'hcm', dur: '6 tháng', tag: 'Game Dev', specs: ['Unity','Unreal','Game Art'], cover: 'linear-gradient(135deg,#0F9B0F,#41B883)' },
  { code: 'TELOS', name: 'Telos Academy', short: 'TA', loc: 'TP.HCM', city: 'hcm', dur: '3-9 tháng', tag: 'UI/UX', specs: ['Figma','UX Research','Product'], cover: 'linear-gradient(135deg,#1F4E79,#5B9BD5)', highlight: true },
  { code: 'IDEC', name: 'iDEC Academy', short: 'iDC', loc: 'Hà Nội', city: 'hn', dur: '6-18 tháng', tag: 'Đồ hoạ', specs: ['Branding','Print','Digital'], cover: 'linear-gradient(135deg,#C0392B,#E74C3C)' },
  { code: 'DPI', name: 'DPI Center', short: 'DPI', loc: 'TP.HCM', city: 'hcm', dur: '6 tháng', tag: 'Đồ hoạ', specs: ['Branding','Editorial'], cover: 'linear-gradient(135deg,#7D3C98,#AF7AC5)' },
  { code: 'TPLUS', name: 'T+ Academy', short: 'T+', loc: 'Hà Nội', city: 'hn', dur: '4-12 tháng', tag: 'Photography', specs: ['Photo','Lightroom','Studio'], cover: 'linear-gradient(135deg,#34495E,#7F8C8D)' },
  { code: 'CTC', name: 'CTC Vietnam', short: 'CTC', loc: 'Đà Nẵng', city: 'dn', dur: '1 năm', tag: 'Đa phương tiện', specs: ['MM','Web','Motion'], cover: 'linear-gradient(135deg,#D35400,#F39C12)' },
  { code: 'INTERIOR', name: 'Interior School', short: 'IS', loc: 'TP.HCM', city: 'hcm', dur: '6-18 tháng', tag: 'Nội thất', specs: ['SketchUp','3DsMax','Lumion'], cover: 'linear-gradient(135deg,#117A65,#48C9B0)' },
  { code: 'FASHION', name: 'Học viện Thời trang London', short: 'LCDF', loc: 'TP.HCM · Hà Nội', city: 'all', dur: '1-3 năm', tag: 'Thời trang', specs: ['Fashion Design','Pattern','Styling'], cover: 'linear-gradient(135deg,#1A1A2E,#C9184A)', highlight: true },
];

function Nav() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <a href="#" className="nav-logo">
          <img src="assets/logo-cins.png" alt="CINs" />
        </a>
        <div className="nav-links">
          <a href="#" className="nav-link active">Trang chủ</a>
          <a href="#" className="nav-link">Hướng nghiệp <span style={{fontSize:'10px', opacity:0.6}}>▾</span></a>
          <a href="#" className="nav-link">Trường Đại học</a>
          <a href="#" className="nav-link">Bài viết <span style={{fontSize:'10px', opacity:0.6}}>▾</span></a>
        </div>
        <div className="nav-right">
          <button className="nav-search" aria-label="Tìm kiếm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
          <a href="#" className="nav-cta">Đăng ký miễn phí</a>
        </div>
      </div>
    </nav>
  );
}

function Hero({ variant, accent }) {
  const [activeChip, setActiveChip] = useState('all');
  const chips = [
    { id: 'all', icon: '🎯', label: 'Tất cả' },
    { id: 'game', icon: '🎮', label: 'Game' },
    { id: 'phim', icon: '🎬', label: 'Phim & Hoạt hình' },
    { id: 'design', icon: '🎨', label: 'Thiết kế' },
    { id: 'tech', icon: '⚡', label: 'Tech & VFX' },
  ];
  return (
    <section className="hero-cmm">
      {/* Full-bleed background image with dark overlay */}
      <div className="hero-cmm-bg">
        <img src="https://maac.edu.vn/wp-content/uploads/2025/04/MAAC_Post_Chao2025_250505_1400x527.jpg" alt="" />
        <div className="hero-cmm-scrim"></div>
      </div>

      {/* Content */}
      <div className="page hero-cmm-content">
        <div className="hero-cmm-eyebrow">
          <span className="dot"></span>
          dành cho học sinh THPT · 2026
        </div>
        <h1 className="hero-cmm-title">
          Khám phá ngành<br/>
          sáng tạo thị giác<br/>
          <span className="hero-cmm-title-accent">tại Việt Nam</span>
        </h1>
        <p className="hero-cmm-sub">
          120+ vị trí nghề · 38 trường đại học · Lộ trình 4 bước.<br/>
          Tìm ra đúng nghề trước khi chọn ngành.
        </p>
        <a href="#" className="hero-cmm-cta">Bắt đầu ngay</a>
      </div>

      {/* Floating search bar — straddles hero & next section */}
      <div className="page hero-cmm-search-wrap">
        <div className="hero-cmm-search">
          <div className="hero-cmm-search-input">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" placeholder="Tìm nghề, trường, ngành học..." />
          </div>
          <button className="hero-cmm-search-btn">
            Tìm kiếm
          </button>
        </div>

        {/* Filter chips row */}
        <div className="hero-cmm-chips">
          {chips.map(c => (
            <button
              key={c.id}
              className={"hero-cmm-chip " + (activeChip===c.id?"active":"")}
              onClick={()=>setActiveChip(c.id)}
            >
              <span className="ic">{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function PromoBanner() {
  const [slide, setSlide] = useState(0);
  const slides = [
    {
      kicker: 'Sự kiện đặc biệt · 10—12.06.2026',
      title: 'CINs FEST 2026',
      h2: 'Lễ hội ngành sáng tạo thị giác lớn nhất Việt Nam',
      desc: '3 ngày triển lãm portfolio, talkshow với leaders từ Sparx, Colorista, Riot Games, RMIT, Sony, NetEase. Vào cửa miễn phí cho HS THPT.',
      cta: 'Đăng ký tham dự',
      cta2: 'Xem chương trình',
      bg: 'linear-gradient(120deg,#0E1759 0%,#1656A0 50%,#1F74C9 100%)',
      art: 'assets/promo-game-card.png',
      tag: '🎟️ Free entry · HS THPT',
    },
    {
      kicker: 'Cuộc thi · Mở đăng ký 01.05.2026',
      title: 'CINs Portfolio Awards',
      h2: 'Vinh danh 50 portfolio xuất sắc nhất 2026',
      desc: 'Tổng giải thưởng 500 triệu đồng. 7 hạng mục: UI/UX · Game Art · Animation · Phim · Đồ hoạ · Thời trang · Kiến trúc.',
      cta: 'Nộp portfolio',
      cta2: 'Thể lệ chi tiết',
      bg: 'linear-gradient(120deg,#1A0F3D 0%,#4A148C 50%,#BB89F8 100%)',
      art: 'assets/career-illustration-2.png',
      tag: '🏆 500M giải thưởng',
    },
    {
      kicker: 'Hợp tác · Có thể bắt đầu ngay',
      title: 'Học bổng Studio Partner',
      h2: 'Thực tập có lương tại 12 studio hàng đầu',
      desc: 'Sparx, Colorista, Glass Egg, VNG, Topebox, Cyclone Anims… Ưu tiên SV năm 3-4 có portfolio mạnh trên CINs.',
      cta: 'Xem các vị trí',
      cta2: 'Tạo portfolio',
      bg: 'linear-gradient(120deg,#0F3D2E 0%,#117A65 50%,#48C9B0 100%)',
      art: 'assets/career-illustration-3.png',
      tag: '💼 12 studio partners',
    },
  ];
  const s = slides[slide];

  return (
    <section className="promo-section">
      <div className="page">
        <div className="promo-banner" style={{background: s.bg}}>
          <div className="promo-deco">
            <div className="promo-blob promo-blob-1" />
            <div className="promo-blob promo-blob-2" />
            <div className="promo-blob promo-blob-3" />
          </div>
          <div className="promo-grid">
            <div className="promo-left">
              <div className="promo-tag">{s.tag}</div>
              <div className="promo-kicker">{s.kicker}</div>
              <h2 className="promo-title">{s.title}</h2>
              <p className="promo-h2">{s.h2}</p>
              <p className="promo-desc">{s.desc}</p>
              <div className="promo-actions">
                <a href="#" className="promo-cta-primary">{s.cta} →</a>
                <a href="#" className="promo-cta-secondary">{s.cta2}</a>
              </div>
            </div>
            <div className="promo-right">
              <div className="promo-art-frame">
                <img src={s.art} alt="" />
              </div>
              <div className="promo-floating-card promo-fc-1">
                <div className="promo-fc-num">120+</div>
                <div className="promo-fc-lbl">vị trí nghề</div>
              </div>
              <div className="promo-floating-card promo-fc-2">
                <div className="promo-fc-mascot" style={{background:'var(--cins-yellow)'}}>
                  <img src="assets/mascot-artist.png" alt="" />
                </div>
                <div>
                  <div className="promo-fc-num" style={{fontSize:'14px'}}>2,400+</div>
                  <div className="promo-fc-lbl">portfolio</div>
                </div>
              </div>
            </div>
          </div>
          <div className="promo-controls">
            <div className="promo-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  className={`promo-dot ${slide===i?'active':''}`}
                  onClick={()=>setSlide(i)}
                  aria-label={`Slide ${i+1}`}
                />
              ))}
            </div>
            <div className="promo-nav">
              <button className="promo-nav-btn" onClick={()=>setSlide((slide-1+slides.length)%slides.length)} aria-label="Trước">‹</button>
              <button className="promo-nav-btn" onClick={()=>setSlide((slide+1)%slides.length)} aria-label="Sau">›</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Vocational() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? VOCATIONAL : VOCATIONAL.filter(v => v.city === filter || v.tag.toLowerCase().includes(filter));

  return (
    <section className="section-tight">
      <div className="page">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">Cơ sở dạy nghề</div>
            <h2 className="section-title">Trung tâm đào tạo & Học viện ngắn hạn</h2>
            <p className="section-sub">Không phải lúc nào cũng phải học ĐH 4 năm. Có nhiều khóa 3-18 tháng đi thẳng vào nghề.</p>
          </div>
          <a href="#" className="section-link">Xem tất cả 24 cơ sở →</a>
        </div>
        <div className="uni-filter-row">
          {[
            ['all','Tất cả'],['hcm','TP.HCM'],['hn','Hà Nội'],['dn','Đà Nẵng'],
            ['game','Game'],['animation','Animation'],['ui/ux','UI/UX'],['đồ hoạ','Đồ hoạ']
          ].map(([k,l]) => (
            <button key={k} className={`uni-filter ${filter===k?'active':''}`} onClick={()=>setFilter(k)}>{l}</button>
          ))}
        </div>
        <div className="voc-grid">
          {filtered.map(v => (
            <div key={v.code} className={`voc-card ${v.highlight?'voc-highlight':''}`}>
              <div className="voc-cover" style={{background: v.cover}}>
                {v.highlight && <span className="voc-badge-hot">★ Nổi bật</span>}
                <span className="voc-tag">{v.tag}</span>
                <div className="voc-logo">{v.short}</div>
              </div>
              <div className="voc-body">
                <div className="voc-name">{v.name}</div>
                <div className="voc-meta">
                  <span className="voc-meta-item">📍 {v.loc}</span>
                  <span className="voc-meta-item">⏱ {v.dur}</span>
                </div>
                <div className="voc-specs">
                  {v.specs.map(s => <span key={s} className="voc-spec">{s}</span>)}
                </div>
                <div className="voc-foot">
                  <a href="#" className="voc-link">Xem chi tiết</a>
                  <span className="voc-arrow">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Fields() {
  return (
    <section className="fields-section">
      <div className="page">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">Lĩnh vực</div>
            <h2 className="section-title">5 ngành công nghiệp sáng tạo thị giác</h2>
          </div>
          <a href="#" className="section-link">Xem tất cả ngành →</a>
        </div>
        <div className="fields-grid">
          {FIELDS.map((f, i) => (
            <div key={f.name} className={`field-card anim-up d${i+1}`}>
              <div className="field-art" style={{background: f.tint}}>
                <img src={f.img} alt={f.name} />
              </div>
              <div className="field-name">{f.name}</div>
              <div className="field-meta">{f.count}</div>
              <span className="field-arrow">→</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuizAndStats() {
  const [picks, setPicks] = useState(['Vẽ & thiết kế']);
  const togglePick = (t) => {
    setPicks(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };
  const jobs = picks.length
    ? [...new Set(picks.flatMap(k => QUIZ_MAP[k] || []))].slice(0, 5)
    : [];

  return (
    <div className="page">
      {/* compact inline stats strip — replaces the big stats card */}
      <div className="stats-strip anim-up">
        <div className="stats-strip-item"><span className="stats-strip-num">120+</span><span className="stats-strip-lbl">vị trí nghề</span></div>
        <div className="stats-strip-divider" />
        <div className="stats-strip-item"><span className="stats-strip-num">38</span><span className="stats-strip-lbl">trường ĐH</span></div>
        <div className="stats-strip-divider" />
        <div className="stats-strip-item"><span className="stats-strip-num">2.4k</span><span className="stats-strip-lbl">portfolio</span></div>
        <div className="stats-strip-divider" />
        <div className="stats-strip-item"><span className="stats-strip-num">5</span><span className="stats-strip-lbl">lĩnh vực</span></div>
      </div>

      <div className="card quiz-card-full anim-up d1">
        <div className="quiz-grid">
          <div className="quiz-content">
            <div className="card-eyebrow">Quiz nhanh · 10 giây</div>
            <h3 className="card-title">Bạn thích làm gì nhất?</h3>
            <p className="card-sub">Chọn 1-3 hoạt động bạn yêu thích — chúng tôi gợi ý nghề phù hợp.</p>
            <div className="chips">
              {Object.keys(QUIZ_MAP).map(t => (
                <button
                  key={t}
                  className={`chip ${picks.includes(t) ? 'active' : ''}`}
                  onClick={() => togglePick(t)}
                >{t}</button>
              ))}
            </div>
          </div>
          <div className="quiz-result-col">
            {jobs.length > 0 ? (
              <div className="quiz-result">
                <div className="quiz-result-label">có thể bạn sẽ thích →</div>
                <div className="quiz-result-jobs">
                  {jobs.map(j => <span key={j} className="qjob">{j}</span>)}
                </div>
                <a href="#" className="quiz-cta">Xem chi tiết các nghề →</a>
              </div>
            ) : (
              <div className="quiz-empty">
                <img src="assets/mascot-artist.png" alt="" className="quiz-empty-mascot" />
                <p>Chọn ít nhất 1 hoạt động để xem gợi ý nghề.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Jobs() {
  return (
    <section className="section-tight">
      <div className="page">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">Hướng nghiệp</div>
            <h2 className="section-title">Nghề được quan tâm nhất tuần này</h2>
          </div>
          <a href="#" className="section-link">Xem 120+ nghề →</a>
        </div>
        <div className="jobs-grid">
          {JOBS.map((j, i) => (
            <div key={j.name} className={`job-card anim-up d${i+1}`}>
              <div className="job-thumb" style={{background: j.tint}}>
                <span className="job-tag">{j.tag}</span>
                <img src={j.img} alt={j.name} />
              </div>
              <div className="job-name">{j.name}</div>
              <div className="job-desc">{j.desc}</div>
              <div className="job-meta">
                <div className="job-skills">
                  {j.skills.slice(0,2).map(s => <span key={s} className="job-sk">{s}</span>)}
                </div>
                <span className="job-arrow">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pathway() {
  const steps = [
    { n: '01', title: 'Khám phá nghề', desc: 'Hiểu các vị trí trong ngành — làm gì, kỹ năng, lương ra sao.', active: true },
    { n: '02', title: 'Chọn ngành & trường', desc: 'Tìm ngành học và trường ĐH/CĐ phù hợp với định hướng.' },
    { n: '03', title: 'Tạo portfolio', desc: 'Bắt đầu ghi lại các dự án từ sớm — dù còn THPT hay năm nhất.' },
    { n: '04', title: 'Kết nối cơ hội', desc: 'Được studio và trường học tìm thấy qua portfolio của bạn.' },
  ];
  return (
    <section className="section-tight">
      <div className="page">
        <div className="card pathway-card anim-up">
          <div className="section-eyebrow" style={{textAlign:'center'}}>Lộ trình hướng nghiệp</div>
          <h2 className="section-title" style={{textAlign:'center', margin:'0 auto', maxWidth:'none'}}>
            Từ "chưa biết" đến "có định hướng"
          </h2>
          <div className="pathway-grid">
            {steps.map(s => (
              <div key={s.n} className={`pstep ${s.active ? 'active' : ''}`}>
                <div className="pstep-num">{s.n}</div>
                <div className="pstep-title">{s.title}</div>
                <div className="pstep-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Universities() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? UNIS : UNIS.filter(u => u.type === filter || u.city === filter);

  return (
    <section className="section-tight">
      <div className="page">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">Trường đại học</div>
            <h2 className="section-title">38 trường đào tạo ngành sáng tạo thị giác</h2>
          </div>
          <a href="#" className="section-link">Xem tất cả →</a>
        </div>
        <div className="uni-filter-row">
          {[
            ['all','Tất cả'],['cong-lap','Công lập'],['dan-lap','Dân lập'],['quoc-te','Quốc tế'],
            ['hcm','TP.HCM'],['hn','Hà Nội']
          ].map(([k,l]) => (
            <button key={k} className={`uni-filter ${filter===k?'active':''}`} onClick={()=>setFilter(k)}>{l}</button>
          ))}
        </div>
        <div className="uni-grid">
          {filtered.map(u => (
            <div key={u.code} className="uni-card">
              <div className="uni-cover" style={{background: u.cover}}>
                <div className="uni-cover-overlay" />
                <div className="uni-logo" style={{background: u.cover, color:'white'}}>{u.code.slice(0,3)}</div>
              </div>
              <div className="uni-body">
                <div className="uni-name">{u.name}</div>
                <div className="uni-code">Mã: {u.code}</div>
                <span className={`uni-type ${u.type}`}>
                  {u.type === 'cong-lap' ? 'Công lập' : u.type === 'dan-lap' ? 'Dân lập' : 'Quốc tế'}
                </span>
              </div>
            </div>
          ))}
          <a href="#" className="uni-show-more">Xem tất cả 38 trường →</a>
        </div>
      </div>
    </section>
  );
}

function FeaturedSchools() {
  const schools = [
    { name: 'RMIT University Vietnam', code: 'RMT', loc: 'TP. Hồ Chí Minh', type: 'Quốc tế', n: 4,
      desc: 'Chương trình đào tạo quốc tế chuẩn Úc — nổi bật với Digital Media, Game Design và Communication Design.',
      tags: ['Digital Media','Game Design','Communication','Fashion'],
      cover: 'linear-gradient(135deg,#0B1F3D,#1F74C9)' },
    { name: 'Đại học Mỹ thuật TP. Hồ Chí Minh', code: 'MTS', loc: 'TP. Hồ Chí Minh', type: 'Công lập', n: 6,
      desc: 'Trường mỹ thuật lâu đời và uy tín nhất miền Nam — đào tạo chuyên sâu hội hoạ, đồ hoạ, điêu khắc, thời trang.',
      tags: ['Mỹ thuật ứng dụng','Đồ hoạ','Điêu khắc','Thời trang'],
      cover: 'linear-gradient(135deg,#6B0F0F,#C0392B)' },
    { name: 'Đại học Văn Lang', code: 'VLU', loc: 'HCM · Đà Nẵng · Hà Nội', type: 'Dân lập', n: 5,
      desc: 'Trường đa ngành với thế mạnh thiết kế sáng tạo — Kiến trúc, Nội thất, Thời trang, Truyền thông đa phương tiện.',
      tags: ['Kiến trúc','Nội thất','Thời trang','Truyền thông'],
      cover: 'linear-gradient(135deg,#4A0E8F,#9B59B6)' },
  ];
  return (
    <section className="section-tight">
      <div className="page">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">Cơ sở đào tạo nổi bật</div>
            <h2 className="section-title">Các trường đang được chú ý</h2>
          </div>
          <a href="#" className="section-link">Xem tất cả →</a>
        </div>
        {schools.map(s => (
          <div key={s.code} className="fschool">
            <div className="fschool-cover" style={{background: s.cover}}>
              <div className="fschool-cover-overlay" />
              <span className="fschool-badge">{s.type}</span>
              <div className="fschool-logo" style={{background: s.cover, color:'white'}}>{s.code}</div>
            </div>
            <div className="fschool-body">
              <div className="fschool-name">{s.name}</div>
              <div className="fschool-meta">Mã trường: {s.code} · {s.loc}</div>
              <div className="fschool-desc">{s.desc}</div>
              <div className="fschool-tags">
                {s.tags.map(t => <span key={t} className="fschool-tag">{t}</span>)}
              </div>
            </div>
            <div className="fschool-side">
              <div className="fschool-stat">
                <div className="fschool-stat-num">{s.n}</div>
                <div className="fschool-stat-label">ngành sáng tạo</div>
              </div>
              <div>
                <div className="fschool-loc">📍 {s.loc.split(' · ')[0]}</div>
                <a href="#" className="fschool-cta">Xem chi tiết →</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AudienceStrip() {
  return (
    <section className="section-tight">
      <div className="page">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">CINs phục vụ ai?</div>
            <h2 className="section-title">Một nền tảng, ba đối tượng</h2>
          </div>
        </div>
        <div className="audience-row">
          <div className="audience-card a-student">
            <div className="audience-pattern circle" />
            <div style={{position:'relative', zIndex:1}}>
              <div className="audience-eyebrow">Học sinh THPT</div>
              <div className="audience-title">Tìm nghề phù hợp với bản thân</div>
              <div className="audience-desc">Khám phá 120+ vị trí nghề, đọc câu chuyện thực tế từ người trong ngành.</div>
            </div>
            <a href="#" className="audience-link" style={{position:'relative', zIndex:1}}>Bắt đầu khám phá →</a>
          </div>
          <div className="audience-card a-school">
            <div className="audience-pattern circle" />
            <div style={{position:'relative', zIndex:1}}>
              <div className="audience-eyebrow">Cơ sở đào tạo</div>
              <div className="audience-title">Tiếp cận học viên tiềm năng</div>
              <div className="audience-desc">Đăng tin tuyển sinh, giới thiệu chương trình và kết nối với học sinh quan tâm.</div>
            </div>
            <a href="#" className="audience-link" style={{position:'relative', zIndex:1}}>Đăng ký trường →</a>
          </div>
          <div className="audience-card a-biz">
            <div className="audience-pattern circle" />
            <div style={{position:'relative', zIndex:1}}>
              <div className="audience-eyebrow">Doanh nghiệp</div>
              <div className="audience-title">Tìm ứng viên đã được định hướng</div>
              <div className="audience-desc">Kết nối với portfolio sinh viên, tuyển dụng intern và junior trong ngành sáng tạo.</div>
            </div>
            <a href="#" className="audience-link" style={{position:'relative', zIndex:1}}>Tuyển dụng ngay →</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <a href="#" className="nav-logo"><img src="assets/logo-cins.png" alt="CINs" /></a>
          <p className="footer-tagline">Khám phá ngành sáng tạo thị giác tại Việt Nam — Phim, Game, Hoạt hình, Kiến trúc, Thời trang, Thiết kế.</p>
        </div>
        <div className="footer-col">
          <div className="footer-col-title">Khám phá</div>
          <ul>
            <li><a href="#">Hướng nghiệp</a></li>
            <li><a href="#">Trường ĐH</a></li>
            <li><a href="#">Lĩnh vực</a></li>
            <li><a href="#">Bài viết</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <div className="footer-col-title">Cộng đồng</div>
          <ul>
            <li><a href="#">Portfolio sinh viên</a></li>
            <li><a href="#">Câu chuyện thực tế</a></li>
            <li><a href="#">Sự kiện</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <div className="footer-col-title">Liên hệ</div>
          <ul>
            <li><a href="#">Về chúng tôi</a></li>
            <li><a href="#">Hợp tác</a></li>
            <li><a href="#">Góp ý</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div>© 2026 CINs — Visual Creative Industries connection platform.</div>
        <div>Made with ♥ in Vietnam</div>
      </div>
    </footer>
  );
}

function FeatureTiles() {
  const tiles = [
    {
      img: 'assets/career-illustration-1.png',
      tint: 'linear-gradient(135deg, rgba(31,116,201,0.10), rgba(31,116,201,0.04))',
      title: 'Khám phá nghề',
      desc: '120+ vị trí nghề trong Game, Phim, Hoạt hình, Thiết kế. Mô tả công việc, kỹ năng, lương khởi điểm.',
      cta: 'Xem nghề',
      ic: '🎨',
    },
    {
      img: 'assets/career-illustration-2.png',
      tint: 'linear-gradient(135deg, rgba(110,254,192,0.20), rgba(110,254,192,0.04))',
      title: 'Trường đại học',
      desc: '38 trường có ngành sáng tạo tại Việt Nam. So sánh học phí, chuyên ngành, đầu ra.',
      cta: 'Tìm trường',
      ic: '🎓',
    },
    {
      img: 'assets/career-illustration-3.png',
      tint: 'linear-gradient(135deg, rgba(255,184,92,0.20), rgba(255,184,92,0.04))',
      title: 'Lộ trình 4 bước',
      desc: 'Từ khám phá đến hành động. Quiz cá tính, mentor 1-1, talkshow studio, build portfolio sớm.',
      cta: 'Bắt đầu',
      ic: '🧭',
    },
  ];
  return (
    <section className="ft-section">
      <div className="page">
        <div className="ft-head">
          <h2 className="ft-title">Để chọn đúng ngành học, bắt đầu từ đây</h2>
          <a href="#" className="ft-link">Xem tất cả →</a>
        </div>
        <div className="ft-grid">
          {tiles.map((t, i) => (
            <div className="ft-card" key={i}>
              <div className="ft-card-img" style={{background: t.tint}}>
                <img src={t.img} alt="" />
                <div className="ft-card-ic">{t.ic}</div>
              </div>
              <div className="ft-card-body">
                <h3 className="ft-card-title">{t.title}</h3>
                <p className="ft-card-desc">{t.desc}</p>
                <a href="#" className="ft-card-cta">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  {t.cta}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BigSplit() {
  return (
    <section className="bs-section">
      <div className="page">
        <div className="bs-card">
          <div className="bs-img">
            <img src="https://maac.edu.vn/wp-content/uploads/2025/04/MAAC_Post_Chao2025_250505_1400x527.jpg" alt="" />
          </div>
          <div className="bs-body">
            <div className="bs-eyebrow">QUIZ · 5 phút</div>
            <h2 className="bs-title">Tìm nghề phù hợp với cá tính của bạn</h2>
            <p className="bs-desc">
              Trả lời 10 câu hỏi đơn giản về sở thích, tính cách và môn học bạn yêu thích. CINs sẽ gợi ý 3 nghề phù hợp nhất + lộ trình học cụ thể.
            </p>
            <div className="bs-stats">
              <div className="bs-stat">
                <div className="bs-stat-num">12K+</div>
                <div className="bs-stat-lbl">Học sinh đã làm quiz</div>
              </div>
              <div className="bs-stat">
                <div className="bs-stat-num">98%</div>
                <div className="bs-stat-lbl">Thấy kết quả hữu ích</div>
              </div>
            </div>
            <a href="#" className="bs-cta">Làm quiz miễn phí</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function EventBanners() {
  const events = [
    {
      tag: 'Festival',
      tagKind: 'is-hot',
      d: '12', m: 'Th6',
      time: '10:00 – 22:00',
      loc: 'GEM Center, TP.HCM',
      title: 'CINs FEST 2026 — Lễ hội ngành sáng tạo thị giác',
      desc: '3 ngày triển lãm + 40 talkshow + matchmaking giữa studio và sinh viên. Vé sớm 50% đến 20.05.',
      host: 'CINs', sub: '× MAAC × FPT Arena',
      cta: 'Đăng ký',
      img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80',
      featured: true,
    },
    {
      tag: 'Workshop',
      tagKind: '',
      d: '24', m: 'Th5',
      time: '14:00 – 17:00',
      loc: 'Online · Zoom',
      title: 'Concept Art cho Game AAA — từ sketch đến final render',
      desc: 'Workshop 3h cùng art director Phạm Tuấn Anh (ex-Sparx*).',
      host: 'CINs', sub: '× Sparx*',
      cta: 'Tham gia',
      img: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=900&q=80',
    },
    {
      tag: 'Talkshow',
      tagKind: 'is-live',
      d: '18', m: 'Th5',
      time: '19:30 – 21:00',
      loc: 'YouTube Live',
      title: 'Lộ trình từ sinh viên đến Senior Animator tại studio Mỹ',
      desc: 'Khách mời: Lê Hữu Cường (DreamWorks) chia sẻ hành trình 8 năm.',
      host: 'CINs Talk', sub: '#12',
      cta: 'Đặt lịch',
      img: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=900&q=80',
    },
  ];

  return (
    <section className="evb-section">
      <div className="page">
        <div className="evb-head">
          <div className="evb-head-l">
            <div className="evb-eyebrow">Sự kiện sắp tới</div>
            <h2 className="evb-title">Workshop, talkshow & festival ngành sáng tạo</h2>
            <p className="evb-sub">
              CINs đồng tổ chức và bảo trợ truyền thông cho các sự kiện trong ngành. Đăng ký sớm để giữ chỗ.
            </p>
          </div>
          <a href="#" className="evb-link">Xem tất cả sự kiện →</a>
        </div>
        <div className="evb-grid">
          {events.map((e, i) => (
            <a key={i} href="#" className={`evb-card ${e.featured ? 'is-featured' : ''}`}>
              <div className="evb-card-img">
                <img src={e.img} alt="" />
                <span className={`evb-card-tag ${e.tagKind}`}>
                  {e.tagKind === 'is-live' && <span className="evb-pulse" />}
                  {e.tag}
                </span>
                <div className="evb-card-date">
                  <span className="evb-card-date-d">{e.d}</span>
                  <span className="evb-card-date-m">{e.m}</span>
                </div>
              </div>
              <div className="evb-card-body">
                <div className="evb-card-meta">
                  <span>🕐 {e.time}</span>
                  <span>📍 {e.loc}</span>
                </div>
                <h3 className="evb-card-title">{e.title}</h3>
                <p className="evb-card-desc">{e.desc}</p>
                <div className="evb-card-foot">
                  <div className="evb-card-host">{e.host} <span>{e.sub}</span></div>
                  <span className="evb-card-cta">{e.cta} →</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function App() {
  const [tweaks, setTweak] = (window.useTweaks || (() => [TWEAK_DEFAULTS, () => {}]))(TWEAK_DEFAULTS);

  return (
    <div data-screen-label="01 Homepage">
      <Nav />
      <Hero variant={tweaks.heroVariant} accent={tweaks.accentColor} />
      <FeatureTiles />
      <EventBanners />
      <BigSplit />
      <Universities />
      <FeaturedSchools />
      <Vocational />
      <Fields />
      <Pathway />
      <PromoBanner />
      <Jobs />
      <AudienceStrip />
      <Footer />

      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection title="Hero">
            <window.TweakRadio
              label="Variant"
              value={tweaks.heroVariant}
              onChange={(v) => setTweak('heroVariant', v)}
              options={[
                { value: 'mascot', label: 'Mascot pick' },
                { value: 'search', label: 'Search-first' },
              ]}
            />
            <window.TweakRadio
              label="Accent màu"
              value={tweaks.accentColor}
              onChange={(v) => setTweak('accentColor', v)}
              options={[
                { value: 'yellow', label: 'Vàng' },
                { value: 'mint', label: 'Mint' },
                { value: 'orange', label: 'Cam' },
                { value: 'violet', label: 'Tím' },
              ]}
            />
          </window.TweakSection>
          <window.TweakSection title="Density">
            <window.TweakRadio
              label="Mật độ"
              value={tweaks.density}
              onChange={(v) => setTweak('density', v)}
              options={[
                { value: 'comfortable', label: 'Thoải mái' },
                { value: 'compact', label: 'Compact' },
              ]}
            />
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
