import { handleSaveBookmarkPost } from "@/lib/journey/save-bookmark-handler";

/** Lưu bài về Journey — path tránh adblock chặn `/api/bookmarks`. */
export async function POST(req: Request) {
  return handleSaveBookmarkPost(req);
}
