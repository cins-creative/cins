/**
 * Map URL tiếng Việt cũ → URL tiếng Anh hiện tại.
 *
 * SINH TỰ ĐỘNG bởi `scripts/url-en/gen-legacy-map.mjs` từ
 * `scripts/url-en/dictionary.mjs`. **Không sửa tay** — sửa từ điển rồi chạy lại.
 *
 * Dùng trong `middleware.ts` để redirect 308 (giữ method + body nên POST tới
 * `/api/*` cũ vẫn đúng). Quyết định giữ vĩnh viễn: `docs/PLAN_URL_ENGLISH.md` Q2.
 */

const KEEP = new Set<string>([
    "api",
    "auth",
    "admin",
    "login",
    "logout",
    "onboarding",
    "maintenance",
    "chat",
    "studio",
    "keyword",
    "keywords",
    "software",
    "fandom",
    "s",
    "shop",
    "journey",
    "gallery",
    "p",
    "new",
    "photo",
    "video",
    "edit",
    "callback",
    "settings",
    "analytics",
    "marketing",
    "preview",
    "list",
    "search",
    "create",
    "invite",
    "join-requests",
    "members",
    "messages",
    "reactions",
    "tags",
    "tag",
    "polls",
    "vote",
    "pins",
    "read",
    "leave",
    "canvas",
    "nodes",
    "batch",
    "sync",
    "hidden",
    "from-message",
    "projects",
    "threads",
    "rooms",
    "calls",
    "incoming",
    "avatar",
    "cover",
    "upload",
    "complete",
    "prepare",
    "processing",
    "status",
    "token",
    "signal",
    "ensure",
    "follow",
    "bookmarks",
    "filters",
    "notifications",
    "me",
    "user",
    "users",
    "orgs",
    "org",
    "social",
    "meta",
    "home",
    "milestone",
    "webhook",
    "port",
    "import",
    "link",
    "embed",
    "dimensions",
    "thumbnail",
    "gif",
    "featured",
    "reviews",
    "coauthor",
    "verify",
    "merge",
    "dedup",
    "index",
    "growth",
    "vn",
    "world-journey",
    "feed",
    "roster",
    "profile",
    "lifecycle",
    "sidebar-live",
    "categories",
    "category",
    "comments",
    "posts",
    "bookmark",
    "respond",
    "actor-profiles",
    "actors",
    "set-owner",
    "transfer-owner",
    "visibility",
    "termandservice",
    "draft",
    "terms",
    "article-inline-image",
    "attach-options",
    "auto",
    "billing",
    "block",
    "career-thumbnail",
    "catalog",
    "category-articles",
    "chat-video",
    "create-group",
    "cron",
    "fb-feature-cards",
    "forgot-password",
    "friends",
    "gallery-aside",
    "gate",
    "home-layout",
    "inbox",
    "invites",
    "items",
    "journey-default-view",
    "link-content",
    "lottie-asset",
    "membership-milestone",
    "membership-milestone-requests",
    "milestone-tag-requests",
    "milestones",
    "module-preview",
    "module-previews",
    "og",
    "og-card",
    "open",
    "open-org",
    "org-tag",
    "organizations",
    "poll",
    "post-image",
    "post-lottie",
    "post-rive",
    "post-video",
    "requests",
    "resend-signup-otp",
    "reset-password",
    "rive-asset",
    "role-preview",
    "scheduled",
    "sepay",
    "session-profile",
    "share-link",
    "share-theme",
    "slug",
    "student-chat",
    "tick",
    "user-emoji",
    "verified",
    "verify-info",
    "verify-recovery-otp",
    "video-ready"
  ]);

const TOP: Record<string, string> = {
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
    "nhap": "draft"
  };

const API_TOP: Record<string, string> = {
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
    "org-bai-dang": "org-posts"
  };

const BY_PARENT: Record<string, Record<string, string>> = {
    "quan-ly": {
      "co-so": "facilities"
    },
    "cua-hang": {
      "hang": "products",
      "mat-hang": "category",
      "shop": "shops"
    },
    "shop": {
      "cua-hang": "store",
      "mat-hang": "category",
      "hang": "products"
    },
    "chat": {
      "goi": "calls",
      "nhom": "groups"
    },
    "nhom": {
      "moi": "invite"
    },
    "huong-nghiep": {
      "nganh": "major",
      "nghe": "career"
    },
    "chinh-sach": {
      "phi-san": "marketplace-fee",
      "phi-csdt": "platform-fee",
      "phi": "fees"
    },
    "uu-dai": {
      "combo": "combos",
      "voucher": "vouchers"
    },
    "ho-tro": {
      "huong-dan": "guides"
    },
    "ban-hang": {
      "cua-hang": "store"
    },
    "tao-to-chuc": {
      "co-so": "academy"
    },
    "tai-khoan": {
      "thanh-toan": "billing"
    },
    "user": {
      "ban-hang": "seller"
    },
    "ket-ban": {
      "chan": "blocked",
      "chung": "mutual",
      "danh-sach": "list",
      "loi-moi": "requests"
    },
    "noi-bo": {
      "csdt-phi": "academy-fee",
      "tac-pham": "artworks"
    },
    "csdt-phi": {
      "chot-ky": "close-period"
    },
    "auto": {
      "muc": "items"
    },
    "home": {
      "hang-feature": "product-feature"
    }
  };

