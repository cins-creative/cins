/**
 * Từ điển segment URL tiếng Việt → tiếng Anh. NGUỒN SỰ THẬT DUY NHẤT.
 *
 * Mọi thứ khác được sinh ra từ file này:
 *   - bảng review `docs/URL_MAP_GENERATED.md`
 *   - script đổi tên folder `app/**`
 *   - codemod URL literal
 *   - map redirect 308 runtime `lib/navigation/legacy-url-map.ts`
 *
 * Quy tắc tra: với mỗi segment tĩnh, thử theo thứ tự
 *   1. OVERRIDES — khớp full path (chính xác nhất, cho case lệch nghĩa)
 *   2. BY_PARENT[parentSegment] — nghĩa phụ thuộc segment cha
 *   3. SEGMENTS — nghĩa chung
 *   4. giữ nguyên (đã tiếng Anh hoặc là danh từ riêng)
 */

/** Segment đã tiếng Anh / danh từ riêng — không đổi, không cảnh báo. */
export const KEEP = new Set([
  "api", "auth", "admin", "login", "logout", "onboarding", "maintenance",
  "chat", "studio", "keyword", "keywords", "software", "fandom", "s",
  "shop", "journey", "gallery", "p", "new", "photo", "video", "edit",
  "callback", "settings", "analytics", "marketing", "preview", "list",
  "search", "create", "invite", "join-requests", "members", "messages",
  "reactions", "tags", "tag", "polls", "vote", "pins", "read", "leave",
  "canvas", "nodes", "batch", "sync", "hidden", "from-message", "projects",
  "threads", "rooms", "calls", "incoming", "avatar", "cover", "upload",
  "complete", "prepare", "processing", "status", "token", "signal", "ensure",
  "follow", "bookmarks", "filters", "notifications", "me", "user", "users",
  "orgs", "org", "social", "meta", "home", "milestone", "webhook", "port",
  "import", "link", "embed", "dimensions", "thumbnail", "gif", "featured",
  "reviews", "coauthor", "verify", "merge", "dedup", "index", "growth",
  "vn", "world-journey", "feed", "roster", "profile", "lifecycle", "sidebar-live",
  "categories", "category", "comments", "posts", "bookmark", "respond",
  "actor-profiles", "actors", "set-owner", "transfer-owner", "visibility",
  "termandservice", "draft", "terms",
  /* Đã tiếng Anh — xác nhận khi quét cây route thật (2026-08-14). */
  "article-inline-image", "attach-options", "auto", "billing", "block",
  "career-thumbnail", "catalog", "category-articles", "chat-video",
  "create-group", "cron", "fb-feature-cards", "forgot-password", "friends",
  "gallery-aside", "gate", "home-layout", "inbox", "invites", "items",
  "journey-default-view", "link-content", "lottie-asset",
  "membership-milestone", "membership-milestone-requests",
  "milestone-tag-requests", "milestones", "module-preview", "module-previews",
  "og", "og-card", "open", "open-org", "org-tag", "organizations", "poll",
  "post-image", "post-lottie", "post-rive", "post-video", "requests",
  "resend-signup-otp", "reset-password", "rive-asset", "role-preview",
  "scheduled", "sepay", "session-profile", "share-link", "share-theme",
  "slug", "student-chat", "tick", "user-emoji", "verified", "verify-info",
  "verify-recovery-otp", "video-ready",
])

/** Segment top-level của URL trang (position 0, không phải /api). */
export const TOP = {
  "bai-viet": "articles",
  "ban-hang": "seller",
  "cua-hang": "shopping",
  "mo-shop": "open-shop",
  "co-so": "academy",
  "co-so-dao-tao": "university",
  "truong-dai-hoc": "university",
  "cong-dong": "community",
  "to-chuc": "organizations",
  "tao-to-chuc": "create-organization",
  "nganh-hoc": "majors",
  "nghe-nghiep": "careers",
  "huong-nghiep": "guidance",
  "tim-khoa-hoc": "find-courses",
  "tim-kiem": "search",
  "su-kien": "events",
  "tuyen-dung": "jobs",
  "tai-khoan": "account",
  "chinh-sach": "policies",
  "ho-tro": "support",
  "thong-tin-du-an": "about",
  "kham-pha": "explore",
  "nhap": "draft",
}

