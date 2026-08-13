import { handleSaveBookmarkPost } from "@/lib/journey/save-bookmark-handler";

/** @deprecated Dùng `/api/saved-posts` — giữ alias cho link cũ / adblock bypass. */
export async function POST(req: Request) {
  return handleSaveBookmarkPost(req);
}
