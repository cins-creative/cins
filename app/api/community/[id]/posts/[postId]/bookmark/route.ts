import { POST as savePost } from "../save/route";

/** @deprecated Dùng `.../save` — giữ alias cho link cũ. */
export async function POST(
  req: Request,
  ctx: Parameters<typeof savePost>[1],
) {
  return savePost(req, ctx);
}