/** Segment top-level ngay dưới `/api`. */
export const API_TOP = {
  "co-so": "academy",
  "truong": "university",
  "cong-dong": "community",
  "to-chuc": "organizations",
  "su-kien": "events",
  "tai-khoan": "account",
  "chinh-sach": "policies",
  "tim-khoa-hoc": "find-courses",
  "mo-shop": "open-shop",
  "hoc-phi": "tuition",
  "ket-ban": "friends",
  "noi-bo": "internal",
  "tac-pham": "artworks",
  "bao-cao": "reports",
  "gop-y": "feedback",
  "huong-dan": "guides",
  "luu-bai": "saved-posts",
  "nghe": "careers",
  "org-bai-dang": "org-posts",
}

/** Nghĩa phụ thuộc segment cha — ưu tiên hơn SEGMENTS. */
export const BY_PARENT = {
  /* `/academy/:slug/manage/co-so` = danh sách cơ sở vật chất, không phải hub. */
  "quan-ly": { "co-so": "facilities" },
  /* `/shopping/*` là 3 tab browse của cùng một hub. */
  "cua-hang": { "hang": "products", "mat-hang": "category", "shop": "shops" },
  /* `/api/shop/cua-hang` = cửa hàng của chính seller. */
  "shop": { "cua-hang": "store", "mat-hang": "category", "hang": "products" },
  "chat": { "goi": "calls", "nhom": "groups" },
  "nhom": { "moi": "invite" },
  "huong-nghiep": { "nganh": "major", "nghe": "career" },
  "chinh-sach": { "phi-san": "marketplace-fee", "phi-csdt": "platform-fee", "phi": "fees" },
  "uu-dai": { "combo": "combos", "voucher": "vouchers" },
  "ho-tro": { "huong-dan": "guides" },
  /* `/seller/store` — cửa hàng của chính người bán. */
  "ban-hang": { "cua-hang": "store" },
  /* `/create-organization/academy`. */
  "tao-to-chuc": { "co-so": "academy" },
  /* `/account/billing` — trang quản lý thanh toán, không phải luồng checkout. */
  "tai-khoan": { "thanh-toan": "billing" },
  /* `/api/user/ban-hang` — trạng thái bán hàng của user. */
  "user": { "ban-hang": "seller" },
  /* `/api/ket-ban/*` — bạn bè. */
  "ket-ban": { "chan": "blocked", "chung": "mutual", "danh-sach": "list", "loi-moi": "requests" },
  /* `/api/noi-bo/*` — công cụ nội bộ. */
  "noi-bo": { "csdt-phi": "academy-fee", "tac-pham": "artworks" },
  "csdt-phi": { "chot-ky": "close-period" },
  "auto": { "muc": "items" },
  /* `/api/home/hang-feature` — feature mặt hàng trên trang chủ. */
  "home": { "hang-feature": "product-feature" },
}

