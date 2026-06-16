import { POST as savePost } from "../luu/route";

/** @deprecated Dùng `.../luu` — giữ alias cho link cũ. */
export async function POST(
  req: Request,
  ctx: Parameters<typeof savePost>[1],
) {
  return savePost(req, ctx);
}