const SEGMENTS: Record<string, string> = {
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
    "tai-khoan": "account",
    "nguoi-dung": "users",
    "vai-tro": "roles",
    "xac-minh": "verify",
    "bao-mat-2-lop": "two-factor",
    "gui-ma": "send-code",
    "dang-ky": "register",
    "gia-han": "renew",
    "roi": "leave",
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
    "thong-bao": "notifications"
  };

const OVERRIDES: Record<string, string> = {
    "/termandservice": "/terms"
  };

/** Route đã xóa — điều hướng về đích thay thế. */
const REMOVED: Record<string, string> = {
  "/luoi": "/",
};

/** Route đã xóa có segment động. */
const REMOVED_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  /* Trang trung gian sau khi tạo cộng đồng → vào thẳng trang cộng đồng. */
  [/^\/(?:cong-dong|community)\/([^/]+)\/nhan\/?$/, "/community/$1"],
];

/** Segment động (`[id]`, `:id`) — không dịch. */
function isDynamic(seg: string): boolean {
  return seg.startsWith("[") || seg.startsWith(":");
}

function translateSegment(
  seg: string,
  index: number,
  parent: string | null,
  isApi: boolean,
): string {
  if (isDynamic(seg)) return seg;

  const parentTable = parent ? BY_PARENT[parent] : undefined;
  const fromParent = parentTable?.[seg];
  if (fromParent) return fromParent;

  if (KEEP.has(seg)) return seg;

  const atTop = isApi ? index === 1 : index === 0;
  if (atTop) {
    const fromTop = (isApi ? API_TOP : TOP)[seg];
    if (fromTop) return fromTop;
  }

  return SEGMENTS[seg] ?? seg;
}

/**
 * Path mới cho một pathname cũ, hoặc `null` khi đã đúng chuẩn tiếng Anh.
 *
 * Idempotent: gọi lại trên path đã dịch trả `null` (tên tiếng Anh không nằm
 * trong bảng tra), nên an toàn khi middleware chạy nhiều lần.
 */
export function rewriteLegacyPath(pathname: string): string | null {
  const removed = REMOVED[pathname];
  if (removed) return removed;

  for (const [pattern, target] of REMOVED_PATTERNS) {
    if (pattern.test(pathname)) return pathname.replace(pattern, target);
  }

  const override = OVERRIDES[pathname];
  if (override) return override;

  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return null;

  const isApi = segs[0] === "api";
  /* `/admin/*` giữ tiếng Việt — ngoài phạm vi. */
  if (segs[0] === "admin" || (isApi && segs[1] === "admin")) return null;

  let changed = false;
  const out = segs.map((seg, i) => {
    const next = translateSegment(seg, i, i > 0 ? segs[i - 1] : null, isApi);
    if (next !== seg) changed = true;
    return next;
  });
  if (!changed) return null;

  const trailing = pathname.endsWith("/") && pathname !== "/" ? "/" : "";
  return `/${out.join("/")}${trailing}`;
}

/** Param query đã đổi tên. */
const QUERY_PARAM_RENAMES: Record<string, string> = {
  nhom: "group",
  mau: "variant",
};

/** Giá trị query đã đổi (`?display=luoi` → `?display=grid`). */
const QUERY_VALUE_RENAMES: Record<string, Record<string, string>> = {
  display: { luoi: "grid" },
};

/** Query string mới, hoặc `null` khi không có gì đổi. */
export function rewriteLegacyQuery(params: URLSearchParams): string | null {
  let changed = false;
  const next = new URLSearchParams();
  for (const [key, value] of params) {
    const nextKey = QUERY_PARAM_RENAMES[key] ?? key;
    const nextValue = QUERY_VALUE_RENAMES[nextKey]?.[value] ?? value;
    if (nextKey !== key || nextValue !== value) changed = true;
    next.append(nextKey, nextValue);
  }
  return changed ? next.toString() : null;
}
