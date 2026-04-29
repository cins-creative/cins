// CINs UI Kit — Career & role cards
function CareerCard({ image, title, code, onClick, accent }) {
  return (
    <button className={`cins-career-card cins-accent-${accent || 'orange'}`} onClick={onClick}>
      <div className="cins-career-img">
        {image ? <img src={image} alt="" /> : <div className="cins-career-img-placeholder" />}
      </div>
      <div className="cins-career-title">{title}</div>
      {code && <div className="cins-career-meta">Mã ngành: {code}</div>}
    </button>
  );
}

function RoleCard({ image, title, onClick }) {
  return (
    <button className="cins-role-card" onClick={onClick}>
      <div className="cins-role-img">
        {image && <img src={image} alt="" />}
      </div>
      <div className="cins-role-title">{title}</div>
    </button>
  );
}

function PromoCard({ eyebrow, title, illustration, onClick }) {
  return (
    <div className="cins-promo">
      <div className="cins-promo-illust">
        {illustration && <img src={illustration} alt="" />}
      </div>
      <div className="cins-promo-body">
        <div className="cins-promo-eyebrow">{eyebrow}</div>
        <div className="cins-promo-title">{title}</div>
        <button className="cins-promo-cta" onClick={onClick}>Xem ngay</button>
      </div>
    </div>
  );
}

Object.assign(window, { CareerCard, RoleCard, PromoCard });
