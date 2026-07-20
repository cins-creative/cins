/** Canvas ý tưởng theo phòng chat (L34) — types dùng chung client + server. */

/** Loại block trên canvas. */
export type CanvasNodeLoai = "anh" | "link" | "sticky" | "frame" | "connector";

/** Trạng thái board. */
export type CanvasTrangThai = "active" | "khoa" | "an";

/** Vị trí + hình học của một node trên board (lưu ở cột layout jsonb). */
export type CanvasNodeLayout = {
  x: number;
  y: number;
  w?: number;
  h?: number;
  /** Thứ tự chồng (z-index tương đối). */
  z?: number;
  rotation?: number;
  /** Màu nền sticky / frame (token hoặc hex). */
  mau?: string | null;
  /** Id nhóm để group nhiều node. */
  groupId?: string | null;
  /** Connector: id node nguồn / đích. */
  from?: string;
  to?: string;
  /**
   * Connector: kiểu đường nối.
   * - `curve` (mặc định) — cubic bezier
   * - `straight` — thẳng
   * - `elbow` — góc vuông (orthogonal)
   */
  wireStyle?: "curve" | "straight" | "elbow" | null;
  /**
   * Connector: mũi tên.
   * - `end` (mặc định) — mũi ở đích
   * - `both` — hai đầu
   * - `none` — không mũi
   */
  wireArrow?: "end" | "both" | "none" | null;
  /** Connector: cạnh neo đầu (n/s/e/w) — null = tự chọn. */
  wireFromSide?: "n" | "s" | "e" | "w" | null;
  /** Connector: cạnh neo đích. */
  wireToSide?: "n" | "s" | "e" | "w" | null;
  /** Connector: vị trí trên cạnh đầu (0–1). */
  wireFromOffset?: number | null;
  /** Connector: vị trí trên cạnh đích (0–1). */
  wireToOffset?: number | null;
  /** Connector: điểm điều khiển giữa legacy (page coords) — dùng khi chưa có `wireAnchors`. */
  wireMid?: { x: number; y: number } | null;
  /** Connector: nhiều điểm neo đi qua đường (page coords), thứ tự đầu → đích. */
  wireAnchors?: Array<{ x: number; y: number }> | null;
  /**
   * Sticky hình học (shape) — không có thì sticky/ghi chú thường.
   * - `rect` — hình chữ nhật bo góc
   * - `ellipse` — elip / tròn
   * - `diamond` — thoi
   */
  shapeKind?: "rect" | "ellipse" | "diamond" | null;
  /**
   * Sticky nội dung đặc biệt (không thêm loai DB).
   * - `table` — bảng ô (JSON trong noiDung)
   * - `draw` — nét vẽ tự do (JSON path trong noiDung)
   * - `comment` — bình luận (text + tác giả trong layout)
   */
  contentKind?: "table" | "draw" | "comment" | null;
  /** Snapshot người bình luận (contentKind=comment). */
  commentAuthor?: {
    id: string;
    ten: string;
    slug?: string | null;
    avatarUrl?: string | null;
  } | null;
  /**
   * Ảnh đã được fit theo tỉ lệ tự nhiên (tránh khung grid cố định).
   * Sau khi true — không auto-resize lại khi load (giữ resize tay của user).
   */
  imageFitted?: boolean | null;
};

/** Một board của phòng. */
export type ChatCanvas = {
  id: string;
  roomId: string;
  ten: string;
  moTa: string | null;
  trangThai: CanvasTrangThai;
  idNguoiTao: string;
  taoLuc: string;
  capNhatLuc: string;
};

/** Một block trên board. */
export type ChatCanvasNode = {
  id: string;
  canvasId: string;
  loai: CanvasNodeLoai;
  /** Trỏ tin nhắn gốc (anh/link auto-import); null với sticky/frame/connector. */
  messageId: string | null;
  url: string | null;
  noiDung: string | null;
  layout: CanvasNodeLayout;
  idNguoiTao: string;
  taoLuc: string;
  capNhatLuc: string;
};

/** Kết quả thao tác lib — thống nhất với các module chat khác. */
export type CanvasResult<T> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

/** Kết quả không kèm dữ liệu (xóa / ẩn / bỏ ẩn). */
export type CanvasVoidResult = { ok: true } | { ok: false; error: string };