/** Nghĩa chung, dùng ở mọi vị trí lồng. */
export const SEGMENTS = {
  /* Quản trị org */
  "quan-ly": "manage",
  "tong-quan": "overview",
  "cai-dat": "settings",
  "tin-nhan": "messages",
  "thong-tin": "info",
  "chi-nhanh": "branches",
  "diem-danh": "attendance",
  "doanh-thu": "revenue",
  "phi": "fees",
  "quyen": "permissions",

  /* Dạy & học */
  "giao-trinh": "curriculum",
  "bo-giao-trinh": "curriculum-sets",
  "bai-tap": "assignments",
  "nop-bai": "submissions",
  "hoc-phi": "tuition",
  "hoc-vien": "students",
  "lop-hoc": "classes",
  "lop": "classes",
  "khoa-hoc": "courses",
  "khoa": "courses",
  "lich-lop": "class-schedule",
  "lop-access": "class-access",
  "phong-hoc": "classroom",
  "tien-do": "progress",
  "mocs": "milestones",
  "moc": "milestone",
  "giai-doan": "stages",
  "dia-diem": "locations",
  "cho-cau-hinh": "pending-setup",

  /* Nội dung */
  "bai-dang": "posts",
  "bai-viet": "articles",
  "noi-dung-dang": "content",
  "hinh-anh": "images",
  "su-kien": "events",
  "tuyen-dung": "jobs",
  "ung-tuyen": "apply",
  "ung-vien": "candidates",
  "tac-gia": "authors",
  "tom-tat": "summary",
  "danh-gia": "reviews",
  "gioi-thieu": "about",
  "cong-khai": "public",
  "linh-vuc": "fields",
  "tham-gia": "join",
  "theo-doi": "follow",
  "nhan": "labels",
  "the": "tags",
  "tao": "create",
  "moi": "invite",
  "nhom": "groups",

  /* Bán hàng */
  "kho": "inventory",
  "don": "orders",
  "don-hang": "orders",
  "don-chat": "chat-orders",
  "uu-dai": "promotions",
  "combo": "combos",
  "voucher": "vouchers",
  "san-pham": "products",
  "mat-hang": "category",
  "hang": "products",
  "bang-gia": "price-lists",
  "ap-dung-gia": "apply-price",
  "loai": "collections",
  "tiep-can-loai": "category-reach",
  "gio": "cart",
  "gio-chung": "shared-cart",
  "quay": "booths",
  "cua-toi": "mine",
  "sap-co-mat": "upcoming",
  "khach-hang": "customers",
  "nguoi-nhan": "recipients",
  "dia-chi-nhan": "shipping-addresses",
  "thanh-toan": "checkout",
  "kiem-tra": "validate",
  "co-dang-chay": "active",
  "vi": "wallet",
  "danh-muc": "catalog",
  "yeu-cau": "requests",
  "hang-cho": "queue",

  /* Tài chính */
  "giao-dich": "transactions",
  "hoa-don": "invoices",
  "khieu-nai": "complaints",
  "tranh-chap": "disputes",
  "tu-khai": "declarations",
  "tu-khai-da-tra": "paid-declarations",
  "bao-da-tra": "report-paid",
  "phu-trach": "assignee",
  "thu-tien-mat": "cash-payment",
  "bao-gia": "quote",
  "xac-nhan": "confirm",
  "gan-giao-dich": "link-transaction",
  "phi-cau-hinh": "fee-config",
  "phi-thong-bao": "fee-notices",
  "ky": "periods",
  "goi": "packages",
  "dong": "close",

  /* Tài khoản / xác thực */
  "tai-khoan": "account",
  "nguoi-dung": "users",
  "vai-tro": "roles",
  "xac-minh": "verify",
  "bao-mat-2-lop": "two-factor",
  "gui-ma": "send-code",
  "dang-ky": "register",
  "gia-han": "renew",
  "roi": "leave",

  /* Khác */
  "bao-cao": "reports",
  "gop-y": "feedback",
  "huong-dan": "guides",
  "phuong-xa": "wards",
  "nganh": "majors",
  "mon": "subjects",
  "mon-thi": "exam-subjects",
  "mon-thi-catalog": "exam-subject-catalog",
  "to-hop-mon-catalog": "subject-combo-catalog",
  "phuong-thuc": "admission-methods",
  "tuyen-sinh": "admissions",
  "cau-hinh-tinh-diem": "score-config",
  "nhan-ban": "duplicate",
  "xoa-preflight": "delete-preflight",
  "xoa-hang-loat": "bulk-delete",
  "mo-bai": "open-post",
  "sql": "sql",
  "showcase-aside": "showcase-aside",
  "event-rail": "event-rail",
  "timeline-lop-pins": "class-timeline-pins",
  "journey-card": "journey-card",
  "world-boost": "world-boost",

  /* Bổ sung sau khi quét cây route thật (2026-08-14). */
  "bai": "lessons",
  "chot-ky": "close-period",
  "chot-ky-phi": "close-fee-period",
  "dang": "publish",
  "danh-sach": "list",
  "doan-milestones": "student-milestones",
  "doan-projects": "student-projects",
  "dong-don": "close-orders",
  "loi-moi": "invitations",
  "luu": "save",
  "muc": "items",
  "nghe-vi-tri": "career-positions",
  "shop-hang": "shop-products",
  "sua-pixiv-album": "edit-pixiv-album",
  "tac-pham": "artworks",
  "thanh-vien": "members",
  "thong-bao": "notifications",
}

/** Full path → path mới. Dùng khi các quy tắc trên không đủ. */
export const OVERRIDES = {
  /* Legacy redirect thuần — xóa route, không tạo bản tiếng Anh. */
  "/luoi": null,
  "/cong-dong/[slug]/nhan": null,
  /* Đã tiếng Anh nhưng chuẩn hóa. */
  "/termandservice": "/terms",
}

/** Query param: tên param → tên mới. */
export const QUERY_PARAMS = {
  nhom: "group",
  mau: "variant",
}

/** Giá trị query param cần đổi: `param` → { giá trị cũ: giá trị mới }. */
export const QUERY_VALUES = {
  display: { luoi: "grid" },
}
